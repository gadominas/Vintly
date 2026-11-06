// Screenshot scenario for Vintly (repo-site, app-blueprints), also used by tests/e2e.js.
//
//   node docs/site/fixtures.js                                       # draws the sample photos once
//   node ../app-blueprints/repo-site/tools/capture.js .              # every card
//   node ../app-blueprints/repo-site/tools/capture.js . --only=01-list
//
// Three invented items (a denim jacket, white sneakers, a terracotta teapot), two photos each. Claude, OpenAI's
// image model and Vinted are all answered by the fixtures below, in the shapes those services use, so every
// screen is Vintly's real interface with sample data. Nothing reaches the internet.

'use strict';
process.env.TZ = 'Europe/Vilnius';
const fs = require('fs');
const path = require('path');

const NOW = Date.UTC(2026, 10, 6, 15, 20);            // Friday 6 November 2026, 17:20 in Vilnius
const MIN = 60e3, H = 60 * MIN, DAY = 24 * H;
const LOCAL = '/var/mobile/Containers/Data/Application/SCRIPTABLE/Documents';
const ICLOUD = '/var/mobile/Library/Mobile Documents/iCloud~dk~simonbs~Scriptable/Documents';
const DIR = ICLOUD + '/Vintly';
const FX = path.join(__dirname, 'fixtures');
const img = (f) => fs.readFileSync(path.join(FX, f));

// ───────── What each item is (Claude's answers) ─────────
const ITEM = {
  jacket: { what: 'Denim jacket', brand: "Levi's", words: ['Džinsiniai švarkai', 'švarkas', 'denim jacket'], condition: 'very_good', colors: ['BLUE'], materials: ['denim', 'cotton'],
    size: 'M', parcel: 'M', price_new: 95, price_used: 28, why: 'Used Levi\'s jackets in good shape usually go for 25–32 €.',
    title: { lt: "Levi's džinsinis švarkas, M dydis", en: "Levi's denim jacket, size M" },
    description: { lt: "Klasikinis Levi's džinsinis švarkas, M dydis. Dvi krūtinės kišenės, auksinės sagos, tvirta medžiaga. Dėvėtas, bet labai geros būklės, be skylių ir dėmių. Šis švarkas matė daugiau koncertų nei dauguma gitarų. Parduodama tai, kas matosi nuotraukose.",
      en: "A classic Levi's denim jacket, size M. Two chest pockets, gold buttons, sturdy fabric. Worn but in very good condition, no holes or stains. This jacket has seen more concerts than most guitars. Sold as shown in the photos." } },
  sneakers: { what: 'White sneakers', brand: '', words: ['Sportbačiai', 'sneakers', 'kedai'], condition: 'good', colors: ['WHITE'], materials: ['synthetic'],
    size: '', parcel: 'M', price_new: 60, price_used: 15, why: 'Unbranded white sneakers in good condition sell for about 12–18 €.',
    title: { lt: 'Balti sportbačiai su žaliomis juostelėmis', en: 'White sneakers with teal stripes' },
    description: { lt: 'Balti sportbačiai su žaliomis juostelėmis ir karamelinės spalvos padais. Avėti, padai šiek tiek nusidėvėję, viršus švarus. Pasiruošę naujiems nuotykiams, nors senieji buvo labai smagūs. Parduodama tai, kas matosi nuotraukose.',
      en: 'White sneakers with teal stripes and caramel soles. Worn, soles a little used, uppers clean. Ready for new adventures, though the old ones were great fun. Sold as shown in the photos.' } },
  teapot: { what: 'Terracotta teapot', brand: '', words: ['Arbatinukai ir kavinukai', 'arbatinukas', 'teapot'], condition: 'very_good', colors: ['ORANGE'], materials: ['ceramic'],
    size: '', parcel: 'M', price_new: 30, price_used: 12, why: 'Hand-painted ceramic teapots like this sell for 10–14 € used.',
    title: { lt: 'Keramikinis arbatinukas su taškeliais', en: 'Ceramic teapot with dots' },
    description: { lt: 'Terakotos spalvos keramikinis arbatinukas su šviesiais taškeliais ir dangteliu. Be skilimų ir įtrūkimų. Arbata jame skanesnė, o pokalbiai ilgesni. Parduodama tai, kas matosi nuotraukose.',
      en: 'A terracotta ceramic teapot with light dots and its lid. No chips or cracks. Tea tastes better in it, and the chats last longer. Sold as shown in the photos.' } },
};

