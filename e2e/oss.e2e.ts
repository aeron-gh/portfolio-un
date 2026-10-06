import { expect, test } from '@playwright/test';

test('open-source blocks open and close', async ({ page }) => {
  await page.goto('/');
  const thanos = page.locator('#thanos-head');
  await expect(thanos).toHaveAttribute('aria-expanded', 'false');
  await thanos.click();
  await expect(thanos).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('link', { name: /propagate series set error/ })).toBeVisible();
  await thanos.click();
  await expect(thanos).toHaveAttribute('aria-expanded', 'false');
});

test('a closed block cannot be tabbed into', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#thanos-body')).toHaveJSProperty('inert', true);
  await expect(page.locator('#p4c-body')).toHaveJSProperty('inert', false);
});

test('the graph tooltip names the day', async ({ page }) => {
  await page.goto('/');
  await page.locator('#oss').scrollIntoViewIfNeeded();
  await page.locator('.g-grid i.l1, .g-grid i.l2, .g-grid i.l3').first().hover();
  const tip = page.locator('[data-tip-el]');
  await expect(tip).toHaveClass(/show/);
  await expect(tip).toHaveText(/merged · [A-Z][a-z]{2} \d{1,2}$/);
});

test('a long history keeps graph dots readable on phones and laptops', async ({ page }) => {
  for (const [width, minDot] of [[375, 8], [1280, 8]] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    // Grow the graph to 26 weeks the way the build would: 9 older weeks, marked "old" (age >= 17).
    await page.evaluate(() => {
      const fig = document.querySelector<HTMLElement>('[data-graph]')!;
      const grid = fig.querySelector('.g-grid')!;
      const months = fig.querySelector('.g-months')!;
      for (let i = 0; i < 9 * 7; i++) {
        const cell = document.createElement('i');
        cell.className = 'l0 old';
        grid.prepend(cell);
      }
      for (let i = 0; i < 9; i++) {
        const label = document.createElement('span');
        label.className = 'old';
        months.prepend(label);
      }
      fig.style.setProperty('--weeks', '26');
      fig.style.setProperty('--recent', '17');
      fig.closest('.rv')?.classList.add('in');
    });
    const dot = await page.locator('.g-grid i:not(.old)').first().boundingBox();
    expect(dot!.width, `dot width at ${width}px`).toBeGreaterThanOrEqual(minDot);
  }
});
