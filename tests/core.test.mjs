import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { requestKey, safeJson } from '../dist/shared.js';
import { sanitizeBody, assertPublicUrl, assertNoSecrets } from '../dist/privacy.js';
import { validateOptions } from '../dist/capture.js';
import { inlineResources } from '../dist/bundle.js';
import { bounded, extractData } from '../dist/verify.js';

test('fixture matching preserves query meaning but normalizes ordering and fragments', () => {
  assert.equal(
    requestKey('get', '/api?q=a%20b&z=2&a=1#section', 'http://localhost:5173'),
    'GET http://localhost:5173/api?a=1&q=a+b&z=2',
  );
  assert.notEqual(
    requestKey('GET', '/api?q=A', 'http://localhost'),
    requestKey('GET', '/api?q=a', 'http://localhost'),
  );
  assert.notEqual(
    requestKey('GET', '/api?id=1&id=2', 'http://localhost'),
    requestKey('GET', '/api?id=2&id=1', 'http://localhost'),
  );
});

test('hosted replays map only the host origin; external API origins stay distinct', () => {
  assert.equal(
    requestKey('GET', 'https://demo.test/api?a=1', 'http://localhost:5173', 'https://demo.test'),
    'GET http://localhost:5173/api?a=1',
  );
  assert.equal(
    requestKey('GET', 'https://api.test/items', 'http://localhost:5173', 'https://demo.test'),
    'GET https://api.test/items',
  );
});

test('JSON embedded in HTML cannot terminate the data script', () => {
  const value = { title: '</script><img src=x onerror=alert(1)>', separator: '\u2028\u2029' };
  const serialized = safeJson(value);
  assert.ok(!serialized.includes('<'));
  assert.deepEqual(JSON.parse(serialized), value);
});

test('sensitive JSON fields are redacted recursively without changing unrelated fields', () => {
  const result = sanitizeBody(
    JSON.stringify({
      name: 'Avery',
      password: 'synthetic',
      nested: [{ access_token: 'synthetic', Email: 'demo@example.invalid' }],
      count: 4,
    }),
    'application/json',
    ['email'],
  );
  assert.deepEqual(JSON.parse(result.body), {
    name: 'Avery',
    password: '[REDACTED]',
    nested: [{ access_token: '[REDACTED]', Email: '[REDACTED]' }],
    count: 4,
  });
  assert.equal(result.redactions, 3);
});

test('key-like prototype properties are treated as data', () => {
  const result = sanitizeBody(
    '{"__proto__":{"password":"synthetic"},"constructor":"demo"}',
    'application/json',
  );
  assert.equal(JSON.parse(result.body).__proto__.password, '[REDACTED]');
  assert.equal({}.password, undefined);
});

test('invalid JSON is rejected instead of silently exporting it', () => {
  assert.throws(() => sanitizeBody('{broken', 'application/problem+json'), /invalid JSON/);
});

test('credential URLs, secret query keys, and recognizable tokens fail without logging their values', () => {
  for (const url of [
    'http://u:synthetic@localhost/',
    'http://localhost/?access_token=synthetic',
    'http://localhost/?signature=synthetic',
  ])
    assert.throws(() => assertPublicUrl(url));
  const fake = 'gh' + 'p_' + '0'.repeat(36);
  assert.throws(
    () => assertNoSecrets(fake, 'test'),
    (error) => !error.message.includes(fake) && /GitHub token/.test(error.message),
  );
  assert.doesNotThrow(() => assertPublicUrl('http://localhost/api?category=design'));
});

test('capture accepts explicit loopback roots and hash routing', () => {
  for (const url of [
    'http://localhost:5173/',
    'http://127.0.0.1:9000/#/projects',
    'http://[::1]:5173/',
  ])
    assert.doesNotThrow(() => validateOptions({ url }));
});

test('capture rejects remote hosts, credentials, path routing, and invalid limits', () => {
  for (const url of [
    'https://example.com',
    'file:///tmp/app',
    'http://localhost.evil.test/',
    'http://localhost/dashboard',
    'http://localhost/?a=1',
    'http://user:pass@localhost/',
  ])
    assert.throws(() => validateOptions({ url }));
  for (const timeout of [0, -1, NaN, 1.2])
    assert.throws(() => validateOptions({ url: 'http://localhost', timeout }));
  assert.throws(() =>
    validateOptions({ url: 'http://localhost', apiOrigins: ['https://api.example.test/path'] }),
  );
});

test('bundled scripts, CSS and public images become self-contained HTML', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'appcapsule-unit-'));
  try {
    await writeFile(join(dir, 'mark.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
    const html = await inlineResources(
      '<html><head><script type="module" src="/assets/app.js"></script><link rel="stylesheet" href="/assets/style.css"></head><body><img src="/mark.svg"></body></html>',
      new Map([
        ['assets/app.js', Buffer.from('console.log("</script>")')],
        ['assets/style.css', Buffer.from('body{background-image:url(/mark.svg)}')],
      ]),
      dir,
    );
    assert.match(html, /data:image\/svg\+xml;base64/);
    assert.match(html, /<style>body/);
    assert.ok(!html.includes('src="/'));
    assert.ok(!html.includes('console.log("</script>'));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('unresolved external assets and scripts fail with actionable errors', async () => {
  await assert.rejects(
    inlineResources('<img src="https://example.com/a.png">', new Map(), false),
    /External asset/,
  );
  await assert.rejects(
    inlineResources('<script src="https://example.com/a.js"></script>', new Map(), false),
    /not bundled/,
  );
  await assert.rejects(
    inlineResources('<img srcset="a.png 1x,b.png 2x">', new Map(), false),
    /srcset/,
  );
  await assert.rejects(
    inlineResources('<base href="https://example.com">', new Map(), false),
    /base/,
  );
});

test('inspect handles attributes regardless of quote style and rejects unrelated HTML', () => {
  const data = { schemaVersion: 1, fixtures: [], entryUrl: 'http://localhost/' };
  assert.deepEqual(
    extractData(
      `<script type='application/json' id='appcapsule-data'>${JSON.stringify(data)}</script>`,
    ),
    data,
  );
  assert.throws(() => extractData('<h1>Hello</h1>'), /not an AppCapsule/);
  assert.throws(
    () => extractData(`<script id="appcapsule-data">{"schemaVersion":99}</script>`),
    /unsupported/,
  );
});

test('scenario deadlines reject stalled journeys', async () => {
  await assert.rejects(bounded(new Promise(() => {}), 15, 'Journey'), /exceeded/);
  assert.equal(await bounded(Promise.resolve('done'), 1000, 'Journey'), 'done');
});
