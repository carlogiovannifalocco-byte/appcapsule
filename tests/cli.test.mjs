import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
const cli = resolve('dist/cli.js');
const run = (args, cwd) =>
  execFileSync(process.execPath, [cli, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

test('CLI has useful help, a version, and rejects unknown commands', () => {
  assert.match(run(['--help']), /capture/);
  assert.equal(run(['--version']).trim(), '0.1.0');
  assert.throws(
    () => run(['unknown']),
    (error) => error.status === 1 && error.stderr.includes('Unknown command'),
  );
});

test('init produces runnable templates and never overwrites a config', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'appcapsule-cli-'));
  try {
    const result = JSON.parse(run(['init', '--json'], dir));
    assert.equal(result.config, join(dir, 'appcapsule.config.mjs'));
    assert.match(await readFile(result.scenario, 'utf8'), /export default async/);
    const original = await readFile(result.config, 'utf8');
    assert.throws(
      () => run(['init'], dir),
      (error) => error.status === 1 && error.stderr.includes('never overwrites'),
    );
    assert.equal(await readFile(result.config, 'utf8'), original);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('noninteractive capture requires a scenario and missing configs fail early', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'appcapsule-cli-'));
  try {
    assert.throws(
      () => run(['capture', '--url', 'http://localhost:5173'], dir),
      (error) => error.status === 1 && error.stderr.includes('--scenario'),
    );
    assert.throws(
      () => run(['capture', '--config', 'missing.mjs'], dir),
      (error) => error.status === 1 && error.stderr.includes('not found'),
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
