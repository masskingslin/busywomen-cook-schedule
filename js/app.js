// Storage & Default Settings
const SETTINGS_KEY = 'busywomen_user_preferences';

const DEFAULT_SETTINGS = {
  breakfastTime: '08:00',
  lunchTime: '13:00',
  dinnerTime: '20:00',
  reminderInterval: '-PT30M',
  portionMultiplier: 2
};

// Global State
const state = {
  diet: 'all',
  effort: 3,
  quickOnly: false,
  portionMultiplier: 2,
  schedule: []
};

// DOM References
const dietPills = document.querySelectorAll('#dietFilter .pill');
const effortPills = document.querySelectorAll('#effortFilter .pill');
const portionPills = document.querySelectorAll('#portionFilter .pill');
const quickToggle = document.getElementById('quickTimeOnly');
const generateBtn = document.getElementById('generateBtn');
const scheduleOutput = document.getElementById('scheduleOutput');
const floatingActionBar = document.getElementById('floatingActionBar');
const resetPreferencesBtn = document.getElementById('resetPreferencesBtn');
const exportCalendarBtn = document.getElementById('exportCalendarBtn');

// Modals
const groceryModal = document.getElementById('groceryModal');
const prepModal = document.getElementById('prepModal');
const openGroceryBtn = document.getElementById('openGroceryBtn');
const openPrepBtn = document.getElementById('openPrepBtn');
const shareWhatsAppBtn = document.getElementById('shareWhatsAppBtn');
const copyGroceryBtn = document.getElementById('copyGroceryBtn');
const closeModalBtns = document.querySelectorAll('.close-modal');

let toastTimeout = null;

/**
 * Enhanced Toast helper with optional action button callback
 */
function showToast(message, type = 'success', duration = 2200, action = null) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

  toast.className = `toast ${type} show`;
  toast.innerHTML = `<span>${message}</span>`;

  if (action && typeof action.onClick === 'function') {
    const actionBtn = document.createElement('button');
    actionBtn.type = 'button';
    actionBtn.className = 'toast-action-btn';
    actionBtn.textContent = action.label;

    actionBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      clearTimeout(toastTimeout);
      toast.classList.remove('show');
      action.onClick();
    }, { once: true });

    toast.appendChild(actionBtn);
  }

  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (!toast.classList.contains('show')) {
        toast.classList.add('hidden');
      }
    }, 200);
  }, duration);
}

/**
 * Applies a given preferences object to inputs, state, and active UI elements
 */
function applyPreferences(prefs) {
  const bInput = document.getElementById('breakfastTime');
  const lInput = document.getElementById('lunchTime');
  const dInput = document.getElementById('dinnerTime');
  if (bInput) bInput.value = prefs.breakfastTime;
  if (lInput) lInput.value = prefs.lunchTime;
  if (dInput) dInput.value = prefs.dinnerTime;

  const reminderSelect = document.getElementById('reminderInterval');
  if (reminderSelect) reminderSelect.value = prefs.reminderInterval;

  state.portionMultiplier = parseInt(prefs.portionMultiplier, 10);
  portionPills.forEach(pill => {
    const isMatch = parseInt(pill.getAttribute('data-value'), 10) === state.portionMultiplier;
    pill.classList.toggle('active', isMatch);
  });

  if (state.schedule.length > 0) {
    renderSchedule();
  }
}

/**
 * Saves current preferences to localStorage
 */
function savePreferences() {
  const preferences = {
    breakfastTime: document.getElementById('breakfastTime')?.value || DEFAULT_SETTINGS.breakfastTime,
    lunchTime: document.getElementById('lunchTime')?.value || DEFAULT_SETTINGS.lunchTime,
    dinnerTime: document.getElementById('dinnerTime')?.value || DEFAULT_SETTINGS.dinnerTime,
    reminderInterval: document.getElementById('reminderInterval')?.value || DEFAULT_SETTINGS.reminderInterval,
    portionMultiplier: state.portionMultiplier || DEFAULT_SETTINGS.portionMultiplier
  };

  localStorage.setItem(SETTINGS_KEY, JSON.stringify(preferences));
  showToast('✓ Preferences saved', 'success');
}

/**
 * Restores saved values into inputs and application state
 */
function restorePreferences() {
  const saved = localStorage.getItem(SETTINGS_KEY);
  if (!saved) return;

  try {
    const preferences = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    applyPreferences(preferences);
  } catch (e) {
    console.warn('Unable to parse saved preferences from localStorage:', e);
  }
}

/**
 * Resets preferences to factory defaults with interactive undo window
 */
