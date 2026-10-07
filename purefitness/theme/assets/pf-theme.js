/* Progressive interactions shared by Shopify sections and the 3D universe. */
(() => {
  const contactDialog = kind => document.querySelector(`[data-pf-contact-dialog="${kind}"]`) || document.querySelector('[data-pf-contact-dialog="projekt"]');
  const openers = new WeakMap();
  function close(dialog, restore = true) {
    if (!dialog?.open) return;
    dialog.close();
    document.querySelectorAll('[data-pf-menu-open]').forEach(button => button.setAttribute('aria-expanded', 'false'));
    if (restore) {
      const opener = openers.get(dialog);
      const target = opener?.isConnected && !opener.closest('dialog:not([open])') ? opener : document.querySelector('[data-pf-menu-open], .menu-trigger');
      target?.focus({ preventScroll: true });
    }
  }
  function open(dialog, trigger) {
    if (!dialog) return;
    document.querySelectorAll('dialog[open]').forEach(other => { if (other !== dialog) close(other, false); });
    if (trigger) openers.set(dialog, trigger);
    if (!dialog.open) dialog.showModal();
    if (dialog.hasAttribute('data-pf-menu')) document.querySelectorAll('[data-pf-menu-open]').forEach(button => button.setAttribute('aria-expanded', 'true'));
  }
  function openContact(kind, trigger) {
    const dialog = contactDialog(kind);
    if (!dialog) return;
    open(dialog, trigger);
  }
  function resolveAnchors() {
    const targets = [...document.querySelectorAll('[data-pf-anchor]')];
    targets.forEach(node => {
      if (!node.dataset.pfOriginalId) node.dataset.pfOriginalId = node.id;
      node.id = node.dataset.pfOriginalId;
    });
    const used = new Set();
    targets.forEach(node => {
      const name = node.dataset.pfAnchor;
      if (!name || used.has(name) || node.closest('[hidden]') || !node.getClientRects().length) return;
      if (!document.getElementById(name)) { node.id = name; used.add(name); }
    });
  }
  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-pf-contact]');
    if (trigger && contactDialog(trigger.dataset.pfContact)) { event.preventDefault(); openContact(trigger.dataset.pfContact, trigger); return; }
    const menu = event.target.closest('[data-pf-menu-open]');
    if (menu) { open(document.querySelector('[data-pf-menu]'), menu); return; }
    const closer = event.target.closest('[data-pf-close]');
    if (closer) { close(closer.closest('dialog')); return; }
    const menuLink = event.target.closest('[data-pf-menu] a');
    if (menuLink) close(menuLink.closest('dialog'), false);
  });
  function initDialogs(scope = document) {
    scope.querySelectorAll('.pf-drawer').forEach(dialog => {
      if (dialog.dataset.pfReady) return;
      dialog.dataset.pfReady = 'true';
      dialog.addEventListener('click', event => {
        if (event.target !== dialog) return;
        const bounds = dialog.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close(dialog);
      });
      dialog.addEventListener('cancel', event => { event.preventDefault(); close(dialog); });
    });
  }
  function initTabs(scope = document) {
    scope.querySelectorAll('[data-pf-tabs]').forEach(group => {
      if (group.dataset.pfReady) return;
      group.dataset.pfReady = 'true';
      const tabs = [...group.querySelectorAll('[data-pf-tab]')];
      const panels = [...group.querySelectorAll('[data-pf-panel]')];
      const activate = (tab, focus = false) => {
        tabs.forEach(item => { const selected = item === tab; item.setAttribute('aria-selected', String(selected)); item.tabIndex = selected ? 0 : -1; });
        panels.forEach(panel => { panel.hidden = panel.id !== tab.getAttribute('aria-controls'); });
        if (focus) tab.focus();
      };
      tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => activate(tab));
        tab.addEventListener('keydown', event => {
          let next;
          if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = tabs[(index + 1) % tabs.length];
          if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = tabs[(index - 1 + tabs.length) % tabs.length];
          if (event.key === 'Home') next = tabs[0];
          if (event.key === 'End') next = tabs.at(-1);
          if (next) { event.preventDefault(); activate(next, true); }
        });
      });
      group.addEventListener('shopify:block:select', event => {
        const panel = event.target.closest('[data-pf-panel]');
        const tab = tabs.find(item => item.getAttribute('aria-controls') === panel?.id);
        if (tab) activate(tab);
      });
    });
  }
  // Reveal sections as they enter the viewport (CSS handles reduced motion).
  let revealObserver = null;
  function initReveal(scope = document) {
    const items = [...scope.querySelectorAll('[data-pf-reveal]:not(.is-revealed)')];
    if (!items.length) return;
    if (!('IntersectionObserver' in window)) { items.forEach(item => item.classList.add('is-revealed')); return; }
    revealObserver ??= new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    items.forEach((item, index) => {
      const siblings = item.parentElement ? [...item.parentElement.children].filter(child => child.hasAttribute('data-pf-reveal')) : [];
      item.style.setProperty('--pf-reveal-index', String(Math.max(0, siblings.indexOf(item))));
      revealObserver.observe(item);
    });
  }
  // Hero shortcuts select the matching environment tab in the solutions section.
  document.addEventListener('click', event => {
    const link = event.target.closest('[data-pf-solution-target]');
    if (!link) return;
    const tabs = [...document.querySelectorAll('[data-pf-solutions] [data-pf-tab]')];
    tabs[Number(link.dataset.pfSolutionTarget)]?.click();
  });
  // Homepage sticky stack: sections under the hero pin below the header and the
  // next one slides over the previous. Tall sections pin at their bottom edge.
  const stack = { items: [], frame: 0 };
  function layoutStack() {
    const main = document.querySelector('.pf-stack-enabled main#indhold');
    stack.items.forEach(item => { item.classList.remove('pf-stack-item'); item.style.removeProperty('top'); item.style.removeProperty('--pf-stack-cover'); });
    stack.items = main ? [...main.children].filter(item => item.querySelector(':scope > .pf-section') && !item.hidden && item.getClientRects().length) : [];
    if (!stack.items.length) return;
    const shell = main.closest('.pf-stack-enabled');
    const offset = parseFloat(getComputedStyle(shell).getPropertyValue('--pf-stack-offset')) || 0;
    const bar = document.querySelector('.pf-header__bar');
    const base = bar ? bar.getBoundingClientRect().bottom + 6 : 0;
    stack.items.forEach((item, index) => {
      item.classList.add('pf-stack-item');
      item.style.setProperty('--pf-stack-index', String(index));
      const top = Math.min(base + index * offset, window.innerHeight - item.offsetHeight);
      item.style.top = `${Math.round(top)}px`;
    });
    updateStack();
  }
  function updateStack() {
    stack.frame = 0;
    stack.items.forEach((item, index) => {
      const next = stack.items[index + 1];
      let cover = 0;
      if (next) {
        const pinned = parseFloat(item.style.top) || 0;
        cover = Math.min(1, Math.max(0, 1 - (next.getBoundingClientRect().top - pinned) / (window.innerHeight * 0.85)));
      }
      item.style.setProperty('--pf-stack-cover', cover.toFixed(3));
    });
  }
  window.addEventListener('scroll', () => { if (stack.items.length && !stack.frame) stack.frame = requestAnimationFrame(updateStack); }, { passive: true });
  if ('ResizeObserver' in window) {
    const stackObserver = new ResizeObserver(() => requestAnimationFrame(layoutStack));
    document.querySelectorAll('.pf-stack-enabled main#indhold > .shopify-section').forEach(section => stackObserver.observe(section));
  }
  window.addEventListener('resize', layoutStack, { passive: true });
  window.addEventListener('load', layoutStack);
  function updateHeader() {
    document.querySelectorAll('[data-pf-header]').forEach(header => {
      header.classList.toggle('is-scrolled', header.hasAttribute('data-pf-solid') || window.scrollY > 50);
      header.closest('.pf-inner-page')?.style.setProperty('--pf-header-offset', `${header.getBoundingClientRect().height}px`);
    });
  }
  initDialogs(); initTabs(); initReveal(); updateHeader(); resolveAnchors(); layoutStack();
  window.addEventListener('scroll', updateHeader, { passive: true });
  window.addEventListener('resize', updateHeader, { passive: true });
  document.addEventListener('shopify:section:load', event => { initDialogs(event.target); initTabs(event.target); initReveal(event.target); updateHeader(); resolveAnchors(); layoutStack(); });
  document.addEventListener('shopify:section:reorder', () => { resolveAnchors(); layoutStack(); });
  document.addEventListener('shopify:section:unload', () => requestAnimationFrame(resolveAnchors));
  document.addEventListener('shopify:section:select', event => {
    const dialog = event.target.querySelector?.('[data-pf-contact-editor]');
    if (dialog) open(dialog);
  });
  document.addEventListener('shopify:block:select', event => {
    const dialog = event.target.closest?.('[data-pf-contact-editor], [data-pf-menu]');
    if (dialog) open(dialog);
    const detail = event.target.closest?.('details');
    if (detail) detail.open = true;
  });
  document.addEventListener('submit', event => {
    const dialog = event.target.closest?.('[data-pf-contact-dialog]');
    if (dialog) { try { sessionStorage.setItem('pf-contact-kind', dialog.dataset.pfContactDialog); } catch {} }
  });
  const returnedDialogs = [...document.querySelectorAll('[data-pf-contact-dialog]')].filter(dialog => dialog.querySelector('[data-pf-contact-success], [data-pf-contact-errors]'));
  if (returnedDialogs.length && !document.querySelector('.pf-contact-page')) {
    let lastKind;
    try { lastKind = sessionStorage.getItem('pf-contact-kind'); } catch {}
    open(returnedDialogs.find(dialog => dialog.dataset.pfContactDialog === lastKind) || returnedDialogs[0]);
  }
})();
