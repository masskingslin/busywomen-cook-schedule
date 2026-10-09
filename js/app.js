// ============================================================
// BUSYWOMEN COOK SCHEDULE — APP LOGIC
// ============================================================

let state = {
  diet: "all",
  maxEffort: 3,
  portion: 2,
  quickOnly: false,
  budgetOnly: false,
  times: { breakfast: "08:00", lunch: "13:00", dinner: "20:00" },
};

let lastWeeks = null; // the 4-week schedule currently on screen
let excludedDishes = []; // dish names the user never wants suggested again

// ---------------- OUR OWN BACKEND (feedback, visitor count, analytics) ----------------
// Everything below talks to backend/server.py, which we run ourselves — no
// third-party service. CONFIG.apiBase: "" = backend off, "same-origin" = the
// backend also serves this page (default), or a full URL such as
// "https://api.example.com" when the site is hosted somewhere else.
function apiUrl(path){
  const base = CONFIG.apiBase;
  if(!base) return null;
  return (base === 'same-origin' ? '' : String(base).replace(/\/+$/, '')) + path;
}

// Anonymous usage events (which products get clicked, which features are
// used). No cookies, no personal data. Sent as text/plain so the browser
// needs no CORS preflight, and keepalive so it survives leaving the page.
function trackEvent(name, params){
  const url = apiUrl('/api/event');
  if(!url) return;
  try{
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ name, props: params || {} }),
      keepalive: true,
      credentials: 'omit',
    }).catch(()=>{});
  }catch(e){ /* analytics must never break the app */ }
}

// Catches every affiliate/product link click across the schedule, grocery
// list, and kids sections in one place, so new buy-btn spots get tracked
// automatically as long as they carry data-dish/data-kind.
document.addEventListener('click', (e)=>{
  const link = e.target.closest('.buy-btn');
  if(!link) return;
  trackEvent('affiliate_click', {
    dish: link.dataset.dish || '',
    kind: link.dataset.kind || '',
  });
});

// ---------------- PWA: SERVICE WORKER + INSTALL PROMPT ----------------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      // Offline support just won't be available — the app still works online.
    });
  });
}

let deferredInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  const btn = document.getElementById("installAppBtn");
  if (btn) btn.classList.remove("hidden");
});

document.getElementById("installAppBtn").addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  if (outcome === "accepted") {
    showToast("Installing app…");
  }
  deferredInstallPrompt = null;
  document.getElementById("installAppBtn").classList.add("hidden");
});

window.addEventListener("appinstalled", () => {
  document.getElementById("installAppBtn").classList.add("hidden");
  showToast("App installed! Find it on your home screen.");
  trackEvent('app_installed', {});
});

// ---------------- SHOP LINK BUILDERS (Amazon affiliate) ----------------
function shopLinkReadymade(dishName){
  const q = encodeURIComponent("ready to eat " + dishName + " pack");
  return `https://www.${CONFIG.amazonDomain}/s?k=${q}&tag=${CONFIG.amazonTag}`;
}
function shopLinkIngredients(dish){
  const terms = (dish.ingredients && dish.ingredients.length)
    ? dish.ingredients.map(i => i.name).join(", ")
    : dish.name;
  const q = encodeURIComponent(terms + " grocery");
  return `https://www.${CONFIG.amazonDomain}/s?k=${q}&tag=${CONFIG.amazonTag}`;
}
function shopLinkProduct(productName){
  const q = encodeURIComponent(productName);
  return `https://www.${CONFIG.amazonDomain}/s?k=${q}&tag=${CONFIG.amazonTag}`;
}
function shopLinkBestPrice(productName){
  // Same search, but sorted cheapest-first so the top result is the best deal.
  const q = encodeURIComponent(productName);
  return `https://www.${CONFIG.amazonDomain}/s?k=${q}&tag=${CONFIG.amazonTag}&s=price-asc-rank`;
}

// ---------------- LIVE CLOCK ----------------
function tickClock(){
  const now = new Date();
  const dateStr = now.toLocaleDateString(undefined, {weekday:'long', year:'numeric', month:'long', day:'numeric'});
  const timeStr = now.toLocaleTimeString(undefined, {hour:'2-digit', minute:'2-digit', second:'2-digit'});
  const dEl = document.getElementById('liveDate');
  const tEl = document.getElementById('liveTime');
  if(dEl) dEl.textContent = dateStr;
  if(tEl) tEl.textContent = timeStr;
}
tickClock();
setInterval(tickClock, 1000);

// ---------------- TAB BAR (Meal Schedule / Kids) ----------------
function showTab(tab){
  const scheduleView = document.getElementById('scheduleView');
  const kidsView = document.getElementById('kidsView');
  const tabSchedule = document.getElementById('tabSchedule');
  const tabKids = document.getElementById('tabKids');
  const floatingBar = document.getElementById('floatingActionBar');
  if(tab === 'kids'){
    scheduleView.style.display = 'none';
    kidsView.style.display = 'block';
    tabSchedule.classList.remove('active');
    tabKids.classList.add('active');
    floatingBar.classList.add('hidden');
  } else {
    scheduleView.style.display = '';
    kidsView.style.display = 'none';
    tabSchedule.classList.add('active');
    tabKids.classList.remove('active');
    if(lastWeeks) floatingBar.classList.remove('hidden');
  }
}
document.getElementById('tabSchedule').addEventListener('click', ()=>showTab('schedule'));
document.getElementById('tabKids').addEventListener('click', ()=>showTab('kids'));

// ---------------- KIDS' SNACKS & DRINKS (best-price) ----------------
function renderKidsSection(){
  const wrap = document.getElementById('kidsView');
  const cards = KID_ITEMS.map(item => `
    <div class="kid-card">
      <span class="kid-emoji">${item.emoji}</span>
      <p class="kid-name">${item.name}</p>
      <p class="kid-note">${item.note}</p>
      <div class="kid-tags">
        <span class="tag ${item.type==='drink' ? 'drink':'snack'}">${item.type==='drink' ? 'Drink':'Snack'}</span>
        ${item.budget ? '<span class="tag budget">💰 Budget pick</span>' : ''}
      </div>
      <a class="buy-btn best-price" href="${shopLinkBestPrice(item.name)}" target="_blank" rel="noopener sponsored" title="Cheapest listings for ${item.name} on Amazon" data-dish="${item.name}" data-kind="kids-best-price">💰 Best Price</a>
    </div>`).join('');
  wrap.innerHTML = `
    <div class="kids-wrap">
      <div class="kids-head"><span class="kids-title">Kids' Snacks &amp; Drinks</span><hr></div>
      <p class="kids-sub">A separate healthy pick list for tiffin boxes and after-school snacks — every button is sorted to the cheapest listing first, so you always land on the best deal.</p>
      <div class="kids-grid">${cards}</div>
    </div>`;
}
renderKidsSection();

