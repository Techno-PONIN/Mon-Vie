function projProgress(p) {
  const steps = p.steps || [], tasks = S.tasks.filter(t => t.projectId === p.id);
  if (p.kind === 'goal' && !steps.length) return Math.round(p.value || 0);
  const total = steps.length + tasks.length;
  if (!total) return Math.round(p.value || 0);
  return Math.round((steps.filter(s => s.done).length + tasks.filter(t => t.done).length) / total * 100);
}
/* ===== PROJETS & OBJECTIFS ===== */
VIEWS.projets = () => {
  const kind = UI.pTab === 'objectif' ? 'goal' : 'project', l = S.projects.filter(p => p.kind === kind);
  return tabs(UI.pTab, [['projet', '📁 Projets'], ['objectif', '🎯 Mes objectifs']], 'pTabSet') +
    sec(kind === 'goal' ? 'Mes objectifs' : 'Mes projets', l.length ? l.map(p => `<div class="card click proj" data-act="openProject" data-id="${p.id}"><div class="ct">${esc(p.title)}</div><div class="mut">${p.due ? '🎯 ' + fmtShort(p.due) : ''}${p.goal ? ' · ' + esc(p.goal) : ''}</div>${bar(projProgress(p))}</div>`).join('') : empty('Rien pour l’instant.'), `<button class="btn sm primary" data-act="newProject" data-kind="${kind}">+ ${kind === 'goal' ? 'Objectif' : 'Projet'}</button>`);
};
ACT.pTabSet = d => { UI.pTab = d.v; render(); };
ACT.newProject = d => projForm(null, d.kind); ACT.editProject = d => projForm(d.id);
function projForm(id, kind) {
  const p = id ? byId(S.projects, id) : null, k = p ? p.kind : kind;
  openForm({
    title: p ? 'Modifier' : (k === 'goal' ? 'Nouvel objectif' : 'Nouveau projet'), values: p || {},
    fields: [{ k: 'title', label: k === 'goal' ? 'Objectif' : 'Projet', req: true }, { k: 'goal', label: k === 'goal' ? 'Précision (ex : activité, économies, apprentissage…)' : 'Objectif du projet' }, { k: 'due', label: k === 'goal' ? 'Date cible' : 'Échéance', type: 'date' }, ...(k === 'goal' ? [{ k: 'value', label: 'Progression (%) — si pas d’étapes', type: 'number' }] : []), { k: 'notes', label: 'Notes', type: 'textarea' }],
    onSubmit: v => { if ('value' in v) v.value = Number(v.value) || 0; if (p) Object.assign(p, v); else { const n = { id: uid(), kind: k, steps: [], ...v }; S.projects.push(n); } commit(); MODALR && MODALR(); },
    onDelete: p ? () => { if (confirmDel()) { removeId(S.projects, id); S.tasks.forEach(t => { if (t.projectId === id) t.projectId = null; }); closeModal(); commit(); } } : null
  });
}
ACT.openProject = d => liveModal(() => {
  const p = byId(S.projects, d.id); if (!p) return '<p>Supprimé.</p>';
  const tasks = S.tasks.filter(t => t.projectId === p.id);
  return `<h2>${p.kind === 'goal' ? '🎯' : '📁'} ${esc(p.title)}</h2><div class="mut">${p.goal ? esc(p.goal) : ''} ${p.due ? '· échéance ' + fmtShort(p.due) : ''}</div>${bar(projProgress(p))}
  ${p.kind === 'goal' && !(p.steps || []).length ? `<input type="range" min="0" max="100" value="${p.value || 0}" data-range="proj" data-id="${p.id}">` : ''}
  <h3>Étapes</h3>${(p.steps || []).map((s, i) => `<div class="mini"><button class="chk" data-act="toggleStep" data-id="${p.id}" data-i="${i}">${s.done ? '✔' : ''}</button><span class="${s.done ? 'strike' : ''}">${esc(s.t)}</span><button class="ib" data-act="delStep" data-id="${p.id}" data-i="${i}">✕</button></div>`).join('') || empty('Aucune étape.')}
  <div class="row"><input id="newStep" placeholder="Nouvelle étape…"><button class="btn" data-act="addStep" data-id="${p.id}">+</button></div>
  ${p.kind === 'project' ? `<h3>Tâches liées</h3>${tasks.length ? tasks.map(taskCard).join('') : empty('Aucune.')}<button class="btn sm" data-act="newProjTask" data-id="${p.id}">+ Tâche pour ce projet</button>` : ''}
  ${p.notes ? `<h3>Notes</h3><div class="note">${esc(p.notes)}</div>` : ''}
  <div class="mact"><button class="btn" data-act="editProject" data-id="${p.id}">✏️ Modifier</button><span class="sp"></span><button class="btn primary" data-act="closeModal">Fermer</button></div>`;
});
ACT.toggleStep = d => { const s = byId(S.projects, d.id).steps[+d.i]; s.done = !s.done; save(); render(); };
ACT.delStep = d => { byId(S.projects, d.id).steps.splice(+d.i, 1); save(); render(); };
ACT.addStep = d => { const i = $('#newStep'), v = i.value.trim(); if (!v) return; byId(S.projects, d.id).steps.push({ t: v, done: false }); save(); render(); setTimeout(() => { const n = $('#newStep'); n && n.focus(); }, 30); };
ACT.newProjTask = d => taskForm(null, { projectId: d.id, cat: 'Projets' });

