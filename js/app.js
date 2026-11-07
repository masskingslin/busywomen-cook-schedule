// ============================================================
// BUSYWOMEN COOK SCHEDULE — APP LOGIC
// ============================================================

let state = {
  diet: "all",
  maxEffort: 3,
  portion: 2,
  quickOnly: false,
  lightOnly: false,
  budgetPicks: false,
  times: { breakfast: "08:00", lunch: "13:00", dinner: "20:00" },
};

let lastWeeks = null; // the 4-week schedule currently on screen

// ---------------- LOCAL STORAGE (real browser storage — this is a
// downloadable static site, not a Claude artifact preview, so persisting
// a person's plan, exclusions and theme across visits is safe here) ----------------
const STORE = {
  LAST_PLAN: 'bwcs_last_plan',
  MY_PLANS: 'bwcs_my_plans',
  EXCLUDED: 'bwcs_excluded_dishes',
  THEME: 'bwcs_theme',
  CUSTOM_COLOR: 'bwcs_custom_color',
  LANG: 'bwcs_lang',
};
function storageGet(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch(e){ return fallback; }
}
function storageSet(key, value){
  try{ localStorage.setItem(key, JSON.stringify(value)); } catch(e){ /* storage full or unavailable — fail silently */ }
}
function storageRemove(key){
  try{ localStorage.removeItem(key); } catch(e){ /* ignore */ }
}

let excludedDishes = new Set(storageGet(STORE.EXCLUDED, []));

// ---------------- i18n ----------------
// Scope (see js/i18n.js): interface chrome is translated into English,
// Hindi and Tamil. Dish names, ingredient lists and the generated Sunday-prep
// tips deliberately stay in English — a wrong ingredient name in a cooking
// app misleads someone at the grocery store, so those aren't guessed at.
let currentLang = 'en';
let CURRENT_MEAL_LABELS = Object.assign({}, MEAL_LABELS_I18N.en);
// Translation values that intentionally contain markup (a <b> around a number).
const HTML_I18N_KEYS = new Set(['effortLegend1','effortLegend2','effortLegend3']);

function t(key){
  const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
  return (key in dict) ? dict[key] : (TRANSLATIONS.en[key] || key);
}
function translatedDayName(englishDay){
  const idx = DAY_NAMES.indexOf(englishDay);
  const list = DAY_NAMES_I18N[currentLang] || DAY_NAMES_I18N.en;
  return idx >= 0 ? list[idx] : englishDay;
}
function dateLocale(){ return currentLang === 'hi' ? 'hi-IN' : (currentLang === 'ta' ? 'ta-IN' : undefined); }
function emptyStateHTML(){
  return `<div class="empty-state" id="scheduleEmptyState">${t('emptyState').replace('{generate}', `<b>${t('generateBtn')}</b>`)}</div>`;
}

function applyLanguage(lang){
  currentLang = TRANSLATIONS[lang] ? lang : 'en';
  document.documentElement.lang = currentLang;
  storageSet(STORE.LANG, currentLang);

  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const key = el.getAttribute('data-i18n');
    if(HTML_I18N_KEYS.has(key)) el.innerHTML = t(key);
    else el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });

  document.querySelectorAll('.lang-btn').forEach(b=>{
    const isActive = b.dataset.lang === currentLang;
    b.classList.toggle('active', isActive);
    b.setAttribute('aria-checked', isActive ? 'true' : 'false');
  });

  // Labels read by rendering functions elsewhere in this file. CAT_LABEL
  // lives in data.js and is mutated in place so every existing
  // CAT_LABEL[...] lookup picks up the new language automatically.
  CURRENT_MEAL_LABELS = Object.assign({}, (MEAL_LABELS_I18N[currentLang] || MEAL_LABELS_I18N.en));
  Object.assign(CAT_LABEL, CAT_LABEL_I18N[currentLang] || CAT_LABEL_I18N.en);

  // Re-render whatever is already on screen so the switch is visible at once.
  if(lastWeeks){
    renderSchedule(lastWeeks);
  } else {
    document.getElementById('scheduleOutput').innerHTML = emptyStateHTML();
  }
  renderKidsSection();
}

document.querySelectorAll('.lang-btn').forEach(btn=>{
  btn.addEventListener('click', ()=> applyLanguage(btn.dataset.lang));
});

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
function shopLinkDeal(productName){
  // Sorts results lowest-price-first — used for the Kids' Snacks & Drinks
  // list where the ask is "best deals / cheap price" rather than relevance.
  const q = encodeURIComponent(productName);
  return `https://www.${CONFIG.amazonDomain}/s?k=${q}&tag=${CONFIG.amazonTag}&s=price-asc-rank`;
}

// ---------------- TOAST ----------------
// Previous bugs fixed: an untracked "re-add hidden" timer could silently
// re-hide a second toast right after it appeared, and a fixed bottom offset
// let the floating action bar cover the toast when it wrapped onto 2 rows.
//
// This upgrade adds:
// 1) A real queue — firing several toasts back-to-back (e.g. Export then
//    Share) now shows each one in turn instead of the newest silently
//    replacing whichever was mid-animation.
// 2) A distinct background colour per type, not just an icon, so
//    success/info/error are readable as a shape/colour, not just text.
const TOAST_STYLES = {
  success: { bg: 'var(--leaf)',    icon: '✅' },
  info:    { bg: 'var(--teal-mid)',icon: 'ℹ️' },
  error:   { bg: 'var(--chili)',   icon: '⚠️' },
};
let toastQueue = [];
let toastShowTimer = null;
let toastHideTimer = null;
let toastBusy = false;

