// Renders the dev world at given progress values.
// node shoot-world.mjs <outDir> t1 t2 ...   (env: DAY=1, W, H, PROD=1, WAIT)
import { chromium } from 'playwright';
import fs from 'node:fs';

const [out, ...ts] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: Number(process.env.W || 1280), height: Number(process.env.H || 800) } });
page.on('console', m => { if (['error', 'warning'].includes(m.type()) && !m.text().includes('KHR_parallel')) console.log('console.' + m.type(), m.text().slice(0, 400)); });
page.on('pageerror', e => console.log('pageerror', e.message));
const q = `${process.env.DAY ? '&day=1' : ''}${process.env.PROD ? '&prod=1' : ''}`;
const t0 = Date.now();
await page.goto(`http://localhost:4173/dev/index.html?t=${ts[0] || 0}${q}`);
await page.waitForFunction(() => ['ready', 'error'].includes(window.__state), null, { timeout: 300000 });
console.log('state', await page.evaluate(() => window.__state), `${Date.now() - t0}ms`);
for (const t of ts) {
  await page.evaluate(v => window.__seek(Number(v)), t);
  await page.waitForTimeout(Number(process.env.WAIT || 1500));
  const file = `${out}/t${String(t).replace('.', '_')}${process.env.DAY ? '_day' : ''}.png`;
  await page.screenshot({ path: file });
  console.log('saved', file);
}
await browser.close();
