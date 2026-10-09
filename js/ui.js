'use strict';
/* =====================================================================
   ui.js — interface : état de l'écran, modales, formulaires génériques,
   navigation, rendu et gestion des clics (data-act="nomDeLAction").
   ===================================================================== */
const UI = {
  view: 'home', homeTab: 'day', cal: { mode: 'month', date: today() }, prof: 'edt', bTab: 'apercu', bm: curYM(), mw: mondayOf(today()),
  aTab: 'fin', am: curYM(), pTab: 'projet', tFilter: 'Toutes', tDone: false, nFilter: '', nKind: 'tous', sSearch: '', sArch: false, minutes: 15, chat: []
};
const VIEWS = {};
let FORM = null, MODALR = null, LIVE = null, PARENT = null;

/* ---------- Petits composants HTML ---------- */
const sec = (title, body, right = '') => `<section class="blk"><div class="bh"><h2>${title}</h2>${right}</div>${body}</section>`;
const empty = t => `<div class="empty">${t}</div>`;
const chip = t => `<span class="chip">${esc(t)}</span>`;
const bar = (pc, cls = '') => `<div class="bar ${cls}" role="progressbar" aria-valuenow="${Math.round(pc)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${Math.max(0, Math.min(100, pc))}%"></i><span>${Math.round(pc)} %</span></div>`;
const tile = (label, val, sub = '', act = '') => `<div class="tile" ${act ? `data-act="${act}" role="button" tabindex="0"` : ''}><div class="tv">${val}</div><div class="tl">${label}</div>${sub ? `<div class="ts">${sub}</div>` : ''}</div>`;
const tabs = (cur, list, act) => `<div class="seg tabs" role="tablist">${list.map(([k, l]) => `<button role="tab" aria-selected="${cur === k}" class="${cur === k ? 'on' : ''}" data-act="${act}" data-v="${k}">${l}</button>`).join('')}</div>`;

/* ---------- Notifications à l'écran (toasts) ---------- */
function toast(msg, act) {
  const el = document.createElement('div'); el.className = 'toast';
  el.innerHTML = `<span>${esc(msg)}</span>`;
  if (act) { const b = document.createElement('button'); b.textContent = act.label; b.onclick = () => { act.fn(); el.remove(); }; el.appendChild(b); }
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), act ? 6500 : 3000);
}

/* ---------- Modales ----------
   openModal   : fenêtre simple
   liveModal   : fenêtre « vivante » qui se redessine après chaque action
   openForm    : formulaire ; à la fermeture, rouvre la fenêtre vivante qui l'a ouvert */
function openModal(html, cls = '') {
  MODALR = null; LIVE = null; PARENT = null;
  $('#modal-root').innerHTML = `<div class="overlay" data-act="overlay"><div class="modal ${cls}" role="dialog" aria-modal="true" tabindex="-1">${html}</div></div>`;
  document.body.classList.add('noscroll');
  const m = $('.modal'); if (m) m.focus({ preventScroll: true });
}
function closeModal() { $('#modal-root').innerHTML = ''; document.body.classList.remove('noscroll'); FORM = null; MODALR = null; LIVE = null; PARENT = null; }
function restoreParent() { if (PARENT) { const p = PARENT; PARENT = null; liveModal(p.fn, p.cls); } }
function cancelModal() { const p = PARENT; closeModal(); PARENT = p; restoreParent(); }
function liveModal(fn, cls = '') {
  const par = LIVE; openModal(fn(), cls); if (par) PARENT = par; LIVE = { fn, cls };
  MODALR = () => { const m = $('.modal'); if (!m) return; const sc = m.scrollTop; m.innerHTML = fn(); m.scrollTop = sc; };
}