// ---------------- THEME CUSTOMIZATION ----------------
const THEMES = {
  teal:  { '--teal-deep':'#123B3A', '--teal-mid':'#1B5450', '--teal-line':'#2B6864', '--cream':'#FBF3E4', '--turmeric':'#E7A72C', '--chili':'#C1442D', '--leaf':'#5B8C5A', '--ink':'#1B1B16', '--ink-soft':'#5A5A50', '--white':'#FFFDF8', '--on-dark':'#FBF3E4' },
  berry: { '--teal-deep':'#3B1224', '--teal-mid':'#5C1B38', '--teal-line':'#7A2048', '--cream':'#FBF0E9', '--turmeric':'#E0A458', '--chili':'#C1442D', '--leaf':'#8C5A6E', '--ink':'#241315', '--ink-soft':'#6B4A52', '--white':'#FFFCF9', '--on-dark':'#FBF0E9' },
  ocean: { '--teal-deep':'#0B2E3A', '--teal-mid':'#0F4C5C', '--teal-line':'#1B6E80', '--cream':'#EFF7F6', '--turmeric':'#4FB6A6', '--chili':'#E0703E', '--leaf':'#2E8B7A', '--ink':'#132226', '--ink-soft':'#4A6167', '--white':'#FFFFFF', '--on-dark':'#EFF7F6' },
  night: { '--teal-deep':'#0D1413', '--teal-mid':'#1F4B47', '--teal-line':'#2C5C57', '--cream':'#1B2422', '--turmeric':'#E7A72C', '--chili':'#C1442D', '--leaf':'#7DB37C', '--ink':'#F1EBDD', '--ink-soft':'#B9B5A6', '--white':'#26312E', '--on-dark':'#F5EEDF', '--heading':'#F1EBDD', '--link':'#7FC4BB', '--tag-amber':'#E7A72C', '--surface-text':'#1B1B16' },
};
function applyTheme(name){
  const base = THEMES[name] || THEMES.teal;
  // Derived colours default from the theme, so switching away from Night never leaves stale values behind.
  const t = Object.assign({
    '--heading': base['--teal-deep'],
    '--link': base['--teal-mid'],
    '--tag-amber': '#96660F',
    '--surface-text': base['--white'],
  }, base);
  Object.entries(t).forEach(([k,v]) => document.documentElement.style.setProperty(k, v));
  document.querySelectorAll('.theme-swatch').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.theme === name);
  });
}
document.querySelectorAll('.theme-swatch').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const name = btn.dataset.theme;
    applyTheme(name);
    try{ localStorage.setItem('busywomenCookSchedule.theme', name); }catch(e){ /* storage blocked */ }
  });
});
(function loadTheme(){
  let saved = 'teal';
  try{ saved = localStorage.getItem('busywomenCookSchedule.theme') || 'teal'; }catch(e){}
  applyTheme(saved);
})();

// ---------------- TOAST ----------------
let toastTimer = null;
// Pass {label, onClick} as a 2nd arg to add a tappable action (e.g. "Undo") to
// the toast. The action is cleared on every call so a stale handler never
// lingers into the next unrelated toast.
function showToast(message, action){
  const el = document.getElementById('toast');
  const msgEl = document.getElementById('toastMessage');
  const actionBtn = document.getElementById('toastActionBtn');
  msgEl.textContent = message;

  const newActionBtn = actionBtn.cloneNode(true); // drop any previous listener
  actionBtn.replaceWith(newActionBtn);
  if(action && action.label && action.onClick){
    newActionBtn.textContent = action.label;
    newActionBtn.classList.remove('hidden');
    newActionBtn.addEventListener('click', ()=>{
      action.onClick();
      el.classList.remove('show');
      setTimeout(()=> el.classList.add('hidden'), 200);
    });
  }else{
    newActionBtn.classList.add('hidden');
  }

  el.classList.remove('hidden');
  requestAnimationFrame(()=> el.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{
    el.classList.remove('show');
    setTimeout(()=> el.classList.add('hidden'), 200);
  }, action ? 4500 : 2400);
}

// ---------------- PILL SELECTORS (single-select groups) ----------------
function wirePillGroup(containerId, onSelect){
  const container = document.getElementById(containerId);
  container.querySelectorAll('.pill').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      container.querySelectorAll('.pill').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      onSelect(btn.dataset.value);
    });
  });
}
function setPillActive(containerId, value){
  document.querySelectorAll('#' + containerId + ' .pill').forEach(b=>{
    b.classList.toggle('active', b.dataset.value === String(value));
  });
}
wirePillGroup('dietFilter', val => state.diet = val);
wirePillGroup('effortFilter', val => state.maxEffort = parseInt(val, 10));
wirePillGroup('portionFilter', val => state.portion = parseInt(val, 10));

document.querySelector('#quickOnlyFilter .pill').addEventListener('click', e=>{
  state.quickOnly = !state.quickOnly;
  e.target.classList.toggle('active', state.quickOnly);
});

document.querySelector('#budgetOnlyFilter .pill').addEventListener('click', e=>{
  state.budgetOnly = !state.budgetOnly;
  e.target.classList.toggle('active', state.budgetOnly);
});

['breakfast','lunch','dinner'].forEach(meal=>{
  document.getElementById(meal + 'Time').addEventListener('change', e=>{
    state.times[meal] = e.target.value;
  });
});

document.getElementById('resetPreferencesBtn').addEventListener('click', ()=>{
  state = { diet:"all", maxEffort:3, portion:2, quickOnly:false, budgetOnly:false, times:{breakfast:"08:00", lunch:"13:00", dinner:"20:00"} };
  setPillActive('dietFilter', 'all');
  setPillActive('effortFilter', '3');
  setPillActive('portionFilter', '2');
  document.querySelector('#quickOnlyFilter .pill').classList.remove('active');
  document.querySelector('#budgetOnlyFilter .pill').classList.remove('active');
  document.getElementById('breakfastTime').value = "08:00";
  document.getElementById('lunchTime').value = "13:00";
  document.getElementById('dinnerTime').value = "20:00";
  showToast("Preferences reset to defaults");
});

// ---------------- TODAY MAPPING ----------------
function getTodayInfo(){
  const now = new Date();
  const dayOfMonth = now.getDate();
  const weekIndex = Math.min(3, Math.floor((dayOfMonth - 1) / 7));
  const dayIndex = (now.getDay() + 6) % 7; // Monday=0 ... Sunday=6
  const hour = now.getHours();
  let currentMeal = 'breakfast';
  if(hour >= 11 && hour < 16) currentMeal = 'lunch';
  else if(hour >= 16 || hour < 5) currentMeal = 'dinner';
  return { weekIndex, dayIndex, currentMeal, now };
}

// ---------------- SCHEDULING ----------------
function shuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function filteredPool(meal){
  const base = DISHES.filter(d=>
    d.meal===meal &&
    (state.diet==='all' || d.category===state.diet) &&
    d.effort <= state.maxEffort &&
    (!state.quickOnly || d.time<=20) &&
    !excludedDishes.includes(d.name)
  );
  return applyBudgetNarrowing(base);
}

// "Budget picks" keeps the cheaper half of whatever already matched the other
// filters, per meal — not a fixed ₹ cutoff — so veg, non-veg and south-indian
// each keep reasonable variety instead of non-veg (naturally pricier) being
// squeezed down to almost nothing by one global number.
function applyBudgetNarrowing(pool){
  if(!state.budgetOnly) return pool;
  const priced = pool.map(d => ({ d, cost: dishCostPerServing(d) })).filter(x => x.cost !== null);
  if(priced.length < 4) return pool; // too few priced dishes to safely narrow further
  priced.sort((a,b) => a.cost - b.cost);
  const keep = Math.max(4, Math.ceil(priced.length / 2));
  return priced.slice(0, keep).map(x => x.d);
}

function pickWeek(pool, prevWeekPicks){
  if(pool.length===0) return null;
  let candidates = shuffle(pool);
  let avoiding = candidates.filter(d=>!prevWeekPicks.includes(d.name));
  let usable = avoiding.length>=7 ? avoiding : candidates;

  const picks = [];
  const used = new Set();
  let cursor = shuffle(usable);
  let idx = 0;
  while(picks.length<7){
    if(idx>=cursor.length){ cursor = shuffle(pool); idx = 0; }
    const d = cursor[idx];
    if(!used.has(d.name) || pool.length<7){
      picks.push(d);
      used.add(d.name);
    }
    idx++;
    if(idx>500) break;
  }
  return picks;
}

