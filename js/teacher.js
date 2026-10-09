/* Emploi du temps */
function weekType(ds) {
  const ref = S.settings.weekRef || mondayOf(today());
  const w = Math.round(diffDays(mondayOf(ds), mondayOf(ref)) / 7);
  return w % 2 === 0 ? 'A' : 'B';
}
function slotsOn(ds) {
  const wd = dow(ds), wt = weekType(ds);
  return S.slots.filter(s => s.day === wd && (s.week === 'AB' || s.week === wt)).sort((a, b) => toMin(a.start) - toMin(b.start));
}
function courseInfo(s) {
  const c = byId(S.classes, s.classId) || {};
  return { cls: c.name || 'Classe ?', level: c.level || '', etab: c.etab || '', room: s.room || c.room || '' };
}
function courseText(s) {
  const x = courseInfo(s);
  return [fmtT(s.start), S.settings.subject || 'Technologie', x.cls, x.room && 'Salle ' + x.room, x.etab].filter(Boolean).join(' — ');
}
function upcomingCourses(n = 1) {
  const out = [], T = today(), nm = nowMin();
  for (let i = 0; i < 21 && out.length < n; i++) {
    const ds = addDays(T, i);
    for (const s of slotsOn(ds)) { if (i === 0 && toMin(s.start) <= nm) continue; out.push({ date: ds, slot: s }); if (out.length >= n) break; }
  }
  return out;
}
function currentCourse() {
  const nm = nowMin();
  return slotsOn(today()).find(s => toMin(s.start) <= nm && nm < toMin(s.end));
}
/* ===== RATTRAPAGES (heures à rattraper par classe) ===== */
const hFmt = h => (Math.round(h * 10) / 10).toString().replace('.', ',') + ' h';
function mkTotals(classId) {
  const l = S.makeups.filter(m => !classId || m.classId === classId), total = sum(l, 'hours'), done = sum(l, 'doneHours');
  return { total, done, left: Math.max(0, total - done), n: l.length };
}
const makeupLeft = m => Math.max(0, (Number(m.hours) || 0) - (Number(m.doneHours) || 0));
/** Un rattrapage devient urgent quand il reste des heures et que l'échéance est à moins de 7 jours (ou dépassée). */
const makeupUrgent = m => makeupLeft(m) > 0 && !!m.due && diffDays(m.due, today()) <= 7;
const urgentMakeups = () => S.makeups.filter(makeupUrgent);
function makeupRow(m) {
  const c = byId(S.classes, m.classId), left = makeupLeft(m), late = m.due && left > 0 && m.due < today();
  return `<div class="mini"><span data-act="editMakeup" data-id="${m.id}" style="cursor:pointer"><b>${esc(c ? c.name : '?')}</b> · ${hFmt(m.hours)} — ${left ? hFmt(left) + ' restantes' : '✔ terminé'}${m.due ? ` <small class="${late ? 'late' : 'mut'}">échéance ${fmtShort(m.due)}</small>` : ''}${m.note ? ` <small class="mut">· ${esc(m.note)}</small>` : ''}</span>
    ${left ? `<button class="btn sm" data-act="makeupDone" data-id="${m.id}">+1 h faite</button>` : ''}</div>`;
}
ACT.makeupDone = d => { const m = byId(S.makeups, d.id); m.doneHours = Math.min(Number(m.hours), (Number(m.doneHours) || 0) + 1); commit(); toast('✔ 1 h rattrapée'); };
ACT.newMakeup = d => makeupForm(null, d.classId);
ACT.editMakeup = d => makeupForm(d.id);
function makeupForm(id, classId) {
  if (!S.classes.length) { toast('Crée d’abord une classe'); return classForm(null); }
  const m = id ? byId(S.makeups, id) : null;
  openForm({
    title: m ? 'Modifier le rattrapage' : 'Heures à rattraper', values: m || { classId: classId || S.classes[0].id, hours: 1, doneHours: 0 },
    fields: [
      { k: 'classId', label: 'Classe', type: 'select', req: true, opts: S.classes.map(c => [c.id, `${c.name}${c.etab ? ' – ' + c.etab : ''}`]) },
      { k: 'hours', label: 'Heures à rattraper (total)', type: 'number', req: true, half: true }, { k: 'doneHours', label: 'Déjà rattrapées', type: 'number', half: true },
      { k: 'due', label: 'À rattraper avant le (facultatif)', type: 'date' }, { k: 'note', label: 'Motif / remarque', ph: 'ex : sortie scolaire, grève, absence…' }
    ],
    onSubmit: v => { v.hours = Number(v.hours) || 0; v.doneHours = Number(v.doneHours) || 0; if (m) Object.assign(m, v); else S.makeups.push({ id: uid(), created: today(), ...v }); commit(); },
    onDelete: m ? () => { if (confirmDel()) { removeId(S.makeups, id); closeModal(); commit(); } } : null
  });
}

