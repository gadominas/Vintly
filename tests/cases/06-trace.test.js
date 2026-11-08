// 06 the detailed log: a run that didn't close normally is noted, steps and page errors are written down, the log is copied, a normal close is marked
const { scenario } = require(process.env.TESTKIT || '../../../app-blueprints/testkit');

const CRASHED = '08:00:00.000 +0.0s  session started · Vintly 1.9.1\n08:00:05.100 +5.1s  page job __barcode → 812 KB';

scenario('the detailed log', async (t) => {
  const app = await t.open({ files: (h) => ({ [h.local('vintly-trace.log')]: CRASHED }) });
  await app.until(() => app.win() && app.win().__booted, 8000, 'the page');
  const log = () => String(app.files[app.local('vintly-trace.log')] || '');

  t.step('A. The run before');
  await app.until(() => app.$('.lastrun'), 3000, 'the note');
  t.check(/didn't close normally/.test(app.text('.lastrun')) && /__barcode/.test(app.text('.lastrun pre')), "the list says the run before didn't close normally, with its last steps");
  t.check(String(app.files[app.local('vintly-trace-prev.log')] || '') === CRASHED, 'its log is kept as the run before');

  t.step('B. This run is written down');
  await app.until(() => /page started/.test(log()), 3000, 'the page start');
  t.check(/session started · Vintly/.test(log()) && /boot: reading data/.test(log()), 'start-up steps are in the log');
  const w = app.win(); w.dispatchEvent(new w.ErrorEvent('error', { message: 'Boom in the page', filename: 'x.html', lineno: 3, colno: 7 }));
  await app.until(() => /ERROR in page: Boom in the page/.test(log()), 3000, 'the page error');
  t.check(true, "the page's own errors are in the log");
  for (const k of ['pageErrors', 'consoleErrors']) { const L = app.log[k] || []; for (let i = L.length - 1; i >= 0; i--) if (/Boom in the page/.test(String(L[i]))) L.splice(i, 1); }   // raised on purpose

  t.step('C. Copy the log');
  app.tap('.lastrun [data-act="lastrun-copy"]');
  await app.until(() => app.log.copied.length, 3000, 'the copy');
  const txt = app.log.copied[app.log.copied.length - 1];
  t.check(/===== this run =====/.test(txt) && /===== the run before \(didn't close normally\) =====/.test(txt) && /__barcode/.test(txt), 'the copy holds this run and the one before');
  await app.until(() => !app.$('.lastrun'), 2000, 'the note gone');
  t.check(true, 'the note goes once the log is copied');

  t.step('D. Off in Settings');
  app.tap('[data-act="cfgopen"]');
  await app.until(() => app.$('[data-act="toggle"][data-v="traceLog"]'), 3000, 'settings');
  t.check(app.$('[data-act="toggle"][data-v="traceLog"]').classList.contains('on'), 'the detailed log is on to start with');
  app.tap('[data-act="toggle"][data-v="traceLog"]');
  await app.until(() => app.json(app.path('settings.json')) && app.json(app.path('settings.json')).traceLog === false, 3000, 'saved');
  await app.wait(900);   // lines from just before are still saved
  const n = log().length;
  app.tap('[data-act="tracecopy"]');
  await app.wait(400);
  t.check(log().length === n, 'nothing more is written once it is off');
  await t.close(app);
});
