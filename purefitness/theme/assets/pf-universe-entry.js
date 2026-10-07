/* Enter the editable 3D section directly from the homepage. */
(() => {
  const selector = '[data-pf-universe-embedded]';
  const shell = document.querySelector('[data-pf-home-shell]');
  if (!shell || !document.querySelector(selector)) return;

  const homeTitle = document.title;
  let root = null;
  let wrapper = null;
  let placeholder = null;
  let active = false;
  let generation = 0;
  let homeScroll = window.scrollY;
  let opener = null;
  let modulePromise = null;
  let moduleUrl = '';
  let reopenAfterEditorLoad = false;
  const homeAddress = new URL(window.location.href);
  homeAddress.searchParams.delete('view');
  if (new URL(window.location.href).searchParams.get('view') === 'univers') homeAddress.hash = '';

  const configuration = element => {
    try { return JSON.parse(element?.querySelector('[data-pf-universe-config]')?.textContent || '{}'); }
    catch { return {}; }
  };
  const currentRoot = () => document.querySelector(selector);
  const homeUrl = () => new URL(configuration(currentRoot()).homeUrl || homeAddress.pathname, window.location.origin);
  const isUniverseUrl = url => url.origin === window.location.origin && url.pathname === homeUrl().pathname && url.searchParams.get('view') === 'univers';
  const preservePreview = url => {
    const preview = new URL(window.location.href).searchParams.get('preview_theme_id');
    if (preview && !url.searchParams.has('preview_theme_id')) url.searchParams.set('preview_theme_id', preview);
    return url;
  };
  const sectionEvent = (element, name) => element.dispatchEvent(new CustomEvent(name, {
    bubbles: true,
    detail: { sectionId: element.dataset.sectionId, pfUniverseEntry: true },
  }));
  const closeDialogs = () => {
    document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
    document.querySelectorAll('[data-pf-menu-open]').forEach(button => button.setAttribute('aria-expanded', 'false'));
  };
  const loadStyles = element => {
    const href = element.dataset.pfUniverseStyles;
    if (!href || [...document.querySelectorAll('link[rel="stylesheet"]')].some(link => link.href === new URL(href, window.location.href).href)) return Promise.resolve();
    return new Promise(resolve => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.addEventListener('load', resolve, { once: true });
      link.addEventListener('error', resolve, { once: true });
      document.head.append(link);
    });
  };
  const loadModule = element => {
    const url = element.dataset.pfUniverseModule;
    if (!modulePromise || moduleUrl !== url) {
      moduleUrl = url;
      modulePromise = import(url).catch(error => { modulePromise = null; throw error; });
    }
    return modulePromise;
  };
  const renderFallback = element => {
    const config = configuration(element);
    const text = config.text || {};
    const host = element.querySelector('[data-pf-universe-host]');
    if (!host) return;
    host.replaceChildren();
    const panel = document.createElement('div');
    panel.className = 'no-script';
    const heading = document.createElement('h1');
    heading.textContent = text.failed_title || text.no_script_title || 'Purefitness';
    const description = document.createElement('p');
    description.textContent = text.failed_detail || text.no_script_intro || '';
    const home = document.createElement('a');
    home.className = 'universe-home';
    home.href = config.homeUrl || homeAddress.pathname;
    home.textContent = text.home_aria || 'PUREFITNESS';
    const contact = document.createElement('a');
    contact.href = config.contactUrl || homeAddress.pathname;
    contact.dataset.pfContact = 'projekt';
    contact.textContent = text.contact_purefitness || 'Purefitness';
    panel.append(heading, description, home, contact);
    host.append(panel);
  };

  const openUniverse = async ({ focus = true } = {}) => {
    if (active) return modulePromise;
    const element = currentRoot();
    if (!element) return;
    const version = ++generation;
    homeScroll = window.scrollY;
    closeDialogs();
    root = element;
    wrapper = element.closest('.shopify-section') || element;
    placeholder = document.createComment('Purefitness universe position');
    wrapper.before(placeholder);
    document.body.append(wrapper);
    root.hidden = false;
    shell.hidden = true;
    document.body.classList.add('pf-universe-page');
    document.title = root.dataset.pfUniverseTitle || homeTitle;
    active = true;
    window.scrollTo({ top: 0, behavior: 'instant' });
    try {
      await Promise.all([loadStyles(element), loadModule(element)]);
      if (!active || version !== generation || root !== element) return;
      sectionEvent(element, 'shopify:section:load');
    } catch {
      if (!active || version !== generation || root !== element) return;
      renderFallback(element);
    }
    if (focus && active && version === generation) element.querySelector('.universe-home')?.focus({ preventScroll: true });
  };
  const closeUniverse = ({ notify = true, scroll = homeScroll, focus = true } = {}) => {
    if (!active) return;
    generation++;
    closeDialogs();
    if (notify && root) sectionEvent(root, 'shopify:section:unload');
    root.hidden = true;
    if (placeholder?.parentNode && wrapper) placeholder.replaceWith(wrapper);
    placeholder = null;
    wrapper = null;
    root = null;
    shell.hidden = false;
    document.body.classList.remove('pf-universe-page');
    document.title = homeTitle;
    active = false;
    window.scrollTo({ top: scroll, behavior: 'instant' });
    requestAnimationFrame(() => {
      if (active) return;
      window.scrollTo({ top: scroll, behavior: 'instant' });
      if (focus) {
        const target = opener?.isConnected && !opener.closest('[hidden],dialog:not([open])') && opener.getClientRects().length ? opener : [...shell.querySelectorAll('[data-pf-menu-open], .pf-simple-hero .primary-action, .landing-header .brand')].find(element => element.getClientRects().length) || shell.querySelector('main');
        if (target?.tagName === 'MAIN') target.tabIndex = -1;
        target?.focus({ preventScroll: true });
      }
    });
  };

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!link || link.hasAttribute('download') || link.target && link.target !== '_self' || link.getAttribute('href').trim().startsWith('#')) return;
    const url = new URL(link.href, window.location.href);
    if (isUniverseUrl(url)) {
      event.preventDefault();
      preservePreview(url);
      if (!active) {
        opener = link.closest('dialog') ? shell.querySelector('[data-pf-menu-open]') : link;
        homeAddress.href = window.location.href;
        homeAddress.searchParams.delete('view');
        history.replaceState({ ...history.state, pfHomeScroll: window.scrollY }, '', window.location.href);
      }
      const previousHash = window.location.hash;
      if (url.href !== window.location.href) history.pushState({ pfUniverse: true }, '', url);
      if (active && previousHash !== url.hash) window.dispatchEvent(new HashChangeEvent('hashchange'));
      void openUniverse();
      return;
    }
    if (active && link.classList.contains('universe-home') && url.origin === window.location.origin && url.pathname === homeUrl().pathname && !url.searchParams.has('view')) {
      event.preventDefault();
      const destination = preservePreview(new URL(homeAddress));
      history.pushState({ pfHomeScroll: homeScroll }, '', destination);
      closeUniverse();
    }
  }, true);

  window.addEventListener('popstate', event => {
    if (isUniverseUrl(new URL(window.location.href))) void openUniverse();
    else closeUniverse({ scroll: Number.isFinite(event.state?.pfHomeScroll) ? event.state.pfHomeScroll : homeScroll });
  });
  document.addEventListener('shopify:section:unload', event => {
    if (event.detail?.pfUniverseEntry || !active || event.detail?.sectionId !== root?.dataset.sectionId) return;
    reopenAfterEditorLoad = true;
    closeUniverse({ notify: false, focus: false });
  });
  document.addEventListener('shopify:section:load', () => {
    if (reopenAfterEditorLoad && currentRoot()) {
      reopenAfterEditorLoad = false;
      void openUniverse({ focus: false });
    }
  });
  const selectEditorComponent = event => {
    if (event.detail?.pfUniverseEntry || active) return;
    const element = currentRoot();
    if (!element || event.detail?.sectionId !== element.dataset.sectionId && !element.contains(event.target)) return;
    void openUniverse({ focus: false }).then(() => {
      if (active && event.type === 'shopify:block:select') element.dispatchEvent(new CustomEvent(event.type, {
        bubbles: true, detail: { ...event.detail, pfUniverseEntry: true },
      }));
    });
  };
  document.addEventListener('shopify:section:select', selectEditorComponent, true);
  document.addEventListener('shopify:block:select', selectEditorComponent, true);

  if (isUniverseUrl(new URL(window.location.href))) void openUniverse();
})();