function generateSchedule(){
  const meals = ["breakfast","lunch","dinner"];
  const pools = {};
  let insufficient = [];
  meals.forEach(m=>{
    pools[m] = filteredPool(m);
    if(pools[m].length < 7) insufficient.push(`${m} (${pools[m].length} dish${pools[m].length===1?'':'es'})`);
  });

  if(pools.breakfast.length===0 || pools.lunch.length===0 || pools.dinner.length===0){
    document.getElementById('scheduleOutput').innerHTML =
      '<div class="empty-state">No dishes match this combination of filters. Try loosening a filter, turning off Budget picks, or allowing back an excluded dish.</div>';
    document.getElementById('floatingActionBar').classList.add('hidden');
    document.getElementById('planToolbar').classList.add('hidden');
    showToast("No matching dishes — widen your filters");
    return null;
  }

  const weeks = [];
  let prevPicks = {breakfast:[], lunch:[], dinner:[]};
  for(let w=0; w<4; w++){
    const weekMeals = {};
    meals.forEach(m=>{
      const picks = pickWeek(pools[m], prevPicks[m]);
      weekMeals[m] = picks;
      prevPicks[m] = picks.map(d=>d.name);
    });
    const days = DAY_NAMES.map((dayName, i)=>({
      day: dayName,
      breakfast: weekMeals.breakfast[i],
      lunch: weekMeals.lunch[i],
      dinner: weekMeals.dinner[i],
    }));
    weeks.push(days);
  }

  if(insufficient.length){
    showToast("Heads up: limited dishes for " + insufficient.join(", ") + " — some repeats may occur");
  } else {
    showToast("4-week schedule generated!");
  }
  trackEvent('generate_schedule', { diet: state.diet, max_effort: state.maxEffort, portion: state.portion, quick_only: state.quickOnly, budget_only: state.budgetOnly });
  return weeks;
}

// ---------------- RENDERING ----------------
// Per-serving cost estimate for a single dish, used for the 💰 badge on each
// meal card. Unlike the grocery list (which rounds up to whole packs for a
// month of shopping), this uses fractional pack pricing since a single dish
// only ever uses a slice of a pack. Returns null if any ingredient lacks a
// price, so the badge only appears when the estimate is complete.
function dishCostPerServing(dish){
  if(!dish || !dish.ingredients || !dish.ingredients.length) return null;
  let total = 0;
  for(const ing of dish.ingredients){
    const entry = PACK_CATALOG[ing.name];
    if(!entry || typeof entry.priceINR !== 'number') return null;
    if(ing.unit === 'pack'){
      total += ing.qty * entry.priceINR;
    }else{
      if(typeof entry.perPack !== 'number') return null;
      total += (ing.qty / entry.perPack) * entry.priceINR;
    }
  }
  return total / 2; // dish ingredients as written serve 2 people
}

// Same shape as dishCostPerServing but for calories: kcalPerUnit on each
// PACK_CATALOG entry is the calorie content of ONE recipe-unit of that
// ingredient (one cup/tbsp/tsp/g/pcs, or one whole pack for ready-made), so
// this just multiplies by the recipe's quantity and halves for one serving.
// These are general estimates (e.g. USDA-style averages for home cooking),
// not a lab analysis of your exact recipe — treat them as a ballpark.
function dishCaloriesPerServing(dish){
  if(!dish || !dish.ingredients || !dish.ingredients.length) return null;
  let total = 0;
  for(const ing of dish.ingredients){
    const entry = PACK_CATALOG[ing.name];
    if(!entry || typeof entry.kcalPerUnit !== 'number') return null;
    total += ing.qty * entry.kcalPerUnit;
  }
  return total / 2;
}

// Sums the three per-serving badges for one day. Each badge is already a
// fixed "per 1 person" figure, so adding breakfast+lunch+dinner directly
// gives that day's per-person total — no portion scaling needed here.
// Keeps a day-card's header total badge in sync after a swap changes one of
// its meals, without re-rendering the whole day (which would lose scroll
// position and any other day's state).
function refreshDayTotalsBadge(wi, di){
  const card = document.getElementById(`day-${wi}-${di}`);
  if(!card) return;
  const titleEl = card.querySelector('.day-title');
  const existing = titleEl.querySelector('.day-totals');
  const totals = dayTotals(lastWeeks[wi][di]);
  const html = (totals && totals.complete)
    ? `<span class="day-totals">🔥 ≈ ${Math.round(totals.kcal/10)*10} kcal · 💰 ≈ ₹${Math.round(totals.cost)}</span>`
    : '';
  if(existing) existing.outerHTML = html;
  else if(html) titleEl.insertAdjacentHTML('beforeend', html);
}

function dayTotals(day){
  const meals = [day.breakfast, day.lunch, day.dinner].filter(Boolean);
  if(!meals.length) return null;
  let kcal = 0, cost = 0, complete = true;
  meals.forEach(dish => {
    const k = dishCaloriesPerServing(dish);
    const c = dishCostPerServing(dish);
    if(k === null || c === null) complete = false;
    kcal += k || 0;
    cost += c || 0;
  });
  return { kcal, cost, complete };
}

function dishRowHTML(label, dish, mealKey, wi, di){
  if(!dish) return '';
  const ingredientsPreview = (!dish.readymade && dish.ingredients && dish.ingredients.length)
    ? `<p class="ingredients-list">Needs: ${dish.ingredients.map(i=>i.name).join(", ")}</p>`
    : '';
  const buyRow = dish.readymade
    ? `<div class="buy-row">
         <a class="buy-btn readymade" href="${shopLinkProduct(dish.name)}" target="_blank" rel="noopener sponsored" data-dish="${dish.name}" data-kind="readymade">📦 Buy ${dish.name}</a>
       </div>`
    : `<div class="buy-row">
         <a class="buy-btn readymade" href="${shopLinkReadymade(dish.name)}" target="_blank" rel="noopener sponsored" data-dish="${dish.name}" data-kind="readymade">📦 Ready-made</a>
         <a class="buy-btn ingredients" href="${shopLinkIngredients(dish)}" target="_blank" rel="noopener sponsored" data-dish="${dish.name}" data-kind="ingredients">🛒 Ingredients</a>
       </div>`;
  const mealActionsBtns = (mealKey!==undefined)
    ? `<div class="meal-actions">
         <button type="button" class="swap-btn" data-week="${wi}" data-day="${di}" data-meal="${mealKey}" title="Try a different ${label.toLowerCase()} dish" aria-label="Swap ${dish.name} for a different ${label.toLowerCase()} dish">🔄</button>
         <button type="button" class="exclude-btn" data-week="${wi}" data-day="${di}" data-meal="${mealKey}" data-dish="${dish.name}" title="Never suggest ${dish.name} again" aria-label="Never suggest ${dish.name} again">🚫</button>
       </div>`
    : '';
  const steps = dish.readymade
    ? [`Heat or prepare as per the pack instructions (about ${dish.time} min).`, "Plate and serve."]
    : (RECIPES[dish.name] || null);
  const howTo = steps
    ? `<details class="how-to"><summary>📖 How to cook</summary><ol>${steps.map(st=>`<li>${st}</li>`).join('')}</ol></details>`
    : '';
  const rowId = (mealKey!==undefined) ? `id="meal-${wi}-${di}-${mealKey}"` : '';
  return `
    <div class="meal-row" ${rowId}>
      <div class="meal-top">
        <div class="meal-icon">${label}</div>
        <div class="meal-main">
          <p class="meal-name">${dish.name}</p>
          <div class="meal-meta">
            ${dish.readymade ? '<span class="tag readymade">📦 Ready-made</span>' : ''}
            <span class="tag ${dish.category}">${CAT_LABEL[dish.category]}</span>
            <span class="peppers">${PEPPER[dish.effort]}</span>
            <span class="time-badge">⏱ ${dish.time} min</span>
            ${(()=>{ const c = dishCostPerServing(dish); return c===null ? '' : `<span class="cost-badge">💰 ≈ ₹${Math.round(c)}/serving</span>`; })()}
            ${(()=>{ const k = dishCaloriesPerServing(dish); return k===null ? '' : `<span class="kcal-badge">🔥 ≈ ${Math.round(k/10)*10} kcal</span>`; })()}
          </div>
          ${ingredientsPreview}
          ${howTo}
        </div>
        ${mealActionsBtns}
      </div>
      ${buyRow}
    </div>`;
}

