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
wirePillGroup('dietFilter', val => state.diet = val);
wirePillGroup('effortFilter', val => state.maxEffort = parseInt(val, 10));
wirePillGroup('portionFilter', val => state.portion = parseInt(val, 10));

document.getElementById('quickTimeOnly').addEventListener('change', e=>{
  state.quickOnly = e.target.checked;
});

['breakfast','lunch','dinner'].forEach(meal=>{
  document.getElementById(meal + 'Time').addEventListener('change', e=>{
    state.times[meal] = e.target.value;
  });
});

document.getElementById('resetPreferencesBtn').addEventListener('click', ()=>{
  state = { diet:"all", maxEffort:3, portion:2, quickOnly:false, times:{breakfast:"08:00", lunch:"13:00", dinner:"20:00"} };
  document.querySelectorAll('#dietFilter .pill').forEach(b=>b.classList.toggle('active', b.dataset.value==='all'));
  document.querySelectorAll('#effortFilter .pill').forEach(b=>b.classList.toggle('active', b.dataset.value==='3'));
  document.querySelectorAll('#portionFilter .pill').forEach(b=>b.classList.toggle('active', b.dataset.value==='2'));
  document.getElementById('quickTimeOnly').checked = false;
  document.getElementById('breakfastTime').value = "08:00";
  document.getElementById('lunchTime').value = "13:00";
  document.getElementById('dinnerTime').value = "20:00";
  showToast("Preferences reset to defaults", "info");
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
    (!state.quickOnly || d.time<=20)
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
      '<div class="empty-state">No dishes match this combination of filters. Try loosening a filter.</div>';
    document.getElementById('floatingActionBar').classList.add('hidden');
    showToast("No matching dishes — widen your filters", "error");
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
    showToast("4-week schedule generated!", "success");
  }
  return weeks;
}

// ---------------- RENDERING ----------------
function dishRowHTML(label, dish, mealKey, currentMeal){
  if(!dish) return '';
  const isNow = mealKey && mealKey===currentMeal;
  const ingredientsPreview = (!dish.readymade && dish.ingredients && dish.ingredients.length)
    ? `<p class="ingredients-list">Needs: ${dish.ingredients.map(i=>i.name).join(", ")}</p>`
    : '';
  const buyRow = dish.readymade
    ? `<div class="buy-row">
         <a class="buy-btn readymade" href="${shopLinkProduct(dish.name)}" target="_blank" rel="noopener sponsored">📦 Buy ${dish.name}</a>
       </div>`
    : `<div class="buy-row">
         <a class="buy-btn readymade" href="${shopLinkReadymade(dish.name)}" target="_blank" rel="noopener sponsored">📦 Ready-made</a>
         <a class="buy-btn ingredients" href="${shopLinkIngredients(dish)}" target="_blank" rel="noopener sponsored">🛒 Ingredients</a>
       </div>`;
  return `
    <div class="meal-row${isNow ? ' current':''}">
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
  const dateStr = info.now.toLocaleDateString(undefined, {month:'long', day:'numeric', year:'numeric'});
  slot.innerHTML = `
    <div class="today-card">
      <div class="today-head">
        <p class="eyebrow">Today &middot; ${today.day}</p>
        <span class="today-date">${dateStr}</span>
      </div>
      ${dishRowHTML('Breakfast', today.breakfast, 'breakfast', info.currentMeal)}
      ${dishRowHTML('Lunch', today.lunch, 'lunch', info.currentMeal)}
      ${dishRowHTML('Dinner', today.dinner, 'dinner', info.currentMeal)}
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
        ${dishRowHTML('Breakfast', d.breakfast)}
        ${dishRowHTML('Lunch', d.lunch)}
        ${dishRowHTML('Dinner', d.dinner)}
      </div>`;
    });
  });
  out.innerHTML = html;
  document.getElementById('floatingActionBar').classList.remove('hidden');
  renderTodayCard(weeks);
}

document.getElementById('generateBtn').addEventListener('click', ()=>{
  const weeks = generateSchedule();
  if(weeks){
    lastWeeks = weeks;
    renderSchedule(weeks);
  }
});

// Keep the "NOW" meal badge and today-highlight accurate as time passes
setInterval(()=>{
  if(lastWeeks) renderTodayCard(lastWeeks);
}, 60000);

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
  if(!lastWeeks){ showToast("Generate a schedule first", "info"); return; }
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
  if(!lastWeeks){ showToast("Generate a schedule first", "info"); return; }
  const items = aggregateGroceries(lastWeeks, state.portion);
  const text = "Busywomen Cook Schedule — Grocery List\n" +
    items.map(i => `• ${i.name} — ${roundQty(i.qty)} ${i.unit}`).join("\n");

  document.getElementById('manualCopyBox').classList.add('hidden');

  shareOrCopyText("Busywomen Cook Schedule — Grocery List", text).then((result)=>{
    if(result.via === 'share'){
      showToast("Grocery list shared!", "success");
    } else {
      showToast("Grocery list copied to clipboard!", "success");
    }
  }).catch((err)=>{
    // navigator.share throws if the person just cancels the share sheet —
    // that's not a failure, so don't show an error for it.
    if(err && err.name === 'AbortError') return;
    showManualCopyFallback(text);
    showToast("Couldn't auto-copy — select the text below", "error");
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
  if(!lastWeeks){ showToast("Generate a schedule first", "info"); return; }
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

// ---------------- WHATSAPP SHARE ----------------
document.getElementById('shareWhatsAppBtn').addEventListener('click', ()=>{
  if(!lastWeeks){ showToast("Generate a schedule first", "info"); return; }
  const info = getTodayInfo();
  const today = lastWeeks[info.weekIndex][info.dayIndex];
  const lines = [
    "🍽️ Busywomen Cook Schedule",
    `${today.day}'s plan:`,
    `🍳 Breakfast: ${today.breakfast ? today.breakfast.name : '-'}`,
    `🍛 Lunch: ${today.lunch ? today.lunch.name : '-'}`,
    `🍲 Dinner: ${today.dinner ? today.dinner.name : '-'}`,
  ];
  const url = "https://wa.me/?text=" + encodeURIComponent(lines.join("\n"));
  window.open(url, "_blank", "noopener");
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
  if(!lastWeeks){ showToast("Generate a schedule first", "info"); return; }
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
  showToast("Calendar file downloaded!", "success");
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
  } else {
    scheduleView.style.display = 'block';
    kidsView.style.display = 'none';
    if(lastWeeks) floatingBar.classList.remove('hidden');
    tabSchedule.classList.add('active');
    tabKids.classList.remove('active');
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
      <span class="tag ${item.type==='drink' ? 'south-indian':'veg'}">${item.type==='drink' ? 'Drink':'Snack'}</span>
      <a class="buy-btn deal" href="${shopLinkDeal(item.name)}" target="_blank" rel="noopener sponsored">💸 Best Price on Amazon</a>
    </div>`).join('');
  wrap.innerHTML = `
    <div class="kids-wrap">
      <div class="kids-head"><span class="kids-title">Kids' Snacks &amp; Drinks</span><hr></div>
      <p class="kids-sub">A separate healthy pick list for kids' tiffin boxes and after-school snacks. Every link is sorted lowest price first on Amazon, so you land on the cheapest deal, not just the top result.</p>
      <div class="kids-grid">${cards}</div>
    </div>`;
}
// Kids' Snacks & Drinks is a fixed, always-available list — render it once
// up front so it's ready the moment someone taps the tab.
renderKidsSection();
