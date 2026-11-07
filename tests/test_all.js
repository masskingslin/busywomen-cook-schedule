const fs = require('fs');
const path = require('path');
const { createApp, makeChecker, sleep, waitFor, HTML, BASE } = require('./harness.js');
const check = makeChecker();
const section = (name) => console.log('\n--- ' + name + ' ---');

const SRC = {
  i18n: fs.readFileSync(path.join(BASE, 'js/i18n.js'), 'utf8'),
  app: fs.readFileSync(path.join(BASE, 'js/app.js'), 'utf8'),
  css: fs.readFileSync(path.join(BASE, 'css/styles.css'), 'utf8'),
  sw: fs.readFileSync(path.join(BASE, 'sw.js'), 'utf8'),
};
const { TRANSLATIONS, DAY_NAMES_I18N } = new Function(SRC.i18n + '; return {TRANSLATIONS, DAY_NAMES_I18N};')();
const MEALS = ['breakfast', 'lunch', 'dinner'];

function fakeWeeks(){
  const dish = (name, meal) => ({ name, meal, category: 'veg', effort: 1, time: 10, calories: 250, ingredients: [{ name: 'Rice', qty: 1, unit: 'cup' }] });
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(day => ({
    day, breakfast: dish('Seeded Breakfast', 'breakfast'), lunch: dish('Seeded Lunch', 'lunch'), dinner: dish('Seeded Dinner', 'dinner') }));
  return [days, days, days, days];
}
const defaultFilters = { diet: 'all', maxEffort: 3, portion: 2, quickOnly: false, lightOnly: false, budgetPicks: false, times: { breakfast: '08:00', lunch: '13:00', dinner: '20:00' } };

