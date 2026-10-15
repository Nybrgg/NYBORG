// Screenshots the home page (desktop + mobile) and exercises all 9 calculator types.
// Usage: node preview.mjs 4173 & node shoot.mjs [baseUrl] [outDir]
import { chromium } from 'playwright';
import fs from 'node:fs';
const base = process.argv[2] || 'http://localhost:4173';
const out = process.argv[3] || 'shots';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
const errors = [];
const showAll = page => page.evaluate(() => document.querySelectorAll('[data-nf-reveal]').forEach(e => e.classList.add('is-visible')));
for (const [name, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport });
  page.on('pageerror', e => errors.push(`${name}: ${e.message}`));
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await showAll(page);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
  console.log(name, 'horizontal overflow:', await page.evaluate(() => document.documentElement.scrollWidth - innerWidth));
  await page.close();
}
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', e => errors.push(`calc: ${e.message}`));
await page.goto(`${base}/`, { waitUntil: 'networkidle' });
await showAll(page);
const results = {};
for (const type of ['ampul', 'toerstof', 'vaeske', 'draaber', 'fortynding', 'vaegt', 'pumpe', 'enheder', 'elektrolyt']) {
  await page.click(`[data-type="${type}"]`);
  await page.click('.nf-calc__submit');
  results[type] = (await page.textContent('[data-nf-calc-out] .nf-result__row--result dd').catch(() => page.textContent('[data-nf-calc-out]'))).trim();
}
console.log(results);
await page.click('[data-type="pumpe"]');
await page.click('.nf-calc__submit');
await page.locator('[data-nf-calc]').screenshot({ path: `${out}/calculator.png` });
console.log('page errors:', errors.length ? errors : 'none');
await browser.close();
