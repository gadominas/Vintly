// 03 titles start with a capital letter, two items are prepared at once, posts go to Vinted one at a time
const { scenario, ai } = require(process.env.TESTKIT || '../../../app-blueprints/testkit');

const JPG = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAeACgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDeooor509sKKKKACiiigAooooAKKKKACiiigD/2Q==', 'base64');
const L = (t) => ({ title: t, description: 'Šilti, mažai dėvėti vaikiški batai.', price: 12, catalogId: 1242, catalogPath: 'Vaikams › Avalynė › Batai', conditionId: 3 });
const ai1 = { by: 'Claude', what: "children's winter boots", confidence: 0.9 };
const ready = (id, t) => ({ id, created: 1, status: 'ready', photos: [{ id: id + 'p' }], notes: '', ai: ai1, listing: L(t), opts: { attrs: [] }, fitAt: 1 });
const fresh = (id) => ({ id, created: 2, status: 'new', photos: [{ id: id + 'p' }], notes: '', listing: {}, opts: {} });
const ITEMS = [ready('r1', 'crocs vaikų žieminiai batai'), ready('r2', 'Kepurė'), fresh('n1'), fresh('n2'), fresh('n3')];
const listing = { what: 'boots', brand: '', category_words: ['batai'], condition: 'good', colors: [], materials: [], size: '27', parcel: 'M',
  barcode: '5901234123458', barcode_photo: 0, barcode_box: null, price_used: 10, title: { lt: 'žieminiai batai' }, description: { lt: 'Šilti batai.' }, confidence: 0.9 };

scenario('titles, two at once, posts in line', async (t) => {
  const app = await t.open({
    settings: { vintedOk: true, vintedAt: Date.parse('2026-10-29T08:00:00Z'), vintedUser: { id: 1, login: 'me' }, aiSpecs: false },
    files: (h) => Object.assign({ [h.path('items.json')]: JSON.stringify(ITEMS) },
      ...ITEMS.map((x) => ({ [h.path('photos/' + x.id + '/' + x.id + 'p.jpg')]: JPG, [h.path('photos/' + x.id + '/' + x.id + 'p-t.jpg')]: JPG }))),
    kc: { VINTLY_ANTHROPIC_KEY: 'sk-ant-test' },
    routes: ai({ answers: [[/prepare its listing|ONE second-hand item/, listing]] }),
  });
  await app.until(() => app.win() && app.win().__booted, 8000, 'the page');
  const card = (id) => app.$(`.card.pc [data-v="${id}"]`).closest('.card');
  const saved = (id) => (app.json(app.path('items.json')) || []).find((x) => x.id === id);

  t.step('A. Titles start with a capital letter');
  t.check(/^Crocs vaikų/.test(app.text(card('r1').querySelector('.c-t'))), 'a title saved in lower case shows with a capital');
  app.tap(card('r2').querySelector('.pc-top'));
  await app.until(() => app.$('#itemsheet.open .fin[data-k="title"]'), 3000, 'the item');
  app.type('#itemsheet .fin[data-k="title"]', 'vaikiška kepurė / kids hat');
  await app.until(() => saved('r2').listing.title === 'Vaikiška kepurė / Kids hat', 3000, 'the typed title, capitalised');
  t.check(true, 'a typed title is saved with a capital, each language part too');
  app.tap('#itemsheet [data-act="close"]');

  t.step('B. Two items prepared at once');
  // jsdom draws no images: the photo goes to AI as it is, a little slowly so the line can be seen (the barcode reader is checked in a browser)
  app.win().__scale = async (b64) => { await new Promise((r) => setTimeout(r, 600)); return { b64 }; };
  app.win().__decorate = async (b64) => { await new Promise((r) => setTimeout(r, 1500)); return { b64 }; };
  app.tap('[data-act="prepall"]');
  const both = await app.within(() => ['n1', 'n2', 'n3'].filter((id) => /✦ Preparing/.test(app.text(card(id)))).length === 2, 8000);
  t.see('cards', ['n1', 'n2', 'n3'].map((id) => app.text(card(id).querySelector('.chip'))).join(' | '));
  t.check(!!both, 'two are prepared side by side while the third waits');
  t.check(/2 at a time/.test(app.text('.prepbar')), 'the bar says so');
  await app.until(() => ['n1', 'n2', 'n3'].every((id) => saved(id).ai), 60000, 'all three read');
  t.check(['n1', 'n2', 'n3'].every((id) => saved(id).listing.title === 'Žieminiai batai'), "AI's lower-case title is saved with a capital");
  t.check(['n1', 'n2', 'n3'].every((id) => saved(id).ai.barcode === ''), 'digits with a wrong check digit are not used as a barcode');

  t.step('C. Posts go one at a time');
  app.tap(card('r1').querySelector('[data-act="cpost"]'));
  app.tap(card('r2').querySelector('[data-act="cpost"]'));
  const waited = await app.within(() => /Waiting to post · 2/.test(app.text(card('r2'))) || /Waiting to post · 2/.test(app.text(card('r1'))), 8000);
  t.check(!!waited, 'the second Post waits for the first');
  await app.until(() => !app.$$('.card.pc').some((c) => /Posting|Waiting to post/.test(app.text(c))), 60000, 'both posts to end');
  await t.close(app);
});
