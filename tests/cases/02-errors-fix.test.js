// 02 errors in plain words and ✦ Fix with AI: an error is explained by AI on the card and in the item, Fix with AI changes the listing, posting progress stays in the button
const { scenario, ai } = require(process.env.TESTKIT || '../../../app-blueprints/testkit');

const L = (over) => Object.assign({ title: 'Vaikiški žieminiai batai', description: 'Šilti, mažai dėvėti vaikiški batai.', price: 2, catalogId: 1242, catalogPath: 'Vaikams › Avalynė › Batai', conditionId: 3 }, over);
const ai1 = { by: 'Claude', what: "children's winter boots", confidence: 0.9 };
const problem = { what: "Vinted didn't take the item", message: 'Rasta klaidų', code: 'validation_error', status: 400, problems: [{ field: 'price', label: 'Price', text: 'Kaina per maža šiai kategorijai' }], raw: '{"code":99,"message":"Rasta klaidų","errors":[{"field":"price","value":"Kaina per maža šiai kategorijai"}]}' };
const ITEMS = [
  { id: 'err1', created: 1, status: 'ready', photos: [{ id: 'e1' }], notes: '', ai: ai1, listing: L({}), opts: { attrs: [], cats: [{ id: 1242, path: 'Vaikams › Avalynė › Batai' }] },
    err: "Vinted didn't take the item: Price: Kaina per maža šiai kategorijai", errInfo: problem, errFrom: 'post' },
];

scenario('errors in plain words and Fix with AI', async (t) => {
  const app = await t.open({
    settings: { vintedOk: true, vintedAt: Date.parse('2026-10-29T08:00:00Z'), vintedUser: { id: 1, login: 'me' } },
    files: (h) => ({ [h.path('items.json')]: JSON.stringify(ITEMS) }),
    kc: { VINTLY_ANTHROPIC_KEY: 'sk-ant-test' },
    routes: ai({ answers: [
      [/explain errors/, { title: 'The price is too low', text: 'Vinted needs a higher price for children’s shoes. Raise it a little and post again.', fixable: true }],
      [/fix a Vinted listing/, { explain: 'Vinted wanted a higher price, so I raised it to 5 €.', changes: { price: 5 } }],
    ] }),
  });
  await app.until(() => app.win() && app.win().__booted, 8000, 'the page');
  const card = () => app.$('.card.pc [data-v="err1"]').closest('.card');

  t.step('A. The error in plain words, on the card');
  await app.until(() => /The price is too low/.test(app.text(card())), 6000, 'the explanation on the card');
  t.see('card', app.text(card()));
  t.check(!/Rasta klaidų/.test(app.text(card())), "Vinted's own wording isn't on the card");
  t.check(!!card().querySelector('[data-act="aifix"]'), 'the card has ✦ Fix with AI');

  t.step('B. In the item: next to the Post button, details folded away');
  app.tap(card().querySelector('.pc-top'));
  await app.until(() => app.$('#itemsheet.open #postarea .errbox'), 3000, 'the error by the Post button');
  t.check(!app.$('#itembusy .errbox') && app.$$('#itemsheet .errbox').length === 1, 'the error shows once, by the button that failed');
  t.check(!!app.$('#postarea .errbox details') && !app.$('#postarea .errbox details').open, "Vinted's answer is under Details, closed");
  t.check(/Post again/.test(app.text('#postarea [data-act="post"]')), 'the button says Post again');

  t.step('C. ✦ Fix with AI');
  app.tap('#postarea [data-act="aifix"]');
  t.check(!!app.$('#postarea .progbtn'), 'the fix shows its progress where the button was');
  await app.until(() => (app.json(app.path('items.json')) || [])[0].listing.price === 5, 8000, 'the new price');
  await app.until(() => app.$('#postarea .fixnote'), 3000, 'what was changed');
  t.see('fixed', app.text('#postarea .fixnote'));
  t.check(/Price → 5/.test(app.text('#postarea .fixnote')) && !app.$('#itemsheet .errbox'), 'the change is listed and the error is gone');
  t.check(!(app.json(app.path('items.json')) || [])[0].err, 'the saved item has no error');
  t.check(!app.$('#postarea [data-act="post"]').disabled, 'Post is ready again');

  t.step('D. Posting: progress in the button, the sheet never scrolls');
  const sheet = app.$('#itemsheet'); sheet.scrollTop = 120; const before = sheet.scrollTop;
  app.tap('#postarea [data-act="post"]'); app.tap('#postarea [data-act="post"]');
  await app.until(() => app.$('#postarea .progbtn.k-post'), 2000, 'progress in place of Post');
  t.check(!app.$('#itembusy .busybox'), 'no progress box at the top');
  await app.until(() => !app.$('#postarea .progbtn'), 30000, 'the post to end');
  t.see('after', app.text('#postarea .errbox b'));
  t.check(sheet.scrollTop === before, 'the sheet stayed where it was');
  await t.close(app);
});