function renderTodayHighlight(weeks){
  const box = document.getElementById('todayHighlight');
  const info = getTodayInfo();
  if(info.weekIndex >= weeks.length){ box.classList.add('hidden'); box.innerHTML = ''; return; }
  const today = weeks[info.weekIndex][info.dayIndex];
  if(!today){ box.classList.add('hidden'); box.innerHTML = ''; return; }

  const dateLabel = info.now.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' });
  const meals = [
    ['breakfast','🍳 Breakfast', today.breakfast],
    ['lunch','🍛 Lunch', today.lunch],
    ['dinner','🍲 Dinner', today.dinner],
  ];
  const rows = meals.map(([key,label,dish])=>{
    if(!dish) return '';
    const isNow = key === info.currentMeal;
    return `
      <div class="today-meal-row${isNow ? ' is-now' : ''}">
        <span class="today-meal-label">${label}${isNow ? ' <b>· now</b>' : ''}</span>
        <span class="today-meal-name">${dish.name}</span>
        <a class="buy-btn readymade" href="${dish.readymade ? shopLinkProduct(dish.name) : shopLinkReadymade(dish.name)}" target="_blank" rel="noopener sponsored" data-dish="${dish.name}" data-kind="today" aria-label="Find ${dish.name} on Amazon">🛒</a>
      </div>`;
  }).join('');

  const totals = dayTotals(today);
  const totalsHTML = (totals && totals.complete)
    ? `<span class="today-totals">🔥 ≈ ${Math.round(totals.kcal/10)*10} kcal · 💰 ≈ ₹${Math.round(totals.cost)}</span>`
    : '';

  box.innerHTML = `
    <div class="today-head">
      <span>📍 Today — ${dateLabel}</span>
      <button type="button" id="todaySeeFullBtn" class="text-action-btn">See in full plan ↓</button>
    </div>
    ${totalsHTML}
    ${rows}`;
  box.classList.remove('hidden');
  document.getElementById('todaySeeFullBtn').addEventListener('click', ()=> document.getElementById('jumpTodayBtn').click());
}

function renderSchedule(weeks){
  const out = document.getElementById('scheduleOutput');
  const info = getTodayInfo();
  let html = '';
  weeks.forEach((days, wi)=>{
    html += `<div class="week-head"><span class="wk-num">Week ${wi+1}</span><span class="wk-label">7 days &middot; no repeats</span><hr></div>`;
    days.forEach((d, di)=>{
      const isToday = wi===info.weekIndex && di===info.dayIndex;
      const totals = dayTotals(d);
      const totalsHTML = (totals && totals.complete)
        ? `<span class="day-totals">🔥 ≈ ${Math.round(totals.kcal/10)*10} kcal · 💰 ≈ ₹${Math.round(totals.cost)}</span>`
        : '';
      html += `<div class="day-card${isToday ? ' is-today':''}" id="day-${wi}-${di}">
        <div class="day-title"><span>${d.day}</span>${totalsHTML}</div>
        ${dishRowHTML('Breakfast', d.breakfast, 'breakfast', wi, di)}
        ${dishRowHTML('Lunch', d.lunch, 'lunch', wi, di)}
        ${dishRowHTML('Dinner', d.dinner, 'dinner', wi, di)}
      </div>`;
    });
  });
  out.innerHTML = html;
  renderTodayHighlight(weeks);
  document.getElementById('floatingActionBar').classList.remove('hidden');
  document.getElementById('planToolbar').classList.remove('hidden');
  applyPlanFilter();
}

document.getElementById('generateBtn').addEventListener('click', ()=>{
  const weeks = generateSchedule();
  if(weeks){
    lastWeeks = weeks;
    renderSchedule(weeks);
    savePlanToDevice(weeks);
  }
});

// ---------------- FIND A DISH / JUMP TO TODAY ----------------
function applyPlanFilter(){
  const input = document.getElementById('planSearch');
  const q = (input ? input.value : '').trim().toLowerCase();
  const out = document.getElementById('scheduleOutput');
  out.querySelectorAll('.plan-no-match').forEach(n => n.remove());

  let currentHead = null, headHasMatch = false, anyMatch = false;
  const closeHead = () => { if(currentHead) currentHead.style.display = (headHasMatch || !q) ? '' : 'none'; };

  Array.from(out.children).forEach(el => {
    if(el.classList.contains('week-head')){
      closeHead();
      currentHead = el; headHasMatch = false;
    }else if(el.classList.contains('day-card')){
      const names = Array.from(el.querySelectorAll('.meal-name')).map(n => n.textContent.toLowerCase()).join(' ');
      const match = !q || names.includes(q);
      el.style.display = match ? '' : 'none';
      if(match){ headHasMatch = true; anyMatch = true; }
    }
  });
  closeHead();

  if(q && !anyMatch){
    const msg = document.createElement('div');
    msg.className = 'plan-no-match';
    msg.textContent = 'No dish in your plan matches "' + q + '".';
    out.appendChild(msg);
  }
}
document.getElementById('planSearch').addEventListener('input', applyPlanFilter);

document.getElementById('jumpTodayBtn').addEventListener('click', ()=>{
  const search = document.getElementById('planSearch');
  if(search.value){ search.value = ''; applyPlanFilter(); }
  const card = document.querySelector('#scheduleOutput .day-card.is-today');
  if(card){
    card.scrollIntoView({ behavior:'smooth', block:'center' });
  }else{
    showToast("Today isn't in this plan's four weeks");
  }
});

// ---------------- SWAP A SINGLE MEAL ----------------
// Picks a different dish for one meal slot without touching the rest of the month.
// forceDish lets undo put an exact dish back, bypassing the random pick —
// it skips the "no match" check since restoring a dish that was already
// there a moment ago should always be allowed, even if filters changed.
function swapMealAt(wi, di, mealKey, { silent, forceDish } = {}){
  const current = lastWeeks[wi][di][mealKey];
  let next = forceDish;
  if(!next){
    const pool = filteredPool(mealKey);
    const others = pool.filter(d => d.name !== current.name);
    if(others.length === 0){
      if(!silent) showToast("No other dishes match your current filters for this meal");
      return false;
    }
    next = others[Math.floor(Math.random() * others.length)];
  }
  lastWeeks[wi][di][mealKey] = next;

  const label = mealKey.charAt(0).toUpperCase() + mealKey.slice(1);
  const rowHTML = dishRowHTML(label, next, mealKey, wi, di);
  const rowEl = document.getElementById(`meal-${wi}-${di}-${mealKey}`);
  if(rowEl) rowEl.outerHTML = rowHTML;

  savePlanToDevice(lastWeeks);
  applyPlanFilter();
  renderTodayHighlight(lastWeeks);
  refreshDayTotalsBadge(wi, di);
  return { next, previous: current };
}

