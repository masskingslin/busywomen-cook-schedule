# Busywomen Cook Schedule

A month-long meal planner for busy women — breakfast, lunch, and dinner, with no dish repeated within the same week. Filter by Veg / Non-veg / South Indian and max cooking effort, scale the plan to your family size, then export a shareable grocery list, a Sunday batch-prep guide, a WhatsApp-ready summary, and a real calendar (.ics) file.

Plain HTML/CSS/JS — no build step, no framework, no server required.

## Project structure
```
index.html        the app shell
css/styles.css     all styling
js/data.js         the dish database + Amazon affiliate config
js/app.js          all app logic (scheduling, grocery list, prep guide, share, calendar export)
```

## Run it locally
Open `index.html` in any browser, or serve the folder with any static file server.

## Features
- **Filters** — Food type (All / Veg / Non-veg / South Indian), max effort (🌶 Easy / 🌶🌶 Up to Medium / 🌶🌶🌶 Any), family size (1 / 2 / 4 people), and a "Quick only" (≤20 min) toggle. "↺ Reset to defaults" restores everything, including meal times.
- **Live clock** — the header shows today's date and a running clock, ticking every second.
- **Today card + "today" highlight** — once you generate a schedule, a card at the top always shows today's breakfast/lunch/dinner, with a **NOW** badge on whichever meal matches the current time. The matching day further down in the full month grid gets a gold outline.
- **Generate Month Schedule** — builds 4 weeks of breakfast/lunch/dinner with zero repeats within any single week, pulling from 86 dishes (63 home-cooked with real ingredient lists, 23 ready-made/instant items).
- **Two buy buttons per home-cooked dish** — 📦 Ready-made (searches Amazon for a store-bought version) and 🛒 Ingredients (searches using the dish's actual ingredient list, not a generic name search). Ready-made/instant dishes show a single 📦 buy button since there's nothing to source separately.
- **🧒 Kids' Snacks & Drinks — separate tab** — tap the tab at the top to switch away from the meal planner entirely to a fixed list of 16 curated healthy snack/drink picks. Every buy button is a **💸 Best Price on Amazon** link sorted lowest-price-first, not a plain relevance search.
- **🛒 Smart Grocery Aggregator** — sums every ingredient across the full 4-week plan, scaled to your selected family size, with a per-item Amazon buy link and a "Copy to Clipboard" option.
- **⚡ Sunday Prep Guide** — looks at the current week's dishes, finds ingredients that repeat across multiple meals, and turns them into a batch-prep checklist (plus smart tips like "batch-cook rice" or "marinate proteins ahead" when relevant).
- **💬 Share Plan** — opens WhatsApp with today's breakfast/lunch/dinner pre-filled.
- **📅 Export .ics** — downloads a calendar file with an event for every meal over the next 28 days, using your chosen meal times and reminder offset (15 min / 30 min / 1 hr / 2 hr before, or none). Import it into Google Calendar, Outlook, or Apple Calendar.

## Amazon affiliate setup
Open `js/data.js` and edit the `CONFIG` object:
```js
const CONFIG = {
  amazonTag: "kingcloud-21",
  amazonDomain: "amazon.in"
};
```
- `amazonTag` only earns for you if it's from your own Amazon Associates account.
- `amazonDomain` must match the storefront your tag is registered on (`amazon.in`, `amazon.com`, etc.).
- The required Amazon Associates disclosure is already in the footer.

## Customize the menu
Add, remove, or edit dishes in `js/data.js`. Each home-cooked dish looks like:
```js
{
  name: "Poha",
  meal: "breakfast",              // breakfast | lunch | dinner
  category: "veg",                // veg | non-veg | south-indian
  effort: 1,                      // 1 = easy, 2 = moderate, 3 = weekend style
  time: 15,                       // minutes
  ingredients: [
    { name: "Poha (flattened rice)", qty: 1.5, unit: "cup" },
    { name: "Peanuts", qty: 2, unit: "tbsp" },
    { name: "Curry leaves", qty: 8, unit: "leaves" }
  ]
}
```
Ingredient quantities are written for a 2-person base serving — the grocery aggregator scales them automatically for the 1/2/4-person filter. Ready-made dishes just need `readymade: true` and a single ingredient entry naming the product itself.

## Deploy to GitHub Pages
1. Push this folder's contents to a GitHub repository — all of `index.html`, `css/styles.css`, `js/app.js`, and `js/data.js`. A common mistake is only re-uploading `index.html` and missing the `css/`/`js/` folders.
2. Go to **Settings → Pages**, set the source to the `main` branch and `/ (root)` folder.
3. Your app goes live at `https://<your-username>.github.io/<repo-name>/`.
4. After pushing an update, hard-refresh (Ctrl+Shift+R / Cmd+Shift+R) or test in an incognito window — browsers cache `.css`/`.js` aggressively, so a stale cache can make it look like your update didn't apply even when it did.

## Feedback (toast) notification fixes
The small confirmation pop-ups (e.g. "Schedule generated!", "Copied!") had two real bugs, both fixed:
- **Race condition** — firing two toasts in quick succession let the first message's leftover close-timer silently re-hide the second one a moment after it appeared. Timers are now properly tracked and cancelled on every call.
- **Hidden behind the bottom action bar** — the toast sat at a fixed height, but the floating action bar wraps onto two rows on narrow phones, which could cover the toast completely. It now measures the bar's real rendered height each time and always positions itself just above it.

### Further upgrade: queueing + colour + tiered share
- **Toasts now queue** instead of one clobbering another — firing several in a row (e.g. Export then Share) shows each in turn rather than losing one.
- **Each type has its own colour**, not just an icon: success is green, info is teal, error is red — readable as a shape/colour at a glance, not just by reading the text.
- **"Copy to Clipboard" is now "Share / Copy"** with four fallback tiers, each only used if the one before it isn't available:
  1. The native **Web Share API** (the phone's own share sheet — WhatsApp, Notes, Mail, etc.) where supported.
  2. The Clipboard API (silent copy).
  3. The legacy `execCommand('copy')` trick, for contexts where the Clipboard API doesn't exist.
  4. As an absolute last resort, a **visible, pre-selected text box** appears right in the grocery modal so you can select and copy by hand — instead of just being told to "copy manually" with nothing to copy from.

## v3 upgrade: overlap fix + search, themes, install, saved plans

### Bug fixed: cream panel overlapping the tab bar
`.controls-card` (the "Build your month" panel) had `margin: -16px ...` — written back when it sat directly under the dark hero, to tuck it neatly under the hero's bottom edge. Once a tab bar ("📅 Meal Schedule" / "🧒 Kids' Best Deals") was added between the hero and this panel, that same negative margin pulled the panel up over the tab buttons instead, covering them. Changed to a normal positive top margin.

### New features
- **🔍 Search** — a "Find a dish in your plan" box above the schedule highlights every matching meal across all 4 weeks and scrolls to the first match as you type.
- **📍 Today** — jumps straight to today's highlighted day-card.
- **💰 Budget picks** — a toggle that, once your other filters are applied, keeps only the cheaper half of the remaining dishes per meal. There's no real pricing data behind this (nothing in the app has actual grocery prices), so it's a transparent, documented estimate — `costIndex()` in `js/app.js` — based on effort level, prep time, ingredient count, and whether the dish is non-veg. It's for relative ranking only, never shown as an actual price.
- **🎨 Theme switcher** — 4 color presets (Teal, Berry, Ocean, Mono) via the swatches under the live clock. Only the accent palette changes; layout and readability stay the same. Your choice is remembered.
- **📲 Install App** — a real installable PWA now (`manifest.json` + `sw.js`). The button only appears when the browser actually supports installing (Chrome/Edge/Android; iOS Safari doesn't support the install-prompt API and won't show it — use Safari's own "Add to Home Screen" there instead).
- **📚 My Plans** — save the currently-generated month under a name, and load or delete saved plans later, independent of the single auto-saved "current" plan.
- **🚫 Excluded dishes** — check off any dish (allergy, picky eater, whatever) to permanently remove it from every future "Generate Month Schedule," across all tabs and filters.
- **🗑️ Clear saved plan** — wipes the auto-saved current plan and resets the screen to empty. Separate from "My Plans," which it does not touch.
- **📣 Share this app / 🔗 Copy link** — in the footer, for sending the page itself to someone else.
- **Persistence** — the current plan, your theme choice, and your excluded-dishes list are now saved in the browser's `localStorage` and restored automatically next time you open the app. (This only applies to this downloadable site — not to a preview rendered inside a chat conversation.)

All of the above were run through an automated regression suite (21 checks covering theme switching, budget-picks filtering, exclusion actually removing a dish from a freshly generated schedule, save/load, clear, search/jump smoke tests, and restoring a saved plan on load) before being shipped.

## v4 upgrade: more themes + install/offline polish

### 3 more theme presets + a custom colour picker
- Added **Sunset**, **Forest**, and **Lavender** alongside Teal/Berry/Ocean/Mono.
- Added a **Custom** swatch — tap it to open your device's native colour picker and set your own accent colour, layered on top of the base palette. Persisted separately from the preset choice.
- Bug caught by testing before shipping: the Custom swatch is a `<label>` wrapping a colour `<input>` (so tapping it opens the picker), but the generic swatch click-handler loop would have also fired on the label itself with no theme name to apply, corrupting the saved theme. Fixed by only wiring click handlers to the preset `<button>` swatches and handling the colour input's own `input` event separately.
- A second bug the tests caught: the Custom swatch's `<label>` was missing `data-theme="custom"`, so even after picking a colour, the swatch could never visually show itself as the active one. Added.

### Install App — real PWA polish
- **iOS fallback** — iOS Safari has no install-prompt API at all, so the button now still appears there with its own instructions ("tap the Share icon, then Add to Home Screen") instead of just silently never showing up.
- **Already-installed detection** — if the app is already running standalone (installed), the Install button and its listener are skipped entirely rather than showing something that can't do anything.
- **Opt-in updates instead of silent takeover** — the previous service worker called `skipWaiting()` unconditionally on install, which could swap the active worker out from under a tab mid-session. Now a new version sits "waiting" until a small banner ("🔄 A new version is ready — tap to refresh") is tapped, which is also safer than tying the click to the toast (the toast is a queue — a second message could be showing by the time this one would've appeared).
- **Icons actually cached** for offline use, and the service worker's cache version/asset list bumped to match this release.

### Offline indicator
A small banner appears under the theme row whenever the browser goes offline, and clears automatically when the connection returns — so if the app loads from cache instead of the network, that's visible rather than silent.

58 automated checks across three test suites (scheduling, grocery/prep/share, theme/install/offline) pass against the actual shipped files.

## v5 upgrade: more dishes, better search/filters, nutrition estimates

### Expanded menu — 86 → 110 dishes
Added 24 new home-cooked dishes (8 per meal, spread across Veg/Non-veg/South Indian): Methi Thepla, Masala Oats, Chicken Keema Toast, Set Dosa, Chana Masala & Rice, Egg Biryani, Mutton Biryani, Ragi Mudde & Sambar, Vegetable Manchurian & Rice, Tandoori Chicken & Salad, Chettinad Fish Curry & Rice, and more — each with the same real ingredient-quantity data the grocery aggregator and Sunday prep guide already rely on.

### Calorie estimates on every dish
Every dish (new and existing) now carries a `calories` field and shows a 🔥 badge on its row. **This is explicitly an estimate, not real nutrition data** — there's no nutrition database behind the app. It's computed from a documented formula (meal type, effort level, ingredient count, and whether the dish is non-veg) in `js/data.js`, the same honest-estimate approach already used for "Budget picks."

### New filter: Light meals only
A toggle next to "Quick only" that keeps dishes under 300 kcal (by the same estimate above).

### New tool: 📊 Nutrition Summary
A new button in the floating action bar opens a breakdown of the generated month: today's estimated total, the daily average across all 28 planned days, and a bar chart of every day with today highlighted. The modal repeats the same disclaimer — these are planning ballparks, not a dietary tool.

### Search now matches ingredients, not just dish names
Searching "paneer" now finds every dish that *uses* paneer (Palak Paneer, Malai Kofta, Paneer Tikka Masala, etc.), not only dishes named that. Also added a "No dishes match…" message when a search comes up empty, instead of just silently showing nothing.

17 more automated checks (dish count, calorie coverage, the light-filter actually enforcing <300 kcal, the nutrition modal's displayed total verified against the real math, and the ingredient-aware search) pass against the shipped files — 75 checks total across four test suites.

## v6 upgrade: accessibility (screen readers, keyboard nav, contrast)

### Contrast — actually measured, not eyeballed
Ran every accent colour through the real WCAG formula (4.5:1 for normal text) against how it's *actually* used in this CSS, not a guess:
- **Bug found and fixed in the default theme**: `--leaf` (green) failed AA both as white button text (3.87:1) and as tag text on the cream card (3.56:1). Darkened to `#4F794E` (4.95 / 4.56) — still reads as green, just clears the bar.
- **Bug found and fixed in the default theme**: the "today" day-card title used turmeric text directly on the cream card — only **1.91:1**, nowhere close to passing. Switched to `--chili`, which clears 4.5:1+ in every theme and still reads as an accent colour (the gold border already signals "today" visually).
- **All 6 other theme presets** (Berry, Ocean, Mono, Sunset, Forest, Lavender) had the same two problems to varying degrees — every one of their accent colours was adjusted to clear 4.5:1 for both text-on-card and white-text-on-button, while keeping each theme's hue identity.

### Keyboard navigation
- **Skip link** — "Skip to meal planner" appears on first Tab press, jumping straight past the hero to the controls.
- **Visible focus ring** on every interactive element (`:focus-visible`, so it only shows for keyboard use, not mouse clicks).
- **Modals now trap focus** while open — Tab cycles only through the modal's own controls instead of leaking out to the page behind it, Shift+Tab wraps correctly at the start, **Escape closes the modal**, and focus **returns to whatever button opened it** afterward instead of being lost.
- Time inputs were a `<span>` sitting next to an `<input>` with no programmatic link between them — converted to proper `<label for="...">` wrapping.
- The search box's only accessible name was its placeholder (which disappears once you type and isn't reliably announced) — added a real (visually-hidden) `<label>`.

### Screen reader semantics
- All 5 modals now have `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` pointing at their actual heading — a screen reader announces the dialog and its title the moment it opens.
- The 5 icon-only "×" close buttons had no accessible name at all (a screen reader would've just said "button") — added `aria-label="Close"`.
- The Meal Schedule / Kids' Best Deals switcher is now a real `role="tablist"`/`"tab"` pair with `aria-selected` kept in sync on every switch, instead of two plain buttons a screen reader can't tell are mutually exclusive views.
- Food Type, Max Effort, and Family Size are genuinely mutually-exclusive choices, so they're now `role="radiogroup"`/`"radio"` with `aria-checked` — not `aria-pressed`, which is for independent toggles (that's what Budget Picks and each theme swatch correctly use instead).
- All of this is kept in sync in three places, not just the click handler: `wirePillGroup`, "Reset to defaults", and restoring a saved plan all route through two small shared helpers (`setPillGroupValue`, `setBudgetPicksValue`) so the ARIA state can't drift out of sync with what's visually shown.

33 new automated checks cover every item above — including actually simulating Tab/Shift+Tab/Escape key presses and verifying focus lands where it should, not just checking that the right attributes exist in the markup. 105 checks total pass across five test suites.

## v7 upgrade: print/PDF, backup & restore, multi-language

### 🖨️ Print / PDF
A **Print / PDF** button in the bottom action bar opens the browser's print dialog; choose **"Save as PDF"** as the destination for a real PDF. No library is involved — it works offline and on every browser. A dedicated `@media print` stylesheet turns the dark app into a clean black-on-white document: the controls, tabs, language/theme rows, floating bar, modals and Kids tab are hidden, every weekday card stays unbroken across pages, today's card gets a solid border, and the live Amazon buy buttons (meaningless on paper) are removed. A "Generated <date>" line is added at the top.

### 💾 Backup & restore
**My Plans → Export Backup** downloads one dated JSON file (`busywomen-cook-schedule-backup-YYYY-MM-DD.json`) containing the current plan, all saved plans, excluded dishes, theme and custom colour. **Import Backup** restores it on any device and applies it *immediately* (theme, exclusions and the plan itself) without a reload. Import is defensive:
- a file that isn't JSON, or isn't one of this app's backups, is rejected with a message and changes nothing;
- you're asked to confirm before anything is overwritten — declining changes nothing;
- malformed fields inside an otherwise valid backup degrade to safe defaults instead of crashing.

### 🌐 Multi-language: English · हिन्दी · தமிழ்
A language switcher sits under the theme row. The choice is remembered, sets `<html lang>` (so screen readers pronounce text correctly), and re-renders whatever is already on screen — switching language never regenerates or changes your plan.

**What is translated:** every button, label, heading, modal, tooltip-style message and toast; weekday names; meal names; Veg / Non-veg / South Indian labels; the "today" marker; the WhatsApp share text; the printable header; the Kids' tab chrome; dates (via the matching locale).

**What deliberately is *not* translated:** dish names, ingredient lists, the Kids' tab item notes, and the auto-generated Sunday-prep tips stay in English in every language. Accurately translating ~110 dishes and their ingredients needs real culinary-translation expertise, and a wrong ingredient name in a cooking app misleads someone at the grocery store — so it is left out rather than guessed. (A few rarely-seen messages, such as the "limited dishes available" warning and install hints, are also still English.) The Hindi and Tamil UI strings were written carefully but have not been reviewed by a native speaker; corrections are welcome — they all live in `js/i18n.js`, and a test enforces that all three languages always contain exactly the same keys.

To add a language: add a block to `TRANSLATIONS`, plus entries in `DAY_NAMES_I18N`, `MEAL_LABELS_I18N` and `CAT_LABEL_I18N` in `js/i18n.js`, and one button in the `.lang-buttons` row of `index.html`.

### 🧪 Tests
One consolidated suite (159 checks) replaces the earlier ad-hoc ones. It needs only Node — no dependencies.

```bash
npm test                 # run the suite
npm run test:mutation    # prove the suite can fail (see below)
```

The test DOM is **generated from the real `index.html`** (ids, classes, attributes, element order and containment), so tests exercise the markup that actually ships. It covers: data integrity, generation rules (no repeats within a week), every filter, nutrition maths, search, saved plans and restore-on-load, themes, install/offline flows, accessibility (ARIA state, Tab/Shift+Tab focus trap, Escape, focus return), print, backup/restore edge cases, all three languages (every tagged element is verified in each language), and WCAG AA contrast for all 7 themes read straight from the CSS.

**Mutation check:** `npm run test:mutation` deliberately breaks the app 13 different ways — e.g. stops translating weekdays, drops the Escape handler, forgets to apply an imported theme, reverts the fixed green — and requires the suite to go red each time. All 13 are caught, and that was re-verified over repeated runs rather than once. Why that matters: the first version of the exclusion test asserted "the excluded dish isn't in a randomly generated plan", which passes by luck about a third of the time even when the filter is broken — the mutation check caught that as an intermittent miss (8 of 12 runs), and the test was rewritten to be deterministic (it shrinks the pool to exactly 7 dishes and asserts the outcome is forced). A test that depends on `Math.random()` can only ever prove a bug is *sometimes* absent, so none of the checks rely on chance now. The same mutation pass also exposed two defects in the test harness itself, which were fixed.

**Known limits of this test approach:** it runs the real scripts against a fake DOM, not a real browser, so it cannot judge visual layout, real screen-reader speech, or the browser's actual print preview. Those still deserve a manual look — in particular, open the page in Hindi and Tamil on a phone to check line wrapping, since those scripts are wider than English.
