/* ----- Recherche globale ----- */
ACT.openSearch = () => {
  openModal(`<input id="gs" class="search big" placeholder="🔍 Rechercher partout…" autocomplete="off"><div id="gsr"></div>`);
  const inp = $('#gs'); setTimeout(() => inp.focus(), 50);
  inp.oninput = () => { $('#gsr').innerHTML = searchHtml(inp.value); };
};
function searchHtml(q) {
  q = norm(q.trim()); if (q.length < 2) return '<div class="empty">Tape au moins 2 lettres.</div>';
  const R = [], has = (...s) => s.some(x => norm(x).includes(q)), add = (t, ic, title, sub, id) => R.push({ t, ic, title, sub, id });
  S.tasks.forEach(x => has(x.title, x.cat) && add('task', '✅', x.title, x.cat + (x.due ? ' · ' + dueLabel(x.due) : '') + (x.done ? ' · terminée' : ''), x.id));
  S.notes.forEach(x => has(x.text) && add('note', x.kind === 'inbox' ? '📥' : '📝', x.text.slice(0, 80), x.kind === 'inbox' ? 'À trier' : 'Note', x.id));
  S.events.forEach(x => has(x.title, x.place, x.notes) && add('event', '📅', x.title, fmtShort(x.date), x.id));
  S.projects.forEach(x => has(x.title, x.goal, x.notes, ...(x.steps || []).map(s => s.t)) && add('project', x.kind === 'goal' ? '🎯' : '📁', x.title, x.kind === 'goal' ? 'Objectif' : 'Projet', x.id));
  S.sessions.forEach(x => has(x.title, x.chapter, x.activity, x.obj, x.remarks) && add('session', '📝', x.title || x.chapter, 'Séance · ' + (x.chapter || ''), x.id));
  S.classes.forEach(x => has(x.name, x.etab, x.notes, x.remarks) && add('class', '🏫', x.name, x.etab || 'Classe', x.id));
  S.asso.tx.forEach(x => has(x.cat, x.comment, x.proof, String(x.amount)) && add('assotx', '🏢', `${x.type === 'in' ? '+' : '−'}${money(x.amount)} ${x.cat}`, 'Association · ' + fmtShort(x.date), x.id));
  S.asso.deadlines.forEach(x => has(x.title) && add('deadline', '🏢', x.title, 'Échéance · ' + fmtShort(x.date), x.id));
  S.budget.tx.forEach(x => has(x.cat, x.label, String(x.amount)) && add('bvar', '💰', `${money(x.amount)} ${x.cat}`, x.label || 'Dépense', x.id));
  S.shop.forEach(x => has(x.name) && add('shop', '🛒', x.name, x.cat, x.id));
  (S.asso.docs || []).forEach(x => has(x.title, x.note, x.place) && add('adoc', '📄', x.title, 'Document association', x.id));
  S.makeups.forEach(x => { const c = byId(S.classes, x.classId); has(x.note, c ? c.name : '') && add('makeup', '⏳', 'Rattrapage ' + (c ? c.name : ''), hFmt(makeupLeft(x)) + ' restantes', x.id); });
  S.family.forEach(x => has(x.title, x.notes) && add('fam', '👨‍👩‍👦', x.title, FAMTYPES[x.type], x.id));
  return R.length ? R.slice(0, 40).map(r => `<div class="mini click" data-act="gsGo" data-t="${r.t}" data-id="${r.id}"><span>${r.ic} <b>${esc(r.title)}</b> <small class="mut">${esc(r.sub)}</small></span></div>`).join('') : '<div class="empty">Aucun résultat.</div>';
}
ACT.gsGo = d => {
  closeModal(); const id = d.id;
  ({
    task: () => taskForm(id), note: () => ACT.editNote({ id }), event: () => eventForm(id), project: () => { UI.pTab = byId(S.projects, id).kind === 'goal' ? 'objectif' : 'projet'; go('projets'); ACT.openProject({ id }); },
    session: () => { UI.prof = 'seances'; go('prof'); sessionForm(id); }, class: () => { UI.prof = 'classes'; go('prof'); ACT.openClass({ id }); }, assotx: () => { UI.aTab = 'fin'; go('asso'); assoTxForm(id); },
    deadline: () => { UI.aTab = 'ech'; go('asso'); deadlineForm(id); }, bvar: () => { UI.bTab = 'depenses'; go('budget'); ACT.editVar({ id }); }, shop: () => go('courses'), adoc: () => { UI.aTab = 'doc'; go('asso'); },  makeup: () => { UI.prof = 'rattrapages'; go('prof'); ACT.editMakeup({ id }); }, fam: () => { go('famille'); famForm(id); }
  })[d.t]();
};

