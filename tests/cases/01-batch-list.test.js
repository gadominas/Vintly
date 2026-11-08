// 01 the list as a batch: issues on each card, the price changed on the card, Post with a 3-second undo, Prepare all
const { scenario } = require(process.env.TESTKIT || '../../../app-blueprints/testkit');

const L = (over) => Object.assign({ title: 'Vaikiški žieminiai batai', description: 'Šilti, mažai dėvėti vaikiški batai.', price: 12, catalogId: 1242, catalogPath: 'Vaikams › Avalynė › Batai', conditionId: 3 }, over);
const ai = { by: 'Claude', what: "children's winter boots", confidence: 0.9 };
const ITEMS = [
  { id: 'ready1', created: 1, status: 'ready', photos: [{ id: 'r1', w: 10, h: 10 }], notes: '', ai, listing: L({}), opts: { price: { low: 10, high: 16 } } },
  { id: 'miss1', created: 2, status: 'ready', photos: [{ id: 'm1', w: 10, h: 10 }], notes: '', ai, listing: L({ catalogId: null, catalogPath: '' }), opts: {} },
  { id: 'err1', created: 3, status: 'ready', photos: [{ id: 'e1', w: 10, h: 10 }], notes: '', ai, listing: L({}), opts: {}, err: 'Vinted said no: Price: too low' },
  { id: 'new1', created: 4, status: 'new', photos: [{ id: 'p1', w: 10, h: 10 }], notes: '', listing: {}, opts: {} },
  { id: 'new2', created: 5, status: 'new', photos: [{ id: 'p2', w: 10, h: 10 }], notes: '', listing: {}, opts: {} },
];

scenario('the list as a batch', async (t) => {
  const app = await t.open({
    settings: { vintedOk: true, vintedAt: Date.parse('2026-10-29T08:00:00Z'), vintedUser: { id: 1, login: 'me' } },
    files: (h) => ({ [h.path('items.json')]: JSON.stringify(ITEMS) }),
    kc: { VINTLY_ANTHROPIC_KEY: 'sk-ant-test' },
  });
  await app.until(() => app.win() && app.win().__booted, 8000, 'the page');
  await app.until(() => app.$$('.card.pc').length === 5, 4000, 'five cards');

  t.step('A. Every card says where it stands');
  const card = (id) => app.$(`.card.pc [data-v="${id}"]`).closest('.card');
  t.check(card('ready1').classList.contains('ready') && !!card('ready1').querySelector('.pc-flag.ok'), 'a ready item is marked ready, with a ✓');
  t.check(!!card('ready1').querySelector('[data-act="cpost"]'), 'a ready item has a Post button on the list');
  t.check(/Vinted suggests/.test(app.text(card('ready1'))), "Vinted's price range shows under the price");
  t.check(card('miss1').classList.contains('bad') && /Still needed: a category/.test(app.text(card('miss1'))), 'a missing field is named on the card');
  t.check(!!card('miss1').querySelector('.pc-fix') && !card('miss1').querySelector('[data-act="cpost"]'), 'it gets Fix instead of Post');
  t.check(card('err1').classList.contains('bad') && /too low/.test(app.text(card('err1'))) && !!card('err1').querySelector('.pc-flag.bad'), "an error shows on its card with a ⚠ sign");
  t.check(/2 items not prepared yet/.test(app.text('.prepbar')) && !!app.$('[data-act="prepall"]'), 'Prepare all is offered for the items not prepared');

  t.step('B. The price, changed on the card');
  app.tap(card('ready1').querySelector('[data-act="cprice"][data-v="1"]'));
  await app.until(() => (app.json(app.path('items.json')) || []).find((x) => x.id === 'ready1').listing.price === 13, 3000, 'the price saved');
  t.check(true, '+ raises the price by the rounding step and saves it');
  app.type(card('ready1').querySelector('.cprice'), '9,50');
  await app.until(() => (app.json(app.path('items.json')) || []).find((x) => x.id === 'ready1').listing.price === 9.5, 3000, 'the typed price saved');
  t.check(true, 'a typed price (with a comma) is saved');

  t.step('C. Post, then undo');
  app.tap(card('ready1').querySelector('[data-act="cpost"]'));
  await app.until(() => /Undo/.test(app.text(card('ready1').querySelector('[data-act="cpost"]'))), 2000, 'the countdown');
  t.check(true, 'Post counts down with Undo');
  app.tap(card('ready1').querySelector('[data-act="cpost"]'));
  await app.wait(250);
  t.check(app.text(card('ready1').querySelector('[data-act="cpost"]')) === 'Post', 'Undo stops it');
  t.check((app.json(app.path('items.json')) || []).find((x) => x.id === 'ready1').status !== 'posted', 'nothing was posted');

  t.step('D. Prepare all: one by one');
  app.tap('[data-act="prepall"]');
  // offline here, and without photo files: each one fails, and says so on its own card
  await app.until(() => ['new1', 'new2'].every((id) => card(id).classList.contains('bad')), 30000, 'both done');
  t.see('after', app.text(card('new2')));
  t.check(/Try again/.test(app.text(card('new2'))), 'a failed prepare offers Try again on the card');
  t.check(/1 ready to post/.test(app.text('.prepbar')) && /4 need a look/.test(app.text('.prepbar')), 'the bar counts ready and needs-a-look items');
  const log = app.startLog(), a = log.indexOf('prepare: '), b = log.indexOf('prepare: ', a + 1);
  t.check(a > -1 && b > a, 'both were prepared, one after the other');
  t.check(!app.$('.prepbar [data-act="prepstop"]'), 'the line is finished');
  t.check(['new1', 'new2'].every((id) => !(app.json(app.path('items.json')) || []).find((x) => x.id === id).queued), 'nothing is left in line');
  await t.close(app);
});