document.getElementById('scheduleOutput').addEventListener('click', (e)=>{
  const swapBtnEl = e.target.closest('.swap-btn');
  const excludeBtnEl = e.target.closest('.exclude-btn');
  if(!lastWeeks || (!swapBtnEl && !excludeBtnEl)) return;

  if(swapBtnEl){
    const wi = parseInt(swapBtnEl.dataset.week, 10);
    const di = parseInt(swapBtnEl.dataset.day, 10);
    const mealKey = swapBtnEl.dataset.meal;
    const result = swapMealAt(wi, di, mealKey);
    if(result){
      const { next, previous } = result;
      showToast(`Swapped in ${next.name}`, {
        label: "Undo",
        onClick: ()=>{
          swapMealAt(wi, di, mealKey, { silent: true, forceDish: previous });
          showToast(`Back to ${previous.name}`);
        }
      });
      trackEvent('meal_swap', { meal: mealKey, new_dish: next.name });
    }
    return;
  }

  if(excludeBtnEl){
    const wi = parseInt(excludeBtnEl.dataset.week, 10);
    const di = parseInt(excludeBtnEl.dataset.day, 10);
    const mealKey = excludeBtnEl.dataset.meal;
    const dishName = excludeBtnEl.dataset.dish;

    addExcludedDish(dishName);
    const result = swapMealAt(wi, di, mealKey, { silent: true });
    const undoAction = {
      label: "Undo",
      onClick: ()=>{
        removeExcludedDish(dishName);
        if(result) swapMealAt(wi, di, mealKey, { silent: true, forceDish: result.previous });
        showToast(`${dishName} can be suggested again`);
      }
    };
    if(result){
      showToast(`${dishName} won't be suggested again — swapped in ${result.next.name}`, undoAction);
    }else{
      showToast(`${dishName} won't be suggested again`, undoAction);
    }
    trackEvent('dish_excluded', { dish: dishName });
  }
});

// ---------------- EXCLUDED DISHES ("never show again") ----------------
const EXCLUDED_DISHES_KEY = "busywomenCookSchedule.excludedDishes";

function loadExcludedDishes(){
  try{
    const raw = localStorage.getItem(EXCLUDED_DISHES_KEY);
    excludedDishes = raw ? JSON.parse(raw) : [];
  }catch(e){ excludedDishes = []; }
  updateExcludedDishesUI();
}

function saveExcludedDishes(){
  try{ localStorage.setItem(EXCLUDED_DISHES_KEY, JSON.stringify(excludedDishes)); }catch(e){}
  updateExcludedDishesUI();
}

function addExcludedDish(name){
  if(!excludedDishes.includes(name)){
    excludedDishes.push(name);
    saveExcludedDishes();
  }
}

function removeExcludedDish(name){
  excludedDishes = excludedDishes.filter(n => n !== name);
  saveExcludedDishes();
  renderExcludedDishesModal();
}

function updateExcludedDishesUI(){
  const btn = document.getElementById('openExcludedBtn');
  if(!btn) return;
  if(excludedDishes.length){
    btn.classList.remove('hidden');
    btn.textContent = `🚫 Excluded dishes (${excludedDishes.length})`;
  }else{
    btn.classList.add('hidden');
  }
}

function renderExcludedDishesModal(){
  const content = document.getElementById('excludedListContent');
  if(!excludedDishes.length){
    content.innerHTML = '<p class="modal-sub">No excluded dishes yet.</p>';
    return;
  }
  content.innerHTML = excludedDishes.map(name => `
    <div class="excluded-item">
      <span>${name}</span>
      <button type="button" class="text-action-btn un-exclude-btn" data-dish="${name}">↺ Allow again</button>
    </div>`).join('');
}

document.getElementById('openExcludedBtn').addEventListener('click', ()=>{
  renderExcludedDishesModal();
  openModal('excludedModal');
});

document.getElementById('excludedListContent').addEventListener('click', (e)=>{
  const btn = e.target.closest('.un-exclude-btn');
  if(!btn) return;
  removeExcludedDish(btn.dataset.dish);
  showToast(`${btn.dataset.dish} can be suggested again`);
});

loadExcludedDishes();

// ---------------- SAVE PLAN TO THIS DEVICE (offline, localStorage) ----------------
const SAVED_PLAN_KEY = "busywomenCookSchedule.savedPlan";

function savePlanToDevice(weeks){
  try{
    localStorage.setItem(SAVED_PLAN_KEY, JSON.stringify({ state, weeks, savedAt: Date.now() }));
    const btn = document.getElementById('clearSavedPlanBtn');
    if(btn) btn.classList.remove('hidden');
  }catch(e){
    // Storage full or blocked (e.g. private browsing) — the plan just won't persist.
  }
}

function restoreSavedPlan(){
  let saved;
  try{
    const raw = localStorage.getItem(SAVED_PLAN_KEY);
    if(!raw) return;
    saved = JSON.parse(raw);
  }catch(e){ return; }
  if(!saved || !saved.state || !saved.weeks) return;

  state = saved.state;
  setPillActive('dietFilter', state.diet);
  setPillActive('effortFilter', state.maxEffort);
  setPillActive('portionFilter', state.portion);
  document.querySelector('#quickOnlyFilter .pill').classList.toggle('active', !!state.quickOnly);
  document.querySelector('#budgetOnlyFilter .pill').classList.toggle('active', !!state.budgetOnly);
  document.getElementById('breakfastTime').value = state.times.breakfast;
  document.getElementById('lunchTime').value = state.times.lunch;
  document.getElementById('dinnerTime').value = state.times.dinner;

  lastWeeks = saved.weeks;
  renderSchedule(saved.weeks);
  document.getElementById('clearSavedPlanBtn').classList.remove('hidden');
  showToast("Restored your last saved plan");
}

document.getElementById('clearSavedPlanBtn').addEventListener('click', ()=>{
  try{ localStorage.removeItem(SAVED_PLAN_KEY); }catch(e){}
  document.getElementById('clearSavedPlanBtn').classList.add('hidden');
  showToast("Saved plan cleared from this device");
});

restoreSavedPlan();

// ---------------- MY PLANS (named plan library) ----------------
// Separate from the single auto-restored SAVED_PLAN_KEY above: this is an
// opt-in library of a few named plans the person explicitly chose to keep.
const PLAN_LIBRARY_KEY = "busywomenCookSchedule.planLibrary";
const PLAN_LIBRARY_MAX = 8;

function loadPlanLibrary(){
  try{ return JSON.parse(localStorage.getItem(PLAN_LIBRARY_KEY) || "[]"); }catch(e){ return []; }
}
function savePlanLibrary(list){
  try{ localStorage.setItem(PLAN_LIBRARY_KEY, JSON.stringify(list)); }catch(e){ /* storage full or blocked */ }
}

