'use strict';
/* =====================================================================
   MON CENTRE DE COMMANDE — core.js
   Outils (dates, formatage) et constantes partagées par tous les modules.
   Ordre de chargement (voir index.html) :
     core → database → priority → ui → calendar → tasks → teacher → budget →
     shopping → meals → family → association → projects → notes → routines →
     home → assistant → notifications → weather → search → settings → demo → app
   ===================================================================== */

/* ---------- 1. OUTILS ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseD = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const today = () => iso(new Date());
const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return iso(d); };
const diffDays = (a, b) => Math.round((parseD(a) - parseD(b)) / 864e5);
const dow = s => (parseD(s).getDay() + 6) % 7 + 1;            // 1 = lundi … 7 = dimanche
const mondayOf = s => addDays(s, -(dow(s) - 1));
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const toMin = t => { const [h, m] = (t || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
const fromMin = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const fmtT = t => (t || '').replace(':', 'h');
const sum = (arr, k) => arr.reduce((a, x) => a + (Number(k ? x[k] : x) || 0), 0);
const money = n => (Number(n) || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const byId = (arr, id) => arr.find(x => x.id === id);
const removeId = (arr, id) => { const i = arr.findIndex(x => x.id === id); if (i >= 0) arr.splice(i, 1); };
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;

/* ---------- 2. CONSTANTES ---------- */
const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const fmtLong = s => { const d = parseD(s); return `${DAYS[dow(s) - 1]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; };
const fmtShort = s => { const d = parseD(s); return `${DAYS[dow(s) - 1].slice(0, 3)} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };
const PRIO = { urgent: { i: '🔴', l: 'Urgent' }, important: { i: '🟠', l: 'Important' }, normal: { i: '🟢', l: 'Normal' }, low: { i: '⚪', l: 'Faible' } };
const EVCATS = {
  travail: ['🏫 Travail', '#4f6bed'], famille: ['👨‍👩‍👦 Famille', '#0ca678'], asso: ['🏢 Association', '#f08c00'],
  perso: ['🏠 Personnel', '#868e96'], important: ['📌 Important', '#e03131'],
  // anciennes catégories : conservées pour que les données existantes restent lisibles
  rdv: ['Rendez-vous', '#e8590c'], cours: ['Cours', '#4f6bed'], reunion: ['Réunion', '#7048e8'], echeance: ['Échéance', '#e03131']
};
const EVCATS_FORM = ['travail', 'famille', 'asso', 'perso', 'important'];
const IMPORTANT_CATS = ['important', 'echeance'];
const SHOPCATS = ['Fruits/légumes', 'Viande', 'Produits frais', 'Surgelés', 'Épicerie', 'Boissons', 'Maison', 'Hygiène', 'Enfant', 'Autres'];
const VARCATS = ['Alimentation', 'Transport', 'Loisirs', 'Achats', 'Famille', 'Autres'];   // catégories de dépenses par défaut
const bcats = () => (S.budget.cats && S.budget.cats.length ? S.budget.cats : VARCATS);
const ASSOCATS = ['Cotisations', 'Dons', 'Subventions', 'Manifestations', 'Fournitures', 'Assurance', 'Frais bancaires', 'Location', 'Autres'];
const PAYS = ['Espèces', 'Chèque', 'Virement', 'Carte', 'Prélèvement', 'Autre'];
const FAMTYPES = { rdv: 'Rendez-vous', ecole: 'École / crèche', activite: 'Activités', anniv: 'Anniversaires', doc: 'Documents importants' };
const ACT = {};   // actions déclenchées par data-act="nom" (définies dans chaque module)
const TITLES = { routines: '🔁 Routines', assistant: '🤖 Assistant' };   // vues hors menu principal
const NAV = [
  ['home', '🏠', 'Accueil'], ['agenda', '📅', 'Agenda'], ['tasks', '✅', 'Tâches'], ['prof', '🏫', 'Travail'],
  ['budget', '💰', 'Budget'], ['courses', '🛒', 'Courses'], ['repas', '🍽️', 'Repas'], ['famille', '👨‍👩‍👦', 'Famille'],
  ['asso', '🏢', 'Association'], ['projets', '📁', 'Projets'], ['notes', '📝', 'Notes'], ['settings', '⚙️', 'Paramètres']
];
const QUOTES = [
  'Une chose à la fois : le reste peut attendre.', 'Petit pas après petit pas, ça avance.', 'Ce qui est écrit n’est plus dans ta tête.',
  'Fais le plus important d’abord, le reste suivra.', 'Pas besoin d’être parfait, juste de commencer.', 'Chaque tâche cochée allège la journée.',
  'Respire : tu gères plus de choses que tu ne crois.', 'Mieux vaut fait que parfait.', 'Aujourd’hui compte, demain s’organise.',
  'Un bon plan simple vaut mieux qu’un plan parfait.', 'Tu avances, c’est l’essentiel.', 'Prends 5 minutes pour toi aussi.',
  'La régularité bat l’intensité.', 'Un dossier à la fois.'
];

const curYM = () => today().slice(0, 7);
const shiftYM = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
const ymLabel = ym => { const [y, m] = ym.split('-').map(Number); return `${cap(MONTHS[m - 1])} ${y}`; };
const weekKey = mon => mon; // les repas sont rangés par lundi de la semaine
