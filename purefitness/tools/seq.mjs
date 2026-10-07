// Viewport-by-viewport capture of a page, stitched into one tall image.
// node seq.mjs <url> <out.png> (env W,H,SCHEME)
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const [url, out] = process.argv.slice(2);
const W = Number(process.env.W || 1440), H = Number(process.env.H || 900);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: W, height: H }, colorScheme: process.env.SCHEME || 'dark' });
page.on('pageerror', e => console.log('pageerror', e.message));
page.on('console', m => { if (m.type() === 'error') console.log('console.error', m.text().slice(0, 200)); });
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(1200);
const total = await page.evaluate(() => document.documentElement.scrollHeight);
const tiles = [];
const dir = out.replace(/\.png$/, '_tiles');
fs.mkdirSync(dir, { recursive: true });
for (let y = 0, i = 0; y < total; y += H, i++) {
  await page.evaluate(v => window.scrollTo(0, v), y);
  await page.waitForTimeout(1100);
  const file = `${dir}/${String(i).padStart(2, '0')}.png`;
  await page.screenshot({ path: file });
  tiles.push(file);
}
await browser.close();
execFileSync('python3', ['-c', `
import sys
from PIL import Image
tiles = sys.argv[2:]
ims = [Image.open(t) for t in tiles]
w = ims[0].width
sheet = Image.new('RGB', (w, sum(i.height for i in ims)))
y = 0
for im in ims: sheet.paste(im, (0, y)); y += im.height
sheet.save(sys.argv[1])
`, out, ...tiles]);
console.log('tiles', tiles.length);