function renderPlanLibrary(){
  const list = loadPlanLibrary().sort((a,b) => b.savedAt - a.savedAt);
  const box = document.getElementById('planLibraryList');
  if(!list.length){
    box.innerHTML = '<p class="plan-library-empty">No saved plans yet — name one above to keep it here.</p>';
    return;
  }
  const currentSig = lastWeeks ? JSON.stringify(lastWeeks) : null;
  box.innerHTML = list.map(p => {
    const dateLabel = new Date(p.savedAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
    const isCurrent = currentSig && JSON.stringify(p.weeks) === currentSig;
    return `
    <div class="plan-library-item${isCurrent ? ' is-current' : ''}">
      <div class="plan-library-info">
        <div class="plan-library-name">${p.name}${isCurrent ? ' (current)' : ''}</div>
        <div class="plan-library-meta">Saved ${dateLabel}</div>
      </div>
      <button type="button" class="text-action-btn load-plan-btn" data-id="${p.id}">📂 Load</button>
      <button type="button" class="text-action-btn delete-plan-btn" data-id="${p.id}">🗑</button>
    </div>`;
  }).join('');
}

document.getElementById('openLibraryBtn').addEventListener('click', ()=>{
  renderPlanLibrary();
  openModal('planLibraryModal');
});

document.getElementById('saveToLibraryBtn').addEventListener('click', ()=>{
  if(!lastWeeks){ showToast("Generate a plan first"); return; }
  const input = document.getElementById('planLibraryName');
  const name = input.value.trim();
  if(!name){ showToast("Give this plan a name first"); return; }

  const list = loadPlanLibrary();
  if(list.length >= PLAN_LIBRARY_MAX){
    showToast(`You can keep up to ${PLAN_LIBRARY_MAX} plans — delete one first`);
    return;
  }
  list.push({ id: 'plan_' + Date.now(), name, savedAt: Date.now(), state: JSON.parse(JSON.stringify(state)), weeks: JSON.parse(JSON.stringify(lastWeeks)) });
  savePlanLibrary(list);
  input.value = '';
  renderPlanLibrary();
  trackEvent('plan_saved_to_library', {});
  showToast(`Saved as "${name}"`);
});

document.getElementById('planLibraryList').addEventListener('click', e=>{
  const loadBtn = e.target.closest('.load-plan-btn');
  const delBtn = e.target.closest('.delete-plan-btn');
  if(!loadBtn && !delBtn) return;
  const id = (loadBtn || delBtn).dataset.id;
  const list = loadPlanLibrary();
  const entry = list.find(p => p.id === id);
  if(!entry) return;

  if(loadBtn){
    state = entry.state;
    setPillActive('dietFilter', state.diet);
    setPillActive('effortFilter', state.maxEffort);
    setPillActive('portionFilter', state.portion);
    document.querySelector('#quickOnlyFilter .pill').classList.toggle('active', !!state.quickOnly);
    document.querySelector('#budgetOnlyFilter .pill').classList.toggle('active', !!state.budgetOnly);
    document.getElementById('breakfastTime').value = state.times.breakfast;
    document.getElementById('lunchTime').value = state.times.lunch;
    document.getElementById('dinnerTime').value = state.times.dinner;

    lastWeeks = entry.weeks;
    renderSchedule(entry.weeks);
    savePlanToDevice(entry.weeks); // loaded plan becomes the one that auto-restores too
    closeModal('planLibraryModal');
    showToast(`Loaded "${entry.name}"`);
    trackEvent('plan_loaded_from_library', {});
  }else if(delBtn){
    savePlanLibrary(list.filter(p => p.id !== id));
    renderPlanLibrary();
    showToast(`Deleted "${entry.name}"`);
  }
});

// ---------------- MODALS ----------------
function openModal(id){ document.getElementById(id).classList.remove('hidden'); }
function closeModal(id){ document.getElementById(id).classList.add('hidden'); }
document.querySelectorAll('.close-modal').forEach(btn=>{
  btn.addEventListener('click', ()=> closeModal(btn.dataset.target));
});
document.querySelectorAll('.modal-overlay').forEach(overlay=>{
  overlay.addEventListener('click', e=>{
    if(e.target === overlay) closeModal(overlay.id);
  });
});
document.addEventListener('keydown', e=>{
  if(e.key !== 'Escape') return;
  document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(m => closeModal(m.id));
});

// ---------------- GROCERY AGGREGATOR ----------------
function roundQty(n){
  const rounded = Math.round(n * 100) / 100;
  return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(2).replace(/0+$/,'').replace(/\.$/,'');
}

function aggregateGroceries(weeks, portion){
  const scale = portion / 2; // base data is written for 2 people
  const totals = {}; // name -> { qty, unit }
  weeks.forEach(days=>{
    days.forEach(d=>{
      ['breakfast','lunch','dinner'].forEach(m=>{
        const dish = d[m];
        if(!dish || !dish.ingredients) return;
        dish.ingredients.forEach(ing=>{
          const key = ing.name + '|' + ing.unit;
          if(!totals[key]) totals[key] = { name: ing.name, unit: ing.unit, qty: 0 };
          totals[key].qty += ing.qty * scale;
        });
      });
    });
  });
  return Object.values(totals).sort((a,b)=> a.name.localeCompare(b.name));
}

// Turns a raw recipe total into a purchasable Amazon quantity using PACK_CATALOG.
// e.g. 2.3 cups Basmati rice -> { packs: 1, label: "1 kg pack" }
function getPurchaseInfo(item){
  if(item.unit === 'pack'){
    const packs = Math.max(1, Math.ceil(item.qty - 1e-9));
    return { packs, label: packs === 1 ? "pack" : "packs", isReadyPack: true };
  }
  const entry = PACK_CATALOG[item.name];
  if(!entry) return null;
  const packs = Math.max(1, Math.ceil(item.qty / entry.perPack - 1e-9));
  return { packs, label: entry.label, isReadyPack: false };
}

function purchaseText(item){
  const p = getPurchaseInfo(item);
  if(!p) return `${roundQty(item.qty)} ${item.unit}`;
  return p.isReadyPack ? `${p.packs} ${p.label}` : `${p.packs} × ${p.label}`;
}

// Cost is an estimate only: it multiplies packsNeeded by a rough typical Amazon
// India price baked into PACK_CATALOG (see js/data.js). Prices vary by seller,
// brand and date, so this is for a ballpark monthly budget, not a live quote.
function estimatedCost(item){
  const entry = PACK_CATALOG[item.name];
  if(!entry || typeof entry.priceINR !== 'number') return null;
  const p = getPurchaseInfo(item);
  const packs = p ? p.packs : 1;
  return packs * entry.priceINR;
}

const GROCERY_AISLE_ORDER = ["Vegetables & Produce","Grains & Pulses","Dairy & Paneer","Meat, Fish & Seafood","Spices & Masalas","Pantry, Oils & Sauces","Ready-to-eat / Instant","Other"];
const GROCERY_CHECKED_KEY = "busywomenCookSchedule.groceryChecked";

function loadGroceryChecked(){
  try{ return JSON.parse(localStorage.getItem(GROCERY_CHECKED_KEY) || "{}"); }catch(e){ return {}; }
}
function saveGroceryChecked(map){
  try{ localStorage.setItem(GROCERY_CHECKED_KEY, JSON.stringify(map)); }catch(e){}
}

function renderGroceryList(){
  if(!lastWeeks){ showToast("Generate a schedule first"); return; }
  const items = aggregateGroceries(lastWeeks, state.portion);
  const content = document.getElementById('groceryListContent');
  const checked = loadGroceryChecked();
  let total = 0, allPriced = true;

  const byAisle = {};
  items.forEach(item => {
    const aisle = (PACK_CATALOG[item.name] && PACK_CATALOG[item.name].aisle) || "Other";
    (byAisle[aisle] = byAisle[aisle] || []).push(item);
  });

  content.innerHTML = GROCERY_AISLE_ORDER.filter(a => byAisle[a] && byAisle[a].length).map(aisle => {
    const rows = byAisle[aisle].map(item => {
      const cost = estimatedCost(item);
      if(cost === null) allPriced = false; else total += cost;
      const costHTML = cost === null ? '' : `<small class="g-cost">≈ ₹${Math.round(cost)}</small>`;
      const isChecked = !!checked[item.name];
      return `
      <div class="grocery-item${isChecked ? ' is-checked' : ''}">
        <input type="checkbox" data-item="${item.name}" ${isChecked ? 'checked' : ''} />
        <span class="g-name">${item.name}<small class="g-need">recipes need ≈ ${roundQty(item.qty)} ${item.unit}</small></span>
        <span class="g-qty">Buy ${purchaseText(item)}${costHTML}</span>
        <a class="buy-btn readymade" href="${shopLinkProduct(item.name)}" target="_blank" rel="noopener sponsored" data-dish="${item.name}" data-kind="grocery" aria-label="Find ${item.name} on Amazon">🛒</a>
      </div>`;
    }).join('');
    return `<div class="grocery-aisle"><h4 class="grocery-aisle-head">${aisle}</h4>${rows}</div>`;
  }).join('');

  const totalEl = document.getElementById('groceryTotal');
  totalEl.innerHTML = `Estimated total: <b>≈ ₹${Math.round(total).toLocaleString('en-IN')}</b> for ${state.portion} ${state.portion===1?'person':'people'} this month${allPriced ? '' : ' (some items unpriced)'} — rough estimate, not live prices`;
  openModal('groceryModal');
}
document.getElementById('openGroceryBtn').addEventListener('click', renderGroceryList);

document.getElementById('groceryListContent').addEventListener('change', e=>{
  const box = e.target.closest('input[type="checkbox"]');
  if(!box) return;
  const checked = loadGroceryChecked();
  if(box.checked) checked[box.dataset.item] = true; else delete checked[box.dataset.item];
  saveGroceryChecked(checked);
  box.closest('.grocery-item').classList.toggle('is-checked', box.checked);
});

document.getElementById('clearGroceryChecksBtn').addEventListener('click', ()=>{
  saveGroceryChecked({});
  document.querySelectorAll('#groceryListContent .grocery-item').forEach(row=>{
    row.classList.remove('is-checked');
    const box = row.querySelector('input[type="checkbox"]');
    if(box) box.checked = false;
  });
  showToast("Checklist cleared");
});

// ---------------- PRINT ----------------
function printWithClass(cls){
  if(cls) document.body.classList.add(cls);
  const cleanup = ()=>{
    document.body.classList.remove('print-grocery');
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  window.print();
}
document.getElementById('printPlanBtn').addEventListener('click', ()=>{
  if(!lastWeeks){ showToast("Generate a schedule first"); return; }
  trackEvent('print_plan', {});
  printWithClass(null);
});
document.getElementById('printGroceryBtn').addEventListener('click', ()=>{
  if(!lastWeeks) return;
  trackEvent('print_grocery', {});
  printWithClass('print-grocery');
});

document.getElementById('copyGroceryBtn').addEventListener('click', ()=>{
  if(!lastWeeks) return;
  const items = aggregateGroceries(lastWeeks, state.portion);
  let total = 0;
  items.forEach(i => { const c = estimatedCost(i); if(c !== null) total += c; });

  const byAisle = {};
  items.forEach(item => {
    const aisle = (PACK_CATALOG[item.name] && PACK_CATALOG[item.name].aisle) || "Other";
    (byAisle[aisle] = byAisle[aisle] || []).push(item);
  });
  const itemLines = GROCERY_AISLE_ORDER.filter(a => byAisle[a] && byAisle[a].length).flatMap(aisle => [
    `*${aisle}*`,
    ...byAisle[aisle].map(i => {
      const c = estimatedCost(i);
      return `• ${i.name} — buy ${purchaseText(i)}${c===null?'':' (≈ ₹'+Math.round(c)+')'} (need ≈ ${roundQty(i.qty)} ${i.unit})`;
    }),
    ""
  ]);

  const text = [
    ...brandHeaderLines(),
    "",
    `🛒 Grocery List — scaled for ${state.portion} ${state.portion===1?'person':'people'}`,
    `Estimated total: ≈ ₹${Math.round(total).toLocaleString('en-IN')} (rough estimate, not live prices)`,
    "",
    ...itemLines,
    ...brandFooterLines(),
  ].join("\n");
  navigator.clipboard.writeText(text).then(()=>{
    showToast("Grocery list copied to clipboard!");
  }).catch(()=>{
    showToast("Couldn't copy — select and copy manually");
  });
});

// ---------------- SUNDAY BATCH PREP ----------------
function generatePrepList(weeks){
  const info = getTodayInfo();
  const week = weeks[info.weekIndex] || weeks[0];
  const freq = {}; // ingredient name -> count of meals using it this week
  week.forEach(d=>{
    ['breakfast','lunch','dinner'].forEach(m=>{
      const dish = d[m];
      if(!dish || dish.readymade || !dish.ingredients) return;
      dish.ingredients.forEach(ing=>{
        freq[ing.name] = (freq[ing.name] || 0) + 1;
      });
    });
  });
  const repeated = Object.entries(freq)
    .filter(([, count]) => count >= 2)
    .sort((a,b)=> b[1]-a[1])
    .slice(0, 8);

  const items = repeated.map(([name, count]) => ({
    title: `Prep ${name}`,
    note: `Used in ${count} meals this week — chop, soak, or portion it in advance.`
  }));

  const hasEggs = 'Eggs' in freq;
  const hasRice = Object.keys(freq).some(k => /rice/i.test(k));
  const hasNonVegProtein = week.some(d => ['breakfast','lunch','dinner'].some(m => d[m] && d[m].category==='non-veg' && !d[m].readymade));

  if(hasRice) items.push({ title:"Batch-cook rice", note:"Cook a big pot and refrigerate in portions — reheats in 2 minutes for any meal." });
  if(hasNonVegProtein) items.push({ title:"Marinate proteins ahead", note:"Marinate chicken/fish/mutton for the week's curries and freeze in meal-size bags." });
  if(hasEggs) items.push({ title:"Hard-boil a dozen eggs", note:"Keeps refrigerated for quick breakfasts and salads all week." });
  items.push({ title:"Wash & store leafy greens", note:"Wash, dry, and store greens so they're ready to toss into any dish." });

  return items;
}

function renderPrepList(){
  if(!lastWeeks){ showToast("Generate a schedule first"); return; }
  const items = generatePrepList(lastWeeks);
  const content = document.getElementById('prepListContent');
  content.innerHTML = items.map(item => `
    <div class="prep-item">
      <input type="checkbox" />
      <div>
        <p class="p-title">${item.title}</p>
        <p class="p-note">${item.note}</p>
      </div>
    </div>`).join('');
  openModal('prepModal');
}
document.getElementById('openPrepBtn').addEventListener('click', renderPrepList);

// ---------------- BRANDING (auto letterhead + description) ----------------
function brandHeaderLines(){
  return [
    "🍽️ *Busywomen Cook Schedule*",
    "Plan once, cook all month · zero repeats per week",
  ];
}
function brandFooterLines(){
  return [
    "",
    "As an Amazon Associate, this app earns from qualifying purchases.",
  ];
}
function autoDescribeDay(today){
  // Auto-generated one-line description from that day's ingredients.
  const names = new Set();
  ['breakfast','lunch','dinner'].forEach(m=>{
    const dish = today[m];
    if(dish && dish.ingredients){
      dish.ingredients.forEach(i => names.add(i.name));
    }
  });
  const list = [...names].slice(0, 6);
  if(!list.length) return '';
  return `🧾 Today needs: ${list.join(", ")}${names.size>6 ? ', ...' : ''}`;
}

// ---------------- FEEDBACK ----------------
document.getElementById('openFeedbackBtn').addEventListener('click', ()=> openModal('feedbackModal'));

function buildFeedbackText(){
  const name = document.getElementById('feedbackName').value.trim();
  const message = document.getElementById('feedbackMessage').value.trim();
  return { name, message };
}

// Feedback goes to OUR backend (POST /api/feedback). The owner's e-mail
// address lives only in the server's private settings, so it is never in
// this page's source and never shown to a visitor. There is deliberately no
// mailto: fallback, because that would expose the address.
document.getElementById('sendFeedbackBtn').addEventListener('click', async ()=>{
  const { name, message } = buildFeedbackText();
  if(!message){ showToast("Write a message first"); return; }

  const url = apiUrl('/api/feedback');
  if(!url){
    showToast("Feedback sending isn't set up yet — try Copy Message instead");
    return;
  }

  const btn = document.getElementById('sendFeedbackBtn');
  btn.disabled = true;
  try{
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, message,
        website: document.getElementById('feedbackWebsite').value, // honeypot, must stay empty
      }),
    });
    const data = await res.json().catch(()=>({}));
    if(res.ok && data.ok){
      showToast("Thanks! Your feedback was sent.");
      document.getElementById('feedbackMessage').value = "";
      closeModal('feedbackModal');
      trackEvent('feedback_sent', {});
    }else if(res.status === 429){
      showToast("You've sent a few already — please try again later");
    }else{
      showToast("Couldn't send — please try again or copy your message");
    }
  }catch(e){
    showToast("Couldn't send — check your connection or copy your message");
  }
  btn.disabled = false;
});