// ───────── Vinted (the shapes its own form gets) ─────────
const CATALOGS = { catalogs: [
  { id: 1904, title: 'Moterims', catalogs: [{ id: 4, title: 'Drabužiai', catalogs: [{ id: 1037, title: 'Viršutiniai drabužiai', catalogs: [{ id: 2526, title: 'Džinsiniai švarkai', catalogs: [] }, { id: 2530, title: 'Paltai', catalogs: [] }] }] },
    { id: 16, title: 'Avalynė', catalogs: [{ id: 2632, title: 'Sportbačiai', catalogs: [] }, { id: 2633, title: 'Batai', catalogs: [] }] }] },
  { id: 5, title: 'Vyrams', catalogs: [{ id: 2050, title: 'Drabužiai', catalogs: [{ id: 1206, title: 'Viršutiniai drabužiai', catalogs: [{ id: 2527, title: 'Džinsiniai švarkai', catalogs: [] }] }] },
    { id: 1231, title: 'Avalynė', catalogs: [{ id: 1242, title: 'Sportbačiai', catalogs: [] }] }] },
  { id: 1918, title: 'Namams', catalogs: [{ id: 1919, title: 'Virtuvė', catalogs: [{ id: 1960, title: 'Arbatinukai ir kavinukai', catalogs: [] }, { id: 1961, title: 'Puodeliai', catalogs: [] }] }] },
  { id: 1193, title: 'Vaikams', catalogs: [{ id: 1499, title: 'Žaislai', catalogs: [{ id: 3352, title: 'Rūšiuokliai ir bokšteliai', catalogs: [] }] }] },
] };
const COLORS = { colors: [['Juoda', '000000', 'BLACK', 1], ['Pilka', '919191', 'GREY', 3], ['Balta', 'FFFFFF', 'WHITE', 12], ['Smėlio', 'F4E0C8', 'BODY', 4], ['Oranžinė', 'FFA500', 'ORANGE', 11],
  ['Raudona', 'CC3300', 'RED', 7], ['Mėlyna', '007BC4', 'BLUE', 9], ['Tamsiai mėlyna', '1F3E69', 'NAVY', 27], ['Žalia', '369A3D', 'GREEN', 10], ['Ruda', '663300', 'BROWN', 2], ['Marga', 'D7B7E8', 'MULTI', 15]]
  .map(([title, hex, code, id], i) => ({ id, title, hex, order: i + 1, code })) };
const CONDITION = { id: 431, code: 'condition', configuration: { title: 'Būklė', required: true, selection_type: 'single', selection_limit: 1,
  options: [{ id: 1, title: 'Būklė', options: [[6, 'Nauja su etiketėmis'], [1, 'Nauja be etikečių'], [2, 'Labai gera'], [3, 'Gera'], [4, 'Patenkinama']].map(([id, title]) => ({ id, title })) }] } };
const SIZES = { id: 8001, code: 'size', configuration: { title: 'Dydis', required: true, selection_type: 'single', selection_limit: 1,
  options: [{ id: 2, title: 'Raidiniai dydžiai', options: [[206, 'XS'], [207, 'S'], [208, 'M'], [209, 'L'], [210, 'XL']].map(([id, title]) => ({ id, title })) }] } };
const SHOE = { id: 8002, code: 'size', configuration: { title: 'Dydis', required: true, selection_type: 'single', selection_limit: 1,
  options: [{ id: 3, title: 'Batų dydžiai', options: [[55, '38'], [56, '39'], [57, '40'], [58, '41'], [59, '42'], [60, '43']].map(([id, title]) => ({ id, title })) }] } };
