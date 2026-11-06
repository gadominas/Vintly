# Blueprints

Vintly follows the shared blueprints in https://github.com/gadominas/app-blueprints.
The script's `BLUEPRINTS` block is the source of truth; this table mirrors it and adds deviations.

| Blueprint | Version | Since app version | Deviations |
| --- | --- | --- | --- |
| [stability-patterns](https://github.com/gadominas/app-blueprints/blob/stability-patterns-v1.0.0/blueprints/stability-patterns.md) | 1.0.0 | 1.0.0 | None. Checked with `no-icloud-check.js` (app, widget, installer). Vinted's category cache and the widget snapshot are on the phone (`FileManager.local()`), as caches |
| [in-app-updates](https://github.com/gadominas/app-blueprints/blob/in-app-updates-v1.0.1/blueprints/in-app-updates.md) | 1.0.1 | 1.0.0 | None |
| [settings](https://github.com/gadominas/app-blueprints/blob/settings-v1.1.2/blueprints/settings.md) | 1.1.2 | 1.0.0 | The header has no refresh button (Vintly has nothing to refresh): Settings sits left of **Add photos** instead. App sections: Vinted, Listings (with the AI settings row), Photos, then Privacy. Section cards are built by `cardSections()` after each render (as in Stockit). See the settings map below |
| [ai-configuration](https://github.com/gadominas/app-blueprints/blob/ai-configuration-v1.0.0/blueprints/ai-configuration.md) | 1.0.0 | 1.0.0 | `aiCall` takes photos (`images`, base64 JPEGs) as in Stockit and VisionX. **Photo cleanup** is an OpenAI image edit (`/v1/images/edits`), which `aiCall` can't send: it goes through `aiImageEdit()`, which reads the key the same way, records its tokens with `recordUsage("openai", <image model>, "cleanup", …)` after every request, and always uses OpenAI (Claude has no image output), whichever provider is **In use**. **What AI does** has two switches (Sort new photos into items, Clean photo backgrounds) and the image model menu, filled from the OpenAI key's `gpt-image*` models by `fetchModels` |
| [launch-screen](https://github.com/gadominas/app-blueprints/blob/launch-screen-v1.0.0/blueprints/launch-screen.md) | 1.0.0 | 1.0.0 | None. The name uses the app's `--display` font (`--sp-font`), as in Stockit |
| [widgets](https://github.com/gadominas/app-blueprints/blob/widgets-v1.1.0/blueprints/widgets.md) | 1.1.0 | 1.0.0 | Rows layout (no cells, pins or privacy mode: there are no amounts to hide beyond prices you post publicly). The model has no `at`: the snapshot only changes inside Vintly, which saves it on close and after preparing, posting or deleting |
| [ai-invitation](https://github.com/gadominas/app-blueprints/blob/ai-invitation-v1.2.1/blueprints/ai-invitation.md) | 1.2.1 | 1.0.0 | `window.canInvite` holds the card back while photos come in or an item is being prepared or posted |
| [usage-analytics](https://github.com/gadominas/app-blueprints/blob/usage-analytics-v1.1.0/blueprints/usage-analytics.md) | 1.1.0 | 1.0.0 | Event catalog below |

## Recipes

Coding rules every app follows (https://github.com/gadominas/app-blueprints/tree/main/recipes). They describe how the code is written, not a feature, so they aren't listed in the script's `BLUEPRINTS` block or in Built with.

| Recipe | Version | Since app version | Deviations |
| --- | --- | --- | --- |
| [safe-startup](https://github.com/gadominas/app-blueprints/blob/safe-startup-v1.1.0/recipes/safe-startup.md) | 1.1.0 | 1.0.0 | Data files: `items`, `usage`. The big list handed over in pieces is `items` (with thumbnails), 2 at a time. Deferred work at 0.7 s: photos shared to Vintly from the share sheet, then the Vinted sign-in check (every 6 h, or when signed out). Photos live in `Vintly/photos/<item>/`, read on demand with a time limit |

## Settings map (settings blueprint, Step 1)

| Value | Now | Control | Section |
| --- | --- | --- | --- |
| Colours, layout, text size, font | `theme`, `density`, `textSize`, `font` | Swatches, segmented controls | Appearance |
| Vinted site (`vinted.lt` …) | `vintedSite` | Menu | Vinted |
| Your Vinted account | the web view's session (cookies), never stored by Vintly | Sign in / Switch / Check | Vinted |
| Remove photos after posting | `removePhotosAfter` | Switch | Vinted |
| Listing language, second language | `lang`, `lang2` | Menus | Listings |
| Both languages in the title, a little humour | `bothTitles`, `humour` | Switches | Listings |
| Cleaning style (item's own pixels, AI studio photo, off) | `cleanStyle` | Segmented control | Photos |
| Sort new photos into items, clean photo backgrounds | `ai`, `aiClean` | Switches | AI settings › What AI does |
| Image model | `imageModel` | Menu | AI settings › What AI does |
| Price below the usual, rounding, lowest price | `priceBelowPct`, `priceRound`, `priceMin` | Tunables | Pricing |
| Photo size, soft edge, room around the item, photos per item | `photoMax`, `maskGrow`, `itemMargin`, `maxPhotos` | Tunables | Photos |
| Photos AI looks at, their size | `aiPhotos`, `aiPhotoPx` | Tunables | AI |
| Time limit for Vinted, category refresh | `vintedTimeout`, `catalogDays` | Tunables | Vinted |
| Keep posted items for | `keepPostedDays` | Tunable | Keeping items |
| Widget refresh, out of date after | `widgetRefreshMin`, `widgetStaleMin` (1440: used about once a day) | Tunables | Widget |
| To post / Posted tab | `tab` | Tabs | Remembered pick |
| Vinted signed in, last check | `vintedOk`, `vintedAt` | none | Internal state |
| Vinted's endpoints, colours cache, CSRF lookup, condition ids | code constants | none | Code |

## Usage events (usage-analytics, Step 4)

| Event | Properties |
| --- | --- |
| `app_open` | `layout`, `theme`, `ai_key`, `cleaning` (keep, studio, off), `signed_in` |
| `photos_added` | `photos`, `source` (camera, library, share) |
| `items_sorted` | `photos`, `items`, `provider` |
| `photos_cleaned` | `photos`, `ok`, `style` |
| `item_prepared` | `provider`, `photos`, `vinted` (fields filled), `seconds` |
| `item_posted` | `photos`, `mode` (post, draft), `cleaned` |
| `vinted_signed_in` | `site` (lt, pl, de …) |
| `app_updated` | `from`, `to` |
| `usage_opt_in`, `usage_test` | none |

Never sent: photos, titles, descriptions, prices, brands, categories, the Vinted account or anything read from Vinted.
