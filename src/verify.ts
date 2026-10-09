import { chromium, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { parse } from 'parse5';
import type { CapsuleData, Journey, VerificationReport } from './types.js';

export async function loadJourney(file?: string): Promise<Journey | undefined> {
  if (!file) return undefined;
  const imported = await import(pathToFileURL(resolve(file)).href);
  if (typeof imported.default !== 'function')
    throw new Error('The scenario must export a default async function.');
  return imported.default;
}

export async function bounded<T>(
  operation: Promise<T>,
  timeout: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} exceeded ${timeout} ms.`)), timeout);
      }),
    ]);
  } finally {
    clearTimeout(timer!);
  }
}

export function extractData(html: string): CapsuleData {
  const doc = parse(html);
  let text: string | undefined;
  const visit = (node: any) => {
    if (
      node.tagName === 'script' &&
      node.attrs?.some((a: any) => a.name === 'id' && a.value === 'appcapsule-data')
    )
      text = node.childNodes?.[0]?.value;
    for (const child of node.childNodes ?? []) visit(child);
  };
  visit(doc);
  if (!text) throw new Error('This file is not an AppCapsule HTML export.');
  const data = JSON.parse(text) as CapsuleData;
  if (
    data.schemaVersion !== 1 ||
    !Array.isArray(data.fixtures) ||
    typeof data.entryUrl !== 'string'
  )
    throw new Error('Invalid or unsupported capsule format.');
  return data;
}

export async function verify(
  file: string,
  options: { scenario?: string; timeout?: number; headed?: boolean } = {},
): Promise<VerificationReport> {
  const started = Date.now();
  const html = await readFile(file, 'utf8');
  const data = extractData(html);
  const journey = await loadJourney(options.scenario);
  const timeout = options.timeout ?? 30_000;
  if (!Number.isSafeInteger(timeout) || timeout <= 0)
    throw new Error('timeout must be a positive integer.');
  const errors: string[] = [],
    externalRequests: string[] = [];
  const browser = await chromium.launch({ headless: !options.headed });
  let diagnostics: { hits: string[]; misses: string[] } = { hits: [], misses: [] };
  try {
    const context = await browser.newContext({
      offline: true,
      serviceWorkers: 'block',
      viewport: { width: 1440, height: 1000 },
    });
    context.setDefaultTimeout(timeout);
    context.setDefaultNavigationTimeout(timeout);
    await context.route('**/*', (route) => {
      if (/^https?:/i.test(route.request().url())) {
        externalRequests.push(route.request().url());
        return route.abort('internetdisconnected');
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    try {
      await page.goto(pathToFileURL(resolve(file)).href, { waitUntil: 'load' });
      await page.waitForFunction(() => Boolean((window as any).__APPCAPSULE__));
      if (journey)
        await bounded(
          journey({ page, context, expect: expect.configure({ timeout }), phase: 'verify' }),
          timeout,
          'Offline journey',
        );
      // Allow effect-driven requests to settle; this does not claim exhaustive coverage.
      await page.waitForTimeout(300);
      diagnostics = await page.evaluate(() => ({
        hits: (window as any).__APPCAPSULE__.hits,
        misses: (window as any).__APPCAPSULE__.misses,
      }));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  } finally {
    await browser.close();
  }
  return {
    schemaVersion: 1,
    passed: errors.length === 0 && externalRequests.length === 0 && diagnostics.misses.length === 0,
    mode: journey ? 'journey' : 'startup',
    checkedAt: new Date().toISOString(),
    fileSha256: createHash('sha256').update(html).digest('hex'),
    durationMs: Date.now() - started,
    fixtureCount: data.fixtures.length,
    replayedKeys: [...new Set(diagnostics.hits)],
    misses: [...new Set(diagnostics.misses)],
    errors: [...new Set(errors)],
    externalRequests: [...new Set(externalRequests)],
  };
}
