# Testing

Vintly is one Scriptable script, so it can't run in a normal test runner. It follows the [testing recipe](https://github.com/gadominas/app-blueprints/blob/testing-v1.0.0/recipes/testing.md): the shared app-blueprints testkit runs the real script with stand-ins for Scriptable's objects and the page in jsdom.

## Run the tests

With [app-blueprints](https://github.com/gadominas/app-blueprints) cloned next to this repository:

```sh
(cd ../app-blueprints/testkit && npm ci)
node ../app-blueprints/testkit/bin/run.js    # lint and the conformance packs: all must pass before a release
node ../app-blueprints/testkit/bin/lint.js   # lint only
node ../app-blueprints/testkit/bin/run.js -v 01   # one scenario, every step
```

The same run happens on every push (`.github/workflows/tests.yml`). `tests/app.config.js` holds Vintly's per-app values.

## What it covers

- Lint: the script compiles, every button action is handled, no duplicate top-level names, every bridge navigation goes through `window.__hostBridge`, the BLUEPRINTS block is there, no API key in the script.
- Conformance packs: safe start-up, stability patterns (no iCloud on a phone without it), in-app updates (including the native shell), widgets and usage analytics.

## What it doesn't

- Vintly scenarios: `01-batch-list` (issues on each card, the price on the card, Post with Undo, Prepare all one by one) `02-errors-fix` (an error explained by AI, Fix with AI, progress in the Post button, no scrolling) `03-line-titles` (capital letters, two prepared at once, posts in line, a wrong check digit refused) and `04-photo-viewer` (a photo session's photo large, moved, removed; an item's photo removed). jsdom draws no images, so the barcode reader itself was checked in Chromium, not here. Sorting photos and a successful prepare or post aren't checked (no Vinted or AI fixtures yet).
- Vinted, Claude, OpenAI and PostHog aren't faked: every request fails like a phone without a connection.
- `tests/e2e.js` is an older end-to-end run in the Scriptable emulator (needs Playwright), with answers from `docs/site/scenario.js`: `node tests/e2e.js`.
- Looks, light and dark mode, and anything only a real iPhone does: check those on the phone.
