// 05 sorting photos when AI's answer isn't clean JSON: text with braces before it, keys without quotes, a comment
const { scenario, ai } = require(process.env.TESTKIT || '../../../app-blueprints/testkit');

const JPG = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAeACgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDeooor509sKKKKACiiigAooooAKKKKACiiigD/2Q==';
const MESSY = 'Looking at the photos, {1, 2} show pink Nike shoes and {3} shows white Stan Smiths.\n' +
  '```json\n{ groups: [[1, 2], // the pink ones\n [3],], names: [\'Pink Nike running shoes\', "Adidas Stan Smith"] }\n```';

scenario('sorting with a messy AI answer', async (t) => {
  let asked = 0;
  const app = await t.open({
    kc: { VINTLY_ANTHROPIC_KEY: 'sk-ant-test' },
    routes: ai({ answers: [[/sort photos into items/, () => { asked++; return MESSY; }]] }),
  });
  await app.until(() => app.win() && app.win().__booted, 8000, 'the page');
  const w = app.win();
  for (let i = 0; i < 3; i++) w.__imp.push({ b64: JPG, t: JPG, w: 40, h: 30 });
  w.__hostBridge('vintly://a?d=' + encodeURIComponent(JSON.stringify({ type: 'import', n: 3, target: '', source: 'camera' })));
  await app.until(() => app.$$('#batchsheet.open .grp-item:not(.new)').length === 2, 8000, 'two groups');
  t.check(/Pink Nike running shoes/.test(app.text('#batchsheet')) && /Adidas Stan Smith/.test(app.text('#batchsheet')), "AI's names are read from the messy answer");
  t.check(app.$$('#batchsheet .grp-item:not(.new)')[0].querySelectorAll('.gi-ph img').length === 2, 'the first item has its two photos');
  t.check(asked === 1, 'it was read the first time, no second ask');
  t.check(!/JSON Parse error/.test(app.text('#toast') || ''), 'no parse error shown');
  await t.close(app);
});
