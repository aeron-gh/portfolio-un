import { test, expect, type Page } from '@playwright/test';
// Temporary: logs what scrolls the Files view during the tab test, to compare CI with a local run.
const files = (page: Page) => page.locator('.window[data-app="files"]');
const item = (page: Page, name: string) => files(page).getByRole('listbox', { name: 'Content' }).getByRole('option', { name, exact: true });
const place = (page: Page, name: string) => files(page).getByRole('listbox', { name: 'Places' }).getByRole('option', { name, exact: true });
const tab = (page: Page, name: string) => files(page).getByRole('tab', { name, exact: true });
test('probe tab scroll', async ({ page }) => {
  await page.addInitScript(() => {
    const short = () => (new Error().stack ?? '').split('\n').slice(2, 6).map((l) => l.trim().replace(/https?:\/\/[^/]+/, '')).join(' < ');
    const d = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop')!;
    Object.defineProperty(Element.prototype, 'scrollTop', { get: d.get, set(v) { if ((this as Element).classList?.contains('view')) console.log(`PROBE set scrollTop=${v} | ${short()}`); d.set!.call(this, v); } });
    const sIV = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (...a) { console.log(`PROBE scrollIntoView ${(this as Element).getAttribute('aria-label')} | ${short()}`); return sIV.apply(this, a as never); };
    const foc = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = function (o?: FocusOptions) { if (!o?.preventScroll) console.log(`PROBE focus without preventScroll ${this.className} | ${short()}`); return foc.call(this, o); };
    document.addEventListener('scroll', (e) => { const t = e.target as Element; if (t.classList?.contains('view')) console.log(`PROBE scroll event top=${t.scrollTop} connected=${t.isConnected}`); }, true);
  });
  page.on('console', (m) => m.text().startsWith('PROBE') && console.log(m.text().slice(0, 400)));
  const sizes = async (label: string) => console.log(`PROBE ${label}: ${await files(page).locator('.view').evaluate((v) => `top=${v.scrollTop} sh=${v.scrollHeight} ch=${v.clientHeight} row=${v.querySelector('.item')?.getBoundingClientRect().height}`)}`);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/desktop/');
  await page.locator('.gdm-user').click();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Files', exact: true }).click();
  await expect(item(page, 'Documents')).toBeVisible();
  await page.keyboard.press('Control+1');
  await page.keyboard.press('Control+=');
  await item(page, 'Pictures').click();
  await sizes('before scrollTo');
  await files(page).locator('.view').evaluate((v) => v.scrollTo(0, 80));
  await sizes('after scrollTo');
  await page.keyboard.press('Control+t');
  await place(page, 'Documents').click();
  await item(page, 'about.md').click();
  await tab(page, 'Home').click();
  await expect(item(page, 'Pictures')).toHaveAttribute('aria-selected', 'true');
  await page.waitForTimeout(1000);
  await sizes('back on Home');
});