document.getElementById('copyFeedbackBtn').addEventListener('click', ()=>{
  const { name, message } = buildFeedbackText();
  if(!message){ showToast("Write a message first"); return; }
  const text = (name ? "From: " + name + "\n\n" : "") + message;
  navigator.clipboard.writeText(text).then(()=>{
    showToast("Feedback copied to clipboard!");
  }).catch(()=>{
    showToast("Couldn't copy — please copy manually");
  });
});

// ---------------- SHARE THIS APP (reach new people, not just today's plan) ----------------
function appShareData(){
  return {
    title: "Busywomen Cook Schedule",
    text: "Free monthly meal planner for busy Indian households — veg, non-veg or South Indian, with grocery lists, budget picks and cost estimates.",
    url: CONFIG.siteUrl,
  };
}

document.getElementById('shareAppBtn').addEventListener('click', async ()=>{
  const data = appShareData();
  // navigator.share opens the phone's own share sheet — every app the
  // visitor has installed (WhatsApp, Telegram, Instagram, SMS, email, etc.),
  // not just one hardcoded channel. This is the real "reach everyone" path
  // on mobile. Desktop browsers mostly don't support it, so fall back to a
  // direct WhatsApp share there, since that's this audience's main channel.
  if(navigator.share){
    try{
      await navigator.share(data);
      trackEvent('app_shared', { method: 'native' });
    }catch(e){ /* person cancelled the share sheet — not an error */ }
    return;
  }
  const url = "https://wa.me/?text=" + encodeURIComponent(data.text + " " + data.url);
  window.open(url, "_blank", "noopener");
  trackEvent('app_shared', { method: 'whatsapp_fallback' });
});