function showToast(message, type){
  toastQueue.push({ message, type: TOAST_STYLES[type] ? type : 'success' });
  if(!toastBusy) processToastQueue();
}

function processToastQueue(){
  const el = document.getElementById('toast');
  if(!el || toastQueue.length === 0){ toastBusy = false; return; }
  toastBusy = true;
  clearTimeout(toastShowTimer);
  clearTimeout(toastHideTimer);

  const { message, type } = toastQueue.shift();
  const style = TOAST_STYLES[type];

  // Always sit just above the floating bar's real current height, however
  // many rows it's wrapped onto.
  const bar = document.getElementById('floatingActionBar');
  const barVisible = bar && !bar.classList.contains('hidden');
  const barHeight = barVisible ? bar.offsetHeight : 0;
  el.style.bottom = (barHeight + 20) + 'px';
  el.style.background = style.bg;
  el.textContent = style.icon + '  ' + message;

  el.classList.remove('hidden');
  // Double rAF guarantees the browser paints the "hidden removed" state
  // before we flip on the opacity transition, so it reliably animates in.
  requestAnimationFrame(()=> requestAnimationFrame(()=> el.classList.add('show')));

  toastShowTimer = setTimeout(()=>{
    el.classList.remove('show');
    // Check the queue again right here (not back when this toast started)
    // so a backlog that built up *during* this toast's display still gets
    // a shorter hand-off instead of always waiting the full hold time.
    const closeGap = toastQueue.length > 0 ? 120 : 220;
    toastHideTimer = setTimeout(()=>{
      el.classList.add('hidden');
      processToastQueue(); // show the next queued toast, if any
    }, closeGap);
  }, 2400);
}

// ---------------- PILL SELECTORS (single-select groups) ----------------
// Keeps the visual .active class and the aria-checked state in sync in one
// place, since several spots (reset defaults, restoring a saved plan) set
// pill state programmatically rather than through a click.
function setPillGroupValue(containerId, matchValue){
  document.querySelectorAll(`#${containerId} .pill`).forEach(b=>{
    const isActive = b.dataset.value === matchValue;
    b.classList.toggle('active', isActive);
    b.setAttribute('aria-checked', isActive ? 'true' : 'false');
  });
}
function setBudgetPicksValue(isOn){
  const btn = document.getElementById('budgetPicksToggle');
  btn.dataset.active = isOn ? 'true' : 'false';
  btn.setAttribute('aria-pressed', isOn ? 'true' : 'false');
}

function wirePillGroup(containerId, onSelect){
  const container = document.getElementById(containerId);
  container.querySelectorAll('.pill').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      container.querySelectorAll('.pill').forEach(b=>{
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
      onSelect(btn.dataset.value);
    });
  });
}
wirePillGroup('dietFilter', val => state.diet = val);
wirePillGroup('effortFilter', val => state.maxEffort = parseInt(val, 10));
wirePillGroup('portionFilter', val => state.portion = parseInt(val, 10));

document.getElementById('budgetPicksToggle').addEventListener('click', (e)=>{
  state.budgetPicks = !state.budgetPicks;
  e.currentTarget.dataset.active = state.budgetPicks ? 'true' : 'false';
  e.currentTarget.setAttribute('aria-pressed', state.budgetPicks ? 'true' : 'false');
});

document.getElementById('quickTimeOnly').addEventListener('change', e=>{
  state.quickOnly = e.target.checked;
});

document.getElementById('lightMealsOnly').addEventListener('change', e=>{
  state.lightOnly = e.target.checked;
});

['breakfast','lunch','dinner'].forEach(meal=>{
  document.getElementById(meal + 'Time').addEventListener('change', e=>{
    state.times[meal] = e.target.value;
  });
});

document.getElementById('resetPreferencesBtn').addEventListener('click', ()=>{
  state = { diet:"all", maxEffort:3, portion:2, quickOnly:false, lightOnly:false, budgetPicks:false, times:{breakfast:"08:00", lunch:"13:00", dinner:"20:00"} };
  setPillGroupValue('dietFilter', 'all');
  setPillGroupValue('effortFilter', '3');
  setPillGroupValue('portionFilter', '2');
  document.getElementById('quickTimeOnly').checked = false;
  document.getElementById('lightMealsOnly').checked = false;
  setBudgetPicksValue(false);
  document.getElementById('breakfastTime').value = "08:00";
  document.getElementById('lunchTime').value = "13:00";
  document.getElementById('dinnerTime').value = "20:00";
  showToast(t('toastPrefsReset'), "info");
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

// There's no real pricing data to work from, so this is an explicit,
// documented estimate: more effort, more ingredients, and non-veg
// proteins all tend to cost more than a quick, mostly-pantry veg dish.
// It's used only to relatively rank dishes against each other for the
// "Budget picks" filter, never shown to the person as an actual price.
function costIndex(dish){
  const ingredientCount = dish.ingredients ? dish.ingredients.length : 1;
  const categoryCost = dish.category === 'non-veg' ? 2 : (dish.category === 'south-indian' ? 0.5 : 0);
  return (dish.effort * 3) + (dish.time / 10) + ingredientCount + categoryCost;
}

function filteredPool(meal){
  let pool = DISHES.filter(d=>
    d.meal===meal &&
    (state.diet==='all' || d.category===state.diet) &&
    d.effort <= state.maxEffort &&
    (!state.quickOnly || d.time<=20) &&
    (!state.lightOnly || d.calories<300) &&
    !excludedDishes.has(d.name)
  );
  if(state.budgetPicks && pool.length > 1){
    const sorted = pool.slice().sort((a,b)=> costIndex(a) - costIndex(b));
    pool = sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 2)));
  }
  return pool;
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
      `<div class="empty-state">${t('toastNoMatch')}</div>`;
    document.getElementById('floatingActionBar').classList.add('hidden');
    showToast(t('toastNoMatch'), "error");
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
    showToast("Heads up: limited dishes for " + insufficient.join(", ") + " — some repeats may occur", "error");
  } else {
    showToast(t('toastScheduleGenerated'), "success");
  }
  return weeks;
}

