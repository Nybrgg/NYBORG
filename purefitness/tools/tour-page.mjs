// Scrolls the real universe page to given progress values and screenshots each.
// node tour-page.mjs <outDir> t1 t2 ... (env W,H,MENU=1)
import { chromium } from 'playwright';
import fs from 'node:fs';
const [out, ...ts] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: Number(process.env.W || 1440), height: Number(process.env.H || 900) } });
page.setDefaultTimeout(300000);
page.on('pageerror', e => console.log('pageerror', e.message));
await page.goto('http://localhost:4173/?view=univers');
await page.waitForSelector('.experience.is-loaded', { timeout: 300000 });
await page.waitForTimeout(3000);
for (const t of ts) {
  await page.evaluate(v => { const d = Number(document.querySelector('.journey').dataset.distance); window.scrollTo(0, v * d); }, Number(t));
  await page.waitForTimeout(Number(process.env.WAIT || 4000));
  await page.screenshot({ path: `${out}/p${String(t).replace('.', '_')}.png` });
}
if (process.env.MENU) {
  await page.click('.menu-trigger');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/menu.png` });
}
await browser.close();
