// Captures frames at fixed scroll offsets to check the sticky stack.
import { chromium } from 'playwright';
import fs from 'node:fs';
const [out, w, h, step] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) } });
page.on('pageerror', e => console.log('pageerror', e.message));
await page.goto('http://localhost:4173/');
await page.waitForTimeout(1000);
const total = await page.evaluate(() => document.documentElement.scrollHeight);
const info = await page.evaluate(() => [...document.querySelectorAll('.pf-stack-item')].map(i => [i.querySelector('.pf-section').className.split(' ')[1], i.style.top, i.offsetHeight]));
console.log('total', total, JSON.stringify(info));
let n = 0;
for (let y = Number(step); y < total - Number(h); y += Number(step)) {
  await page.evaluate(v => window.scrollTo({ top: v, behavior: 'instant' }), y);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/${String(n++).padStart(2, '0')}.png` });
}
await browser.close();
