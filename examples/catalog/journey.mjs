export default async ({ page, expect }) => {
  await expect(page.getByRole('heading', { name: 'Morning cup' })).toBeVisible();
  await expect(page.locator('article')).toHaveCount(3);
  await page.getByRole('button', { name: 'Save Morning cup', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saved (1)', exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Collection' }).selectOption('Desk');
  await expect(page.locator('article')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Everyday notebook' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Collection' }).selectOption('All objects');
  await page.getByRole('button', { name: 'Saved (1)', exact: true }).click();
  await expect(page.locator('article')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Morning cup' })).toBeVisible();
};
