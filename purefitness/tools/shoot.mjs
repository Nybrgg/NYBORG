// Screenshot helper: node shoot.mjs <baseUrl> <outDir> [path ...]
import { chromium } from 'playwright';
import fs from 'node:fs';
const [base, out, ...paths] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const viewports = (process.env.VP || 'desktop').split(',');
const sizes = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };
for (const vp of viewports) {
  const page = await browser.newPage({ viewport: sizes[vp], deviceScaleFactor: 1, colorScheme: process.env.SCHEME || 'light' });
  page.setDefaultTimeout(240000);
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[${vp}] console.${m.type()}:`, m.text().slice(0, 300)); });
  page.on('pageerror', e => console.log(`[${vp}] pageerror:`, e.message));
  for (const p of (paths.length ? paths : ['/'])) {
    const [route, scroll] = p.split('@');
    await page.goto(base + route, { waitUntil: 'load' });
    await page.waitForTimeout(Number(process.env.WAIT || 800));
    if (scroll) { await page.evaluate(y => window.scrollTo(0, y), Number(scroll)); await page.waitForTimeout(Number(process.env.WAIT || 800)); }
    if (process.env.FULL === '1') {
      await page.evaluate(async () => {
        for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); }
        window.scrollTo(0, 0); await new Promise(r => setTimeout(r, 900));
      });
    }
    const name = `${vp}${route.replace(/[^a-z0-9]+/gi, '_')}${scroll ? '_' + scroll : ''}.png`;
    await page.screenshot({ path: `${out}/${name}`, fullPage: process.env.FULL === '1' });
    console.log('saved', name);
  }
  await page.close();
}
await browser.close();
