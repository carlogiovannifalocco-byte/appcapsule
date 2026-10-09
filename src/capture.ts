import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile, rename, rm, access, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { buildApp, assemble } from './bundle.js';
import { requestKey } from './shared.js';
import { assertPublicUrl, sanitizeBody } from './privacy.js';
import { bounded, loadJourney, verify } from './verify.js';
import type { CapsuleOptions, CapsuleData, Fixture, VerificationReport } from './types.js';

export function validateOptions(options: CapsuleOptions): void {
  let url: URL;
  try {
    url = new URL(options.url);
  } catch {
    throw new Error('Provide the URL of your running app, for example http://localhost:5173.');
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  ) {
    throw new Error('Capture is limited to your own app on localhost, 127.0.0.1 or [::1].');
  }
  if (url.pathname !== '/' || url.search)
    throw new Error(
      'Use a root URL, optionally with a hash route. Path routing is not supported in file exports.',
    );
  assertPublicUrl(url.href);
  for (const origin of options.apiOrigins ?? []) {
    const parsed = new URL(origin);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin)
      throw new Error('apiOrigins must contain HTTP(S) origins without a trailing slash or path.');
  }
  for (const [key, val] of Object.entries({
    timeout: options.timeout,
    maxResponseBytes: options.maxResponseBytes,
    maxTotalBytes: options.maxTotalBytes,
  })) {
    if (val !== undefined && (!Number.isSafeInteger(val) || val <= 0))
      throw new Error(`${key} must be a positive integer.`);
  }
}