function resetPreferences() {
  const previousSettings = {
    breakfastTime: document.getElementById('breakfastTime')?.value || DEFAULT_SETTINGS.breakfastTime,
    lunchTime: document.getElementById('lunchTime')?.value || DEFAULT_SETTINGS.lunchTime,
    dinnerTime: document.getElementById('dinnerTime')?.value || DEFAULT_SETTINGS.dinnerTime,
    reminderInterval: document.getElementById('reminderInterval')?.value || DEFAULT_SETTINGS.reminderInterval,
    portionMultiplier: state.portionMultiplier || DEFAULT_SETTINGS.portionMultiplier
  };

  localStorage.removeItem(SETTINGS_KEY);
  applyPreferences(DEFAULT_SETTINGS);

  showToast('↺ Preferences reset', 'info', 5000, {
    label: 'Undo',
    onClick: () => {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(previousSettings));
      applyPreferences(previousSettings);
      showToast('✓ Preferences restored', 'success', 2000);
    }
  });
}

/**
 * Setup button pill selection groups
 */
function setupPillGroup(elements, callback) {
  elements.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      callback(btn.getAttribute('data-value'));
    });
  });
}

/**
 * Returns filtered meals matching active parameters
 */
function getFilteredMeals(mealType) {
  return MEAL_DATABASE.filter(meal => {
    if (meal.type !== mealType) return false;
    if (state.diet !== 'all' && !meal.tags.includes(state.diet)) return false;
    if (meal.effort > state.effort) return false;
    if (state.quickOnly && meal.time > 20) return false;
    return true;
  });
}

function shuffleArray(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

/**
 * Generates a 4-week zero-repeat meal rotation
 */
function generateMonthlySchedule() {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  state.schedule = [];

  const breakfasts = getFilteredMeals('breakfast');
  const lunches = getFilteredMeals('lunch');
  const dinners = getFilteredMeals('dinner');

  if (breakfasts.length === 0 || lunches.length === 0 || dinners.length === 0) {
    alert("No dishes match all chosen filters. Try loosening your effort or time limit.");
    return;
  }

  for (let w = 1; w <= 4; w++) {
    const weekData = { weekNumber: w, days: [] };
    const weekB = shuffleArray([...breakfasts]);
    const weekL = shuffleArray([...lunches]);
    const weekD = shuffleArray([...dinners]);

    for (let d = 0; d < 7; d++) {
      weekData.days.push({
        dayName: days[d],
        breakfast: weekB[d % weekB.length],
        lunch: weekL[d % weekL.length],
        dinner: weekD[d % weekD.length]
      });
    }
    state.schedule.push(weekData);
  }

  renderSchedule();
  floatingActionBar.classList.remove('hidden');
}

/**
 * Renders weekly cards into schedule output container
 */
function renderSchedule() {
  if (state.schedule.length === 0) return;

  scheduleOutput.innerHTML = state.schedule.map((week) => `
    <div class="week-container">
      <h3 class="week-title">Week 0${week.weekNumber}</h3>
      <div class="days-grid">
        ${week.days.map((d, dayIndex) => `
          <div class="day-card">
            <div class="day-header">${d.dayName}</div>
            ${renderMealSlot('Breakfast', d.breakfast, week.weekNumber, dayIndex, 'breakfast')}
            ${renderMealSlot('Lunch', d.lunch, week.weekNumber, dayIndex, 'lunch')}
            ${renderMealSlot('Dinner', d.dinner, week.weekNumber, dayIndex, 'dinner')}
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  attachSwapListeners();
}

function renderMealSlot(label, meal, weekNum, dayIndex, slotType) {
  return `
    <div class="meal-slot">
      <div class="slot-label">${label}</div>
      <div class="meal-title-row">
        <span class="meal-name">${meal.name}</span>
        <button class="swap-btn" data-week="${weekNum}" data-day="${dayIndex}" data-slot="${slotType}" title="Swap with alternative dish">🔄</button>
      </div>
      <div class="meal-meta">
        ${'🌶'.repeat(meal.effort)} · ⏱ ${meal.time}m
      </div>
    </div>
  `;
}

/**
 * Attaches single dish re-roll / swap listeners
 */
function attachSwapListeners() {
  document.querySelectorAll('.swap-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const weekNum = parseInt(btn.getAttribute('data-week'), 10);
      const dayIndex = parseInt(btn.getAttribute('data-day'), 10);
      const slotType = btn.getAttribute('data-slot');

      const options = getFilteredMeals(slotType);
      if (options.length <= 1) {
        showToast('No alternative dish found under current filters', 'info');
        return;
      }

      const week = state.schedule.find(w => w.weekNumber === weekNum);
      const currentMeal = week.days[dayIndex][slotType];
      const alternatives = options.filter(m => m.id !== currentMeal.id);
      const newMeal = alternatives[Math.floor(Math.random() * alternatives.length)];

      week.days[dayIndex][slotType] = newMeal;
      renderSchedule();
      showToast(`Swapped to ${newMeal.name}`, 'success');
    });
  });
}

