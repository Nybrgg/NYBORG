// Scrolls forward/back/forward and logs per-frame WebGL draw calls, framebuffer switches and DOM work.
import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
page.setDefaultTimeout(400000);
await page.addInitScript(() => {
  const P = WebGL2RenderingContext.prototype;
  window.__gl = { draws: 0, fbo: 0, tex: 0 };
  for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) { const f = P[name]; P[name] = function (...a) { window.__gl.draws++; return f.apply(this, a); }; }
  const fb = P.bindFramebuffer; P.bindFramebuffer = function (...a) { window.__gl.fbo++; return fb.apply(this, a); };
  for (const name of ['texImage2D', 'texSubImage2D']) { const f = P[name]; P[name] = function (...a) { window.__gl.tex++; return f.apply(this, a); }; }
  const cp = P.compileShader; P.compileShader = function (...a) { (window.__gl.compile = (window.__gl.compile || 0) + 1); return cp.apply(this, a); };
});
await page.goto('http://localhost:4173/?view=univers');
await page.waitForSelector('.experience.is-loaded', { timeout: 400000 });
await page.waitForTimeout(4000);
await page.evaluate(() => { window.__log = []; let last = { ...window.__gl }; const loop = () => { const g = window.__gl; const d = { draws: g.draws - last.draws, fbo: g.fbo - last.fbo, tex: g.tex - last.tex, compile: (g.compile || 0) - (last.compile || 0), chapter: document.querySelector('.experience').dataset.chapter, cls: document.querySelector('.experience').className.replace('experience ', '') }; last = { ...g }; d.t = (window.scrollY / Number(document.querySelector('.journey').dataset.distance)).toFixed(3); if (d.draws) window.__log.push(d); requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
const d = await page.evaluate(() => Number(document.querySelector('.journey').dataset.distance));
const seq = (process.env.SEQ || '0.14,0.02,0.14,0.02,0.14').split(',').map(Number);
for (const target of seq) {
  const now = await page.evaluate(() => window.scrollY);
  const delta = target * d - now; const steps = 12;
  for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, delta / steps); await page.waitForTimeout(150); }
  await page.waitForTimeout(2500);
}
const log = await page.evaluate(() => window.__log);
const draws = log.map(l => l.draws).sort((a, b) => a - b);
console.log('frames', log.length, 'median draws', draws[draws.length >> 1]);
log.forEach((l, i) => { if (l.draws > draws[draws.length >> 1] * 1.4 || l.tex || l.compile || l.fbo > 6) console.log(i, JSON.stringify(l)); });
const fb = log.map(l => l.fbo).sort((a,b)=>a-b); console.log('median fbo', fb[fb.length>>1], 'max draws', draws.at(-1));
await browser.close();
