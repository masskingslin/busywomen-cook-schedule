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
      <a class="buy-btn best-price" href="${shopLinkBestPrice(item.name)}" target="_blank" rel="noopener sponsored" title="Cheapest listings for ${item.name} on Amazon">💰 Best Price</a>
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
  teal:  { '--teal-deep':'#123B3A', '--teal-mid':'#1B5450', '--teal-line':'#2B6864', '--cream':'#FBF3E4', '--turmeric':'#E7A72C', '--chili':'#C1442D', '--leaf':'#5B8C5A', '--ink':'#1B1B16', '--ink-soft':'#5A5A50', '--white':'#FFFDF8' },
  berry: { '--teal-deep':'#3B1224', '--teal-mid':'#5C1B38', '--teal-line':'#7A2048', '--cream':'#FBF0E9', '--turmeric':'#E0A458', '--chili':'#C1442D', '--leaf':'#8C5A6E', '--ink':'#241315', '--ink-soft':'#6B4A52', '--white':'#FFFCF9' },
  ocean: { '--teal-deep':'#0B2E3A', '--teal-mid':'#0F4C5C', '--teal-line':'#1B6E80', '--cream':'#EFF7F6', '--turmeric':'#4FB6A6', '--chili':'#E0703E', '--leaf':'#2E8B7A', '--ink':'#132226', '--ink-soft':'#4A6167', '--white':'#FFFFFF' },
};
function applyTheme(name){
  const t = THEMES[name] || THEMES.teal;
  Object.entries(t).forEach(([k,v]) => document.documentElement.style.setProperty(k, v));
  document.querySelectorAll('.theme-swatch').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.theme === name);
  });
}
document.querySelectorAll('.theme-swatch').forEach(btn=>{
  btn.addEventListener('click', async ()=>{
    const name = btn.dataset.theme;
    applyTheme(name);
    try{ await window.storage.set('theme-pref', name); }catch(e){ /* ignore */ }
  });
});
(async function loadTheme(){
  try{
    const res = await window.storage.get('theme-pref');
    applyTheme(res && res.value ? res.value : 'teal');
  }catch(e){ applyTheme('teal'); }
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
  return weeks;
}

// ---------------- RENDERING ----------------
function dishRowHTML(label, dish){
  if(!dish) return '';
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
    <div class="meal-row">
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
}

document.getElementById('generateBtn').addEventListener('click', ()=>{
  const weeks = generateSchedule();
  if(weeks){
    lastWeeks = weeks;
    renderSchedule(weeks);
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
  if(!lastWeeks){ showToast("Generate a schedule first"); return; }
  const items = aggregateGroceries(lastWeeks, state.portion);
  const content = document.getElementById('groceryListContent');
  content.innerHTML = items.map(item => `
    <div class="grocery-item">
      <input type="checkbox" />
      <span class="g-name">${item.name}</span>
      <span class="g-qty">${roundQty(item.qty)} ${item.unit}</span>
      <a class="buy-btn readymade" href="${shopLinkProduct(item.name)}" target="_blank" rel="noopener sponsored">🛒</a>
    </div>`).join('');
  openModal('groceryModal');
}
document.getElementById('openGroceryBtn').addEventListener('click', renderGroceryList);

document.getElementById('copyGroceryBtn').addEventListener('click', ()=>{
  if(!lastWeeks) return;
  const items = aggregateGroceries(lastWeeks, state.portion);
  const text = [
    ...brandHeaderLines(),
    "",
    `🛒 Grocery List — scaled for ${state.portion} ${state.portion===1?'person':'people'}`,
    "",
    ...items.map(i => `• ${i.name} — ${roundQty(i.qty)} ${i.unit}`),
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
});
