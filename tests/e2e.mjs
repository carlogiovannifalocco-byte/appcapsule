import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { capture, verify, extractData } from '../dist/index.js';
import { assemble } from '../dist/bundle.js';

let dir, capsule, result, browser;
const minimal =
  '<!doctype html><html><head><title>Runtime test</title></head><body><h1>Runtime test</h1></body></html>';
const fixtureData = () => ({
  schemaVersion: 1,
  generator: 'appcapsule/0.1.0',
  title: '</script> is harmless text',
  entryUrl: 'http://localhost:5173/',
  createdAt: '2026-10-08T12:00:00.000Z',
  redactions: 0,
  fixtures: [
    {
      method: 'GET',
      key: 'GET http://localhost:5173/api/items',
      url: 'http://localhost:5173/api/items',
      status: 200,
      contentType: 'application/json',
      body: '{"items":["one","two"]}',
    },
    {
      method: 'GET',
      key: 'GET http://localhost:5173/api/empty',
      url: 'http://localhost:5173/api/empty',
      status: 204,
      contentType: 'text/plain',
      body: '',
    },
  ],
});

before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'appcapsule-e2e-'));
  capsule = join(dir, 'signal.html');
  const server = await createServer({
    root: resolve('examples/signal'),
    server: { host: '127.0.0.1', port: 0 },
  });
  try {
    await server.listen();
    const port = server.httpServer.address().port;
    result = await capture({
      url: `http://127.0.0.1:${port}/`,
      project: 'examples/signal',
      out: capsule,
      title: 'Signal',
      scenario: 'examples/signal/journey.mjs',
      timeout: 20_000,
    });
  } finally {
    await server.close();
  }
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  if (dir) await rm(dir, { recursive: true, force: true });
});

test('React app captures all five endpoints and passes the same journey with its server stopped', async () => {
  assert.equal(result.data.fixtures.length, 5);
  assert.equal(result.report.passed, true);
  assert.equal(result.report.mode, 'journey');
  const report = await verify(capsule, { scenario: 'examples/signal/journey.mjs' });
  assert.equal(report.passed, true, JSON.stringify(report));
  assert.equal(report.replayedKeys.length, 5);
  assert.equal(report.externalRequests.length, 0);
  const stored = JSON.parse(await readFile(`${capsule}.report.json`, 'utf8'));
  assert.equal(stored.fileSha256, report.fileSha256);
});