/**
 * Aggregates all ingredients multiplied by portion scale
 */
function renderGroceryModal() {
  const groceryMap = new Map();
  const scale = state.portionMultiplier;

  state.schedule.forEach(week => {
    week.days.forEach(day => {
      ['breakfast', 'lunch', 'dinner'].forEach(type => {
        const meal = day[type];
        if (meal && meal.ingredients) {
          meal.ingredients.forEach(item => {
            const key = `${item.name}|${item.unit}`;
            const existing = groceryMap.get(key) || 0;
            groceryMap.set(key, existing + (item.qty * (scale / 2)));
          });
        }
      });
    });
  });

  const listContainer = document.getElementById('groceryListContent');
  if (groceryMap.size === 0) {
    listContainer.innerHTML = `<p class="empty-state">Generate a schedule first to view groceries.</p>`;
    return;
  }

  let html = `<div class="grocery-cat">Consolidated Pantry & Produce (${scale} Person Scale)</div>`;
  groceryMap.forEach((qty, key) => {
    const [name, unit] = key.split('|');
    const roundedQty = Math.ceil(qty * 10) / 10;
    html += `
      <div class="grocery-item">
        <span>${name}</span>
        <b>${roundedQty} ${unit}</b>
      </div>
    `;
  });

  listContainer.innerHTML = html;
  groceryModal.classList.remove('hidden');
}

/**
 * Displays Sunday 45-min batch preparation guide
 */
function renderPrepModal() {
  const prepContainer = document.getElementById('prepListContent');
  prepContainer.innerHTML = SUNDAY_PREP_ROUTINE.map((item, index) => `
    <div class="prep-item">
      <div>
        <b>${index + 1}. ${item.task}</b>
        <p style="font-size:0.75rem; color: var(--text-muted);">${item.detail}</p>
      </div>
    </div>
  `).join('');

  prepModal.classList.remove('hidden');
}

function copyGroceryToClipboard() {
  const items = document.querySelectorAll('.grocery-item');
  if (items.length === 0) return;

  let text = `*Busywomen Cook Schedule - Grocery List (${state.portionMultiplier} People)*\n\n`;
  items.forEach(el => {
    text += `• ${el.innerText.replace('\n', ': ')}\n`;
  });

  navigator.clipboard.writeText(text).then(() => {
    showToast('📋 Grocery list copied to clipboard!', 'success');
  });
}

function shareViaWhatsApp() {
  if (state.schedule.length === 0) return;
  const currentWeek = state.schedule[0];
  let text = `*Busywomen Cook Schedule - Week 1 Plan*\n\n`;

  currentWeek.days.forEach(d => {
    text += `*${d.dayName}*\n`;
    text += `🍳 B: ${d.breakfast.name}\n`;
    text += `🍛 L: ${d.lunch.name}\n`;
    text += `🍲 D: ${d.dinner.name}\n\n`;
  });

  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

/**
 * iCalendar Export Utilities
 */
function parseTimeInput(timeStr, defaultHour, defaultMin) {
  if (!timeStr) return { hour: defaultHour, min: defaultMin };
  const parts = timeStr.split(':').map(Number);
  return {
    hour: isNaN(parts[0]) ? defaultHour : parts[0],
    min: isNaN(parts[1]) ? defaultMin : parts[1]
  };
}

function formatICSDate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  );
}

function escapeICSText(text) {
  return text.replace(/[\\;,]/g, (match) => '\\' + match);
}