async function main(){
  // =====================================================================
  section('A. Boot, data integrity, translation integrity');
  let app = createApp();
  check('scripts boot with no errors', true);
  check('clock populated', app.el.liveDate.textContent.length > 0 && app.el.liveTime.textContent.length > 0);
  check('110 dishes', app.evalIn('DISHES.length') === 110);
  check('every dish has numeric calories', app.evalIn('DISHES.every(d => typeof d.calories === "number")'));
  check('every dish has ingredients with qty+unit', app.evalIn('DISHES.every(d => d.ingredients.length && d.ingredients.every(i => i.name && i.qty > 0 && i.unit))'));
  check('kids section rendered on load', app.el.kidsView.innerHTML.includes('kid-card'));
  const enKeys = Object.keys(TRANSLATIONS.en);
  check('hi has exactly the same keys as en', JSON.stringify(Object.keys(TRANSLATIONS.hi).sort()) === JSON.stringify([...enKeys].sort()));
  check('ta has exactly the same keys as en', JSON.stringify(Object.keys(TRANSLATIONS.ta).sort()) === JSON.stringify([...enKeys].sort()));
  check('no empty translation values', ['en','hi','ta'].every(l => Object.values(TRANSLATIONS[l]).every(v => typeof v === 'string' && v.trim())));
  const htmlKeys = [...new Set([...HTML.matchAll(/data-i18n(?:-placeholder)?="([A-Za-z0-9]+)"/g)].map(m => m[1]))];
  check('every data-i18n key used in index.html exists in en', htmlKeys.every(k => k in TRANSLATIONS.en));
  const jsKeys = [...new Set([...SRC.app.matchAll(/(?<![A-Za-z])t\('([A-Za-z0-9]+)'\)/g)].map(m => m[1]))];
  check('every t(\'key\') used in app.js exists in en', jsKeys.every(k => k in TRANSLATIONS.en));
  check('placeholders {q}/{day}/{generate} survive in all languages',
    ['hi','ta'].every(l => TRANSLATIONS[l].searchNoMatch.includes('{q}') && TRANSLATIONS[l].waPlanOf.includes('{day}') && TRANSLATIONS[l].emptyState.includes('{generate}')));

  // =====================================================================
  section('B. Core flow: generate, today card, tabs, modals, share, calendar, reset');
  app.el.generateBtn.click();
  check('floating bar visible after generate', !app.el.floatingActionBar.classList.contains('hidden'));
  check('28 day cards rendered (4 weeks x 7)', (app.el.scheduleOutput.innerHTML.match(/class="day-card/g) || []).length === 28);
  check('exactly one day card marked today', (app.el.scheduleOutput.innerHTML.match(/day-card is-today/g) || []).length === 1);
  check('today card populated', app.el.todaySlot.innerHTML.includes('today-card'));
  check('no dish repeats within any week, per meal',
    app.evalIn('lastWeeks.every(w => ["breakfast","lunch","dinner"].every(m => new Set(w.map(d => d[m].name)).size === 7))'));
  check('every meal slot filled', app.evalIn('lastWeeks.every(w => w.every(d => d.breakfast && d.lunch && d.dinner))'));

  app.el.tabKids.click();
  check('kids tab: view switched + bar hidden', app.el.kidsView.style.display === 'block' && app.el.floatingActionBar.classList.contains('hidden'));
  app.el.tabSchedule.click();
  check('schedule tab: bar visible again', !app.el.floatingActionBar.classList.contains('hidden'));

  app.el.openGroceryBtn.click();
  check('grocery modal opens with items', !app.el.groceryModal.classList.contains('hidden') && app.el.groceryListContent.innerHTML.includes('grocery-item'));
  const gHtml = app.el.groceryListContent.innerHTML;
  app.all.find(e => e._classes.has('close-modal') && e.dataset.target === 'groceryModal').click();
  check('grocery modal closes', app.el.groceryModal.classList.contains('hidden'));
  app.el.openPrepBtn.click();
  check('prep modal opens with checklist', !app.el.prepModal.classList.contains('hidden') && app.el.prepListContent.innerHTML.includes('prep-item'));

  app.el.shareWhatsAppBtn.click();
  check('WhatsApp share opens wa.me link', app.state.opened.some(u => u.startsWith('https://wa.me/?text=')));
  app.el.exportCalendarBtn.click();
  const ics = app.anchorsClicked.find(a => a.download === 'busywomen-cook-schedule.ics');
  check('calendar export downloads an .ics file', !!ics);
  const icsText = ics ? app.blobs.get(ics.href).parts[0] : '';
  check('.ics has 84 events (28 days x 3 meals) and valid wrapper',
    (icsText.match(/BEGIN:VEVENT/g) || []).length === 84 && icsText.startsWith('BEGIN:VCALENDAR') && icsText.trim().endsWith('END:VCALENDAR'));
  check('.ics includes the 30-minute reminder alarm by default', icsText.includes('TRIGGER:-PT30M'));

  app.pills('dietFilter').find(p => p.dataset.value === 'veg').click();
  app.el.resetPreferencesBtn.click();
  check('reset restores diet to "all"', app.evalIn('state.diet') === 'all');

  // =====================================================================
  section('C. Filters');
  app = createApp();
  app.pills('dietFilter').find(p => p.dataset.value === 'veg').click();
  app.el.generateBtn.click();
  check('veg filter -> every scheduled dish is veg', app.evalIn('lastWeeks.flat().every(d => ["breakfast","lunch","dinner"].every(m => d[m].category === "veg"))'));

  app = createApp();
  check('light filter: every dish in every pool < 300 kcal',
    app.evalIn('(function(){ state.lightOnly = true; const r = ["breakfast","lunch","dinner"].every(m => filteredPool(m).length && filteredPool(m).every(d => d.calories < 300)); state.lightOnly = false; return r; })()'));
  check('quick filter: every dish <= 20 min',
    app.evalIn('(function(){ state.quickOnly = true; const r = ["breakfast","lunch","dinner"].every(m => filteredPool(m).every(d => d.time <= 20)); state.quickOnly = false; return r; })()'));
  check('effort filter 1: every dish effort 1',
    app.evalIn('(function(){ state.maxEffort = 1; const r = ["breakfast","lunch","dinner"].every(m => filteredPool(m).every(d => d.effort === 1)); state.maxEffort = 3; return r; })()'));
  check('budget picks keeps exactly the cheaper half',
    app.evalIn('(function(){ const full = filteredPool("lunch"); state.budgetPicks = true; const half = filteredPool("lunch"); state.budgetPicks = false; return half.length === Math.ceil(full.length/2) && Math.max(...half.map(costIndex)) <= Math.min(...full.filter(d => !half.includes(d)).map(costIndex)); })()'));
  app.el.budgetPicksToggle.click();
  check('budget toggle click sets state', app.evalIn('state.budgetPicks') === true);
  app.el.budgetPicksToggle.click();

  // Deterministic on purpose: asserting "Poha isn't in a random plan" would pass by
  // luck ~45% of the time even with the filter broken. Instead: prove the dish IS
  // normally available, then shrink the pool to exactly 7 and force the outcome.
  check('baseline: Poha is normally in the breakfast pool', app.evalIn('filteredPool("breakfast").some(d => d.name === "Poha")'));
  app.evalIn('excludedDishes.add("Poha")');
  check('excluded dish is removed from the pool', !app.evalIn('filteredPool("breakfast").some(d => d.name === "Poha")'));
  app.evalIn('excludedDishes.delete("Poha")');
  app.evalIn('(function(){ const all = DISHES.filter(d => d.meal === "breakfast").map(d => d.name); all.slice(7).forEach(n => excludedDishes.add(n)); })()');
  app.el.generateBtn.click();
  const kept = app.evalIn('DISHES.filter(d => d.meal === "breakfast").map(d => d.name).slice(0, 7)');
  check('excluding all but 7 breakfasts forces exactly those 7 into every week',
    app.evalIn(`lastWeeks.every(w => { const s = new Set(w.map(d => d.breakfast.name)); return s.size === 7 && ${JSON.stringify(kept)}.every(n => s.has(n)); })`));
  app.evalIn('excludedDishes.clear()');

  app = createApp();
  app.pills('dietFilter').find(p => p.dataset.value === 'non-veg').click();
  app.pills('effortFilter').find(p => p.dataset.value === '1').click();
  app.el.lightMealsOnly.checked = true; app.el.lightMealsOnly.dispatch('change');
  app.el.quickTimeOnly.checked = true; app.el.quickTimeOnly.dispatch('change');
  app.el.generateBtn.click();
  check('impossible filter combo -> clear empty-state message', app.el.scheduleOutput.innerHTML.includes('empty-state') && app.el.floatingActionBar.classList.contains('hidden'));
  check('impossible filter combo -> error toast', await waitFor(() => app.el.toast.textContent.includes('No matching dishes')));

  // =====================================================================
  section('D. Nutrition + search');
  app = createApp();
  app.el.openNutritionBtn.click();
  check('nutrition needs a plan first', app.el.nutritionModal.classList.contains('hidden'));
  app.el.generateBtn.click();
  app.el.openNutritionBtn.click();
  const nHtml = app.el.nutritionContent.innerHTML;
  check('nutrition modal opens, 28 day bars', !app.el.nutritionModal.classList.contains('hidden') && (nHtml.match(/nutrition-day-row/g) || []).length === 28);
  const todayTotal = app.evalIn('(function(){ const i = getTodayInfo(); const d = lastWeeks[i.weekIndex][i.dayIndex]; return ["breakfast","lunch","dinner"].reduce((s,m) => s + d[m].calories, 0); })()');
  check("'Today' stat equals the real sum of today's 3 meals", nHtml.includes(`<div class="n-value">${todayTotal}</div>`));
  const avg = app.evalIn('Math.round(lastWeeks.flat().reduce((s,d) => s + ["breakfast","lunch","dinner"].reduce((a,m) => a + d[m].calories, 0), 0) / 28)');
  check('daily average stat equals the real mean', nHtml.includes(`<div class="n-value">${avg}</div>`));

  const row = (n, i) => { const r = app.doc.createElement('div'); r._classes.add('meal-row'); r._fake = { '.meal-name': { textContent: n }, '.ingredients-list': { textContent: i } }; return r; };
  const r1 = row('Palak Paneer & Roti', 'Needs: Spinach, Paneer'), r2 = row('Poha', 'Needs: Poha, Peanuts');
  app.el.scheduleOutput._fakeRows = [r1, r2];
  app.el.dishSearchInput.value = 'paneer'; app.el.dishSearchInput.dispatch('input');
  check('search matches ingredient text', r1._classes.has('search-match') && r2._classes.has('search-dim'));
  app.el.dishSearchInput.value = 'zzzz'; app.el.dishSearchInput.dispatch('input');
  check('search no-results message shown with the term', !app.el.searchNoResults.classList.contains('hidden') && app.el.searchNoResults.textContent.includes('zzzz'));
  app.el.dishSearchInput.value = ''; app.el.dishSearchInput.dispatch('input');
  check('clearing search hides message and clears highlights', app.el.searchNoResults.classList.contains('hidden') && !r1._classes.has('search-match'));
  app.el.jumpTodayBtn.click();
  check('jump-to-today runs without error', true);

  // =====================================================================
  section('E. My Plans, clear, restore-on-load');
  app = createApp();
  app.el.generateBtn.click();
  check('current plan auto-saved to localStorage', !!(app.json('bwcs_last_plan') && app.json('bwcs_last_plan').weeks.length === 4));
  app.el.savePlanBtn.click();
  check('Save plan stores a named entry', (app.json('bwcs_my_plans') || []).length === 1 && app.json('bwcs_my_plans')[0].name === 'Test Plan');
  app.el.openMyPlansBtn.click();
  check('My Plans modal lists the saved plan', app.el.myPlansList.innerHTML.includes('Test Plan'));
  app.el.clearSavedPlanBtn.click();
  check('Clear removes the auto-saved plan but keeps My Plans', app.json('bwcs_last_plan') === null && (app.json('bwcs_my_plans') || []).length === 1);
  check('Clear resets the screen to the empty state', app.el.scheduleOutput.innerHTML.includes('empty-state') && app.el.floatingActionBar.classList.contains('hidden'));

  app = createApp({ seed: { bwcs_last_plan: { weeks: fakeWeeks(), filters: defaultFilters, savedAt: Date.now() } } });
  check('saved plan is restored and rendered on load', app.el.scheduleOutput.innerHTML.includes('Seeded Breakfast'));
  check('restoring a plan shows the bar again', !app.el.floatingActionBar.classList.contains('hidden'));

  // =====================================================================
  section('F. Themes');
  app = createApp();
  const sw = (t) => app.swatches().find(s => s.dataset.theme === t);
  sw('forest').click();
  check('preset applies data-theme', app.htmlRoot.getAttribute('data-theme') === 'forest');
  check('preset swatch aria-pressed=true, previous cleared', sw('forest').getAttribute('aria-pressed') === 'true' && sw('teal').getAttribute('aria-pressed') === 'false');
  const custom = sw('custom');
  check('custom swatch is a <label> carrying data-theme="custom"', custom.tagName === 'LABEL' && custom.dataset.theme === 'custom');
  custom.click();
  check('clicking the custom <label> does not corrupt the theme', app.htmlRoot.getAttribute('data-theme') === 'forest');
  app.el.customColorInput.value = '#AA33CC'; app.el.customColorInput.dispatch('input');
  check('custom colour sets --turmeric and drops preset', app.htmlRoot._style['--turmeric'] === '#AA33CC' && app.htmlRoot.getAttribute('data-theme') === undefined);
  check('custom swatch becomes the active one', custom._classes.has('active') && !sw('forest')._classes.has('active'));
  check('custom colour + theme persisted', app.json('bwcs_custom_color') === '#AA33CC' && app.json('bwcs_theme') === 'custom');
  app = createApp({ seed: { bwcs_theme: 'custom', bwcs_custom_color: '#112233' } });
  check('custom theme restored on load', app.htmlRoot._style['--turmeric'] === '#112233');
  app = createApp({ seed: { bwcs_theme: 'lavender' } });
  check('preset theme restored on load', app.htmlRoot.getAttribute('data-theme') === 'lavender');
  check('all 7 presets + custom have CSS or handling', ['berry','ocean','mono','sunset','forest','lavender'].every(t => SRC.css.includes(`:root[data-theme="${t}"]`)));

  // =====================================================================
  section('G. Install App + offline');
  app = createApp();
  check('install button hidden initially', app.el.installAppBtn.classList.contains('hidden'));
  let prompted = false;
  app.fire('beforeinstallprompt', { preventDefault(){}, prompt(){ prompted = true; }, userChoice: Promise.resolve({ outcome: 'accepted' }) });
  check('beforeinstallprompt reveals the button', !app.el.installAppBtn.classList.contains('hidden'));
  app.el.installAppBtn.click(); await sleep(20);
  check('clicking Install triggers the native prompt', prompted);

  app = createApp({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' });
  check('iOS: button shown without any install event', !app.el.installAppBtn.classList.contains('hidden'));
  app.el.installAppBtn.click();
  check('iOS: shows Add-to-Home-Screen instructions', await waitFor(() => app.el.toast.textContent.includes('Add to Home Screen')));

  app = createApp({ standalone: true });
  check('already installed: button hidden, no install listener registered', app.el.installAppBtn.classList.contains('hidden') && !(app.listeners.beforeinstallprompt || []).length);

  app = createApp();
  check('offline banner hidden while online', app.el.offlineIndicator.classList.contains('hidden'));
  app.sb.navigator.onLine = false; app.fire('offline');
  check('offline banner appears', !app.el.offlineIndicator.classList.contains('hidden'));
  app.sb.navigator.onLine = true; app.fire('online');
  check('offline banner clears when back online', app.el.offlineIndicator.classList.contains('hidden'));
  check('service worker precaches i18n.js and current versions', SRC.sw.includes("./js/i18n.js?v=1") && SRC.sw.includes('app.js?v=5') && SRC.sw.includes('-v5'));
  const assets = [...SRC.sw.matchAll(/'\.\/([^']+?)(?:\?v=\d+)?'/g)].map(m => m[1]).filter(a => a && !a.startsWith('-'));
  check('every file the service worker precaches really exists', assets.every(a => fs.existsSync(path.join(BASE, a))));
  check('index.html references the same asset versions the SW caches', HTML.includes('app.js?v=5') && HTML.includes('data.js?v=5') && HTML.includes('styles.css?v=5') && HTML.includes('i18n.js?v=1'));

  // =====================================================================
  section('H. Accessibility');
  check('skip link targets a focusable #mainContent', /href="#mainContent"/.test(HTML) && /id="mainContent" tabindex="-1"/.test(HTML));
  check('time inputs are wrapped in <label for>', ['breakfastTime','lunchTime','dinnerTime'].every(i => HTML.includes(`<label class="time-field" for="${i}">`)));
  check('search input has a label', /<label for="dishSearchInput" class="visually-hidden"/.test(HTML));
  check('5 modals: role=dialog + aria-modal + labelledby -> real heading',
    ['groceryModal','prepModal','nutritionModal','myPlansModal','excludedModal'].every(id => HTML.includes(`id="${id}" class="modal-overlay hidden" role="dialog" aria-modal="true" aria-labelledby="${id}Title"`) && HTML.includes(`<h3 id="${id}Title"`)));
  check('all 5 × close buttons have aria-label', (HTML.match(/class="close-modal"[^>]*aria-label="Close"/g) || []).length === 5);
  check('tab semantics', /role="tablist"/.test(HTML) && (HTML.match(/role="tab"/g) || []).length === 2);
  check('radiogroups for exclusive pill groups, 10 radios', (HTML.match(/role="radiogroup"/g) || []).length === 4 && (HTML.match(/role="radio"/g) || []).length === 13);
  check(':focus-visible ring + skip-link + visually-hidden CSS', SRC.css.includes(':focus-visible') && SRC.css.includes('.skip-link') && SRC.css.includes('.visually-hidden'));
  check('<html lang> starts as en', /<html lang="en">/.test(HTML));
  check('language buttons carry their own lang attribute', /data-lang="hi"[^>]*lang="hi"/.test(HTML) && /data-lang="ta"[^>]*lang="ta"/.test(HTML));

  app = createApp();
  const veg = app.pills('dietFilter').find(p => p.dataset.value === 'veg'); veg.click();
  check('pill click moves aria-checked', veg.getAttribute('aria-checked') === 'true' && app.pills('dietFilter')[0].getAttribute('aria-checked') === 'false');
  app.el.budgetPicksToggle.click();
  check('budget toggle aria-pressed flips', app.el.budgetPicksToggle.getAttribute('aria-pressed') === 'true');
  app.el.tabKids.click();
  check('tab switch updates aria-selected', app.el.tabKids.getAttribute('aria-selected') === 'true' && app.el.tabSchedule.getAttribute('aria-selected') === 'false');
  app.el.tabSchedule.click();
  app.el.resetPreferencesBtn.click();
  check('reset re-syncs aria-checked and aria-pressed', app.pills('dietFilter')[0].getAttribute('aria-checked') === 'true' && app.el.budgetPicksToggle.getAttribute('aria-pressed') === 'false');

  app.el.generateBtn.click();
  app.el.openGroceryBtn.focus();
  app.el.openGroceryBtn.click();
  const foc = app.el.groceryModal.querySelectorAll('button, [href], input');
  check('opening a modal moves focus to its first control', app.doc.activeElement === foc[0]);
  app.doc.activeElement = foc[foc.length - 1];
  app.el.groceryModal.dispatch('keydown', { key: 'Tab', shiftKey: false });
  check('Tab on last control wraps to first (focus trap)', app.doc.activeElement === foc[0]);
  app.el.groceryModal.dispatch('keydown', { key: 'Tab', shiftKey: true });
  check('Shift+Tab on first control wraps to last', app.doc.activeElement === foc[foc.length - 1]);
  app.el.groceryModal.dispatch('keydown', { key: 'Escape' });
  check('Escape closes the modal', app.el.groceryModal.classList.contains('hidden'));
  check('focus returns to the opener', app.doc.activeElement === app.el.openGroceryBtn);

  // =====================================================================
  section('I. Print / PDF');
  app = createApp();
  app.el.printPlanBtn.click();
  check('print before generating does nothing', app.state.printed === 0);
  app.el.generateBtn.click();
  app.el.printPlanBtn.click();
  check('print calls window.print() once', app.state.printed === 1);
  check('print header gets a generated-date line', /^Generated /.test(app.el.printGeneratedDate.textContent));
  const printCss = SRC.css.slice(SRC.css.indexOf('@media print'));
  check('@media print exists', SRC.css.includes('@media print'));
  check('print CSS hides controls, tabs, floating bar, modals, kids view, language row',
    ['.controls-card', '.tab-bar', '.floating-actions', '.modal-overlay', '#kidsView', '.lang-row', '.theme-row'].every(s => printCss.includes(s)));
  check('print CSS hides live Amazon buy buttons and forces black-on-white', printCss.includes('.buy-row{ display:none') && /background:#fff/.test(printCss));
  check('print-only header is hidden on screen', /\.print-only-header\{ display:none; \}/.test(SRC.css));

  // =====================================================================
  section('J. Backup & restore');
  app = createApp();
  app.el.generateBtn.click();
  app.el.savePlanBtn.click();
  app.evalIn('excludedDishes.add("Poha"); storageSet(STORE.EXCLUDED, [...excludedDishes]);');
  app.swatches().find(s => s.dataset.theme === 'forest').click();
  app.el.exportBackupBtn.click();
  const dl = app.anchorsClicked.filter(a => /^busywomen-cook-schedule-backup-\d{4}-\d{2}-\d{2}\.json$/.test(a.download)).pop();
  check('export downloads a dated .json file', !!dl);
  const backup = JSON.parse(app.blobs.get(dl.href).parts[0]);
  check('backup envelope: app id + format version + timestamp', backup.app === 'busywomen-cook-schedule' && backup.formatVersion === 1 && !isNaN(Date.parse(backup.exportedAt)));
  check('backup contains plan, saved plans, exclusions, theme', backup.data.lastPlan.weeks.length === 4 && backup.data.myPlans.length === 1 && backup.data.excludedDishes.includes('Poha') && backup.data.theme === 'forest');
  const backupText = JSON.stringify(backup);

  const importInto = async (a, content) => {
    a.el.importBackupFile.files = [{ name: 'b.json', _content: content }];
    a.el.importBackupFile.dispatch('change');
    await sleep(40);
  };
  app = createApp();                                   // "new phone"
  await importInto(app, backupText);
  check('import writes saved plans to storage', (app.json('bwcs_my_plans') || []).length === 1);
  check('import applies exclusions to the running app', app.evalIn('excludedDishes.has("Poha")') === true);
  check('import applies the theme immediately', app.htmlRoot.getAttribute('data-theme') === 'forest');
  check('import renders the restored plan immediately', app.el.scheduleOutput.innerHTML.includes('day-card') && !app.el.floatingActionBar.classList.contains('hidden'));
  check('import shows success toast and resets the file input', await waitFor(() => app.el.toast.textContent.includes('imported')) && app.el.importBackupFile.value === '');
  check('imported exclusions really take effect in the dish pool', !app.evalIn('filteredPool("breakfast").some(d => d.name === "Poha")'));

  app = createApp({ seed: { bwcs_excluded_dishes: ['Upma'] } });
  await importInto(app, '{this is not json');
  check('invalid JSON is rejected with a toast', await waitFor(() => app.el.toast.textContent.includes('valid JSON')));
  check('invalid JSON leaves existing data untouched', JSON.stringify(app.json('bwcs_excluded_dishes')) === '["Upma"]');
  app = createApp({ seed: { bwcs_excluded_dishes: ['Upma'] } });
  await importInto(app, JSON.stringify({ app: 'some-other-app', data: {} }));
  check('a different app\'s JSON is rejected', await waitFor(() => app.el.toast.textContent.includes("doesn't look like")));
  check('rejected file leaves data untouched', JSON.stringify(app.json('bwcs_excluded_dishes')) === '["Upma"]');
  app = createApp({ seed: { bwcs_excluded_dishes: ['Upma'] }, confirmValue: false });
  await importInto(app, backupText);
  check('declining the overwrite confirmation changes nothing', JSON.stringify(app.json('bwcs_excluded_dishes')) === '["Upma"]');
  app = createApp();
  await importInto(app, JSON.stringify({ app: 'busywomen-cook-schedule', formatVersion: 1, data: { myPlans: 'oops', excludedDishes: null } }));
  check('malformed fields inside a valid envelope degrade safely (no crash)', Array.isArray(app.json('bwcs_my_plans')) && Array.isArray(app.json('bwcs_excluded_dishes')));

  // =====================================================================
  section('K. Multi-language (English / हिन्दी / தமிழ்)');
  app = createApp();
  const taggedEls = () => app.all.filter(e => e.hasAttribute('data-i18n'));
  const HTMLKEYS = new Set(['effortLegend1', 'effortLegend2', 'effortLegend3']);
  const allTranslated = (lang) => taggedEls().every(e => {
    const k = e.getAttribute('data-i18n');
    return (HTMLKEYS.has(k) ? e.innerHTML : e.textContent) === TRANSLATIONS[lang][k];
  });
  check('English: every tagged element equals its en string', allTranslated('en'));

  const hi = app.langBtns().find(b => b.dataset.lang === 'hi'), ta = app.langBtns().find(b => b.dataset.lang === 'ta'), en = app.langBtns().find(b => b.dataset.lang === 'en');
  hi.click();
  check('Hindi: <html lang> updated', app.htmlRoot.lang === 'hi');
  check(`Hindi: all ${taggedEls().length} tagged elements show their Hindi string`, allTranslated('hi'));
  check('Hindi: search placeholder translated', app.el.dishSearchInput.placeholder === TRANSLATIONS.hi.searchPlaceholder);
  check('Hindi: language buttons expose aria-checked', hi.getAttribute('aria-checked') === 'true' && en.getAttribute('aria-checked') === 'false');
  check('Hindi: choice persisted', app.json('bwcs_lang') === 'hi');
  check('Hindi: empty state translated with bold button name', app.el.scheduleOutput.innerHTML.includes('<b>' + TRANSLATIONS.hi.generateBtn + '</b>') && !app.el.scheduleOutput.innerHTML.includes('{generate}'));
  check('Hindi: category labels mutated in place', app.evalIn('CAT_LABEL.veg') === 'शाकाहारी' && app.evalIn('CAT_LABEL["south-indian"]') === 'दक्षिण भारतीय');
  check('Hindi: kids section translated', app.el.kidsView.innerHTML.includes(TRANSLATIONS.hi.kidsTitle) && app.el.kidsView.innerHTML.includes(TRANSLATIONS.hi.kidsBuyBtn));

  app.el.generateBtn.click();
  const sched = app.el.scheduleOutput.innerHTML;
  check('Hindi schedule: Hindi weekday names', DAY_NAMES_I18N.hi.every(d => sched.includes(d)));
  check('Hindi schedule: no English weekday names leaked', !/>(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)</.test(sched));
  check('Hindi schedule: translated "Week" + meal labels + tags',
    sched.includes(TRANSLATIONS.hi.weekWord + ' 1') && sched.includes('नाश्ता') && sched.includes(TRANSLATIONS.hi.needsPrefix) && sched.includes('शाकाहारी'));
  check("Hindi schedule: today's marker is translated (CSS attr, not hard-coded English)", sched.includes('data-today-tag=" ' + TRANSLATIONS.hi.todayTag + '"'));
  check('CSS reads the "today" label from the attribute', SRC.css.includes('content:attr(data-today-tag)') && !SRC.css.includes('content:" · today"'));
  const firstDish = app.evalIn('lastWeeks[0][0].breakfast.name');
  check('dish names stay in English under Hindi (by design)', sched.includes(`>${firstDish}<`));
  check('Hindi today card: translated eyebrow', app.el.todaySlot.innerHTML.includes(TRANSLATIONS.hi.todayEyebrow));
  check('Hindi toast on generate', await waitFor(() => app.el.toast.textContent.includes(TRANSLATIONS.hi.toastScheduleGenerated)));

  app.el.shareWhatsAppBtn.click();
  const wa = decodeURIComponent(app.state.opened.pop().replace('https://wa.me/?text=', ''));
  check('Hindi WhatsApp message uses translated title + meal labels', wa.includes(TRANSLATIONS.hi.waTitle) && wa.includes('नाश्ता') && !wa.includes('Breakfast'));

  app.el.openNutritionBtn.click();
  check('Hindi nutrition chart uses full Hindi day names (not sliced mid-character)', DAY_NAMES_I18N.hi.some(d => app.el.nutritionContent.innerHTML.includes(d)));

  ta.click();
  check('Tamil: <html lang> + persisted', app.htmlRoot.lang === 'ta' && app.json('bwcs_lang') === 'ta');
  check(`Tamil: all ${taggedEls().length} tagged elements show their Tamil string`, allTranslated('ta'));
  check('Tamil: already-generated schedule re-rendered in place (no regenerate needed)', DAY_NAMES_I18N.ta.every(d => app.el.scheduleOutput.innerHTML.includes(d)) && !app.el.scheduleOutput.innerHTML.includes('सोमवार'));
  check('Tamil: the same plan is kept (dishes unchanged by switching language)', app.el.scheduleOutput.innerHTML.includes(`>${firstDish}<`));

  en.click();
  check('Back to English: all elements restored', allTranslated('en') && app.htmlRoot.lang === 'en');
  check('Back to English: weekday names restored, no Tamil/Hindi left', DAY_NAMES_I18N.en.every(d => app.el.scheduleOutput.innerHTML.includes(d)) && !/[\u0900-\u097F\u0B80-\u0BFF]/.test(app.el.scheduleOutput.innerHTML));
  check('Back to English: category labels restored', app.evalIn('CAT_LABEL.veg') === 'Veg');
  check('t() falls back to the key for an unknown key', app.evalIn('t("definitelyNotAKey")') === 'definitelyNotAKey');
  check('applyLanguage() with an unsupported code falls back to English', (app.evalIn('applyLanguage("xx")'), app.htmlRoot.lang === 'en'));

  app = createApp({ seed: { bwcs_lang: 'ta', bwcs_last_plan: { weeks: fakeWeeks(), filters: defaultFilters, savedAt: Date.now() } } });
  check('saved language restored on load', app.htmlRoot.lang === 'ta' && allTranslated('ta'));
  check('restored plan renders in the restored language on first paint', DAY_NAMES_I18N.ta.every(d => app.el.scheduleOutput.innerHTML.includes(d)) && app.el.scheduleOutput.innerHTML.includes('Seeded Breakfast'));
  check('restore toast is translated', await waitFor(() => app.el.toast.textContent.includes(TRANSLATIONS.ta.toastRestored)));
  check('Tamil kids section on first paint', app.el.kidsView.innerHTML.includes(TRANSLATIONS.ta.kidsTitle));

  app = createApp({ seed: { bwcs_lang: 'ta' } });
  app.el.openMyPlansBtn.click();
  app.el.savePlanBtn.click();
  check('Tamil: "generate first" toast for save-without-plan', await waitFor(() => app.el.toast.textContent.includes(TRANSLATIONS.ta.toastGenerateFirst)));

  // =====================================================================
  section('L. Colour contrast (WCAG AA 4.5:1) for every theme, from the shipped CSS');
  const lum = (hex) => { const [r,g,b] = [1,3,5].map(i => parseInt(hex.slice(i, i+2), 16) / 255).map(v => v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4)); return 0.2126*r + 0.7152*g + 0.0722*b; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const vars = (block) => Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6})/g)].map(m => [m[1], m[2]]));
  const baseVars = vars(SRC.css.match(/:root\{([^}]*)\}/)[1]);
  const themes = { teal: baseVars };
  for(const m of SRC.css.matchAll(/:root\[data-theme="(\w+)"\]\{([^}]*)\}/g)) themes[m[1]] = Object.assign({}, baseVars, vars(m[2]));
  check('found all 7 themes in the CSS', Object.keys(themes).length === 7);
  for(const [name, v] of Object.entries(themes)){
    const rows = [
      ['chili text on cream card',        ratio(v.chili, v.cream)],
      ['leaf text on cream card',         ratio(v.leaf, v.cream)],
      ['white text on chili button',      ratio(v.white, v.chili)],
      ['white text on leaf button',       ratio(v.white, v.leaf)],
      ['teal-deep text on turmeric button', ratio(v['teal-deep'], v.turmeric)],
      ['turmeric text on teal-deep hero', ratio(v.turmeric, v['teal-deep'])],
      ['ink text on cream',               ratio(v.ink, v.cream)],
      ['ink-soft text on cream',          ratio(v['ink-soft'], v.cream)],
    ];
    const bad = rows.filter(([, r]) => r < 4.5);
    check(`${name}: all ${rows.length} text pairings >= 4.5:1` + (bad.length ? '  FAILING: ' + bad.map(([l, r]) => `${l}=${r.toFixed(2)}`).join(', ') : ''), bad.length === 0);
  }
  check('"today" card title is not turmeric-on-cream (was 1.91:1)', /\.day-card\.is-today \.day-title\{ color:var\(--chili\)/.test(SRC.css));

  const { passes, fails } = check.summary();
  console.log(`\n${fails ? '❌' : '✅'}  ${passes} passed, ${fails} failed`);
  process.exit(fails ? 1 : 0);
}
main().catch(e => { console.error('SUITE CRASHED:', e); process.exit(2); });
