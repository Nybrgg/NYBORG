// Local preview of the PureFitness Shopify theme.
// Renders JSON templates through liquidjs with small shims for Shopify-only
// tags and filters, so pages can be screenshotted without a Shopify store.
// Usage: node preview.mjs [port]   ->  http://localhost:PORT/?template=index
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Liquid, Tag, Hash } from 'liquidjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const THEME = path.resolve(process.env.PF_THEME || path.join(here, '../theme'));
const PORT = Number(process.argv[2] || 4173);

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\s*\/\*[\s\S]*?\*\//, ''));
const locale = readJson(path.join(THEME, 'locales/da.default.json'));

const engine = new Liquid({
  root: [path.join(THEME, 'snippets')],
  extname: '.liquid',
  relativeReference: false,
  strictFilters: false,
  strictVariables: false,
  jsTruthy: false,
});

// ---------- schema helpers ----------
const schemaOf = source => {
  const match = source.match(/{%-?\s*schema\s*-?%}([\s\S]*?){%-?\s*endschema\s*-?%}/);
  return match ? JSON.parse(match[1]) : {};
};
const defaultsOf = settings => Object.fromEntries((settings || []).filter(s => s.id).map(s => [s.id, s.default ?? (s.type === 'checkbox' ? false : null)]));
const settingsSchema = readJson(path.join(THEME, 'config/settings_schema.json'));
const globalSettings = () => {
  const defaults = Object.assign({}, ...settingsSchema.map(group => defaultsOf(group.settings)));
  const data = readJson(path.join(THEME, 'config/settings_data.json'));
  const current = typeof data.current === 'string' ? data.presets?.[data.current] : data.current;
  return { defaults: { ...defaults, ...current }, sections: current?.sections || {} };
};

const sectionSource = type => fs.readFileSync(path.join(THEME, 'sections', `${type}.liquid`), 'utf8');
const buildSection = (id, data) => {
  const source = sectionSource(data.type);
  const schema = schemaOf(source);
  const settings = { ...defaultsOf(schema.settings), ...(data.settings || {}) };
  const order = data.block_order || Object.keys(data.blocks || {});
  const blocks = order.map(blockId => {
    const block = data.blocks[blockId];
    if (!block || block.disabled) return null;
    const blockSchema = (schema.blocks || []).find(b => b.type === block.type) || {};
    return { id: blockId, type: block.type, settings: { ...defaultsOf(blockSchema.settings), ...(block.settings || {}) }, shopify_attributes: '' };
  }).filter(Boolean);
  return { source, schema, section: { id, settings, blocks, index: 1 } };
};

// ---------- tags ----------
const passthrough = (name, open, close) => engine.registerTag(name, class extends Tag {
  constructor(token, remain, liquid) {
    super(token, remain, liquid);
    this.templates = [];
    const stream = liquid.parser.parseStream(remain)
      .on(`tag:end${name}`, () => stream.stop())
      .on('template', tpl => this.templates.push(tpl))
      .on('end', () => { throw new Error(`tag ${name} not closed`); });
    stream.start();
  }
  * render(ctx, emitter) {
    const html = yield this.liquid.renderer.renderTemplates(this.templates, ctx);
    emitter.write(open + html + close);
  }
});
const swallow = name => engine.registerTag(name, class extends Tag {
  constructor(token, remain, liquid) {
    super(token, remain, liquid);
    const stream = liquid.parser.parseStream(remain).on(`tag:end${name}`, () => stream.stop()).on('end', () => { throw new Error(`tag ${name} not closed`); });
    stream.start();
  }
  render() {}
});
passthrough('style', '<style>', '</style>');
passthrough('stylesheet', '<style>', '</style>');
passthrough('javascript', '<script>', '</script>');
swallow('schema');
swallow('doc');