const MATERIAL = { id: 8, code: 'material', configuration: { title: 'Medžiaga', required: false, selection_type: 'multi', selection_limit: 3,
  options: [{ id: 1, title: 'Medžiaga', options: [[303, 'Džinsas'], [44, 'Medvilnė'], [43, 'Oda'], [469, 'Keramika'], [122, 'Sintetika'], [467, 'Mediena']].map(([id, title]) => ({ id, title })) }] } };
const ATTRS = { 2526: [SIZES, CONDITION, MATERIAL], 2527: [SIZES, CONDITION, MATERIAL], 2632: [SHOE, CONDITION, MATERIAL], 1242: [SHOE, CONDITION, MATERIAL], 1960: [CONDITION, MATERIAL] };
const PARCELS = { package_sizes: [{ id: 1, title: 'Mažas', description: 'Daiktams, kurie telpa į didelį voką.' }, { id: 2, title: 'Vidutinis', description: 'Daiktams, kurie telpa į batų dėžę.', is_recommended: true }, { id: 3, title: 'Didelis', description: 'Daiktams, kurie telpa į didelę dėžę.' }] };
const PRICES = { 2526: [22, 26, 32], 2527: [22, 26, 32], 2632: [10, 13, 17], 1242: [10, 13, 17], 1960: [8, 11, 14] };
const VINTED_HOME = '<!doctype html><html><head><title>Vinted</title><script src="/_next/static/chunks/app.js"></script></head><body>Vinted</body></html>';
const VINTED_JS = 'window.__axios = function (e) { e.interceptors.request.use(e => (e.headers.set("X-CSRF-Token","75f6c9fa-0000-4e52-a000-000000000000"), e)); };';

