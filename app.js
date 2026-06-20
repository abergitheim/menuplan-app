'use strict';

// =============================================
// Konfiguration & Konstanten
// =============================================

const MEALS = [
  { key: 'breakfast', label: '🌅 Frühstück' },
  { key: 'lunch',     label: '☀️ Mittagessen' },
  { key: 'dinner',    label: '🌙 Abendessen' },
];

const PERSONS = ['alain', 'sibylle', 'noah'];

const DAYS_DE   = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const MONTHS_DE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
                   'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

// =============================================
// State
// =============================================

let currentDate = new Date();
currentDate.setHours(0, 0, 0, 0);

let db = null;
let useFirebase = false;
let activeListener = null;

// =============================================
// Hilfsfunktionen Datum
// =============================================

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateDisplay(date) {
  const day  = DAYS_DE[date.getDay()];
  const num  = date.getDate();
  const mon  = MONTHS_DE[date.getMonth()];
  const year = date.getFullYear();
  return `${day}, ${num}. ${mon} ${year}`;
}

function isToday(date) {
  const today = new Date();
  return date.getFullYear() === today.getFullYear()
      && date.getMonth()    === today.getMonth()
      && date.getDate()     === today.getDate();
}

// =============================================
// Firebase initialisieren
// =============================================

function initFirebase() {
  try {
    if (typeof firebaseConfig === 'undefined') throw new Error('no config');
    if (firebaseConfig.apiKey === 'HIER_API_KEY_EINTRAGEN') throw new Error('placeholder');

    const app = firebase.initializeApp(firebaseConfig);
    db = firebase.database(app);
    useFirebase = true;
    console.log('Firebase verbunden ✅');
  } catch (e) {
    useFirebase = false;
    console.warn('Firebase nicht konfiguriert — LocalStorage-Modus aktiv.');
    showSyncStatus('Offline-Modus (kein Firebase)', true);
  }
}

// =============================================
// LocalStorage-Fallback
// =============================================

const LS_KEY = 'menuplan_data';

function lsGet(dateKey) {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const all = raw ? JSON.parse(raw) : {};
    return all[dateKey] || null;
  } catch { return null; }
}

function lsSet(dateKey, mealKey, field, value) {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const all = raw ? JSON.parse(raw) : {};
    if (!all[dateKey]) all[dateKey] = {};
    if (!all[dateKey][mealKey]) all[dateKey][mealKey] = { menu: '', notes: '', present: { alain: false, sibylle: false, noah: false } };
    if (field === 'present.alain' || field === 'present.sibylle' || field === 'present.noah') {
      const person = field.split('.')[1];
      all[dateKey][mealKey].present[person] = value;
    } else {
      all[dateKey][mealKey][field] = value;
    }
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  } catch (e) { console.error('LocalStorage-Fehler:', e); }
}

// =============================================
// Daten laden
// =============================================

function loadMeals(dateKey) {
  if (useFirebase) {
    // Alten Listener entfernen
    if (activeListener) {
      activeListener.ref.off('value', activeListener.fn);
      activeListener = null;
    }

    const ref = db.ref(`meals/${dateKey}`);
    const fn = ref.on('value', (snapshot) => {
      const data = snapshot.val() || {};
      applyDataToUI(dateKey, data);
    }, (error) => {
      console.error('Firebase Lesefehler:', error);
      showSyncStatus('Sync-Fehler ⚠️', true);
    });

    activeListener = { ref, fn };
  } else {
    const data = lsGet(dateKey) || {};
    applyDataToUI(dateKey, data);
  }
}

function applyDataToUI(dateKey, data) {
  MEALS.forEach(({ key: mealKey }) => {
    const mealData = data[mealKey] || {};
    const card = document.querySelector(`.meal-card[data-meal="${mealKey}"]`);
    if (!card) return;

    // Menü-Feld
    const menuField = card.querySelector('.meal-field[data-field="menu"]');
    if (menuField && document.activeElement !== menuField) {
      menuField.textContent = mealData.menu || '';
    }

    // Notiz-Feld
    const noteField = card.querySelector('.note-field[data-field="notes"]');
    if (noteField && document.activeElement !== noteField) {
      noteField.textContent = mealData.notes || '';
    }

    // Personen-Chips
    const present = mealData.present || {};
    PERSONS.forEach((person) => {
      const chip = card.querySelector(`.chip[data-person="${person}"]`);
      if (!chip) return;
      const isActive = !!present[person];
      chip.classList.toggle('active', isActive);
      chip.setAttribute('aria-pressed', String(isActive));
    });
  });
}

// =============================================
// Daten speichern
// =============================================

function saveMeal(dateKey, mealKey, field, value) {
  if (useFirebase) {
    const path = `meals/${dateKey}/${mealKey}/${field}`;
    db.ref(path).set(value).catch((err) => {
      console.error('Firebase Schreibfehler:', err);
      showSyncStatus('Speichern fehlgeschlagen ⚠️', true);
    });
  } else {
    lsSet(dateKey, mealKey, field, value);
  }
}

