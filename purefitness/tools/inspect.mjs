// node inspect.mjs <url> "<js expression returning JSON-able>"  (env W,H)
import { chromium } from 'playwright';
const [url, expr] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: Number(process.env.W || 1440), height: Number(process.env.H || 900) } });
page.on('console', m => { if (m.type() === 'error') console.log('console.error', m.text().slice(0, 300)); });
page.on('pageerror', e => console.log('pageerror', e.message));
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(800);
console.log(JSON.stringify(await page.evaluate(expr), null, 1));
await browser.close();
