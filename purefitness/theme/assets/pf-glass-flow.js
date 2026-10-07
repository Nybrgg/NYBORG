(() => {
  if (window.PureFitnessGlassFlow) return;
  const supported = CSS.supports('backdrop-filter', 'blur(1px)') || CSS.supports('-webkit-backdrop-filter', 'blur(1px)');
  const preferences = ['(prefers-reduced-motion: reduce)', '(prefers-reduced-transparency: reduce)', '(forced-colors: active)'].map(query => matchMedia(query));
  const universeSelector = 'body.pf-universe-page :is(.universe-home,.menu-trigger,.journey-caption,.tour-location,.pf-universe-dialog)';
  const states = new Map();
  const scrollPositions = new WeakMap();
  let ambient;
  let frame = 0;
  let collectFrame = 0;
  let lastScroll = 0;
  let lastFrame = 0;
  const allowed = () => supported && !preferences.some(query => query.matches) && document.documentElement.dataset.motion !== 'reduced' && !document.querySelector('body.pf-universe-page .experience:is(.reduced-motion,.without-webgl)');
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const blurEnabled = style => [style.backdropFilter, style.webkitBackdropFilter].some(value => value && value !== 'none');
  function reset(node) {
    node.style.removeProperty('--pf-flow-x');
    node.style.removeProperty('--pf-flow-y');
    node.style.removeProperty('--pf-flow-sheen');
  }
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastFrame = 0;
    states.forEach((state, node) => {
      reset(node);
      state.x = state.y = state.sheen = state.targetX = state.targetY = state.targetSheen = 0;
    });
  }
  function measureAmbient() {
    ambient = document.querySelector('[data-pf-glass-ambient]');
    if (!ambient) return;
    const shell = ambient.closest('.landing:not(.pf-inner-page)');
    const first = shell?.querySelector('[data-pf-section-glass]');
    if (!first) {
      ambient.removeAttribute('data-pf-ambient-ready');
      return;
    }
    const start = Math.max(0, first.getBoundingClientRect().top - shell.getBoundingClientRect().top);
    ambient.style.setProperty('--pf-ambient-start', `${start.toFixed(2)}px`);
    ambient.dataset.pfAmbientReady = 'true';
  }
  function collect() {
    collectFrame = 0;
    document.querySelectorAll(universeSelector).forEach(node => {
      const style = getComputedStyle(node);
      const enabled = parseFloat(style.getPropertyValue('--pf-flow-enabled')) > 0 && blurEnabled(style);
      if (node.dataset.pfGlassFlow !== String(enabled)) node.dataset.pfGlassFlow = String(enabled);
    });
    const current = new Set();
    document.querySelectorAll('[data-pf-glass-flow="true"]').forEach(node => {
      if (node.closest('[data-pf-glass-flow="false"]') || node.closest('.landing-hero')) return;
      const style = getComputedStyle(node);
      const isSection = node.hasAttribute('data-pf-section-glass');
      const canBlur = isSection ? blurEnabled(getComputedStyle(node, '::before')) : blurEnabled(style);
      if (!canBlur && (!node.hasAttribute('data-pf-header') || !CSS.supports('background', 'color-mix(in srgb,#202722 80%,transparent)'))) return;
      const amplitude = clamp(parseFloat(style.getPropertyValue('--pf-flow-amplitude')) || 0, 0, 16);
      if (amplitude === 0) return;
      current.add(node);
      const state = states.get(node) || {x:0,y:0,sheen:0,targetX:0,targetY:0,targetSheen:0};
      state.amplitude = amplitude;
      states.set(node, state);
    });
    states.forEach((state, node) => {
      if (!current.has(node)) {
        reset(node);
        states.delete(node);
      }
    });
    measureAmbient();
    if (!allowed()) stop();
  }
  function scheduleCollect() {
    if (!collectFrame) collectFrame = requestAnimationFrame(collect);
  }
  function visible(node) {
    if (!node.isConnected || node.closest('[hidden],dialog:not([open])')) return false;
    if (node.hasAttribute('data-pf-header') && !node.classList.contains('is-scrolled')) return false;
    const bounds = node.getBoundingClientRect();
    return bounds.height > 0 && bounds.bottom > 0 && bounds.top < innerHeight;
  }
  function write(node, state) {
    node.style.setProperty('--pf-flow-x', `${state.x.toFixed(2)}px`);
    node.style.setProperty('--pf-flow-y', `${state.y.toFixed(2)}px`);
    node.style.setProperty('--pf-flow-sheen', state.sheen.toFixed(3));
  }
  function update(time) {
    frame = 0;
    if (!allowed()) { stop(); return; }
    const elapsed = Math.min(40, lastFrame ? time - lastFrame : 16);
    lastFrame = time;
    const easing = 1 - Math.exp(-elapsed / 75);
    const settling = time - lastScroll > 90;
    let moving = false;
    states.forEach((state, node) => {
      if (settling || !visible(node)) state.targetX = state.targetY = state.targetSheen = 0;
      state.x += (state.targetX - state.x) * easing;
      state.y += (state.targetY - state.y) * easing;
      state.sheen += (state.targetSheen - state.sheen) * easing;
      const active = Math.abs(state.x) > .025 || Math.abs(state.y) > .025 || state.sheen > .003;
      if (active) { write(node, state); moving = true; }
      else { state.x = state.y = state.sheen = 0; reset(node); }
    });
    if (moving) frame = requestAnimationFrame(update);
    else lastFrame = 0;
  }
  function onScroll(event) {
    if (!allowed()) return;
    const source = event.target === document || event.target === window ? window : event.target;
    const position = source === window ? scrollY : source.scrollTop;
    if (typeof position !== 'number') return;
    const previous = scrollPositions.get(source) ?? 0;
    scrollPositions.set(source, position);
    const delta = clamp(position - previous, -80, 80);
    if (Math.abs(delta) < .1) return;
    lastScroll = performance.now();
    const energy = Math.min(1, Math.abs(delta) / 36);
    const phase = position / 190;
    const direction = Math.sign(delta);
    let affected = false;
    states.forEach((state, node) => {
      if (!visible(node) || (source !== window && node !== source && !node.contains(source))) return;
      const amplitude = state.amplitude * energy;
      state.targetX = (Math.sin(phase) * .55 + direction * .2) * amplitude;
      state.targetY = (Math.cos(phase * .8) * .4 + direction * .3) * amplitude;
      state.targetSheen = energy;
      affected = true;
    });
    if (affected && !frame) frame = requestAnimationFrame(update);
  }
  scrollPositions.set(window, scrollY);
  window.addEventListener('scroll', onScroll, {capture:true,passive:true});
  window.addEventListener('resize', scheduleCollect, {passive:true});
  window.addEventListener('pageshow', scheduleCollect);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  preferences.forEach(query => query.addEventListener('change', () => { stop(); scheduleCollect(); }));
  ['shopify:section:load','shopify:section:unload','shopify:section:reorder'].forEach(name => document.addEventListener(name, scheduleCollect));
  new MutationObserver(records => {
    const relevant = records.some(record => record.type === 'childList' || ['open','hidden','data-motion','data-pf-glass','data-pf-glass-flow'].includes(record.attributeName) || (record.attributeName === 'class' && record.target.matches('body,.experience')));
    if (relevant) {
      if (!allowed()) stop();
      scheduleCollect();
    }
  }).observe(document.documentElement, {subtree:true,childList:true,attributes:true,attributeFilter:['open','hidden','data-motion','data-pf-glass','data-pf-glass-flow','class']});
  const hero = document.querySelector('.landing:not(.pf-inner-page) .pf-simple-hero');
  if (hero && window.ResizeObserver) new ResizeObserver(scheduleCollect).observe(hero);
  window.PureFitnessGlassFlow = {refresh:scheduleCollect,stop};
  collect();
})();
