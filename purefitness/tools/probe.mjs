// Interactive-ish probe: node probe.mjs <out.png> <t> "<js to eval with d=debug>"
import { chromium } from 'playwright';
const [out, t, code = ''] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: Number(process.env.W || 1280), height: Number(process.env.H || 800) } });
page.on('console', m => { if (!m.text().includes('KHR_parallel')) console.log('console.' + m.type(), m.text().slice(0, 300)); });
page.on('pageerror', e => console.log('pageerror', e.message));
await page.goto(`http://localhost:4173/dev/index.html?t=${t}${process.env.DAY ? '&day=1' : ''}`);
await page.waitForFunction(() => ['ready', 'error'].includes(window.__state), null, { timeout: 300000 });
await page.evaluate(v => window.__seek(Number(v)), t);
await page.waitForTimeout(800);
const result = await page.evaluate(new Function(`const d = window.__world.debug; ${code}; d.render();`));
if (result !== undefined) console.log(result);
await page.waitForTimeout(Number(process.env.WAIT || 2500));
await page.screenshot({ path: out });
await browser.close();
