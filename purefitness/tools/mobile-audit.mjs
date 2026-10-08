// Mobile audit: horizontal overflow, tap targets < 44px, text < 12px, per page & width.
import { chromium } from 'playwright';
const pages = ['/', '/?view=contact', '/cart', '/collections/all', '/products/power-rack-pro', '/search', '/pages/om', '/404', '/password'];
const widths = (process.env.WIDTHS || '360,390,768').split(',').map(Number);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const w of widths) {
  const page = await browser.newPage({ viewport: { width: w, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  page.on('pageerror', e => console.log('pageerror', e.message));
  for (const url of pages) {
    await page.goto('http://localhost:4173' + url);
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const visible = el => { const s = getComputedStyle(el); const b = el.getBoundingClientRect(); return s.visibility !== 'hidden' && s.display !== 'none' && b.width > 0 && b.height > 0 && !el.closest('dialog:not([open]),[hidden]'); };
      const name = el => (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : el.tagName) + ' "' + (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30) + '"';
      const overflow = [...document.querySelectorAll('body *')].filter(el => visible(el) && el.getBoundingClientRect().right > vw + 1 && !el.closest('.pf-solutions__tabs,[style*="overflow"]')).map(name).slice(0, 6);
      const small = [...document.querySelectorAll('a[href], button, summary, input, select, textarea')].filter(visible).filter(el => { const b = el.getBoundingClientRect(); return (b.height < 40 || b.width < 40) && !el.closest('.pf-header__nav'); }).map(el => { const b = el.getBoundingClientRect(); return name(el) + ` ${Math.round(b.width)}x${Math.round(b.height)}`; }).slice(0, 10);
      const tiny = [...document.querySelectorAll('p, a, span, small, li, label, button, h1, h2, h3')].filter(el => visible(el) && el.childNodes.length && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 12).map(el => name(el) + ' ' + getComputedStyle(el).fontSize).slice(0, 6);
      return { scrollW: document.documentElement.scrollWidth, vw, overflow, small, tiny };
    });
    const issues = r.scrollW > r.vw || r.overflow.length || r.small.length || r.tiny.length;
    if (issues) console.log(`[${w}] ${url} scroll=${r.scrollW}/${r.vw}\n  overflow: ${r.overflow.join(' | ')}\n  small: ${r.small.join(' | ')}\n  tiny: ${r.tiny.join(' | ')}`);
  }
  await page.close();
}
await browser.close();
console.log('done');
