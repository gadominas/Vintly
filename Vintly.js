// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: teal; icon-glyph: tag; share-sheet-inputs: image;

/*
 * Vintly — snap what you no longer need, and it's on Vinted in a minute. For Scriptable on iPhone.
 * https://github.com/gadominas/Vintly
 *
 *  - Take photos or pick them from your library (or share them to Vintly from Photos): several items at once
 *  - ✦ AI sorts a batch of photos into items, one listing per item
 *  - ✦ AI cleans each photo: the background goes, the item keeps its own pixels (an OpenAI image model draws the
 *    outline; Vintly cuts the original photo along it), or an AI studio shot if you prefer
 *  - ✦ AI reads the photos: what it is, brand, condition, colours, material, size, parcel size, and writes the title and
 *    a slightly funny description in your languages (Lithuanian and English by default)
 *  - Vinted's own categories, sizes, conditions, brands, parcel sizes and price suggestions fill the form
 *  - A fair price a little under what similar used items sell for, so yours goes first
 *  - Review every field, then one tap posts it on Vinted (or saves it as a Vinted draft)
 *  - Works without AI too: fill the fields yourself, Vintly still does the Vinted part
 *  - Home Screen widget in the shared frame (app-blueprints · widgets), in-app updates from GitHub
 *  - Opens on a 2.4 s launch screen with the Vintly logo (app-blueprints · launch-screen)
 *  - The BLUEPRINTS block below lists every shared blueprint this app follows (Settings › Built with)
 *
 * Vinted has no public API for listing items. Vintly signs in to Vinted inside the app (your own session, in
 * Scriptable's web view) and posts through the same web endpoints vinted.lt uses itself. Unofficial: it can stop
 * working when Vinted changes its site, and automated posting may be against Vinted's terms. Use it for your own
 * items, at your own risk. Nothing is posted without your tap.
 *
 * Data lives in iCloud Drive › Scriptable › Vintly (JSON files and photos). Keys live in the iOS Keychain.
 */

// This build's version. When releasing, bump it and add a matching entry to releases.json.
const VERSION = '1.0.0';
const APP_ID = 'vintly';   // unique per app, never changes
const REPO_RAW = 'https://raw.githubusercontent.com/gadominas/Vintly/main/';
const SCRIPT_FILE = 'Vintly.js';   // the script's file name in the repository
const UPDATE_SNOOZE_MS = 2 * 24 * 3600 * 1000;   // "Later" = 2 days
const KC_UPDATE_SNOOZE = 'vintly-update-snooze';   // Keychain key, unique per app

// ── Anonymous usage counts (opt-in), sent to PostHog (app-blueprints · usage-analytics) ──
// Nothing is sent until KEY is filled in AND the person agrees. Each event carries a random install ID
// (made on this iPhone, not linked to any account), the app version and counts: never names, IDs from
// other services, text, photos or anything the app read. Events are anonymous (no person profiles).
// The key is PostHog's project key, made to sit in public apps: it can only add events.
// HOST must be the region the project lives in: PostHog's other region answers "accepted" and then drops the events.
const USAGE = { HOST: 'https://us.i.posthog.com', KEY: 'phc_yAi2PxJCRioWEKLF3uockdCf3QvyQdNABivwqpE4NCWR' };   // the shared project
const KC_INSTALL = 'vintly-install-id';

// ───────── Blueprints ─────────
// Shared blueprints this app was built with (github.com/gadominas/app-blueprints). One line per blueprint, in this exact shape:
// inventory tools read it without running the script, and Settings › Built with shows it.
const BLUEPRINTS_REPO = 'https://github.com/gadominas/app-blueprints';
const BLUEPRINTS = [
  { id: 'stability-patterns', name: 'Stability patterns', version: '1.0.0', since: '1.0.0' },
  { id: 'in-app-updates', name: 'In-app updates', version: '1.0.1', since: '1.0.0' },
  { id: 'settings', name: 'Settings', version: '1.1.2', since: '1.0.0' },
  { id: 'ai-configuration', name: 'AI configuration', version: '1.0.0', since: '1.0.0' },
  { id: 'launch-screen', name: 'Launch screen', version: '1.0.0', since: '1.0.0' },
  { id: 'widgets', name: 'Widgets', version: '1.1.0', since: '1.0.0' },
  { id: 'ai-invitation', name: 'AI invitation', version: '1.2.1', since: '1.0.0' },
  { id: 'usage-analytics', name: 'Anonymous usage analytics', version: '1.1.0', since: '1.0.0' },
];

// ---------- config ----------
const APP = "Vintly";
const SCHEME = "vintly://";
// AI providers. Keychain names are unique per app; models are defaults until the user picks one.
const AI = {
  anthropic: { key: "VINTLY_ANTHROPIC_KEY", model: "claude-haiku-5-5" },
  openai:    { key: "VINTLY_OPENAI_KEY",    model: "gpt-4.1-mini" },
};
const PROVIDERS = { anthropic: "Claude", openai: "OpenAI" };
// Photo cleanup draws with an OpenAI image model (Claude's API has no image output): the default until the user picks one.
const IMAGE_MODEL = "gpt-image-1";
const DAY = 864e5;

// The Vinted sites Vintly can post to: country, currency, the site's language (titles of its categories).
const VINTED_SITES = {
  "vinted.lt": ["Lithuania", "EUR", "lt"], "vinted.lv": ["Latvia", "EUR", "lv"], "vinted.pl": ["Poland", "PLN", "pl"],
  "vinted.de": ["Germany", "EUR", "de"], "vinted.at": ["Austria", "EUR", "de"], "vinted.fr": ["France", "EUR", "fr"],
  "vinted.be": ["Belgium", "EUR", "fr"], "vinted.lu": ["Luxembourg", "EUR", "fr"], "vinted.nl": ["Netherlands", "EUR", "nl"],
  "vinted.it": ["Italy", "EUR", "it"], "vinted.es": ["Spain", "EUR", "es"], "vinted.pt": ["Portugal", "EUR", "pt"],
  "vinted.co.uk": ["United Kingdom", "GBP", "en"], "vinted.ie": ["Ireland", "EUR", "en"], "vinted.com": ["United States", "USD", "en"],
  "vinted.cz": ["Czechia", "CZK", "cs"], "vinted.sk": ["Slovakia", "EUR", "sk"], "vinted.hu": ["Hungary", "HUF", "hu"],
  "vinted.ro": ["Romania", "RON", "ro"], "vinted.gr": ["Greece", "EUR", "el"], "vinted.hr": ["Croatia", "EUR", "hr"],
  "vinted.fi": ["Finland", "EUR", "fi"], "vinted.se": ["Sweden", "SEK", "sv"], "vinted.dk": ["Denmark", "DKK", "da"],
};
// Languages a listing can be written in (Settings › Listings).
const LANGS = { lt: "Lithuanian", en: "English", lv: "Latvian", pl: "Polish", de: "German", fr: "French", nl: "Dutch", it: "Italian",
  es: "Spanish", pt: "Portuguese", cs: "Czech", sk: "Slovak", hu: "Hungarian", ro: "Romanian", el: "Greek", hr: "Croatian",
  fi: "Finnish", sv: "Swedish", da: "Danish", ru: "Russian", uk: "Ukrainian" };
// Vinted's condition ids (the same on every site) and what AI is asked to choose from.
const CONDITIONS = [
  { id: 6, code: "new_with_tags", en: "New with tags" }, { id: 1, code: "new_without_tags", en: "New without tags" },
  { id: 2, code: "very_good", en: "Very good" }, { id: 3, code: "good", en: "Good" }, { id: 4, code: "satisfactory", en: "Satisfactory" },
];
// Parcel sizes when Vinted doesn't list its own for a category.
const PARCELS_FALLBACK = [{ id: 1, title: "Small", hint: "Fits a large envelope" }, { id: 2, title: "Medium", hint: "Fits a shoe box" }, { id: 3, title: "Large", hint: "Fits a large box" }];

// Everything tunable lives here; the Settings screen edits these (stored in settings.cfg, defaults below).
const CONFIG = [
  ["Pricing", [
    { k: "priceBelowPct", label: "Price below the usual by", help: "Under what similar used items sell for, so yours goes first", unit: "%", def: 20, min: 0, max: 60, step: 5 },
    { k: "priceRound", label: "Round prices to", help: "In your Vinted site's currency", unit: "", def: 1, min: 0.5, max: 10, step: 0.5 },
    { k: "priceMin", label: "Lowest price", help: "Vintly never suggests less than this", unit: "", def: 2, min: 1, max: 50, step: 1 },
  ]],
  ["Photos", [
    { k: "photoMax", label: "Photo size kept", help: "Long side of each photo; larger is sharper but slower to upload", unit: "px", def: 1600, min: 800, max: 2400, step: 100 },
    { k: "maskGrow", label: "Soft edge around the item", help: "The cut-out fades out over this width, so no edge of the item is lost", unit: "px", def: 3, min: 0, max: 24, step: 1 },
    { k: "itemMargin", label: "Room around the item", help: "A cleaned photo is centred with this much space around the item", unit: "%", def: 8, min: 0, max: 30, step: 1 },
    { k: "maxPhotos", label: "Photos per item", help: "Vinted takes up to 20", unit: "photos", def: 20, min: 1, max: 20, step: 1 },
  ]],
  ["AI", [
    { k: "aiPhotos", label: "Photos AI looks at", help: "More helps with labels and details but uses more tokens", unit: "photos", def: 4, min: 1, max: 8, step: 1 },
    { k: "aiPhotoPx", label: "Size of photos sent to AI", help: "Larger reads small labels better but uses more tokens", unit: "px", def: 1024, min: 512, max: 1600, step: 128 },
  ]],
  ["Vinted", [
    { k: "vintedTimeout", label: "Time limit for Vinted", help: "For one photo upload or posting an item", unit: "s", def: 60, min: 15, max: 180, step: 5 },
    { k: "catalogDays", label: "Reload Vinted's categories every", help: "Categories change rarely; they're kept on this iPhone", unit: "days", def: 7, min: 1, max: 30, step: 1 },
  ]],
  ["Keeping items", [
    { k: "keepPostedDays", label: "Keep posted items for", help: "Older posted items leave the Posted tab and their photos are deleted", unit: "days", def: 60, min: 7, max: 365, step: 7 },
  ]],
  ["Widget", [
    { k: "widgetRefreshMin", label: "Ask iOS to refresh every", help: "iOS decides the exact timing", unit: "min", def: 60, min: 15, max: 240, step: 15 },
    { k: "widgetStaleMin", label: "Mark the widget as out of date after", help: "Older data shows \"Updated …\" in amber", unit: "min", def: 1440, min: 60, max: 2880, step: 60 },
  ]],
];
const CFG_FLAT = CONFIG.flatMap(([, items]) => items);
const cfgDef = k => CFG_FLAT.find(x => x.k === k);
const cfg = k => { const v = settings.cfg && settings.cfg[k]; return v === undefined ? cfgDef(k).def : v; };
function setCfg(k, v) {
  const d = cfgDef(k);
  if (!d) return;
  settings.cfg = settings.cfg || {};
  if (v === null) { delete settings.cfg[k]; return; }   // Reset
  if (d.type === "text") v = String(v || "").trim() || d.def;
  else if (d.type === "lines") { v = String(Array.isArray(v) ? v.join("\n") : v || "").split("\n").map(x => x.trim()).filter(Boolean).slice(0, 20); if (!v.length) v = d.def; }
  else {
    v = Number(String(v).replace(",", "."));   // accept a decimal comma
    if (!isFinite(v)) v = d.def;
    v = Math.min(d.max, Math.max(d.min, v));
    v = d.step < 1 ? Math.round(v / d.step) * d.step : Math.round(v);
    v = Number(v.toFixed(2));
  }
  if (JSON.stringify(v) === JSON.stringify(d.def)) delete settings.cfg[k]; else settings.cfg[k] = v;   // store only what differs
}

// Six palettes on the shared tokens; Vintly's accent is a fresh teal (the logo's tag hole).
const PALETTES = {
  ink:      { paper: "#f6f7f9", sheet: "#ffffff", ink: "#0f172a", ink2: "#334155", muted: "#5b6475", rule: "#dde2ea", signal: "#0f766e", signalWash: "#dcf5f1", amber: "#b45309", amberWash: "#fdf0dc", danger: "#b91c1c", scheme: "light" },
  sepia:    { paper: "#f3ead6", sheet: "#fbf5e6", ink: "#2a1f14", ink2: "#4b3b2a", muted: "#73604a", rule: "#e1d3b5", signal: "#8a3b12", signalWash: "#f3dfc8", amber: "#a16207", amberWash: "#f6e5bf", danger: "#9f1239", scheme: "light" },
  mint:     { paper: "#f1f6f3", sheet: "#ffffff", ink: "#0d2318", ink2: "#2c4a3b", muted: "#556d60", rule: "#d3e2d9", signal: "#15803d", signalWash: "#dcf3e4", amber: "#b45309", amberWash: "#fbeed8", danger: "#b91c1c", scheme: "light" },
  contrast: { paper: "#ffffff", sheet: "#ffffff", ink: "#000000", ink2: "#111111", muted: "#333333", rule: "#9a9a9a", signal: "#0033cc", signalWash: "#e0e8ff", amber: "#7a4b00", amberWash: "#ffeec2", danger: "#a30000", scheme: "light" },
  slate:    { paper: "#1c2128", sheet: "#22272e", ink: "#e6edf3", ink2: "#c5ced8", muted: "#9aa5b1", rule: "#373e47", signal: "#5eead4", signalWash: "#173a37", amber: "#e3b341", amberWash: "#3a2f12", danger: "#ff8a7a", scheme: "dark" },
  night:    { paper: "#05070b", sheet: "#0f141c", ink: "#f3f6fa", ink2: "#d0d7e1", muted: "#9aa4b2", rule: "#1f2733", signal: "#2dd4bf", signalWash: "#0e2e2b", amber: "#f5c04a", amberWash: "#2d240c", danger: "#ff8f7a", scheme: "dark" },
};

// ---------- pure helpers (no Scriptable APIs) ----------
const clip = (s, n) => { s = String(s == null ? "" : s).trim(); return s.length > n ? s.slice(0, n - 1).trim() + "…" : s; };
const uid = () => Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const siteOf = () => VINTED_SITES[settings.vintedSite] ? settings.vintedSite : "vinted.lt";
const currencyOf = () => VINTED_SITES[siteOf()][1];
// A fair price: under what similar used items sell for, rounded, never under the lowest price.
function fairPrice(usual, belowPct, step, min) {
  if (!(usual > 0)) return null;
  const v = usual * (1 - belowPct / 100);
  const r = Math.max(min, Math.round(v / step) * step);
  return Number(r.toFixed(2));
}
// Words two texts share (for matching Vinted's categories and brands to what AI saw).
function overlap(a, b) {
  const A = new Set(norm(a).split(" ").filter(w => w.length > 2)), B = norm(b).split(" ").filter(w => w.length > 2);
  let n = 0; for (const w of B) if (A.has(w) || [...A].some(x => x.length > 4 && (x.startsWith(w.slice(0, 5)) || w.startsWith(x.slice(0, 5))))) n++;
  return n;
}
async function pool(items, n, fn) {
  const q = items.slice();
  await Promise.all(Array.from({ length: Math.max(1, Math.min(n, q.length)) }, async () => {
    while (q.length) { const it = q.shift(); try { await fn(it); } catch (e) { console.log(String(e)); } }
  }));
}
// ---------- end pure helpers ----------

// ---------- storage ----------
// Stability patterns (app-blueprints · stability-patterns 1.0.0): iCloud only when this script itself lives in iCloud Drive.
// On a phone that isn't signed in to iCloud, the first call on Scriptable's iCloud manager ends the script
// ("iCloud is not supported"), and a try/catch doesn't reliably stop it: so there, iCloud is never touched.
const ICLOUD_OK = (() => { try { return /\/Mobile Documents\//.test(module.filename); } catch (e) { return false; } })();
function icloudFm() {   // the iCloud manager, or null on a phone without iCloud
  if (!ICLOUD_OK) return null;
  try { const ic = FileManager.iCloud(); ic.documentsDirectory(); return ic; } catch (e) { return null; }
}
const scriptFm = (path) => (/\/Mobile Documents\//.test(path) && icloudFm()) || FileManager.local();   // where the running script lives (updates)
const fm = icloudFm() || FileManager.local();   // storage: iCloud Drive, or the phone
const DIR = fm.joinPath(fm.documentsDirectory(), APP);
if (!fm.fileExists(DIR)) fm.createDirectory(DIR, true);
const P = n => fm.joinPath(DIR, n + ".json");
const PHOTO_DIR = fm.joinPath(DIR, "photos");
const kcGet = (k) => (Keychain.contains(k) ? Keychain.get(k) : "");   // Keychain: ask before reading
// A short start-up log on the phone (local, not iCloud): Settings › Updates › Start-up log, and on screen if opening stalls.
const LOG_PATH = FileManager.local().joinPath(FileManager.local().documentsDirectory(), APP_ID + "-startup.log");
function startLog(msg) {
  try {
    const lfm = FileManager.local(), line = new Date().toISOString().slice(11, 19) + "  " + msg;
    const old = lfm.fileExists(LOG_PATH) ? lfm.readString(LOG_PATH).split("\n").slice(-60) : [];
    lfm.writeString(LOG_PATH, old.concat(line).join("\n"));
  } catch (e) {}
}
const loadIssues = [];    // files that didn't arrive (iCloud too slow, or unreadable): never written this run
const loadRepaired = [];  // files that arrived damaged: kept aside as <name>.broken-<time>.json, then started fresh
async function load(n, def, waitMs = 10000) {
  const p = P(n);
  if (!fm.fileExists(p)) return def;
  let txt;
  try {
    if (fm.isFileStoredIniCloud(p) && !fm.isFileDownloaded(p)) {
      // iCloud can take a long time (or forever, offline): never let start-up hang on it
      await Promise.race([fm.downloadFileFromiCloud(p), new Promise(r => Timer.schedule(waitMs, false, r))]);
      if (!fm.isFileDownloaded(p)) { loadIssues.push(n); startLog(`iCloud didn't deliver ${n}.json in ${waitMs / 1000} s`); return def; }
    }
    txt = fm.readString(p);
  } catch (e) { loadIssues.push(n); startLog(`Couldn't read ${n}.json: ${e}`); return def; }   // not read: never saved over
  try { return JSON.parse(txt); }
  catch (e) { keepBroken(fm, p, n, txt); return def; }
}
// It arrived but is damaged: keep a copy next to it, then start this file fresh so saving can carry on (1.1.0).
// Without this, one damaged file stopped the app from ever saving again. The widget reads the data on every refresh
// and never saves, so a copy that's already there is not made again. The parse error isn't logged: it can quote the file.
function keepBroken(fm, p, n, txt) {
  try {
    const base = p.replace(/\.json$/, ""), dir = p.slice(0, p.lastIndexOf("/")), pre = base.slice(dir.length + 1) + ".broken-";
    let kept = false;
    try { kept = fm.listContents(dir).some(f => f.startsWith(pre) && fm.readString(fm.joinPath(dir, f)) === txt); } catch (_) {}
    if (!kept) fm.writeString(base + ".broken-" + Date.now() + ".json", txt);
    if (!loadRepaired.includes(n)) loadRepaired.push(n);
    startLog(`${n}.json was damaged (not valid JSON); ${kept ? "a copy was already kept" : "kept a copy"} and started it fresh`);
  } catch (e) { loadIssues.push(n); startLog(`${n}.json was damaged and couldn't be copied aside`); }   // no copy, no overwrite
}
// Data files are only written once they were read, so a slow start can never save an empty list over them.
let dataLoaded = false;
const write = (n, v) => {
  if (n === "settings" ? !settingsOk : (["items", "usage"].includes(n) && !dataLoaded)) return;
  fm.writeString(P(n), JSON.stringify(v));
};

// Defaults first, saved choices on top. Loaded here, before the app and widget branches.
const settings = Object.assign(
  { tab: "todo",                                                        // remembered pick: To post or Posted
    vintedSite: "vinted.lt",                                            // Vinted
    lang: "lt", lang2: "en", humour: true, bothTitles: true,            // Listings
    cleanStyle: "keep", removePhotosAfter: false,                      // Photos: keep (the item's own pixels), studio (AI re-drawn), off
    ai: true, aiClean: true,                                            // What AI does: sort new photos into items, clean photos
    imageModel: "",                                                     // the OpenAI image model for cleaning ("" = IMAGE_MODEL)
    aiProvider: "anthropic",                                            // AI configuration
    checkUpdates: true,   // offer new versions from GitHub (asks again 2 days after "Later")
    shareUsage: false, usageAsked: false,  // anonymous usage counts: off until the person agrees
    theme: "auto", density: "comfortable", font: "sans", textSize: 1,  // Appearance
    vintedOk: false, vintedAt: 0 },                                     // internal state: last Vinted sign-in check
  await load("settings", {})
);
const settingsOk = !loadIssues.includes("settings");   // settings that were never read are never saved over
// Items are read in loadData(): the app shows its first screen before reading them, because iCloud can be slow.
let items = [];   // [{ id, created, status: "new" | "ready" | "posted", photos: [{ id, w, h, clean, use }], ai, listing, opts, vinted, err }]
async function loadData() {
  loadIssues.length = 0;   // loadRepaired is kept, so a damaged settings.json (read before this) still gets its toast
  items = await load("items", []);
  if (!Array.isArray(items)) items = [];
  usage = await load("usage", usage);
  dataLoaded = loadIssues.length === 0;   // anything missing: show what we have, save nothing over it
}
function saveAll() { write("items", items); write("settings", settings); }

let usageQueue = [], usageTimer = null;
const usageAvailable = () => !!USAGE.KEY;
const usageOn = () => usageAvailable() && !!settings.shareUsage;
function installId() {
  if (Keychain.contains(KC_INSTALL)) return Keychain.get(KC_INSTALL);
  const id = UUID.string().toLowerCase();
  Keychain.set(KC_INSTALL, id);
  return id;
}
function track(event, props = {}) {
  if (!usageOn()) return;
  try {
    usageQueue.push({ event, timestamp: new Date().toISOString(),
      properties: Object.assign({ distinct_id: installId(), $process_person_profile: false, app: APP_ID, app_version: VERSION, $lib: APP_ID }, props) });
    if (usageQueue.length >= 25) flushUsage();
    else if (!usageTimer) usageTimer = Timer.schedule(3000, false, () => { usageTimer = null; flushUsage(); });
  } catch (e) {}
}
let usageLast = null;   // { at, events, ok, status, host, error }: shown in Settings › Privacy
async function postUsage(host, batch) {
  const r = new Request(host + '/batch/');
  r.method = 'POST'; r.timeoutInterval = 10; r.headers = { 'Content-Type': 'application/json' };
  r.body = JSON.stringify({ api_key: USAGE.KEY, batch });
  let body = '';
  try { body = await r.loadString(); } catch (e) { return { ok: false, status: 0, host, error: String(e.message || e) }; }
  const status = (r.response && r.response.statusCode) || 0;
  return { ok: status >= 200 && status < 300, status, host, error: status >= 200 && status < 300 ? '' : String(body || '').slice(0, 200) };
}
// Sends what's queued in one request. Never slows the app; if it fails, those counts are gone (and the log says why).
async function flushUsage() {
  if (!usageQueue.length) return usageLast;
  if (!usageOn()) { usageQueue = []; return usageLast; }
  const batch = usageQueue.splice(0, usageQueue.length);
  const res = await postUsage(USAGE.HOST, batch);
  usageLast = Object.assign({ at: Date.now(), events: batch.length }, res);
  try { startLog(`usage: ${batch.length} event${batch.length === 1 ? '' : 's'} → ${res.ok ? 'sent to ' + res.host.replace('https://', '') : 'not sent: ' + (res.status ? 'HTTP ' + res.status + ' ' : '') + res.error}`); } catch (e) {}
  return usageLast;
}
function usageStatus() {
  const u = usageLast;
  if (!u) return '';
  const t = new Date(u.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return u.ok ? `Last sent ${t}: ${u.events} event${u.events === 1 ? '' : 's'}, accepted (${u.host.replace('https://', '')})`
              : `Last try ${t} failed: ${u.status ? 'HTTP ' + u.status + ' ' : ''}${u.error}`;
}
function setUsage(on) {
  settings.shareUsage = !!on; settings.usageAsked = true; saveAll();
  if (on) track('usage_opt_in');
  else { usageQueue = []; if (Keychain.contains(KC_INSTALL)) Keychain.remove(KC_INSTALL); }   // a fresh ID if switched on again
}

// ---------- AI configuration (app-blueprints · ai-configuration) ----------
const keyFor  = p => Keychain.contains(AI[p].key) ? Keychain.get(AI[p].key) : null;
const aiKey   = () => keyFor(settings.aiProvider);   // the key of the provider in use
const modelFor = p => (settings.model && settings.model[p]) || AI[p].model;
const maskKey = k => k ? (k.length > 14 ? k.slice(0, 7) + "…" + k.slice(-4) : "…" + k.slice(-4)) : null;
const imageModel = () => settings.imageModel || IMAGE_MODEL;
const canClean = () => !!keyFor("openai") && settings.aiClean !== false && settings.cleanStyle !== "off";

async function askKey(p) {
  const cur = keyFor(p);
  const al = new Alert();
  al.title = `${PROVIDERS[p]} API key`;
  al.message = cur ? `The saved key ends in …${cur.slice(-4)}. Paste a new key to replace it.`
                   : "Paste your API key. It's stored in the iOS Keychain on this device only.";
  al.addSecureTextField(p === "openai" ? "sk-…" : "sk-ant-…", "");
  al.addAction("Save key");
  al.addCancelAction("Cancel");
  if (await al.present() !== 0) return false;
  const v = al.textFieldValue(0).trim();
  if (!v) return false;
  Keychain.set(AI[p].key, v);
  if (!aiKey()) settings.aiProvider = p;   // first key saved: use that provider
  return true;
}
function removeKey(p) {
  if (Keychain.contains(AI[p].key)) Keychain.remove(AI[p].key);
}

// Token usage, counted from what the provider reports, per provider, model, feature and local day.
var usage = { since: Date.now(), p: {} };   // read in loadData()
const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function recordUsage(provider, model, feature, tin, tout) {
  const P = usage.p[provider] = usage.p[provider] || { calls: 0, in: 0, out: 0, models: {}, features: {}, days: {} };
  const b = (o, k) => o[k] = o[k] || { calls: 0, in: 0, out: 0 };
  for (const x of [P, b(P.models, model), b(P.features, feature), b(P.days, dayKey())]) {
    x.calls++; x.in += tin; x.out += tout;
  }
  const days = Object.keys(P.days).sort();
  while (days.length > 400) delete P.days[days.shift()];   // keep about 13 months of days
  write("usage", usage);   // save after every call: the app can be closed at any moment
}
function resetUsage() { usage = { since: Date.now(), p: {} }; write("usage", usage); }

async function fetchModels(p) {
  const key = keyFor(p);
  if (!key) throw new Error(`Add a ${PROVIDERS[p]} key first`);
  const r = new Request(p === "openai" ? "https://api.openai.com/v1/models" : "https://api.anthropic.com/v1/models?limit=100");
  r.headers = p === "openai" ? { "Authorization": "Bearer " + key } : { "x-api-key": key, "anthropic-version": "2023-06-01" };
  r.timeoutInterval = 20;
  const j = await r.loadJSON();
  if (j.error) throw new Error(j.error.message || "Couldn't load models");
  let list = (j.data || []).map(m => ({
    id: m.id, name: m.display_name || m.id,
    t: m.created_at ? Date.parse(m.created_at) : (m.created || 0) * 1000,
  }));
  // OpenAI's image models get their own list, for "Clean photo backgrounds" in What AI does.
  if (p === "openai") settings.imageModels = { at: Date.now(), list: list.filter(m => /^gpt-image/.test(m.id)).sort((a, b) => b.t - a.t).map(m => ({ id: m.id, name: m.id })) };
  // OpenAI lists every model the key can reach; keep only the ones that write text.
  if (p === "openai") list = list.filter(m => /^(gpt-|o\d|chatgpt-)/.test(m.id)
    && !/(audio|realtime|tts|transcribe|image|search|embedding|instruct|moderation)/.test(m.id));
  list.sort((a, b) => b.t - a.t);
  settings.models = settings.models || {};
  settings.models[p] = { at: Date.now(), list: list.map(m => ({ id: m.id, name: m.name })) };
  return list.length;
}

// Every AI request goes through here. feature: the usage table's tag. images: base64 JPEGs the AI looks at.
async function aiCall(system, user, maxTokens = 2500, feature = "other", provider = settings.aiProvider, images = []) {
  const key = keyFor(provider);
  if (!key) throw new Error(`No ${PROVIDERS[provider]} key saved`);
  const openai = provider === "openai", model = modelFor(provider);
  const r = new Request(openai ? "https://api.openai.com/v1/chat/completions" : "https://api.anthropic.com/v1/messages");
  r.method = "POST";
  r.timeoutInterval = 120;
  const oaUser = images.length ? [{ type: "text", text: user }].concat(images.map(d => ({ type: "image_url", image_url: { url: "data:image/jpeg;base64," + d } }))) : user;
  const anUser = images.length ? images.map(d => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: d } })).concat([{ type: "text", text: user }]) : user;
  if (openai) {
    r.headers = { "Authorization": "Bearer " + key, "Content-Type": "application/json" };
    r.body = JSON.stringify({ model, messages: [{ role: "system", content: system }, { role: "user", content: oaUser }] });
  } else {
    r.headers = { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" };
    r.body = JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: anUser }] });
  }
  const j = await r.loadJSON();
  if (j.error) throw new Error(j.error.message || "AI request failed");
  const u = j.usage || {};
  recordUsage(provider, model, feature,
    openai ? (u.prompt_tokens || 0) : (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0),
    openai ? (u.completion_tokens || 0) : (u.output_tokens || 0));
  return openai ? ((j.choices && j.choices[0] && j.choices[0].message.content) || "")
                : (j.content || []).map(c => c.text || "").join("");
}

