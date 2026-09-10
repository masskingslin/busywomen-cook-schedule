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
- **Generate Month Schedule** — builds 4 weeks of breakfast/lunch/dinner with zero repeats within any single week, pulling from 86 dishes (63 home-cooked with real ingredient lists, 23 ready-made/instant items).
- **Two buy buttons per home-cooked dish** — 📦 Ready-made (searches Amazon for a store-bought version) and 🛒 Ingredients (searches using the dish's actual ingredient list, not a generic name search). Ready-made/instant dishes show a single 📦 buy button since there's nothing to source separately.
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
1. Push this folder's contents to a GitHub repository.
2. Go to **Settings → Pages**, set the source to the `main` branch and `/ (root)` folder.
3. Your app goes live at `https://<your-username>.github.io/<repo-name>/`.

## Note on this update
This version replaces the earlier single-file app with a modular project and a different feature set (grocery aggregator, Sunday prep guide, WhatsApp share, calendar export). The earlier live-clock/"today" highlight and the separate Kids' Snacks & Drinks tab are not part of this layout — let me know if you'd like either added back in.
