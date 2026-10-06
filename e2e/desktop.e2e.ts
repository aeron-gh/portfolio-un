import { expect, test } from '@playwright/test';

test('the standalone desktop loads without script errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/desktop/');
  await expect(page.locator('#desktop')).toBeVisible({ timeout: 6000 });
  expect(errors).toEqual([]);
});

test('the music app says the playlist is coming when none is set', async ({ page }) => {
  await page.goto('/desktop/');
  await page.locator('.dock-item[data-app="music-player"]').click();
  await expect(page.locator('.mp-empty')).toContainText('Playlist coming soon');
});

test('the music app embeds the Spotify playlist when one is set', async ({ page }) => {
  await page.route('https://open.spotify.com/**', (r) => r.fulfill({ contentType: 'text/html', body: 'ok' }));
  await page.goto('/desktop/');
  await expect(page.locator('#desktop')).toBeVisible();
  await page.evaluate(() => {
    (window as unknown as { SITE: { spotifyEmbed: string } }).SITE.spotifyEmbed =
      'https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M';
  });
  await page.locator('.dock-item[data-app="music-player"]').click();
  await expect(page.locator('.mp-frame')).toHaveAttribute('src', 'https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M');
});

test('the terminal contact command shows the real links', async ({ page }) => {
  await page.goto('/desktop/');
  await page.locator('.dock-item[data-app="terminal"]').click();
  const input = page.locator('.terminal-input:not([disabled])');
  await input.fill('contact');
  await input.press('Enter');
  const out = page.locator('.window-content').filter({ hasText: 'Contact' }).last();
  await expect(out).toContainText('linkedin.com/in/aeron-li');
  await expect(out).toContainText('agab0323@gmail.com');
  await expect(out).not.toContainText('your-linkedin-here');
});
