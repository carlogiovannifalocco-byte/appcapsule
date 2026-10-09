import type { Page, BrowserContext, expect as playwrightExpect } from '@playwright/test';

export interface CapsuleOptions {
  /** A running local app with synthetic data. Only loopback URLs are accepted. */
  url: string;
  /** Vite project directory. Defaults to the configuration directory. */
  project?: string;
  out?: string;
  title?: string;
  /** ESM file exporting a default async ({ page, expect, phase }) function. */
  scenario?: string;
  headed?: boolean;
  /** Extra API origins to record. The app origin is included automatically. */
  apiOrigins?: string[];
  /** Additional JSON keys to replace with [REDACTED], case insensitive. */
  redactKeys?: string[];
  /** Max time per navigation / assertion / scenario, milliseconds. */
  timeout?: number;
  maxResponseBytes?: number;
  maxTotalBytes?: number;
  overwrite?: boolean;
  /** Called in interactive capture; resolve when the user finishes recording. */
  onReady?: (page: Page) => Promise<void>;
  onProgress?: (message: string) => void;
}

export interface Fixture {
  key: string;
  url: string;
  status: number;
  contentType: string;
  body: string;
  method: 'GET' | 'HEAD';
}
export interface CapsuleData {
  schemaVersion: 1;
  generator: 'appcapsule/0.1.0';
  title: string;
  entryUrl: string;
  createdAt: string;
  fixtures: Fixture[];
  redactions: number;
}
export interface VerificationReport {
  schemaVersion: 1;
  passed: boolean;
  mode: 'journey' | 'startup';
  checkedAt: string;
  fileSha256: string;
  durationMs: number;
  fixtureCount: number;
  replayedKeys: string[];
  misses: string[];
  errors: string[];
  externalRequests: string[];
}
export interface JourneyContext {
  page: Page;
  context: BrowserContext;
  expect: typeof playwrightExpect;
  phase: 'capture' | 'verify';
}
export type Journey = (context: JourneyContext) => Promise<void>;