// ───────── Saved items for the screens that start with some ─────────
function savedItems() {
  const files = {}, items = [];
  const photo = (id, k, cleanToo) => {
    const pid = 'p' + k;
    files[`${DIR}/photos/${id}/${pid}.jpg`] = img(k + '.jpg');
    files[`${DIR}/photos/${id}/${pid}-t.jpg`] = img(k + '-t.jpg');
    if (cleanToo) { files[`${DIR}/photos/${id}/${pid}-clean.jpg`] = img(k + '-clean.jpg'); files[`${DIR}/photos/${id}/${pid}-ct.jpg`] = img(k + '-ct.jpg'); }
    return { id: pid, w: 900, h: 1200, clean: !!cleanToo, use: cleanToo ? 'clean' : 'orig' };
  };
  const J = ITEM.jacket;
  items.push({ id: 'jacket', created: NOW - 40 * MIN, status: 'ready', notes: 'Barely worn, size M', photos: [photo('jacket', 'a1', true), photo('jacket', 'a2', true)],
    ai: { at: NOW - 30 * MIN, by: 'Claude', what: J.what, brand: J.brand, words: J.words, condition: J.condition, flaws: [], colors: J.colors, materials: J.materials, size: J.size, parcel: 'M', priceNew: 95, priceUsed: 28, priceWhy: J.why, confidence: 0.92 },
    listing: { title: `${J.title.lt} / ${J.title.en}`, description: `${J.description.lt}\n\n${J.description.en}`, price: 21, catalogId: 2527, catalogPath: 'Vyrams › Drabužiai › Viršutiniai drabužiai › Džinsiniai švarkai',
      brandId: 10, brandTitle: "Levi's", conditionId: 2, attrs: { size: [208], material: [303, 44] }, colorIds: [9], packageSizeId: 2 },
    opts: { attrs: [SIZES, CONDITION, MATERIAL].map(flatAttr), parcels: PARCELS.package_sizes.map((p) => ({ id: p.id, title: p.title, hint: p.description, rec: !!p.is_recommended })), price: { low: 22, mid: 26, high: 32 }, cats: [] }, fitAt: NOW - 30 * MIN });
  const T = ITEM.teapot;
  items.push({ id: 'teapot', created: NOW - 2 * H, status: 'ready', notes: '', photos: [photo('teapot', 'c1', true), photo('teapot', 'c2', true)],
    ai: { at: NOW - 100 * MIN, by: 'Claude', what: T.what, brand: '', words: T.words, condition: T.condition, flaws: [], colors: T.colors, materials: T.materials, size: '', parcel: 'M', priceNew: 30, priceUsed: 12, priceWhy: T.why, confidence: 0.88 },
    listing: { title: `${T.title.lt} / ${T.title.en}`, description: `${T.description.lt}\n\n${T.description.en}`, price: 9, catalogId: 1960, catalogPath: 'Namams › Virtuvė › Arbatinukai ir kavinukai',
      brandId: null, brandTitle: '', conditionId: 2, attrs: { material: [469] }, colorIds: [11], packageSizeId: 2 },
    opts: { attrs: [CONDITION, MATERIAL].map(flatAttr), parcels: PARCELS.package_sizes.map((p) => ({ id: p.id, title: p.title, hint: p.description, rec: !!p.is_recommended })), price: { low: 8, mid: 11, high: 14 }, cats: [] }, fitAt: NOW - 100 * MIN });
  items.push({ id: 'sneakers', created: NOW - 5 * MIN, status: 'new', notes: '', photos: [photo('sneakers', 'b1'), photo('sneakers', 'b2')], listing: {}, opts: {} });
  // Posted earlier
  for (const [id, t, p, ago, k] of [['old1', 'Vaikiškas mikroskopas / Kids microscope', 10, 2 * DAY, 'c2'], ['old2', 'Little Tikes ksilofonas / xylophone', 6, 3 * DAY, 'b2'], ['old3', 'Medinis labirintas / Wooden maze', 4, 9 * DAY, 'a2']]) {
    items.push({ id, created: NOW - ago - H, status: 'posted', photos: [{ id: 'x', w: 900, h: 1200, gone: true }], listing: { title: t, price: p }, opts: {},
      vinted: { id: 10689941439, url: 'https://www.vinted.lt/items/10689941439', at: NOW - ago }, cover: 'data:image/jpeg;base64,' + img(k + '-ct.jpg').toString('base64') });
  }
  files[`${DIR}/items.json`] = items;
  return files;
}
function flatAttr(x) {
  const flat = (opts, group) => [].concat(...(opts || []).map((o) => (o.options && o.options.length ? flat(o.options, o.title) : [{ id: o.id, title: o.title, group: group || '' }])));
  return { code: x.code, title: x.configuration.title, required: x.configuration.required, multi: x.configuration.selection_type === 'multi', limit: x.configuration.selection_limit, options: flat(x.configuration.options) };
}

