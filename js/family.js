/* ===== FAMILLE ===== */
VIEWS.famille = () => {
  const T = today(), days = Array.from({ length: 7 }, (_, i) => addDays(T, i));
  const wk = days.map(ds => ({ ds, its: itemsOn(ds).filter(x => x.kind === 'family' || x.cat === 'famille' || (x.kind === 'task' && byId(S.tasks, x.id)?.cat === 'Famille')) })).filter(d => d.its.length);
  const undated = openTasks().filter(t => t.cat === 'Famille' && !t.due);
  const sections = Object.entries(FAMTYPES).map(([k, l]) => {
    const arr = S.family.filter(f => f.type === k).sort((a, b) => (a.date || '9').localeCompare(b.date || '9'));
    return sec(l, arr.length ? arr.map(f => `<div class="mini" data-act="editFamily" data-id="${f.id}"><span><b>${esc(f.title)}</b> <small>${f.date ? (k === 'anniv' ? parseD(f.date).getDate() + ' ' + MONTHS[parseD(f.date).getMonth()] : fmtShort(f.date)) + (f.time ? ' ' + fmtT(f.time) : '') : ''}</small> ${f.notes ? '— ' + esc(f.notes) : ''}</span></div>`).join('') : empty('—'), `<button class="btn sm" data-act="newFamily" data-type="${k}">+</button>`);
  }).join('');
  return `${sec('👨‍👩‍👦 Cette semaine en famille', wk.length ? wk.map(d => `<div class="dayrow"><div class="dn">${relDay(d.ds)}</div><div class="dl">${d.its.map(itemRow).join('')}</div></div>`).join('') : empty('Semaine tranquille.'), `<button class="btn sm primary" data-act="newFamily" data-type="rdv">+ Ajouter</button>`)}
  ${undated.length ? sec('Tâches familiales', undated.map(taskCard).join('')) : ''}${sections}`;
};
ACT.newFamily = d => famForm(null, d.type); ACT.editFamily = d => famForm(d.id);
function famForm(id, type) {
  const f = id ? byId(S.family, id) : null;
  openForm({
    title: f ? 'Modifier' : 'Ajouter', values: f || { type: type || 'rdv', date: today() },
    fields: [{ k: 'type', label: 'Type', type: 'select', opts: Object.entries(FAMTYPES) }, { k: 'title', label: 'Titre', req: true }, { k: 'date', label: 'Date (anniversaire : jour de naissance ; document : validité)', type: 'date', half: true }, { k: 'time', label: 'Heure', type: 'time', half: true }, { k: 'notes', label: 'Notes / où le trouver', type: 'textarea', rows: 2 }],
    onSubmit: v => { if (f) Object.assign(f, v); else S.family.push({ id: uid(), ...v }); commit(); },
    onDelete: f ? () => { if (confirmDel()) { removeId(S.family, id); closeModal(); commit(); } } : null
  });
}