// For prompts that ask for JSON: tolerate code fences and stray text around it.
function parseJSON(txt) {
  const s = String(txt).replace(/```json|```/g, "").trim();
  const a = s.search(/[\[{]/), b = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
  return JSON.parse(s.slice(a, b + 1));
}

// Photo cleanup: one image edit with OpenAI's image model (Claude has no image output). It answers with a PNG
// (base64) for the JPEG it's given. Tokens are counted like every other request, under the "cleanup" feature (see docs/BLUEPRINTS.md).
async function aiImageEdit(jpgB64, prompt, size, quality, feature = "cleanup") {
  const key = keyFor("openai");
  if (!key) throw new Error("Cleaning photos needs an OpenAI key (Settings › AI settings)");
  const model = imageModel();
  const once = async (fidelity) => {
    const r = new Request("https://api.openai.com/v1/images/edits");
    r.method = "POST";
    r.timeoutInterval = 240;
    r.headers = { "Authorization": "Bearer " + key };
    r.addParameterToMultipart("model", model);
    r.addParameterToMultipart("prompt", prompt);
    r.addParameterToMultipart("size", size);
    r.addParameterToMultipart("quality", quality);
    r.addParameterToMultipart("n", "1");
    if (fidelity) r.addParameterToMultipart("input_fidelity", "high");   // keeps the framing; not every image model takes it
    r.addFileDataToMultipart(Data.fromBase64String(jpgB64), "image/jpeg", "image", "photo.jpg");
    return r.loadJSON();
  };
  let j = await once(true);
  if (j && j.error && /input_fidelity/i.test(j.error.message || "")) j = await once(false);
  if (!j || j.error) throw new Error((j && j.error && j.error.message) || "The image model didn't answer");
  const u = j.usage || {};
  recordUsage("openai", model, feature, u.input_tokens || 0, u.output_tokens || 0);
  const out = j.data && j.data[0] && j.data[0].b64_json;
  if (!out) throw new Error("The image model sent no picture back");
  return out;
}

// The key decides the provider: with only the other provider's key saved, use that one (nothing is written here).
if (!aiKey() && keyFor(settings.aiProvider === "openai" ? "anthropic" : "openai")) settings.aiProvider = settings.aiProvider === "openai" ? "anthropic" : "openai";

// ───────── AI invitation (app-blueprints · ai-invitation) ─────────
// What the invitation promises. Exactly three perks, each a real feature that needs a key.
const AI_INVITE = {
  title: "Give Vintly superpowers",             // punchy, names the app, at most 32 characters
  perks: [                                      // icon + at most 48 characters each
    { icon: "✦", text: "Title and description written from your photos" },
    { icon: "🏷️", text: "Brand, category and size filled in for Vinted" },
    { icon: "💶", text: "A fair price a little under the usual" },
  ],
};

// When it may appear. Its state lives in settings.json as settings.aiInvite (no UI of its own).
const INVITE_DAY = 864e5;
const INVITE_GAP = 3;          // days between invitations (about twice a week)
const INVITE_GAP_SLOW = 7;     // days between invitations after the 4th "Later"
function aiInviteDue(now = Date.now()) {
  const s = settings.aiInvite || (settings.aiInvite = {});
  if (aiKey()) return false;   // a key means AI is on: nothing to invite to
  if (s.off) return false;     // "Don't remind me again"
  return now >= (s.next || 0); // from the very first launch (right after install), then at most every 3 days
}
// Removing the last key turns AI off: invite again from the next launch (call this in the "airm" action).
function aiInviteKeyRemoved() {
  if (aiKey()) return;
  const s = settings.aiInvite || (settings.aiInvite = {});
  s.next = 0; saveAll();
}
// The page reports what happened: "shown", "open", "later" or "never".
function aiInviteNote(what, now = Date.now()) {
  const s = settings.aiInvite || (settings.aiInvite = {});
  if (what === "shown") { s.shown = (s.shown || 0) + 1; s.next = now + INVITE_GAP * INVITE_DAY; }
  else if (what === "later") { s.later = (s.later || 0) + 1; s.next = now + (s.later >= 4 ? INVITE_GAP_SLOW : INVITE_GAP) * INVITE_DAY; }
  else if (what === "never") s.off = true;
  else return;   // "open": the AI sheet takes over; "shown" already set the next date
  saveAll();
}

// ---------- Vinted: your own session in a web view, and the endpoints the Vinted site uses itself ----------
// Vinted has no public API for listing items. Vintly loads the Vinted site in a web view that isn't shown (it shares
// Scriptable's cookies with the sign-in window), and runs the same requests the site's own "Sell" form makes:
//   POST /api/v2/photos                                   photo[type]=item, photo[file], photo[temp_uuid]
//   GET  /api/v2/item_upload/catalogs                     the category tree
//   POST /api/v2/item_upload/suggestions/categories       Vinted's own category guess from a photo
//   POST /api/v2/item_upload/attributes                   size, condition, material… for a category
//   GET  /api/v2/item_upload/brands?keyword&category_id   brands
//   GET  /api/v2/item_upload/colors                       colours
//   GET  api.<site>/shipping-estimation/external/catalogs/<id>/package_sizes
//   POST api.<site>/upload-form-suggestions/item_price_suggestions
//   POST /api/v2/item_upload/items  (or /item_upload/drafts)   { item, push_up, parcel, upload_session_id }
// Headers: X-CSRF-Token (a constant in the site's own scripts, read from them) and X-Anon-Id (the anon_id cookie).
const vBase = () => "https://www." + siteOf();
const vApiHost = () => "https://api." + siteOf();
let vwv = null, vwvSite = "";
// Vinted's categories and colours are kept on this iPhone (local, not iCloud): they're a cache, not your data.
const vfm = FileManager.local();
const vCachePath = vfm.joinPath(vfm.documentsDirectory(), APP_ID + "-vinted-cache.json");
let vCache = null;
function vCacheGet() {
  if (!vCache) { try { vCache = vfm.fileExists(vCachePath) ? JSON.parse(vfm.readString(vCachePath)) : {}; } catch (e) { vCache = {}; } }
  if (vCache.site !== siteOf()) vCache = { site: siteOf() };
  return vCache;
}
function vCacheSave() { try { vfm.writeString(vCachePath, JSON.stringify(vCache || {})); } catch (e) {} }

// Runs inside Vinted's own page (serialised with toString, never called on the Scriptable side).
function vHelpers() {
  if (window.__vt) return;
  const T = window.__vt = {};
  T.headers = async function (fresh) {
    if (T.hdr && !fresh) return T.hdr;
    let csrf = "";
    const srcs = Array.from(document.querySelectorAll("script[src]")).map(function (s) { return s.src; });
    for (const s of srcs) {
      try { const t = await (await fetch(s)).text(); const m = t.match(/"X-CSRF-Token","([0-9a-f-]{36})"/i); if (m) { csrf = m[1]; break; } } catch (e) {}
    }
    const anon = decodeURIComponent((document.cookie.match(/(?:^|; )anon_id=([^;]+)/) || [])[1] || "");
    T.hdr = { csrf: csrf, anon: anon };
    return T.hdr;
  };
  T.api = async function (path, o) {
    o = o || {};
    const h = await T.headers();
    const url = /^https?:/.test(path) ? path : "/api/v2" + path;
    const headers = Object.assign({ accept: "application/json, text/plain, */*" }, h.anon ? { "X-Anon-Id": h.anon } : {}, h.csrf ? { "X-CSRF-Token": h.csrf } : {}, o.headers || {});
    let body = o.body;
    if (body && !(body instanceof FormData)) { headers["content-type"] = "application/json"; body = JSON.stringify(body); }
    const r = await fetch(url, { method: o.method || "GET", credentials: "include", headers: headers, body: body });
    const t = await r.text();
    let j = null; try { j = JSON.parse(t); } catch (e) {}
    return { status: r.status, j: j, t: j ? "" : t.slice(0, 200) };
  };
  T.photo = async function (b64, tempUuid) {
    const bin = atob(b64), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const fd = new FormData();
    fd.append("photo[type]", "item");
    fd.append("photo[file]", new Blob([u8], { type: "image/jpeg" }), "photo.jpg");
    fd.append("photo[temp_uuid]", tempUuid);
    return T.api("/photos", { method: "POST", body: fd });
  };
}

async function vintedPage(force) {
  if (vwv && vwvSite === siteOf() && !force) return vwv;
  vwv = new WebView(); vwvSite = siteOf();
  await Promise.race([vwv.loadURL(vBase() + "/"), pause(30000)]);
  return vwv;
}
// Runs async code in Vinted's page and returns what it returns (JSON). A time limit keeps a stuck page from stalling.
// One at a time: a page answers through a single completion() callback, so two calls at once would lose an answer.
let vChain = Promise.resolve();
function vjs(body, ms = cfg("vintedTimeout") * 1000) {
  const run = vChain.then(() => vjsOne(body, ms));
  vChain = run.catch(() => {});
  return run;
}
async function vjsOne(body, ms) {
  const w = await vintedPage();
  const js = "(" + vHelpers.toString() + ")();\n(async () => {\n" + body + "\n})().then(r => completion(JSON.stringify({ ok: true, r: r === undefined ? null : r })), e => completion(JSON.stringify({ ok: false, e: String(e && e.message || e) })));";
  const out = await Promise.race([w.evaluateJavaScript(js, true), pause(ms).then(() => { throw new Error("Vinted didn't answer in " + Math.round(ms / 1000) + " s"); })]);
  let o = {};
  try { o = JSON.parse(out || "{}"); } catch (e) { throw new Error("Vinted's page sent something unexpected"); }
  if (!o.ok) throw new Error(o.e || "Vinted's page failed");
  return o.r;
}
const vErr = (a, what) => {
  const j = a && a.j, m = j && (j.message || (j.errors && j.errors.map(e => [e.field, e.value].filter(Boolean).join(": ")).join("; ")));
  return new Error(`${what}: ${m || ("HTTP " + (a ? a.status : "?") + (a && a.t ? " " + a.t.slice(0, 80) : ""))}`);
};
const vSignedOut = a => a && (a.status === 401 || a.status === 403);

// Are you signed in to Vinted here? A form endpoint answers only when you are; its answer (the colours) is kept.
async function vintedCheck() {
  try {
    const a = await vjs(`return await window.__vt.api("/item_upload/colors");`, 40000);
    settings.vintedOk = a.status === 200;
    if (a.status === 200 && a.j && Array.isArray(a.j.colors)) {
      const c = vCacheGet(); c.colors = a.j.colors.map(x => ({ id: x.id, title: x.title, hex: x.hex, code: x.code })); vCacheSave();
    }
    if (!settings.vintedOk) startLog(`Vinted: signed out (HTTP ${a.status})`);
  } catch (e) { settings.vintedOk = false; startLog("Vinted check failed: " + (e.message || e)); }
  settings.vintedAt = Date.now();
  write("settings", settings);
  return settings.vintedOk;
}
// Sign in, in Vinted's own page, shown full screen. Apple, Facebook and e-mail work; Google refuses sign-ins inside apps.
async function vintedSignIn() {
  const w = new WebView();
  await w.loadURL(vBase() + "/member/signup/select_type?ref_url=%2Fitems%2Fnew");
  await w.present(true);
  vwv = null;   // a fresh page picks up the new session
  const ok = await vintedCheck();
  if (ok) track("vinted_signed_in", { site: siteOf().replace("vinted.", "") });
  return ok;
}

// Vinted's categories, as leaves with their path ("Vaikams › Žaislai › Rūšiuokliai ir bokšteliai"); kept for a week.
async function vCatalogs() {
  const c = vCacheGet();
  if (c.catalogs && c.catalogs.length && Date.now() - (c.catalogsAt || 0) < cfg("catalogDays") * DAY) return c.catalogs;
  const r = await vjs(`const a = await window.__vt.api("/item_upload/catalogs");
    if (a.status !== 200 || !a.j) return { status: a.status, t: a.t };
    const out = [];
    const walk = (list, path) => { for (const x of list || []) { const p = path.concat(x.title); if (x.catalogs && x.catalogs.length) walk(x.catalogs, p); else out.push([x.id, p.join(" › ")]); } };
    walk(a.j.catalogs, []);
    return { status: 200, list: out };`, 60000);
  if (!r || !r.list) { if (c.catalogs) return c.catalogs; throw vErr(r, "Vinted's categories"); }
  c.catalogs = r.list; c.catalogsAt = Date.now(); vCacheSave();
  return r.list;
}
// Categories whose path shares words with what you (or AI) said, best first.
async function catSearch(words, n = 20) {
  const list = await vCatalogs(), q = [].concat(words || []).filter(Boolean);
  const scored = list.map(([id, path]) => {
    const leaf = path.split(" › ").pop();
    let s = 0;
    q.forEach((w, i) => { const wt = 1 + (q.length - i) / q.length; s += overlap(path, w) * wt + overlap(leaf, w) * wt * 2; if (norm(leaf) === norm(w)) s += 6; });
    return [id, path, s];
  }).filter(x => x[2] > 0).sort((a, b) => b[2] - a[2]);
  return scored.slice(0, n).map(([id, path]) => ({ id, path }));
}
const catPath = id => { const c = vCacheGet(); const f = (c.catalogs || []).find(x => x[0] === id); return f ? f[1] : ""; };

// The fields Vinted asks for in one category: size, condition, material… with their options, flattened.
async function vAttributes(catId) {
  const a = await vjs(`return await window.__vt.api("/item_upload/attributes", { method: "POST", body: { attributes: [{ code: "category", value: [${+catId}] }] } });`);
  if (a.status !== 200 || !a.j) throw vErr(a, "Vinted's fields for this category");
  const flat = (opts, group) => [].concat(...(opts || []).map(o => o.options && o.options.length ? flat(o.options, o.title) : [{ id: o.id, title: o.title, group: group || "" }]));
  return (a.j.attributes || []).filter(x => x.configuration && x.code !== "brand" && x.code !== "color" && x.code !== "category").map(x => ({
    code: x.code, title: x.configuration.title || x.code, required: !!x.configuration.required,
    multi: x.configuration.selection_type === "multi", limit: x.configuration.selection_limit || 1,
    options: flat(x.configuration.options).slice(0, 400),
  }));
}
async function vBrands(keyword, catId) {
  const q = "?keyword=" + encodeURIComponent(keyword || "") + (catId ? "&category_id=" + catId : "");
  const a = await vjs(`return await window.__vt.api("/item_upload/brands${q}");`);
  if (a.status !== 200 || !a.j) throw vErr(a, "Vinted's brands");
  return (a.j.brands || []).slice(0, 20).map(b => ({ id: b.id, title: b.title }));
}
// Objects with an id and a name, wherever they sit in an answer whose exact shape Vinted doesn't document.
function findOptions(j) {
  const out = [];
  const walk = v => {
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (!v || typeof v !== "object") return;
    if (v.id != null && (v.title || v.name) && !out.some(o => o.id === v.id))
      out.push({ id: v.id, title: v.title || v.name, hint: v.description || v.subtitle || "", rec: !!(v.is_recommended || v.recommended || v.is_default) });
    Object.values(v).forEach(x => { if (x && typeof x === "object") walk(x); });
  };
  walk(j);
  return out;
}
async function vParcels(catId) {
  try {
    const a = await vjs(`return await window.__vt.api(${JSON.stringify(vApiHost() + "/shipping-estimation/external/catalogs/" + (+catId) + "/package_sizes")});`, 30000);
    const list = a.status === 200 ? findOptions(a.j).filter(o => o.id < 1000) : [];
    return list.length ? list.slice(0, 8) : PARCELS_FALLBACK;
  } catch (e) { return PARCELS_FALLBACK; }
}
// Vinted's own price suggestion (lower, optimal, higher) for a category, brand and condition.
async function vPrice(catId, brandId, condId, imageIds) {
  try {
    const body = { category_id: +catId, brand_id: brandId || null, condition_id: condId || null, model_metadata: null,
      image_metadata: (imageIds || []).map(id => ({ image_id: id, orientation: "0" })), upload_session_id: UUID.string().toLowerCase(), attributes: [] };
    const a = await vjs(`return await window.__vt.api(${JSON.stringify(vApiHost() + "/upload-form-suggestions/item_price_suggestions")}, { method: "POST", body: ${JSON.stringify(body)} });`, 30000);
    if (a.status !== 200 || !a.j) return null;
    const nums = [];
    const walk = v => {
      if (Array.isArray(v)) { v.forEach(walk); return; }
      if (!v || typeof v !== "object") return;
      for (const [k, x] of Object.entries(v)) {
        if (/amount|price|value/i.test(k) && (typeof x === "number" || (typeof x === "string" && /^\d+(\.\d+)?$/.test(x)))) nums.push(+x);
        else if (x && typeof x === "object") walk(x);
      }
    };
    walk(a.j);
    const ok = nums.filter(n => n > 0 && n < 100000).sort((x, y) => x - y);
    if (!ok.length) return null;
    return { low: ok[0], mid: ok[Math.floor(ok.length / 2)], high: ok[ok.length - 1] };
  } catch (e) { return null; }
}
// One photo up to Vinted (temporary until the item is posted). Returns its id and Vinted's image id.
async function vUpload(b64, sessionId) {
  const a = await vjs(`return await window.__vt.photo(${JSON.stringify(b64)}, ${JSON.stringify(sessionId)});`, cfg("vintedTimeout") * 1000 + 30000);
  if (vSignedOut(a)) { settings.vintedOk = false; throw new Error("You're signed out of Vinted. Sign in again in Settings › Vinted."); }
  if (a.status !== 200 || !a.j || !a.j.id) throw vErr(a, "Uploading a photo");
  const imageId = ((a.j.url || "").match(/\/t\/([^/]+)\//) || [])[1] || "";
  return { id: a.j.id, imageId };
}
async function vSuggestCats(imageId, sessionId) {
  try {
    const a = await vjs(`return await window.__vt.api("/item_upload/suggestions/categories", { method: "POST", body: { image_metadata: [{ image_id: ${JSON.stringify(imageId)}, orientation: "0" }], upload_session_id: ${JSON.stringify(sessionId)} } });`, 30000);
    return a.status === 200 && a.j && Array.isArray(a.j.categories) ? a.j.categories.slice(0, 5) : [];
  } catch (e) { return []; }
}

// Posting: upload the photos in their order, then the item (or a draft) with every field the form sends.
async function vPost(it, asDraft, onStep) {
  const L = it.listing || {}, sessionId = UUID.string().toLowerCase();
  const photos = it.photos.slice(0, cfg("maxPhotos"));
  const assigned = [];
  for (let i = 0; i < photos.length; i++) {
    onStep(`Uploading photo ${i + 1} of ${photos.length}`, (i + 0.2) / (photos.length + 1));
    const ph = photos[i];
    const b64 = await readB64(photoFile(it.id, ph.id, ph.use === "clean" && ph.clean ? "clean" : ""));
    const up = await vUpload(b64, sessionId);
    assigned.push({ id: up.id, orientation: 0 });
  }
  onStep(asDraft ? "Saving the draft" : "Posting", photos.length / (photos.length + 1));
  const attrs = [];
  if (L.conditionId) attrs.push({ code: "condition", ids: [+L.conditionId] });
  for (const [code, ids] of Object.entries(L.attrs || {})) if (code !== "condition" && ids && ids.length) attrs.push({ code, ids: ids.map(Number) });
  const item = {
    id: null, currency: currencyOf(), temp_uuid: sessionId, title: clip(L.title, 100), description: clip(L.description, 3000),
    brand_id: L.brandId || null, brand: L.brandTitle || "", catalog_id: +L.catalogId, isbn: null,
    ai_photo: it.photos.some(p => p.use === "clean" && p.clean && p.studio),   // an AI-drawn studio photo is marked as one
    price: String(L.price), package_size_id: L.packageSizeId ? +L.packageSizeId : null, shipment_prices: { domestic: null },
    color_ids: (L.colorIds || []).slice(0, 2).map(Number), assigned_photos: assigned,
    measurement_length: null, measurement_width: null, item_attributes: attrs, manufacturer: null, manufacturer_labelling: null,
  };
  const path = asDraft ? "/item_upload/drafts" : "/item_upload/items";
  const payload = asDraft ? { draft: item, parcel: null, upload_session_id: sessionId } : { item, push_up: false, parcel: null, upload_session_id: sessionId };
  const a = await vjs(`return await window.__vt.api(${JSON.stringify(path)}, { method: "POST", headers: { "X-Upload-Form": "true" }, body: ${JSON.stringify(payload)} });`);
  if (vSignedOut(a)) { settings.vintedOk = false; throw new Error("You're signed out of Vinted. Sign in again in Settings › Vinted."); }
  if (a.status < 200 || a.status > 299 || !a.j || (a.j.code && a.j.code !== 0)) throw vErr(a, asDraft ? "Vinted didn't save the draft" : "Vinted didn't take the item");
  const id = (a.j.item && a.j.item.id) || (a.j.draft && a.j.draft.id) || a.j.id || null;
  return { id, url: id ? vBase() + "/items/" + id + (asDraft ? "/edit" : "") : vBase() + "/member/items" };
}

// ---------- photos ----------
// Each item's photos live in Vintly/photos/<item id>/: <photo id>.jpg (as taken, resized), -clean.jpg (cleaned),
// -t.jpg and -ct.jpg (small thumbnails for the screen). Thumbnails are kept in memory once read.
const itemDirPath = id => fm.joinPath(PHOTO_DIR, id);
function ensureDir(d) { if (!fm.fileExists(d)) fm.createDirectory(d, true); return d; }
const photoFile = (id, pid, kind) => fm.joinPath(itemDirPath(id), pid + (kind ? "-" + kind : "") + ".jpg");
async function readB64(path) {
  if (!fm.fileExists(path)) throw new Error("A photo is missing from Vintly's folder");
  if (fm.isFileStoredIniCloud(path) && !fm.isFileDownloaded(path)) await Promise.race([fm.downloadFileFromiCloud(path), pause(20000)]);
  return fm.read(path).toBase64String();
}
const thumbCache = {};
function thumbURL(id, pid, kind) {
  const p = photoFile(id, pid, kind);
  if (thumbCache[p]) return thumbCache[p];
  try {
    if (!fm.fileExists(p) || (fm.isFileStoredIniCloud(p) && !fm.isFileDownloaded(p))) { if (fm.fileExists(p)) fm.downloadFileFromiCloud(p); return ""; }
    return (thumbCache[p] = "data:image/jpeg;base64," + fm.read(p).toBase64String());
  } catch (e) { return ""; }
}
function writeB64(path, b64) { fm.write(path, Data.fromBase64String(b64)); delete thumbCache[path]; }
function removeItemFiles(id) { try { const d = itemDirPath(id); if (fm.fileExists(d)) fm.remove(d); } catch (e) {} }
// Scales a native Image (from the share sheet) so its long side is at most max; JPEG base64 back.
function scaledJPEG(img, max) {
  const w = img.size.width, h = img.size.height, s = Math.min(1, max / Math.max(w, h));
  const dc = new DrawContext();
  dc.size = new Size(Math.round(w * s), Math.round(h * s)); dc.respectScreenScale = false; dc.opaque = true;
  dc.drawImageInRect(img, new Rect(0, 0, Math.round(w * s), Math.round(h * s)));
  return { b64: Data.fromJPEG(dc.getImage()).toBase64String(), w: Math.round(w * s), h: Math.round(h * s) };
}

// ---------- items ----------
const byId = id => items.find(x => x.id === id);
function newItem(photos) {
  const it = { id: uid(), created: Date.now(), status: "new", photos: photos || [], notes: "", listing: {}, opts: {} };
  items.unshift(it);
  return it;
}
// What still stops an item from being posted, in plain words.
function missingFor(it) {
  const L = it.listing || {}, miss = [];
  if (!it.photos.length) miss.push("a photo");
  if (!L.title || L.title.trim().length < 5) miss.push("a title");
  if (!L.description || L.description.trim().length < 5) miss.push("a description");
  if (!(L.price > 0)) miss.push("a price");
  if (!L.catalogId) miss.push("a category");
  if (!L.conditionId) miss.push("the condition");
  for (const a of (it.opts && it.opts.attrs) || []) if (a.required && a.code !== "condition" && !((L.attrs || {})[a.code] || []).length) miss.push(a.title.toLowerCase());
  return miss;
}
// Posted items older than the keeping time leave, with their photos.
function prune() {
  const cut = Date.now() - cfg("keepPostedDays") * DAY;
  const old = items.filter(x => x.status === "posted" && (x.vinted && x.vinted.at || x.created) < cut);
  old.forEach(x => removeItemFiles(x.id));
  if (old.length) items = items.filter(x => !old.includes(x));
}

// ---------- adding photos ----------
// A batch of new photos waits in Vintly/photos/_batch until you've said which item each belongs to.
let batch = null;   // { photos: [{ id, w, h }], groups: [[photo ids]], names: [], target: item id or "", sorting, by }
const BATCH = "_batch";
function clearBatch() { try { const d = itemDirPath(BATCH); if (fm.fileExists(d)) fm.remove(d); } catch (e) {} batch = null; }
async function savePhoto(dirId, p) {   // p: { b64, t (thumb b64), w, h }
  ensureDir(itemDirPath(dirId));
  const pid = uid();
  writeB64(photoFile(dirId, pid), p.b64);
  writeB64(photoFile(dirId, pid, "t"), p.t || p.b64);
  return { id: pid, w: p.w || 0, h: p.h || 0 };
}
function movePhoto(fromId, toId, pid) {
  ensureDir(itemDirPath(toId));
  for (const k of ["", "t", "clean", "ct"]) {
    const a = photoFile(fromId, pid, k), b = photoFile(toId, pid, k);
    if (fm.fileExists(a)) { fm.move(a, b); delete thumbCache[a]; }
  }
}
// Photos that arrived (from the page's picker, the camera or the share sheet): to an item, or into a batch to sort.
async function addPhotos(list, target, source) {
  if (!list.length) return;
  track("photos_added", { photos: list.length, source });
  const it = target && byId(target);
  if (it) {
    for (const p of list) if (it.photos.length < cfg("maxPhotos")) it.photos.push(await savePhoto(it.id, p));
    write("items", items); push(); return;
  }
  if (!batch) batch = { photos: [], groups: [], names: [] };
  for (const p of list) batch.photos.push(await savePhoto(BATCH, p));
  if (batch.photos.length === 1 && list.length === 1 && source !== "camera") return finishBatch([[batch.photos[0].id]]);
  batch.groups = [batch.photos.map(p => p.id)]; batch.names = [];
  push();
  if (settings.ai !== false && aiKey() && batch.photos.length > 1) await sortBatch();
}
// ✦ Which photos show the same item: one request with small copies of every photo in the batch.
async function sortBatch() {
  if (!batch || batch.photos.length < 2 || !aiKey()) return;
  batch.sorting = true; push();
  try {
    const ph = batch.photos.slice(0, 24);
    const imgs = [];
    for (const p of ph) imgs.push(await readB64(photoFile(BATCH, p.id, "t")));
    const txt = await aiCall(
      "You sort photos into items for second-hand listings. Several photos usually show the same item from different sides; labels, backs and close-ups belong to the item they show. Reply with JSON only.",
      `There are ${ph.length} photos, numbered 1 to ${ph.length} in the order given. Group them by the physical item they show. ` +
      `Reply as {"groups":[[1,2,3],[4,5]],"names":["short English name of item 1","…"]}. Every photo number appears exactly once.`,
      800, "sort", settings.aiProvider, imgs);
    const j = parseJSON(txt), seen = new Set();
    const groups = (j.groups || []).map(g => g.map(n => ph[n - 1] && ph[n - 1].id).filter(id => id && !seen.has(id) && seen.add(id))).filter(g => g.length);
    const rest = batch.photos.map(p => p.id).filter(id => !seen.has(id));
    if (rest.length) groups.push(rest);
    if (groups.length) { batch.groups = groups; batch.names = (j.names || []).map(s => clip(s, 40)); batch.by = PROVIDERS[settings.aiProvider]; }
    track("items_sorted", { photos: batch.photos.length, items: batch.groups.length, provider: settings.aiProvider });
  } catch (e) { toast("Couldn't sort the photos: " + String(e.message || e).slice(0, 80)); }
  if (batch) batch.sorting = false;
  push();
}
// The batch becomes items: one per group, photos in the group's order.
function finishBatch(groups) {
  if (!batch) return;
  const made = [];
  (groups || batch.groups).filter(g => g.length).forEach((g, i) => {
    const it = newItem([]);
    if (batch.names[i]) it.hint = batch.names[i];
    for (const pid of g.slice(0, cfg("maxPhotos"))) { const p = batch.photos.find(x => x.id === pid); if (p) { movePhoto(BATCH, it.id, pid); it.photos.push(p); } }
    made.push(it);
  });
  clearBatch();
  write("items", items); push();
  if (made.length === 1) call("openItem", made[0].id);
  else toast(`${made.length} items added. Open one to prepare it.`);
}

// ---------- ✦ cleaning photos ----------
// "keep": the image model draws a black-and-white outline of the item; Vintly cuts the ORIGINAL photo along it on a
// white ground, so the item keeps its own pixels. "studio": the model redraws the photo on white (marked as AI).
const MASK_PROMPT = "Make a precise black-and-white cut-out mask of this photo. The single item for sale (the main object in the " +
  "foreground, with every part that belongs to it: handles, strings, straps, lids, wheels, legs) must be solid pure white (#FFFFFF). " +
  "Absolutely everything else must be solid pure black (#000000): the table or floor, walls, background, shadows, reflections, " +
  "other objects, hands and the grey bars at the edges. Keep exactly the same framing, position, scale and outline as the input: " +
  "the white shape must lie exactly over the item. No grey, no gradients, no text, no outlines, no new objects.";
const STUDIO_PROMPT = "Turn this photo into a clean product photo for a second-hand listing: the exact same item, in the same " +
  "position, angle and size, on a plain pure white background with a soft natural shadow under it. Do not change the item in any way: " +
  "keep its shape, colours, printing, logos, labels, scratches and wear exactly as they are. Remove everything else, including the " +
  "grey bars at the edges.";
async function cleanPhoto(it, ph) {
  const b64 = await readB64(photoFile(it.id, ph.id));
  const r = ph.w && ph.h ? ph.h / ph.w : 4 / 3;
  const size = r > 1.15 ? "1024x1536" : r < 0.87 ? "1536x1024" : "1024x1024";
  const [cw, ch] = size.split("x").map(Number);
  const studio = settings.cleanStyle === "studio";
  const boxed = await evc(`window.__letterbox(${safeJSON(b64)}, ${cw}, ${ch})`, 30000);
  if (!boxed || boxed.error) throw new Error((boxed && boxed.error) || "Couldn't prepare the photo");
  const drawn = await aiImageEdit(boxed.b64, studio ? STUDIO_PROMPT : MASK_PROMPT, size, studio ? "high" : "medium");
  const res = await evc(`window.__cutout(${safeJSON(b64)}, ${safeJSON(drawn)}, ${safeJSON({ studio, cw, ch, grow: cfg("maskGrow"), margin: cfg("itemMargin"), max: cfg("photoMax") })})`, 60000);
  if (!res || res.error) throw new Error((res && res.error) || "Couldn't cut the item out");
  writeB64(photoFile(it.id, ph.id, "clean"), res.b64);
  writeB64(photoFile(it.id, ph.id, "ct"), res.t);
  ph.clean = true; ph.use = "clean"; ph.studio = studio; ph.cleanErr = "";
}

// ---------- ✦ reading the photos ----------
function listingPrompt(colors) {
  const L1 = LANGS[settings.lang] || "English", L2 = settings.lang2 && settings.lang2 !== settings.lang ? LANGS[settings.lang2] : "";
  const site = siteOf(), cur = currencyOf(), siteLang = LANGS[VINTED_SITES[site][2]] || "English";
  const langs = L2 ? `"${settings.lang}": …, "${settings.lang2}": …` : `"${settings.lang}": …`;
  return {
    system: `You are an experienced seller on Vinted (${site}, prices in ${cur}). You look at photos of ONE second-hand item and prepare its listing. ` +
      `Be accurate and honest: describe only what the photos show, never invent a brand, size or feature you can't see. Reply with JSON only.`,
    user: `Return exactly this JSON:
{
 "what": "short English name of the item",
 "brand": "the brand as printed on the item, its label or packaging; empty string if no brand is visible",
 "model": "model or series if printed, else empty",
 "category_words": ["3 to 6 words or short phrases to find the item's category on Vinted, in ${siteLang} first and then English, most specific first"],
 "condition": "one of: new_with_tags, new_without_tags, very_good, good, satisfactory",
 "flaws": ["visible wear or defects, in English, empty if none"],
 "colors": ["up to 2 colour codes from: ${colors}"],
 "materials": ["main materials in English, e.g. wood, plastic, cotton"],
 "size": "the size as printed (clothing, shoes), or the age range for children's items, else empty",
 "parcel": "S (fits a large envelope), M (fits a shoe box) or L (bigger)",
 "price_new": typical new price in ${cur} as a number, or null,
 "price_used": what this item usually sells for second-hand on Vinted in ${cur}, as a number,
 "price_why": "one short English sentence on the price",
 "title": {${langs}},
 "description": {${langs}},
 "confidence": a number from 0 to 1
}
Titles: at most 60 characters, brand (if any) + what it is + one key detail; no emojis, no capitals-only words.
Descriptions: 3 to 5 short sentences: what it is, its notable features, its condition honestly (with any flaws), and that it is sold as shown in the photos${L2 ? `; the ${L2} text says the same as the ${L1} text, naturally written, not word for word` : ""}.` +
      (settings.humour ? ` Add one light, friendly touch of humour (a gentle joke, never at the buyer's expense, never about the price).` : ` Keep the tone plain and friendly.`) +
      ` No hashtags, no emojis, no prices, no contact details, no "DM me".`,
  };
}
async function analyse(it) {
  const n = Math.min(it.photos.length, cfg("aiPhotos")), imgs = [];
  for (const ph of it.photos.slice(0, n)) imgs.push(await aiImage(it, ph));
  const colors = (vCacheGet().colors || []).map(c => c.code).filter(Boolean).join(", ") || "BLACK, GREY, WHITE, CREAM, BEIGE, BROWN, RED, PINK, ORANGE, YELLOW, GREEN, BLUE, NAVY, PURPLE, GOLD, SILVER, MULTI";
  const p = listingPrompt(colors);
  const txt = await aiCall(p.system, p.user + (it.notes ? `\n\nThe seller adds: ${clip(it.notes, 600)}` : "") + (it.hint ? `\nIt was sorted as: ${it.hint}` : ""), 2500, "listing", settings.aiProvider, imgs);
  const j = parseJSON(txt);
  it.ai = { at: Date.now(), by: PROVIDERS[settings.aiProvider], what: clip(j.what, 80), brand: clip(j.brand, 60), model: clip(j.model, 60),
    words: (j.category_words || []).map(w => clip(w, 60)).slice(0, 6), condition: CONDITIONS.some(c => c.code === j.condition) ? j.condition : "good",
    flaws: (j.flaws || []).map(f => clip(f, 120)).slice(0, 6), colors: (j.colors || []).slice(0, 2).map(String), materials: (j.materials || []).slice(0, 4).map(String),
    size: clip(j.size, 40), parcel: ["S", "M", "L"].includes(j.parcel) ? j.parcel : "M",
    priceNew: +j.price_new > 0 ? +j.price_new : null, priceUsed: +j.price_used > 0 ? +j.price_used : null, priceWhy: clip(j.price_why, 200),
    confidence: Math.max(0, Math.min(1, +j.confidence || 0)) };
  const L = it.listing = it.listing || {};
  const t = j.title || {}, d = j.description || {}, l2 = settings.lang2 && settings.lang2 !== settings.lang ? settings.lang2 : "";
  const t1 = clip(t[settings.lang] || Object.values(t)[0] || it.ai.what, 70), t2 = l2 ? clip(t[l2], 70) : "";
  if (!L.titleSet) L.title = clip(settings.bothTitles && t2 && norm(t2) !== norm(t1) ? `${t1} / ${t2}` : t1, 100);
  const d1 = String(d[settings.lang] || Object.values(d)[0] || "").trim(), d2 = l2 ? String(d[l2] || "").trim() : "";
  if (!L.descSet) L.description = clip(d2 ? `${d1}\n\n${d2}` : d1, 3000);
  if (!L.condSet) L.conditionId = CONDITIONS.find(c => c.code === it.ai.condition).id;
  L.aiText = { by: it.ai.by, at: it.ai.at };
  if (it.ai.priceUsed && !L.priceSet) L.price = fairPrice(it.ai.priceUsed, cfg("priceBelowPct"), cfg("priceRound"), cfg("priceMin"));
}
// A photo for AI: the cleaned one if you use it, at the AI size (the page scales it).
async function aiImage(it, ph) {
  const b64 = await readB64(photoFile(it.id, ph.id, ph.use === "clean" && ph.clean ? "clean" : ""));
  const r = await evc(`window.__scale(${safeJSON(b64)}, ${cfg("aiPhotoPx")})`, 30000);
  return r && r.b64 ? r.b64 : b64;
}

// ---------- filling Vinted's fields ----------
// Category (Vinted's own guess from the photo, then AI's choice among matching categories), the category's fields,
// brand, colours, parcel size and Vinted's price suggestion. With AI the fields are chosen in one text request.
async function fitVinted(it, step) {
  const L = it.listing = it.listing || {}, A = it.ai || {}, O = it.opts = it.opts || {};
  step("Finding the category");
  let suggested = [];
  try {
    const sid = UUID.string().toLowerCase(), first = it.photos[0];
    if (first) { const up = await vUpload(await readB64(photoFile(it.id, first.id, first.use === "clean" && first.clean ? "clean" : "")), sid); O.imageId = up.imageId; suggested = up.imageId ? await vSuggestCats(up.imageId, sid) : []; }
  } catch (e) { startLog("Vinted category guess: " + (e.message || e)); if (!settings.vintedOk) throw e; }
  await vCatalogs();
  const words = (A.words || []).concat([A.what, L.title].filter(Boolean));
  let cands = await catSearch(words, 24);
  const sug = suggested.map(id => ({ id, path: catPath(id), vinted: true })).filter(c => c.path);
  cands = sug.concat(cands.filter(c => !suggested.includes(c.id))).slice(0, 26);
  O.cats = cands;
  if (!L.catSet) {
    let pick = sug[0] || cands[0] || null;
    if (aiKey() && cands.length > 1) {
      try {
        const txt = await aiCall("You choose the right Vinted category for an item. Reply with JSON only.",
          `Item: ${A.what || L.title}${A.brand ? " by " + A.brand : ""}. ${A.size ? "Size: " + A.size + ". " : ""}Title: ${L.title || ""}\n` +
          `Categories (Vinted's own guesses are marked *):\n${cands.map((c, i) => `${i + 1}. ${c.vinted ? "* " : ""}${c.path}`).join("\n")}\n` +
          `Reply {"n": number of the best category}.`, 200, "vinted");
        const n = +parseJSON(txt).n;
        if (cands[n - 1]) pick = cands[n - 1];
      } catch (e) { startLog("AI category: " + (e.message || e)); }
    }
    if (pick) { L.catalogId = pick.id; L.catalogPath = pick.path; }
  }
  if (!L.catalogId) throw new Error("No Vinted category matched. Pick one under Category.");
  await loadCatFields(it);
  step("Filling in brand, size and colours");
  // Brand: Vinted's own brand when the name matches, else the name as you wrote it, else none.
  if (!L.brandSet) {
    L.brandId = null; L.brandTitle = "";
    if (A.brand) {
      try {
        const bs = await vBrands(A.brand, L.catalogId); O.brands = bs;
        const hit = bs.find(b => norm(b.title) === norm(A.brand)) || bs.find(b => norm(b.title).replace(/ /g, "") === norm(A.brand).replace(/ /g, ""));
        if (hit) { L.brandId = hit.id; L.brandTitle = hit.title; } else L.brandTitle = A.brand;
      } catch (e) { L.brandTitle = A.brand; }
    }
  }
  const attrs = O.attrs || [], colors = vCacheGet().colors || [];
  const cond = attrs.find(a => a.code === "condition");
  if (cond && !cond.options.some(o => o.id === +L.conditionId)) L.conditionId = (cond.options.find(o => o.id === 3) || cond.options[0] || {}).id;
  L.attrs = L.attrs || {};
  const open = attrs.filter(a => a.code !== "condition" && !(L.attrSet || {})[a.code]);
  // Without AI: a lone option, or a one-size option for things without sizes; the rest is yours to choose.
  for (const a of open) {
    const one = a.options.length === 1 ? a.options[0] : !A.size ? a.options.find(o => /universal|one size|vienas dydis|universalus/i.test(o.title)) : null;
    if (one) L.attrs[a.code] = [one.id];
  }
  if (!(L.colorSet) && A.colors && A.colors.length) L.colorIds = A.colors.map(c => (colors.find(x => x.code === c) || {}).id).filter(Boolean).slice(0, 2);
  const parcels = O.parcels || PARCELS_FALLBACK;
  if (!L.parcelSet) { const want = { S: 0, M: 1, L: 2 }[A.parcel || "M"]; const rec = parcels.find(p => p.rec); L.packageSizeId = (parcels[Math.min(want, parcels.length - 1)] || rec || parcels[0] || {}).id || null; }
  if (aiKey() && it.ai && open.length) {
    try {
      const desc = open.map(a => `${a.code} (${a.title}${a.required ? ", required" : ""}${a.multi ? ", up to " + a.limit : ", one"}): ` +
        a.options.slice(0, 160).map(o => `${o.id}=${o.group ? o.group + "/" : ""}${o.title}`).join("; ")).join("\n");
      const txt = await aiCall("You fill in a Vinted listing form from what is known about an item. Choose option ids only from the lists given. Reply with JSON only.",
        `Item: ${A.what}${A.brand ? " by " + A.brand : ""}. Size or age: ${A.size || "none visible"}. Materials: ${(A.materials || []).join(", ") || "unknown"}. ` +
        `Seller's note: ${it.notes ? clip(it.notes, 300) : "none"}.\nFields:\n${desc}\n` +
        `Reply {"fields": {"<code>": [ids]}} with the best option for each field you can tell; leave out a field if nothing fits. For children's toys or things without a size, use a "universal / one size" option when there is one.`,
        900, "vinted");
      const f = parseJSON(txt).fields || {};
      for (const a of open) {
        const ids = [].concat(f[a.code] || []).map(Number).filter(id => a.options.some(o => o.id === id)).slice(0, a.multi ? a.limit : 1);
        if (ids.length) L.attrs[a.code] = ids;
      }
    } catch (e) { startLog("AI fields: " + (e.message || e)); }
  }
  step("Checking Vinted's price");
  O.price = await vPrice(L.catalogId, L.brandId, L.conditionId, O.imageId ? [O.imageId] : []);
  if (!L.priceSet) {
    const usual = O.price ? O.price.mid : A.priceUsed;
    const fair = fairPrice(usual, cfg("priceBelowPct"), cfg("priceRound"), cfg("priceMin"));
    if (fair) L.price = fair;
  }
  it.fitAt = Date.now();
}
async function loadCatFields(it) {
  const L = it.listing, O = it.opts;
  const [attrs, parcels] = await Promise.all([vAttributes(L.catalogId), vParcels(L.catalogId)]);
  O.attrs = attrs; O.parcels = parcels; O.catId = L.catalogId;
  L.attrs = Object.fromEntries(Object.entries(L.attrs || {}).filter(([code, ids]) => { const a = attrs.find(x => x.code === code); return a && ids.every(id => a.options.some(o => o.id === +id)); }));
  if (L.packageSizeId && !parcels.some(p => p.id === +L.packageSizeId)) L.packageSizeId = null;
}

// ---------- ✦ prepare: clean, read, fill ----------
const busy = {};   // item id → { steps: [{ t, done }], p } while preparing or posting
function stepper(id) {
  const b = busy[id] = busy[id] || { steps: [], p: 0 };
  return (t, p) => { const last = b.steps[b.steps.length - 1]; if (last) last.done = true; b.steps.push({ t, done: false }); if (p != null) b.p = p; call("onBusy", id, b); };
}
async function prepare(id, opts = {}) {
  const it = byId(id);
  if (!it || busy[id]) return;
  const step = stepper(id);
  const t0 = Date.now();
  let cleaned = 0, failedClean = 0;
  it.err = "";
  try {
    if (opts.clean !== false && canClean()) {
      const todo = it.photos.filter(p => !p.clean || opts.reclean);
      for (let i = 0; i < todo.length; i++) {
        step(`✦ Cleaning photo ${i + 1} of ${todo.length}`);
        try { await cleanPhoto(it, todo[i]); cleaned++; write("items", items); push(); }
        catch (e) { failedClean++; todo[i].cleanErr = clip(e.message || e, 120); startLog("cleanup: " + (e.message || e)); }
      }
      if (todo.length) track("photos_cleaned", { photos: todo.length, ok: cleaned, style: settings.cleanStyle === "studio" ? "studio" : "keep" });
    }
    if (aiKey() && opts.read !== false) { step("✦ Reading the photos"); await analyse(it); write("items", items); push(); }
    if (settings.vintedOk || await vintedCheck()) await fitVinted(it, step);
    else it.err = "Sign in to Vinted (Settings › Vinted) to fill in Vinted's fields.";
    it.status = "ready";
    track("item_prepared", { provider: aiKey() ? settings.aiProvider : "none", photos: it.photos.length, vinted: !!it.fitAt, seconds: Math.round((Date.now() - t0) / 1000) });
  } catch (e) { it.err = clip(e.message || e, 200); startLog("prepare: " + it.err); }
  delete busy[id];
  write("items", items); push(); saveWidget(widgetSnapshot());
  if (failedClean) toast(`${failedClean} photo${failedClean === 1 ? "" : "s"} couldn't be cleaned; the originals are kept`);
}
// Post (or save as a Vinted draft). Fills Vinted's fields first if they were never filled.
async function postItem(id, asDraft) {
  const it = byId(id);
  if (!it || busy[id]) return;
  const step = stepper(id);
  it.err = "";
  try {
    if (!settings.vintedOk && !(await vintedCheck())) throw new Error("Sign in to Vinted first (Settings › Vinted).");
    if (!it.fitAt || !(it.opts && it.opts.attrs)) { await fitVinted(it, step); write("items", items); }
    const miss = missingFor(it);
    if (miss.length) throw new Error("Still needed: " + miss.join(", "));
    const r = await vPost(it, asDraft, (t, p) => step(t, p));
    it.vinted = { id: r.id, url: r.url, at: Date.now(), draft: !!asDraft };
    it.status = "posted";
    it.cover = thumbURL(it.id, it.photos[0].id, it.photos[0].use === "clean" && it.photos[0].clean ? "ct" : "t");
    track("item_posted", { photos: it.photos.length, mode: asDraft ? "draft" : "post", cleaned: it.photos.filter(p => p.use === "clean" && p.clean).length });
    if (settings.removePhotosAfter) { removeItemFiles(it.id); it.photos = it.photos.map(p => ({ id: p.id, w: p.w, h: p.h, gone: true })); }
    toast(asDraft ? "Saved as a draft on Vinted" : "Posted on Vinted 🎉");
  } catch (e) { it.err = clip(e.message || e, 240); startLog("post: " + it.err); }
  delete busy[id];
  write("items", items); push(); saveWidget(widgetSnapshot());
}

// ---------- in-app updates (app-blueprints · in-app-updates) ----------
// Compares "1.10.0" and "1.9.2" as numbers: returns 1, 0 or -1.
function cmpVer(a, b) {
  const pa = String(a).split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}
function updateSnoozed() {
  try {
    return Keychain.contains(KC_UPDATE_SNOOZE) && Date.now() < +Keychain.get(KC_UPDATE_SNOOZE);
  } catch (e) { return false; }
}
function snoozeUpdate() {
  Keychain.set(KC_UPDATE_SNOOZE, String(Date.now() + UPDATE_SNOOZE_MS));
}
function clearUpdateSnooze() {
  if (Keychain.contains(KC_UPDATE_SNOOZE)) Keychain.remove(KC_UPDATE_SNOOZE);
}
async function checkForUpdate(force = false) {
  if (!force && (settings.checkUpdates === false || updateSnoozed())) return null;
  try {
    const req = new Request(`${REPO_RAW}releases.json?t=${Date.now()}`);
    req.timeoutInterval = 10;
    const data = await req.loadJSON();
    if (!data || !Array.isArray(data.releases)) return null;
    const newer = data.releases
      .filter(r => r && r.version && cmpVer(r.version, VERSION) > 0)
      .sort((x, y) => cmpVer(y.version, x.version));
    if (!newer.length) return null;
    // The newest release's highlights first, topped up from older versions the user skipped.
    const highlights = [];
    newer.forEach(r => (r.highlights || []).forEach(h => {
      if (highlights.length < 3 && h && h.title) highlights.push(h);
    }));
    return {
      current: VERSION, latest: newer[0].version, title: newer[0].title || '',
      skipped: newer.length, highlights, script: data.script || SCRIPT_FILE,
    };
  } catch (e) {
    console.log('Update check skipped: ' + e);
    return null;
  }
}
async function applyUpdate(info) {
  const req = new Request(`${REPO_RAW}${encodeURI((info && info.script) || SCRIPT_FILE)}?t=${Date.now()}`);
  req.timeoutInterval = 30;
  const code = await req.loadString();
  const okStatus = req.response && req.response.statusCode === 200;
  const m = code && code.match(/const VERSION = '([^']+)'/);
  // 1. A real script for THIS app, not an error page or another project's file
  if (!okStatus || !m || !code.includes(`const APP_ID = '${APP_ID}'`)) {
    throw new Error("The download didn't look right. Try again later.");
  }
  // 2. Actually newer: GitHub's cache can serve the old file for a few minutes after a release
  if (cmpVer(m[1], VERSION) <= 0) {
    throw new Error('GitHub is still serving the old version. Try again in a few minutes.');
  }
  // 3. Write it where the running script lives (iCloud or on the phone)
  // scriptFm (stability-patterns): iCloud only when the script lives in iCloud Drive; on a phone without
  // iCloud, any call on the iCloud manager can end the script, even inside a try
  const path = module.filename;
  scriptFm(path).writeString(path, code);
  return m[1];   // the version now installed
}
let pendingUpdate = null, updateChecked = false;
const offerUpdate = () => { if (pendingUpdate) call("__showUpdate", pendingUpdate); };
// One offer per launch, and an update wins: call this once the update check has settled.
function inviteIfDue() {
  if (!pendingUpdate && aiInviteDue()) call("__aiInvite", AI_INVITE);   // call() is Vintly's js(): window.__aiInvite(AI_INVITE)
}

// ---------- state sent to the UI ----------
function itemView(it) {
  const posted = it.status === "posted";
  return {
    id: it.id, status: it.status, created: it.created, hint: it.hint || "", notes: it.notes || "", err: it.err || "",
    listing: it.listing || {}, ai: it.ai || null, vinted: it.vinted || null, cover: it.cover || "", fitAt: it.fitAt || 0,
    opts: { cats: (it.opts && it.opts.cats) || [], attrs: (it.opts && it.opts.attrs) || [], parcels: (it.opts && it.opts.parcels) || PARCELS_FALLBACK, price: (it.opts && it.opts.price) || null },
    photos: it.photos.map(p => ({ id: p.id, clean: !!p.clean, use: p.use || "orig", studio: !!p.studio, err: p.cleanErr || "", gone: !!p.gone,
      t: posted && p !== it.photos[0] ? "" : p.gone ? "" : thumbURL(it.id, p.id, "t"), ct: !p.gone && p.clean && !posted ? thumbURL(it.id, p.id, "ct") : "" })),
    missing: missingFor(it), busy: busy[it.id] || null,
  };
}
function clientState() {
  return {
    items: items.map(itemView),
    batch: batch ? { photos: batch.photos.map(p => ({ id: p.id, t: thumbURL(BATCH, p.id, "t") })), groups: batch.groups, names: batch.names, sorting: !!batch.sorting, by: batch.by || "" } : null,
    colors: vCacheGet().colors || [], conditions: CONDITIONS,
    vinted: { ok: !!settings.vintedOk, at: settings.vintedAt || 0, site: siteOf(), cur: currencyOf(), base: vBase() },
    sites: Object.entries(VINTED_SITES).map(([k, v]) => [k, v[0], v[1]]), langs: LANGS,
    ai: {
      provider: settings.aiProvider,
      keys:  Object.fromEntries(Object.keys(PROVIDERS).map(p => [p, maskKey(keyFor(p))])),
      model: Object.fromEntries(Object.keys(PROVIDERS).map(p => [p, modelFor(p)])),
      models: settings.models || {}, usage, today: dayKey(),
      imageModel: imageModel(), imageModels: settings.imageModels || null, hasOpenAI: !!keyFor("openai"),
    },
    cfg: Object.fromEntries(CFG_FLAT.map(d => [d.k, cfg(d.k)])),
    cfgSchema: CONFIG.map(([title, items]) => ({ title, items })),
    settings: {
      tab: settings.tab, vintedSite: siteOf(), lang: settings.lang, lang2: settings.lang2, humour: settings.humour !== false, bothTitles: settings.bothTitles !== false,
      cleanStyle: settings.cleanStyle || "keep", removePhotosAfter: !!settings.removePhotosAfter,
      ai: settings.ai !== false, aiClean: settings.aiClean !== false, aiProvider: settings.aiProvider, hasKey: !!aiKey(), canClean: canClean(),
      checkUpdates: settings.checkUpdates !== false, shareUsage: !!settings.shareUsage,
      theme: settings.theme, density: settings.density, font: settings.font, textSize: settings.textSize,
    },
    palettes: PALETTES, version: VERSION,
    usageAvailable: usageAvailable(), usageStatus: usageStatus(), usageAsk: usageAvailable() && !settings.usageAsked && !settings.shareUsage,
    blueprints: BLUEPRINTS, blueprintsRepo: BLUEPRINTS_REPO, appName: APP,
  };
}
const safeJSON = x => JSON.stringify(x === undefined ? null : x).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029").replace(/<\//g, "<\\/");

// ---------- UI ----------
// The WebView is built in main() only, so a widget run never builds one (app-blueprints · widgets, Step 4).
let wv = null;
const call = (fn, ...args) => wv ? wv.evaluateJavaScript(`window.${fn} && window.${fn}(${args.map(safeJSON).join(",")})`, false).catch(() => {}) : Promise.resolve();
const toast = msg => call("toast", msg);
const push = () => call("recv", clientState());
// Asks the page for something that takes a while (a photo resized or cut out on its canvas); JSON back, with a time limit.
// One at a time, like vjs(): the page answers through a single completion() callback.
let evcChain = Promise.resolve();
function evc(expr, ms = 30000) {
  const run = evcChain.then(() => evcOne(expr, ms));
  evcChain = run.catch(() => {});
  return run;
}
async function evcOne(expr, ms) {
  if (!wv) throw new Error("Vintly's window is closed");
  const js = `Promise.resolve(${expr}).then(r => completion(JSON.stringify(r)), e => completion(JSON.stringify({ error: String(e && e.message || e) })))`;
  const out = await Promise.race([wv.evaluateJavaScript(js, true), pause(ms).then(() => { throw new Error("the page didn't answer in " + ms / 1000 + " s"); })]);
  try { return JSON.parse(out || "null"); } catch (e) { return null; }
}

const SET_KEYS = ["tab", "vintedSite", "lang", "lang2", "humour", "bothTitles", "cleanStyle", "removePhotosAfter", "ai", "aiClean", "imageModel",
  "theme", "density", "font", "textSize", "checkUpdates"];
async function handle(m) {
  const it = m.id ? byId(m.id) : null;
  switch (m.type) {
    // updates first: they must work whatever state the app's data is in
    case "update-later": snoozeUpdate(); pendingUpdate = null; return;
    case "update-now": {
      let ok = false, msg = "";
      try { msg = await applyUpdate(pendingUpdate); ok = true; pendingUpdate = null; clearUpdateSnooze(); track("app_updated", { from: VERSION, to: (String(msg).match(/[0-9]+\.[0-9]+\.[0-9]+/) || [""])[0] }); flushUsage(); }
      catch (e) { msg = String(e.message || e); }
      return call("__done", m.req, ok, msg);
    }
    case "updcheck": {
      clearUpdateSnooze();
      const u = await checkForUpdate(true);
      await call("__done", m.req, true, u ? `Version ${u.latest} is available` : `You're on the latest version (${VERSION})`);
      if (u) { pendingUpdate = u; offerUpdate(); }
      return;
    }
    case "state": return push();
    case "set":
      if (m.k === "shareUsage") { setUsage(m.v === true || m.v === "true" || m.v === "1"); return push(); }
      if (!SET_KEYS.includes(m.k)) return;
      if (m.k === "vintedSite" && !VINTED_SITES[m.v]) return;
      if (m.k === "lang" && !LANGS[m.v]) return;
      if (m.k === "lang2" && m.v && !LANGS[m.v]) return;
      if (m.k === "cleanStyle" && !["keep", "studio", "off"].includes(m.v)) return;
      settings[m.k] = m.v;
      write("settings", settings);
      if (m.k === "vintedSite") { settings.vintedOk = false; vwv = null; vCache = null; push(); await vintedCheck(); return push(); }
      if (["ai", "aiClean", "imageModel", "cleanStyle"].includes(m.k)) return push();
      return;
    case "cfg": {
      if (m.k === "*") settings.cfg = {}; else setCfg(m.k, m.v);
      if (m.k === "*" || m.k === "keepPostedDays") prune();
      saveAll(); return push();
    }
    case "startlog": {
      let txt = "";
      try { txt = FileManager.local().readString(LOG_PATH).split("\n").slice(-40).join("\n"); } catch (e) {}
      return call("__done", m.req, true, txt);
    }
    case "openurl":   // Settings › Built with: only the blueprints repository opens from here
      if (m.v === BLUEPRINTS_REPO || String(m.v).startsWith(BLUEPRINTS_REPO + "/")) await Safari.openInApp(m.v, false);
      return;
    case "aiinvite": aiInviteNote(m.v); return;   // AI invitation: shown, open, later or never
    case "aikey": {
      const p = PROVIDERS[m.v] ? m.v : settings.aiProvider;
      if (await askKey(p)) {
        settings.ai = true; saveAll(); push();
        try { const n = await fetchModels(p); toast(`${PROVIDERS[p]} key saved — ${n} models available`); }
        catch (e) { toast(`Key saved, but checking it failed: ${String(e.message || e).slice(0, 70)}`); }
      }
      saveAll(); return push();
    }
    case "airm": { const p = m.v; if (PROVIDERS[p]) { removeKey(p); toast(`${PROVIDERS[p]} key removed`); aiInviteKeyRemoved(); } saveAll(); return push(); }
    case "aiprov": if (PROVIDERS[m.v]) settings.aiProvider = m.v; saveAll(); return push();
    case "aimodels":
      try { const n = await fetchModels(m.v); toast(`${n} ${PROVIDERS[m.v]} models found`); }
      catch (e) { toast(String(e.message || e).slice(0, 90)); }
      saveAll(); return push();
    case "aimodel":
      if (PROVIDERS[m.p] && m.v) { settings.model = settings.model || {}; settings.model[m.p] = m.v; toast(`${PROVIDERS[m.p]} now uses ${m.v}`); }
      saveAll(); return push();
    case "aitest": {
      const p = m.v, t0 = Date.now();
      try {
        await aiCall("Reply with the single word OK.", "Connection test.", 10, "test", p);
        toast(`${PROVIDERS[p]} works — ${modelFor(p)} answered in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
      } catch (e) { toast(`${PROVIDERS[p]} test failed: ${String(e.message || e).slice(0, 80)}`); }
      return push();
    }
    case "usagereset": resetUsage(); toast("Usage counters reset"); return push();
    case "usage-consent": setUsage(m.on === "1"); flushUsage(); return push();
    case "usage-test": {
      let ok = false, msg = "";
      if (!usageOn()) msg = "Turn on Share anonymous usage first.";
      else { track("usage_test"); const r = await flushUsage(); ok = !!(r && r.ok); msg = usageStatus() || "Nothing was sent."; }
      return call("__done", m.req, ok, msg);
    }

    // ── Vinted ──
    case "vsignin": { const ok = await vintedSignIn(); toast(ok ? `Signed in to ${siteOf()}` : `Not signed in to ${siteOf()} yet`); return push(); }
    case "vcheck": { const ok = await vintedCheck(); toast(ok ? `Signed in to ${siteOf()}` : `Not signed in to ${siteOf()}`); return push(); }
    case "openvinted": {
      const u = String(m.v || "");
      if (!u.startsWith(vBase() + "/")) return;
      const w = new WebView(); await w.loadURL(u); await w.present(true);
      return;
    }

    // ── photos in ──
    case "import": {   // the page has the picked photos resized; take them one by one
      const list = [];
      for (let i = 0; i < Math.min(+m.n || 0, 40); i++) {
        let p = null;
        try { p = JSON.parse(await ev("window.__impTake ? window.__impTake() : 'null'", 30000) || "null"); } catch (e) { startLog("import: " + (e.message || e)); }
        if (!p) break;
        list.push(p);
      }
      await addPhotos(list, m.target || "", ["camera", "library", "share"].includes(m.source) ? m.source : "library");
      return call("onImported", list.length);
    }
    case "batchsort": return sortBatch();
    case "batchmake": {
      if (!batch) return push();
      const ids = new Set(batch.photos.map(p => p.id));
      const groups = (Array.isArray(m.groups) ? m.groups : []).map(g => (Array.isArray(g) ? g : []).filter(id => ids.has(id))).filter(g => g.length);
      return finishBatch(groups.length ? groups : batch.groups);
    }
    case "batchcancel": clearBatch(); return push();

    // ── one item ──
    case "notes": if (it) { it.notes = clip(m.v, 1000); write("items", items); } return;
    case "field": {
      if (!it) return;
      const L = it.listing = it.listing || {}, k = String(m.k || ""), v = m.v;
      if (k === "title") { L.title = clip(v, 100); L.titleSet = true; }
      else if (k === "description") { L.description = clip(v, 3000); L.descSet = true; }
      else if (k === "price") { const n = Number(String(v).replace(",", ".").replace(/[^0-9.]/g, "")); L.price = n > 0 ? Number(n.toFixed(2)) : null; L.priceSet = true; }
      else if (k === "conditionId") { L.conditionId = +v || null; L.condSet = true; }
      else if (k === "packageSizeId") { L.packageSizeId = +v || null; L.parcelSet = true; }
      else if (k === "colorIds") { L.colorIds = (Array.isArray(v) ? v : []).map(Number).filter(Boolean).slice(0, 2); L.colorSet = true; }
      else if (k.startsWith("attr:")) {
        const code = k.slice(5), a = ((it.opts || {}).attrs || []).find(x => x.code === code);
        if (!a) return;
        const ids = (Array.isArray(v) ? v : [v]).map(Number).filter(id => a.options.some(o => o.id === id)).slice(0, a.multi ? a.limit : 1);
        L.attrs = L.attrs || {}; L.attrs[code] = ids; L.attrSet = Object.assign({}, L.attrSet, { [code]: true });
      } else return;
      if (it.status === "new" && L.title) it.status = "ready";
      write("items", items); return push();
    }
    case "photouse": { const p = it && it.photos.find(x => x.id === m.pid); if (p && p.clean) { p.use = m.v === "clean" ? "clean" : "orig"; write("items", items); push(); } return; }
    case "photomove": {
      if (!it) return;
      const i = it.photos.findIndex(x => x.id === m.pid), j = i + (+m.v || 0);
      if (i < 0 || j < 0 || j >= it.photos.length) return;
      const [p] = it.photos.splice(i, 1); it.photos.splice(j, 0, p);
      write("items", items); return push();
    }
    case "photorm": {
      if (!it) return;
      for (const k of ["", "t", "clean", "ct"]) { const f = photoFile(it.id, m.pid, k); try { if (fm.fileExists(f)) fm.remove(f); } catch (e) {} delete thumbCache[f]; }
      it.photos = it.photos.filter(x => x.id !== m.pid);
      write("items", items); return push();
    }
    case "prepare": return prepare(m.id, { reclean: !!m.reclean });
    case "clean": return prepare(m.id, { reclean: true, read: false });
    case "fill": {
      if (!it || busy[it.id]) return;
      const step = stepper(it.id);
      try { if (!settings.vintedOk && !(await vintedCheck())) throw new Error("Sign in to Vinted first (Settings › Vinted)."); await fitVinted(it, step); it.err = ""; }
      catch (e) { it.err = clip(e.message || e, 200); }
      delete busy[it.id]; write("items", items); return push();
    }
    case "post": return postItem(m.id, !!m.draft);
    case "catsearch": {
      let res = [];
      try { res = await catSearch(String(m.q || "").split(/[,;]+/).map(s => s.trim()).filter(Boolean).concat(String(m.q || "")), 25); }
      catch (e) { toast(String(e.message || e).slice(0, 90)); }
      return call("onCats", m.id, res);
    }
    case "catpick": {
      if (!it) return;
      const L = it.listing = it.listing || {};
      L.catalogId = +m.v; L.catalogPath = catPath(+m.v) || m.path || ""; L.catSet = true;
      it.opts = it.opts || {};
      try { await loadCatFields(it); if (!L.priceSet && L.conditionId) { it.opts.price = await vPrice(L.catalogId, L.brandId, L.conditionId, it.opts.imageId ? [it.opts.imageId] : []); } }
      catch (e) { toast(String(e.message || e).slice(0, 90)); }
      write("items", items); return push();
    }
    case "brandsearch": {
      let res = [];
      try { res = await vBrands(String(m.q || "").slice(0, 60), it && it.listing && it.listing.catalogId); } catch (e) { toast(String(e.message || e).slice(0, 90)); }
      return call("onBrands", m.id, res);
    }
    case "brandpick": {
      if (!it) return;
      const L = it.listing = it.listing || {};
      L.brandId = m.bid ? +m.bid : null; L.brandTitle = clip(m.title || "", 60); L.brandSet = true;
      write("items", items); return push();
    }
    case "delitem": if (it) { removeItemFiles(it.id); items = items.filter(x => x !== it); write("items", items); push(); saveWidget(widgetSnapshot()); } return;
  }
}

function buildWebView() {
  wv = new WebView();
  wv.shouldAllowRequest = req => {
    const u = req.url || "";
    if (u.startsWith(SCHEME)) {
      let m = {};
      try { m = JSON.parse(decodeURIComponent(u.split("?d=")[1] || "%7B%7D")); } catch (e) {}
      handle(m).catch(e => toast(String(e.message || e)));
      return false;
    }
    if (/^https?:/i.test(u)) { Safari.openInApp(u, false); return false; }
    return true;
  };
}

function clientApp() {
  let S = window.__INIT;
  const look = { theme: S.settings.theme || "auto", density: S.settings.density || "comfortable", font: S.settings.font || "sans", textSize: +S.settings.textSize || 1 };
  let tab = S.settings.tab === "posted" ? "posted" : "todo";
  let openId = null, cfgOpen = false, cfgArmed = false, aiOpen = false, aiArmed = null, armed = null, batchOpen = !!S.batch;
  let importTarget = "", tray = 0, importing = 0, panel = null;   // panel: "cat" or "brand", open inside the item sheet
  let catRes = null, brandRes = null, brandQ = "", catQ = "";
  let bg = null, bgSig = "", bgPick = null;   // the batch's groups as you arrange them
  const aiLoading = new Set();
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const PN = { anthropic: "Claude", openai: "OpenAI" };
  const FEAT = { listing: "Listings from photos", vinted: "Vinted fields", sort: "Sorting photos into items", cleanup: "Photo cleanup", test: "Connection tests", other: "Other" };
  const byId = id => S.items.find(x => x.id === id);

  // ---- appearance (app-blueprints · settings, Step 3) ----
  const THEMES = [["auto", "Auto"]].concat(Object.keys(S.palettes).map(k => [k, k[0].toUpperCase() + k.slice(1)]));
  const dark = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : { matches: false };
  function applyLook() {
    const root = document.documentElement;
    root.dataset.theme = look.theme === "auto" ? (dark.matches ? "night" : "ink") : look.theme;
    root.dataset.font = look.font;
    root.style.setProperty("--ts", look.textSize);
    document.body.classList.remove("d-comfortable", "d-compact", "d-tiny");
    document.body.classList.add("d-" + look.density);
  }
  const onDark = () => { if (look.theme === "auto") applyLook(); };
  if (dark.addEventListener) dark.addEventListener("change", onDark); else if (dark.addListener) dark.addListener(onDark);
  const segRow = (k, opts) => `<div class="seg wide">${opts.map(([v, l]) => `<button class="${String(look[k]) === String(v) ? "on" : ""}" data-act="look" data-k="${k}" data-v="${v}">${l}</button>`).join("")}</div>`;
  function lookHTML() {
    return `
      <div class="lk-row"><span class="lk-l">Colours</span><div class="sws">${THEMES.map(t => `
        <button class="sw ${look.theme === t[0] ? "on" : ""}" data-act="look" data-k="theme" data-v="${t[0]}" aria-label="${t[1]} colours">
          <span class="prev" style="${t[0] === "auto" ? `background:linear-gradient(135deg,${S.palettes.ink.paper} 50%,${S.palettes.night.sheet} 50%);color:${S.palettes.night.signal}` : `background:${S.palettes[t[0]].paper};color:${S.palettes[t[0]].ink}`}">Aa<i style="background:${(S.palettes[t[0]] || S.palettes.night).signal}"></i></span>
          <small>${t[1]}</small></button>`).join("")}</div></div>
      <div class="lk-row"><span class="lk-l">Layout</span>${segRow("density", [["comfortable", "Comfortable"], ["compact", "Compact"], ["tiny", "Tiny"]])}</div>
      <div class="lk-row"><span class="lk-l">Text size</span>${segRow("textSize", [[0.92, "Small"], [1, "Default"], [1.12, "Large"], [1.25, "Larger"]])}</div>
      <div class="lk-row"><span class="lk-l">Headline font</span>${segRow("font", [["sans", "Sans serif"], ["serif", "Serif"]])}</div>`;
  }

  // ---- bridge → Scriptable (queued so rapid taps aren't lost) ----
  const q = []; let flushing = false;
  const pending = {}; let reqN = 0;
  function send(type, data, cb) {
    const m = Object.assign({ type }, data);
    if (cb) { m.req = "r" + (++reqN); pending[m.req] = cb; }
    q.push(m); if (!flushing) flush();
  }
  window.__done = (req, ok, msg) => { const cb = pending[req]; delete pending[req]; if (cb) cb(ok, msg); };
  function flush() {
    const m = q.shift();
    if (!m) { flushing = false; return; }
    flushing = true;
    location.href = "vintly://a?d=" + encodeURIComponent(JSON.stringify(m));
    setTimeout(flush, 80);
  }

  // ── AI invitation (app-blueprints · ai-invitation) ── ES5, no backticks: this sits inside the page's template string.
  window.__aiInvite = function (c) {
    var tries = 0;
    (function wait() {
      // Never over the launch screen, another sheet, or a task the app says can't be interrupted.
      var busy = document.querySelector("#splash:not(.gone)") || document.getElementById("upd") || document.getElementById("aiinv") ||
        document.querySelector(".sheet.open, #cfgsheet.open, #aisheet.open") || (window.canInvite && !window.canInvite());
      if (busy) { if (++tries < 40) setTimeout(wait, 500); return; }   // gives up after 20 s; it comes back another day
      setTimeout(function () { if (!document.getElementById("aiinv")) showInvite(c); }, 600);
    })();
  };
  window.canInvite = () => !importing && !tray && !Object.values(S.items).some(x => x.busy);   // not while photos come in or an item is being prepared
  function escI(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]; }); }
  function showInvite(c) {
    var el = document.createElement("div");
    el.id = "aiinv";
    el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-labelledby", "aiinv-t");
    el.innerHTML = '<div class="aiinv-card">' +
      '<div class="aiinv-spark" aria-hidden="true">✦</div>' +
      '<h2 id="aiinv-t">' + escI(c.title) + '</h2>' +
      '<p class="aiinv-lead">Add an AI key and these switch on:</p>' +
      '<ul class="aiinv-perks">' + c.perks.slice(0, 3).map(function (p, i) {
        return '<li style="--i:' + i + '"><span class="aiinv-ico" aria-hidden="true">' + escI(p.icon) + '</span>' + escI(p.text) + '</li>';
      }).join("") + '</ul>' +
      '<ol class="aiinv-steps"><li>Get a key from Claude or OpenAI</li><li>Paste it in AI settings</li><li>That’s it: these turn on at once</li></ol>' +
      '<button class="aiinv-go" data-inv="open">Turn on AI</button>' +
      '<div class="aiinv-row"><button class="aiinv-later" data-inv="later">Later</button>' +
      '<button class="aiinv-never" data-inv="never">Don’t remind me again</button></div></div>';
    el.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-inv]") : null;
      if (!b && e.target !== el) return;      // taps inside the card do nothing
      closeInvite(b ? b.dataset.inv : "later");   // a tap on the dimmed backdrop counts as Later
    });
    document.body.appendChild(el);
    send("aiinvite", { v: "shown" });
    var go = el.querySelector(".aiinv-go"); if (go && go.focus) go.focus();
  }
  function closeInvite(what) {
    var el = document.getElementById("aiinv"); if (!el || el.classList.contains("out")) return;
    el.classList.add("out");
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 260);
    send("aiinvite", { v: what });
    if (what === "open") setTimeout(function () {
      window.__aiOpen();   // the same thing the Settings row's "aiopen" action does
      // The Add key of the provider in use: its card is the one marked .active (never "the first button", which
      // is the wrong provider in any app whose sheet doesn't put the provider in use first).
      var add = document.querySelector('#aisheet .aicard.active [data-act="aikey"]') || document.querySelector('#aisheet [data-act="aikey"]');
      if (add) { add.classList.add("aiinv-nudge"); if (add.scrollIntoView) add.scrollIntoView({ block: "center" }); setTimeout(function () { add.classList.remove("aiinv-nudge"); }, 2600); }
    }, 280);
  }
  window.__aiOpen = function () { aiOpen = true; renderAI(); };

  // ---- bridge ← Scriptable ----
  window.recv = st => {
    S = st; aiLoading.clear();
    if (S.batch && !bg) batchOpen = true;
    if (!S.batch) { bg = null; bgSig = ""; batchOpen = false; }
    if (openId && !byId(openId)) openId = null;
    renderAll(); renderUsageAsk();
  };
  window.toast = msg => {
    const t = $("#toast"); t.textContent = msg; t.classList.add("on");
    clearTimeout(window.__tt); window.__tt = setTimeout(() => t.classList.remove("on"), 3600);
  };
  window.openItem = id => { openId = id; panel = null; renderItem(); $("#itemsheet").scrollTop = 0; };
  window.onBusy = (id, b) => { const x = byId(id); if (x) { x.busy = b; render(); if (openId === id) renderItem(); } };
  window.onImported = n => { importing = 0; renderTray(); if (!n) window.toast("No photos came in. Try again."); };
  window.onCats = (id, list) => { if (openId === id) { catRes = list; renderItem(); } };
  window.onBrands = (id, list) => { if (openId === id) { brandRes = list; renderItem(); } };
  // Anonymous usage (app-blueprints · usage-analytics): the one-time question, under the header
  function renderUsageAsk() {
    const slot = document.getElementById("usageslot"); if (!slot) return;
    slot.innerHTML = S.usageAsk ? `<section id="usageask" aria-label="Anonymous usage"><b>Help improve Vintly?</b><p>Share anonymous counts, like app opens and how many items you prepare and post. Never your photos, titles, prices or your Vinted account. You can change this in Settings.</p><div class="uabtns"><button class="sm primary" data-act="usage-yes">Yes, share</button><button class="sm" data-act="usage-no">No thanks</button></div></section>` : "";
  }

  // ── update pitch (app-blueprints · in-app-updates, Step 6) ──
  window.__showUpdate = function (u) {
    if (!u || document.getElementById("upd")) return;
    var ov = document.createElement("div"); ov.id = "upd";
    var cards = (u.highlights || []).map(function (h) {
      return '<div class="updi"><span class="updic">' + escH(h.icon || "✨") + "</span><div><b>" +
        escH(h.title) + "</b><span>" + escH(h.text || "") + "</span></div></div>";
    }).join("");
    var more = u.skipped > 1 ? " (and " + (u.skipped - 1) + " more update" + (u.skipped > 2 ? "s" : "") + ")" : "";
    ov.innerHTML = '<div class="updp" role="dialog" aria-label="Update available">' +
      '<div class="updtag">New version ' + escH(u.latest) + "</div>" +
      '<h2 class="updt">' + escH(u.title || "An update is ready") + "</h2>" +
      '<div class="upds">You have ' + escH(u.current) + more + ". Here’s what you get:</div>" +
      '<div class="updl">' + cards + "</div>" +
      '<div class="updmsg" aria-live="polite"></div>' +
      '<button class="primary updgo" data-act="upd-now">Update now</button>' +
      '<button class="updlater" data-act="upd-later">Later, remind me in 2 days</button></div>';
    document.body.appendChild(ov);
    ov.addEventListener("click", function (e) { if (e.target === ov) updLater(); });   // outside = Later
  };
  function escH(t) { var d = document.createElement("div"); d.textContent = String(t == null ? "" : t); return d.innerHTML; }
  function updLater() { var ov = document.getElementById("upd"); if (!ov) return; ov.remove(); send("update-later", {}); }
  function updNow(btn) {
    var ov = document.getElementById("upd"), msg = ov.querySelector(".updmsg"), later = ov.querySelector(".updlater");
    btn.disabled = true; btn.textContent = "Updating…"; later.hidden = true; msg.textContent = "";
    send("update-now", {}, function (ok, res) {
      if (ok) {
        ov.querySelector(".updtag").textContent = "Updated to " + res;
        msg.innerHTML = "<b>✓ Done.</b> Close Vintly and open it again to start using the new version.";
        btn.disabled = false; btn.textContent = "Got it"; btn.dataset.act = "upd-close";
      } else {
        msg.textContent = res || "Update failed"; btn.disabled = false; btn.textContent = "Try again"; later.hidden = false;
      }
    });
  }

  // ---- photos on the page's canvas: resizing what you pick, and cutting the item out ----
  const loadImg = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error("A photo couldn't be read")); i.src = src; });
  const canvas = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
  const b64of = (c, type, qual) => c.toDataURL(type || "image/jpeg", qual || 0.9).split(",")[1];
  function shrink(src, max) {
    const w = src.naturalWidth || src.width, h = src.naturalHeight || src.height, s = Math.min(1, max / Math.max(w, h));
    const c = canvas(w * s, h * s), x = c.getContext("2d");
    x.imageSmoothingQuality = "high"; x.drawImage(src, 0, 0, c.width, c.height);
    return c;
  }
  window.__imp = [];
  window.__impTake = () => JSON.stringify(window.__imp.shift() || null);
  async function takeFiles(files, source) {
    const list = Array.from(files || []).slice(0, 40);
    if (!list.length) return;
    importing = list.length; renderTray();
    let n = 0;
    for (const f of list) {
      try {
        const url = URL.createObjectURL(f), img = await loadImg(url), c = shrink(img, S.cfg.photoMax);
        window.__imp.push({ b64: b64of(c, "image/jpeg", 0.9), t: b64of(shrink(c, 360), "image/jpeg", 0.8), w: c.width, h: c.height });
        URL.revokeObjectURL(url); n++;
      } catch (e) {}
    }
    if (source === "camera" && !importTarget) { tray += n; importing = 0; renderTray(); return; }   // more photos may follow
    send("import", { n, target: importTarget, source });
  }
  window.__scale = async (b64, max) => ({ b64: b64of(shrink(await loadImg("data:image/jpeg;base64," + b64), max), "image/jpeg", 0.85) });
  // The photo on the image model's canvas (its sizes are fixed), with grey bars, so the drawing lines up with the photo.
  window.__letterbox = async (b64, cw, ch) => {
    const img = await loadImg("data:image/jpeg;base64," + b64), W = img.naturalWidth, H = img.naturalHeight, s = Math.min(cw / W, ch / H);
    const c = canvas(cw, ch), x = c.getContext("2d");
    x.fillStyle = "#7f7f7f"; x.fillRect(0, 0, cw, ch);
    x.imageSmoothingQuality = "high"; x.drawImage(img, (cw - W * s) / 2, (ch - H * s) / 2, W * s, H * s);
    return { b64: b64of(c, "image/jpeg", 0.92) };
  };
  function dilate(a, w, h, r) {   // grows the white area by r pixels (a square max filter, in two passes)
    const t = new Uint8Array(w * h), o = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      let last = -1e9; for (let x = 0; x < w; x++) { if (a[y * w + x]) last = x; if (x - last <= r) t[y * w + x] = 1; }
      let next = 1e9; for (let x = w - 1; x >= 0; x--) { if (a[y * w + x]) next = x; if (next - x <= r) t[y * w + x] = 1; }
    }
    for (let x = 0; x < w; x++) {
      let last = -1e9; for (let y = 0; y < h; y++) { if (t[y * w + x]) last = y; if (y - last <= r) o[y * w + x] = 1; }
      let next = 1e9; for (let y = h - 1; y >= 0; y--) { if (t[y * w + x]) next = y; if (next - y <= r) o[y * w + x] = 1; }
    }
    return o;
  }
  function boxBlur(a, w, h, r) {   // a mean filter of radius r (two passes with running sums): 0…1 back
    const t = new Float32Array(w * h), o = new Float32Array(w * h), n = 2 * r + 1;
    for (let y = 0; y < h; y++) {
      let sum = 0; const row = y * w;
      for (let x = -r; x <= r; x++) sum += a[row + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) { t[row + x] = sum / n; sum += a[row + Math.min(w - 1, x + r + 1)] - a[row + Math.max(0, x - r)]; }
    }
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let y = -r; y <= r; y++) sum += t[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) { o[y * w + x] = sum / n; sum += t[Math.min(h - 1, y + r + 1) * w + x] - t[Math.max(0, y - r) * w + x]; }
    }
    return o;
  }
  // The item, cut from the ORIGINAL photo along the drawn mask (or the studio drawing itself), centred on white.
  window.__cutout = async (origB64, drawnB64, o) => {
    const img = await loadImg("data:image/jpeg;base64," + origB64), out = await loadImg("data:image/png;base64," + drawnB64);
    const W = img.naturalWidth, H = img.naturalHeight, s = Math.min(o.cw / W, o.ch / H), dw = W * s, dh = H * s, ox = (o.cw - dw) / 2, oy = (o.ch - dh) / 2;
    const kx = out.naturalWidth / o.cw, ky = out.naturalHeight / o.ch;   // in case the drawing came back at another size
    if (o.studio) {
      const c = canvas(W, H); c.getContext("2d").drawImage(out, ox * kx, oy * ky, dw * kx, dh * ky, 0, 0, W, H);
      const f = shrink(c, o.max);
      return { b64: b64of(f, "image/jpeg", 0.9), t: b64of(shrink(f, 360), "image/jpeg", 0.8) };
    }
    const ws = Math.min(1, 1024 / Math.max(W, H)), mw = Math.round(W * ws), mh = Math.round(H * ws);
    const mc = canvas(mw, mh), mx = mc.getContext("2d");
    mx.drawImage(out, ox * kx, oy * ky, dw * kx, dh * ky, 0, 0, mw, mh);
    const px = mx.getImageData(0, 0, mw, mh).data;
    let a = new Uint8Array(mw * mh), on = 0;
    for (let i = 0; i < mw * mh; i++) { const l = px[i * 4] * 0.3 + px[i * 4 + 1] * 0.59 + px[i * 4 + 2] * 0.11; a[i] = l > 128 ? 1 : 0; on += a[i]; }
    const cover = on / (mw * mh);
    if (cover < 0.01) throw new Error("The item wasn't found in the photo");
    if (cover > 0.97) throw new Error("The item couldn't be told apart from the background");
    const r = Math.round(o.grow * ws);
    if (r > 0) a = dilate(a, mw, mh, r);
    // Where the item is: rows and columns with more than a speck of white
    const rows = new Uint32Array(mh), cols = new Uint32Array(mw);
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) if (a[y * mw + x]) { rows[y]++; cols[x]++; }
    const lim = Math.max(2, Math.round(Math.min(mw, mh) * 0.004));
    let x0 = 0, x1 = mw - 1, y0 = 0, y1 = mh - 1;
    while (x0 < x1 && cols[x0] < lim) x0++; while (x1 > x0 && cols[x1] < lim) x1--;
    while (y0 < y1 && rows[y0] < lim) y0++; while (y1 > y0 && rows[y1] < lim) y1--;
    // A soft edge: the mask blurred over the margin, so the margin fades out instead of ending in a hard line
    const soft = boxBlur(a, mw, mh, Math.max(1, r));
    const am = canvas(mw, mh), ax = am.getContext("2d"), id = ax.createImageData(mw, mh);
    for (let i = 0; i < mw * mh; i++) id.data[i * 4 + 3] = Math.round(Math.max(0, Math.min(1, (soft[i] - 0.5) * 2)) * 255);   // full at the item's own edge, gone at the margin's
    ax.putImageData(id, 0, 0);
    const item = canvas(W, H), ix = item.getContext("2d");
    ix.imageSmoothingQuality = "high"; ix.drawImage(am, 0, 0, W, H);
    ix.globalCompositeOperation = "source-in"; ix.drawImage(img, 0, 0);
    // Centred on white with room around it, in the photo's own shape
    const bx = x0 / ws, by = y0 / ws, bw = (x1 - x0 + 1) / ws, bh = (y1 - y0 + 1) / ws, cx = bx + bw / 2, cy = by + bh / 2, m = o.margin / 100;
    let fw = bw * (1 + 2 * m), fh = bh * (1 + 2 * m);
    if (fw / fh < W / H) fw = fh * W / H; else fh = fw * H / W;
    const f = Math.min(o.max / Math.max(fw, fh), 2);
    const fc = canvas(fw * f, fh * f), fx = fc.getContext("2d");
    fx.fillStyle = "#ffffff"; fx.fillRect(0, 0, fc.width, fc.height);
    fx.imageSmoothingQuality = "high"; fx.drawImage(item, cx - fw / 2, cy - fh / 2, fw, fh, 0, 0, fc.width, fc.height);
    return { b64: b64of(fc, "image/jpeg", 0.9), t: b64of(shrink(fc, 360), "image/jpeg", 0.8), cover };
  };

  // ---- numbers and time ----
  function money(v) {
    if (v == null || !isFinite(v)) return "—";
    try { return new Intl.NumberFormat(undefined, { style: "currency", currency: S.vinted.cur || "EUR", maximumFractionDigits: v % 1 ? 2 : 0 }).format(v); }
    catch (e) { return v + " " + (S.vinted.cur || ""); }
  }
  function rel(ts) {
    if (!ts) return "never";
    const m = Math.round((Date.now() - ts) / 60000);
    if (m < 1) return "just now"; if (m < 60) return m + " min ago";
    const h = Math.round(m / 60); if (h < 24) return h + " h ago";
    const d = Math.round(h / 24); return d === 1 ? "yesterday" : d < 7 ? d + " days ago" : new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  function lockBody() { document.body.classList.toggle("locked", !!(openId || cfgOpen || aiOpen || (batchOpen && S.batch))); }
  function arm2(key, rerender) { armed = key; rerender(); setTimeout(() => { if (armed === key) { armed = null; rerender(); } }, 3500); }

  // ---- the main page ----
  const todo = () => S.items.filter(x => x.status !== "posted"), posted = () => S.items.filter(x => x.status === "posted");
  function renderAll() { renderTop(); render(); renderItem(); renderBatch(); renderTray(); renderAI(); renderCfg(); }
  function renderTop() {
    $("#status").innerHTML = S.vinted.ok ? `Signed in to ${esc(S.vinted.site)}` : `<button class="link small" data-act="vsignin">Sign in to ${esc(S.vinted.site)}</button>`;
    $("#tabs").innerHTML = [["todo", "To post", todo().length], ["posted", "Posted", posted().length]]
      .map(([k, l, n]) => `<button class="${tab === k ? "on" : ""}" data-act="tab" data-v="${k}">${l} <span class="n">${n}</span></button>`).join("");
  }
  function statusOf(x) {
    if (x.busy) return ["busy", "Working…"];
    if (x.status === "posted") return x.vinted && x.vinted.draft ? ["done", "Draft on Vinted"] : ["done", "On Vinted"];
    if (x.err) return ["warn", "Needs a look"];
    if (!x.missing.length) return ["ok", "Ready to post"];
    if (x.ai) return ["ai", "✦ Prepared"];
    return ["new", x.photos.length + (x.photos.length === 1 ? " photo" : " photos")];
  }
  const thumb = p => p.use === "clean" && p.ct ? p.ct : p.t;
  function card(x) {
    const L = x.listing || {}, [k, st] = statusOf(x), th = x.photos.filter(p => thumb(p)).slice(0, 3);
    const title = L.title || (x.ai && x.ai.what) || x.hint || "New item";
    return `<button class="card" data-act="open" data-v="${x.id}">
      <span class="thumbs">${th.length ? th.map(p => `<img src="${thumb(p)}" alt="">`).join("") : x.cover ? `<img src="${x.cover}" alt="">` : `<i class="noimg"></i>`}${x.photos.length > 3 ? `<em>+${x.photos.length - 3}</em>` : ""}</span>
      <span class="c-b"><b class="c-t">${esc(title)}</b><small class="muted">${x.status === "posted" && x.vinted ? (x.vinted.draft ? "Saved " : "Posted ") + rel(x.vinted.at) : L.catalogPath ? esc(L.catalogPath.split(" › ").slice(-1)[0]) : "Added " + rel(x.created)}</small>
        <span class="chip st-${k}">${st}</span></span>
      <span class="c-p">${L.price ? money(L.price) : ""}</span></button>`;
  }
  function render() {
    const main = $("#main");
    if (tab === "posted") {
      const list = posted();
      main.innerHTML = list.length ? `<div class="cards">${list.map(card).join("")}</div><p class="note center">Posted items are kept here for ${S.cfg.keepPostedDays} days.</p>`
        : `<div class="empty small">Nothing posted yet. Items you post on Vinted show up here.</div>`;
      return;
    }
    const list = todo();
    const add = `<div class="addbar"><button class="primary" data-act="cam"><svg class="ico" viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>Take photos</button>
      <button class="sm big2" data-act="lib"><svg class="ico" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 16l5-5 4 4 3-3 4 4"/></svg>Choose photos</button></div>`;
    const signin = S.vinted.ok ? "" : `<div class="banner"><b>Sign in to Vinted</b><span>Vintly posts with your own ${esc(S.vinted.site)} account. Sign in once, inside Vintly.</span><button class="sm primary" data-act="vsignin">Sign in</button></div>`;
    if (!list.length) {
      main.innerHTML = `${signin}<div class="empty"><svg class="empty-mark" viewBox="0 0 240 240" aria-hidden="true">${window.__LOGO}</svg>
        <h2>Snap it. List it.</h2><p>Take photos of things you no longer need, a few of each. Vintly sorts them into items, ${S.settings.canClean ? "cleans the photos, " : ""}writes each listing and posts it on Vinted when you say so.</p>${add}
        ${S.settings.hasKey ? "" : `<p class="note">Without an AI key you fill in the listing yourself. Add one in Settings › AI settings.</p>`}</div>`;
      return;
    }
    main.innerHTML = `${signin}${add}<div class="cards">${list.map(card).join("")}</div>`;
  }
  function renderTray() {
    const el = $("#tray");
    if (importing) { el.hidden = false; el.innerHTML = `<span class="busy-dot"></span><b>Bringing in ${importing} photo${importing === 1 ? "" : "s"}…</b>`; return; }
    if (!tray) { el.hidden = true; el.innerHTML = ""; return; }
    el.hidden = false;
    el.innerHTML = `<b>📷 ${tray} photo${tray === 1 ? "" : "s"}</b><button class="sm" data-act="cam">Take another</button><button class="sm primary" data-act="traydone">Done</button>`;
  }

  // ---- a batch of new photos: which photos are which item ----
  function syncBatch() {
    if (!S.batch) return;
    const sig = JSON.stringify(S.batch.groups);
    if (sig !== bgSig) { bg = S.batch.groups.map(g => g.slice()); bgSig = sig; bgPick = null; }
  }
  function renderBatch() {
    const el = $("#batchsheet");
    syncBatch();
    el.classList.toggle("open", !!(batchOpen && S.batch)); lockBody();
    if (!(batchOpen && S.batch)) return;
    const B = S.batch, tOf = id => (B.photos.find(p => p.id === id) || {}).t || "";
    el.innerHTML = `<div class="sh-head"><h2>New photos</h2><button class="link" data-act="batchcancel">Cancel</button></div><div class="sh-body">
      <p class="hint">${B.photos.length} photos. Each group below becomes one item. Tap a photo, then tap the item it belongs to.</p>
      ${B.sorting ? `<div class="working"><span class="busy-dot"></span>✦ Sorting your photos into items…</div>` : ""}
      ${bg.map((g, i) => `<div class="grp-item ${bgPick ? "can" : ""}" data-act="bgto" data-v="${i}"><div class="gi-h"><b>Item ${i + 1}</b>${B.names[i] && B.by ? `<span class="badge-ai">✦ ${esc(B.names[i])}</span>` : ""}<small class="muted">${g.length} photo${g.length === 1 ? "" : "s"}</small></div>
        <div class="gi-ph">${g.map(id => `<img src="${tOf(id)}" class="${bgPick === id ? "pick" : ""}" data-act="bgpick" data-v="${id}" alt="">`).join("")}</div></div>`).join("")}
      ${bgPick ? `<button class="grp-item new can" data-act="bgto" data-v="new">+ A new item</button>` : ""}
      <div class="aic-btns">${S.settings.hasKey ? `<button class="sm" data-act="batchsort" ${B.sorting ? "disabled" : ""}>✦ Sort with AI</button>` : ""}
        <button class="sm" data-act="bgall">All one item</button><button class="sm" data-act="bgeach">One item per photo</button></div>
      <button class="primary wide" data-act="batchmake" ${B.sorting ? "disabled" : ""}>Add ${bg.filter(g => g.length).length} item${bg.filter(g => g.length).length === 1 ? "" : "s"}</button>
    </div>`;
  }

  // ---- one item ----
  function priceNote(x) {
    const P = x.opts.price, A = x.ai, parts = [];
    if (P) parts.push(`Vinted suggests ${money(P.low)}–${money(P.high)}`);
    if (A && A.priceUsed) parts.push(`usually sells for about ${money(A.priceUsed)}${A.priceNew ? ` (new ${money(A.priceNew)})` : ""}`);
    if (parts.length) parts.push(`yours is ${S.cfg.priceBelowPct}% under`);
    return parts.join(" · ");
  }
  function busyHTML(b) {
    return `<div class="steps">${b.steps.map(s => `<div class="step ${s.done ? "done" : ""}">${s.done ? "✓" : `<span class="busy-dot"></span>`}<span>${esc(s.t)}</span></div>`).join("")}
      ${b.p ? `<div class="bar"><i style="width:${Math.round(b.p * 100)}%"></i></div>` : ""}</div>`;
  }
  function photosHTML(x) {
    if (x.status === "posted") return x.cover ? `<div class="strip"><div class="ph"><img src="${x.cover}" alt=""></div></div>` : "";
    return `<div class="strip">${x.photos.map((p, i) => `<div class="ph">
        <img src="${thumb(p) || ""}" alt="Photo ${i + 1}">${i === 0 ? `<span class="ph-main">Main</span>` : ""}
        ${p.clean ? `<div class="seg mini"><button class="${p.use === "clean" ? "on" : ""}" data-act="phuse" data-p="${p.id}" data-v="clean">${p.studio ? "✦ Studio" : "Clean"}</button><button class="${p.use !== "clean" ? "on" : ""}" data-act="phuse" data-p="${p.id}" data-v="orig">Original</button></div>`
          : p.err ? `<small class="ph-err" title="${esc(p.err)}">Not cleaned</small>` : ""}
        <div class="ph-tools"><button data-act="phmove" data-p="${p.id}" data-v="-1" aria-label="Earlier" ${i ? "" : "disabled"}>‹</button>
          <button data-act="phmove" data-p="${p.id}" data-v="1" aria-label="Later" ${i < x.photos.length - 1 ? "" : "disabled"}>›</button>
          <button class="${armed === "rm" + p.id ? "armed" : ""}" data-act="phrm" data-p="${p.id}" aria-label="Remove photo">${armed === "rm" + p.id ? "✓" : "×"}</button></div></div>`).join("")}
      ${x.photos.length < S.cfg.maxPhotos ? `<button class="ph add" data-act="addcam"><b>📷</b><small>Take</small></button><button class="ph add" data-act="addlib"><b>＋</b><small>Choose</small></button>` : ""}</div>`;
  }
  function attrHTML(x, a) {
    const L = x.listing, sel = ((L.attrs || {})[a.code] || []).map(Number);
    if (a.multi || a.options.length <= 6) return `<div class="fl"><span>${esc(a.title)}${a.required ? "" : ` <small class="muted">optional</small>`}</span>
      <div class="chips">${a.options.slice(0, 60).map(o => `<button class="chipb ${sel.includes(o.id) ? "on" : ""}" data-act="attrchip" data-code="${esc(a.code)}" data-v="${o.id}">${esc(o.title)}</button>`).join("")}</div></div>`;
    let lastG = null;
    return `<label class="fl"><span>${esc(a.title)}${a.required ? "" : ` <small class="muted">optional</small>`}</span>
      <select class="fsel" data-k="attr:${esc(a.code)}"><option value="">Choose…</option>${a.options.map(o => {
        const g = o.group !== lastG ? (lastG !== null ? "</optgroup>" : "") + (o.group ? `<optgroup label="${esc(o.group)}">` : "") : ""; lastG = o.group;
        return g + `<option value="${o.id}" ${sel.includes(o.id) ? "selected" : ""}>${esc(o.title)}</option>`;
      }).join("")}${lastG ? "</optgroup>" : ""}</select></label>`;
  }
  function fieldsHTML(x) {
    const L = x.listing || {}, O = x.opts, cond = (O.attrs || []).find(a => a.code === "condition");
    const condOpts = cond ? cond.options : S.conditions.map(c => ({ id: c.id, title: c.en }));
    const leaf = L.catalogPath ? L.catalogPath.split(" › ").slice(-1)[0] : "";
    const catPanel = panel === "cat" ? `<div class="pick"><div class="field"><input id="catq" value="${esc(catQ)}" placeholder="Search Vinted's categories" enterkeyhint="search"><button class="sm" data-act="catgo">Search</button></div>
      ${(catRes || O.cats || []).map(c => `<button class="srow" data-act="catpick" data-v="${c.id}"><div class="grow"><b>${esc(c.path.split(" › ").slice(-1)[0])}</b><small class="muted">${esc(c.path)}${c.vinted ? " · Vinted's guess" : ""}</small></div></button>`).join("") || `<p class="note">Type what it is, e.g. “toy”, “dress”, “sneakers”.</p>`}</div>` : "";
    const brandPanel = panel === "brand" ? `<div class="pick"><div class="field"><input id="brandq" value="${esc(brandQ)}" placeholder="Brand name" enterkeyhint="search"><button class="sm" data-act="brandgo">Search</button></div>
      ${(brandRes || []).map(b => `<button class="srow" data-act="brandpick" data-v="${b.id}" data-t="${esc(b.title)}"><div class="grow"><b>${esc(b.title)}</b></div></button>`).join("")}
      ${brandQ.trim() ? `<button class="srow" data-act="brandpick" data-v="" data-t="${esc(brandQ.trim())}"><div class="grow"><b>Use “${esc(brandQ.trim())}”</b><small class="muted">As you wrote it, when Vinted doesn't list the brand</small></div></button>` : ""}
      <button class="srow" data-act="brandpick" data-v="" data-t=""><div class="grow"><b>No brand</b></div></button></div>` : "";
    return `
      <label class="fl"><span>Title <small class="muted">${(L.title || "").length}/100</small></span><input class="fin" data-k="title" value="${esc(L.title || "")}" maxlength="100" placeholder="What it is, brand, a key detail"></label>
      <label class="fl"><span>Description</span><textarea class="fin" data-k="description" rows="9" placeholder="What it is, its condition, what's included">${esc(L.description || "")}</textarea></label>
      <label class="fl"><span>Price</span><div class="pricebox"><input class="fin" data-k="price" value="${L.price || ""}" inputmode="decimal" placeholder="0"><b>${esc(S.vinted.cur)}</b></div>
        ${priceNote(x) ? `<small class="note">${esc(priceNote(x))}</small>` : ""}${x.ai && x.ai.priceWhy ? `<small class="note">✦ ${esc(x.ai.priceWhy)}</small>` : ""}</label>
      <div class="fl"><span>Category</span><div class="fld"><div class="grow"><b>${leaf ? esc(leaf) : `<span class="muted">Not chosen</span>`}</b>${L.catalogPath ? `<small class="muted">${esc(L.catalogPath)}</small>` : ""}</div>
        <button class="sm" data-act="catopen">${panel === "cat" ? "Close" : "Change"}</button></div>${catPanel}</div>
      <div class="fl"><span>Brand</span><div class="fld"><div class="grow"><b>${L.brandTitle ? esc(L.brandTitle) : `<span class="muted">No brand</span>`}</b>${L.brandTitle && !L.brandId ? `<small class="muted">Not in Vinted's list; sent as written</small>` : ""}</div>
        <button class="sm" data-act="brandopen">${panel === "brand" ? "Close" : "Change"}</button></div>${brandPanel}</div>
      <label class="fl"><span>Condition</span><select class="fsel" data-k="conditionId"><option value="">Choose…</option>${condOpts.map(o => `<option value="${o.id}" ${+L.conditionId === o.id ? "selected" : ""}>${esc(o.title)}</option>`).join("")}</select></label>
      ${(O.attrs || []).filter(a => a.code !== "condition").map(a => attrHTML(x, a)).join("")}
      ${S.colors.length ? `<div class="fl"><span>Colours <small class="muted">up to 2</small></span><div class="chips">${S.colors.map(c => `<button class="chipb col ${(L.colorIds || []).includes(c.id) ? "on" : ""}" data-act="color" data-v="${c.id}"><i style="background:#${esc(c.hex)}"></i>${esc(c.title)}</button>`).join("")}</div></div>` : ""}
      <div class="fl"><span>Parcel size</span><div class="seg wide">${(O.parcels || []).map(p => `<button class="${+L.packageSizeId === p.id ? "on" : ""}" data-act="parcel" data-v="${p.id}">${esc(p.title)}</button>`).join("")}</div>
        ${(O.parcels || []).find(p => p.id === +L.packageSizeId && p.hint) ? `<small class="note">${esc(O.parcels.find(p => p.id === +L.packageSizeId).hint)}</small>` : ""}</div>`;
  }
  function renderItem() {
    const el = $("#itemsheet"), keep = el.scrollTop;
    const x = openId && byId(openId);
    el.classList.toggle("open", !!x); lockBody();
    if (!x) return;
    const ae = document.activeElement;
    if (ae && el.contains(ae) && /INPUT|TEXTAREA|SELECT/.test(ae.tagName)) { const b = $("#itembusy"); if (b) b.innerHTML = x.busy ? busyHTML(x.busy) : ""; return; }   // never rebuild under your typing
    const L = x.listing || {}, posted2 = x.status === "posted", miss = x.missing;
    const canPost = !x.busy && S.vinted.ok && !miss.length;
    el.innerHTML = `<div class="sh-head"><h2>${esc(clip2(L.title || (x.ai && x.ai.what) || x.hint || "New item", 26))}</h2><button class="link" data-act="close">Done</button></div><div class="sh-body">
      ${photosHTML(x)}
      ${posted2 ? `<div class="banner ok"><b>${x.vinted.draft ? "Saved as a draft on Vinted" : "On Vinted"} · ${rel(x.vinted.at)}</b><button class="sm primary" data-act="openvinted" data-v="${esc(x.vinted.url)}">${x.vinted.draft ? "Finish it on Vinted" : "Open on Vinted"}</button></div>` : `
      <label class="fl"><span>Anything AI should know? <small class="muted">optional</small></span><textarea class="fin" data-k="notes" rows="2" placeholder="e.g. works fine, the stick is missing, age 3+">${esc(x.notes)}</textarea></label>
      ${S.settings.hasKey ? `<button class="primary wide ai" data-act="prepare" ${x.busy ? "disabled" : ""}>✦ ${x.ai ? "Prepare again" : "Prepare with AI"}</button>
        <small class="note center">${S.settings.canClean ? "Cleans the photos, then " : ""}reads the photos, writes the listing and fills Vinted's fields${x.ai ? ". Fields you changed are kept" : ""}.</small>`
        : `<button class="sm wide" data-act="fill" ${x.busy || !S.vinted.ok ? "disabled" : ""}>Load Vinted's fields</button><small class="note center"><span class="badge-ex">no AI</span> Fill in the listing yourself, or add a key in Settings › AI settings.</small>`}
      ${S.settings.canClean && x.photos.some(p => p.clean) && !x.busy ? `<button class="link small block" data-act="reclean">Clean the photos again</button>` : ""}`}
      <div id="itembusy">${x.busy ? busyHTML(x.busy) : ""}</div>
      ${x.err ? `<p class="err">${esc(x.err)}</p>` : ""}
      ${x.ai ? `<p class="ailbl"><span class="badge-ai">✦ AI listing by ${esc(x.ai.by)}</span>${x.ai.confidence && x.ai.confidence < 0.6 ? ` <span class="muted small">not sure; check it</span>` : ""}${x.ai.flaws && x.ai.flaws.length ? `<small class="muted">Wear seen: ${esc(x.ai.flaws.join("; "))}</small>` : ""}</p>` : ""}
      ${posted2 ? `<p class="hint">${esc(L.title || "")} · ${money(L.price)}</p>` : fieldsHTML(x)}
      ${posted2 ? "" : `${miss.length ? `<p class="miss">Still needed: ${esc(miss.join(", "))}</p>` : ""}
      <button class="primary wide post ${armed === "post" + x.id ? "armed" : ""}" data-act="post" ${canPost ? "" : "disabled"}>${armed === "post" + x.id ? "Tap again to post on Vinted" : "Post on Vinted"}</button>
      <button class="sm wide" data-act="draft" ${!x.busy && S.vinted.ok && L.title && x.photos.length ? "" : "disabled"}>Save as a Vinted draft</button>
      ${S.vinted.ok ? "" : `<p class="note center">Posting needs you signed in to Vinted. <button class="link small" data-act="vsignin">Sign in</button></p>`}`}
      <button class="sm wide danger ${armed === "del" + x.id ? "armed" : ""}" data-act="delitem">${armed === "del" + x.id ? "Confirm: delete from Vintly" : posted2 ? "Remove from Vintly" : "Delete item"}</button>
      ${posted2 ? `<p class="note center">Removing it here doesn't touch the listing on Vinted.</p>` : ""}
    </div>`;
    el.scrollTop = keep;
  }
  const clip2 = (s, n) => { s = String(s || ""); return s.length > n ? s.slice(0, n - 1) + "…" : s; };

  // ---- Settings (app-blueprints · settings) ----
  const cfgItem = k => { for (const sec of S.cfgSchema) for (const d of sec.items) if (d.k === k) return d; return null; };
  const cfgChanged = k => { const d = cfgItem(k); return d && JSON.stringify(S.cfg[k]) !== JSON.stringify(d.def); };
  const fmtCfg = (d, v) => d.step && d.step < 1 ? Number(v).toFixed(String(d.step).split(".")[1].length) : String(v);
  const bpLink = b => `${S.blueprintsRepo}/blob/${b.id}-v${b.version}/blueprints/${b.id}.md`;   // the exact version the app follows
  function builtWithHTML() {
    return `<h3 class="sec">Built with</h3>
      <p class="hint">${esc(S.appName)} is built from shared blueprints that its other apps use too. Tap one to read how that part works.</p>
      ${S.blueprints.map(b => `<button class="srow bp" data-act="openurl" data-v="${esc(bpLink(b))}">
        <div class="grow"><b>${esc(b.name)}</b><small class="muted">Blueprint ${esc(b.version)} · since ${esc(S.appName)} ${esc(b.since)}</small></div><span class="chev" aria-hidden="true">›</span></button>`).join("")}
      <button class="srow bp" data-act="openurl" data-v="${esc(S.blueprintsRepo)}">
        <div class="grow"><b>All blueprints</b><small class="muted">${esc(S.blueprintsRepo.replace("https://", ""))}</small></div><span class="chev" aria-hidden="true">›</span></button>`;
  }
  const sw = (k, label, help) => `<div class="srow"><div class="grow"><b>${label}</b><small class="muted">${help}</small></div><button class="switch ${S.settings[k] ? "on" : ""}" data-act="toggle" data-v="${k}" aria-label="${label}"></button></div>`;
  // Settings blueprint 1.1.0: each section's rows in one card (.grp), built right after every render.
  function cardSections(body) {
    if (!body) return;
    var inSec = false, grp = null, kids = Array.prototype.slice.call(body.children);
    kids.forEach(function (n) {
      var c = n.classList;
      if (n.tagName === "H3" && c.contains("sec")) { inSec = true; grp = null; return; }
      if (!inSec || c.contains("grp") || c.contains("cfg-foot")) { grp = null; return; }
      if (!grp && n.tagName === "P" && c.contains("hint")) return;
      if (!grp) { grp = document.createElement("div"); grp.className = "grp"; body.insertBefore(grp, n); }
      grp.appendChild(n);
    });
  }
  const fmtN = n => n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : n >= 1e4 ? Math.round(n / 1e3) + "k" : n >= 1e3 ? (n / 1e3).toFixed(1) + "k" : String(n);
  function renderCfg() {
    const el = $("#cfgsheet"), keepTop = el.scrollTop;
    el.classList.toggle("open", cfgOpen); lockBody();
    if (!cfgOpen) return;
    const field = d => {
      const v = S.cfg[d.k], ch = cfgChanged(d.k);
      const reset = ch ? `<button class="link small" data-act="cfgreset" data-k="${d.k}">Reset</button>` : "";
      const head = `<div class="cfg-h"><b>${esc(d.label)}</b>${reset}</div>${d.help ? `<small class="muted">${esc(d.help)}</small>` : ""}`;
      if (d.type === "text") return `<div class="cfg ${ch ? "ch" : ""}">${head}<input class="cfgin wide" data-k="${d.k}" value="${esc(v)}" autocapitalize="off" autocorrect="off" spellcheck="false"></div>`;
      if (d.type === "lines") return `<div class="cfg ${ch ? "ch" : ""}">${head}<textarea class="cfgin wide" data-k="${d.k}" rows="${Math.max(4, v.length + 1)}">${esc(v.join("\n"))}</textarea></div>`;
      const unit = d.unit || (/^price/.test(d.k) && d.k !== "priceBelowPct" ? S.vinted.cur : "");
      return `<div class="cfg ${ch ? "ch" : ""}">${head}
        <div class="stepper"><button data-act="cfgstep" data-k="${d.k}" data-v="-1" aria-label="Decrease" ${v <= d.min ? "disabled" : ""}>−</button>
        <input class="cfgin" data-k="${d.k}" value="${fmtCfg(d, v)}" inputmode="decimal" aria-label="${esc(d.label)}">
        <button data-act="cfgstep" data-k="${d.k}" data-v="1" aria-label="Increase" ${v >= d.max ? "disabled" : ""}>+</button>
        <span class="unit">${esc(unit)}</span><span class="range">${fmtCfg(d, d.min)}–${fmtCfg(d, d.max)}${ch ? ` — original ${fmtCfg(d, d.def)}` : ""}</span></div></div>`;
    };
    const changed = Object.keys(S.cfg).filter(cfgChanged).length;
    const A = S.ai, Pu = A.usage.p[A.provider];
    const langOpts = (cur, none) => (none ? `<option value="" ${!cur ? "selected" : ""}>None</option>` : "") + Object.entries(S.langs).map(([k, l]) => `<option value="${k}" ${cur === k ? "selected" : ""}>${l}</option>`).join("");
    el.innerHTML = `<div class="sh-head"><h2>Settings</h2><button class="link" data-act="cfgclose">Done</button></div><div class="sh-body">
      <p class="hint">Changes apply right away and are kept on this iPhone.</p>
      <h3 class="sec">Appearance</h3>${lookHTML()}
      <h3 class="sec">Vinted</h3>
      <div class="srow"><div class="grow"><b>Vinted site</b><small class="muted">Where your items are posted; categories, sizes and the currency follow it</small></div>
        <select id="siteSel" class="cursel" aria-label="Vinted site">${S.sites.map(([k, c, cur]) => `<option value="${k}" ${S.settings.vintedSite === k ? "selected" : ""}>${k} · ${c}</option>`).join("")}</select></div>
      <div class="srow"><div class="grow"><b>Your Vinted account</b><small class="muted">${S.vinted.ok ? `Signed in to ${esc(S.vinted.site)}${S.vinted.at ? ", checked " + rel(S.vinted.at) : ""}` : `Not signed in. Sign in with e-mail, Apple or Facebook; Google doesn't allow signing in inside apps.`}</small></div>
        <button class="sm ${S.vinted.ok ? "" : "primary"}" data-act="vsignin">${S.vinted.ok ? "Switch" : "Sign in"}</button>${S.vinted.ok ? `<button class="sm" data-act="vcheck">Check</button>` : ""}</div>
      ${sw("removePhotosAfter", "Remove photos after posting", "Frees space on your iPhone; Vinted keeps the listing's photos")}
      <h3 class="sec">Listings</h3>
      <div class="srow"><div class="grow"><b>Written in</b><small class="muted">Titles and descriptions</small></div><select id="langSel" class="cursel" aria-label="Language">${langOpts(S.settings.lang)}</select></div>
      <div class="srow"><div class="grow"><b>And also in</b><small class="muted">A second language under the first, for buyers from abroad</small></div><select id="lang2Sel" class="cursel" aria-label="Second language">${langOpts(S.settings.lang2, true)}</select></div>
      ${sw("bothTitles", "Both languages in the title", "Like “Medinis labirintas / Wooden maze”")}
      ${sw("humour", "A little humour", "One light, friendly joke per description. Off: plain and friendly")}
      <div class="srow"><div class="grow"><b>Keys, models and token usage</b><small class="muted">${S.settings.hasKey
        ? `${PN[A.provider]} — ${esc(A.model[A.provider])}${Pu ? " — " + fmtN(Pu.in + Pu.out) + " tokens used" : ""}`
        : "Add a Claude or OpenAI key for listings written from your photos"}</small></div>
        <button class="sm ${S.settings.hasKey ? "" : "primary"}" data-act="aiopen">AI settings</button></div>
      <h3 class="sec">Photos</h3>
      <div class="lk-row"><span class="lk-l">Cleaning photos</span><div class="seg wide">${[["keep", "Keep the item's pixels"], ["studio", "✦ Studio photo"], ["off", "Off"]].map(([v, l]) => `<button class="${S.settings.cleanStyle === v ? "on" : ""}" data-act="clean" data-v="${v}">${l}</button>`).join("")}</div>
        <small class="muted">${S.settings.cleanStyle === "studio" ? "The image model redraws each photo on white. Sharp and tidy, but drawn by AI: Vinted is told so." : S.settings.cleanStyle === "off" ? "Photos are posted as you took them." : "The image model outlines the item; Vintly cuts your own photo along it and puts it on white. The item stays exactly as photographed."}
        ${A.hasOpenAI ? "" : ` <span class="danger">Needs an OpenAI key (AI settings).</span>`}</small></div>
      ${S.usageAvailable ? `<h3 class="sec">Privacy</h3>
      <div class="srow"><div class="grow"><b>Share anonymous usage</b><small class="muted">Counts like app opens and how many items you prepare and post, with a random install ID. Never your photos, titles, prices or your Vinted account. Off removes the ID.</small></div><button class="switch ${S.settings.shareUsage ? "on" : ""}" data-act="toggle" data-v="shareUsage" aria-label="Share anonymous usage"></button></div>
      <div class="srow"><div class="grow"><b>Test the connection</b><small id="usagemsg" class="muted" aria-live="polite">${esc(S.usageStatus || "Sends one test event now and shows PostHog’s answer.")}</small></div><button class="sm" data-act="usage-test">Send test</button></div>` : ""}
      <h3 class="sec">Updates</h3>
      <div class="srow"><div class="grow"><b>Offer new versions</b><small class="muted">You have Vintly ${esc(S.version)}. “Later” waits two days.</small></div><button class="switch ${S.settings.checkUpdates ? "on" : ""}" data-act="toggle" data-v="checkUpdates" aria-label="Offer new versions"></button></div>
      <div class="srow"><div class="grow"><b>Check for updates now</b><small id="updmsg" class="muted" aria-live="polite"></small></div><button class="sm" data-act="updcheck">Check</button></div>
      <div class="srow"><div class="grow"><b>Start-up log</b><small class="muted">What happened the last times Vintly opened</small></div><button class="sm" data-act="startlog">Show</button></div>
      <pre id="startlog" class="startlog" hidden></pre>
      ${S.cfgSchema.map(sec => `<h3 class="sec">${esc(sec.title)}</h3>${sec.items.map(field).join("")}`).join("")}
      <div class="aic-btns cfg-foot"><span class="note">${changed ? changed + " setting" + (changed === 1 ? "" : "s") + " changed" : "All settings are at their original values"}</span>
        ${changed ? `<button class="sm danger ${cfgArmed ? "armed" : ""}" data-act="cfgall">${cfgArmed ? "Confirm reset" : "Reset all"}</button>` : ""}</div>
      ${builtWithHTML()}
    </div>`;
    cardSections(el.querySelector(".sh-body"));   // Settings 1.1.0: one card per section
    el.scrollTop = keepTop;   // re-renders must not jump the user back to the top
  }

  // ---- AI settings (app-blueprints · ai-configuration, Step 7) ----
  function arm(key) { aiArmed = key; renderAI(); setTimeout(() => { if (aiArmed === key) { aiArmed = null; renderAI(); } }, 3500); }
  function usageBlock(p, P) {
    const days = [], now = new Date();
    for (let i = 13; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - i);
      days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`); }
    const tot = k => { const x = P.days[k]; return x ? x.in + x.out : 0; };
    const max = Math.max(1, ...days.map(tot)), month = S.ai.today.slice(0, 7);
    const monthTot = Object.entries(P.days).filter(([k]) => k.startsWith(month)).reduce((n, [, x]) => n + x.in + x.out, 0);
    const rows = (obj, label) => Object.entries(obj).sort((x, y) => (y[1].in + y[1].out) - (x[1].in + x[1].out))
      .map(([k, x]) => `<tr><td>${esc(label(k))}</td><td>${x.calls}</td><td>${fmtN(x.in)}</td><td>${fmtN(x.out)}</td></tr>`).join("");
    return `<div class="ucard"><div class="aic-h"><b>${PN[p]}</b><span class="muted small">${P.calls} request${P.calls === 1 ? "" : "s"}</span></div>
      <div class="ustat"><div><b>${fmtN(P.in + P.out)}</b><small>total tokens</small></div><div><b>${fmtN(P.in)}</b><small>input</small></div><div><b>${fmtN(P.out)}</b><small>output</small></div></div>
      <p class="note">Today ${fmtN(tot(S.ai.today))} tokens — this month ${fmtN(monthTot)} tokens</p>
      <div class="ubars" aria-label="Tokens per day, last 14 days">${days.map(k => `<span style="height:${Math.max(tot(k) ? 6 : 2, tot(k) / max * 100)}%" class="${tot(k) ? "" : "zero"}" title="${k}: ${tot(k)} tokens"></span>`).join("")}</div>
      <div class="ubars-l"><span>2 weeks ago</span><span>Today</span></div>
      <table class="utab"><tr><th>Feature</th><th>Requests</th><th>In</th><th>Out</th></tr>${rows(P.features, k => FEAT[k] || k)}</table>
      <table class="utab"><tr><th>Model</th><th>Requests</th><th>In</th><th>Out</th></tr>${rows(P.models, k => k)}</table></div>`;
  }
  function renderAI() {
    const el = document.getElementById("aisheet"), keep = el.scrollTop;
    el.classList.toggle("open", aiOpen); lockBody();
    if (!aiOpen) return;
    const A = S.ai;
    const card2 = p => {
      const key = A.keys[p], ml = (A.models[p] || {}).list || [], cur = A.model[p];
      const opts = ml.some(m => m.id === cur) ? ml : [{ id: cur, name: cur }].concat(ml);   // keep the chosen model visible
      return `<div class="aicard ${A.provider === p ? "active" : ""}">
        <div class="aic-h"><b>${PN[p]}</b>${A.provider === p ? `<span class="badge-ai">In use</span>` : key ? `<button class="sm" data-act="aiprov" data-v="${p}">Use ${PN[p]}</button>` : ""}</div>
        <div class="aic-row"><span class="lbl">API key</span>${key ? `<code>${esc(key)}</code>` : `<span class="muted">Not set</span>`}</div>
        <div class="aic-btns"><button class="sm ${key ? "" : "primary"}" data-act="aikey" data-v="${p}">${key ? "Change key" : "Add key"}</button>
          ${key ? `<button class="sm" data-act="aitest" data-v="${p}">Test connection</button><button class="sm danger ${aiArmed === "rm" + p ? "armed" : ""}" data-act="airm" data-v="${p}">${aiArmed === "rm" + p ? "Confirm" : "Remove"}</button>` : ""}</div>
        <label class="aic-row lbl" for="ms-${p}">Model</label>
        <select id="ms-${p}" class="modelsel" data-p="${p}">${opts.map(m => `<option value="${esc(m.id)}" ${m.id === cur ? "selected" : ""}>${esc(m.name)}${m.name !== m.id ? " — " + esc(m.id) : ""}</option>`).join("")}</select>
        <div class="aic-btns"><button class="sm" data-act="aimodels" data-v="${p}" ${key && !aiLoading.has(p) ? "" : "disabled"}>${aiLoading.has(p) ? "Loading…" : ml.length ? "Refresh model list" : "Load my models"}</button>
          <span class="note">${ml.length ? `${ml.length} models, updated ${rel(A.models[p].at)}` : key ? "Loads the models your key can use" : "Add a key to load models"}</span></div>
      </div>`;
    };
    const order = A.provider === "openai" ? ["openai", "anthropic"] : ["anthropic", "openai"];
    const used = Object.keys(A.usage.p).filter(p => A.usage.p[p].calls);
    const iml = ((A.imageModels || {}).list || []), imOpts = iml.some(m => m.id === A.imageModel) ? iml : [{ id: A.imageModel, name: A.imageModel }].concat(iml);
    el.innerHTML = `<div class="sh-head"><h2>AI</h2><button class="link" data-act="aiclose">Done</button></div><div class="sh-body">
      <p class="hint">Keys stay in this iPhone's Keychain. Only the provider marked “In use” is called. Cleaning photos always uses OpenAI's image model.</p>
      ${order.map(card2).join("")}
      <h3 class="sec">What AI does</h3>
      <div class="srow"><div class="grow"><b>Sort new photos into items</b><small class="muted">When you add several photos at once; one request per batch. Off: they become one item, and you sort them.</small></div>
        <button class="switch ${S.settings.ai ? "on" : ""}" data-act="toggle" data-v="ai" aria-label="Sort new photos into items"></button></div>
      <div class="srow"><div class="grow"><b>Clean photo backgrounds</b><small class="muted">${A.hasOpenAI ? "One OpenAI image request per photo, when you prepare an item." : "Needs an OpenAI key, even when Claude writes the listings."} The style is in Settings › Photos.</small></div>
        <button class="switch ${S.settings.aiClean ? "on" : ""}" data-act="toggle" data-v="aiClean" aria-label="Clean photo backgrounds"></button></div>
      ${A.hasOpenAI ? `<label class="aic-row lbl" for="imgsel">Image model</label><select id="imgsel" class="modelsel">${imOpts.map(m => `<option value="${esc(m.id)}" ${m.id === A.imageModel ? "selected" : ""}>${esc(m.name)}</option>`).join("")}</select>
        <p class="note">${iml.length ? "From your OpenAI key's models." : "Load your OpenAI models above to see the others."}</p>` : ""}
      <h3 class="sec">Token usage</h3>
      ${used.length ? used.map(p => usageBlock(p, A.usage.p[p])).join("") : `<p class="muted pad">No AI requests yet.</p>`}
      ${used.length ? `<div class="aic-btns"><span class="note">Counting since ${new Date(A.usage.since).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</span>
        <button class="sm danger ${aiArmed === "reset" ? "armed" : ""}" data-act="usagereset">${aiArmed === "reset" ? "Confirm reset" : "Reset counters"}</button></div>` : ""}
    </div>`;
    el.scrollTop = keep;   // re-renders must not jump the user back to the top
  }

  // ---- taps ----
  const pickLib = $("#pickLib"), pickCam = $("#pickCam");
  pickLib.addEventListener("change", e => { const f = e.target.files; takeFiles(f, "library").then(() => { pickLib.value = ""; }); });
  pickCam.addEventListener("change", e => { const f = e.target.files; takeFiles(f, "camera").then(() => { pickCam.value = ""; }); });
  document.addEventListener("click", e => {
    if (e.target.closest("select, option, input, textarea")) return;   // form controls handle themselves
    const t = e.target.closest("[data-act]");
    if (!t || t.disabled) return;
    const act = t.dataset.act, v = t.dataset.v, x = openId && byId(openId);
    switch (act) {
      case "tab": tab = v; send("set", { k: "tab", v }); renderTop(); render(); window.scrollTo(0, 0); break;
      case "cam": importTarget = ""; pickCam.click(); break;
      case "lib": importTarget = ""; pickLib.click(); break;
      case "addcam": importTarget = openId || ""; pickCam.click(); break;
      case "addlib": importTarget = openId || ""; pickLib.click(); break;
      case "traydone": if (tray) { importing = tray; send("import", { n: tray, target: "", source: "camera" }); tray = 0; renderTray(); } break;
      case "vsignin": send("vsignin", {}); break;
      case "vcheck": send("vcheck", {}); break;
      case "open": openId = v; panel = null; catRes = null; brandRes = null; renderItem(); $("#itemsheet").scrollTop = 0; break;
      case "close": openId = null; panel = null; renderItem(); render(); break;
      case "prepare": send("prepare", { id: openId }); break;
      case "reclean": send("clean", { id: openId }); break;
      case "fill": send("fill", { id: openId }); break;
      case "phuse": send("photouse", { id: openId, pid: t.dataset.p, v }); break;
      case "phmove": send("photomove", { id: openId, pid: t.dataset.p, v: +v }); break;
      case "phrm": if (armed === "rm" + t.dataset.p) { armed = null; send("photorm", { id: openId, pid: t.dataset.p }); } else arm2("rm" + t.dataset.p, renderItem); break;
      case "catopen": panel = panel === "cat" ? null : "cat"; catRes = null; renderItem(); break;
      case "catgo": { const qi = $("#catq"); catQ = qi ? qi.value : catQ; if (catQ.trim()) send("catsearch", { id: openId, q: catQ }); break; }
      case "catpick": panel = null; send("catpick", { id: openId, v: +v }); break;
      case "brandopen": panel = panel === "brand" ? null : "brand"; brandRes = null; brandQ = x && x.listing.brandTitle || ""; renderItem(); break;
      case "brandgo": { const qi = $("#brandq"); brandQ = qi ? qi.value : brandQ; if (brandQ.trim()) send("brandsearch", { id: openId, q: brandQ }); renderItem(); break; }
      case "brandpick": panel = null; send("brandpick", { id: openId, bid: v || "", title: t.dataset.t || "" }); break;
      case "attrchip": {
        if (!x) break;
        const code = t.dataset.code, a = (x.opts.attrs || []).find(y => y.code === code), id = +v;
        let ids = ((x.listing.attrs || {})[code] || []).map(Number);
        ids = ids.includes(id) ? ids.filter(y => y !== id) : a && a.multi ? ids.concat(id).slice(-(a.limit || 1)) : [id];
        x.listing.attrs = Object.assign({}, x.listing.attrs, { [code]: ids }); renderItem();
        send("field", { id: openId, k: "attr:" + code, v: ids }); break;
      }
      case "color": {
        if (!x) break;
        let ids = (x.listing.colorIds || []).map(Number); const id = +v;
        ids = ids.includes(id) ? ids.filter(y => y !== id) : ids.concat(id).slice(-2);
        x.listing.colorIds = ids; renderItem(); send("field", { id: openId, k: "colorIds", v: ids }); break;
      }
      case "parcel": if (x) { x.listing.packageSizeId = +v; renderItem(); send("field", { id: openId, k: "packageSizeId", v: +v }); } break;
      case "post": if (armed === "post" + openId) { armed = null; send("post", { id: openId }); renderItem(); } else arm2("post" + openId, renderItem); break;
      case "draft": send("post", { id: openId, draft: true }); break;
      case "delitem": if (armed === "del" + openId) { armed = null; const id = openId; openId = null; send("delitem", { id }); renderItem(); } else arm2("del" + openId, renderItem); break;
      case "openvinted": send("openvinted", { v }); break;
      case "bgpick": bgPick = bgPick === v ? null : v; renderBatch(); e.stopPropagation(); return;
      case "bgto": {
        if (!bgPick) break;
        bg = bg.map(g => g.filter(id => id !== bgPick));
        if (v === "new") bg.push([bgPick]); else bg[+v].push(bgPick);
        bg = bg.filter(g => g.length); bgPick = null; renderBatch(); break;
      }
      case "bgall": bg = [[].concat(...bg)]; bgPick = null; renderBatch(); break;
      case "bgeach": bg = [].concat(...bg).map(id => [id]); bgPick = null; renderBatch(); break;
      case "batchsort": send("batchsort", {}); break;
      case "batchmake": batchOpen = false; send("batchmake", { groups: bg }); renderBatch(); break;
      case "batchcancel": batchOpen = false; send("batchcancel", {}); renderBatch(); break;
      case "clean": S.settings.cleanStyle = v; send("set", { k: "cleanStyle", v }); renderCfg(); break;
      case "look": {
        const k = t.dataset.k, val = k === "textSize" ? +v : v;
        look[k] = val; send("set", { k, v: val }); applyLook(); render(); renderCfg(); break;
      }
      case "toggle": S.settings[v] = !S.settings[v]; send("set", { k: v, v: S.settings[v] }); renderCfg(); renderAI(); break;
      case "cfgopen": cfgOpen = true; renderCfg(); break;
      case "cfgclose": cfgOpen = false; cfgArmed = false; renderCfg(); break;
      case "cfgreset": { const d = cfgItem(t.dataset.k); S.cfg[d.k] = d.def; send("cfg", { k: d.k, v: null }); renderCfg(); break; }
      case "cfgstep": {
        const d = cfgItem(t.dataset.k), step = d.step || 1;
        const nv = Number(Math.min(d.max, Math.max(d.min, Number(S.cfg[d.k]) + step * +v)).toFixed(2));
        S.cfg[d.k] = nv; send("cfg", { k: d.k, v: nv }); renderCfg(); break;
      }
      case "cfgall":
        if (cfgArmed) { cfgArmed = false; send("cfg", { k: "*" }); }
        else { cfgArmed = true; renderCfg(); setTimeout(() => { if (cfgArmed) { cfgArmed = false; renderCfg(); } }, 3500); }
        break;
      case "startlog": {
        const pre = $("#startlog");
        if (!pre.hidden) { pre.hidden = true; t.textContent = "Show"; break; }
        send("startlog", {}, (ok, txt) => { pre.textContent = txt || "Nothing logged yet."; pre.hidden = false; t.textContent = "Hide"; });
        break;
      }
      case "usage-yes": case "usage-no":
        send("usage-consent", { on: act === "usage-yes" ? "1" : "0" }); S.usageAsk = false; renderUsageAsk();
        window.toast(act === "usage-yes" ? "Thank you! Change it any time in Settings." : "No problem. Nothing is shared.");
        break;
      case "usage-test": {
        const um = $("#usagemsg"); t.disabled = true; if (um) um.textContent = "Sending…";
        send("usage-test", {}, (ok, msg) => { t.disabled = false; const m = $("#usagemsg"); if (m) m.textContent = (ok ? "✓ " : "✗ ") + msg; });
        break;
      }
      case "updcheck": { const m = $("#updmsg"); if (m) m.textContent = "Checking…"; send("updcheck", {}, (ok, msg) => { const mm = $("#updmsg"); if (mm) mm.textContent = msg; }); break; }
      case "openurl": send("openurl", { v }); break;
      case "aiopen": aiOpen = true; renderAI(); break;
      case "aiclose": aiOpen = false; renderAI(); break;
      case "aikey": case "aitest": case "aiprov": send(act, { v }); break;
      case "aimodels": aiLoading.add(v); renderAI(); send("aimodels", { v }); break;
      case "airm": if (aiArmed === "rm" + v) { aiArmed = null; send("airm", { v }); } else arm("rm" + v); break;
      case "usagereset": if (aiArmed === "reset") { aiArmed = null; send("usagereset", {}); } else arm("reset"); break;
      case "upd-now": updNow(t); break;
      case "upd-later": updLater(); break;
      case "upd-close": { const uo = document.getElementById("upd"); if (uo) uo.remove(); break; }
    }
  });
  document.addEventListener("keydown", e => {
    if (e.key !== "Enter") return;
    if (e.target.id === "catq") { e.preventDefault(); catQ = e.target.value; if (catQ.trim()) send("catsearch", { id: openId, q: catQ }); e.target.blur(); }
    if (e.target.id === "brandq") { e.preventDefault(); brandQ = e.target.value; if (brandQ.trim()) send("brandsearch", { id: openId, q: brandQ }); e.target.blur(); }
  });
  document.addEventListener("input", e => {
    if (e.target.id === "catq") catQ = e.target.value;
    if (e.target.id === "brandq") brandQ = e.target.value;
  });
  // Typed values and menus arrive through "change" (when the field loses focus)
  document.addEventListener("change", e => {
    const el = e.target, x = openId && byId(openId);
    if (el.id === "siteSel") { S.settings.vintedSite = el.value; send("set", { k: "vintedSite", v: el.value }); window.toast("Switching to " + el.value + "…"); return; }
    if (el.id === "langSel") { send("set", { k: "lang", v: el.value }); S.settings.lang = el.value; return; }
    if (el.id === "lang2Sel") { send("set", { k: "lang2", v: el.value }); S.settings.lang2 = el.value; return; }
    if (el.id === "imgsel") { send("set", { k: "imageModel", v: el.value }); window.toast("Photos are cleaned with " + el.value); return; }
    if (el.classList && el.classList.contains("fin") && x) {
      const k = el.dataset.k;
      if (k === "notes") { x.notes = el.value; send("notes", { id: openId, v: el.value }); return; }
      x.listing[k] = el.value; send("field", { id: openId, k, v: el.value }); return;
    }
    if (el.classList && el.classList.contains("fsel") && x) { send("field", { id: openId, k: el.dataset.k, v: el.value ? +el.value : "" }); return; }
    if (el.classList && el.classList.contains("modelsel") && el.dataset.p) send("aimodel", { p: el.dataset.p, v: el.value });
    else if (el.classList && el.classList.contains("cfgin") && el.dataset.k) {
      const d = cfgItem(el.dataset.k);
      send("cfg", { k: d.k, v: d.type === "lines" ? el.value.split("\n") : el.value });
    }
  });
  // A field you left: the sheet may redraw now (it waits while you type)
  document.addEventListener("focusout", e => { if (e.target.closest && e.target.closest("#itemsheet")) setTimeout(() => { const ae = document.activeElement; if (!ae || !$("#itemsheet").contains(ae) || !/INPUT|TEXTAREA|SELECT/.test(ae.tagName)) renderItem(); }, 250); });

  applyLook();
  renderAll(); renderUsageAsk();
}

const PALETTE_CSS = Object.entries(PALETTES).map(([k, p]) => `[data-theme=${k}]{--paper:${p.paper};--sheet:${p.sheet};--ink:${p.ink};--ink-2:${p.ink2};--muted:${p.muted};--rule:${p.rule};--signal:${p.signal};--signal-wash:${p.signalWash};--amber:${p.amber};--amber-wash:${p.amberWash};--danger:${p.danger};color-scheme:${p.scheme}}`).join("\n");
const CSS = `
:root{
  --ts:1; --serif: ui-serif, "New York", Georgia, serif; --sans: -apple-system, system-ui, "SF Pro Text", sans-serif; --display: var(--sans);
  --t:19px; --d:16px; --m:13.5px; --pad:16px; --num: ui-rounded, -apple-system, system-ui, sans-serif;
}
html[data-font=serif]{--display:var(--serif)}
${PALETTE_CSS}
body.d-compact{--t:16.5px;--d:14.5px;--m:12.5px;--pad:11px}
body.d-tiny{--t:15.5px;--d:14px;--m:12px;--pad:8px}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--sans);font-size:calc(16px * var(--ts));line-height:1.5;-webkit-text-size-adjust:100%}
body.locked{overflow:hidden}
button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}
button.primary,.primary{background:var(--signal);color:var(--paper);border-radius:10px;padding:11px 16px;font-weight:600;font-size:calc(15px * var(--ts))}
button.sm.primary{padding:6px 11px;font-size:calc(13px * var(--ts));border-color:var(--signal)}
button[disabled]{opacity:.5}
.muted{color:var(--muted)} .small{font-size:calc(13px * var(--ts))} .pad{padding:8px 2px} .grow{flex:1;min-width:0} .center{text-align:center}
.danger{color:var(--danger)}
.note{display:block;font-size:calc(12.5px * var(--ts));color:var(--muted);margin:6px 0 0}
.block{display:block;margin:8px auto 0}
.wide{display:flex;align-items:center;justify-content:center;width:100%;margin-top:12px}
.ico{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;vertical-align:-3px;margin-right:7px;flex:none}

/* header */
#top{position:sticky;top:0;z-index:5;background:var(--paper);padding:calc(env(safe-area-inset-top) + 10px) 16px 0;border-bottom:1px solid var(--rule)}
.tb{display:flex;justify-content:space-between;align-items:center;gap:10px}
.brand{display:flex;align-items:center;gap:9px;margin:0;font:800 calc(24px * var(--ts))/1 var(--display);letter-spacing:-.02em}
.brand-mark{width:30px;height:30px;border-radius:7px;background:#0E1116;flex:none}
.brand .x{color:var(--signal)}
.status{font-size:calc(12.5px * var(--ts));color:var(--muted);margin-top:4px;min-height:1.2em}
.tb-a{display:flex;gap:6px}
.icon{width:40px;height:40px;border-radius:20px;display:grid;place-items:center;background:var(--sheet);border:1px solid var(--rule)}
.icon svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.tabs{display:flex;gap:18px;margin-top:10px}
.tabs button{padding:9px 2px 10px;font-weight:600;font-size:calc(14.5px * var(--ts));color:var(--muted);border-bottom:2.5px solid transparent;white-space:nowrap}
.tabs button.on{color:var(--ink);border-bottom-color:var(--signal)}
.tabs .n{font-weight:500;font-size:calc(12px * var(--ts));color:var(--muted)}
main{padding:12px 14px 30px;max-width:720px;margin:0 auto}
.ver{text-align:center;font-size:calc(12px * var(--ts));color:var(--muted);margin:10px 0 calc(env(safe-area-inset-bottom) + 90px)}

/* the list */
.addbar{display:flex;gap:10px;margin:6px 0 14px}
.addbar .primary{flex:1.2;display:flex;align-items:center;justify-content:center;padding:13px 12px}
.addbar .big2{flex:1;display:flex;align-items:center;justify-content:center;font-size:calc(15px * var(--ts));font-weight:600;padding:12px;border-radius:10px}
.banner{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;background:var(--amber-wash);border:1px solid var(--rule);border-radius:14px;padding:12px 14px;margin:6px 0 14px}
.banner b{flex-basis:100%;font-size:calc(15px * var(--ts))}
.banner span{flex:1;min-width:0;font-size:calc(13.5px * var(--ts));color:var(--ink-2)}
.banner.ok{background:var(--signal-wash)}
.cards{display:flex;flex-direction:column;gap:10px}
.card{display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:var(--sheet);border:1px solid var(--rule);border-radius:14px;padding:var(--pad)}
.thumbs{position:relative;display:flex;flex:none}
.thumbs img,.thumbs .noimg{width:58px;height:72px;object-fit:cover;border-radius:9px;border:2px solid var(--sheet);background:var(--paper);display:block}
.thumbs img+img{margin-left:-34px}
.thumbs em{position:absolute;right:-4px;bottom:-4px;font:700 calc(11px * var(--ts))/1 var(--num);font-style:normal;background:var(--ink);color:var(--paper);border-radius:8px;padding:3px 6px}
.c-b{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.c-t{font:600 calc(var(--d) * var(--ts))/1.3 var(--display);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.c-b small{font-size:calc(var(--m) * var(--ts));white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.c-p{font:700 calc(17px * var(--ts))/1 var(--num);flex:none}
.chip{align-self:flex-start;font-size:calc(11.5px * var(--ts));font-weight:700;padding:2px 8px;border-radius:6px;background:var(--paper);color:var(--ink-2)}
.chip.st-ok{color:var(--signal);background:var(--signal-wash)} .chip.st-ai{color:var(--signal);background:var(--signal-wash)}
.chip.st-warn{color:var(--amber);background:var(--amber-wash)} .chip.st-busy{color:var(--ink);background:var(--amber-wash)} .chip.st-done{color:var(--muted)}
body.d-tiny .thumbs img,body.d-tiny .thumbs .noimg{width:44px;height:54px}
.empty{text-align:center;padding:30px 12px}
.empty.small{padding:30px 10px;color:var(--muted)}
.empty h2{font:800 calc(24px * var(--ts))/1.2 var(--display);margin:14px 0 8px}
.empty p{color:var(--ink-2);margin:0 0 18px}
.empty-mark{width:84px;height:84px;border-radius:20px;background:#0E1116}
#tray{position:fixed;left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom) + 12px);z-index:9;display:flex;align-items:center;gap:10px;background:var(--sheet);border:1px solid var(--rule);border-radius:16px;padding:10px 12px;box-shadow:0 10px 30px rgba(0,0,0,.18)}
#tray b{flex:1;font-size:calc(15px * var(--ts))}
#tray[hidden]{display:none}

/* sheets (app-blueprints · settings) */
.sheet{position:fixed;inset:0;z-index:10;background:var(--paper);transform:translateY(102%);transition:transform .28s ease;overflow-y:auto;-webkit-overflow-scrolling:touch}
.sheet.open{transform:none}
#itemsheet{z-index:11} #batchsheet{z-index:12} #cfgsheet{z-index:13}
.sh-head{position:sticky;top:0;z-index:2;background:var(--paper);display:flex;justify-content:space-between;align-items:center;gap:12px;padding:calc(env(safe-area-inset-top) + 14px) 18px 12px;border-bottom:1px solid var(--rule)}
.sh-head h2{font:700 calc(24px * var(--ts))/1.1 var(--display);margin:0;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sh-body{padding:16px 18px calc(env(safe-area-inset-bottom) + 40px);max-width:720px;margin:0 auto}
.link{color:var(--signal);font-weight:600;font-size:16px}
.link.small{font-size:calc(14px * var(--ts))}
.hint{font-size:calc(13px * var(--ts));color:var(--muted);margin:8px 2px 0}
.sec{font:700 calc(17px * var(--ts))/1.2 var(--display);margin:26px 0 6px}
.srow{display:flex;align-items:center;gap:8px;padding:11px 0;border-bottom:1px solid var(--rule)}
button.srow{width:100%;text-align:left}
.grow b{display:block;font-weight:600}
.grow small{display:block;font-size:calc(13px * var(--ts));color:var(--ink-2)}
.switch{width:46px;height:28px;border-radius:14px;background:var(--rule);position:relative;flex:none;transition:background .2s}
.switch::after{content:"";position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:11px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .2s}
.switch.on{background:var(--signal)}
.switch.on::after{transform:translateX(18px)}
.sm{font-size:calc(13px * var(--ts));padding:6px 11px;border-radius:8px;border:1px solid var(--rule);background:var(--sheet);white-space:nowrap;flex:none}
.sm.wide{padding:11px;font-size:calc(14.5px * var(--ts));font-weight:600;border-radius:10px}
.danger.armed,.armed{background:var(--danger);color:#fff;border-color:var(--danger)}
.seg{display:flex;border:1px solid var(--rule);border-radius:9px;overflow:hidden;flex:none;background:var(--sheet)}
.seg button{font-size:calc(12.5px * var(--ts));padding:6px 10px;color:var(--ink-2);white-space:nowrap}
.seg button.on{background:var(--ink);color:var(--paper);font-weight:600}
.seg.wide button{flex:1;text-align:center;padding:9px 4px;font-size:calc(13.5px * var(--ts));white-space:normal;line-height:1.2}
.lk-row{margin:10px 0 14px}
.lk-l{display:block;font-size:calc(13px * var(--ts));font-weight:600;color:var(--ink-2);margin-bottom:6px}
.lk-row > small{display:block;margin-top:6px;font-size:calc(12.5px * var(--ts))}
.sws{display:flex;gap:12px;overflow-x:auto;scrollbar-width:none;padding:3px 3px 2px}
.sws::-webkit-scrollbar{display:none}
.sw{display:flex;flex-direction:column;align-items:center;gap:5px;flex:none}
.sw .prev{position:relative;width:50px;height:50px;border-radius:13px;display:grid;place-items:center;border:1px solid rgba(127,127,127,.35);font:700 18px/1 var(--display)}
.sw .prev i{position:absolute;right:6px;bottom:6px;width:9px;height:9px;border-radius:5px}
.sw.on .prev{outline:2.5px solid var(--signal);outline-offset:2px}
.sw small{font-size:12px;color:var(--ink-2)}
.sw.on small{color:var(--ink);font-weight:600}
.cfg{padding:12px 0;border-bottom:1px solid var(--rule)}
.cfg.ch .cfg-h b::after{content:"";display:inline-block;width:7px;height:7px;border-radius:4px;background:var(--signal);margin-left:7px;vertical-align:2px}
.cfg-h{display:flex;justify-content:space-between;align-items:baseline;gap:10px}
.cfg-h b{font-weight:600}
.cfg small{display:block;font-size:calc(13px * var(--ts));margin-top:2px}
.stepper{display:flex;align-items:center;gap:6px;margin-top:8px;flex-wrap:wrap}
.stepper button{width:38px;height:36px;border-radius:9px;border:1px solid var(--rule);background:var(--sheet);font-size:20px;font-weight:600;text-align:center}
.stepper button[disabled]{opacity:.35}
.stepper input{width:86px;text-align:center;font:600 16px var(--sans);padding:7px 6px;border-radius:9px;border:1px solid var(--rule);background:var(--paper);color:var(--ink)}
.stepper .unit{font-size:calc(14px * var(--ts));color:var(--ink-2);min-width:2.5em}
.stepper .range{flex-basis:100%;font-size:calc(12px * var(--ts));color:var(--muted)}
.cfgin.wide{display:block;width:100%;margin-top:8px;font:16px/1.45 var(--sans);padding:9px 11px;border-radius:9px;border:1px solid var(--rule);background:var(--paper);color:var(--ink)}
.cfgin:focus{outline:2px solid var(--signal);outline-offset:-1px}
.cursel{font:16px var(--sans);color:var(--ink);background:var(--paper);border:1px solid var(--rule);border-radius:9px;padding:7px 8px;max-width:48%}
/* Settings blueprint 1.1.0: sections are cards under small muted capitals */
#cfgsheet h3.sec{font:700 calc(12.5px * var(--ts, 1))/1.2 var(--sans, -apple-system, system-ui, sans-serif);letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:28px 4px 8px}
#cfgsheet .grp{background:var(--sheet);border:1px solid var(--rule);border-radius:16px;padding:0 16px;overflow:hidden}
#cfgsheet .grp>*:last-child{border-bottom:0}
#cfgsheet .grp .lk-row{margin:0;padding:12px 0;border-bottom:1px solid var(--rule)}
#cfgsheet .cfg-foot{margin:10px 4px 0}
.srow.bp{width:100%;text-align:left}
.chev{flex:none;color:var(--muted);font-size:calc(20px * var(--ts));line-height:1}
.startlog{max-width:100%;overflow:auto;text-align:left;font:12px/1.45 ui-monospace,Menlo,monospace;background:var(--sheet);border:1px solid var(--rule);border-radius:10px;padding:10px;color:var(--ink-2);white-space:pre-wrap;-webkit-user-select:text;user-select:text;margin:8px 0;max-height:260px}

/* one item */
.strip{display:flex;gap:10px;overflow-x:auto;padding:2px 2px 8px;margin:0 -2px;scrollbar-width:none}
.strip::-webkit-scrollbar{display:none}
.ph{position:relative;flex:none;width:118px;display:flex;flex-direction:column;gap:5px}
.ph img{width:118px;height:150px;object-fit:cover;border-radius:12px;background:var(--sheet);border:1px solid var(--rule);display:block}
.ph-main{position:absolute;left:6px;top:6px;font-size:calc(11px * var(--ts));font-weight:700;background:var(--ink);color:var(--paper);border-radius:6px;padding:1px 6px}
.ph-err{font-size:calc(11.5px * var(--ts));color:var(--amber);text-align:center}
.ph-tools{display:flex;justify-content:space-between;gap:4px}
.ph-tools button{flex:1;height:30px;border-radius:8px;border:1px solid var(--rule);background:var(--sheet);font-size:calc(17px * var(--ts));font-weight:600;line-height:1}
.ph.add{height:150px;justify-content:center;align-items:center;border:1.5px dashed var(--rule);border-radius:12px;color:var(--ink-2);width:84px}
.ph.add b{font-size:calc(24px * var(--ts));line-height:1}
.ph.add small{font-size:calc(12px * var(--ts))}
.seg.mini button{flex:1;padding:4px 2px;font-size:calc(11px * var(--ts))}
.fl{display:block;margin:16px 0 0}
.fl > span{display:block;font-size:calc(13px * var(--ts));font-weight:700;color:var(--ink-2);margin-bottom:6px;letter-spacing:.01em}
.fin,.fsel{display:block;width:100%;font:16px/1.45 var(--sans);color:var(--ink);background:var(--sheet);border:1px solid var(--rule);border-radius:10px;padding:10px 12px}
textarea.fin{resize:vertical}
.fin:focus,.fsel:focus{outline:2px solid var(--signal);outline-offset:-1px}
.pricebox{display:flex;align-items:center;gap:8px}
.pricebox .fin{max-width:160px;font:700 20px var(--num)}
.pricebox b{font-size:calc(16px * var(--ts));color:var(--ink-2)}
.fld{display:flex;align-items:center;gap:10px;background:var(--sheet);border:1px solid var(--rule);border-radius:10px;padding:9px 12px}
.pick{border:1px solid var(--rule);border-top:0;border-radius:0 0 10px 10px;padding:0 12px 6px;margin-top:-4px;background:var(--sheet);max-height:360px;overflow-y:auto}
.pick .srow:last-child{border-bottom:0}
.field{display:flex;gap:8px;padding:10px 0 4px}
.field input{flex:1;min-width:0;font:16px var(--sans);padding:9px 11px;border-radius:9px;border:1px solid var(--rule);background:var(--paper);color:var(--ink)}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chipb{display:inline-flex;align-items:center;gap:6px;font-size:calc(13px * var(--ts));padding:6px 10px;border-radius:16px;border:1px solid var(--rule);background:var(--sheet);color:var(--ink-2)}
.chipb.on{background:var(--ink);color:var(--paper);border-color:var(--ink);font-weight:600}
.chipb.col i{width:12px;height:12px;border-radius:6px;border:1px solid rgba(127,127,127,.5);flex:none}
.primary.wide{padding:14px;font-size:calc(16px * var(--ts));border-radius:12px}
.primary.ai{margin-top:16px}
.primary.post{margin-top:20px}
.primary.post.armed{background:var(--danger);color:#fff}
.miss{margin:18px 0 0;font-size:calc(13.5px * var(--ts));color:var(--amber);background:var(--amber-wash);border-radius:10px;padding:9px 12px}
.err{margin:12px 0 0;font-size:calc(13.5px * var(--ts));color:var(--danger);background:var(--amber-wash);border-radius:10px;padding:9px 12px}
.ailbl{margin:16px 0 0;display:flex;flex-direction:column;gap:4px;align-items:flex-start}
.badge-ai{display:inline-block;font-size:calc(12px * var(--ts));font-weight:700;color:var(--signal);background:var(--signal-wash);border-radius:6px;padding:2px 8px}
.badge-ex{display:inline-block;font-size:calc(12px * var(--ts));font-weight:600;color:var(--ink-2);border:1px dashed var(--muted);border-radius:6px;padding:1px 8px}
.steps{margin:14px 0 0;background:var(--sheet);border:1px solid var(--rule);border-radius:12px;padding:10px 12px}
.step{display:flex;align-items:center;gap:8px;font-size:calc(14px * var(--ts));color:var(--ink);padding:3px 0}
.step.done{color:var(--muted)}
.bar{height:5px;border-radius:3px;background:var(--rule);margin-top:8px;overflow:hidden}
.bar i{display:block;height:100%;background:var(--signal);transition:width .3s}
.working{display:flex;align-items:center;gap:8px;margin:12px 0;color:var(--ink-2)}
/* a batch of new photos */
.grp-item{display:block;width:100%;text-align:left;background:var(--sheet);border:1px solid var(--rule);border-radius:14px;padding:12px;margin:12px 0 0}
.grp-item.can{border-style:dashed;border-color:var(--signal)}
.grp-item.new{text-align:center;color:var(--signal);font-weight:600}
.gi-h{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.gi-h small{margin-left:auto}
.gi-ph{display:flex;flex-wrap:wrap;gap:6px}
.gi-ph img{width:64px;height:80px;object-fit:cover;border-radius:8px;border:2px solid transparent}
.gi-ph img.pick{border-color:var(--signal);transform:scale(.94)}

/* AI sheet (app-blueprints · ai-configuration) */
#aisheet{position:fixed;inset:0;z-index:14;background:var(--paper);transform:translateY(102%);transition:transform .28s ease;overflow-y:auto}
#aisheet.open{transform:none}
.aicard,.ucard{background:var(--sheet);border:1px solid var(--rule);border-radius:14px;padding:14px;margin:14px 0}
.aicard.active{border-color:var(--signal);box-shadow:0 0 0 1px var(--signal)}
.aic-h{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:calc(17px * var(--ts))}
.aic-row{display:flex;align-items:center;gap:10px;margin-top:10px;font-size:calc(14px * var(--ts))}
.aic-row.lbl,.aic-row .lbl{font-weight:600;color:var(--ink-2)}
.aicard code{font:13px ui-monospace,Menlo,monospace;background:var(--paper);border:1px solid var(--rule);border-radius:6px;padding:2px 6px}
.aic-btns{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:10px}
.sm[disabled]{opacity:.5}
.modelsel{display:block;width:100%;margin-top:6px;font:16px var(--sans);color:var(--ink);background:var(--paper);border:1px solid var(--rule);border-radius:9px;padding:9px 10px}
.ustat{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0 4px}
.ustat div{background:var(--paper);border-radius:10px;padding:8px 10px}
.ustat b{display:block;font-size:calc(20px * var(--ts));font-weight:700}
.ustat small{color:var(--muted);font-size:calc(12px * var(--ts))}
.ubars{display:flex;align-items:flex-end;gap:3px;height:56px;margin-top:10px}
.ubars span{flex:1;background:var(--signal);border-radius:3px 3px 0 0;min-height:2px}
.ubars span.zero{background:var(--rule)}
.ubars-l{display:flex;justify-content:space-between;font-size:calc(11.5px * var(--ts));color:var(--muted);margin-top:4px}
.utab{width:100%;border-collapse:collapse;margin-top:12px;font-size:calc(13px * var(--ts))}
.utab th{text-align:left;font-weight:600;color:var(--muted);padding:4px 4px 4px 0;border-bottom:1px solid var(--rule)}
.utab td{padding:6px 4px 6px 0;border-bottom:1px solid var(--rule);color:var(--ink-2);word-break:break-word}
.utab th:not(:first-child),.utab td:not(:first-child){text-align:right;white-space:nowrap}

/* anonymous usage (app-blueprints · usage-analytics) */
#usageask{background:var(--sheet);border:1px solid var(--rule);border-radius:18px;padding:14px 16px;margin:10px 14px 4px}
#usageask b{font-size:calc(16px * var(--ts))}
#usageask p{margin:6px 0 12px;color:var(--muted);font-size:calc(14px * var(--ts));line-height:1.4}
.uabtns{display:flex;gap:10px}
.uabtns button{flex:1;padding:10px}
/* update sheet (app-blueprints · in-app-updates) */
#upd{position:fixed;inset:0;z-index:48;background:rgba(0,0,0,.55);display:flex;align-items:flex-end}
.updp{width:100%;background:var(--sheet);border-radius:22px 22px 0 0;padding:20px 18px calc(16px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:8px}
.updtag{align-self:flex-start;background:var(--signal);color:var(--paper);font-size:calc(12px * var(--ts));font-weight:800;padding:4px 10px;border-radius:999px}
.updt{margin:6px 0 0;font:700 calc(22px * var(--ts))/1.2 var(--display)}
.upds{color:var(--muted);font-size:calc(14px * var(--ts))}
.updl{display:flex;flex-direction:column;gap:10px;margin:8px 0 6px}
.updi{display:flex;gap:12px;align-items:flex-start;background:var(--paper);border-radius:14px;padding:12px}
.updic{font-size:24px;line-height:1.1;flex:none}
.updi b{display:block;font-size:calc(15px * var(--ts))}
.updi span{display:block;color:var(--muted);font-size:calc(13px * var(--ts));line-height:1.35;margin-top:2px}
.updmsg:empty{display:none}
.updgo{padding:13px;font-size:16px}
.updlater{padding:11px;background:var(--paper);color:inherit;border-radius:10px}
/* AI invitation (app-blueprints · ai-invitation): above Settings and the AI sheet, below the update sheet and the launch screen */
#aiinv{position:fixed;inset:0;z-index:47;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,.45);animation:aiinvFade .25s ease both}
#aiinv.out{animation:aiinvFadeOut .24s ease both}
.aiinv-card{position:relative;width:100%;max-width:380px;background:var(--sheet);color:var(--ink);border:1px solid var(--rule);border-radius:24px;padding:26px 22px 16px;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.35);animation:aiinvUp .5s cubic-bezier(.2,.9,.3,1.2) both}
#aiinv.out .aiinv-card{animation:aiinvDown .24s ease both}
.aiinv-spark{width:56px;height:56px;margin:-4px auto 10px;border-radius:18px;display:grid;place-items:center;font-size:calc(30px * var(--ts));color:var(--signal);background:var(--signal-wash);animation:aiinvTwinkle 2.4s ease-in-out .5s infinite}
#aiinv h2{margin:0 0 6px;font-family:var(--display);font-size:calc(23px * var(--ts));line-height:1.2;font-weight:800}
.aiinv-lead{margin:0 0 14px;color:var(--ink-2);font-size:calc(15px * var(--ts))}
.aiinv-perks{list-style:none;margin:0 0 14px;padding:0;text-align:left}
.aiinv-perks li{display:flex;gap:10px;align-items:center;padding:9px 12px;margin-bottom:6px;border-radius:12px;background:var(--signal-wash);font-size:calc(15px * var(--ts));font-weight:600;animation:aiinvPerk .4s ease both;animation-delay:calc(.25s + var(--i) * .09s)}
.aiinv-ico{flex:none;width:22px;text-align:center}
.aiinv-steps{margin:0 0 16px;padding-left:22px;text-align:left;color:var(--muted);font-size:calc(13px * var(--ts));line-height:1.6}
.aiinv-go{display:block;width:100%;border:0;border-radius:14px;padding:14px;font:700 calc(17px * var(--ts)) var(--display);color:var(--sheet);background:var(--signal);animation:aiinvGlow 1.6s ease-in-out .9s 2}
.aiinv-go:focus{outline:none}
.aiinv-go:focus-visible{box-shadow:0 0 0 4px var(--signal-wash)}
.aiinv-row{display:flex;justify-content:space-between;gap:8px;margin-top:6px}
.aiinv-later,.aiinv-never{border:0;background:none;padding:12px 6px;color:var(--muted);font:600 calc(14px * var(--ts)) var(--sans, inherit)}
.aiinv-later{color:var(--ink-2)}
.aiinv-nudge{animation:aiinvGlow 1.2s ease-in-out 2}
@keyframes aiinvFade{from{opacity:0}to{opacity:1}}
@keyframes aiinvFadeOut{from{opacity:1}to{opacity:0}}
@keyframes aiinvUp{from{opacity:0;transform:translateY(40px) scale(.94)}to{opacity:1;transform:none}}
@keyframes aiinvDown{to{opacity:0;transform:translateY(24px) scale(.97)}}
@keyframes aiinvPerk{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:none}}
@keyframes aiinvTwinkle{0%,100%{transform:scale(1) rotate(0)}50%{transform:scale(1.12) rotate(12deg)}}
@keyframes aiinvGlow{0%,100%{box-shadow:0 0 0 0 transparent}50%{box-shadow:0 0 0 6px var(--signal-wash)}}
@media (prefers-reduced-motion:reduce){
  #aiinv,#aiinv.out,.aiinv-card,#aiinv.out .aiinv-card,.aiinv-perks li,.aiinv-spark,.aiinv-go,.aiinv-nudge{animation:none}
  #aiinv.out{opacity:0;transition:opacity .2s}
}

#toast{position:fixed;left:16px;right:16px;bottom:calc(env(safe-area-inset-bottom) + 18px);z-index:60;background:var(--ink);color:var(--paper);border-radius:12px;padding:12px 14px;font-size:calc(14px * var(--ts));transform:translateY(calc(100% + 40px));visibility:hidden;transition:transform .25s ease,visibility 0s linear .25s;text-align:center}
#toast.on{transform:none;visibility:visible;transition:transform .25s ease}
/* start-up (recipe safe-startup) */
.booting{display:flex;align-items:center;justify-content:center;gap:10px;padding:80px 20px;color:var(--muted);font-size:calc(14px * var(--ts))}
.booting.note{flex-direction:column;text-align:center;color:var(--ink-2);padding:60px 24px}
.booting.note b{font-size:calc(18px * var(--ts));color:var(--ink)}
.booting.note pre{max-width:100%;overflow:auto;text-align:left;font:12px/1.45 ui-monospace,Menlo,monospace;background:var(--sheet);border:1px solid var(--rule);border-radius:10px;padding:10px;color:var(--ink-2);white-space:pre-wrap;-webkit-user-select:text;user-select:text}
.busy-dot{width:15px;height:15px;flex:none;border-radius:50%;border:2px solid var(--rule);border-top-color:var(--signal);animation:bdspin .8s linear infinite;display:inline-block}
@keyframes bdspin{to{transform:rotate(360deg)}}

/* launch screen (app-blueprints · launch-screen) */
.splash{--sp-bg:#0E1116;--sp-ink:#F6F7F9;--sp-accent:#2DD4BF;--sp-accent2:#FBBF24;--sp-muted:#9AA3AE;--sp-font:var(--display);
  position:fixed;inset:0;z-index:90;background:var(--sp-bg);color:var(--sp-ink);
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;cursor:pointer;
  animation:spOut .4s ease 2.4s forwards}
.splash.gone{display:none}
.spIcon{width:148px;height:148px;opacity:0;transform:scale(.86);animation:spIn .5s cubic-bezier(.2,.9,.3,1.2) .05s forwards}
.spIcon svg{width:100%;height:100%;display:block;overflow:visible}
.spFrame{fill:none;stroke:var(--sp-ink);stroke-opacity:.35;stroke-width:7;stroke-linecap:round;stroke-linejoin:round;opacity:0;animation:spFade .4s ease .25s forwards}
.spDraw{fill:none;stroke:var(--sp-ink);stroke-width:13;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:100;stroke-dashoffset:100;animation:spDraw .8s ease-in-out .15s forwards}
.spPop{fill:var(--sp-accent);transform-box:fill-box;transform-origin:center;transform:scale(0);animation:spPop .45s cubic-bezier(.3,1.7,.5,1) .75s forwards}
.spDetail{fill:var(--sp-ink);opacity:0;animation:spFade .3s ease 1.05s forwards}
.spSweep{fill:none;stroke:var(--sp-accent2);stroke-width:7;stroke-linecap:round;opacity:0;transform:translateX(var(--sp-sweep-from,-120px));animation:spSweep 1s ease-in-out .95s forwards}
.spWord{font:800 40px/1 var(--sp-font,ui-rounded,-apple-system,system-ui,sans-serif);letter-spacing:-.02em;opacity:0;transform:translateY(10px);animation:spUp .45s ease 1.05s forwards}
.spWord span{color:var(--sp-accent)}
.spTag{font:600 15px/1.3 -apple-system,system-ui,sans-serif;letter-spacing:.06em;color:var(--sp-muted);opacity:0;transform:translateY(8px);animation:spUp .45s ease 1.4s forwards}
@keyframes spIn{to{opacity:1;transform:scale(1)}}
@keyframes spFade{to{opacity:1}}
@keyframes spDraw{to{stroke-dashoffset:0}}
@keyframes spPop{to{transform:scale(1)}}
@keyframes spSweep{0%{opacity:0}15%{opacity:1}100%{opacity:1;transform:translateX(0)}}
@keyframes spUp{to{opacity:1;transform:none}}
@keyframes spOut{to{opacity:0;visibility:hidden}}
@media (prefers-reduced-motion:reduce){
  .busy-dot{animation-duration:2.4s}
  .splash *{animation:none!important;opacity:1!important;transform:none!important;stroke-dashoffset:0!important}
  .splash{animation:spOut .3s ease 1.6s forwards!important}
  .sheet,#aisheet,#toast,.switch,.switch::after,.bar i{transition:none}
}
`;

// Vintly logo: a price tag drawn in white, its hole in teal, a little string, and an amber price line, on its dark tile
const LOGO_SVG = '<path d="M95 95 C76 70 54 56 38 62" fill="none" stroke="#F6F7F9" stroke-opacity="0.35" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="M60 60 H128 L194 126 L126 194 L60 128 Z" fill="none" stroke="#F6F7F9" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/><circle cx="95" cy="95" r="15" fill="#2DD4BF"/><circle cx="100" cy="90" r="4.5" fill="#F6F7F9"/><path d="M112 156 L154 114" fill="none" stroke="#FBBF24" stroke-width="7" stroke-linecap="round"/>';
const ADD_SVG = `<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>`;
const SETTINGS_SVG = `<svg viewBox="0 0 24 24"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg>`;
const THEME_IDS = ["ink", "sepia", "mint", "contrast", "slate", "night"];
const initTheme = () => THEME_IDS.includes(settings.theme) ? settings.theme : (Device.isUsingDarkAppearance() ? "night" : "ink");

const buildHTML = () => `<!doctype html><html data-theme="${initTheme()}" data-font="${settings.font === "serif" ? "serif" : "sans"}" style="--ts:${+settings.textSize || 1}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<style>${CSS}</style></head><body class="d-${["compact", "tiny"].includes(settings.density) ? settings.density : "comfortable"}">
<div class="splash" id="splash" role="img" aria-label="Vintly. Snap. Price. Sell.">
  <div class="spIcon"><svg viewBox="0 0 240 240" aria-hidden="true">
    <path class="spFrame" d="M95 95 C76 70 54 56 38 62"></path>
    <path class="spDraw" pathLength="100" d="M60 60 H128 L194 126 L126 194 L60 128 Z"></path>
    <circle class="spPop" cx="95" cy="95" r="15"></circle>
    <circle class="spDetail" cx="100" cy="90" r="4.5"></circle>
    <path class="spSweep" d="M112 156 L154 114"></path>
  </svg></div>
  <div class="spWord">Vint<span>ly</span></div>
  <div class="spTag">Snap. Price. Sell.</div>
</div>
<header id="top">
  <div class="tb"><div><h1 class="brand"><svg class="brand-mark" viewBox="0 0 240 240" aria-hidden="true">${LOGO_SVG}</svg><span>Vint<span class="x">ly</span></span></h1><div id="status" class="status"></div></div>
    <div class="tb-a"><button class="icon" data-act="cfgopen" aria-label="Settings">${SETTINGS_SVG}</button>
    <button class="icon" data-act="lib" aria-label="Add photos">${ADD_SVG}</button></div></div>
  <nav id="tabs" class="tabs" aria-label="Items"></nav>
</header>
<div id="usageslot"></div>
<main id="main"><div class="booting" role="status"><span class="busy-dot"></span>Loading your items…</div></main>
<p class="ver">Vintly v${VERSION}</p>
<input type="file" id="pickLib" accept="image/*" multiple hidden>
<input type="file" id="pickCam" accept="image/*" capture="environment" hidden>
<div id="tray" hidden role="status"></div>
<div id="itemsheet" class="sheet" aria-label="Item"></div>
<div id="batchsheet" class="sheet" aria-label="New photos"></div>
<div id="cfgsheet" class="sheet" aria-label="Settings"></div>
<div id="aisheet" class="sheet" aria-label="AI settings"></div>
<div id="toast" role="status"></div>
<script>
// Launch screen (app-blueprints · launch-screen 1.0.0): first, self-contained
(function () {
  var sp = document.getElementById("splash");
  if (!sp) return;
  function gone() { sp.classList.add("gone"); sp.setAttribute("aria-hidden", "true"); }
  sp.addEventListener("click", gone);   // tap to skip
  setTimeout(gone, 2900);               // out of the page once the CSS fade is done
})();
window.__LOGO = ${safeJSON(LOGO_SVG)};
// The page goes on screen first; Scriptable hands over the data once it has read it (recipe safe-startup).
window.__parts = [];
window.__bootNote = function (title, detail) {
  var b = document.querySelector(".booting"); if (!b) return;
  b.className = "booting note";
  b.innerHTML = "<b></b><span></span>" + (detail ? "<pre></pre>" : "");
  b.querySelector("b").textContent = title;
  b.querySelector("span").textContent = "Close Vintly and open it again. If it keeps happening, run the installer once more.";
  if (detail) b.querySelector("pre").textContent = detail;
};
setTimeout(function () { if (!window.__booted) window.__bootNote("Still loading…"); }, 25000);
document.addEventListener("visibilitychange", function () {   // coming back into view: redraw
  if (document.visibilityState !== "visible") return;
  var d = document.documentElement; d.style.transform = "translateZ(0)"; void d.offsetHeight; d.style.transform = "";
});
window.__boot = function (st) {
  if (window.__booted) return;
  if (!st.items || !st.items.length) st.items = [].concat.apply([], window.__parts);
  window.__parts = [];
  window.__booted = true; window.__INIT = st;
  requestAnimationFrame(function () {   // make WebKit draw again once the items are in (helps if the window came up blank)
    var d = document.documentElement; d.style.transform = "translateZ(0)"; void d.offsetHeight;
    requestAnimationFrame(function () { d.style.transform = ""; });
  });
  (${clientApp.toString()})();
};</script>
</body></html>`;

// ---------- home-screen widget: Vintly's content for the shared frame below ----------
// The snapshot the widget reads (saveWidget): how many items wait to be posted, how many are ready, and the latest
// posted ones. Saved when you close Vintly and after preparing, posting or deleting. No photos, no account details.
function widgetSnapshot() {
  const todo = items.filter(x => x.status !== "posted"), done = items.filter(x => x.status === "posted" && x.vinted);
  const week = done.filter(x => Date.now() - x.vinted.at < 7 * DAY && !x.vinted.draft);
  return {
    todo: todo.length, ready: todo.filter(x => !missingFor(x).length).length, cur: currencyOf(),
    posted7: week.length, value7: week.reduce((n, x) => n + (+(x.listing || {}).price || 0), 0),
    recent: done.sort((a, b) => b.vinted.at - a.vinted.at).slice(0, 6).map(x => ({ t: clip((x.listing || {}).title || "Item", 60), p: +(x.listing || {}).price || 0, at: x.vinted.at, draft: !!x.vinted.draft })),
  };
}
const wMoney = (v, cur) => { try { return new Intl.NumberFormat(undefined, { style: "currency", currency: cur || "EUR", maximumFractionDigits: v % 1 ? 2 : 0 }).format(v); } catch (e) { return v + " " + (cur || ""); } };
// What waits to be posted, then what you posted lately. The data only changes inside Vintly, which saves the
// snapshot every time, so the model has no "at" (it can't go out of date).
async function widgetModel() {
  const w = readWidget();
  if (!w || (!w.todo && !(w.recent || []).length)) return { empty: "No items yet. Tap to snap your first one.", accessory: { glyph: "🏷", value: 0 } };
  const rows = (w.recent || []).map(r => ({ icon: r.draft ? "✎" : "✓", text: r.t, sub: [r.p ? wMoney(r.p, w.cur) : "", r.draft ? "draft" : "", wWhen(r.at)].filter(Boolean).join(" · ") }));
  return {
    badge: w.ready ? w.ready + " ready" : null,
    kicker: w.todo ? "To post" : "All posted",
    value: String(w.todo), caption: w.todo === 1 ? "item waiting" : "items waiting",
    rows,
    footer: w.posted7 ? `${w.posted7} posted this week · ${wMoney(w.value7, w.cur)}` : "Nothing posted this week",
    accessory: { glyph: "🏷", value: w.todo, inline: `🏷 ${w.todo} to post${w.ready ? ", " + w.ready + " ready" : ""}` },
  };
}

// ───────── Widget ─────────
// Shared widget frame (github.com/gadominas/app-blueprints › blueprints/widgets.md).
// An app changes only WIDGET and widgetModel(); everything below WB is the same in every app.
const WIDGET = {
  name: ['Vint', 'ly'],                   // as on the launch screen: plain part, highlighted part, optional rest
  accent: '#2DD4BF',                      // the logo's focal colour (the launch screen's --sp-accent)
  icon: REPO_RAW + 'docs/icon-1024.png',  // the app icon, cached on the phone after the first fetch
  words: { open: 'Tap to open', nothing: 'Nothing to show yet.', updated: 'Updated', yesterday: 'yesterday' },   // in the app's language
};
// Brand colours, the same in every app and in light and dark mode: the logo tile's ground and lines.
const WB = { ground: '#0E1116', raised: '#171B22', ink: '#F6F7F9', ink2: '#C9CED6', muted: '#9AA3AE', good: '#2DD4BF', warn: '#FBBF24' };
const wfm = FileManager.local();
const wPath = (n) => wfm.joinPath(wfm.documentsDirectory(), APP_ID + '-' + n);

// What the widget shows is saved by the app and only read by the widget: fast, offline, no sign-in.
function saveWidget(data) {
  try { wfm.writeString(wPath('widget.json'), JSON.stringify(Object.assign({}, data, { at: Date.now() }))); }
  catch (e) { console.log('Widget: not saved: ' + e); }
}
function readWidget() {
  try { const p = wPath('widget.json'); return wfm.fileExists(p) ? JSON.parse(wfm.readString(p)) : null; }
  catch (e) { return null; }
}

// Tones: ink, soft, muted, accent, good, warn, or a hex colour.
const wColor = (c, a = 1) => {
  const k = c === 'soft' ? 'ink2' : c;
  return new Color(k === 'accent' ? WIDGET.accent : (WB[k] || k), a);
};
// Rounded system fonts, falling back to the plain system font on older Scriptable versions.
function wFont(weight, size) {
  const name = { bold: 'boldRoundedSystemFont', semi: 'semiboldRoundedSystemFont', med: 'mediumRoundedSystemFont' }[weight] || 'regularRoundedSystemFont';
  if (typeof Font[name] === 'function') return Font[name](size);
  return weight === 'bold' ? Font.boldSystemFont(size) : weight === 'semi' ? Font.semiboldSystemFont(size) : weight === 'med' ? Font.mediumSystemFont(size) : Font.systemFont(size);
}
function wText(stack, s, size, weight, tone, lines = 1) {
  const t = stack.addText(String(s));
  t.font = wFont(weight, size);
  t.textColor = wColor(tone);
  t.lineLimit = lines;
  if (lines === 1) t.minimumScaleFactor = 0.75;
  return t;
}
function wWhen(ts) {
  const d = new Date(ts), now = new Date(), f = new DateFormatter();
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const ago = Math.round((day(now) - day(d)) / 864e5);
  if (ago === 1) return WIDGET.words.yesterday;
  f.dateFormat = ago === 0 ? 'HH:mm' : 'd MMM';
  return f.string(d);
}

// The app's logo tile, from the repository's icon, cached per app version; a monogram until then.
async function widgetIcon() {
  const p = wPath('widget-icon-' + VERSION + '.png');
  try {
    if (wfm.fileExists(p)) return wfm.readImage(p);
    const r = new Request(WIDGET.icon);
    r.timeoutInterval = 8;
    const dc = new DrawContext();
    dc.size = new Size(96, 96); dc.opaque = false; dc.respectScreenScale = false;
    dc.drawImageInRect(await r.loadImage(), new Rect(0, 0, 96, 96));
    const img = dc.getImage();
    const dir = wfm.documentsDirectory();
    wfm.listContents(dir).filter((f) => f.startsWith(APP_ID + '-widget-icon-')).forEach((f) => { try { wfm.remove(wfm.joinPath(dir, f)); } catch (e) {} });
    wfm.writeImage(p, img);
    return img;
  } catch (e) {
    return widgetMonogram();
  }
}
function widgetMonogram() {
  const dc = new DrawContext();
  dc.size = new Size(96, 96); dc.opaque = false; dc.respectScreenScale = false;
  dc.setFillColor(wColor('raised')); dc.fillRect(new Rect(0, 0, 96, 96));
  dc.setFont(wFont('bold', 54)); dc.setTextColor(wColor('accent')); dc.setTextAlignedCenter();
  dc.drawTextInRect(WIDGET.name.join('').charAt(0), new Rect(0, 14, 96, 70));
  return dc.getImage();
}

// Rows that fit: a line counts 1, a sub line 0.8; medium holds 5.5 (3 rows at most), large 12 (6 at most).
function wFit(rows, budget, max) {
  const out = [];
  let used = 0;
  for (const r of rows || []) {
    const n = (r.lines || 1) + (r.sub ? 0.8 : 0);
    if (out.length >= max || used + n > budget + 1e-9) break;   // 1e-9: 3 + 5 × 1.8 must still fit in 12
    used += n;
    out.push(r);
  }
  return out;
}
function wRows(stack, rows) {
  rows.forEach((r, i) => {
    if (i) stack.addSpacer(5);
    const row = stack.addStack();
    row.topAlignContent(); row.spacing = 6;
    if (r.url) row.url = r.url;
    if (r.icon) { const ic = row.addStack(); ic.size = new Size(15, 0); wText(ic, r.icon, 11.5, 'reg', 'ink'); }
    const tx = row.addStack();
    tx.layoutVertically();
    wText(tx, r.text, 12.5, r.lines ? 'reg' : 'med', r.tone || (r.lines ? 'soft' : 'ink'), r.lines || 1);
    if (r.sub) wText(tx, r.sub, 11, 'reg', 'muted');
  });
}

async function renderWidget(m) {
  const fam = config.widgetFamily || 'medium';
  const w = new ListWidget();
  w.url = m.url || URLScheme.forRunningScript();
  w.refreshAfterDate = new Date(Date.now() + cfg('widgetRefreshMin') * 60e3);
  if (fam.startsWith('accessory')) return renderAccessory(w, fam, m);
  const small = fam === 'small', medium = fam === 'medium', large = !small && !medium;
  const g = new LinearGradient();
  g.colors = [wColor('raised'), wColor('ground')]; g.locations = [0, 1];
  g.startPoint = new Point(0, 0); g.endPoint = new Point(0, 1);
  w.backgroundGradient = g;
  w.setPadding(14, 14, 14, 14);

  // 1. Header: logo tile, name (highlighted part in the accent), badge
  const hd = w.addStack();
  hd.centerAlignContent();
  const icon = hd.addImage(await widgetIcon());
  const is = small ? 18 : 20;
  icon.imageSize = new Size(is, is); icon.cornerRadius = is * 0.225;
  hd.addSpacer(6);
  WIDGET.name.forEach((part, i) => {
    if (!part) return;
    const t = hd.addText(part);
    t.font = wFont('bold', small ? 13 : 14); t.textColor = wColor(i === 1 ? 'accent' : 'ink'); t.lineLimit = 1;
  });
  hd.addSpacer();
  if (m.badge && !small) {
    const b = hd.addStack();
    b.setPadding(2, 7, 2, 7); b.cornerRadius = 8;
    b.backgroundColor = wColor(m.badgeTone || 'accent', 0.16);
    wText(b, m.badge, 11.5, 'semi', m.badgeTone || 'accent');
  }
  w.addSpacer(small ? 8 : 10);

  // Empty state: what to do next, never an error
  if (m.empty) {
    wText(w, m.empty, 13, 'semi', 'soft', 3);
    w.addSpacer();
    wText(w, m.footer || WIDGET.words.open, 11, 'reg', 'muted');
    Script.setWidget(w);
    return;
  }

  // 2. Hero: kicker, then a big value with its caption, or a title with its caption
  const body = w.addStack();
  body.topAlignContent();
  const left = body.addStack();
  left.layoutVertically();
  if (medium) left.size = new Size(136, 0);
  if (m.kicker) wText(left, m.kicker, 11, 'semi', m.kickerTone || 'accent');
  if (m.value != null && m.value !== '') {
    wText(left, m.value, small ? 40 : 42, 'bold', m.valueTone || 'ink');
    if (m.caption) wText(left, m.caption, 13, 'semi', 'ink');
  } else {
    if (m.title) wText(left, m.title, small ? 16 : 18, 'bold', 'ink', 2);
    if (m.caption) { left.addSpacer(2); wText(left, m.caption, 12, 'reg', 'soft', 2); }
  }

  // 3. Rows: beside the hero on medium, under it on large, none on small
  const rows = m.rows || [];
  if (medium && wFit(rows, 5.5, 3).length) {
    body.addSpacer(12);
    const right = body.addStack();
    right.layoutVertically();
    wRows(right, wFit(rows, 5.5, 3));
  }
  body.addSpacer();
  if (large && wFit(rows, 12, 6).length) { w.addSpacer(14); wRows(w, wFit(rows, 12, 6)); }

  // 4. Footer: one muted line; amber when the data is stale. Small shows the badge here if there's no footer.
  w.addSpacer();
  const ft = small ? (m.footer || m.badge) : m.footer;
  if (ft) wText(w, (m.stale ? '⟳ ' : '') + ft, 11, 'reg', m.stale ? 'warn' : 'muted');
  Script.setWidget(w);
}

// Lock Screen: iOS tints these, so text only, no colours or logo.
function renderAccessory(w, fam, m) {
  const name = WIDGET.name.join('');
  const a = m.accessory || {};
  const hasValue = m.value != null && m.value !== '';
  const hero = m.empty || (hasValue ? (m.value + ' ' + (m.caption || '')).trim() : (m.title || ''));
  if (fam === 'accessoryInline') {
    w.addText(a.inline || (hero ? name + ': ' + hero : name));
  } else if (fam === 'accessoryCircular') {
    w.addAccessoryWidgetBackground = true;
    const c = w.addStack();
    c.layoutVertically(); c.centerAlignContent();
    const gl = c.addText(a.glyph || name.charAt(0)); gl.font = Font.systemFont(11); gl.centerAlignText();
    const v = c.addText(String(a.value != null ? a.value : hasValue ? m.value : '–'));
    v.font = wFont('bold', 20); v.minimumScaleFactor = 0.5; v.centerAlignText();
  } else {
    const lines = [
      [[name, m.badge || m.kicker].filter(Boolean).join(' · '), 'semi', 12],
      [hero, 'bold', 15],
      [m.empty ? '' : hasValue ? (m.footer || '') : (m.caption || m.footer || ''), 'reg', 12],
    ];
    lines.forEach(([s, wt, size]) => { if (!s) return; const t = w.addText(s); t.font = wFont(wt, size); t.lineLimit = 1; t.minimumScaleFactor = 0.7; });
  }
  Script.setWidget(w);
}

// Widget runs come here and only here: no WebView, Alert or QuickLook may be built or presented.
async function runWidget() {
  const name = WIDGET.name.join('');
  let m = null;
  try { m = await widgetModel(args.widgetParameter || '', config.widgetFamily || 'medium'); }
  catch (e) { console.error('Widget model: ' + e); }
  if (!m) m = { empty: WIDGET.words.nothing };
  try {
    if (m.at && !m.empty && Date.now() - m.at > cfg('widgetStaleMin') * 60e3) {
      m.stale = true;
      m.footer = WIDGET.words.updated + ' ' + wWhen(m.at);
    }
    await renderWidget(m);
  } catch (e) {
    console.error('Widget render: ' + e);
    const w = new ListWidget();
    w.backgroundColor = wColor('ground');
    w.url = URLScheme.forRunningScript();
    wText(w, name, 14, 'bold', 'ink');
    w.addSpacer(4);
    wText(w, WIDGET.words.open, 12, 'reg', 'muted');
    Script.setWidget(w);
  }
}
// ───────── end of Widget ─────────

// ---------- run ----------
// A run marks itself as open while its window is on screen. A new run waits at most 1.5 s for an older
// window to close, then opens anyway: quick taps on the widget don't stack up copies.
const lockFm = FileManager.local();
const RUN_LOCK = lockFm.joinPath(lockFm.temporaryDirectory(), APP_ID + '-running');
let lockTimer = null;
const lockAge = () => { try { return lockFm.fileExists(RUN_LOCK) ? Date.now() - Number(lockFm.readString(RUN_LOCK)) : Infinity; } catch (e) { return Infinity; } };
const pause = ms => new Promise(r => Timer.schedule(ms, false, r));
async function waitForOtherWindow() { for (let waited = 0; lockAge() < 2500 && waited < 1500; waited += 300) await pause(300); }
function holdLock() {
  const beat = () => { try { lockFm.writeString(RUN_LOCK, String(Date.now())); } catch (e) {} };
  beat(); lockTimer = Timer.schedule(1000, true, beat);
}
function releaseLock() {
  if (lockTimer) { lockTimer.invalidate(); lockTimer = null; }
  try { if (lockFm.fileExists(RUN_LOCK)) lockFm.remove(RUN_LOCK); } catch (e) {}
}
// Talks to the page with a time limit, so a stuck page can't stall the app.
const ev = (js, ms = 20000) => Promise.race([wv.evaluateJavaScript(js, false), pause(ms).then(() => { throw new Error("the page didn't respond in " + ms / 1000 + " s"); })]);

async function bootApp(isClosed) {
  const t0 = Date.now();
  startLog(`Vintly ${VERSION}: reading data`);
  await loadData();
  startLog(`data read in ${((Date.now() - t0) / 1000).toFixed(1)} s: ${items.length} items${loadIssues.length ? "; missing: " + loadIssues.join(", ") : ""}`);
  if (isClosed()) return;
  if (dataLoaded) { clearBatch(); prune(); }   // photos of a batch left unsorted last time, and old posted items
  const st = clientState(), list = st.items;
  st.items = [];
  for (let i = 0; i < list.length; i += 2) await ev(`window.__parts.push(${safeJSON(list.slice(i, i + 2))})`);   // in pieces: thumbnails make items heavy
  await ev(`window.__boot(${safeJSON(st)})`);
  let seen = "";
  try { seen = await ev(`document.visibilityState + ", " + innerWidth + "x" + innerHeight`, 5000); } catch (e) { seen = String(e.message || e); }
  startLog(`screen ready in ${((Date.now() - t0) / 1000).toFixed(1)} s (page: ${seen})`);
  track("app_open", { layout: settings.density, theme: settings.theme, ai_key: !!aiKey(), cleaning: canClean() ? settings.cleanStyle : "off", signed_in: !!settings.vintedOk });
  if (loadIssues.length) toast("Some of your data is still coming from iCloud. Nothing will be saved until you reopen Vintly.");
  else if (loadRepaired.length) toast("Some of your data couldn't be read, so Vintly kept a copy and started it fresh.");
  // Deferred work, once the first screen is drawn: photos shared to Vintly, the Vinted sign-in check, updates, the widget's icon.
  Timer.schedule(700, false, async () => {
    if (isClosed() || !dataLoaded) return;
    const shared = (args.images || []).slice(0, 40);
    if (shared.length) {
      const list = shared.map(img => { const big = scaledJPEG(img, cfg("photoMax")), small = scaledJPEG(img, 360); return { b64: big.b64, t: small.b64, w: big.w, h: big.h }; });
      await addPhotos(list, "", "share").catch(e => toast(String(e.message || e)));
    }
    if (Date.now() - (settings.vintedAt || 0) > 6 * 3600e3 || !settings.vintedOk) { await vintedCheck(); if (!isClosed()) push(); }
  });
  Timer.schedule(3500, false, () => {
    if (isClosed() || updateChecked) return;
    updateChecked = true;
    checkForUpdate().then(u => { pendingUpdate = u; offerUpdate(); }).catch(() => {}).then(inviteIfDue);   // AI invitation: after the update check, never with an offer
  });
  Timer.schedule(6000, false, () => { widgetIcon(); });
}

async function main() {
  await waitForOtherWindow();
  buildWebView();
  // A page built before its window is on screen can stay blank on some iPhones (the page runs, nothing is drawn),
  // most often when opened from the widget. So: an empty dark window first, then the real page built inside it.
  await wv.loadHTML('<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#0E1116"></body></html>');
  const presented = wv.present(true);
  holdLock();
  await pause(300);                          // let the window finish appearing
  startLog("window on screen");
  await Promise.race([wv.loadHTML(buildHTML()), pause(15000)]);   // the launch screen, drawn on screen
  let closed = false;
  presented.then(() => { closed = true; releaseLock(); flushUsage(); });
  bootApp(() => closed).catch(e => {         // runs beside the window: closing it never waits on this
    startLog("start-up failed: " + (e.message || e));
    let log = "";
    try { log = FileManager.local().readString(LOG_PATH).split("\n").slice(-12).join("\n"); } catch (x) {}
    if (!closed) wv.evaluateJavaScript(`window.__bootNote("Vintly couldn't open", ${safeJSON(log)})`, false).catch(() => {});
  });
  await presented;
  closed = true;
  releaseLock();
  saveAll();                                 // write() skips data that was never read
  if (dataLoaded) saveWidget(widgetSnapshot());
}

// Settings are loaded at the top of the script (load("settings")), before every branch; data is read in each branch.
if (config.runsInWidget || config.runsInAccessoryWidget) {
  await loadData();
  await runWidget();             // never builds or presents a WebView, Alert or QuickLook
} else {
  await main();
}
Script.complete();