engine.registerTag('form', class extends Tag {
  constructor(token, remain, liquid) {
    super(token, remain, liquid);
    this.args = token.args;
    this.hash = new Hash(token.args.replace(/^\s*'[^']*'\s*,?/, '').replace(/^\s*[a-z_.]+\s*,?/, ''));
    this.templates = [];
    const stream = liquid.parser.parseStream(remain).on('tag:endform', () => stream.stop()).on('template', tpl => this.templates.push(tpl)).on('end', () => { throw new Error('form not closed'); });
    stream.start();
  }
  * render(ctx, emitter) {
    const attrs = yield this.hash.render(ctx);
    ctx.push({ form: { errors: null, posted_successfully: false } });
    const html = yield this.liquid.renderer.renderTemplates(this.templates, ctx);
    ctx.pop();
    const extra = Object.entries(attrs).map(([k, v]) => `${k.replace(/_/g, '-')}="${String(v).replace(/"/g, '&quot;')}"`).join(' ');
    emitter.write(`<form method="post" action="#" ${extra}>${html}</form>`);
  }
});
engine.registerTag('paginate', class extends Tag {
  constructor(token, remain, liquid) {
    super(token, remain, liquid);
    this.templates = [];
    const stream = liquid.parser.parseStream(remain).on('tag:endpaginate', () => stream.stop()).on('template', tpl => this.templates.push(tpl)).on('end', () => { throw new Error('paginate not closed'); });
    stream.start();
  }
  * render(ctx, emitter) {
    ctx.push({ paginate: { pages: 1, current_page: 1, parts: [] } });
    emitter.write(yield this.liquid.renderer.renderTemplates(this.templates, ctx));
    ctx.pop();
  }
});
const renderSection = async (id, data, scope) => {
  const { source, section } = buildSection(id, data);
  const html = await engine.parseAndRender(source, { ...scope, section });
  const schema = schemaOf(source);
  const tag = schema.tag || 'div';
  return `<${tag} id="shopify-section-${id}" class="shopify-section ${schema.class || ''}">${html}</${tag}>`;
};
engine.registerTag('section', class extends Tag {
  constructor(token, remain, liquid) { super(token, remain, liquid); this.name = token.args.trim().replace(/^['"]|['"]$/g, ''); }
  * render(ctx, emitter) {
    const scope = ctx.getAll();
    const saved = globalSettings().sections[this.name] || { type: this.name };
    emitter.write(yield renderSection(this.name, { type: this.name, ...saved }, scope));
  }
});
engine.registerTag('sections', class extends Tag {
  constructor(token, remain, liquid) { super(token, remain, liquid); this.name = token.args.trim().replace(/^['"]|['"]$/g, ''); }
  * render(ctx, emitter) {
    const scope = ctx.getAll();
    const group = readJson(path.join(THEME, 'sections', `${this.name}.json`));
    for (const id of group.order) if (!group.sections[id].disabled) emitter.write(yield renderSection(id, group.sections[id], scope));
  }
});

// ---------- filters ----------
const lookup = key => key.split('.').reduce((node, part) => node?.[part], locale);
engine.registerFilter('t', (key, ...args) => {
  let value = lookup(String(key));
  if (value == null) return `translation missing: da.${key}`;
  const vars = Object.fromEntries(args.filter(Array.isArray));
  return String(value).replace(/{{\s*(\w+)\s*}}/g, (_, name) => vars[name] ?? '');
});
engine.registerFilter('asset_url', name => `/assets/${name}`);
engine.registerFilter('stylesheet_tag', url => `<link rel="stylesheet" href="${url}" media="all">`);
engine.registerFilter('preload_tag', (url, ...args) => {
  const attrs = Object.fromEntries(args.filter(Array.isArray));
  return `<link rel="preload" href="${url}" as="${attrs.as || 'fetch'}"${attrs.type ? ` type="${attrs.type}"` : ''} crossorigin>`;
});
engine.registerFilter('image_url', image => (typeof image === 'string' ? image : image?.src || ''));
engine.registerFilter('image_tag', (url, ...args) => {
  const attrs = Object.fromEntries(args.filter(Array.isArray));
  return `<img src="${url}" ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ')}>`;
});
engine.registerFilter('color_modify', (color, prop, value) => {
  if (prop !== 'alpha') return color;
  const hex = String(color).replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${value})`;
});
const money = cents => `${(Number(cents || 0) / 100).toLocaleString('da-DK', { minimumFractionDigits: 2 })} kr`;
engine.registerFilter('money', money);
engine.registerFilter('money_with_currency', cents => `${money(cents)} DKK`);
engine.registerFilter('default_errors', () => '');
engine.registerFilter('default_pagination', () => '');
engine.registerFilter('placeholder_svg_tag', (_, cls = '') => `<svg class="${cls}" viewBox="0 0 525 525"><rect width="525" height="525" fill="#ccc"/></svg>`);
engine.registerFilter('handleize', v => String(v || '').toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-'));
engine.registerFilter('structured_data', () => '');
engine.registerFilter('payment_button', () => '');
engine.registerFilter('json', v => JSON.stringify(v ?? null));

// ---------- pages ----------
const sampleProduct = {
  title: 'Power Rack Pro', vendor: 'PureFitness', available: true, sold_out: false, description: '<p>Kraftigt power rack i pulverlakeret stål.</p>',
  has_only_default_variant: true, variants: [{ id: 1, title: 'Default', available: true, price: 1899500 }], images: [], from_price: 1899500,
  selected_or_first_available_variant: { id: 1, price: 1899500, available: true }, price: 1899500, url: '/products/power-rack-pro', featured_image: null,
};
const scopeFor = (name, suffix) => {
  const { defaults } = globalSettings();
  return {
    settings: defaults,
    template: { name, suffix: suffix || null },
    request: { locale: { iso_code: 'da' }, design_mode: false, page_type: name },
    routes: { root_url: '/', cart_url: '/cart', search_url: '/search', all_products_collection_url: '/collections/all' },
    shop: { name: 'PureFitness', password_message: 'Vi åbner snart.', policies: [] },
    canonical_url: 'http://localhost/', page_title: 'PureFitness', page_description: '', content_for_header: '',
    page: { title: 'Om PureFitness', content: '<p>Vi skaber træningsmiljøer.</p>' },
    product: sampleProduct,
    collection: { title: 'Udstyr', url: '/collections/all', products: [sampleProduct, { ...sampleProduct, title: 'Justerbar bænk' }], products_count: 2, description: '', sort_options: [], sort_by: '', default_sort_by: '' },
    cart: { items: [], item_count: 0, total_price: 0, taxes_included: true, note: '', cart_level_discount_applications: [] },
    search: { performed: false, results: [], results_count: 0, terms: '' },
    customer: null,
  };
};
const renderPage = async (templateName, view) => {
  const [name, suffix] = templateName.split('.');
  const scope = scopeFor(name, suffix || (view === 'univers' ? 'univers' : view === 'contact' ? 'contact' : ''));
  const file = scope.template.suffix ? `${name}.${scope.template.suffix}.json` : `${name}.json`;
  const template = readJson(path.join(THEME, 'templates', file));
  let content = '';
  for (const id of template.order) if (!template.sections[id].disabled) content += await renderSection(id, template.sections[id], scope);
  const layout = fs.readFileSync(path.join(THEME, `layout/${template.layout || 'theme'}.liquid`), 'utf8');
  return engine.parseAndRender(layout, { ...scope, content_for_layout: content });
};

const types = { '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.hdr': 'application/octet-stream', '.json': 'application/json', '.html': 'text/html; charset=utf-8', '.glb': 'model/gltf-binary' };
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/assets/')) {
      const file = path.join(THEME, 'assets', path.basename(url.pathname));
      res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
      return fs.createReadStream(file).on('error', () => res.end()).pipe(res);
    }
    if (url.pathname.startsWith('/dev/')) {
      const name = path.basename(url.pathname) || 'index.html';
      const file = path.join(here, '../universe/dev', name === 'dev' ? 'index.html' : name);
      res.writeHead(200, { 'content-type': types[path.extname(file)] || 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      return fs.createReadStream(file).on('error', () => res.end()).pipe(res);
    }
    if (url.pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }
    const map = { '/': 'index', '/cart': 'cart', '/search': 'search', '/collections/all': 'collection', '/products/power-rack-pro': 'product', '/pages/om': 'page', '/404': '404', '/password': 'password' };
    const template = url.searchParams.get('template') || map[url.pathname] || '404';
    const html = await renderPage(template, url.searchParams.get('view'));
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(html);
  } catch (error) {
    console.error(error);
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end(String(error.stack || error));
  }
}).listen(PORT, () => console.log(`preview on http://localhost:${PORT}`));
