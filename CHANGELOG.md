# Changelog

All notable changes to Vintly. Generated from `releases.json`; edit that file, not this one.

## 1.3.0 (2026-11-06): Pull to refresh

- ⬇️ **Pull to refresh**: Drag the list down from the top to check Vinted for new messages and listing changes.
- 💬 **New messages, right away**: The unread count, your conversations and your listings all update in one pull.
- 🔑 **Sign-in checked too**: If your Vinted session ended, the pull says so instead of showing old numbers.

**Changes**

- Pull the main list down from the very top: past the line it says Release to refresh, then a spinner shows while Vintly checks Vinted
- One pull refreshes your messages, the unread count and your listings, on any tab; the widget is updated too
- If the sign-in is more than an hour old or ended, the pull checks it first and tells you when you need to sign in again
- The Refresh buttons stay for when a gesture is awkward

## 1.2.0 (2026-11-06): See what's happening

- 🩺 **Vinted's errors, in full**: Each problem Vinted reports, by field, with what it sent back and a copy button.
- 🔍 **Watch your photos being scanned**: A scan line sweeps over the photo being cleaned, read or uploaded.
- 📊 **A livelier progress bar**: It glides as work goes on, with the percentage and the time so far.

**Changes**

- When Vinted refuses an item, Vintly lists each problem with the field in plain words (Price, Brand, Manufacturer labelling…), Vinted's own message and code, and the HTTP status
- What Vinted sent back and what Vintly sent are one tap away; Copy the details puts it all on the clipboard
- A new error scrolls into view by itself, and a short note by the Post button says how many problems there are
- While preparing or posting, the photo being worked on is scanned (teal while cleaning, amber while ✦ AI reads, blue while uploading), also in a bigger preview above the bar
- The progress bar moves through the whole job (cleaning, reading, Vinted's fields, uploading) with stripes and a glow, its percentage and the seconds so far; item cards show it too
- Fixed in testing before release: uploading photos for a post could stop at once

## 1.1.0 (2026-11-06): Messages, listings and stickers

- 💬 **Vinted messages in Vintly**: Unread count on open and on the widget; read and reply right here.
- 🗑️ **Your listings, with delete**: Every listing with views and favourites; delete one with two taps.
- 🦄 **Stickers and a QR code**: Fun stickers around the item and a Vintly QR code on the main photo.

**Changes**

- Messages tab: your Vinted conversations, unread first in the count, loaded every time Vintly opens and every 2 minutes while it's open (Settings › Vinted)
- Open a conversation to read it all and reply; it's marked as read on Vinted. If Vinted thinks a reply shares personal details, you can send it anyway
- The widget leads with your unread Vinted messages and who wrote (never the messages themselves), then what waits to be posted
- On Vinted tab: all your listings, also those posted from the website, with views, favourites, sold, reserved and hidden; open one on Vinted or delete it with two taps
- Stickers for kids (all items, kids' items only, or off) around the item on the photos sent to Vinted, never over it; your own photos stay as they are
- Vintly's QR code on the main photo, linking to its GitHub page; Vintly makes room under the photo when the item fills the corners. Vinted's rules don't allow links, so it can be turned off
- 👀 See the photos as buyers will, from any item
- Cut-outs keep everything inside the item's outline: screens, prints and dark parts the image model leaves out are filled back in
- Fixed: the sign-in check now asks Vinted who you are, so it can't say “signed in” when you aren't

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