// ---------------- RENDERING ----------------
function dishRowHTML(label, dish, mealKey, currentMeal){
  if(!dish) return '';
  const isNow = mealKey && mealKey===currentMeal;
  const ingredientsPreview = (!dish.readymade && dish.ingredients && dish.ingredients.length)
    ? `<p class="ingredients-list">${t('needsPrefix')} ${dish.ingredients.map(i=>i.name).join(", ")}</p>`
    : '';
  const buyRow = dish.readymade
    ? `<div class="buy-row">
         <a class="buy-btn readymade" href="${shopLinkProduct(dish.name)}" target="_blank" rel="noopener sponsored">📦 ${dish.name}</a>
       </div>`
    : `<div class="buy-row">
         <a class="buy-btn readymade" href="${shopLinkReadymade(dish.name)}" target="_blank" rel="noopener sponsored">${t('readymadeBtn')}</a>
         <a class="buy-btn ingredients" href="${shopLinkIngredients(dish)}" target="_blank" rel="noopener sponsored">${t('ingredientsBtn')}</a>
       </div>`;
  return `
    <div class="meal-row${isNow ? ' current':''}">
      <div class="meal-top">
        <div class="meal-icon">${label}</div>
        <div class="meal-main">
          <p class="meal-name">${dish.name}</p>
          <div class="meal-meta">
            ${dish.readymade ? `<span class="tag readymade">${t('readymadeTag')}</span>` : ''}
            <span class="tag ${dish.category}">${CAT_LABEL[dish.category]}</span>
            <span class="peppers">${PEPPER[dish.effort]}</span>
            <span class="time-badge">⏱ ${dish.time} min</span>
            <span class="cal-badge">🔥 ${dish.calories} kcal</span>
          </div>
          ${ingredientsPreview}
        </div>
      </div>
      ${buyRow}
    </div>`;
}

function renderTodayCard(weeks){
  const slot = document.getElementById('todaySlot');
  if(!weeks){ slot.innerHTML = ''; return; }
  const info = getTodayInfo();
  const week = weeks[info.weekIndex];
  const today = week ? week[info.dayIndex] : null;
  if(!today){ slot.innerHTML = ''; return; }
  const dateStr = info.now.toLocaleDateString(dateLocale(), {month:'long', day:'numeric', year:'numeric'});
  slot.innerHTML = `
    <div class="today-card">
      <div class="today-head">
        <p class="eyebrow">${t('todayEyebrow')} &middot; ${translatedDayName(today.day)}</p>
        <span class="today-date">${dateStr}</span>
      </div>
      ${dishRowHTML(CURRENT_MEAL_LABELS.breakfast, today.breakfast, 'breakfast', info.currentMeal)}
      ${dishRowHTML(CURRENT_MEAL_LABELS.lunch, today.lunch, 'lunch', info.currentMeal)}
      ${dishRowHTML(CURRENT_MEAL_LABELS.dinner, today.dinner, 'dinner', info.currentMeal)}
    </div>`;
}

function renderSchedule(weeks){
  const out = document.getElementById('scheduleOutput');
  const info = getTodayInfo();
  let html = '';
  weeks.forEach((days, wi)=>{
    html += `<div class="week-head"><span class="wk-num">${t('weekWord')} ${wi+1}</span><span class="wk-label">${t('weekSub')}</span><hr></div>`;
    days.forEach((d, di)=>{
      const isToday = wi===info.weekIndex && di===info.dayIndex;
      html += `<div class="day-card${isToday ? ' is-today':''}">
        <div class="day-title"${isToday ? ` data-today-tag=" ${t('todayTag')}"` : ''}>${translatedDayName(d.day)}</div>
        ${dishRowHTML(CURRENT_MEAL_LABELS.breakfast, d.breakfast)}
        ${dishRowHTML(CURRENT_MEAL_LABELS.lunch, d.lunch)}
        ${dishRowHTML(CURRENT_MEAL_LABELS.dinner, d.dinner)}
      </div>`;
    });
  });
  out.innerHTML = html;
  document.getElementById('floatingActionBar').classList.remove('hidden');
  renderTodayCard(weeks);
}

function snapshotState(){
  // Plain, JSON-safe copy of state (Sets/etc. would break JSON.stringify).
  return {
    diet: state.diet, maxEffort: state.maxEffort, portion: state.portion,
    quickOnly: state.quickOnly, lightOnly: state.lightOnly, budgetPicks: state.budgetPicks, times: { ...state.times },
  };
}

function autoSaveLastPlan(){
  storageSet(STORE.LAST_PLAN, { weeks: lastWeeks, filters: snapshotState(), savedAt: Date.now() });
}

document.getElementById('generateBtn').addEventListener('click', ()=>{
  const weeks = generateSchedule();
  if(weeks){
    lastWeeks = weeks;
    renderSchedule(weeks);
    autoSaveLastPlan();
  }
});

document.getElementById('clearSavedPlanBtn').addEventListener('click', ()=>{
  storageRemove(STORE.LAST_PLAN);
  lastWeeks = null;
  document.getElementById('scheduleOutput').innerHTML = emptyStateHTML();
  document.getElementById('todaySlot').innerHTML = '';
  document.getElementById('floatingActionBar').classList.add('hidden');
  showToast(t('toastSavedPlanCleared'), "info");
});

