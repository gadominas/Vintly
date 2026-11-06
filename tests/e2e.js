#!/usr/bin/env node
// End-to-end run of Vintly's real script in the Scriptable emulator (app-blueprints/repo-site/tools):
//   node tests/e2e.js [--shots]        (BLUEPRINTS=../app-blueprints by default)
// Six photos are picked → ✦ sorted into three items → the jacket is prepared (two photos cleaned along the image
// model's masks, the listing written, Vinted's fields filled) → posted. Claude, OpenAI and Vinted answer from
// docs/site/scenario.js. Checks what reached Vinted and what Vintly saved; exit code 1 on any failure.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const BP = path.resolve(process.env.BLUEPRINTS || path.join(ROOT, '..', 'app-blueprints'));
const { chromium } = require('playwright');
const { Emulator, sleep } = require(path.join(BP, 'repo-site', 'tools', 'scriptable-emulator'));
const sc = require(path.join(ROOT, 'docs', 'site', 'scenario.js'));
const SHOTS = process.argv.includes('--shots');
const OUT = path.join(ROOT, 'tests', 'out');

let fails = 0;
const ok = (cond, what) => { console.log((cond ? '  ✓ ' : '  ✗ ') + what); if (!cond) fails++; };

(async () => {
  if (SHOTS) fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const fx = sc.fixtures({ empty: true, state: { next: 'jacket' } });
  const state = fx.state;
  const emu = new Emulator({ browser, fixtures: fx, scriptPath: path.join(ROOT, 'Vintly.js'), now: sc.now, log: (s) => { if (process.env.VERBOSE) console.log(s); } });
  emu.run();
  const wv = await emu.waitForPresent();
  const page = wv._page;
  const shot = async (n) => { if (SHOTS) await page.screenshot({ path: path.join(OUT, n + '.png') }); };
  const until = (fn, arg, ms = 30000) => page.waitForFunction(fn, arg, { timeout: ms, polling: 100 });
  const items = () => JSON.parse(emu.files.get(sc.DIR + '/items.json').toString());
  global.__dbg = { page, items, emu };
  await sleep(3200);
  console.log('Start');
  ok(await page.$('.empty h2'), 'empty list shows "Snap it. List it."');
  ok(/Signed in to vinted\.lt/.test(await page.textContent('#status')), 'signed in to vinted.lt (checked through Vinted\'s page)');

  console.log('Import and sort');
  await page.setInputFiles('#pickLib', ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'].map((k) => path.join(sc.FX, k + '.jpg')));
  await until(`document.querySelectorAll('#batchsheet .grp-item').length === 3 && !document.querySelector('#batchsheet .working')`);
  await shot('1-batch');
  ok((await page.$$('#batchsheet .gi-ph img')).length === 6, 'six photos in three ✦ groups');
  // Move one photo by hand and back: tap photo 1, tap item 2, then photo again, back to item 1
  await page.click('#batchsheet .grp-item:nth-of-type(1) .gi-ph img'); await page.click('#batchsheet .grp-item:nth-of-type(2) .gi-h');
  ok((await page.$$('#batchsheet .grp-item:nth-of-type(2) .gi-ph img')).length === 3, 'a photo moves to another item by hand');
  await page.click('#batchsheet .grp-item:nth-of-type(2) .gi-ph img:last-child'); await page.click('#batchsheet .grp-item:nth-of-type(1) .gi-h');
  await page.click('[data-act="batchmake"]');
  await until(`document.querySelectorAll('.card').length === 3`);
  ok(items().length === 3 && items().every((x) => x.photos.length === 2), 'three items with two photos each are saved');
  ok(!emu.files.has(sc.DIR + '/photos/_batch/' + items()[0].photos[0].id + '.jpg'), 'the batch folder is emptied');
  await shot('2-list');

  console.log('Prepare the jacket');
  const jacket = items().find((x) => x.hint === 'denim jacket');
  ok(!!jacket, 'the ✦ name is kept as a hint');
  state.masks = ['a2', 'a1']; state.next = 'jacket';   // photo 1 went to item 2 and back, so it's now last
  await page.click(`.card[data-v="${jacket.id}"]`);
  state.slow = 1800;   // the image model takes a while, so the scan and the bar can be seen
  await page.click('#itemsheet [data-act="prepare"]');
  await until(`!!document.querySelector('#itemsheet .ph.scan.ph-clean') && !!document.querySelector('#itembusy .bb-ph.clean .scanl')`, null, 10000);
  const bar1 = await page.$eval('#itembusy .pbar i', (e) => parseFloat(e.style.width));
  await shot('3a-cleaning');
  ok((await page.$$('#itemsheet .ph.scan')).length === 1, 'the photo being cleaned is scanned, one at a time');
  ok(/Cleaning photo 1 of 2/.test(await page.textContent('#itembusy .bb-now')) && /\d+%/.test(await page.textContent('#itembusy .bb-pct')), 'what happens now, with a percentage');
  await until(`/Cleaning photo 2 of 2/.test(document.querySelector('#itembusy .bb-now').textContent)`, null, 10000);
  await sleep(300);
  const bar2 = await page.$eval('#itembusy .pbar i', (e) => parseFloat(e.style.width));
  ok(bar2 > bar1, `the bar moves on (${bar1}% → ${bar2}%)`);
  state.slow = 0;
  await until(`!!document.querySelector('#itemsheet .ailbl') && !document.querySelector('#itembusy .steps') && !!document.querySelector('#itemsheet [data-act="prepare"]:not([disabled])')`, null, 60000);
  await sleep(600);
  await shot('3-item');
  const J = items().find((x) => x.id === jacket.id), L = J.listing;
  ok(J.photos.every((p) => p.clean && p.use === 'clean'), 'both photos cleaned and used');
  ok(emu.files.has(`${sc.DIR}/photos/${J.id}/${J.photos[0].id}-clean.jpg`), 'the cleaned photo is saved next to the original');
  ok(/Levi's džinsinis švarkas, M dydis \/ Levi's denim jacket, size M/.test(L.title), 'title in both languages: ' + L.title);
  ok(/\n\nA classic Levi's/.test(L.description), 'description in Lithuanian, then English');
  ok(L.catalogId === 2527 && /Vyrams/.test(L.catalogPath), 'category chosen: ' + L.catalogPath);
  ok(L.brandId === 10 && L.brandTitle === "Levi's", "brand matched to Vinted's Levi's");
  ok(L.conditionId === 2, 'condition: very good (2)');
  ok(JSON.stringify(L.attrs) === JSON.stringify({ size: [208], material: [303, 44] }), 'size M and materials from ✦ fields: ' + JSON.stringify(L.attrs));
  ok(JSON.stringify(L.colorIds) === '[9]', 'colour blue');
  ok(L.packageSizeId === 2, 'parcel size: medium');
  ok(L.price === 21, `price: 26 € (Vinted's optimal) − 20% = ${L.price}`);
  ok(!J.err, 'no error: ' + (J.err || ''));
  console.log('Technical details');
  ok(state.specsAsked === 1 && JSON.stringify(state.specsTools) === JSON.stringify([{ type: 'web_search_20250305', name: 'web_search', max_uses: 4 }]), "✦ looked the jacket up with Claude's web search tool");
  ok(J.specs && J.specs.list.length === 6 && J.specs.match === 'exact' && J.specs.via === 'web', 'six technical details, for the exact product');
  ok(J.specs.sources[0] && J.specs.sources[0].url === 'https://www.example-shop.lt/jacket-specs', 'the cited page is kept as the source');
  ok(/\n\nTechniniai duomenys \/ Technical details:\n• Medžiaga \/ Material: 100 % medvilnė/.test(L.description) && /• Svoris \/ Weight: ≈ 850 g$/.test(L.description), 'the details close the description, under a heading');
  ok(/Levi's Original Trucker Jacket/.test(await page.textContent('#itemsheet .specs')) && /✓ At the end of the description/.test(await page.textContent('#itemsheet .specs')), 'the item shows them with where they came from');
  const usage0 = JSON.parse(emu.files.get(sc.DIR + '/usage.json').toString());
  ok(usage0.p.anthropic.features.specs.searches === 2, 'the web searches are counted apart from tokens');
  await page.click('#itemsheet [data-act="specs"]');
  await until(`!document.querySelector('#itembusy .busybox')`, null, 20000); await sleep(500);
  const J2 = items().find((x) => x.id === jacket.id);
  ok(J2.listing.description.split('Techniniai duomenys').length === 2, 'looking up again replaces the block, never repeats it');
  // The cut-out: white around the item, the item's own colour in the middle
  const px = await page.evaluate(async (b64) => {
    const i = new Image(); i.src = 'data:image/jpeg;base64,' + b64; await i.decode();
    const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const x = c.getContext('2d'); x.drawImage(i, 0, 0);
    const at = (fx, fy) => Array.from(x.getImageData(Math.round(i.width * fx), Math.round(i.height * fy), 1, 1).data.slice(0, 3));
    return { w: i.width, h: i.height, corner: at(0.02, 0.02), middle: at(0.5, 0.5) };
  }, emu.files.get(`${sc.DIR}/photos/${J.id}/${J.photos[0].id}-clean.jpg`).toString('base64'));
  if (SHOTS) J.photos.forEach((p, i) => fs.writeFileSync(path.join(OUT, `clean-${i + 1}.jpg`), emu.files.get(`${sc.DIR}/photos/${J.id}/${p.id}-clean.jpg`)));
  ok(px.corner.every((v) => v > 245), 'cut-out corner is white ' + px.corner);
  ok(px.middle[2] > px.middle[0] + 40, 'cut-out middle is the denim blue, though the mask had a hole there ' + px.middle);
  ok(Math.abs(px.w / px.h - 0.75) < 0.02, `cut-out keeps the photo's shape (${px.w}×${px.h})`);

  console.log('Stickers and the QR code');
  const deco = await page.evaluate(async ([clean, orig]) => {
    const look = async (b64) => {
      const i = new Image(); i.src = 'data:image/jpeg;base64,' + b64; await i.decode();
      const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const x = c.getContext('2d'); x.drawImage(i, 0, 0);
      const d = x.getImageData(0, 0, i.width, i.height).data; let dark = 0, colour = 0;
      for (let k = 0; k < d.length; k += 4) { if (d[k] + d[k + 1] + d[k + 2] < 120) dark++; if (Math.max(d[k], d[k + 1], d[k + 2]) - Math.min(d[k], d[k + 1], d[k + 2]) > 90) colour++; }
      return { w: i.width, h: i.height, dark, colour };
    };
    const plain = await look(clean);
    const a = await window.__decorate(clean, { stickers: true, qr: true, seed: 5, max: 1600 });
    const b = await window.__decorate(orig, { stickers: true, qr: false, seed: 6, max: 1600 });
    const c = await window.__decorate(clean, { stickers: false, qr: false, seed: 5, max: 1600 });
    return { plain, a: await look(a.b64), b: await look(b.b64), c: await look(c.b64), A: a.b64, B: b.b64 };
  }, [emu.files.get(`${sc.DIR}/photos/${J.id}/${J.photos[0].id}-clean.jpg`).toString('base64'), emu.files.get(`${sc.DIR}/photos/${J.id}/${J.photos[1].id}.jpg`).toString('base64')]);
  if (SHOTS) { fs.writeFileSync(path.join(OUT, 'decorated-main.jpg'), Buffer.from(deco.A, 'base64')); fs.writeFileSync(path.join(OUT, 'decorated-orig.jpg'), Buffer.from(deco.B, 'base64')); }
  ok(deco.a.w === deco.plain.w && deco.a.h >= deco.plain.h, `decorated photo keeps its width (${deco.plain.w}×${deco.plain.h} → ${deco.a.w}×${deco.a.h})`);
  ok(deco.a.dark > deco.plain.dark + 2000, `the QR code is drawn (${deco.plain.dark} → ${deco.a.dark} dark pixels)`);
  ok(deco.a.colour > deco.plain.colour + 500, `stickers are drawn (${deco.plain.colour} → ${deco.a.colour} colourful pixels)`);
  ok(Math.abs(deco.c.dark - deco.plain.dark) < 400, 'nothing is added when both are off');
  await page.click('#itemsheet [data-act="decoprev"]');
  await until(`document.querySelectorAll('#decoview .dv-ph img').length === 2`, null, 20000);
  await shot('3b-preview');
  ok(true, 'the buyer preview shows both photos decorated');
  await page.click('#decoview [data-act="decoclose"]');

  console.log('Vinted says no, in detail');
  state.reject = { code: 99, message: 'Rasta klaidų', message_code: 'validation_error', errors: [{ field: 'manufacturer_labelling', value: 'Nurodykite gamintojo informaciją' }, { field: 'price', value: 'Kaina per maža' }], payload: {} };
  await page.evaluate(() => { const s = document.getElementById('itemsheet'); s.scrollTop = s.scrollHeight; });
  await page.click('#itemsheet [data-act="post"]'); await page.click('#itemsheet [data-act="post"]');
  await until(`!!document.querySelector('#itemsheet .errbox')`, null, 30000).catch(() => {});
  await until(`!!document.querySelector('#itemsheet .errbox .eb-list')`, null, 60000);
  const eb = await page.textContent('#itemsheet .errbox');
  ok(/Vinted didn't take the item/.test(eb) && /Rasta klaidų/.test(eb) && /validation_error/.test(eb) && /HTTP 400/.test(eb), "the headline, Vinted's words, its code and the HTTP status");
  ok(/Manufacturer labelling/.test(eb) && /Nurodykite gamintojo informaciją/.test(eb) && /Price/.test(eb) && /Kaina per maža/.test(eb), 'each problem with its field in plain words');
  await page.evaluate(() => document.querySelectorAll('#itemsheet .errbox details').forEach((d) => { d.open = true; }));
  ok(/"catalog_id": 2527/.test(await page.textContent('#itemsheet .errbox')), 'what Vintly sent is there to compare');
  ok(/1 problem|2 problems/.test(await page.textContent('#itemsheet .err-jump')), 'next to the Post button: how many problems, a tap from the details');
  await sleep(700);
  const vis = await page.$eval('#itemsheet .errbox', (e) => { const r = e.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: innerHeight, st: document.getElementById('itemsheet').scrollTop }; });
  ok(vis.top < vis.h && vis.bottom > 0, 'the details scroll into view by themselves ' + JSON.stringify(vis));
  await shot('4a-error');
  await page.click('#itemsheet [data-act="copyerr"]'); await sleep(400);
  ok(/Rasta klaidų/.test(emu.pasteboard || '') && /Vintly sent/.test(emu.pasteboard || ''), 'Copy the details puts all of it on the clipboard');
  ok(!(state.posted || []).length, 'nothing posted');

  console.log('Post it');
  await page.evaluate(() => { const s = document.getElementById('itemsheet'); s.scrollTop = s.scrollHeight; });
  await page.click('#itemsheet [data-act="post"]');
  ok(/Tap again/.test(await page.textContent('#itemsheet [data-act="post"]')), 'the first tap only asks to confirm');
  ok(!(state.posted || []).length, 'nothing posted yet');
  await page.click('#itemsheet [data-act="post"]');
  await until(`!!document.querySelector('#itemsheet .banner.ok')`, null, 60000);
  await shot('4-posted');
  const P = state.posted && state.posted[0];
  ok(!!P, 'Vinted got one item');
  if (P) {
    const it = P.item;
    ok(P.upload_session_id && it.temp_uuid === P.upload_session_id && P.push_up === false, 'upload session and temp_uuid match');
    ok(it.assigned_photos.length === 2 && it.assigned_photos.every((p) => p.id > 37591437400 && p.orientation === 0), 'both photos uploaded and assigned');
    ok(it.catalog_id === 2527 && it.brand_id === 10 && it.brand === "Levi's", 'category and brand sent');
    ok(it.price === '21' && it.currency === 'EUR', 'price "21" EUR');
    ok(JSON.stringify(it.item_attributes) === JSON.stringify([{ code: 'condition', ids: [2] }, { code: 'size', ids: [208] }, { code: 'material', ids: [303, 44] }]), 'condition, size and material sent');
    ok(JSON.stringify(it.color_ids) === '[9]' && it.package_size_id === 2, 'colour and parcel size sent');
    ok(it.ai_photo === false, 'kept-pixel photos are not marked as AI photos');
  }
  const done = items().find((x) => x.id === jacket.id);
  ok(done.status === 'posted' && done.vinted.url === 'https://www.vinted.lt/items/10690000001', 'saved as posted with its Vinted link');
  const uploads = emu.requests.filter((r) => /images\/edits/.test(r.url)).length;
  ok(uploads === 2, 'two image requests (one per photo)');
  const usage = JSON.parse(emu.files.get(sc.DIR + '/usage.json').toString());
  ok(usage.p.openai.features.cleanup.calls === 2 && usage.p.anthropic.features.listing.calls === 1 && usage.p.anthropic.features.sort.calls === 1, 'token usage counted per feature');

  await page.click('#itemsheet [data-act="close"]');

  console.log('Messages');
  ok((JSON.parse(emu.files.get(sc.DIR + '/settings.json').toString()).vintedUser || {}).id === 98765432, 'the sign-in check asks Vinted who you are (/users/current) and keeps your id');
  await until(`(document.querySelector('[data-act="tab"][data-v="msgs"] .n.hot') || {}).textContent === '2'`, null, 20000);
  ok(true, 'the Messages tab shows 2 unread, loaded on open');
  await page.click('[data-act="tab"][data-v="msgs"]');
  await until(`document.querySelectorAll('#main .conv').length === 3`);
  ok((await page.$$('#main .conv.unread')).length === 2, 'three conversations, two unread');
  await shot('6-messages');
  await page.click('#main .conv[data-v="c0a8-01"]');
  await until(`document.querySelectorAll('#convsheet .bub').length === 3`);
  ok((await page.$$('#convsheet .bub.me')).length === 1, 'your own message is on your side');
  ok(/už 8 €/.test(await page.textContent('#convsheet .bub.them:last-of-type')), "the buyer's last message is shown");
  ok(state.convs[0].unread === false, 'opening it marks it as read on Vinted');
  await page.fill('#replybox', 'Sutinku, 8 € tinka! 🙂');
  await page.click('#convsheet [data-act="replysend"]:not([data-v])');
  await until(`document.querySelectorAll('#convsheet .bub').length === 4`);
  ok(state.replies && state.replies[0].content === 'Sutinku, 8 € tinka! 🙂' && state.replies[0].is_personal_data_sharing_check_skipped === false, 'the reply reached Vinted');
  ok(await page.$eval('#replybox', (t) => t.value === ''), 'the reply box is empty again');
  await shot('7-conversation');
  await page.click('#convsheet [data-act="convclose"]');
  await until(`(document.querySelector('[data-act="tab"][data-v="msgs"] .n') || {}).textContent === '1'`);
  ok(true, 'one unread left');

  console.log('Pull to refresh');
  state.convs.unshift({ id: 'c0a8-04', who: 'jonas_p', item: 'Rūšiuoklis su formomis / Shape sorter', k: 'c2', unread: true, msgs: [['them', 'Ar dar turite?', 1]] });
  const drag = async (dy) => page.evaluate((dy) => {
    const t = document.querySelector('#main'), fire = (type, y) => { const e = new Event(type, { bubbles: true }); e.touches = y == null ? [] : [{ clientY: y }]; t.dispatchEvent(e); };
    fire('touchstart', 100); for (let y = 100; y <= 100 + dy; y += 20) fire('touchmove', y); fire('touchend');
  }, dy);
  await drag(60);
  await sleep(300);
  ok(!(state.convs[0].seen), 'a short drag only bounces back');
  ok(await page.$eval('#ptr', (e) => !e.classList.contains('busy')), 'no refresh for a short drag');
  await drag(200);
  ok(await page.$eval('#ptr', (e) => e.classList.contains('busy') && /Checking/.test(e.textContent)), 'a long drag refreshes, with a spinner');
  await until(`(document.querySelector('[data-act="tab"][data-v="msgs"] .n') || {}).textContent === '2' && !document.querySelector('#ptr.busy')`, null, 20000);
  ok(true, 'the new message came in and the spinner is gone');

  console.log('Your listings');
  await page.click('[data-act="tab"][data-v="posted"]');
  await until(`document.querySelectorAll('#main [data-act="vopen"]').length === 5`);
  ok(/Sold/.test(await page.textContent('#main')) && /Reserved/.test(await page.textContent('#main')), 'sold and reserved listings are marked');
  await shot('8-listings');
  await page.click('#main [data-act="vopen"][data-v="7700000003"]');
  await until(`document.querySelector('#vsheet.open [data-act="vdel"]')`);
  await page.click('#vsheet [data-act="vdel"]');
  ok(/Confirm/.test(await page.textContent('#vsheet [data-act="vdel"]')) && !(state.deleted || []).length, 'the first tap only asks to confirm');
  await page.click('#vsheet [data-act="vdel"]');
  await until(`document.querySelectorAll('#main [data-act="vopen"]').length === 4`);
  ok(JSON.stringify(state.deleted) === '[7700000003]', 'the maze was deleted on Vinted (POST /items/<id>/delete)');
  ok(!(await page.$('#vsheet.open')), 'its sheet closed');

  console.log('Widget');
  emu.presented = null;
  const w = JSON.parse(emu.files.get(sc.LOCAL + '/vintly-widget.json').toString());
  ok(w.todo === 2 && w.recent.length === 1 && w.posted7 === 1, 'widget snapshot: 2 to post, 1 posted this week');
  ok(w.signedIn && w.unread === 2 && w.convs.length === 4 && w.convs[0].unread && w.listings === 3 && w.sold === 1, `widget snapshot: 2 unread messages, 3 listings, 1 sold (${w.unread}, ${w.listings}, ${w.sold})`);
  ok(!JSON.stringify(w).includes('8 €'), 'the widget never holds message texts');

  ok(!emu.errors.length, 'no script or page errors' + (emu.errors.length ? ': ' + emu.errors.join(' | ').slice(0, 400) : ''));
  await emu.close();

  // ── Without an AI key: Vinted's own guesses, then you fill in the rest, and save a draft ──
  console.log('Without AI');
  const fx2 = sc.fixtures({ noKey: true, state: { next: 'sneakers' } }), st2 = fx2.state;
  const emu2 = new Emulator({ browser, fixtures: fx2, scriptPath: path.join(ROOT, 'Vintly.js'), now: sc.now, log: (s) => { if (process.env.VERBOSE) console.log(s); } });
  emu2.run();
  const p2 = (await emu2.waitForPresent())._page;
  const items2 = () => JSON.parse(emu2.files.get(sc.DIR + '/items.json').toString());
  global.__dbg = { page: p2, items: items2, emu: emu2 };
  await sleep(3200);
  await p2.click('.card[data-v="sneakers"]');
  ok(!(await p2.$('#itemsheet [data-act="prepare"]')) && !!(await p2.$('#itemsheet .badge-ex')), 'no ✦ Prepare without a key; "no AI" is said');
  await p2.click('#itemsheet [data-act="fill"]');
  await p2.waitForFunction(`/Sportbačiai/.test(document.querySelector('#itemsheet').innerText) && !document.querySelector('#itembusy .steps')`, null, { timeout: 30000, polling: 100 });
  ok(items2().find((x) => x.id === 'sneakers').listing.catalogId === 2632, "Vinted's own category guess is used");
  const fill = async (sel, v) => { await p2.fill(sel, v); await p2.$eval(sel, (el) => el.blur()); await sleep(450); };   // blur: change, then the sheet redraws
  await fill('#itemsheet [data-k="title"]', 'Balti sportbačiai, 40 dydis');
  await fill('#itemsheet [data-k="description"]', 'Balti sportbačiai, avėti, švarūs.');
  await fill('#itemsheet [data-k="price"]', '12,5');
  await p2.click('#itemsheet [data-act="attrchip"][data-code="size"][data-v="57"]'); await sleep(450);   // six sizes or fewer: chips
  await p2.selectOption('#itemsheet [data-k="conditionId"]', '3'); await p2.$eval('#itemsheet [data-k="conditionId"]', (el) => el.blur()); await sleep(450);
  await p2.click('#itemsheet [data-act="catopen"]'); await p2.fill('#catq', 'arbatinukai'); await p2.click('#itemsheet [data-act="catgo"]');
  await p2.waitForFunction(`document.querySelectorAll('#itemsheet .pick [data-act="catpick"]').length > 0`, null, { timeout: 10000 });
  ok(/Arbatinukai/.test(await p2.textContent('#itemsheet .pick')), 'category search finds "Arbatinukai ir kavinukai"');
  await p2.click('#itemsheet [data-act="catopen"]');
  const S2 = items2().find((x) => x.id === 'sneakers').listing;
  ok(S2.title === 'Balti sportbačiai, 40 dydis' && S2.titleSet, 'typed title saved');
  ok(S2.price === 12.5 && S2.priceSet, 'price with a decimal comma: 12.5');
  ok(JSON.stringify(S2.attrs.size) === '[57]' && S2.conditionId === 3, 'size 40 and condition good chosen by hand');
  await p2.click('#itemsheet [data-act="draft"]');
  await p2.waitForFunction(`!!document.querySelector('#itemsheet .banner.ok')`, null, { timeout: 30000, polling: 100 });
  const D = st2.posted && st2.posted[0];
  ok(!!(D && D.draft && D.draft.catalog_id === 2632 && D.draft.price === '12.5'), 'a draft reached Vinted (/item_upload/drafts)');
  ok(/Finish it on Vinted/.test(await p2.textContent('#itemsheet')), 'the draft links to its Vinted page');
  ok(!emu2.requests.some((r) => /anthropic|openai/.test(r.url)), 'no AI request without a key');
  ok(!emu2.errors.length, 'no script or page errors' + (emu2.errors.length ? ': ' + emu2.errors.join(' | ').slice(0, 400) : ''));
  if (SHOTS) await p2.screenshot({ path: path.join(OUT, '5-draft.png') });
  await emu2.close(); await browser.close();
  console.log(fails ? `\n${fails} check(s) failed` : '\nAll checks passed');
  process.exit(fails ? 1 : 0);
})().catch(async (e) => {
  console.error(e);
  try { const g = global.__dbg; if (g) { await g.page.screenshot({ path: path.join(OUT, 'fail.png') }); console.log(await g.page.evaluate(() => document.querySelector('#itemsheet').innerText.slice(0, 1500))); console.log(JSON.stringify(g.items().map((x) => ({ id: x.id, err: x.err, status: x.status, L: x.listing, photos: x.photos })), null, 0).slice(0, 2500)); console.log(g.emu.requests.map((r) => r.method + ' ' + r.url.slice(0, 90)).join('\n')); } } catch (x) { console.error(x); }
  process.exit(1);
});
