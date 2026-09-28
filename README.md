# Busywomen Cook Schedule

A month-long meal planner for busy women — breakfast, lunch, and dinner, with no dish repeated within the same week. Filter by Veg / Non-veg / South Indian and max cooking effort, scale the plan to your family size, then export a shareable grocery list, a Sunday batch-prep guide, a WhatsApp-ready summary, and a real calendar (.ics) file.

Plain HTML/CSS/JS — no build step, no framework, no server required.

## Project structure
```
index.html        the app shell
css/styles.css     all styling
js/data.js         dish database, Amazon affiliate config, grocery PACK_CATALOG
js/recipes.js      short cooking methods, one entry per home-cooked dish
js/app.js          all app logic (scheduling, grocery list, share, print, alarms, feedback, PWA)
manifest.json      installable-app manifest       sw.js  offline service worker
icons/             app icons
```

## Run it locally
Open `index.html` in any browser, or serve the folder with any static file server.

## Features
- **Filters** — Food type (All / Veg / Non-veg / South Indian), max effort (🌶 Easy / 🌶🌶 Up to Medium / 🌶🌶🌶 Any), family size (1 / 2 / 4 people), and a "Quick only" (≤20 min) toggle. "↺ Reset to defaults" restores everything, including meal times.
- **Generate Month Schedule** — builds 4 weeks of breakfast/lunch/dinner with zero repeats within any single week, pulling from 122 dishes (99 home-cooked with ingredient lists and short cooking steps, 23 ready-made/instant items).
- **Two buy buttons per home-cooked dish** — 📦 Ready-made (searches Amazon for a store-bought version) and 🛒 Ingredients (searches using the dish's actual ingredient list, not a generic name search). Ready-made/instant dishes show a single 📦 buy button since there's nothing to source separately.
- **🛒 Smart Grocery Aggregator** — sums every ingredient across the full 4-week plan, scaled to your selected family size, then converts each total into Amazon pack sizes (e.g. "Buy 8 × 1 kg pack") using `PACK_CATALOG`. Per-item Amazon buy link, Copy and Print options.
- **⚡ Sunday Prep Guide** — looks at the current week's dishes, finds ingredients that repeat across multiple meals, and turns them into a batch-prep checklist (plus smart tips like "batch-cook rice" or "marinate proteins ahead" when relevant).
- **💬 Share Plan / 📆 Share Week** — opens WhatsApp with today's meals, or the whole current week, pre-filled.
- **📅 Export .ics** — downloads a calendar file with an event for every meal over the next 28 days, using your chosen meal times and reminder offset (15 min / 30 min / 1 hr / 2 hr before, or none). Import it into Google Calendar, Outlook, or Apple Calendar.

- **🔄 Swap / 🚫 Never again** — change a single meal without regenerating the month; excluded dishes are remembered on the device and can be allowed again.
- **📖 How to cook** — short method under every dish.
- **🔍 Find a dish / 📍 Today** — search inside your plan and jump to today.
- **⏰ Phone alarms** — per-meal buttons that open the Android Clock app pre-filled (websites can't cancel alarms, so there is no reset).
- **🖨 Print** — fridge-friendly plan or grocery list. **💌 Feedback** — opens the visitor's email app.
- **📲 Installable + offline** — PWA with a saved plan on the device. Four colour themes including a dark Night theme.

## Amazon affiliate setup
Open `js/data.js` and edit the `CONFIG` object:
```js
const CONFIG = {
  amazonTag: "kingcloud-21",
  amazonDomain: "amazon.in",
  feedbackEmailB64: "...",                  // feedback address, stored base64-encoded
  web3formsKey: "",                         // free key from web3forms.com — hides your email completely
  gaMeasurementId: "G-XXXXXXXXXX"           // Google Analytics 4 ID; tracking stays off until set
};
```
- `amazonTag` only earns for you if it's from your own Amazon Associates account.
- `amazonDomain` must match the storefront your tag is registered on (`amazon.in`, `amazon.com`, etc.).
- The required Amazon Associates disclosure is already in the footer.
- After changing files, bump `CACHE_NAME` in `sw.js` so installed copies refresh.

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
1. Push this folder's contents to a GitHub repository.
2. Go to **Settings → Pages**, set the source to the `main` branch and `/ (root)` folder.
3. Your app goes live at `https://<your-username>.github.io/<repo-name>/`.

## Note on this update
This version replaces the earlier single-file app with a modular project and a different feature set (grocery aggregator, Sunday prep guide, WhatsApp share, calendar export). The earlier live-clock/"today" highlight and the separate Kids' Snacks & Drinks tab are not part of this layout — let me know if you'd like either added back in.

## Add a dish
1. Add the dish to `DISHES` in `js/data.js`.
2. Add its steps to `RECIPES` in `js/recipes.js` (same exact name).
3. Make sure every ingredient name exists in `PACK_CATALOG` (unless its unit is `pack`), or the grocery list falls back to raw quantities for it.

## Feedback: keeping your email private
A plain website can't both open a visitor's email app *and* hide the address. Two modes:
- **Recommended:** create a free access key at web3forms.com using your email, paste it into `web3formsKey` in `js/data.js`. Feedback is then sent straight to your inbox and your address is never shown to visitors.
- **Without a key:** the button falls back to `mailto:`, which shows the address in the visitor's email app. It is stored encoded in the source, but that only deters casual scraping.
To change the address in fallback mode: `btoa("you@example.com")` in a browser console gives the value for `feedbackEmailB64`.
