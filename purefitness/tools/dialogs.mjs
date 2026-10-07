import { chromium } from 'playwright';
const [out] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const [w, h, tag] of [[1440, 900, 'd'], [390, 844, 'm']]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', e => console.log('pageerror', e.message));
  await page.goto('http://localhost:4173/');
  await page.waitForTimeout(800);
  await page.locator('[data-pf-contact="projekt"]:visible').first().click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/contact_${tag}.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  if (tag === 'm') { await page.click('[data-pf-menu-open]'); await page.waitForTimeout(900); await page.screenshot({ path: `${out}/menu_${tag}.png` }); }
  await page.close();
}
await browser.close();