// ───────── Routes: AI and Vinted, in the shapes they answer in ─────────
// state: { masks: [photo keys in the order photos are cleaned], posted: [], signedIn: true }
function routes(state) {
  const which = (txt) => /jacket|denim|Levi/i.test(txt) ? 'jacket' : /sneaker|shoe/i.test(txt) ? 'sneakers' : /teapot/i.test(txt) ? 'teapot' : null;
  const anthropic = (req) => {
    const b = req.json() || {}, sys = String(b.system || ''), user = b.messages ? JSON.stringify(b.messages[0].content) : '';
    let text = 'OK';
    if (/sort photos into items/.test(sys)) text = JSON.stringify({ groups: [[1, 2], [3, 4], [5, 6]], names: ['denim jacket', 'white sneakers', 'terracotta teapot'] });
    else if (/experienced seller/.test(sys)) {
      const k = which(user) || state.next || 'jacket', I = ITEM[k];
      text = '```json\n' + JSON.stringify({ what: I.what, brand: I.brand, model: '', category_words: I.words, condition: I.condition, flaws: [], colors: I.colors, materials: I.materials,
        size: I.size, parcel: I.parcel, price_new: I.price_new, price_used: I.price_used, price_why: I.why, title: I.title, description: I.description, confidence: 0.9 }) + '\n```';
    } else if (/right Vinted category/.test(sys)) {
      const m = user.match(/(\d+)\. (\* )?Vyrams[^\\]*Džinsiniai|(\d+)\. (\* )?[^\\]*Sportbačiai|(\d+)\. (\* )?[^\\]*Arbatinukai/);
      text = JSON.stringify({ n: m ? +(m[1] || m[3] || m[5]) : 1 });
    } else if (/fill in a Vinted listing form/.test(sys)) {
      text = JSON.stringify({ fields: /Denim/.test(user) ? { size: [208], material: [303, 44] } : /sneakers/.test(user) ? { size: [57], material: [122] } : { material: [469] } });
    }
    return { json: { id: 'msg', type: 'message', content: [{ type: 'text', text }], usage: { input_tokens: 1500, output_tokens: 300 } } };
  };
  const vinted = (req) => {
    const u = req.url;
    if (/vinted\.lt\/?$/.test(u)) return { body: VINTED_HOME, contentType: 'text/html' };
    if (/\/_next\/static/.test(u)) return { body: VINTED_JS, contentType: 'application/javascript' };
    if (!state.signedIn && /\/api\/v2\//.test(u)) return { status: 401, json: { code: 100, message: 'Neprisijungta' } };
    if (/item_upload\/colors/.test(u)) return { json: COLORS };
    if (/item_upload\/catalogs/.test(u)) return { json: CATALOGS };
    if (/item_upload\/attributes/.test(u)) { const id = ((req.json() || {}).attributes || [{}])[0].value[0]; return { json: { code: 0, attributes: [{ code: 'brand', configuration: null }].concat(ATTRS[id] || [CONDITION]) } }; }
    if (/item_upload\/brands/.test(u)) return { json: { brands: /levi/i.test(decodeURIComponent(u)) ? [{ id: 10, title: "Levi's" }, { id: 4721, title: "Levi's Made & Crafted" }] : [] } };
    if (/suggestions\/categories/.test(u)) { const k = state.next; return { json: { categories: k === 'jacket' ? [2526, 2527] : k === 'sneakers' ? [2632] : [1960], code: 0 } }; }
    if (/\/api\/v2\/photos/.test(u)) { state.uploads = (state.uploads || 0) + 1; return { json: { id: 37591437400 + state.uploads, width: 600, height: 800, temp_uuid: 'x', url: `https://images1.vinted.net/t/02_demo${state.uploads}_x/f800/1.webp?s=1` } }; }
    if (/package_sizes/.test(u)) return { json: PARCELS };
    if (/item_price_suggestions/.test(u)) { const id = (req.json() || {}).category_id, p = PRICES[id] || [5, 7, 9]; return { json: { price_suggestions: ['lower', 'optimal', 'higher'].map((s, i) => ({ strategy: s, price: { amount: p[i].toFixed(1), currency_code: 'EUR' } })) } }; }
    if (/item_upload\/(items|drafts)/.test(u)) { const b = req.json() || {}; (state.posted = state.posted || []).push(b); return { json: { code: 0, item: { id: 10690000000 + state.posted.length } } }; }
    return null;
  };
  return [
    { match: /releases\.json/, respond: () => ({ json: state.update ? withUpdate() : releases() }) },
    { match: /icon-1024\.png/, respond: { file: path.join(__dirname, '..', 'icon-1024.png') } },
    { match: 'api.anthropic.com/v1/messages', respond: anthropic },
    { match: 'api.anthropic.com/v1/models', respond: { json: { data: [{ id: 'claude-haiku-5-5', display_name: 'Claude Haiku 5.5', created_at: '2026-08-01T00:00:00Z' }] } } },
    { match: 'api.openai.com/v1/images/edits', respond: () => { const k = (state.masks || []).shift() || 'a1'; return { json: { created: 1, data: [{ b64_json: img(k + '-mask.png').toString('base64') }], usage: { input_tokens: 1200, output_tokens: 1056 } } }; } },
    { match: 'api.openai.com/v1/models', respond: { json: { data: [{ id: 'gpt-4.1-mini', created: 1740000000 }, { id: 'gpt-image-1', created: 1745000000 }] } } },
    { match: /vinted\.(lt|net)/, respond: (req) => {   // api.vinted.lt answers the site's own page across origins, with its cookies
      const cors = { 'access-control-allow-origin': 'https://www.vinted.lt', 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'content-type, x-csrf-token, x-anon-id, x-upload-form, accept', 'access-control-allow-methods': 'GET, POST, PUT, OPTIONS' };
      if (req.method === 'OPTIONS') return { status: 204, body: '', headers: cors };
      const r = vinted(req);
      return r && /api\.vinted/.test(req.url) ? Object.assign({ headers: cors }, r) : r;
    } },
  ];
}
function releases() { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'releases.json'), 'utf8')); }
function withUpdate() {
  const r = releases();
  r.releases.unshift({ version: '1.1.0', date: '2026-11-20', title: 'Sell faster',
    highlights: [{ icon: '🔁', title: 'Relist in one tap', text: 'Items that didn’t sell go back up with a fresh price.' },
      { icon: '📦', title: 'Parcel sizes learned', text: 'Vintly remembers the parcel size you pick for each kind of item.' },
      { icon: '✦', title: 'Better photo cut-outs', text: 'Thin straps and strings are kept when backgrounds go.' }], changes: [], fixes: [] });
  return r;
}

