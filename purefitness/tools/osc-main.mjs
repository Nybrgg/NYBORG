// Profiles main-thread work while oscillating forward/back, and records layout jumps of the caption.
import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
page.setDefaultTimeout(400000);
await page.goto('http://localhost:4173/?view=univers');
await page.waitForSelector('.experience.is-loaded', { timeout: 400000 });
await page.waitForTimeout(4000);
await page.evaluate(() => {
  window.__ev = [];
  const cap = document.querySelector('.journey-caption');
  let lastBottom = cap.getBoundingClientRect().bottom, lastCls = '';
  const loop = () => { const b = cap.getBoundingClientRect().bottom; const cls = document.querySelector('.experience').className; if (Math.abs(b - lastBottom) > 2 || cls !== lastCls) window.__ev.push({ jump: Math.round(b - lastBottom), cls: cls.replace('experience ', ''), t: (scrollY / Number(document.querySelector('.journey').dataset.distance)).toFixed(3) }); lastBottom = b; lastCls = cls; requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  window.__mut = 0; new MutationObserver(r => { window.__mut += r.length; }).observe(document.documentElement, { subtree: true, childList: true, attributes: true });
});
const cdp = await page.context().newCDPSession(page);
await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start');
const d = await page.evaluate(() => Number(document.querySelector('.journey').dataset.distance));
for (const target of [0.08, 0.02, 0.08, 0.02, 0.08]) {
  const now = await page.evaluate(() => scrollY); const delta = target * d - now;
  for (let i = 0; i < 10; i++) { await page.mouse.wheel(0, delta / 10); await page.waitForTimeout(150); }
  await page.waitForTimeout(2000);
}
const { profile } = await cdp.send('Profiler.stop');
const byId = new Map(profile.nodes.map(n => [n.id, n])); const self = new Map();
profile.samples.forEach((id, i) => { const n = byId.get(id); const k = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').pop()}:${n.callFrame.lineNumber}`; self.set(k, (self.get(k) || 0) + (profile.timeDeltas[i] || 0) / 1000); });
[...self.entries()].sort((a, b) => b[1] - a[1]).slice(1, 16).forEach(([k, v]) => console.log(v.toFixed(0).padStart(6) + 'ms ' + k));
console.log('mutations', await page.evaluate(() => window.__mut));
console.log(JSON.stringify(await page.evaluate(() => window.__ev)));
await browser.close();
