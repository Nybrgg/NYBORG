import { chromium } from 'playwright';
const [url, wait, expr] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(300000);
await page.goto(url);
await page.waitForTimeout(Number(wait));
console.log(JSON.stringify(await page.evaluate(expr), null, 1));
await browser.close();