const KEYS = { VINTLY_ANTHROPIC_KEY: 'sk-ant-demo-0000000000001234', VINTLY_OPENAI_KEY: 'sk-demo-00000000000005678' };
const USAGE = { since: NOW - 9 * DAY, p: { anthropic: { calls: 31, in: 52000, out: 9100, models: { 'claude-haiku-5-5': { calls: 31, in: 52000, out: 9100 } },
  features: { listing: { calls: 9, in: 39000, out: 6200 }, vinted: { calls: 18, in: 9000, out: 2100 }, sort: { calls: 3, in: 3900, out: 760 }, test: { calls: 1, in: 100, out: 40 } },
  days: Object.fromEntries([...Array(9)].map((_, i) => { const d = new Date(NOW - i * DAY); return [`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, { calls: 3, in: 4000 + i * 900, out: 700 + i * 120 }]; })) },
  openai: { calls: 12, in: 14400, out: 12700, models: { 'gpt-image-1': { calls: 12, in: 14400, out: 12700 } }, features: { cleanup: { calls: 12, in: 14400, out: 12700 } },
    days: { [`2026-11-06`]: { calls: 6, in: 7200, out: 6300 }, [`2026-11-05`]: { calls: 6, in: 7200, out: 6400 } } } } };

module.exports = {
  app: { name: 'Vintly', script: 'Vintly.js', accent: '#2DD4BF' },
  now: NOW,
  locale: 'en_US', timezone: 'Europe/Vilnius',
  settle: 3000,
  ITEM, routes, KEYS, DIR, LOCAL, ICLOUD, FX, savedItems,
  fixtures: (shot) => {
    const state = Object.assign({ signedIn: true, masks: [], next: 'jacket' }, shot.state || {});
    const files = shot.empty ? {} : Object.assign(savedItems(), { [DIR + '/usage.json']: USAGE });
    files[DIR + '/settings.json'] = Object.assign({ theme: 'auto', density: 'comfortable', font: 'sans', textSize: 1, checkUpdates: true, cfg: {}, vintedOk: state.signedIn, vintedAt: NOW - 10 * MIN,
      usageAsked: true, aiInvite: { next: NOW + DAY }, models: { anthropic: { at: NOW - DAY, list: [{ id: 'claude-haiku-5-5', name: 'Claude Haiku 5.5' }] } } }, shot.look || {});
    files[LOCAL + '/vintly-vinted-cache.json'] = { site: 'vinted.lt', colors: COLORS.colors.map((c) => ({ id: c.id, title: c.title, hex: c.hex, code: c.code })) };
    if (!shot.empty) files[LOCAL + '/vintly-widget.json'] = { todo: 3, ready: 2, cur: 'EUR', posted7: 2, value7: 16, recent: [{ t: 'Vaikiškas mikroskopas / Kids microscope', p: 10, at: NOW - 2 * DAY }, { t: 'Little Tikes ksilofonas / xylophone', p: 6, at: NOW - 3 * DAY }, { t: 'Medinis labirintas / Wooden maze', p: 4, at: NOW - 9 * DAY }], at: NOW - 5 * MIN };
    return { files, keychain: shot.noKey ? {} : KEYS, alerts: [], routes: routes(state), state };
  },
  shots: [],
};

// ───────── Shots ─────────
const waitFor = (h, fn, arg, ms = 30000) => h.page.waitForFunction(fn, arg, { timeout: ms, polling: 100 });
const pick = (h, files) => h.page.setInputFiles('#pickLib', files.map((f) => path.join(FX, f)));
module.exports.shots = [
  { id: '01-list', label: 'Everything you sell, in one list', caption: 'Ready to post, prepared by ✦ AI, or just photos: each item shows where it is.' },
  { id: '02-sort', label: 'Photos sorted into items', caption: 'Take a few photos of each thing; ✦ AI groups them, and you can move any photo.', empty: true,
    run: async (h) => { await pick(h, ['a1.jpg', 'a2.jpg', 'b1.jpg', 'b2.jpg', 'c1.jpg', 'c2.jpg']); await waitFor(h, `document.querySelectorAll('#batchsheet .grp-item').length === 3`); await h.wait(500); } },
  { id: '03-item', label: 'Clean photos, the item untouched', caption: 'The background goes; the item keeps its own pixels. Original is one tap away.',
    run: async (h) => { await h.tap('.card'); await h.wait(500); } },
  { id: '04-fields', label: 'A listing written for you', caption: 'Lithuanian and English, a little humour, and a price a bit under the usual.',
    run: async (h) => { await h.tap('.card'); await h.wait(400); await h.scrollEl('#itemsheet', 330); } },
  { id: '05-vinted', label: 'Vinted’s own fields, filled', caption: 'Category, brand, condition, size, colours and parcel size, straight from Vinted.',
    run: async (h) => { await h.tap('.card'); await h.wait(400); await h.scrollEl('#itemsheet', 960); } },
  { id: '06-post', label: 'One tap to post', caption: 'Nothing goes out without you: tap once more to confirm, or save a Vinted draft.',
    run: async (h) => { await h.tap('.card'); await h.wait(400); await h.scrollEl('#itemsheet', 4000); await h.tap('#itemsheet [data-act="post"]'); await h.wait(300); } },
  { id: '07-posted', label: 'Posted, with a link back', caption: 'Everything you posted, kept for 60 days, each a tap from its Vinted page.',
    run: async (h) => { await h.tap('[data-act="tab"][data-v="posted"]'); await h.wait(400); } },
  { id: '08-empty', label: 'Snap it. List it.', caption: 'Take photos or choose them; sharing photos to Vintly from Photos works too.', empty: true },
  { id: '09-launch', label: 'Launch screen', caption: 'A price tag draws itself, then “Snap. Price. Sell.” Tap to skip.', settle: 1650, after: 0 },
  { id: '10-settings', label: 'Settings', caption: 'Your Vinted site and account, listing languages, photo cleaning and pricing.',
    run: async (h) => { await h.tap('[data-act="cfgopen"]'); await h.wait(400); await h.scrollEl('#cfgsheet', 520); } },
  { id: '11-ai-settings', look: { textSize: 0.92 }, label: 'Your own AI keys', caption: 'Claude or OpenAI writes; OpenAI’s image model cleans. Tokens per day and feature.',
    run: async (h) => { await h.tap('[data-act="cfgopen"]'); await h.tap('[data-act="aiopen"]'); await h.wait(700); await h.scrollEl('#aisheet', 560); } },
  { id: '12-update', state: { update: true }, label: 'Updates in the app', caption: 'A new version shows its three best features; your items and settings stay.', settle: 4300 },
  { id: '13-dark', dark: true, label: 'Dark mode', caption: 'Every palette and text size, from Settings › Appearance.' },
  { id: '14-widget', widget: 'medium', label: 'Home Screen widget', caption: 'What waits to be posted, how many are ready, and what you posted lately.' },
];