function getNextMonday(refDate) {
  const date = new Date(refDate);
  const day = date.getDay();
  const diff = (day === 0 ? 1 : 8 - day);
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Builds and downloads RFC 5545 iCalendar (.ics) schedule file
 */
function exportScheduleToICS() {
  if (!state.schedule || state.schedule.length === 0) {
    showToast('Please generate a schedule before exporting.', 'info');
    return;
  }

  const reminderSelect = document.getElementById('reminderInterval');
  const selectedTrigger = reminderSelect ? reminderSelect.value : '-PT30M';

  const bTime = parseTimeInput(document.getElementById('breakfastTime')?.value, 8, 0);
  const lTime = parseTimeInput(document.getElementById('lunchTime')?.value, 13, 0);
  const dTime = parseTimeInput(document.getElementById('dinnerTime')?.value, 20, 0);

  const startDate = getNextMonday(new Date());

  const mealWindows = {
    breakfast: { startHour: bTime.hour, startMin: bTime.min, durationMin: 30, icon: '🍳' },
    lunch:     { startHour: lTime.hour, startMin: lTime.min, durationMin: 45, icon: '🍛' },
    dinner:    { startHour: dTime.hour, startMin: dTime.min, durationMin: 45, icon: '🍲' }
  };

  const nowUTC = formatICSDate(new Date());
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Busywomen Cook Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Busywomen Meal Plan',
    'X-WR-TIMEZONE:UTC'
  ];

  state.schedule.forEach((week, weekIndex) => {
    week.days.forEach((day, dayIndex) => {
      const dayOffset = (weekIndex * 7) + dayIndex;
      const targetDate = new Date(startDate);
      targetDate.setDate(targetDate.getDate() + dayOffset);

      ['breakfast', 'lunch', 'dinner'].forEach((mealType) => {
        const meal = day[mealType];
        if (!meal) return;

        const config = mealWindows[mealType];

        const eventStart = new Date(targetDate);
        eventStart.setHours(config.startHour, config.startMin, 0, 0);

        const eventEnd = new Date(eventStart);
        eventEnd.setMinutes(eventEnd.getMinutes() + config.durationMin);

        let ingredientText = meal.ingredients
          ? meal.ingredients.map(i => `${i.name} (${i.qty} ${i.unit})`).join(', ')
          : 'None listed';

        const description = `Dish: ${meal.name}\\n` +
          `Time: ${meal.time} mins | Effort: ${'🌶'.repeat(meal.effort)}\\n` +
          `Ingredients: ${ingredientText}\\n` +
          `Prep Note: ${meal.prepNote || 'Standard prep'}`;

        const uid = `meal-${week.weekNumber}-${dayIndex}-${mealType}-${eventStart.getTime()}@busywomen`;

        icsContent.push(
          'BEGIN:VEVENT',
          `UID:${uid}`,
          `DTSTAMP:${nowUTC}`,
          `DTSTART:${formatICSDate(eventStart)}`,
          `DTEND:${formatICSDate(eventEnd)}`,
          `SUMMARY:${config.icon} ${capitalize(mealType)}: ${escapeICSText(meal.name)}`,
          `DESCRIPTION:${description}`,
          'STATUS:CONFIRMED'
        );

        if (selectedTrigger !== 'none') {
          icsContent.push(
            'BEGIN:VALARM',
            'ACTION:DISPLAY',
            `DESCRIPTION:Prep reminder for ${escapeICSText(meal.name)} (${meal.time} mins)`,
            `TRIGGER:${selectedTrigger}`,
            'END:VALARM'
          );
        }

        icsContent.push('END:VEVENT');
      });
    });
  });

  icsContent.push('END:VCALENDAR');

  const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const downloadUrl = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = downloadUrl;
  link.setAttribute('download', 'busywomen_meal_schedule.ics');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);

  showToast('📅 Calendar export downloaded', 'success');
}

/**
 * Event Listeners Initialization
 */
function initEventListeners() {
  restorePreferences();

  setupPillGroup(dietPills, (val) => state.diet = val);
  setupPillGroup(effortPills, (val) => state.effort = parseInt(val, 10));

  setupPillGroup(portionPills, (val) => {
    state.portionMultiplier = parseInt(val, 10);
    savePreferences();
    if (state.schedule.length > 0) renderSchedule();
  });

  ['breakfastTime', 'lunchTime', 'dinnerTime'].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.addEventListener('change', savePreferences);
  });

  const reminderSelect = document.getElementById('reminderInterval');
  if (reminderSelect) reminderSelect.addEventListener('change', savePreferences);

  quickToggle.addEventListener('change', (e) => {
    state.quickOnly = e.target.checked;
  });

  generateBtn.addEventListener('click', generateMonthlySchedule);
  openGroceryBtn.addEventListener('click', renderGroceryModal);
  openPrepBtn.addEventListener('click', renderPrepModal);
  shareWhatsAppBtn.addEventListener('click', shareViaWhatsApp);
  copyGroceryBtn.addEventListener('click', copyGroceryToClipboard);

  if (resetPreferencesBtn) {
    resetPreferencesBtn.addEventListener('click', resetPreferences);
  }

  if (exportCalendarBtn) {
    exportCalendarBtn.addEventListener('click', exportScheduleToICS);
  }

  closeModalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      document.getElementById(targetId).classList.add('hidden');
    });
  });
}

document.addEventListener('DOMContentLoaded', initEventListeners);