// Keep the "NOW" meal badge and today-highlight accurate as time passes
setInterval(()=>{
  if(lastWeeks) renderTodayCard(lastWeeks);
}, 60000);

// ---------------- MODALS ----------------
// Tracks, per modal id, what had focus before it opened (so closing it can
// put focus back) and the keydown handler currently attached (so it can be
// removed again on close instead of piling up across repeated opens).
const modalState = {};

function getFocusable(container){
  return [...container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
    .filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
}

function openModal(id){
  const modal = document.getElementById(id);
  modalState[id] = modalState[id] || {};
  modalState[id].trigger = document.activeElement;

  modal.classList.remove('hidden');

  const focusable = getFocusable(modal);
  (focusable[0] || modal).focus();

  const onKeydown = (e)=>{
    if(e.key === 'Escape'){
      e.preventDefault();
      closeModal(id);
      return;
    }
    if(e.key === 'Tab' && focusable.length > 0){
      const first = focusable[0], last = focusable[focusable.length - 1];
      if(e.shiftKey && document.activeElement === first){
        e.preventDefault(); last.focus();
      } else if(!e.shiftKey && document.activeElement === last){
        e.preventDefault(); first.focus();
      }
    }
  };
  modal.addEventListener('keydown', onKeydown);
  modalState[id].onKeydown = onKeydown;
}

function closeModal(id){
  const modal = document.getElementById(id);
  modal.classList.add('hidden');
  const saved = modalState[id];
  if(saved){
    if(saved.onKeydown) modal.removeEventListener('keydown', saved.onKeydown);
    if(saved.trigger && saved.trigger.focus) saved.trigger.focus();
  }
}

document.querySelectorAll('.close-modal').forEach(btn=>{
  btn.addEventListener('click', ()=> closeModal(btn.dataset.target));
});
document.querySelectorAll('.modal-overlay').forEach(overlay=>{
  overlay.addEventListener('click', e=>{
    if(e.target === overlay) closeModal(overlay.id);
  });
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

function renderGroceryList(){
  if(!lastWeeks){ showToast(t('toastGenerateFirst'), "info"); return; }
  const items = aggregateGroceries(lastWeeks, state.portion);
  const content = document.getElementById('groceryListContent');
  content.innerHTML = items.map(item => `
    <div class="grocery-item">
      <input type="checkbox" />
      <span class="g-name">${item.name}</span>
      <span class="g-qty">${roundQty(item.qty)} ${item.unit}</span>
      <a class="buy-btn readymade" href="${shopLinkProduct(item.name)}" target="_blank" rel="noopener sponsored">🛒</a>
    </div>`).join('');
  document.getElementById('manualCopyBox').classList.add('hidden');
  openModal('groceryModal');
}
document.getElementById('openGroceryBtn').addEventListener('click', renderGroceryList);

function execCommandCopy(text){
  return new Promise((resolve, reject)=>{
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try{
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      ok ? resolve() : reject(new Error('execCommand copy returned false'));
    } catch(e){
      document.body.removeChild(ta);
      reject(e);
    }
  });
}

function showManualCopyFallback(text){
  const box = document.getElementById('manualCopyBox');
  const field = document.getElementById('manualCopyText');
  if(!box || !field) return;
  field.value = text;
  box.classList.remove('hidden');
  field.focus();
  field.select();
}

// Four-tier fallback, each one only reached if the one before it is
// unavailable or fails:
//  1. Web Share API — the native share sheet (WhatsApp/Notes/Mail/etc.),
//     the best experience on a phone when available.
//  2. Clipboard API — a plain, silent copy.
//  3. execCommand('copy') — the legacy copy trick for contexts where the
//     Clipboard API doesn't exist (older webviews, non-HTTPS).
//  4. A visible, pre-selected textarea — if every programmatic method
//     fails, the person can still select-and-copy by hand instead of
//     just being told to "do it manually" with nothing to copy from.
function shareOrCopyText(title, text){
  if(navigator.share){
    return navigator.share({ title, text }).then(()=> ({ via: 'share' }));
  }
  if(navigator.clipboard && navigator.clipboard.writeText){
    return navigator.clipboard.writeText(text).then(()=> ({ via: 'clipboard' }));
  }
  return execCommandCopy(text).then(()=> ({ via: 'execCommand' }));
}

document.getElementById('copyGroceryBtn').addEventListener('click', ()=>{
  if(!lastWeeks){ showToast(t('toastGenerateFirst'), "info"); return; }
  const items = aggregateGroceries(lastWeeks, state.portion);
  const text = "Busywomen Cook Schedule — Grocery List\n" +
    items.map(i => `• ${i.name} — ${roundQty(i.qty)} ${i.unit}`).join("\n");

  document.getElementById('manualCopyBox').classList.add('hidden');

  shareOrCopyText("Busywomen Cook Schedule — Grocery List", text).then((result)=>{
    if(result.via === 'share'){
      showToast(t('toastGroceryShared'), "success");
    } else {
      showToast(t('toastGroceryCopied'), "success");
    }
  }).catch((err)=>{
    // navigator.share throws if the person just cancels the share sheet —
    // that's not a failure, so don't show an error for it.
    if(err && err.name === 'AbortError') return;
    showManualCopyFallback(text);
    showToast(t('toastCopyFailed'), "error");
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
  if(!lastWeeks){ showToast(t('toastGenerateFirst'), "info"); return; }
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

// ---------------- NUTRITION SUMMARY ----------------
// Estimated calories only (see costIndex() above for the same caveat on
// "Budget picks" — no real nutrition database backs this app).
function dayTotalCalories(day){
  return ['breakfast','lunch','dinner'].reduce((sum, m) => sum + (day[m] ? day[m].calories : 0), 0);
}

function renderNutritionSummary(weeks){
  const info = getTodayInfo();
  const flatDays = [];
  weeks.forEach((week, wi) => week.forEach((day, di) => flatDays.push({ ...day, wi, di })));

  const totals = flatDays.map(d => dayTotalCalories(d));
  const todayDay = weeks[info.weekIndex] ? weeks[info.weekIndex][info.dayIndex] : null;
  const todayTotal = todayDay ? dayTotalCalories(todayDay) : 0;
  const avg = totals.length ? Math.round(totals.reduce((a,b)=>a+b,0) / totals.length) : 0;
  const maxTotal = Math.max(1, ...totals);

  const statRow = `
    <div class="nutrition-stat-row">
      <div class="nutrition-stat"><div class="n-value">${todayTotal}</div><div class="n-label">Today (est.)</div></div>
      <div class="nutrition-stat"><div class="n-value">${avg}</div><div class="n-label">Daily average</div></div>
      <div class="nutrition-stat"><div class="n-value">${totals.length}</div><div class="n-label">Days planned</div></div>
    </div>`;

  const bars = flatDays.map((d, i) => {
    const total = totals[i];
    const isToday = d.wi === info.weekIndex && d.di === info.dayIndex;
    const pct = Math.max(4, Math.round((total / maxTotal) * 100));
    return `
      <div class="nutrition-day-row${isToday ? ' is-today-row' : ''}">
        <span class="nd-label">${d.wi+1} · ${currentLang === 'en' ? d.day.slice(0,3) : translatedDayName(d.day)}</span>
        <span class="nd-bar-track"><span class="nd-bar-fill" style="width:${pct}%"></span></span>
        <span class="nd-kcal">${total} kcal</span>
      </div>`;
  }).join('');

  document.getElementById('nutritionContent').innerHTML = statRow + `<div class="nutrition-day-bars">${bars}</div>`;
}

document.getElementById('openNutritionBtn').addEventListener('click', ()=>{
  if(!lastWeeks){ showToast(t('toastGenerateFirst'), "info"); return; }
  renderNutritionSummary(lastWeeks);
  openModal('nutritionModal');
});

// ---------------- WHATSAPP SHARE ----------------
document.getElementById('shareWhatsAppBtn').addEventListener('click', ()=>{
  if(!lastWeeks){ showToast(t('toastGenerateFirst'), "info"); return; }
  const info = getTodayInfo();
  const today = lastWeeks[info.weekIndex][info.dayIndex];
  const lines = [
    t('waTitle'),
    t('waPlanOf').replace('{day}', translatedDayName(today.day)),
    `🍳 ${CURRENT_MEAL_LABELS.breakfast}: ${today.breakfast ? today.breakfast.name : '-'}`,
    `🍛 ${CURRENT_MEAL_LABELS.lunch}: ${today.lunch ? today.lunch.name : '-'}`,
    `🍲 ${CURRENT_MEAL_LABELS.dinner}: ${today.dinner ? today.dinner.name : '-'}`,
  ];
  const url = "https://wa.me/?text=" + encodeURIComponent(lines.join("\n"));
  window.open(url, "_blank", "noopener");
});

// ---------------- PRINT / PDF ----------------
// window.print() + the @media print stylesheet; choosing "Save as PDF" as
// the destination in the browser's print dialog yields a real PDF.
document.getElementById('printPlanBtn').addEventListener('click', ()=>{
  if(!lastWeeks){ showToast(t('toastGenerateFirst'), "info"); return; }
  document.getElementById('printGeneratedDate').textContent =
    "Generated " + new Date().toLocaleDateString(undefined, { month:'long', day:'numeric', year:'numeric' });
  window.print();
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
  if(!lastWeeks){ showToast(t('toastGenerateFirst'), "info"); return; }
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
  showToast(t('toastCalendarExported'), "success");
});

// ---------------- TABS: Meal Schedule vs Kids' Snacks & Drinks ----------------
function showTab(tab){
  const scheduleView = document.getElementById('scheduleView');
  const kidsView = document.getElementById('kidsView');
  const tabSchedule = document.getElementById('tabSchedule');
  const tabKids = document.getElementById('tabKids');
  const floatingBar = document.getElementById('floatingActionBar');
  if(tab === 'kids'){
    scheduleView.style.display = 'none';
    kidsView.style.display = 'block';
    floatingBar.classList.add('hidden');
    tabSchedule.classList.remove('active');
    tabKids.classList.add('active');
    tabSchedule.setAttribute('aria-selected', 'false');
    tabKids.setAttribute('aria-selected', 'true');
  } else {
    scheduleView.style.display = 'block';
    kidsView.style.display = 'none';
    if(lastWeeks) floatingBar.classList.remove('hidden');
    tabSchedule.classList.add('active');
    tabKids.classList.remove('active');
    tabSchedule.setAttribute('aria-selected', 'true');
    tabKids.setAttribute('aria-selected', 'false');
  }
}
document.getElementById('tabSchedule').addEventListener('click', ()=> showTab('schedule'));
document.getElementById('tabKids').addEventListener('click', ()=> showTab('kids'));

// ---------------- KIDS' SNACKS & DRINKS ----------------
function renderKidsSection(){
  const wrap = document.getElementById('kidsView');
  const cards = KID_ITEMS.map(item => `
    <div class="kid-card">
      <span class="kid-emoji">${item.emoji}</span>
      <p class="kid-name">${item.name}</p>
      <p class="kid-note">${item.note}</p>
      <span class="tag ${item.type==='drink' ? 'south-indian':'veg'}">${item.type==='drink' ? t('kidDrink') : t('kidSnack')}</span>
      <a class="buy-btn deal" href="${shopLinkDeal(item.name)}" target="_blank" rel="noopener sponsored">${t('kidsBuyBtn')}</a>
    </div>`).join('');
  wrap.innerHTML = `
    <div class="kids-wrap">
      <div class="kids-head"><span class="kids-title">${t('kidsTitle')}</span><hr></div>
      <p class="kids-sub">${t('kidsSub')}</p>
      <div class="kids-grid">${cards}</div>
    </div>`;
}
// Kids' Snacks & Drinks is a fixed, always-available list — render it once
// up front so it's ready the moment someone taps the tab.
renderKidsSection();

// ---------------- SEARCH + JUMP TO TODAY ----------------
document.getElementById('dishSearchInput').addEventListener('input', (e)=>{
  const q = e.target.value.trim().toLowerCase();
  const rows = document.getElementById('scheduleOutput').querySelectorAll('.meal-row');
  const noResultsEl = document.getElementById('searchNoResults');
  if(!q){
    rows.forEach(r => { r.classList.remove('search-match'); r.classList.remove('search-dim'); });
    noResultsEl.classList.add('hidden');
    return;
  }
  let matchCount = 0;
  let firstMatch = null;
  rows.forEach(r => {
    const nameEl = r.querySelector('.meal-name');
    const ingredientsEl = r.querySelector('.ingredients-list');
    // Matches on the dish name OR its ingredient list, so searching an
    // ingredient (e.g. "paneer") finds every dish that uses it, not just
    // dishes literally named that.
    const haystack = ((nameEl ? nameEl.textContent : '') + ' ' + (ingredientsEl ? ingredientsEl.textContent : '')).toLowerCase();
    const isMatch = haystack.includes(q);
    r.classList.toggle('search-match', isMatch);
    r.classList.toggle('search-dim', !isMatch);
    if(isMatch){
      matchCount++;
      if(!firstMatch) firstMatch = r;
    }
  });
  if(matchCount === 0 && rows.length > 0){
    noResultsEl.textContent = t('searchNoMatch').replace('{q}', e.target.value.trim());
    noResultsEl.classList.remove('hidden');
  } else {
    noResultsEl.classList.add('hidden');
  }
  if(firstMatch && firstMatch.scrollIntoView){
    firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
});

document.getElementById('jumpTodayBtn').addEventListener('click', ()=>{
  if(!lastWeeks){ showToast(t('toastGenerateFirst'), "info"); return; }
  const todayCard = document.querySelector('.day-card.is-today');
  const target = todayCard || document.getElementById('todaySlot');
  if(target && target.scrollIntoView){
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
});

// ---------------- THEME SWITCHER ----------------
// theme is one of the preset names, or 'custom'. customColor only matters
// when theme === 'custom' — it's kept separately so switching back to a
// preset and then back to Custom remembers the last colour picked.
function applyTheme(theme, customColor){
  if(theme === 'teal'){
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.removeProperty('--turmeric');
  } else if(theme === 'custom'){
    document.documentElement.removeAttribute('data-theme'); // base palette underneath
    document.documentElement.style.setProperty('--turmeric', customColor || '#E7A72C');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.removeProperty('--turmeric');
  }
  document.querySelectorAll('.swatch').forEach(s => {
    const isActive = s.dataset.theme === theme;
    s.classList.toggle('active', isActive);
    // Only the <button> swatches take aria-pressed; the Custom swatch is a
    // <label> (its accessible state comes from the wrapped colour input).
    if(s.tagName === 'BUTTON') s.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
  storageSet(STORE.THEME, theme);
  if(theme === 'custom' && customColor) storageSet(STORE.CUSTOM_COLOR, customColor);
}

// Only the preset <button> swatches use a plain click; the Custom swatch is
// a <label> wrapping a native colour <input> (so tapping it opens the
// system colour picker), and attaching the same click handler to it would
// double-fire with no theme name to apply. Filter it out here instead.
document.querySelectorAll('.swatch').forEach(swatch=>{
  if(swatch.tagName === 'LABEL') return;
  swatch.addEventListener('click', ()=>{
    applyTheme(swatch.dataset.theme);
    showToast(t('toastThemeUpdated'), "success");
  });
});
document.getElementById('customColorInput').addEventListener('input', (e)=>{
  applyTheme('custom', e.target.value);
});
document.getElementById('customColorInput').addEventListener('change', ()=>{
  showToast("Custom colour applied", "success");
});

// ---------------- INSTALL APP (PWA) ----------------
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent || '') && !window.MSStream;
const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;

let deferredInstallPrompt = null;
if(!isStandalone){
  window.addEventListener('beforeinstallprompt', (e)=>{
    e.preventDefault();
    deferredInstallPrompt = e;
    document.getElementById('installAppBtn').classList.remove('hidden');
  });
  // iOS Safari never fires beforeinstallprompt — it has no such API — so
  // show the button with its own instructions instead of leaving it to
  // silently never appear.
  if(isIOS){
    document.getElementById('installAppBtn').classList.remove('hidden');
  }
}

document.getElementById('installAppBtn').addEventListener('click', async ()=>{
  if(isIOS && !deferredInstallPrompt){
    showToast("On iPhone: tap the Share icon, then 'Add to Home Screen'", "info");
    return;
  }
  if(!deferredInstallPrompt){
    showToast("Already installed, or your browser doesn't support this", "info");
    return;
  }
  deferredInstallPrompt.prompt();
  const choice = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  document.getElementById('installAppBtn').classList.add('hidden');
  showToast(choice.outcome === 'accepted' ? "App installed!" : "Install dismissed", choice.outcome === 'accepted' ? "success" : "info");
});
window.addEventListener('appinstalled', ()=>{
  document.getElementById('installAppBtn').classList.add('hidden');
});

// ---------------- SERVICE WORKER: offline support + opt-in updates ----------------
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').then((registration)=>{
    // A new worker already waiting (e.g. the page was reopened after an
    // update shipped while it was closed) — offer the refresh right away.
    if(registration.waiting){
      offerServiceWorkerUpdate(registration);
    }
    registration.addEventListener('updatefound', ()=>{
      const newWorker = registration.installing;
      if(!newWorker) return;
      newWorker.addEventListener('statechange', ()=>{
        if(newWorker.state === 'installed' && navigator.serviceWorker.controller){
          // installed + there's already a controller = this is an update,
          // not the first-ever install, so it's worth telling the person
          offerServiceWorkerUpdate(registration);
        }
      });
    });
  }).catch(()=>{ /* e.g. opened via file:// with no server — Install App just won't be available */ });

  let hasReloadedForUpdate = false;
  navigator.serviceWorker.addEventListener('controllerchange', ()=>{
    if(hasReloadedForUpdate) return;
    hasReloadedForUpdate = true;
    window.location.reload();
  });
}

function offerServiceWorkerUpdate(registration){
  // Deliberately not attached to the shared toast element: the toast is a
  // queue, so by the time this one is actually on screen a different
  // message could be showing — a click handler on the toast itself would
  // then fire for whatever unrelated message happens to be visible. A
  // separate, self-contained banner avoids that coupling entirely.
  const banner = document.createElement('div');
  banner.className = 'update-banner';
  banner.innerHTML = '🔄 A new version is ready — <u>tap to refresh</u>';
  banner.addEventListener('click', ()=>{
    if(registration.waiting){
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    banner.remove();
  });
  document.body.appendChild(banner);
}

// ---------------- ONLINE / OFFLINE INDICATOR ----------------
function updateOfflineIndicator(){
  const el = document.getElementById('offlineIndicator');
  el.classList.toggle('hidden', navigator.onLine !== false);
}
window.addEventListener('online', ()=>{ updateOfflineIndicator(); showToast(t('toastOnline'), "success"); });
window.addEventListener('offline', ()=>{ updateOfflineIndicator(); showToast(t('toastOffline'), "info"); });
updateOfflineIndicator();

// ---------------- MY PLANS ----------------
function renderMyPlansList(){
  const plans = storageGet(STORE.MY_PLANS, []);
  const list = document.getElementById('myPlansList');
  if(plans.length === 0){
    list.innerHTML = '<p class="my-plans-empty">No saved plans yet — generate a schedule, then tap "Save current plan".</p>';
    return;
  }
  list.innerHTML = plans.map((p, i) => `
    <div class="plan-item">
      <div class="plan-info">
        <p class="plan-name">${p.name}</p>
        <p class="plan-meta">${new Date(p.savedAt).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'})}</p>
      </div>
      <div class="plan-actions">
        <button class="plan-load-btn" data-index="${i}">Load</button>
        <button class="plan-delete-btn" data-index="${i}">Delete</button>
      </div>
    </div>`).join('');

  list.querySelectorAll('.plan-load-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const plan = storageGet(STORE.MY_PLANS, [])[parseInt(btn.dataset.index, 10)];
      if(!plan) return;
      lastWeeks = plan.weeks;
      renderSchedule(lastWeeks);
      autoSaveLastPlan();
      closeModal('myPlansModal');
      showToast(`Loaded "${plan.name}"`, "success");
    });
  });
  list.querySelectorAll('.plan-delete-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const plans = storageGet(STORE.MY_PLANS, []);
      plans.splice(parseInt(btn.dataset.index, 10), 1);
      storageSet(STORE.MY_PLANS, plans);
      renderMyPlansList();
      showToast(t('toastPlanDeleted'), "info");
    });
  });
}

document.getElementById('openMyPlansBtn').addEventListener('click', ()=>{
  renderMyPlansList();
  openModal('myPlansModal');
});

document.getElementById('savePlanBtn').addEventListener('click', ()=>{
  if(!lastWeeks){ showToast(t('toastGenerateFirst'), "info"); return; }
  const name = (typeof prompt === 'function') ? prompt("Name this plan:", "My plan " + new Date().toLocaleDateString()) : null;
  if(!name) return;
  const plans = storageGet(STORE.MY_PLANS, []);
  plans.unshift({ name, weeks: lastWeeks, filters: snapshotState(), savedAt: Date.now() });
  storageSet(STORE.MY_PLANS, plans);
  renderMyPlansList();
  showToast(t('toastPlanSaved'), "success");
});

// ---------------- BACKUP & RESTORE ----------------
const BACKUP_FORMAT_VERSION = 1;

document.getElementById('exportBackupBtn').addEventListener('click', ()=>{
  const backup = {
    app: "busywomen-cook-schedule",
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      lastPlan: storageGet(STORE.LAST_PLAN, null),
      myPlans: storageGet(STORE.MY_PLANS, []),
      excludedDishes: storageGet(STORE.EXCLUDED, []),
      theme: storageGet(STORE.THEME, 'teal'),
      customColor: storageGet(STORE.CUSTOM_COLOR, '#E7A72C'),
    },
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `busywomen-cook-schedule-backup-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(t('toastBackupDownloaded'), "success");
});

document.getElementById('importBackupBtn').addEventListener('click', ()=>{
  document.getElementById('importBackupFile').click();
});

document.getElementById('importBackupFile').addEventListener('change', (e)=>{
  const input = e.target;
  const file = input.files && input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    let backup;
    try{ backup = JSON.parse(reader.result); }
    catch(err){
      showToast(t('toastBackupInvalidJson'), "error");
      input.value = ''; return;
    }
    if(!backup || backup.app !== "busywomen-cook-schedule" || !backup.data){
      showToast(t('toastBackupInvalidFormat'), "error");
      input.value = ''; return;
    }
    const proceed = (typeof confirm === 'function')
      ? confirm("Importing will replace your current saved plans, excluded dishes, and theme with what's in this backup. Continue?")
      : true;
    if(!proceed){ input.value = ''; return; }

    const d = backup.data;
    if(d.lastPlan) storageSet(STORE.LAST_PLAN, d.lastPlan);
    storageSet(STORE.MY_PLANS, Array.isArray(d.myPlans) ? d.myPlans : []);
    storageSet(STORE.EXCLUDED, Array.isArray(d.excludedDishes) ? d.excludedDishes : []);
    storageSet(STORE.THEME, d.theme || 'teal');
    storageSet(STORE.CUSTOM_COLOR, d.customColor || '#E7A72C');

    // Apply to the running app immediately, not just to localStorage.
    excludedDishes = new Set(Array.isArray(d.excludedDishes) ? d.excludedDishes : []);
    applyTheme(d.theme || 'teal', d.customColor || '#E7A72C');
    if(d.lastPlan && d.lastPlan.weeks){
      lastWeeks = d.lastPlan.weeks;
      renderSchedule(lastWeeks);
    }
    renderMyPlansList();
    input.value = '';
    showToast(t('toastBackupImported'), "success");
  };
  reader.onerror = ()=>{ showToast("Couldn't read that file", "error"); input.value = ''; };
  reader.readAsText(file);
});

// ---------------- EXCLUDED DISHES ----------------
function renderExcludedList(){
  const content = document.getElementById('excludedListContent');
  const meals = ['breakfast', 'lunch', 'dinner'];
  const mealLabel = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };
  let html = '';
  meals.forEach(meal=>{
    const dishes = DISHES.filter(d => d.meal === meal);
    html += `<p class="excluded-group-label">${mealLabel[meal]}</p>`;
    html += dishes.map(d => `
      <label class="excluded-item">
        <input type="checkbox" class="exclude-checkbox" data-name="${d.name}" ${excludedDishes.has(d.name) ? 'checked' : ''} />
        <span class="ex-name">${d.name}</span>
      </label>`).join('');
  });
  content.innerHTML = html;
  content.querySelectorAll('.exclude-checkbox').forEach(cb=>{
    cb.addEventListener('change', ()=>{
      if(cb.checked) excludedDishes.add(cb.dataset.name);
      else excludedDishes.delete(cb.dataset.name);
      storageSet(STORE.EXCLUDED, [...excludedDishes]);
    });
  });
}
document.getElementById('openExcludedBtn').addEventListener('click', ()=>{
  renderExcludedList();
  openModal('excludedModal');
});

// ---------------- SHARE THIS APP / COPY LINK ----------------
document.getElementById('shareAppBtn').addEventListener('click', ()=>{
  const url = window.location.href;
  if(navigator.share){
    navigator.share({ title: "Busywomen Cook Schedule", url }).catch((err)=>{
      if(err && err.name === 'AbortError') return;
    });
  } else {
    shareOrCopyText("Busywomen Cook Schedule", url).then(()=> showToast(t('toastLinkCopied'), "success"))
      .catch(()=> showManualCopyFallback(url));
  }
});
document.getElementById('copyLinkBtn').addEventListener('click', ()=>{
  const url = window.location.href;
  (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(url) : execCommandCopy(url))
    .then(()=> showToast(t('toastLinkCopied'), "success"))
    .catch(()=> showToast("Couldn't copy the link", "error"));
});

// ---------------- RESTORE ON LOAD ----------------
(function restoreOnLoad(){
  // Language first, so everything restored below renders in the right one.
  applyLanguage(storageGet(STORE.LANG, 'en'));

  const savedTheme = storageGet(STORE.THEME, 'teal');
  const savedCustomColor = storageGet(STORE.CUSTOM_COLOR, '#E7A72C');
  if(savedTheme === 'custom') document.getElementById('customColorInput').value = savedCustomColor;
  applyTheme(savedTheme, savedCustomColor);

  const saved = storageGet(STORE.LAST_PLAN, null);
  if(saved && saved.weeks && saved.filters){
    state.diet = saved.filters.diet;
    state.maxEffort = saved.filters.maxEffort;
    state.portion = saved.filters.portion;
    state.quickOnly = saved.filters.quickOnly;
    state.lightOnly = saved.filters.lightOnly || false;
    state.budgetPicks = saved.filters.budgetPicks || false;
    state.times = saved.filters.times || state.times;

    setPillGroupValue('dietFilter', state.diet);
    setPillGroupValue('effortFilter', String(state.maxEffort));
    setPillGroupValue('portionFilter', String(state.portion));
    document.getElementById('quickTimeOnly').checked = state.quickOnly;
    document.getElementById('lightMealsOnly').checked = state.lightOnly;
    setBudgetPicksValue(state.budgetPicks);
    document.getElementById('breakfastTime').value = state.times.breakfast;
    document.getElementById('lunchTime').value = state.times.lunch;
    document.getElementById('dinnerTime').value = state.times.dinner;

    lastWeeks = saved.weeks;
    renderSchedule(lastWeeks);
    showToast(t('toastRestored'), "info");
  }
})();
