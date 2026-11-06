# Changelog

All notable changes to Vintly. Generated from `releases.json`; edit that file, not this one.

## 1.0.1 (2026-11-06): Signed in, for real

- 🔑 **Vinted sign-in works**: After you sign in, Vintly sees it straight away and loads Vinted's fields.
- ✦ **Prepare with AI works**: Cleaning photos and filling the listing no longer stop with a JavaScript error.
- 💬 **Clearer messages**: If Vinted can't be reached, Vintly says why instead of just “not signed in”.

**Changes**

- Fixed: every request to Vinted and every photo cleanup failed on iPhone with “JavaScript execution returned a result of an unsupported type”
- Fixed: Vintly said “Not signed in” after a successful sign-in; the check now runs in the page you signed in with
- The sign-in and Check messages say what went wrong when the check itself fails

## 1.0.0 (2026-11-06): Snap it, list it

- 📸 **Photos to listings**: Take a few photos of each thing; ✦ AI sorts them and writes every listing.
- 🪄 **Clean backgrounds**: The background goes and your item keeps its own pixels, on white.
- 🏷️ **Posted in one tap**: Vinted's own fields are filled in; check them, then post or save a draft.

**Changes**

- Take photos or choose them (or share them to Vintly from Photos); several items at once
- ✦ AI sorts a batch of photos into items; move any photo to another item by hand
- ✦ Photo cleanup with OpenAI's image model: keep the item's own pixels (cut along a drawn mask) or an AI studio photo
- ✦ Listings from photos with Claude or OpenAI: title and description in two languages (Lithuanian and English by default), with a little humour
- Vinted's categories, brands, sizes, conditions, colours, parcel sizes and price suggestions fill the form
- A fair price under what similar used items sell for (Settings › Pricing)
- Review every field, then post on Vinted or save a Vinted draft; sign in to Vinted inside Vintly
- Works without AI: fill in the listing yourself, Vintly still does the Vinted part
- Home Screen and Lock Screen widget, launch screen, Settings, in-app updates, opt-in anonymous usage counts (app-blueprints)
