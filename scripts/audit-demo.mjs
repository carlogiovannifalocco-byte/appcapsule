import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ offline: true });
  const page = await context.newPage();
  await page.goto(pathToFileURL(resolve('capsules/signal.html')).href);
  await page.getByRole('button', { name: 'Open Atlas website' }).waitFor();
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  await mkdir('test-results', { recursive: true });
  await writeFile('test-results/accessibility.json', JSON.stringify(results, null, 2));
  console.log(
    JSON.stringify(
      results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
      })),
      null,
      2,
    ),
  );
  if (results.violations.length) process.exitCode = 1;
} finally {
  await browser.close();
}