/* ===== MON TRAVAIL ===== */
const SESS_ST = ['À préparer', 'Préparée', 'Réalisée', 'À rattraper'];   // statuts « actifs » ; « Archivée » se règle à part
VIEWS.prof = () => {
  const wt = weekType(today());
  let body = '';
  if (UI.prof === 'edt') {
    body = sec(`Emploi du temps <small>· semaine en cours : ${wt}</small>`, [1, 2, 3, 4, 5, 6, 7].map(d => {
      const sl = S.slots.filter(s => s.day === d).sort((a, b) => toMin(a.start) - toMin(b.start));
      if (!sl.length && d > 5) return '';
      return `<div class="dayrow"><div class="dn">${DAYS[d - 1]}</div><div class="dl">${sl.length ? sl.map(s => { const x = courseInfo(s); return `<div class="slot" data-act="editSlot" data-id="${s.id}"><b>${fmtT(s.start)}–${fmtT(s.end)}</b> ${esc(x.cls)} ${x.room ? '· Salle ' + esc(x.room) : ''} ${x.etab ? '· ' + esc(x.etab) : ''} ${s.week !== 'AB' ? `<span class="chip">Sem. ${s.week}</span>` : ''}${s.note ? ` <small class="mut">· ${esc(s.note)}</small>` : ''}</div>`; }).join('') : '<span class="mut">—</span>'}</div></div>`;
    }).join(''), `<button class="btn sm primary" data-act="newSlot">+ Cours</button>`);
  } else if (UI.prof === 'classes') {
    body = sec('Mes classes', S.classes.length ? S.classes.map(c => {
      const ss = S.sessions.filter(s => s.classId === c.id);
      return `<div class="card click" data-act="openClass" data-id="${c.id}"><div class="ct">${esc(c.name)} <small>${esc(c.level || '')}</small></div>
        <div class="mut">${[c.etab, c.size && c.size + ' élèves', c.room && 'Salle ' + c.room, c.pp && 'Prof principal'].filter(Boolean).map(esc).join(' · ')}</div>
        <div class="mut sm">Progression du programme : <b>${Math.round(c.progress || 0)} %</b></div>${bar(c.progress || 0)}<div class="mut sm">${ss.filter(s => s.status === 'Réalisée').length} séances réalisées · ${ss.filter(s => s.status === 'À rattraper').length} à rattraper${mkTotals(c.id).left ? ` · <b class="late">⏳ ${hFmt(mkTotals(c.id).total)} — ${hFmt(mkTotals(c.id).left)} restantes</b>` : ''}</div></div>`;
    }).join('') : empty('Ajoute tes classes pour construire ton emploi du temps.'), `<button class="btn sm primary" data-act="newClass">+ Classe</button>`);
  } else if (UI.prof === 'rattrapages') {
    const withMk = S.classes.filter(c => S.makeups.some(m => m.classId === c.id));
    body = sec('Heures à rattraper', (withMk.length ? withMk.map(c => { const t = mkTotals(c.id); return `<div class="card"><div class="ct">${esc(c.name)} <small>${esc(c.etab || '')}</small></div><div class="big ${t.left ? '' : 'pos'}">${hFmt(t.total)} — ${t.left ? hFmt(t.left) + ' restantes' : 'tout est rattrapé ✔'}</div>${bar(t.total ? t.done / t.total * 100 : 100)}${S.makeups.filter(m => m.classId === c.id).map(makeupRow).join('')}</div>`; }).join('') : empty('Aucune heure à rattraper 🎉')), `<button class="btn sm primary" data-act="newMakeup">+ Rattrapage</button>`);
  } else {
    const q = norm(UI.sSearch), order = ['À rattraper', 'À préparer', 'Préparée', 'Réalisée'].concat(UI.sArch ? ['Archivée'] : []);
    const l = [...S.sessions].filter(x => !q || norm([x.title, x.chapter, x.activity, x.obj, x.comp, x.material, x.homework, x.remarks].join(' ')).includes(q)).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    body = sec('Séances', `<div class="row"><button class="btn primary" data-act="prepareNext">📝 Préparer mon prochain cours</button><button class="btn" data-act="newSession">+ Séance</button></div>
      <input class="search" placeholder="🔍 Rechercher une séance…" value="${esc(UI.sSearch)}" data-set-ui="sSearch" aria-label="Rechercher une séance">
      <label class="chkrow sm"><input type="checkbox" data-act="toggleArch" ${UI.sArch ? 'checked' : ''}> Afficher les séances archivées</label>` +
      (l.length ? order.map(st => { const g = l.filter(x => (x.status || 'À préparer') === st); return g.length ? `<h3>${st} <small>(${g.length})</small></h3>${g.map(sessionCard).join('')}` : ''; }).join('') : empty('Aucune séance. Clique sur « Préparer mon prochain cours ».')));
  }
  return `<div class="card info"><div class="row"><div class="grow">${nextCourseBlock().replace('card info', 'plain')}</div></div></div>
    ${tabs(UI.prof, [['edt', '🗓 Emploi du temps'], ['classes', '👥 Classes'], ['seances', '📝 Séances'], ['rattrapages', '⏳ Rattrapages' + (urgentMakeups().length ? ' ⚠️' : '')]], 'profTab')}${body}`;
};
ACT.profTab = d => { UI.prof = d.v; render(); };
ACT.toggleArch = (d, el) => { UI.sArch = el.checked; render(); };
ACT.archSession = d => { const x = byId(S.sessions, d.id); x.status = x.status === 'Archivée' ? 'Préparée' : 'Archivée'; commit(); toast(x.status === 'Archivée' ? '📦 Séance archivée' : 'Séance désarchivée'); };
function sessionCard(s) {
  const c = byId(S.classes, s.classId);
  return `<div class="card sess"><div class="grow" data-act="editSession" data-id="${s.id}"><div class="ct">${esc(s.title || s.chapter || 'Séance')} <small>${esc(c ? c.name : '')}</small></div>
    <div class="mut">${s.date ? fmtShort(s.date) : 'Sans date'}${s.chapter ? ' · ' + esc(s.chapter) : ''}${s.activity ? ' · ' + esc(s.activity) : ''}</div></div>
    <div class="ta"><button class="ib" data-act="sessNext" data-id="${s.id}" title="Changer le statut" aria-label="Changer le statut">⟳</button><button class="ib" data-act="dupSession" data-id="${s.id}" title="Dupliquer" aria-label="Dupliquer">⧉</button><button class="ib" data-act="archSession" data-id="${s.id}" title="Archiver" aria-label="Archiver">📦</button></div></div>`;
}
ACT.sessNext = d => { const s = byId(S.sessions, d.id); s.status = SESS_ST[(SESS_ST.indexOf(s.status || 'À préparer') + 1) % SESS_ST.length]; save(); render(); MODALR && MODALR(); toast('Statut : ' + s.status); };
ACT.dupSession = d => { const s = byId(S.sessions, d.id); const n = { ...s, id: uid(), title: (s.title || 'Séance') + ' (copie)', status: 'À préparer', date: '', demo: false }; S.sessions.push(n); commit(); toast('⧉ Séance dupliquée', { label: 'Modifier', fn: () => sessionForm(n.id) }); };
ACT.newSession = () => sessionForm(null);
ACT.editSession = d => sessionForm(d.id);
function sessionForm(id, pre = {}) {
  if (!S.classes.length) { toast('Crée d’abord une classe'); return classForm(null); }
  const s = id ? byId(S.sessions, id) : null;
  openForm({
    title: s ? 'Modifier la séance' : 'Préparer une séance', values: s || { dur: 55, status: 'À préparer', date: today(), ...pre },
    top: pre.hint ? `<div class="hint">${pre.hint}</div>` : '',
    fields: [
      { k: 'classId', label: 'Classe', type: 'select', req: true, opts: S.classes.map(c => [c.id, `${c.name}${c.etab ? ' – ' + c.etab : ''}`]), half: true },
      { k: 'date', label: 'Date', type: 'date', half: true },
      { k: 'chapter', label: 'Chapitre / séquence' }, { k: 'title', label: 'Séance', req: true, half: true },
      { k: 'dur', label: 'Durée (min)', type: 'number', half: true },
      { k: 'obj', label: 'Objectifs', type: 'textarea', rows: 2 }, { k: 'comp', label: 'Compétences', type: 'textarea', rows: 2 },
      { k: 'activity', label: 'Activité' }, { k: 'material', label: 'Matériel' }, { k: 'homework', label: 'Devoirs' },
      { k: 'remarks', label: 'Remarques', type: 'textarea', rows: 2 },
      { k: 'status', label: 'Statut', type: 'select', opts: SESS_ST.concat(['Archivée']) }
    ],
    onSubmit: v => { v.dur = Number(v.dur) || 0; if (s) Object.assign(s, v); else S.sessions.push({ id: uid(), ...v }); commit(); MODALR && MODALR(); },
    onDelete: s ? () => { if (confirmDel()) { removeId(S.sessions, id); closeModal(); commit(); } } : null
  });
}
function prepareCourse(u) {
  const ex = S.sessions.find(s => s.classId === u.slot.classId && s.date === u.date);
  if (ex) return sessionForm(ex.id);
  const last = S.sessions.filter(s => s.classId === u.slot.classId && s.date && s.date < u.date).sort((a, b) => b.date.localeCompare(a.date))[0];
  const c = byId(S.classes, u.slot.classId);
  sessionForm(null, {
    classId: u.slot.classId, date: u.date, dur: toMin(u.slot.end) - toMin(u.slot.start), chapter: last ? last.chapter : '',
    hint: `Prochain cours : <b>${esc(c ? c.name : '')}</b> · ${relDay(u.date)} ${fmtT(u.slot.start)}${last ? `<br>Dernière séance : ${esc(last.title || '')} (${esc(last.status || '')})` : ''}`
  });
}
ACT.prepareNext = () => {
  const u = upcomingCourses(1)[0];
  if (!u) { closeModal(); toast('Saisis d’abord ton emploi du temps'); UI.prof = 'edt'; return go('prof'); }
  prepareCourse(u);
};
ACT.newSlot = () => slotForm(null);
ACT.editSlot = d => slotForm(d.id);
function slotForm(id) {
  if (!S.classes.length) { toast('Crée d’abord une classe'); return classForm(null); }
  const s = id ? byId(S.slots, id) : null;
  openForm({
    title: s ? 'Modifier le cours' : 'Nouveau cours', values: s || { day: 1, start: '08:00', end: '09:00', week: 'AB' },
    fields: [
      { k: 'day', label: 'Jour', type: 'select', half: true, opts: DAYS.map((d, i) => [i + 1, d]) },
      { k: 'week', label: 'Semaine', type: 'select', half: true, opts: [['AB', 'Toutes les semaines'], ['A', 'Semaine A'], ['B', 'Semaine B']] },
      { k: 'start', label: 'Début', type: 'time', req: true, half: true }, { k: 'end', label: 'Fin', type: 'time', req: true, half: true },
      { k: 'classId', label: 'Classe', type: 'select', opts: S.classes.map(c => [c.id, `${c.name}${c.etab ? ' – ' + c.etab : ''}`]) },
      { k: 'room', label: 'Salle (si différente de la classe)' }, { k: 'note', label: 'Remarques', ph: 'ex : séance double, salle informatique…' }
    ],
    onSubmit: v => { v.day = +v.day; if (s) Object.assign(s, v); else S.slots.push({ id: uid(), ...v }); commit(); },
    onDelete: s ? () => { if (confirmDel()) { removeId(S.slots, id); closeModal(); commit(); } } : null
  });
}
ACT.newClass = () => classForm(null);
function classForm(id) {
  const c = id ? byId(S.classes, id) : null;
  openForm({
    title: c ? 'Modifier la classe' : 'Nouvelle classe', values: c || { level: '6e' },
    fields: [
      { k: 'name', label: 'Nom (ex : 5e B)', req: true, half: true }, { k: 'level', label: 'Niveau', type: 'select', half: true, opts: ['6e', '5e', '4e', '3e', 'Autre'] },
      { k: 'etab', label: 'Établissement', list: S.settings.etabs }, { k: 'size', label: 'Effectif', type: 'number', half: true }, { k: 'room', label: 'Salle', half: true },
      { k: 'pp', label: 'Je suis professeur principal', type: 'checkbox' },
      { k: 'progress', label: 'Progression du programme (%)', type: 'number' },
      { k: 'notes', label: 'Notes personnelles', type: 'textarea' }, { k: 'remarks', label: 'Remarques', type: 'textarea', rows: 2 }
    ],
    onSubmit: v => {
      v.size = v.size === '' ? '' : Number(v.size); v.progress = Number(v.progress) || 0;
      if (v.etab && !S.settings.etabs.includes(v.etab)) S.settings.etabs.push(v.etab);
      if (c) Object.assign(c, v); else S.classes.push({ id: uid(), ...v }); commit(); MODALR && MODALR();
    },
    onDelete: c ? () => { if (confirmDel('Supprimer la classe, ses cours et ses séances ?')) { removeId(S.classes, id); S.slots = S.slots.filter(s => s.classId !== id); S.sessions = S.sessions.filter(s => s.classId !== id); S.evals = S.evals.filter(s => s.classId !== id); S.makeups = S.makeups.filter(s => s.classId !== id); closeModal(); commit(); } } : null
  });
}
ACT.openClass = d => liveModal(() => {
  const c = byId(S.classes, d.id); if (!c) return '<p>Classe supprimée.</p>';
  const ss = S.sessions.filter(s => s.classId === c.id).sort((a, b) => (b.date || '').localeCompare(a.date || '')), ev = S.evals.filter(e => e.classId === c.id).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const cnt = st => ss.filter(s => s.status === st).length;
  return `<h2>${esc(c.name)} <small>${esc(c.level || '')}</small></h2><div class="mut">${[c.etab, c.size && c.size + ' élèves', c.room && 'Salle ' + c.room, c.pp && 'Prof principal'].filter(Boolean).map(esc).join(' · ')}</div>
  ${c.notes ? `<div class="note">${esc(c.notes)}</div>` : ''}${c.remarks ? `<div class="note">${esc(c.remarks)}</div>` : ''}
  <div class="lbl">Progression du programme : ${Math.round(c.progress || 0)} %</div>${bar(c.progress || 0)}<input type="range" min="0" max="100" value="${c.progress || 0}" data-range="class" data-id="${c.id}">
  <div class="tiles sm">${tile('Réalisées', cnt('Réalisée'))}${tile('À rattraper', cnt('À rattraper'))}${tile('Préparées', cnt('Préparée') + cnt('À préparer'))}</div>
  <h3>⏳ Rattrapages <button class="link" data-act="newMakeup" data-class-id="${c.id}">+ ajouter</button></h3>${S.makeups.filter(m => m.classId === c.id).map(makeupRow).join('') || empty('Aucune heure à rattraper.')}
  ${ss.some(x => x.homework) ? `<h3>📚 Devoirs récents</h3>${ss.filter(x => x.homework).slice(0, 3).map(x => `<div class="mini"><span><b>${x.date ? fmtShort(x.date) : ''}</b> ${esc(x.homework)}</span></div>`).join('')}` : ''}
  <h3>Séances <button class="link" data-act="newSessionFor" data-id="${c.id}">+ ajouter</button></h3>
  ${ss.length ? ss.slice(0, 15).map(sessionCard).join('') : empty('Aucune séance.')}
  <h3>Évaluations <button class="link" data-act="newEval" data-id="${c.id}">+ ajouter</button></h3>
  ${ev.length ? ev.map(e => `<div class="mini" data-act="editEval" data-id="${e.id}"><span><b>${esc(e.title)}</b> <small>${e.date ? fmtShort(e.date) : ''}</small> ${e.note ? '— ' + esc(e.note) : ''}</span></div>`).join('') : empty('Aucune évaluation.')}
  <div class="mact"><button class="btn" data-act="editClass" data-id="${c.id}">✏️ Modifier</button><span class="sp"></span><button class="btn primary" data-act="closeModal">Fermer</button></div>`;
});
ACT.editClass = d => classForm(d.id);
ACT.newSessionFor = d => sessionForm(null, { classId: d.id });
ACT.newEval = d => evalForm(null, d.id);
ACT.editEval = d => evalForm(d.id);
function evalForm(id, classId) {
  const e = id ? byId(S.evals, id) : null;
  openForm({
    title: e ? 'Modifier l’évaluation' : 'Nouvelle évaluation', values: e || { date: today() },
    fields: [{ k: 'title', label: 'Évaluation', req: true }, { k: 'date', label: 'Date', type: 'date' }, { k: 'note', label: 'Remarque / résultat', type: 'textarea', rows: 2 }],
    onSubmit: v => { if (e) Object.assign(e, v); else S.evals.push({ id: uid(), classId, ...v }); commit(); MODALR && MODALR(); },
    onDelete: e ? () => { removeId(S.evals, id); closeModal(); commit(); } : null
  });
}

