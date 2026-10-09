import { chromium } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdir, copyFile } from 'node:fs/promises';

await mkdir('test-results/video', { recursive: true });
const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    offline: true,
    viewport: { width: 1280, height: 960 },
    recordVideo: { dir: 'test-results/video', size: { width: 1280, height: 960 } },
  });
  const page = await context.newPage();
  await page.goto(pathToFileURL(resolve('capsules/signal.html')).href);
  await page.getByRole('button', { name: 'Open Atlas website', exact: true }).waitFor();
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Open Atlas website', exact: true }).click();
  await page.waitForTimeout(1600);
  await page.getByLabel('Refine the type scale').check();
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: 'Close project', exact: true }).click();
  await page.getByRole('button', { name: 'Design', exact: true }).click();
  await page.waitForTimeout(1100);
  await page.getByRole('button', { name: 'All projects', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Search projects' })
    .pressSequentially('orbit', { delay: 130 });
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Clear search' }).click();
  await page.getByRole('button', { name: 'Inside the capsule' }).click();
  await page.waitForTimeout(1800);
  await page.getByRole('button', { name: 'Close capsule details' }).click();
  await page.waitForTimeout(500);
  await context.close();
  await page.video().saveAs('docs/demo.webm');
  await copyFile('test-results/signal-1440.png', 'docs/signal.png');
  console.log('Saved docs/demo.webm and docs/signal.png.');
} finally {
  await browser.close();
}