function fieldHtml(f, v) {
  const val = v[f.k] ?? f.def ?? '', id = 'f_' + f.k, req = f.req ? 'required' : '';
  if (f.type === 'checkbox') return `<label class="chkrow"><input type="checkbox" name="${f.k}" ${val ? 'checked' : ''}> ${esc(f.label)}</label>`;
  let inp;
  if (f.type === 'select') inp = `<select name="${f.k}" id="${id}" ${req}>${(f.opts || []).map(o => { const [ov, ol] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(ov)}" ${String(ov) === String(val) ? 'selected' : ''}>${esc(ol)}</option>`; }).join('')}</select>`;
  else if (f.type === 'textarea') inp = `<textarea name="${f.k}" id="${id}" rows="${f.rows || 3}" placeholder="${esc(f.ph || '')}" ${req}>${esc(val)}</textarea>`;
  else inp = `<input name="${f.k}" id="${id}" type="${f.type || 'text'}" ${f.type === 'number' ? 'step="any" inputmode="decimal"' : ''} value="${esc(val)}" placeholder="${esc(f.ph || '')}" ${req} ${f.list ? `list="dl_${f.k}"` : ''}>${f.list ? `<datalist id="dl_${f.k}">${f.list.map(x => `<option value="${esc(x)}">`).join('')}</datalist>` : ''}`;
  return `<div class="fld ${f.half ? 'half' : ''}"><label for="${id}">${esc(f.label)}</label>${inp}</div>`;
}
/** Formulaire générique : {title, fields:[{k,label,type,opts,req,half,list}], values, onSubmit(data), onDelete()} */
function openForm(o) {
  const par = LIVE, v = o.values || {};
  openModal(`<form id="mform"><h2>${esc(o.title)}</h2>${o.top || ''}<div class="grid">${o.fields.map(f => fieldHtml(f, v)).join('')}</div>${o.extra || ''}
    <div class="mact">${o.onDelete ? '<button type="button" class="btn danger" data-act="formDelete">Supprimer</button>' : ''}<span class="sp"></span>
    <button type="button" class="btn" data-act="closeModal">Annuler</button><button class="btn primary">${esc(o.submit || 'Enregistrer')}</button></div></form>`);
  FORM = o; PARENT = par;
  const first = $('#mform .fld input, #mform .fld textarea');
  if (first && ['text', 'search', 'number', ''].includes(first.getAttribute('type') || '') && window.innerWidth > 700) setTimeout(() => first.focus(), 50);
}
document.addEventListener('submit', e => {
  const f = e.target;
  if (f.id === 'mform' && FORM) {
    e.preventDefault();
    const fd = new FormData(f), data = {};
    FORM.fields.forEach(x => {
      if (x.type === 'checkbox') data[x.k] = fd.has(x.k);
      else { let v = fd.get(x.k); if (x.type === 'number') v = v === '' ? '' : Number(String(v).replace(',', '.')); data[x.k] = v; }
    });
    const fn = FORM.onSubmit, p = PARENT; closeModal(); PARENT = p; restoreParent(); fn(data);
  } else if (f.dataset.quick !== undefined) {
    e.preventDefault(); ACT.quickAdd(f, e.submitter);
  } else if (f.dataset.form) {
    e.preventDefault(); const h = ACT[f.dataset.form]; h && h(f, new FormData(f));
  }
});
ACT.formDelete = () => { FORM && FORM.onDelete && FORM.onDelete(); };
ACT.closeModal = () => cancelModal();
ACT.overlay = (d, el, e) => { if (e.target === el) cancelModal(); };

/* ---------- Utilitaires ---------- */
function commit() { save(); render(); }
function confirmDel(msg) { return window.confirm(msg || 'Supprimer définitivement ?'); }
function downloadFile(name, text, mime = 'text/plain') {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: mime + ';charset=utf-8' }));
  a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
const csvCell = v => { v = String(v ?? ''); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
const toCSV = rows => '﻿' + rows.map(r => r.map(csvCell).join(';')).join('\r\n');

/* ---------- Menus ---------- */
ACT.goView = d => go(d.v);
ACT.more = () => openModal(`<h2>Menu</h2><div class="grid-menu">${NAV.slice(3).map(([k, i, l]) => `<button data-act="goView" data-v="${k}"><span>${i}</span>${l}</button>`).join('')}
  <button data-act="goView" data-v="routines"><span>🔁</span>Routines</button><button data-act="goView" data-v="assistant"><span>🤖</span>Assistant</button></div>`);
/** Bouton ➕ : création rapide */
ACT.plus = () => openModal(`<h2>➕ Créer</h2><div class="grid-menu">
  <button data-act="quickNote"><span>📥</span>Capture rapide</button><button data-act="newTask"><span>✅</span>Tâche</button>
  <button data-act="newEvent"><span>📅</span>Événement</button><button data-act="newNote"><span>📝</span>Note</button>
  <button data-act="newExpense"><span>💶</span>Dépense</button><button data-act="newShop"><span>🛒</span>Course</button></div>`);

/* ---------- Thème, navigation, rendu ---------- */
function applyTheme() {
  const s = S.settings, r = document.documentElement;
  r.dataset.theme = s.theme; r.style.setProperty('--c', s.color);
  const m = $('meta[name=theme-color]'); if (m) m.content = s.color;
}
function buildNav() {
  $('#side').innerHTML = `<div class="logo">🧭 <span>Centre de commande</span></div>` + NAV.map(([k, i, l]) => `<button data-nav="${k}" data-act="goView" data-v="${k}"><span class="ni" aria-hidden="true">${i}</span><span>${l}</span><em class="badge" data-badge="${k}"></em></button>`).join('')
    + `<div class="sep"></div><button data-nav="routines" data-act="goView" data-v="routines"><span class="ni" aria-hidden="true">🔁</span><span>Routines</span></button><button data-nav="assistant" data-act="goView" data-v="assistant"><span class="ni" aria-hidden="true">🤖</span><span>Assistant</span></button>`;
  const b = k => { const n = NAV.find(x => x[0] === k); return `<button data-nav="${k}" data-act="goView" data-v="${k}"><span class="ni" aria-hidden="true">${n[1]}</span><span>${n[2]}</span></button>`; };
  $('#bottom').innerHTML = b('home') + b('agenda') + b('tasks') +
    `<button class="plusb" data-act="plus" aria-label="Créer"><span class="plusi">➕</span></button>` +
    `<button data-nav="more" data-act="more"><span class="ni" aria-hidden="true">☰</span><span>Menu</span><em class="badge" data-badge="notes"></em></button>`;
}
function updateBadges() {
  const inbox = S.notes.filter(n => n.kind === 'inbox').length;
  $$('[data-badge=notes]').forEach(b => { b.textContent = inbox || ''; b.style.display = inbox ? '' : 'none'; });
  $$('[data-badge]:not([data-badge=notes])').forEach(b => b.style.display = 'none');
  const un = S.notifs.filter(x => !x.read).length, bb = $('#bellBadge'); bb.textContent = un || ''; bb.style.display = un ? '' : 'none';
}
function render() {
  const v = UI.view, nav = NAV.find(n => n[0] === v);
  $('#title').textContent = v === 'home' ? (UI.homeTab === 'dash' ? 'Tableau de bord' : 'Centre de commande') : (TITLES[v] || nav[2]);
  $('#main').innerHTML = VIEWS[v]();
  $$('[data-nav]').forEach(b => b.classList.toggle('on', b.dataset.nav === v));
  updateBadges();
  if (v === 'home') loadWeather();
  MODALR && MODALR();
}
function go(view) {
  if (!VIEWS[view]) view = 'home';
  if (view === 'home') UI.homeTab = 'day';
  UI.view = view; try { history.replaceState(null, '', '#' + view); } catch (e) { }
  closeModal(); render(); window.scrollTo(0, 0);
}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const fn = ACT[el.dataset.act]; if (fn) fn(el.dataset, el, e);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('.overlay')) cancelModal();
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ACT.openSearch(); }
  // accessibilité clavier : Entrée/Espace activent les cartes cliquables
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[role=button][data-act]')) { e.preventDefault(); e.target.click(); }
});
