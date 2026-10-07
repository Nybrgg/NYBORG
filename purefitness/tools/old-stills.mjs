// Renders stills of the original 3D world from the universe page (HUD hidden).
// node old-stills.mjs <outDir> name=t ...
import { chromium } from 'playwright';
import fs from 'node:fs';
const [out, ...pairs] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
page.setDefaultTimeout(300000);
page.on('pageerror', e => console.log('pageerror', e.message));
await page.goto('http://localhost:4173/?view=univers');
await page.waitForSelector('.experience.is-loaded', { timeout: 300000 });
await page.addStyleTag({ content: '.site-header,.journey-caption,.tour-hud,.journey-progress,.scene-shade{display:none!important}' });
for (const pair of pairs) {
  const [name, t] = pair.split('=');
  await page.evaluate(v => window.dispatchEvent(new CustomEvent('pf-seek', { detail: Number(v) })), t);
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log('saved', name);
}
await browser.close();
