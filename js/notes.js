'use strict';
/* =====================================================================
   notes.js — notes, idées, listes, informations + boîte de réception « À trier »
   ===================================================================== */
const NKINDS = { note: '📝 Note', idea: '💡 Idée', list: '📋 Liste', info: 'ℹ️ Info importante' };

VIEWS.notes = () => {
  const inbox = S.notes.filter(n => n.kind === 'inbox'), notes = S.notes.filter(n => n.kind !== 'inbox').sort((a, b) => b.created.localeCompare(a.created));
  const q = norm(UI.nFilter), list = notes.filter(n => (UI.nKind === 'tous' || n.kind === UI.nKind) && (!q || norm(n.text).includes(q)));
  return `<div class="row"><button class="btn primary grow" data-act="quickNote">📥 Capture rapide</button><button class="btn" data-act="newNote">+ Note</button></div>
  ${sec(`📥 À trier <small>(${inbox.length})</small>`, (inbox.length ? `<button class="btn wide" data-act="sortInbox">⚡ Trier ma boîte, un élément à la fois</button>` : '') + (inbox.length ? inbox.map(inboxCard).join('') : empty('Boîte vide : esprit libre ✨')))}
  ${sec('Notes, idées, listes', `<div class="chips"><button class="fchip ${UI.nKind === 'tous' ? 'on' : ''}" data-act="nKind" data-v="tous">Tout</button>${Object.entries(NKINDS).map(([k, l]) => `<button class="fchip ${UI.nKind === k ? 'on' : ''}" data-act="nKind" data-v="${k}">${l}</button>`).join('')}</div>
    <input class="search" placeholder="🔍 Filtrer…" value="${esc(UI.nFilter)}" data-set-ui="nFilter" aria-label="Filtrer les notes">` +
    (list.length ? list.map(n => `<div class="card note-i click" data-act="editNote" data-id="${n.id}"><span class="chip">${NKINDS[n.kind] || '📝 Note'}</span> <small class="mut">${fmtShort(n.created)}</small><div class="itxt">${esc(n.text)}</div></div>`).join('') : empty('Aucune note.')))}`;
};
ACT.nKind = d => { UI.nKind = d.v; render(); };
/** Les 6 façons de traiter un élément de la boîte de réception */
function inboxActions(n) {
  return `<div class="chips"><button class="fchip" data-act="inTask" data-id="${n.id}">✅ Tâche</button><button class="fchip" data-act="inEvent" data-id="${n.id}">📅 Événement</button><button class="fchip" data-act="inReminder" data-id="${n.id}">🔔 Rappel</button><button class="fchip" data-act="inShop" data-id="${n.id}">🛒 Course</button><button class="fchip" data-act="inProject" data-id="${n.id}">📁 Projet</button><button class="fchip" data-act="inNote" data-id="${n.id}">📝 Note</button><button class="fchip" data-act="inArchive" data-id="${n.id}">🗄 Archiver</button></div>`;
}
const inboxCard = n => `<div class="card inb"><div class="itxt">${esc(n.text)}</div>${inboxActions(n)}</div>`;
/** « Trier ma boîte » : un élément à la fois, en grand */
ACT.sortInbox = () => liveModal(() => {
  const l = S.notes.filter(n => n.kind === 'inbox');
  if (!l.length) return `<h2>📥 Trier ma boîte</h2>${empty('Boîte vide : bravo ✨')}<div class="mact"><span class="sp"></span><button class="btn primary" data-act="closeModal">Fermer</button></div>`;
  const n = l[0];
  return `<h2>📥 Trier ma boîte <small>(${l.length} restant${l.length > 1 ? 's' : ''})</small></h2><div class="card info"><div class="big itxt">${esc(n.text)}</div></div>
    <p class="mut sm">Qu’est-ce que c’est ?</p>${inboxActions(n)}<div class="mact"><button class="btn" data-act="inSkip" data-id="${n.id}">Passer</button><span class="sp"></span><button class="btn primary" data-act="closeModal">Terminer</button></div>`;
});
ACT.inSkip = d => { const n = byId(S.notes, d.id); n.created = today(); S.notes.push(S.notes.splice(S.notes.indexOf(n), 1)[0]); save(); render(); };
ACT.quickNote = () => {
  openModal(`<form id="qn"><h2>📥 Capture rapide</h2><textarea id="qnText" rows="4" placeholder="Écris tout ce qui te passe par la tête… (Ctrl+Entrée pour enregistrer)" aria-label="Capture rapide"></textarea><div class="mact"><span class="sp"></span><button type="button" class="btn" data-act="closeModal">Annuler</button><button class="btn primary">Dans « À trier »</button></div></form>`);
  setTimeout(() => $('#qnText') && $('#qnText').focus(), 60);
  $('#qn').onsubmit = e => { e.preventDefault(); const v = $('#qnText').value.trim(); if (!v) return; v.split(/\n{2,}/).forEach(x => S.notes.push({ id: uid(), kind: 'inbox', text: x.trim(), created: today() })); closeModal(); commit(); toast('📥 Capturé dans « À trier »'); };
  $('#qnText').onkeydown = e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') $('#qn').requestSubmit(); };
};
ACT.newNote = () => openForm({
  title: 'Nouvelle note', values: { kind: 'note' },
  fields: [{ k: 'kind', label: 'Type', type: 'select', opts: Object.entries(NKINDS) }, { k: 'text', label: 'Texte', type: 'textarea', rows: 6, req: true }],
  onSubmit: v => { S.notes.push({ id: uid(), created: today(), ...v }); commit(); toast('📝 Note enregistrée'); }
});
const takeNote = id => byId(S.notes, id);
ACT.inTask = d => { const n = takeNote(d.id), p = parseQuick(n.text); addTask({ title: p.title, due: p.due, prio: p.prio, dur: p.dur, cat: p.cat || 'Personnel' }); removeId(S.notes, d.id); commit(); toast('✅ Transformée en tâche' + (p.due ? ' · ' + dueLabel(p.due) : '')); };
ACT.inShop = d => { const n = takeNote(d.id); n.text.replace(/^(penser à |ne pas oublier de |il faut )?(acheter|prendre)\s+/i, '').split(/[,;]+| et /).forEach(x => addShop(x)); removeId(S.notes, d.id); commit(); toast('🛒 Ajouté aux courses'); };
/** Ouvre un formulaire d'événement ; la note n'est supprimée qu'une fois l'événement enregistré. */
function noteToEvent(id, pre) {
  const n = takeNote(id), p = parseQuick(n.text);
  eventForm(null, { title: p.title, date: p.due || today(), ...pre });
  const o = FORM.onSubmit; FORM.onSubmit = v => { o(v); removeId(S.notes, id); commit(); };
}
ACT.inEvent = d => noteToEvent(d.id, {});
ACT.inReminder = d => noteToEvent(d.id, { time: '09:00', dur: 0, remind: 60, cat: 'perso' });
ACT.inProject = d => {
  const n = takeNote(d.id);
  openForm({
    title: 'Ajouter au projet', values: { pid: '' }, fields: [{ k: 'pid', label: 'Projet (la note devient une étape)', type: 'select', opts: [['', '+ Nouveau projet « ' + n.text.slice(0, 30) + ' »'], ...S.projects.filter(p => p.kind === 'project').map(p => [p.id, p.title])] }],
    onSubmit: v => { if (v.pid) byId(S.projects, v.pid).steps.push({ t: n.text, done: false }); else S.projects.push({ id: uid(), kind: 'project', title: n.text, steps: [], goal: '', due: '', notes: '' }); removeId(S.notes, d.id); commit(); toast('📁 Ajouté'); }
  });
};
ACT.inNote = d => { takeNote(d.id).kind = 'note'; commit(); toast('📝 Classée dans les notes'); };
ACT.inArchive = d => { removeId(S.notes, d.id); commit(); toast('🗄 Archivée'); };
ACT.editNote = d => {
  const n = byId(S.notes, d.id);
  openForm({ title: 'Note', values: n, fields: [{ k: 'text', label: 'Texte', type: 'textarea', rows: 6, req: true }, { k: 'kind', label: 'Type', type: 'select', opts: [...Object.entries(NKINDS), ['inbox', '📥 À trier']] }], onSubmit: v => { Object.assign(n, v); commit(); }, onDelete: () => { removeId(S.notes, d.id); closeModal(); commit(); } });
};