function togglePresent(dateKey, mealKey, person) {
  if (useFirebase) {
    const path = `meals/${dateKey}/${mealKey}/present/${person}`;
    const ref = db.ref(path);
    ref.transaction((current) => !current);
  } else {
    const data = lsGet(dateKey) || {};
    const current = (data[mealKey] && data[mealKey].present && data[mealKey].present[person]) || false;
    lsSet(dateKey, mealKey, `present.${person}`, !current);

    // UI sofort updaten im Offline-Modus
    const card = document.querySelector(`.meal-card[data-meal="${mealKey}"]`);
    if (card) {
      const chip = card.querySelector(`.chip[data-person="${person}"]`);
      if (chip) {
        const nowActive = !current;
        chip.classList.toggle('active', nowActive);
        chip.setAttribute('aria-pressed', String(nowActive));
      }
    }
  }
}

// =============================================
// Navigation
// =============================================

function navigateDay(delta) {
  const next = new Date(currentDate);
  next.setDate(next.getDate() + delta);
  currentDate = next;
  renderDay(currentDate);
}

function goToday() {
  currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  renderDay(currentDate);
}

// =============================================
// UI aufbauen
// =============================================

function renderDay(date) {
  const dateKey = formatDateKey(date);
  const display = formatDateDisplay(date);

  // Datum-Button aktualisieren
  const dateBtn = document.getElementById('date-display');
  dateBtn.textContent = display;
  dateBtn.classList.toggle('today', isToday(date));

  // Felder leeren (vor dem Laden)
  document.querySelectorAll('.meal-field, .note-field').forEach((el) => {
    el.textContent = '';
  });
  document.querySelectorAll('.chip').forEach((chip) => {
    chip.classList.remove('active');
    chip.setAttribute('aria-pressed', 'false');
  });

  // Daten laden
  loadMeals(dateKey);
}

// =============================================
// Event-Handler
// =============================================

function setupEventHandlers() {
  // Navigation
  document.getElementById('btn-prev').addEventListener('click', () => navigateDay(-1));
  document.getElementById('btn-next').addEventListener('click', () => navigateDay(1));
  document.getElementById('date-display').addEventListener('click', goToday);

  // Wisch-Geste (Touch-Swipe links/rechts)
  // Zwei-Finger-Gesten (Pinch-Zoom) werden explizit ignoriert
  let touchStartX = 0;
  let touchIsMulti = false;

  document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) { touchIsMulti = true; return; }
    touchStartX = e.touches[0].clientX;
    // touchIsMulti wird NICHT hier zurückgesetzt — erst wenn alle Finger weg sind
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1) touchIsMulti = true; // zweiter Finger kam dazu
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (e.touches.length > 0) return;              // noch Finger auf Display → warten
    if (touchIsMulti) { touchIsMulti = false; return; } // war Pinch → kein Swipe
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 60) navigateDay(dx < 0 ? 1 : -1);
  }, { passive: true });

  // Karten-Events (Event Delegation)
  const container = document.getElementById('meals-container');

  // Personen-Chips
  container.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const card = chip.closest('.meal-card');
    const mealKey = card.dataset.meal;
    const person  = chip.dataset.person;
    togglePresent(formatDateKey(currentDate), mealKey, person);
  });

  // Menü-Feld: Blur → speichern
  container.addEventListener('blur', (e) => {
    const field = e.target.closest('.meal-field, .note-field');
    if (!field) return;
    const card    = field.closest('.meal-card');
    const mealKey = card.dataset.meal;
    const fieldKey = field.dataset.field;
    const value   = field.textContent.trim();
    saveMeal(formatDateKey(currentDate), mealKey, fieldKey, value);
    flashSaved(field);
  }, true);

  // Enter-Taste in Menü-Feld = Blur (kein Zeilenumbruch)
  container.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const field = e.target.closest('.meal-field');
      if (field) {
        e.preventDefault();
        field.blur();
      }
    }
  });
}

// =============================================
// Visuelles Feedback
// =============================================

function flashSaved(el) {
  el.classList.remove('saved');
  void el.offsetWidth; // reflow um Animation neu zu starten
  el.classList.add('saved');
  el.addEventListener('animationend', () => el.classList.remove('saved'), { once: true });
}

let syncStatusTimer = null;
function showSyncStatus(msg, isError = false) {
  const el = document.getElementById('sync-status');
  el.textContent = msg;
  el.classList.toggle('error', isError);
  el.classList.add('visible');
  clearTimeout(syncStatusTimer);
  syncStatusTimer = setTimeout(() => el.classList.remove('visible'), 3000);
}

// =============================================
// Start
// =============================================

document.addEventListener('DOMContentLoaded', () => {
  initFirebase();
  setupEventHandlers();
  renderDay(currentDate);
});
