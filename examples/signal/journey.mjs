export default async function ({ page, expect }) {
  await expect(page.getByRole('heading', { name: 'Make space for good work.' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Open / })).toHaveCount(4);
  for (const name of ['Atlas website', 'Orbit mobile', 'Fieldnotes', 'Studio system']) {
    await page.getByRole('button', { name: `Open ${name}`, exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(
      page.getByRole('dialog').getByRole('heading', { name, exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Close project', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Design', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Open / })).toHaveCount(2);
  await page.getByRole('button', { name: 'All projects', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search projects' }).fill('orbit');
  await expect(page.getByRole('button', { name: /^Open / })).toHaveCount(1);
  await page.getByRole('button', { name: 'Clear search' }).click();
  await page.getByRole('button', { name: 'My tasks', exact: true }).click();
  await page.getByLabel('Review the Atlas homepage').check();
  await expect(page.getByLabel('Review the Atlas homepage')).toBeChecked();
  await page.getByRole('button', { name: 'Projects', exact: true }).click();
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  await page.getByRole('textbox', { name: 'Project name' }).fill('Our next chapter');
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(
    page.getByRole('button', { name: 'Open Our next chapter', exact: true }),
  ).toBeVisible();
}
