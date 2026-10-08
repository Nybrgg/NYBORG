// Checks the homepage smooth wheel: one wheel event should glide over several frames.
import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', e => console.log('pageerror', e.message));
await page.goto('http://localhost:4173/');
await page.waitForTimeout(800);
console.log('attr', await page.evaluate(() => document.querySelector('[data-pf-smooth-scroll]')?.dataset.pfSmoothScroll));
await page.mouse.move(700, 450);
await page.mouse.wheel(0, 400);
const samples = [];
for (let i = 0; i < 10; i++) { samples.push(await page.evaluate(() => Math.round(scrollY))); await page.waitForTimeout(80); }
await page.waitForTimeout(800);
console.log('one 400px wheel ->', samples.join(' '), 'final', await page.evaluate(() => Math.round(scrollY)));
await page.evaluate(() => document.querySelector('[data-pf-menu-open]')?.click());
await page.waitForTimeout(300);
const before = await page.evaluate(() => Math.round(scrollY));
await page.mouse.wheel(0, 300);
await page.waitForTimeout(600);
console.log('with menu open, page scroll changed by', (await page.evaluate(() => Math.round(scrollY))) - before);
await browser.close();
