'use strict';
/* =====================================================================
   database.js — stockage local
   • IndexedDB  : toutes les données importantes (tâches, classes, finances…)
   • localStorage : préférences simples (thème, couleur, nom, rappels…)
   Aucune donnée n'est envoyée à un serveur.
   ===================================================================== */
const KEY_PREFS = 'cc-prefs-v1', KEY_FALLBACK = 'cc-data-fallback', KEY_LEGACY = 'assistant-perso-v1';
const DB_NAME = 'centre-de-commande', DB_STORE = 'kv';
let S;                 // état complet de l'application (en mémoire)
let FIRST_RUN = false, IDB = null;

function defaults() {
  return {
    v: 2,
    settings: {
      name: 'Gilles', subject: 'Technologie', theme: 'auto', color: '#4f6bed', weekRef: null,
      cats: ['Travail', 'Famille', 'Maison', 'Association', 'Administratif', 'Courses', 'Personnel', 'Projets'],
      etabs: [], foodPrefs: '',
      weather: true, city: 'Clermont-l’Hérault', lat: 43.6277, lon: 3.4325,
      notif: { cours: true, coursLead: 30, events: true, echeance: true, courses: true, budget: true, makeups: true, weekly: true, daily: true, monthly: true, backup: true, browser: false }
    },
    tasks: [], events: [], classes: [], slots: [], sessions: [], evals: [], makeups: [], notes: [],
    asso: { opening: 0, tx: [], deadlines: [], docs: [] },
    budget: {
      cats: VARCATS.slice(), incomes: [], fixed: [], savings: [], tx: [],
      limits: { Alimentation: 400, Transport: 150, Loisirs: 100, Achats: 100, Famille: 100, Autres: 100 }
    },
    shop: [], shopHist: {}, meals: {}, family: [], projects: [], notifs: [],
    routines: [
      { id: 'matin', name: '☀️ Routine du matin', items: ['Regarder l’agenda', 'Vérifier les cours', 'Vérifier les tâches', 'Activité physique', 'Petit-déjeuner'].map(t => ({ id: uid(), t })) },
      { id: 'soir', name: '🌙 Routine du soir', items: ['Regarder l’agenda de demain', 'Préparer les affaires de demain', 'Noter les dépenses du jour', 'Trier la capture rapide', 'Ranger'].map(t => ({ id: uid(), t })) }
    ],
    routineLog: {},
    flags: { seen: {}, lastExport: null, demo: false, installed: null }
  };
}
function merge(base, p) {
  for (const k in p) {
    if (p[k] && typeof p[k] === 'object' && !Array.isArray(p[k]) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) merge(base[k], p[k]);
    else base[k] = p[k];
  }
  return base;
}

/* ----- Petite couche IndexedDB (clé → valeur) ----- */
const DB = {
  open() {
    return new Promise(res => {
      if (!window.indexedDB) return res(null);
      let r; try { r = indexedDB.open(DB_NAME, 1); } catch (e) { return res(null); }
      r.onupgradeneeded = () => r.result.createObjectStore(DB_STORE);
      r.onsuccess = () => res(r.result); r.onerror = () => res(null); r.onblocked = () => res(null);
    });
  },
  get(k) { return new Promise((res, rej) => { const q = IDB.transaction(DB_STORE).objectStore(DB_STORE).get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); },
  put(k, v) { return new Promise((res, rej) => { const t = IDB.transaction(DB_STORE, 'readwrite'); t.objectStore(DB_STORE).put(v, k); t.oncomplete = () => res(); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }); },
  wipe() { return new Promise(res => { if (IDB) IDB.close(); if (!window.indexedDB) return res(); const r = indexedDB.deleteDatabase(DB_NAME); r.onsuccess = r.onerror = r.onblocked = () => res(); }); }
};

/** Charge les données (IndexedDB, sinon repli localStorage, sinon migration de l'ancienne version). */
async function loadState() {
  const d = defaults(); let found = false;
  try { const p = localStorage.getItem(KEY_PREFS); if (p) { merge(d.settings, JSON.parse(p)); found = true; } } catch (e) { }
  IDB = await DB.open();
  let data = null;
  try { if (IDB) data = await DB.get('state'); else { const f = localStorage.getItem(KEY_FALLBACK); if (f) data = JSON.parse(f); } } catch (e) { console.error('Lecture impossible', e); }
  if (data) { merge(d, data); found = true; }
  else {
    // Migration automatique depuis « Mon Assistant » (ancienne version, même adresse)
    try { const old = localStorage.getItem(KEY_LEGACY); if (old) { merge(d, JSON.parse(old)); found = true; d.flags.migrated = true; } } catch (e) { }
  }
  FIRST_RUN = !found;
  d.v = 2;
  // nettoyage du journal des routines (60 jours)
  Object.keys(d.routineLog).forEach(k => { if (diffDays(today(), k) > 60) delete d.routineLog[k]; });
  S = d;
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { }   // évite l'effacement automatique par le navigateur
}

/* Sauvegarde différée : regroupe les écritures rapprochées */
let saveTimer = null;
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(flush, 120); }
async function flush() {
  clearTimeout(saveTimer); saveTimer = null; if (!S) return;
  try { localStorage.setItem(KEY_PREFS, JSON.stringify(S.settings)); } catch (e) { }
  const data = { ...S }; delete data.settings;
  try {
    if (IDB) await DB.put('state', data); else localStorage.setItem(KEY_FALLBACK, JSON.stringify(data));
  } catch (e) { toast('⚠️ Sauvegarde impossible (stockage plein ou bloqué). Exporte tes données !'); }
}
window.addEventListener('pagehide', () => { if (saveTimer) flush(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && saveTimer) flush(); });

/* ----- Export / import / remise à zéro ----- */
ACT.exportJSON = () => {
  S.flags.lastExport = today(); save();
  downloadFile(`centre-de-commande-sauvegarde-${today()}.json`, JSON.stringify(S, null, 1), 'application/json');
  toast('⬇ Sauvegarde téléchargée'); render();
};
ACT.importJSON = () => $('#importFile').click();
function importFile(file) {
  if (!file) return; const r = new FileReader();
  r.onload = () => {
    try {
      const j = JSON.parse(r.result);
      if (!j || typeof j !== 'object' || !j.settings || !Array.isArray(j.tasks)) throw new Error('ce n’est pas une sauvegarde de l’application');
      if (!window.confirm('Remplacer TOUTES les données actuelles par cette sauvegarde ?')) return;
      S = merge(defaults(), j); flush().then(() => { applyTheme(); go('home'); toast('✅ Données restaurées'); });
    } catch (e) { window.alert('Fichier invalide : ' + e.message); }
  };
  r.readAsText(file);
}
ACT.resetAll = async () => {
  if (window.confirm('Effacer TOUTES tes données de cet appareil ? (pense à exporter avant)') && window.confirm('Dernière confirmation : tout supprimer ?')) {
    clearTimeout(saveTimer); saveTimer = null;
    [KEY_PREFS, KEY_FALLBACK, KEY_LEGACY, 'weather-cache'].forEach(k => { try { localStorage.removeItem(k); } catch (e) { } });
    await DB.wipe(); location.reload();
  }
};