document.getElementById('copyAppLinkBtn').addEventListener('click', ()=>{
  navigator.clipboard.writeText(CONFIG.siteUrl).then(()=>{
    showToast("Link copied — paste it anywhere");
    trackEvent('app_link_copied', {});
  }).catch(()=>{
    showToast("Couldn't copy — select and copy manually");
  });
});

// ---------------- VISITOR COUNT (footer) ----------------
// Our own backend counts anonymous unique visitors per day (India time) and
// returns "visitors today" plus the running total. If the backend isn't
// reachable the line simply stays hidden — never an error, never a fake number.
function initVisitCounter(){
  const el = document.getElementById('visitCounter');
  const url = apiUrl('/api/visit');
  if(!el || !url) return;
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: '{}',
    credentials: 'omit',
  })
    .then(r => r.json())
    .then(data => {
      if(data && data.ok && typeof data.today === 'number'){
        const n = v => Number(v).toLocaleString('en-IN');
        el.textContent = `👀 ${n(data.today)} visitor${data.today === 1 ? '' : 's'} today · ${n(data.total_visits)} total visits`;
        el.classList.remove('hidden');
      }
    })
    .catch(()=>{ /* backend unreachable this time — stay hidden */ });
}
initVisitCounter();

// ---------------- WHATSAPP SHARE (WHOLE WEEK) ----------------
// Tries the phone's native share sheet first — on mobile this reaches every
// installed app (Telegram, Instagram, SMS, email, WhatsApp, etc.), not just
// one hardcoded channel. Falls back to opening WhatsApp directly, exactly
// the old behaviour, for desktop browsers that don't support native share.
function shareTextOrWhatsApp(text, trackName){
  if(navigator.share){
    navigator.share({ text }).then(()=>{
      trackEvent(trackName, { method: 'native' });
    }).catch(()=>{ /* person cancelled the share sheet — not an error */ });
    return;
  }
  window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank", "noopener");
  trackEvent(trackName, { method: 'whatsapp_fallback' });
}

document.getElementById('shareWeekBtn').addEventListener('click', ()=>{
  if(!lastWeeks){ showToast("Generate a schedule first"); return; }
  const info = getTodayInfo();
  const days = lastWeeks[info.weekIndex];
  const dishName = d => d ? d.name : '-';
  const lines = [
    ...brandHeaderLines(),
    "",
    `📆 Week ${info.weekIndex + 1} plan`,
    "",
    ...days.map(d => `*${d.day}*\n🍳 ${dishName(d.breakfast)}\n🍛 ${dishName(d.lunch)}\n🍲 ${dishName(d.dinner)}`)
      .flatMap((block, i, arr) => i < arr.length - 1 ? [block, ""] : [block]),
    ...brandFooterLines(),
  ];
  shareTextOrWhatsApp(lines.join("\n"), 'whatsapp_share_week');
});

// ---------------- SHARE TODAY'S PLAN ----------------
document.getElementById('shareWhatsAppBtn').addEventListener('click', ()=>{
  if(!lastWeeks){ showToast("Generate a schedule first"); return; }
  const info = getTodayInfo();
  const today = lastWeeks[info.weekIndex][info.dayIndex];
  const desc = autoDescribeDay(today);
  const lines = [
    ...brandHeaderLines(),
    "",
    `${today.day}'s plan:`,
    `🍳 Breakfast: ${today.breakfast ? today.breakfast.name : '-'}`,
    `🍛 Lunch: ${today.lunch ? today.lunch.name : '-'}`,
    `🍲 Dinner: ${today.dinner ? today.dinner.name : '-'}`,
    ...(desc ? ["", desc] : []),
    ...brandFooterLines(),
  ];
  shareTextOrWhatsApp(lines.join("\n"), 'whatsapp_share');
});

// ---------------- CALENDAR EXPORT (.ics) ----------------
function pad(n){ return n.toString().padStart(2, '0'); }
function formatICSDate(date, timeStr){
  const [h, m] = timeStr.split(':').map(Number);
  return `${date.getFullYear()}${pad(date.getMonth()+1)}${pad(date.getDate())}T${pad(h)}${pad(m)}00`;
}
function icsEscape(text){
  return String(text).replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n');
}

function buildICS(weeks, reminderOffset){
  const flatDays = [];
  weeks.forEach(week => week.forEach(day => flatDays.push(day)));

  const startDate = new Date();
  startDate.setHours(0,0,0,0);

  let ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Busywomen Cook Schedule//EN",
    "CALSCALE:GREGORIAN",
  ];

  flatDays.forEach((day, i)=>{
    const eventDate = new Date(startDate);
    eventDate.setDate(startDate.getDate() + i);

    ['breakfast','lunch','dinner'].forEach(meal=>{
      const dish = day[meal];
      if(!dish) return;
      const timeStr = state.times[meal];
      const uid = `${eventDate.getTime()}-${meal}@busywomencook`;
      const desc = dish.ingredients ? dish.ingredients.map(x=>x.name).join(", ") : "";
      ics.push("BEGIN:VEVENT");
      ics.push(`UID:${uid}`);
      ics.push(`DTSTAMP:${formatICSDate(new Date(), "00:00")}Z`);
      ics.push(`DTSTART:${formatICSDate(eventDate, timeStr)}`);
      ics.push(`SUMMARY:${icsEscape(meal.charAt(0).toUpperCase()+meal.slice(1) + ": " + dish.name)}`);
      if(desc) ics.push(`DESCRIPTION:${icsEscape(desc)}`);
      ics.push("DURATION:PT30M");
      if(reminderOffset && reminderOffset !== "none"){
        ics.push("BEGIN:VALARM");
        ics.push("ACTION:DISPLAY");
        ics.push(`DESCRIPTION:${icsEscape(dish.name)}`);
        ics.push(`TRIGGER:${reminderOffset}`);
        ics.push("END:VALARM");
      }
      ics.push("END:VEVENT");
    });
  });

  ics.push("END:VCALENDAR");
  return ics.join("\r\n");
}

document.getElementById('exportCalendarBtn').addEventListener('click', ()=>{
  if(!lastWeeks){ showToast("Generate a schedule first"); return; }
  const reminderOffset = document.getElementById('reminderInterval').value;
  const icsContent = buildICS(lastWeeks, reminderOffset);
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = "busywomen-cook-schedule.ics";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Calendar file downloaded!");
  trackEvent('calendar_export', { reminder: reminderOffset });
});
