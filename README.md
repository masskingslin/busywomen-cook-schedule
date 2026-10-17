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
