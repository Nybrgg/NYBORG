// Checks the drawer sheet physics: spring in, swipe 1:1, flick to dismiss, spring back, animated close.
import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
page.on('pageerror', e => console.log('pageerror', e.message));
await page.goto('http://localhost:4173/');
await page.waitForTimeout(600);
const x = () => page.evaluate(() => { const d = document.querySelector('[data-pf-menu]'); return { open: d.open, x: d.style.getPropertyValue('--pf-sheet-x'), p: d.style.getPropertyValue('--pf-sheet-progress'), tf: getComputedStyle(d).transform }; });
await page.click('[data-pf-menu-open]');
const samples = [];
for (let i = 0; i < 8; i++) { samples.push((await x()).x); await page.waitForTimeout(50); }
console.log('open spring x:', samples.join(' '));
await page.waitForTimeout(500);
console.log('settled:', await x());
const swipe = (dx, steps, stepMs) => page.evaluate(async ({ dx, steps, stepMs }) => {
  const d = document.querySelector('[data-pf-menu]');
  const target = d.querySelector('.pf-menu-list a') || d;
  const fire = (type, cx) => target.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: cx, clientY: 400 }));
  fire('pointerdown', 100);
  for (let i = 1; i <= steps; i++) { await new Promise(r => setTimeout(r, stepMs)); fire('pointermove', 100 + dx * i / steps); }
  const mid = d.style.getPropertyValue('--pf-sheet-x');
  fire('pointerup', 100 + dx);
  return mid;
}, { dx, steps, stepMs });
console.log('slow small drag mid x:', await swipe(80, 10, 40));
await page.waitForTimeout(800);
console.log('after small drag (should spring back, open):', await x());
console.log('leftward drag mid x (rubberband):', await swipe(-200, 10, 30));
await page.waitForTimeout(800);
console.log('fast flick mid x:', await swipe(120, 4, 16));
await page.waitForTimeout(900);
console.log('after flick (should be closed):', await x());
await page.click('[data-pf-menu-open]');
await page.waitForTimeout(800);
await page.click('[data-pf-menu] [data-pf-close]');
await page.waitForTimeout(100);
console.log('closing mid-way:', await x());
await page.waitForTimeout(800);
console.log('closed:', await x(), 'focus:', await page.evaluate(() => document.activeElement?.getAttribute('aria-label') || document.activeElement?.className));
await browser.close();
