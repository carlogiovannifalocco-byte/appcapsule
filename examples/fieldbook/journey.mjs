export default async ({ page, expect }) => {
  await expect(page.getByRole('heading', { name: 'Room for a new perspective.' })).toBeVisible();
  for (const title of ['The art of paying attention', 'A little less, done well']) {
    await page.getByRole('link', { name: new RegExp(title) }).click();
    await expect(page.locator('article').getByRole('heading', { name: title })).toBeVisible();
    await expect(page.locator('article > p:not(.eyebrow)')).toHaveCount(3);
    await page.getByRole('link', { name: 'Back to the reading room' }).click();
    await expect(page.getByRole('heading', { name: 'Room for a new perspective.' })).toBeVisible();
  }
};
