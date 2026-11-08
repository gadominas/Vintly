// 04 the photo viewer: a photo of a new batch opens large, moves to another item, is removed from the session; an item's photo too
const { scenario } = require(process.env.TESTKIT || '../../../app-blueprints/testkit');

const JPG = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAeACgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDeooor509sKKKKACiiigAooooAKKKKACiiigD/2Q==';
const ITEM = { id: 'i1', created: 1, status: 'ready', photos: [{ id: 'a' }, { id: 'b' }], notes: '', listing: { title: 'Kepurė' }, opts: {} };

scenario('photo viewer', async (t) => {
  const app = await t.open({
    files: (h) => ({ [h.path('items.json')]: JSON.stringify([ITEM]), [h.path('photos/i1/a.jpg')]: Buffer.from(JPG, 'base64'), [h.path('photos/i1/b.jpg')]: Buffer.from(JPG, 'base64') }),
  });
  await app.until(() => app.win() && app.win().__booted, 8000, 'the page');
  const w = app.win();

  t.step('A. A photo session of three: tap one to see it large');
  for (let i = 0; i < 3; i++) w.__imp.push({ b64: JPG, t: JPG, w: 40, h: 30 });
  w.__hostBridge('vintly://a?d=' + encodeURIComponent(JSON.stringify({ type: 'import', n: 3, target: '', source: 'camera' })));
  await app.until(() => app.$$('#batchsheet.open .gi-ph img').length === 3, 5000, 'the batch');
  app.tap(app.$$('#batchsheet .gi-ph img')[1]);
  await app.until(() => !app.$('#phview').hidden, 2000, 'the viewer');
  t.check(/Photo 2 of 3 · Item 1/.test(app.text('#phview .pv-top')), 'it opens on the photo tapped, with where it is');
  await app.until(() => /^data:image\/jpeg;base64,/.test(app.$('#phview .pv-stage img').src) && app.$('#phview .pv-stage img').src.length > 100, 3000, 'the full photo');
  t.check(true, 'the full-size photo is loaded');

  t.step('B. Move it to a new item, then step through');
  app.tap('#phview [data-act="pvmove"][data-v="new"]');
  await app.until(() => /Add 2 items/.test(app.text('#batchsheet')), 2000, 'two items');
  t.check(/Item 2/.test(app.text('#phview .pv-top')), 'the viewer says where it is now');
  app.tap('#phview [data-act="pvgo"][data-v="-1"]');
  t.check(/Photo 2 of 3/.test(app.text('#phview .pv-top')), '‹ goes to the photo before');

  t.step('C. Remove a photo from the session (two taps)');
  app.tap('#phview [data-act="pvrm"]');
  t.check(/Tap again/.test(app.text('#phview .pv-rm')), 'the first tap asks to confirm');
  app.tap('#phview [data-act="pvrm"]');
  await app.until(() => app.$$('#batchsheet .gi-ph img').length === 2, 3000, 'two photos left');
  t.check(!!(await app.within(() => /^2 photos/.test(app.text('#batchsheet .hint')), 3000)), 'the session has two photos');
  t.see('files', Object.keys(app.files).filter((f) => /_batch/.test(f)).join(' '));
  t.check(Object.keys(app.files).filter((f) => /photos\/_batch\/[^/]+\.jpg$/.test(f) && !/-t\.jpg$/.test(f)).length === 2, "the removed photo's file is gone");
  app.tap('#phview [data-act="pvclose"]');
  t.check(app.$('#phview').hidden, 'Close closes it');
  app.tap('#batchsheet [data-act="batchmake"]');
  await app.until(() => (app.json(app.path('items.json')) || []).length === 3, 3000, 'the new items');
  t.check(true, 'the two photos become two items');

  t.step("D. An item's photo, large, and removed");
  app.tap(app.$('.card.pc [data-v="i1"]').closest('.card').querySelector('.pc-top'));
  await app.until(() => app.$('#itemsheet.open .ph-img'), 3000, 'the item');
  app.tap('#itemsheet .ph-img[data-v="b"]');
  await app.until(() => !app.$('#phview').hidden, 2000, 'the viewer');
  t.check(/Photo 2 of 2/.test(app.text('#phview .pv-top')), 'the item photo opens large');
  app.tap('#phview [data-act="pvrm"]'); app.tap('#phview [data-act="pvrm"]');
  await app.until(() => (app.json(app.path('items.json')) || []).find((x) => x.id === 'i1').photos.length === 1, 3000, 'one photo left');
  t.check(/Photo 1 of 1 · Main/.test(app.text('#phview .pv-top')), 'the viewer moves to the photo left');
  await t.close(app);
});
