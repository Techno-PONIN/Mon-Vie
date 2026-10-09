/* ===== Tâches : carte + actions ===== */
function taskCard(t) {
  const late = t.due && !t.done && t.due < today();
  return `<div class="task p-${t.prio} ${t.done ? 'done' : ''}">
    <button class="chk" data-act="toggleTask" data-id="${t.id}" aria-label="Terminer">${t.done ? '✔' : ''}</button>
    <div class="tb" data-act="editTask" data-id="${t.id}">
      <div class="tt">${PRIO[t.prio].i} ${esc(t.title)}</div>
      <div class="tm">${chip(t.cat)}${t.status === 'doing' ? '<span class="chip st-doing">▶ En cours</span>' : ''}${t.status === 'wait' ? `<span class="chip st-wait">⏸ En attente${t.delegatedTo ? ' · 👤 ' + esc(t.delegatedTo) : ''}</span>` : ''}${t.due ? `<span class="${late ? 'late' : ''}">${dueLabel(t.due)}</span>` : ''}${t.dur ? `<span>⏱ ${t.dur} min</span>` : ''}</div>
    </div>
    <div class="ta">${t.done ? '' : `<button class="ib" data-act="postponeTask" data-id="${t.id}" title="Reporter à demain">⏭</button>`}<button class="ib" data-act="taskOptions" data-id="${t.id}" title="Options">⋯</button></div>
  </div>`;
}
function addTask(o) {
  const t = { id: uid(), title: o.title, cat: o.cat || 'Personnel', prio: o.prio || 'normal', status: o.status || 'todo', due: o.due || '', dur: o.dur || 0, done: false, created: today(), projectId: o.projectId || null };
  S.tasks.push(t); return t;
}
ACT.toggleTask = d => {
  const t = byId(S.tasks, d.id); if (!t) return;
  t.done = !t.done; t.doneDate = t.done ? today() : null;
  commit();
  if (t.done) toast('✔ Tâche terminée', { label: 'Annuler', fn: () => { t.done = false; t.doneDate = null; commit(); } });
};
ACT.postponeTask = d => { const t = byId(S.tasks, d.id); if (!t) return; t.due = addDays(today(), 1); commit(); toast('⏭ Reportée à demain'); };
ACT.editTask = d => taskForm(d.id);
ACT.taskOptions = d => {
  const t = byId(S.tasks, d.id); if (!t) return;
  liveModal(() => {
    const t2 = byId(S.tasks, d.id); if (!t2) return '';
    return `<h2>${esc(t2.title)}</h2>
    <div class="lbl">Priorité</div><div class="seg">${Object.entries(PRIO).map(([k, v]) => `<button class="${t2.prio === k ? 'on' : ''}" data-act="setPrio" data-id="${t2.id}" data-v="${k}">${v.i} ${v.l}</button>`).join('')}</div>
    <div class="lbl">Date</div><div class="seg">
      <button data-act="setDue" data-id="${t2.id}" data-v="${today()}">Aujourd’hui</button>
      <button data-act="setDue" data-id="${t2.id}" data-v="${addDays(today(), 1)}">Demain</button>
      <button data-act="setDue" data-id="${t2.id}" data-v="${addDays(mondayOf(today()), 7)}">Lundi prochain</button>
      <button data-act="setDue" data-id="${t2.id}" data-v="">Sans date</button></div>
    <div class="row"><input type="date" id="optDate" value="${t2.due || ''}"><button class="btn" data-act="setDueInput" data-id="${t2.id}">Programmer</button></div>
    <div class="lbl">Statut</div><div class="seg">${[['todo', 'À faire'], ['doing', '▶ En cours'], ['wait', '⏸ En attente']].map(([k, l]) => `<button class="${(t2.status || 'todo') === k ? 'on' : ''}" data-act="setStatus" data-id="${t2.id}" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="lbl">Autres actions</div><div class="seg"><button data-act="delegateTask" data-id="${t2.id}">👤 Déléguer</button><button data-act="taskToReminder" data-id="${t2.id}">🔔 Transformer en rappel</button><button data-act="editTaskClose" data-id="${t2.id}">✏️ Modifier</button></div>
    <div class="mact"><button class="btn danger" data-act="delTask" data-id="${t2.id}">🗑 Supprimer</button><span class="sp"></span><button class="btn primary" data-act="closeModal">OK</button></div>`;
  });
};
ACT.setStatus = d => { byId(S.tasks, d.id).status = d.v; save(); render(); };
/** Déléguer : la tâche passe « en attente » avec le nom de la personne. */
ACT.delegateTask = d => {
  const t = byId(S.tasks, d.id);
  openForm({
    title: 'Déléguer la tâche', values: { who: t.delegatedTo || '' }, fields: [{ k: 'who', label: 'À qui ? (nom)', req: true }],
    onSubmit: v => { t.delegatedTo = v.who.trim(); t.status = 'wait'; commit(); toast('👤 Déléguée à ' + t.delegatedTo); }
  });
};
/** Transformer en rappel : la tâche devient un événement avec alerte, puis disparaît de la liste. */
ACT.taskToReminder = d => {
  const t = byId(S.tasks, d.id); closeModal();
  eventForm(null, { title: t.title, date: t.due || addDays(today(), 1), time: '09:00', dur: 0, remind: 60, cat: 'perso' });
  const o = FORM.onSubmit; FORM.onSubmit = v => { o(v); removeId(S.tasks, d.id); commit(); };
};
ACT.setPrio = d => { byId(S.tasks, d.id).prio = d.v; save(); render(); };
ACT.setDue = d => { byId(S.tasks, d.id).due = d.v; save(); render(); };
ACT.setDueInput = d => { byId(S.tasks, d.id).due = $('#optDate').value; save(); render(); toast('📅 Date programmée'); };
ACT.delTask = d => {
  const i = S.tasks.findIndex(x => x.id === d.id); if (i < 0) return;
  const [t] = S.tasks.splice(i, 1); closeModal(); commit();
  toast('🗑 Tâche supprimée', { label: 'Annuler', fn: () => { S.tasks.push(t); commit(); } });
};
function taskForm(id, pre = {}) {
  const t = id ? byId(S.tasks, id) : null;
  openForm({
    title: t ? 'Modifier la tâche' : 'Nouvelle tâche',
    values: t || { cat: UI.tFilter !== 'Toutes' ? UI.tFilter : 'Personnel', prio: 'normal', status: 'todo', ...pre },
    fields: [
      { k: 'title', label: 'Tâche', req: true },
      { k: 'prio', label: 'Priorité (urgence + importance)', type: 'select', half: true, opts: Object.entries(PRIO).map(([k, v]) => [k, v.i + ' ' + v.l]) },
      { k: 'status', label: 'Statut', type: 'select', half: true, opts: [['todo', 'À faire'], ['doing', '▶ En cours'], ['wait', '⏸ En attente']] },
      { k: 'cat', label: 'Catégorie', type: 'select', half: true, opts: S.settings.cats },
      { k: 'due', label: 'Échéance', type: 'date', half: true },
      { k: 'dur', label: 'Durée estimée', type: 'select', half: true, opts: [[0, 'Non estimée'], [5, '5 min'], [10, '10 min'], [15, '15 min'], [30, '30 min'], [60, '1 h'], [120, '2 h']] },
      { k: 'projectId', label: 'Projet lié', type: 'select', opts: [['', '— aucun —'], ...S.projects.filter(p => p.kind === 'project').map(p => [p.id, p.title])] }
    ],
    onSubmit: v => {
      v.dur = Number(v.dur) || 0; v.projectId = v.projectId || null;
      if (t) Object.assign(t, v); else addTask(v);
      commit();
    },
    onDelete: t ? () => ACT.delTask({ id }) : null
  });
}
/** Ajout rapide en langage naturel.
    • bouton « 📥 Capturer » : la phrase est stockée telle quelle dans « À trier » (capture rapide)
    • bouton « ✅ Tâche »   : la phrase est interprétée (date, priorité, durée, catégorie) et devient une tâche */
ACT.quickAdd = (form, submitter) => {
  const inp = form.querySelector('input[name=q]'), dateIn = form.querySelector('input[name=due]');
  const txt = inp.value.trim(); if (!txt) return;
  if (submitter && submitter.value === 'inbox') {
    S.notes.push({ id: uid(), kind: 'inbox', text: txt, created: today() }); inp.value = ''; commit();
    toast('📥 Capturé dans « À trier »', { label: 'Trier', fn: () => ACT.sortInbox() }); return;
  }
  const p = parseQuick(txt);
  if (!p.due && dateIn && dateIn.value) p.due = dateIn.value;
  const cat = p.cat || (UI.tFilter !== 'Toutes' && UI.view === 'tasks' ? UI.tFilter : 'Personnel');
  const t = addTask({ title: p.title, due: p.due, prio: p.prio, dur: p.dur, cat });
  inp.value = ''; if (dateIn) { dateIn.value = ''; dateIn.classList.remove('has'); } commit();
  toast(`✔ ${t.title}${t.due ? ' · ' + dueLabel(t.due) : ''}`, t.due ? null : { label: '📅 Date', fn: () => ACT.taskOptions({ id: t.id }) });
};
const quickForm = (inbox = false) => `<form class="quick" data-quick>
  <input name="q" placeholder="${inbox ? '📥 Capture rapide… ex : Appeler assurance mardi' : 'Ajouter une tâche… ex : Préparer activité 4e pour jeudi'}" autocomplete="off" enterkeyhint="done" aria-label="${inbox ? 'Capture rapide' : 'Nouvelle tâche'}">
  <input type="date" name="due" title="Choisir une date" aria-label="Date d’échéance">
  ${inbox ? '<button class="btn primary" name="m" value="inbox">📥 Capturer</button><button class="btn" name="m" value="task">✅ Tâche</button>' : '<button class="btn primary" name="m" value="task">Ajouter</button>'}</form>`;

/* ===== TÂCHES ===== */
VIEWS.tasks = () => {
  const cats = ['Toutes', ...S.settings.cats];
  let list = S.tasks.filter(t => UI.tFilter === 'Toutes' || t.cat === UI.tFilter);
  const open = list.filter(t => !t.done).sort((a, b) => score(b) - score(a)), T = today();
  const groups = [
    ['⚠️ En retard', open.filter(t => t.due && t.due < T)], ['Aujourd’hui', open.filter(t => t.due === T)],
    ['Cette semaine', open.filter(t => t.due && t.due > T && t.due <= addDays(T, 7))], ['Plus tard', open.filter(t => t.due && t.due > addDays(T, 7))],
    ['Sans date', open.filter(t => !t.due)]
  ];
  const done = list.filter(t => t.done).sort((a, b) => (b.doneDate || '').localeCompare(a.doneDate || '')).slice(0, 30);
  return `${quickForm()}
  <div class="chips">${cats.map(c => `<button class="fchip ${UI.tFilter === c ? 'on' : ''}" data-act="tFilter" data-v="${esc(c)}">${esc(c)}</button>`).join('')}</div>
  <div class="row"><button class="btn sm" data-act="newTask">+ Tâche détaillée</button><span class="sp"></span><label class="chkrow sm"><input type="checkbox" data-act="tDone" ${UI.tDone ? 'checked' : ''}> Terminées</label></div>
  ${groups.map(([n, l]) => l.length ? sec(n + ` <small>(${l.length})</small>`, l.map(taskCard).join('')) : '').join('') || empty('Aucune tâche ici. Écris la première ci-dessus 👆')}
  ${UI.tDone && done.length ? sec('Terminées', done.map(taskCard).join(''), '<button class="link" data-act="clearDone">Vider</button>') : ''}`;
};
ACT.tFilter = d => { UI.tFilter = d.v; render(); };
ACT.tDone = (d, el) => { UI.tDone = el.checked; render(); };
ACT.newTask = () => taskForm(null);
ACT.clearDone = () => { if (!confirmDel('Supprimer toutes les tâches terminées ?')) return; S.tasks = S.tasks.filter(t => !t.done); commit(); };

