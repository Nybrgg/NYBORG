// Measures main-thread work while scrolling the universe: segment A (start) vs B (later).
import { chromium } from 'playwright';
import fs from 'node:fs';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
page.setDefaultTimeout(400000);
page.on('pageerror', e => console.log('pageerror', e.message));
await page.goto('http://localhost:4173/?view=univers');
await page.waitForSelector('.experience.is-loaded', { timeout: 400000 });
await page.waitForTimeout(4000);
const cdp = await page.context().newCDPSession(page);
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
async function segment(label, from, to) {
  await page.evaluate(v => window.scrollTo({ top: v * Number(document.querySelector('.journey').dataset.distance), behavior: 'instant' }), from);
  await page.waitForTimeout(3000);
  await page.evaluate(() => { window.__frames = []; let last = performance.now(); const loop = t => { window.__frames.push(t - last); last = t; if (window.__frames.length < 4000) window.__raf = requestAnimationFrame(loop); }; window.__raf = requestAnimationFrame(loop); });
  await cdp.send('Profiler.start');
  const d = await page.evaluate(() => Number(document.querySelector('.journey').dataset.distance));
  const steps = 30;
  for (let i = 1; i <= steps; i++) { await page.mouse.wheel(0, ((to - from) * d) / steps); await page.waitForTimeout(120); }
  await page.waitForTimeout(3000);
  const { profile } = await cdp.send('Profiler.stop');
  const frames = await page.evaluate(() => { cancelAnimationFrame(window.__raf); return window.__frames; });
  // Aggregate self time per function.
  const byId = new Map(profile.nodes.map(n => [n.id, n]));
  const self = new Map();
  const dt = profile.timeDeltas; 
  profile.samples.forEach((id, i) => { const n = byId.get(id); const key = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').pop()}:${n.callFrame.lineNumber}:${n.callFrame.columnNumber}`; self.set(key, (self.get(key) || 0) + (dt[i] || 0) / 1000); });
  const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14);
  const sorted = [...frames].sort((a, b) => a - b);
  console.log(`\n== ${label} frames=${frames.length} p50=${sorted[sorted.length >> 1]?.toFixed(0)} p95=${sorted[Math.floor(sorted.length * 0.95)]?.toFixed(0)} max=${sorted.at(-1)?.toFixed(0)} >200ms=${frames.filter(f => f > 200).length}`);
  top.forEach(([k, v]) => console.log(`  ${v.toFixed(0).padStart(6)}ms  ${k}`));
}
await segment('A start 0 -> 0.04', 0, 0.04);
await segment('B later 0.40 -> 0.44', 0.40, 0.44);
await browser.close();
