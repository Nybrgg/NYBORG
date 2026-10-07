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
          if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
          if (event.key === 'ArrowLeft') next = tabs[(index - 1 + tabs.length) % tabs.length];
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
  function updateHeader() {
    document.querySelectorAll('[data-pf-header]').forEach(header => {
      header.classList.toggle('is-scrolled', header.hasAttribute('data-pf-solid') || window.scrollY > 50);
      header.closest('.pf-inner-page')?.style.setProperty('--pf-header-offset', `${header.getBoundingClientRect().height}px`);
    });
  }
  initDialogs(); initTabs(); updateHeader(); resolveAnchors();
  window.addEventListener('scroll', updateHeader, { passive: true });
  window.addEventListener('resize', updateHeader, { passive: true });
  document.addEventListener('shopify:section:load', event => { initDialogs(event.target); initTabs(event.target); updateHeader(); resolveAnchors(); });
  document.addEventListener('shopify:section:reorder', resolveAnchors);
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
