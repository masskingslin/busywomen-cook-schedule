# Busywomen Cook Schedule

A month-long meal planner for busy women — breakfast, lunch, and dinner, with no dish repeated within the same week. Filter by Veg / Non-veg / South Indian and by effort level (easy / medium / hard, shown as chili icons 🌶), plus a "quick only" filter for meals under 20 minutes.

It's a single static HTML file — no build step, no server, no dependencies to install.

## Run it locally
Just double-click `index.html`, or open it in any browser.

## Put it on GitHub
1. Create a new repository on GitHub named `busywomen-cook-schedule` (or any name you like).
2. Add this `index.html` (and this `README.md`) to the repo — either drag-and-drop them in the GitHub web UI ("Add file" → "Upload files"), or from your terminal:
   ```bash
   git init
   git add index.html README.md
   git commit -m "Add Busywomen Cook Schedule app"
   git branch -M main
   git remote add origin https://github.com/<your-username>/busywomen-cook-schedule.git
   git push -u origin main
   ```
3. Turn on GitHub Pages so it's live on the web:
   - Go to the repo's **Settings → Pages**
   - Under "Source," choose the `main` branch and `/ (root)` folder
   - Save — your app will be live at `https://<your-username>.github.io/busywomen-cook-schedule/` within a minute or two.

## How it works
- All 63 dishes (21 breakfast, 21 lunch, 21 dinner — split across Veg, Non-veg, and South Indian) live in the `DISHES` array inside `index.html`.
- Tap the filter chips, then **Generate month schedule** to build 4 weeks. Each week draws 7 distinct dishes per meal, so nothing repeats within a week, and the app also tries to avoid repeating last week's picks.
- Your last generated plan and filter choices are saved automatically and reload next time you open the app.

## Customize the menu
Open `index.html`, find the `DISHES` array near the top of the `<script>` section, and add, remove, or edit entries. Each dish needs:
```js
{name:"Dish Name", meal:"breakfast|lunch|dinner", category:"veg|non-veg|south-indian", difficulty:"easy|medium|hard", time: 20}
```
