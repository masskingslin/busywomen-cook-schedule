// ============================================================
// BUSYWOMEN COOK SCHEDULE — APP LOGIC
// ============================================================

let state = {
  diet: "all",
  maxEffort: 3,
  portion: 2,
  quickOnly: false,
  times: { breakfast: "08:00", lunch: "13:00", dinner: "20:00" },
};

let lastWeeks = null; // the 4-week schedule currently on screen
let excludedDishes = []; // dish names the user never wants suggested again

// ---------------- ANALYTICS (Google Analytics 4, optional) ----------------
// Only loads if CONFIG.gaMeasurementId has been set to a real ID — stays fully
// silent (no network call, no tracking) until then.
function initAnalytics(){
  if(!CONFIG.gaMeasurementId || CONFIG.gaMeasurementId === "G-XXXXXXXXXX") return;
  const s = document.createElement('script');
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + CONFIG.gaMeasurementId;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function(){ window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', CONFIG.gaMeasurementId);
}
initAnalytics();

function trackEvent(name, params){
  if(typeof window.gtag === 'function'){
    window.gtag('event', name, params || {});
  }
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
function showToast(message){
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.remove('hidden');
  requestAnimationFrame(()=> el.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{
    el.classList.remove('show');
    setTimeout(()=> el.classList.add('hidden'), 200);
  }, 2400);
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

['breakfast','lunch','dinner'].forEach(meal=>{
  document.getElementById(meal + 'Time').addEventListener('change', e=>{
    state.times[meal] = e.target.value;
  });
});

document.getElementById('resetPreferencesBtn').addEventListener('click', ()=>{
  state = { diet:"all", maxEffort:3, portion:2, quickOnly:false, times:{breakfast:"08:00", lunch:"13:00", dinner:"20:00"} };
  setPillActive('dietFilter', 'all');
  setPillActive('effortFilter', '3');
  setPillActive('portionFilter', '2');
  document.querySelector('#quickOnlyFilter .pill').classList.remove('active');
  document.getElementById('breakfastTime').value = "08:00";
  document.getElementById('lunchTime').value = "13:00";
  document.getElementById('dinnerTime').value = "20:00";
  resetAlarmButtons();
  showToast("Preferences reset to defaults");
});

// ---------------- NATIVE PHONE ALARMS ----------------
const MEAL_LABELS = { breakfast: "Breakfast — time to cook!", lunch: "Lunch — time to cook!", dinner: "Dinner — time to cook!" };

function isAndroidDevice(){
  return /Android/i.test(navigator.userAgent);
}

// Opens the phone's own Clock app pre-filled with the given time, using Android's
// standard SET_ALARM intent. This is the only way a website can reach a native
// alarm on Android — it works across Samsung, Xiaomi, Pixel, OnePlus, stock, etc.
// because every Android Clock app is required to handle this intent, but it always
// hands off to that app rather than silently creating the alarm itself.
function setAndroidAlarm(hour, minute, label){
  const intentUrl =
    "intent://#Intent;action=android.intent.action.SET_ALARM;" +
    "i.android.intent.extra.alarm.HOUR=" + hour + ";" +
    "i.android.intent.extra.alarm.MINUTES=" + minute + ";" +
    "S.android.intent.extra.alarm.MESSAGE=" + encodeURIComponent(label) + ";" +
    "S.android.intent.extra.alarm.SKIP_UI=false;" +
    "end";
  window.location.href = intentUrl;
}

function resetAlarmButtons(){
  ['breakfast','lunch','dinner'].forEach(meal=>{
    const btn = document.querySelector('.alarm-set-btn[data-meal="' + meal + '"]');
    const status = document.getElementById('alarmStatus-' + meal);
    if(btn){ btn.classList.remove('is-set'); btn.textContent = 'Set Alarm'; }
    if(status){ status.textContent = ''; }
  });
}

document.querySelectorAll('.alarm-set-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const meal = btn.dataset.meal;
    const timeValue = document.getElementById(meal + 'Time').value || "08:00";
    const [hour, minute] = timeValue.split(':').map(Number);

    if(!isAndroidDevice()){
      showToast("This opens your phone's Clock app — works on Android only. On this device, set " + timeValue + " manually.");
      return;
    }

    setAndroidAlarm(hour, minute, MEAL_LABELS[meal]);
    btn.classList.add('is-set');
    btn.textContent = 'Set Alarm ✓';
    const status = document.getElementById('alarmStatus-' + meal);
    if(status){ status.textContent = 'Opened Clock app for ' + timeValue; }
    showToast(MEAL_LABELS[meal].split(' —')[0] + " alarm sent to your Clock app for " + timeValue);
    trackEvent('alarm_set', { meal, time: timeValue });
  });
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
  return DISHES.filter(d=>
    d.meal===meal &&
    (state.diet==='all' || d.category===state.diet) &&
    d.effort <= state.maxEffort &&
    (!state.quickOnly || d.time<=20) &&
    !excludedDishes.includes(d.name)
  );
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
      '<div class="empty-state">No dishes match this combination of filters. Try loosening a filter or allowing back an excluded dish.</div>';
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
  trackEvent('generate_schedule', { diet: state.diet, max_effort: state.maxEffort, portion: state.portion, quick_only: state.quickOnly });
  return weeks;
}

// ---------------- RENDERING ----------------
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
          </div>
          ${ingredientsPreview}
          ${howTo}
        </div>
        ${mealActionsBtns}
      </div>
      ${buyRow}
    </div>`;
}

function renderSchedule(weeks){
  const out = document.getElementById('scheduleOutput');
  const info = getTodayInfo();
  let html = '';
  weeks.forEach((days, wi)=>{
    html += `<div class="week-head"><span class="wk-num">Week ${wi+1}</span><span class="wk-label">7 days &middot; no repeats</span><hr></div>`;
    days.forEach((d, di)=>{
      const isToday = wi===info.weekIndex && di===info.dayIndex;
      html += `<div class="day-card${isToday ? ' is-today':''}">
        <div class="day-title">${d.day}</div>
        ${dishRowHTML('Breakfast', d.breakfast, 'breakfast', wi, di)}
        ${dishRowHTML('Lunch', d.lunch, 'lunch', wi, di)}
        ${dishRowHTML('Dinner', d.dinner, 'dinner', wi, di)}
      </div>`;
    });
  });
  out.innerHTML = html;
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
function swapMealAt(wi, di, mealKey, { silent } = {}){
  const pool = filteredPool(mealKey);
  const current = lastWeeks[wi][di][mealKey];
  const others = pool.filter(d => d.name !== current.name);
  if(others.length === 0){
    if(!silent) showToast("No other dishes match your current filters for this meal");
    return false;
  }
  const next = others[Math.floor(Math.random() * others.length)];
  lastWeeks[wi][di][mealKey] = next;

  const label = mealKey.charAt(0).toUpperCase() + mealKey.slice(1);
  const rowHTML = dishRowHTML(label, next, mealKey, wi, di);
  const rowEl = document.getElementById(`meal-${wi}-${di}-${mealKey}`);
  if(rowEl) rowEl.outerHTML = rowHTML;

  savePlanToDevice(lastWeeks);
  applyPlanFilter();
  return next;
}

document.getElementById('scheduleOutput').addEventListener('click', (e)=>{
  const swapBtnEl = e.target.closest('.swap-btn');
  const excludeBtnEl = e.target.closest('.exclude-btn');
  if(!lastWeeks || (!swapBtnEl && !excludeBtnEl)) return;

  if(swapBtnEl){
    const wi = parseInt(swapBtnEl.dataset.week, 10);
    const di = parseInt(swapBtnEl.dataset.day, 10);
    const mealKey = swapBtnEl.dataset.meal;
    const next = swapMealAt(wi, di, mealKey);
    if(next){
      showToast(`Swapped in ${next.name}`);
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
    const next = swapMealAt(wi, di, mealKey, { silent: true });
    if(next){
      showToast(`${dishName} won't be suggested again — swapped in ${next.name}`);
    }else{
      showToast(`${dishName} won't be suggested again`);
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

function renderGroceryList(){
  if(!lastWeeks){ showToast("Generate a schedule first"); return; }
  const items = aggregateGroceries(lastWeeks, state.portion);
  const content = document.getElementById('groceryListContent');
  content.innerHTML = items.map(item => `
    <div class="grocery-item">
      <input type="checkbox" />
      <span class="g-name">${item.name}<small class="g-need">recipes need ≈ ${roundQty(item.qty)} ${item.unit}</small></span>
      <span class="g-qty">Buy ${purchaseText(item)}</span>
      <a class="buy-btn readymade" href="${shopLinkProduct(item.name)}" target="_blank" rel="noopener sponsored" data-dish="${item.name}" data-kind="grocery" aria-label="Find ${item.name} on Amazon">🛒</a>
    </div>`).join('');
  openModal('groceryModal');
}
document.getElementById('openGroceryBtn').addEventListener('click', renderGroceryList);

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
  const text = [
    ...brandHeaderLines(),
    "",
    `🛒 Grocery List — scaled for ${state.portion} ${state.portion===1?'person':'people'}`,
    "",
    ...items.map(i => `• ${i.name} — buy ${purchaseText(i)} (need ≈ ${roundQty(i.qty)} ${i.unit})`),
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

function buildFeedbackMailto(name, message){
  const to = atob(CONFIG.feedbackEmailB64);
  const subject = "Busywomen Cook Schedule — Feedback" + (name ? " from " + name : "");
  const body = (name ? "From: " + name + "\n\n" : "") + message;
  return "mailto:" + to + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
}

document.getElementById('sendFeedbackBtn').addEventListener('click', async ()=>{
  const { name, message } = buildFeedbackText();
  if(!message){ showToast("Write a message first"); return; }

  // Preferred: send through Web3Forms so the owner's address is never shown to visitors.
  if(CONFIG.web3formsKey){
    const btn = document.getElementById('sendFeedbackBtn');
    btn.disabled = true;
    try{
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          access_key: CONFIG.web3formsKey,
          subject: "Busywomen Cook Schedule — Feedback" + (name ? " from " + name : ""),
          from_name: name || "Website visitor",
          message: message
        })
      });
      const data = await res.json();
      if(data && data.success){
        showToast("Thanks! Your feedback was sent.");
        document.getElementById('feedbackMessage').value = "";
        closeModal('feedbackModal');
        trackEvent('feedback_sent', { method: 'web3forms' });
      }else{
        showToast("Couldn't send — please try again or copy your message");
      }
    }catch(e){
      showToast("Couldn't send — check your connection or copy your message");
    }
    btn.disabled = false;
    return;
  }

  // Fallback: open the visitor's email app (this does show the address in the To: field).
  window.location.href = buildFeedbackMailto(name, message);
  showToast("Opening your email app to send this…");
  trackEvent('feedback_sent', { method: 'mailto' });
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

// ---------------- WHATSAPP SHARE (WHOLE WEEK) ----------------
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
  window.open("https://wa.me/?text=" + encodeURIComponent(lines.join("\n")), "_blank", "noopener");
  trackEvent('whatsapp_share_week', {});
});

// ---------------- WHATSAPP SHARE ----------------
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
  const url = "https://wa.me/?text=" + encodeURIComponent(lines.join("\n"));
  window.open(url, "_blank", "noopener");
  trackEvent('whatsapp_share', {});
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