test('desktop and mobile exports stay interactive with no horizontal overflow', async () => {
  await mkdir('test-results', { recursive: true });
  for (const viewport of [
    { width: 1440, height: 1120 },
    { width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({ offline: true, viewport });
    try {
      const page = await context.newPage();
      await page.goto(pathToFileURL(capsule).href);
      await page.getByRole('button', { name: 'Open Atlas website', exact: true }).waitFor();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      assert.equal(overflow, false);
      await page.screenshot({ path: `test-results/signal-${viewport.width}.png`, fullPage: true });
      await page.getByRole('button', { name: 'Inside the capsule' }).click();
      assert.equal(
        await page.getByRole('heading', { name: 'Your app. In a capsule.' }).isVisible(),
        true,
      );
      await page.keyboard.press('Escape');
      assert.equal(
        await page.getByRole('heading', { name: 'Your app. In a capsule.' }).isVisible(),
        false,
      );
    } finally {
      await context.close();
    }
  }
});

test('unknown and write requests are blocked even while the browser is online', async () => {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    const requests = [];
    page.on('request', (request) => {
      if (/^https?:/.test(request.url())) requests.push(request.url());
    });
    const file = join(dir, 'runtime.html');
    await writeFile(file, await assemble(minimal, fixtureData()));
    await page.goto(pathToFileURL(file).href);
    const outcome = await page.evaluate(async () => {
      const ok = await (await fetch('/api/items')).json();
      const empty = await fetch('/api/empty');
      const failures = [];
      for (const [url, init] of [
        ['/api/missing', {}],
        ['/api/items', { method: 'POST' }],
        ['https://example.com/leak', {}],
      ]) {
        try {
          await fetch(url, init);
        } catch {
          failures.push(url);
        }
      }
      return { ok, empty: empty.status, failures, misses: window.__APPCAPSULE__.misses };
    });
    assert.deepEqual(outcome.ok.items, ['one', 'two']);
    assert.equal(outcome.empty, 204);
    assert.equal(outcome.failures.length, 3);
    assert.equal(outcome.misses.length, 3);
    assert.deepEqual(requests, []);
    assert.equal(
      await page.getByRole('status').textContent(),
      'This action is outside the recorded demo.',
    );
  } finally {
    await context.close();
  }
});

test('XHR preserves success/error events, response types, abort, and readyState', async () => {
  const context = await browser.newContext({ offline: true });
  try {
    const page = await context.newPage();
    const file = join(dir, 'xhr.html');
    await writeFile(file, await assemble(minimal, fixtureData()));
    await page.goto(pathToFileURL(file).href);
    const outcome = await page.evaluate(async () => {
      const success = await new Promise((resolve) => {
        const xhr = new XMLHttpRequest(),
          states = [];
        xhr.onreadystatechange = () => states.push(xhr.readyState);
        xhr.open('GET', '/api/items');
        xhr.responseType = 'json';
        xhr.onload = () =>
          resolve({
            status: xhr.status,
            response: xhr.response,
            type: xhr.getResponseHeader('content-type'),
            states,
          });
        xhr.send();
      });
      const error = await new Promise((resolve) => {
        const x = new XMLHttpRequest();
        x.open('GET', '/absent');
        x.onerror = () => resolve(x.status);
        x.send();
      });
      const abort = await new Promise((resolve) => {
        const x = new XMLHttpRequest();
        x.open('GET', '/api/items');
        x.onabort = () => resolve('aborted');
        x.send();
        x.abort();
      });
      const abortedFetch = new AbortController();
      abortedFetch.abort();
      let abortName;
      try {
        await fetch('/api/items', { signal: abortedFetch.signal });
      } catch (e) {
        abortName = e.name;
      }
      return { success, error, abort, abortName };
    });
    assert.deepEqual(outcome.success, {
      status: 200,
      response: { items: ['one', 'two'] },
      type: 'application/json',
      states: [1, 2, 3, 4],
    });
    assert.equal(outcome.error, 0);
    assert.equal(outcome.abort, 'aborted');
    assert.equal(outcome.abortName, 'AbortError');
  } finally {
    await context.close();
  }
});

test('CSP blocks unrecorded resource loads and verification reports the failure', async () => {
  const file = join(dir, 'external.html');
  await writeFile(
    file,
    await assemble(
      minimal.replace('</body>', '<img src="https://example.com/forbidden.png"></body>'),
      fixtureData(),
    ),
  );
  const report = await verify(file);
  assert.equal(report.passed, false);
  assert.ok(report.misses.some((x) => x.includes('Blocked resource')) || report.errors.length);
});

test('startup-only checks are labelled honestly, and a failing scenario cannot pass', async () => {
  const file = join(dir, 'plain.html');
  await writeFile(file, await assemble(minimal, fixtureData()));
  const startup = await verify(file);
  assert.equal(startup.mode, 'startup');
  assert.equal(startup.passed, true);
  assert.equal(startup.replayedKeys.length, 0);
  const scenario = join(dir, 'failing.mjs');
  await writeFile(
    scenario,
    'export default async () => { throw new Error("Intentional test failure"); };',
  );
  const report = await verify(file, { scenario });
  assert.equal(report.passed, false);
  assert.ok(report.errors.some((e) => e.includes('Intentional test failure')));
});

test('capture never overwrites an existing output by default', async () => {
  await assert.rejects(
    capture({
      url: 'http://localhost:5173',
      out: capsule,
      scenario: 'examples/signal/journey.mjs',
    }),
    /already exists/,
  );
  assert.equal(extractData(await readFile(capsule, 'utf8')).title, 'Signal');
});

test('an initial hash route is restored when the recipient opens the bare file', async () => {
  const data = fixtureData();
  data.entryUrl = 'http://localhost:5173/#/sample';
  const file = join(dir, 'initial-hash.html');
  await writeFile(file, await assemble(minimal, data));
  const scenario = join(dir, 'initial-hash.mjs');
  await writeFile(
    scenario,
    'export default async ({ page, expect }) => { await expect(page).toHaveURL(/#\\/sample$/); };',
  );
  const report = await verify(file, { scenario });
  assert.equal(report.passed, true, JSON.stringify(report));
});

test('capsule metadata cannot inject markup or active scripts', async () => {
  const context = await browser.newContext({ offline: true });
  try {
    const page = await context.newPage();
    const file = join(dir, 'escaped.html');
    const data = fixtureData();
    data.title = '</script><script>window.injected=true</script>';
    await writeFile(file, await assemble(minimal, data));
    await page.goto(pathToFileURL(file).href);
    assert.equal(await page.evaluate(() => window.injected), undefined);
    await page.getByRole('button', { name: 'Inside the capsule' }).click();
    assert.equal(
      await page.locator('appcapsule-dock').locator('#capsule-title').textContent(),
      data.title,
    );
  } finally {
    await context.close();
  }
});

test('sample and capsule controls pass automated WCAG AA checks, including an open dialog', async () => {
  const context = await browser.newContext({
    offline: true,
    viewport: { width: 1440, height: 1120 },
  });
  try {
    const page = await context.newPage();
    await page.goto(pathToFileURL(capsule).href);
    await page.getByRole('button', { name: 'Open Atlas website' }).waitFor();
    for (const state of ['workspace', 'capsule', 'project']) {
      if (state === 'capsule')
        await page.getByRole('button', { name: 'Inside the capsule' }).click();
      if (state === 'project') {
        await page.getByRole('button', { name: 'Close capsule details' }).click();
        await page.getByRole('button', { name: 'Open Atlas website' }).click();
      }
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      assert.deepEqual(
        results.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
        [],
        state,
      );
    }
  } finally {
    await context.close();
  }
});

test('vanilla XHR catalog and hash-routed reading room work without their servers', async () => {
  for (const name of ['catalog', 'fieldbook']) {
    const server = await createServer({
      root: resolve(`examples/${name}`),
      server: { host: '127.0.0.1', port: 0 },
    });
    const out = join(dir, `${name}.html`);
    try {
      await server.listen();
      const url = `http://127.0.0.1:${server.httpServer.address().port}/`;
      const captured = await capture({
        url,
        project: `examples/${name}`,
        out,
        scenario: `examples/${name}/journey.mjs`,
      });
      assert.equal(captured.report.passed, true);
    } finally {
      await server.close();
    }
    const report = await verify(out, { scenario: `examples/${name}/journey.mjs` });
    assert.equal(report.passed, true, JSON.stringify(report));
  }
});

test('blocked writes and changing API data fail capture without replacing an existing export', async () => {
  const root = join(dir, 'guarded-app');
  await mkdir(root);
  await writeFile(
    join(root, 'index.html'),
    '<html><head><title>Guarded app</title></head><body><button id="read">Read</button><button id="write">Write</button><p id="status"></p><script type="module" src="/app.js"></script></body></html>',
  );
  await writeFile(
    join(root, 'app.js'),
    `let n=0; const status=document.querySelector('#status'); document.querySelector('#read').onclick=async()=>{ const r=await fetch('/api/data'); await r.json(); status.textContent='read '+(++n); }; document.querySelector('#write').onclick=async()=>{try{await fetch('/api/data',{method:'POST'})}catch{}status.textContent='write attempted';};`,
  );
  let counter = 0,
    writes = 0;
  const server = await createServer({
    root,
    configFile: false,
    server: { host: '127.0.0.1', port: 0 },
    plugins: [
      {
        name: 'guarded-api',
        configureServer(s) {
          s.middlewares.use((req, res, next) => {
            if (req.url !== '/api/data') return next();
            if (req.method === 'POST') writes++;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ count: ++counter }));
          });
        },
      },
    ],
  });
  try {
    await server.listen();
    const url = `http://127.0.0.1:${server.httpServer.address().port}/`;
    const destination = join(dir, 'protected.html');
    await writeFile(destination, 'previous export');
    const writeJourney = join(dir, 'write-journey.mjs');
    await writeFile(
      writeJourney,
      `export default async({page,expect})=>{await page.getByRole('button',{name:'Write',exact:true}).click();await expect(page.locator('#status')).toHaveText('write attempted');}`,
    );
    await assert.rejects(
      capture({ url, project: root, out: destination, overwrite: true, scenario: writeJourney }),
      /Write request blocked/,
    );
    assert.equal(writes, 0);
    assert.equal(await readFile(destination, 'utf8'), 'previous export');
    const readJourney = join(dir, 'read-journey.mjs');
    await writeFile(
      readJourney,
      `export default async({page,expect})=>{for(let i=1;i<=2;i++){await page.getByRole('button',{name:'Read',exact:true}).click();await expect(page.locator('#status')).toHaveText('read '+i);}}`,
    );
    await assert.rejects(
      capture({ url, project: root, out: destination, overwrite: true, scenario: readJourney }),
      /different data/,
    );
    assert.equal(await readFile(destination, 'utf8'), 'previous export');
  } finally {
    await server.close();
  }
});