export async function capture(
  options: CapsuleOptions,
): Promise<{ file: string; report: VerificationReport; data: CapsuleData; bytes: number }> {
  validateOptions(options);
  const progress = options.onProgress ?? (() => {});
  const timeout = options.timeout ?? 30_000;
  const out = resolve(options.out ?? 'capsules/demo.html');
  if (!out.endsWith('.html')) throw new Error('The output filename must end in .html.');
  if (!options.overwrite) {
    let exists = false;
    try {
      await access(out);
      exists = true;
    } catch {}
    if (exists) throw new Error('Output already exists. Choose another filename or use --force.');
  }
  const journey = await loadJourney(options.scenario);
  if (!journey && !options.onReady)
    throw new Error('Provide a scenario, or run interactive capture from a terminal.');
  progress('Building your Vite app…');
  const html = await buildApp(options.project ?? process.cwd());
  const origin = new URL(options.url).origin;
  const origins = new Set([origin, ...(options.apiOrigins ?? [])]);
  const fixtures = new Map<string, Fixture>();
  const pending = new Set<Promise<void>>();
  const problems = new Set<string>();
  let total = 0,
    redactions = 0;
  const browser = await chromium.launch({
    headless: journey ? !options.headed : false,
  });
  try {
    const context = await browser.newContext({
      serviceWorkers: 'block',
      viewport: { width: 1440, height: 1000 },
    });
    context.setDefaultTimeout(timeout);
    context.setDefaultNavigationTimeout(timeout);
    await context.route('**/*', (route) => {
      const req = route.request();
      if (!['GET', 'HEAD'].includes(req.method())) {
        problems.add(
          `Write request blocked during capture: ${req.method()}. Version 0.1 supports read-only HTTP data.`,
        );
        return route.abort('blockedbyclient');
      }
      if (
        ['fetch', 'xhr'].includes(req.resourceType()) &&
        !origins.has(new URL(req.url()).origin)
      ) {
        problems.add(
          'An API origin is not allowed. Add the intended synthetic-data API origin to apiOrigins.',
        );
        return route.abort('blockedbyclient');
      }
      return route.continue();
    });
    context.on('response', (response) => {
      const request = response.request();
      if (!['fetch', 'xhr'].includes(request.resourceType())) return;
      const operation = (async () => {
        assertPublicUrl(request.url());
        const status = response.status();
        if (status >= 300 && status < 400)
          throw new Error('Redirected API responses are unsupported. Use a direct endpoint.');
        const contentType = (await response.headerValue('content-type')) ?? 'text/plain';
        if (!/json|^text\//i.test(contentType))
          throw new Error('Only JSON and text API responses are supported.');
        const headerLength = Number(await response.headerValue('content-length'));
        const max = options.maxResponseBytes ?? 2_000_000;
        if (headerLength > max) throw new Error('An API response exceeds maxResponseBytes.');
        const buffer = await response.body();
        if (buffer.length > max) throw new Error('An API response exceeds maxResponseBytes.');
        const sanitized =
          request.method() === 'HEAD' || [204, 205].includes(status)
            ? { body: '', redactions: 0 }
            : sanitizeBody(buffer.toString('utf8'), contentType, options.redactKeys);
        const key = requestKey(request.method(), request.url(), options.url);
        const fixture: Fixture = {
          key,
          url: new URL(request.url()).href,
          method: request.method() as Fixture['method'],
          status,
          contentType,
          body: sanitized.body,
        };
        const previous = fixtures.get(key);
        if (
          previous &&
          (previous.body !== fixture.body ||
            previous.status !== status ||
            previous.contentType !== contentType)
        ) {
          throw new Error(
            'The same API request returned different data. Freeze timestamps and use stable demo fixtures.',
          );
        }
        if (!previous) {
          total += Buffer.byteLength(sanitized.body);
          if (total > (options.maxTotalBytes ?? 20_000_000) || fixtures.size >= 500)
            throw new Error('Capture exceeds its total size or 500-response limit.');
          redactions += sanitized.redactions;
          fixtures.set(key, fixture);
        }
      })().catch((error) => {
        problems.add(error instanceof Error ? error.message : String(error));
      });
      pending.add(operation);
      void operation.finally(() => pending.delete(operation));
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => problems.add(`The live app raised an error: ${error.message}`));
    progress(
      journey
        ? 'Recording the journey with synthetic data…'
        : 'Use the browser to explore your demo, then return to the terminal.',
    );
    await page.goto(options.url, { waitUntil: 'networkidle' });
    if (journey)
      await bounded(
        journey({ page, context, expect: expect.configure({ timeout }), phase: 'capture' }),
        timeout,
        'Capture journey',
      );
    else await options.onReady!(page);
    await page.waitForLoadState('networkidle');
    await Promise.all(pending);
  } finally {
    await browser.close();
  }
  if (problems.size) throw new Error([...problems].join('\n'));
  const data: CapsuleData = {
    schemaVersion: 1,
    generator: 'appcapsule/0.1.0',
    title: options.title ?? 'My app',
    entryUrl: new URL(options.url).href,
    createdAt: new Date().toISOString(),
    fixtures: [...fixtures.values()].sort((a, b) => a.key.localeCompare(b.key)),
    redactions,
  };
  const output = await assemble(html, data);
  if (Buffer.byteLength(output) > (options.maxTotalBytes ?? 20_000_000) + 10_000_000)
    throw new Error('The assembled app is too large. Reduce assets or increase maxTotalBytes.');
  const temp = await mkdtemp(join(tmpdir(), 'appcapsule-'));
  let report: VerificationReport;
  try {
    const candidate = join(temp, 'demo.html');
    await writeFile(candidate, output, { mode: 0o600 });
    progress('Reopening the HTML file with the network disabled…');
    report = await verify(candidate, { scenario: options.scenario, timeout });
    if (!report.passed)
      throw new Error(
        `Offline verification failed; no export was published.\n${[...report.errors, ...report.misses, ...report.externalRequests].join('\n')}`,
      );
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
  await mkdir(dirname(out), { recursive: true });
  // Exclusive creation protects an existing file even if another capture wins a race.
  if (!options.overwrite) await writeFile(out, output, { flag: 'wx' });
  else {
    const temporary = `${out}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, output, { flag: 'wx' });
      await rename(temporary, out);
    } finally {
      await rm(temporary, { force: true });
    }
  }
  await writeFile(`${out}.report.json`, JSON.stringify(report, null, 2) + '\n');
  progress('Capsule exported.');
  return { file: out, report, data, bytes: Buffer.byteLength(output) };
}
