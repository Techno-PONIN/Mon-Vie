/** Tout ce qui se passe un jour donné (cours, événements, tâches, échéances, famille). */
function itemsOn(ds) {
  const it = [];
  slotsOn(ds).forEach(s => {
    const x = courseInfo(s);
    it.push({ kind: 'course', id: s.id, title: `${S.settings.subject || 'Technologie'} — ${x.cls}`, sub: [x.room && 'Salle ' + x.room, x.etab].filter(Boolean).join(' · '), time: s.start, end: s.end, color: EVCATS.cours[1], date: ds });
  });
  S.events.filter(e => e.date === ds).forEach(e => it.push({
    kind: 'event', id: e.id, title: e.title, cat: e.cat, sub: [e.place, e.notes].filter(Boolean).join(' · '), time: e.time || '',
    end: e.time && e.dur ? fromMin(toMin(e.time) + Number(e.dur)) : '', color: (EVCATS[e.cat] || EVCATS.perso)[1], date: ds
  }));
  S.tasks.filter(t => !t.done && t.due === ds).forEach(t => it.push({ kind: 'task', id: t.id, title: t.title, prio: t.prio, time: '', color: '#868e96', date: ds, sub: t.cat }));
  S.asso.deadlines.filter(d => d.date === ds && d.status !== 'Fait').forEach(d => it.push({ kind: 'deadline', id: d.id, title: '🏢 ' + d.title, prio: d.prio, time: '', color: EVCATS.asso[1], date: ds, sub: 'Échéance association' }));
  S.family.filter(f => f.date && (f.type === 'anniv' ? f.date.slice(5) === ds.slice(5) : f.date === ds)).forEach(f => it.push({
    kind: 'family', id: f.id, title: (f.type === 'anniv' ? '🎂 ' : '') + f.title, sub: FAMTYPES[f.type], time: f.time || '', color: EVCATS.famille[1], date: ds
  }));
  return it.sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
}
function nextEvent() {
  const T = today(), nm = nowMin();
  for (let i = 0; i < 31; i++) {
    const ds = addDays(T, i);
    const l = itemsOn(ds).filter(x => (x.kind === 'event' || x.kind === 'family') && (i > 0 || !x.time || toMin(x.time) > nm));
    if (l.length) return { date: ds, it: l[0] };
  }
  return null;
}
/** Rappels & échéances des 7 prochains jours. */
function reminders(days = 7) {
  const out = [];
  for (let i = 0; i <= days; i++) {
    const ds = addDays(today(), i);
    itemsOn(ds).forEach(x => {
      const ok = x.kind === 'deadline' || x.kind === 'family' || (x.kind === 'event' && ['important', 'echeance', 'rdv'].includes(x.cat)) ||
        (x.kind === 'task' && i > 0 && ['urgent', 'important'].includes(x.prio));
      if (ok) out.push({ date: ds, it: x });
    });
  }
  return out;
}
function relDay(ds) {
  const n = diffDays(ds, today());
  return n === 0 ? 'Aujourd’hui' : n === 1 ? 'Demain' : n === -1 ? 'Hier' : fmtLong(ds);
}
function relIn(ds, time) {
  if (ds !== today()) return '';
  const d = toMin(time) - nowMin();
  if (d <= 0) return 'maintenant';
  return d < 60 ? `dans ${d} min` : `dans ${Math.floor(d / 60)} h${d % 60 ? ' ' + pad(d % 60) : ''}`;
}
const dueLabel = d => {
  if (!d) return '';
  const n = diffDays(d, today());
  return n < 0 ? `En retard (${-n} j)` : n === 0 ? 'Aujourd’hui' : n === 1 ? 'Demain' : fmtShort(d);
};
/* ===== AGENDA ===== */
function itemRow(x) {
  const act = x.kind === 'event' ? 'editEvent' : x.kind === 'task' ? 'editTask' : x.kind === 'deadline' ? 'editDeadline' : x.kind === 'family' ? 'editFamily' : 'goProf';
  return `<div class="it" data-act="${act}" data-id="${x.id}" style="--ic:${x.color}"><div class="itime">${x.time ? fmtT(x.time) + (x.end ? '<small>' + fmtT(x.end) + '</small>' : '') : (x.kind === 'task' ? '☐' : '•')}</div>
    <div class="ibody"><div class="itt">${esc(x.title)}</div>${x.sub ? `<div class="mut">${esc(x.sub)}</div>` : ''}</div></div>`;
}
VIEWS.agenda = () => {
  const c = UI.cal, d = c.date, T = today();
  let title, body;
  if (c.mode === 'month') {
    const f = parseD(d); f.setDate(1); const start = mondayOf(iso(f)); title = `${cap(MONTHS[f.getMonth()])} ${f.getFullYear()}`;
    body = `<div class="mgrid">${DAYS.map(x => `<div class="mh">${x.slice(0, 3)}</div>`).join('')}${Array.from({ length: 42 }, (_, i) => {
      const ds = addDays(start, i), its = itemsOn(ds), other = parseD(ds).getMonth() !== f.getMonth();
      return `<div class="mc ${other ? 'oth' : ''} ${ds === T ? 'tod' : ''}" data-act="calDay" data-v="${ds}"><b>${parseD(ds).getDate()}</b>
        <div class="dots">${its.slice(0, 4).map(x => `<i style="background:${x.color}"></i>`).join('')}</div>
        <div class="lines">${its.slice(0, 3).map(x => `<div style="--ic:${x.color}">${esc(x.title)}</div>`).join('')}${its.length > 3 ? `<small>+${its.length - 3}</small>` : ''}</div></div>`;
    }).join('')}</div>`;
  } else if (c.mode === 'week') {
    const mon = mondayOf(d); title = `Semaine du ${fmtShort(mon)} · sem. ${weekType(mon)}`;
    body = `<div class="wgrid">${Array.from({ length: 7 }, (_, i) => { const ds = addDays(mon, i), its = itemsOn(ds); return `<div class="wd ${ds === T ? 'tod' : ''}"><div class="wh" data-act="calDay" data-v="${ds}">${fmtShort(ds)}</div>${its.length ? its.map(itemRow).join('') : '<div class="mut sm">—</div>'}</div>`; }).join('')}</div>`;
  } else {
    title = fmtLong(d) + (d === T ? ' · aujourd’hui' : ''); const its = itemsOn(d);
    body = `<div class="card">${its.length ? its.map(itemRow).join('') : empty('Journée libre ✨')}</div><div class="center"><button class="btn" data-act="newEvent" data-date="${d}">+ Événement ce jour</button></div>`;
  }
  return `<div class="calbar"><button class="ib" data-act="calNav" data-v="-1">‹</button><h2>${title}</h2><button class="ib" data-act="calNav" data-v="1">›</button></div>
  <div class="row"><div class="seg">${[['month', 'Mois'], ['week', 'Semaine'], ['day', 'Jour']].map(([k, l]) => `<button class="${c.mode === k ? 'on' : ''}" data-act="calMode" data-v="${k}">${l}</button>`).join('')}</div>
  <button class="btn sm" data-act="calToday">Aujourd’hui</button><span class="sp"></span><button class="btn sm primary" data-act="newEvent">+ Événement</button><button class="btn sm" data-act="newTask">+ Tâche</button></div>${body}`;
};
ACT.calMode = d => { UI.cal.mode = d.v; render(); };
ACT.calToday = () => { UI.cal.date = today(); render(); };
ACT.calDay = d => { UI.cal.date = d.v; UI.cal.mode = 'day'; render(); };
ACT.calNav = d => {
  const c = UI.cal, n = +d.v;
  if (c.mode === 'month') { const x = parseD(c.date); x.setDate(1); x.setMonth(x.getMonth() + n); c.date = iso(x); } else c.date = addDays(c.date, n * (c.mode === 'week' ? 7 : 1));
  render();
};
ACT.newEvent = d => eventForm(null, { date: d.date || (UI.view === 'agenda' ? UI.cal.date : today()) });
ACT.editEvent = d => eventForm(d.id);
function eventForm(id, pre = {}) {
  const e = id ? byId(S.events, id) : null;
  openForm({
    title: e ? 'Modifier l’événement' : 'Nouvel événement', values: e || { date: today(), cat: 'perso', dur: 60, remind: 30, ...pre },
    fields: [
      { k: 'title', label: 'Titre', req: true },
      { k: 'date', label: 'Date', type: 'date', req: true, half: true }, { k: 'time', label: 'Heure', type: 'time', half: true },
      { k: 'dur', label: 'Durée', type: 'select', half: true, opts: [[0, '—'], [15, '15 min'], [30, '30 min'], [45, '45 min'], [60, '1 h'], [90, '1 h 30'], [120, '2 h'], [180, '3 h'], [480, 'Journée']] },
      { k: 'cat', label: 'Catégorie', type: 'select', half: true, opts: Object.entries(EVCATS).filter(([k]) => EVCATS_FORM.includes(k) || (e && e.cat === k)).map(([k, v]) => [k, v[0]]) },
      { k: 'place', label: 'Lieu' },
      { k: 'remind', label: 'Rappel', type: 'select', opts: [[0, 'Aucun'], [10, '10 min avant'], [30, '30 min avant'], [60, '1 h avant'], [120, '2 h avant']] },
      { k: 'notes', label: 'Notes', type: 'textarea' }
    ],
    onSubmit: v => { v.dur = +v.dur || 0; v.remind = +v.remind || 0; if (e) Object.assign(e, v); else S.events.push({ id: uid(), ...v }); commit(); },
    onDelete: e ? () => { if (confirmDel()) { removeId(S.events, id); closeModal(); commit(); } } : null
  });
}
ACT.formDelete = () => { FORM && FORM.onDelete && FORM.onDelete(); };

