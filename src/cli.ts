#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { readFile, writeFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { capture } from './capture.js';
import { extractData, verify } from './verify.js';
import type { CapsuleOptions } from './types.js';

const HELP = `
  AppCapsule 0.2.0
  Your app. In a file.

  appcapsule init                         Create a config and journey
  appcapsule capture [options]            Record, bundle, and verify offline
  appcapsule verify <file.html> [options]  Check an existing capsule offline
  appcapsule inspect <file.html>          Show metadata without running the app

  --config <file>      Config path (default: appcapsule.config.mjs)
  --url <url>          Your local Vite app, e.g. http://localhost:5173
  --project <folder>   Vite project directory
  --out <file.html>    Output path (default: capsules/demo.html)
  --scenario <file>    ESM journey, replayed during offline verification
  --title <text>       Name shown inside the capsule
  --timeout <ms>       Time limit (default: 30000)
  --headed            Show the browser during a scripted journey
  --force             Replace an existing output
  --json              Machine-readable result (progress goes to stderr)
  --help              Show help
  --version           Show version

  First run: npx playwright install chromium
  Use synthetic data. Capture blocks HTTP writes. See README for compatibility.
`;

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    strict: true,
    options: {
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
      config: { type: 'string' },
      url: { type: 'string' },
      project: { type: 'string' },
      out: { type: 'string' },
      scenario: { type: 'string' },
      title: { type: 'string' },
      timeout: { type: 'string' },
      headed: { type: 'boolean' },
      force: { type: 'boolean' },
      json: { type: 'boolean' },
    },
  });
  if (values.version) {
    console.log('0.2.0');
    return;
  }
  const command = positionals[0];
  if (values.help || !command) {
    console.log(HELP);
    return;
  }
  const output = (value: unknown, message: string) =>
    console.log(values.json ? JSON.stringify(value, null, 2) : message);
  if (command === 'init') {
    const file = resolve(values.config ?? 'appcapsule.config.mjs');
    const scenarioFile = resolve(dirname(file), 'capsule.journey.mjs');
    for (const target of [file, scenarioFile]) {
      let exists = false;
      try {
        await access(target);
        exists = true;
      } catch {}
      if (exists) throw new Error(`File already exists: ${target}. Init never overwrites files.`);
    }
    await writeFile(
      file,
      `export default {\n  url: 'http://localhost:5173',\n  project: '.',\n  out: 'capsules/demo.html',\n  title: 'My app',\n  scenario: './capsule.journey.mjs',\n  // redactKeys: ['email', 'phone'],\n};\n`,
      { flag: 'wx' },
    );
    await writeFile(
      scenarioFile,
      `// Write assertions for what visitors should be able to do.\n// This same journey runs against the live app and the offline file.\nexport default async function ({ page, expect }) {\n  await expect(page.locator('body')).not.toBeEmpty();\n  // await page.getByRole('button', { name: 'Open dashboard' }).click();\n  // await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();\n}\n`,
      { flag: 'wx' },
    );
    output(
      { config: file, scenario: scenarioFile },
      'Created appcapsule.config.mjs and capsule.journey.mjs.\nStart your app, customize the journey, then run appcapsule capture.',
    );
    return;
  }
  if (command === 'inspect') {
    if (!positionals[1]) throw new Error('Usage: appcapsule inspect <file.html>');
    const data = extractData(await readFile(resolve(positionals[1]), 'utf8'));
    const info = {
      title: data.title,
      generator: data.generator,
      createdAt: data.createdAt,
      responseCount: data.fixtures.length,
      redactions: data.redactions,
      endpoints: data.fixtures.map((f) => ({ method: f.method, url: f.url, status: f.status })),
    };
    output(
      info,
      `${data.title}\n${data.fixtures.length} captured responses · ${data.redactions} redacted fields\nCaptured ${data.createdAt}\n\n${info.endpoints.map((e) => `${e.method} ${e.url} → ${e.status}`).join('\n')}`,
    );
    return;
  }
  if (command === 'verify') {
    if (!positionals[1])
      throw new Error('Usage: appcapsule verify <file.html> --scenario <journey.mjs>');
    const report = await verify(resolve(positionals[1]), {
      scenario: values.scenario,
      timeout: values.timeout ? Number(values.timeout) : undefined,
      headed: values.headed,
    });
    output(
      report,
      `${report.passed ? 'PASS' : 'FAIL'} · ${report.mode} verification · ${report.replayedKeys.length}/${report.fixtureCount} responses exercised\n${[...report.errors, ...report.misses, ...report.externalRequests].join('\n')}`.trim(),
    );
    if (!report.passed) process.exitCode = 1;
    return;
  }
  if (command !== 'capture') throw new Error(`Unknown command: ${command}. Run appcapsule --help.`);
  const configFile = resolve(values.config ?? 'appcapsule.config.mjs');
  let config: Partial<CapsuleOptions> = {},
    base = process.cwd();
  let exists = false;
  try {
    await access(configFile);
    exists = true;
  } catch {}
  if (exists) {
    const imported = await import(pathToFileURL(configFile).href);
    if (!imported.default || typeof imported.default !== 'object')
      throw new Error('Config must export a default options object.');
    config = imported.default;
    base = dirname(configFile);
  } else if (values.config) throw new Error(`Config file not found: ${configFile}`);
  const options: CapsuleOptions = {
    ...config,
    url: values.url ?? config.url ?? '',
    project: values.project ? resolve(values.project) : resolve(base, config.project ?? '.'),
    out: values.out ? resolve(values.out) : resolve(base, config.out ?? 'capsules/demo.html'),
    scenario: values.scenario
      ? resolve(values.scenario)
      : config.scenario
        ? resolve(base, config.scenario)
        : undefined,
    title: values.title ?? config.title,
    timeout: values.timeout ? Number(values.timeout) : config.timeout,
    headed: values.headed ?? config.headed,
    overwrite: values.force ?? config.overwrite,
    onProgress: (message) => console.error(`  ${message}`),
  };
  if (!options.scenario) {
    if (!process.stdin.isTTY)
      throw new Error(
        'Interactive capture needs a terminal. Provide --scenario for CI and scripts.',
      );
    options.onReady = async () => {
      const rl = createInterface({ input: process.stdin, output: process.stderr });
      try {
        await rl.question('  Press Enter here when you have finished exploring… ');
      } finally {
        rl.close();
      }
    };
  }
  const result = await capture(options);
  output(
    {
      file: result.file,
      bytes: result.bytes,
      responses: result.data.fixtures.length,
      redactions: result.data.redactions,
      report: result.report,
    },
    `\n  Ready: ${result.file}\n  ${(result.bytes / 1024).toFixed(1)} KB · ${result.data.fixtures.length} responses · offline ${result.report.mode} passed\n  ${result.data.redactions} fields redacted. Review all embedded data before sharing.\n`,
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\n  AppCapsule: ${message}\n`);
  if (/Executable doesn't exist|browserType.launch/.test(message))
    console.error('  Install the browser: npx playwright install chromium\n');
  process.exitCode = 1;
});
