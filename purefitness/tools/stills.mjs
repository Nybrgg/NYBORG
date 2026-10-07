// Renders named stills from explicit camera poses: node stills.mjs <outDir> (env DAY, W, H)
import { chromium } from 'playwright';
import fs from 'node:fs';
const [out] = process.argv.slice(2);
const shots = JSON.parse(fs.readFileSync(new URL('./stills.json', import.meta.url)));
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: Number(process.env.W || 1600), height: Number(process.env.H || 1000) } });
page.setDefaultTimeout(300000);
page.on('pageerror', e => console.log('pageerror', e.message));
await page.goto(`http://localhost:4173/dev/index.html?t=0${process.env.DAY ? '&day=1' : ''}`);
await page.waitForFunction(() => ['ready', 'error'].includes(window.__state), null, { timeout: 300000 });
await page.evaluate(() => { document.getElementById('hud').hidden = true; });
for (const [name, shot] of Object.entries(shots)) {
  if (process.env.ONLY && !process.env.ONLY.split(',').includes(name)) continue;
  await page.evaluate(s => { window.__pfCamera = s.cam || null; window.__seek(s.t ?? 0); window.__world.debug.render(); }, shot);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log('saved', name);
}
await browser.close();
