'use strict';
/* =====================================================================
   spirituel.js — vie théocratique : routine spirituelle quotidienne et
   hebdomadaire, réunions, prédication, suivi mensuel (comme une fiche à cocher).
   Priorité n°1 de l'application : cette section apparaît en premier à l'accueil.
   Tout est modifiable (habitudes, jours et heures des réunions).
   ===================================================================== */
const SPI_COLOR = '#2b8aa0';
const spiIsDone = (h, d) => h.f === 'd' ? !!(S.spi.log[d] || {})[h.id] : !!(S.spi.wlog[mondayOf(d)] || {})[h.id];
const spiHabits = f => S.spi.habits.filter(h => h.f === f);
function spiSet(h, d, v) {
  const L = h.f === 'd' ? S.spi.log : S.spi.wlog, k = h.f === 'd' ? d : mondayOf(d);
  L[k] = L[k] || {}; if (v) L[k][h.id] = true; else delete L[k][h.id];
  if (!Object.keys(L[k]).length) delete L[k];
}
ACT.spiToggle = d => { const h = byId(S.spi.habits, d.h); if (!h) return; spiSet(h, d.d || today(), !spiIsDone(h, d.d || today())); save(); render(); };
function spiProgress(d = today()) {
  const hs = spiHabits('d'), n = hs.length, k = hs.filter(h => spiIsDone(h, d)).length;
  return { n, k, pc: n ? k / n * 100 : 0 };
}
/** Prochaine réunion / activité théocratique (aujourd'hui ou dans les 14 jours) */
function nextSpi() {
  const T = today(), nm = nowMin();
  for (let i = 0; i < 15; i++) {
    const ds = addDays(T, i), l = itemsOn(ds).filter(x => x.kind === 'spi' && (i > 0 || toMin(x.time) > nm));
    if (l.length) return { date: ds, it: l[0] };
  }
  return null;
}
const checkRow = (h, d) => `<label class="chkrow"><input type="checkbox" data-act="spiToggle" data-h="${h.id}" data-d="${d}" ${spiIsDone(h, d) ? 'checked' : ''}> <span class="${spiIsDone(h, d) ? 'strike' : ''}">${esc(h.n)}</span></label>`;
/** Bloc affiché en premier sur l'accueil */
function spiHome() {
  const T = today(), p = spiProgress(T), nx = nextSpi(), W = spiHabits('w');
  const wk = W.filter(h => !spiIsDone(h, T));
  return `<section class="blk spi"><div class="bh"><h2>🕊️ Spirituel <small>${p.k}/${p.n} aujourd’hui</small></h2><button class="link" data-act="goSpirituel">Mon suivi ›</button></div>
    <div class="verse">${esc(spiVerse())}</div>${bar(p.pc)}
    <div class="spigrid">${spiHabits('d').map(h => checkRow(h, T)).join('')}</div>
    ${nx ? `<div class="spinext" data-act="goSpirituel">📅 <b>${esc(nx.it.title)}</b> · ${relDay(nx.date)} ${fmtT(nx.it.time)}${nx.date === T ? ' <small>(' + relIn(T, nx.it.time) + ')</small>' : ''}</div>` : ''}
    ${W.length ? `<div class="mut sm">Cette semaine : ${W.map(h => `<button class="fchip ${spiIsDone(h, T) ? 'on' : ''}" data-act="spiToggle" data-h="${h.id}" data-d="${T}">${spiIsDone(h, T) ? '✔ ' : ''}${esc(h.n)}</button>`).join(' ')}</div>` : ''}</section>`;
}
const YEARTEXT = { 2026: 'Matthieu 5:3 — « Heureux ceux qui sont conscients de leurs besoins spirituels. »' };
function spiVerse() { return S.spi.verse || YEARTEXT[new Date().getFullYear()] || YEARTEXT[2026]; }
function isoWeek(ds) { const d = new Date(ds + 'T12:00:00'); d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7)); const y = d.getFullYear(), j = new Date(y, 0, 4); return [y, 1 + Math.round(((d - j) / 864e5 - 3 + ((j.getDay() + 6) % 7)) / 7)]; }
function wolWeekUrl(ds) { const [y, w] = isoWeek(ds); return `https://wol.jw.org/fr/wol/meetings/r30/lp-f/${y}/${w}`; }
// Recherche d'assemblée sur jw.org (nécessite internet ; si le site refuse, on propose le plan B)
function parseJwMeetings(j) {
  const out = [], seen = new Set();
  (function walk(o) {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) return o.forEach(walk);
    const sc = o.schedule && (o.schedule.current || o.schedule);
    if (sc && (sc.midweek || sc.weekend)) {
      const nm = o.orgName || o.name || (o.properties && o.properties.orgName) || 'Assemblée', ad = o.address || (o.properties && o.properties.address) || '';
      if (!seen.has(nm + ad)) { seen.add(nm + ad); out.push({ nm, ad: String(ad).replace(/\n/g, ', '), mid: sc.midweek, we: sc.weekend }); }
    }
    Object.values(o).forEach(walk);
  })(j);
  return out;
}
const jwDay = n => ((+n - 1) % 7) + 1; // 1 = lundi … 7 = dimanche
ACT.congSearch = async () => {
  const q = ($('#congq') || {}).value || ''; if (!q.trim()) return toast('Tape le nom de ton assemblée');
  const box = $('#congres'); box.innerHTML = '<p class="mut">Recherche sur jw.org…</p>';
  try {
    const ctl = new AbortController(); setTimeout(() => ctl.abort(), 10000);
    const r = await fetch('https://apps.jw.org/api/public/meeting-search/weekly-meetings?includeSuggestions=true&keywords=' + encodeURIComponent(q) + '&latitude=0&longitude=0&searchLanguageCode=F', { signal: ctl.signal });
    const list = parseJwMeetings(await r.json()).filter(c => c.mid || c.we);
    if (!list.length) throw new Error('vide');
    UI.congList = list;
    box.innerHTML = list.slice(0, 8).map((c, i) => `<div class="mini" data-act="congPick" data-i="${i}"><span><b>${esc(c.nm)}</b><br><small class="mut">${esc(c.ad)}</small><br><small>Semaine : ${c.mid ? DAYS[jwDay(c.mid.weekday) - 1] + ' ' + esc(c.mid.time) : '?'} · Week-end : ${c.we ? DAYS[jwDay(c.we.weekday) - 1] + ' ' + esc(c.we.time) : '?'}</small></span></div>`).join('');
  } catch (e) {
    box.innerHTML = `<div class="alert">jw.org n’a pas répondu depuis l’app (internet coupé, ou le site refuse les applis). Ouvre la recherche officielle, retiens les horaires de ton assemblée, puis saisis-les ci-dessous.<br><a class="btn sm" target="_blank" rel="noopener" href="https://www.jw.org/fr/trouver-une-reunion/?q=${encodeURIComponent(q)}">Ouvrir jw.org</a></div>
      <div class="row"><select id="cm_d1">${DAYS.map((d, i) => `<option value="${i + 1}" ${i == 3 ? 'selected' : ''}>${d}</option>`).join('')}</select><input id="cm_t1" type="time" value="19:30"></div>
      <div class="row"><select id="cm_d2">${DAYS.map((d, i) => `<option value="${i + 1}" ${i == 6 ? 'selected' : ''}>${d}</option>`).join('')}</select><input id="cm_t2" type="time" value="10:00"></div>
      <button class="btn wide primary" data-act="congManual">Appliquer : semaine (1ʳᵉ ligne) et week-end (2ᵉ ligne)</button>`;
  }
};
function setMeeting(name, day, time, mins) {
  const [h, m] = time.split(':').map(Number), e = new Date(2000, 0, 1, h, m + mins), end = String(e.getHours()).padStart(2, '0') + ':' + String(e.getMinutes()).padStart(2, '0');
  const f = S.spi.meetings.find(x => x.k === 'reunion' && x.n === name);
  if (f) Object.assign(f, { day, start: time, end }); else S.spi.meetings.push({ id: uid(), n: name, k: 'reunion', day, start: time, end, w: 'AB' });
}
ACT.congPick = d => {
  const c = UI.congList[+d.i]; S.spi.cong = c.nm;
  if (c.mid) setMeeting('Réunion de semaine', jwDay(c.mid.weekday), c.mid.time, 105);
  if (c.we) setMeeting('Réunion du week-end', jwDay(c.we.weekday), c.we.time, 105);
  S.spi.confirmed = false; commit(); toast('✔ Horaires de ' + c.nm + ' appliqués — vérifie-les');
};
ACT.congManual = () => {
  setMeeting('Réunion de semaine', +$('#cm_d1').value, $('#cm_t1').value, 105); setMeeting('Réunion du week-end', +$('#cm_d2').value, $('#cm_t2').value, 105);
  S.spi.cong = ($('#congq') || {}).value || S.spi.cong; S.spi.confirmed = true; commit(); toast('✔ Horaires enregistrés');
};
ACT.goSpirituel = () => go('spirituel');
VIEWS.spirituel = () => {
  const T = today(), ym = UI.sm || (UI.sm = curYM()), tab = UI.sTab || (UI.sTab = 'jour');
  const tabsHtml = tabs(tab, [['jour', 'Aujourd’hui'], ['mois', 'Mon suivi'], ['predic', 'Prédication'], ['reglages', 'Réglages']], 'sTab');
  let body = '';
  if (tab === 'jour') {
    const p = spiProgress(T), up = [];
    for (let i = 0; i < 8; i++) { const ds = addDays(T, i); itemsOn(ds).filter(x => x.kind === 'spi').forEach(x => up.push({ ds, x })); }
    body = `<div class="verse big"><small>Texte de l’année</small><br>${esc(spiVerse())}</div>
      <div class="row"><a class="btn sm" target="_blank" rel="noopener" href="${wolWeekUrl(today())}">📖 Programme de la semaine (wol.jw.org)</a></div>
      ${sec(`Chaque jour <small>${p.k}/${p.n}</small>`, bar(p.pc) + `<div class="spigrid">${spiHabits('d').map(h => checkRow(h, T)).join('')}</div>`)}
      ${sec('Cette semaine', spiHabits('w').map(h => checkRow(h, T)).join('') || empty('Aucune habitude hebdomadaire.'))}
      ${sec('À venir (8 jours)', up.length ? up.map(({ ds, x }) => `<div class="mini"><span><b>${esc(x.title)}</b> · ${relDay(ds)} ${fmtT(x.time)}${x.end ? '–' + fmtT(x.end) : ''}</span></div>`).join('') : empty('Aucune réunion planifiée : vérifie l’onglet Réglages.'))}
      ${S.spi.confirmed ? '' : `<div class="alert">⚠️ Les jours et heures des réunions sont proposés par défaut. <button class="btn sm" data-act="spiConfirm">Ils sont corrects</button> <button class="btn sm" data-act="sTab" data-v="reglages">Modifier</button></div>`}`;
  } else if (tab === 'mois') {
    const f = ym + '-01', last = addDays(shiftYM(ym, 1) + '-01', -1), weeks = []; for (let m = mondayOf(f); m <= last; m = addDays(m, 7)) weeks.push(m);
    const circ = (h, d, off) => `<button class="circ ${spiIsDone(h, d) ? 'on' : ''}" ${off ? 'disabled' : `data-act="spiToggle" data-h="${h.id}" data-d="${d}"`} aria-label="${esc(h.n)} ${d}" aria-pressed="${spiIsDone(h, d)}"></button>`;
    body = `<div class="calbar"><button class="ib" data-act="smNav" data-v="-1">‹</button><h2>${ymLabel(ym)}</h2><button class="ib" data-act="smNav" data-v="1">›</button></div>
      ${S.spi.habits.map(h => {
        let cnt = 0, tot = 0;
        const rows = weeks.map((m, i) => {
          if (h.f === 'd') return `<div class="wkrow"><span>SEM ${i + 1}</span>${Array.from({ length: 7 }, (_, k) => { const d = addDays(m, k), off = d < f || d > last; if (!off) { tot++; if (spiIsDone(h, d)) cnt++; } return circ(h, d, off); }).join('')}</div>`;
          tot++; if (spiIsDone(h, m)) cnt++;
          return `<span class="wk1"><small>SEM ${i + 1}</small>${circ(h, m, false)}</span>`;
        });
        return `<div class="card"><div class="bh"><h2>${esc(h.n)}</h2><small>${cnt}/${tot}</small></div>${h.f === 'd' ? rows.join('') : `<div class="wkline">${rows.join('')}</div>`}</div>`;
      }).join('')}`;
  } else if (tab === 'predic') {
    const l = S.spi.ministry.filter(m => m.date.startsWith(ym)).sort((a, b) => b.date.localeCompare(a.date)), tot = sum(l, 'hours');
    body = `<div class="calbar"><button class="ib" data-act="smNav" data-v="-1">‹</button><h2>${ymLabel(ym)}</h2><button class="ib" data-act="smNav" data-v="1">›</button></div>
      <div class="hero3"><div class="tile big3"><div class="tl">⏱ Heures ce mois-ci</div><div class="tv">${(Math.round(tot * 100) / 100).toString().replace('.', ',')} h</div></div></div>
      <div class="row"><button class="btn primary" data-act="newMinistry">+ Noter une sortie</button></div>
      ${sec('Mes sorties', l.length ? l.map(m => `<div class="mini" data-act="editMinistry" data-id="${m.id}"><span><b>${fmtShort(m.date)}</b> · ${String(m.hours).replace('.', ',')} h ${m.note ? '· ' + esc(m.note) : ''}</span></div>`).join('') : empty('Rien de noté ce mois-ci.'))}
      <p class="mut sm">Ces notes restent sur cet appareil : elles t’aident à remplir ton rapport, elles ne sont envoyées nulle part.</p>`;
  } else {
    body = `${sec('Habitudes', S.spi.habits.map(h => `<div class="mini" data-act="editHabit" data-id="${h.id}"><span>${esc(h.n)} <small class="mut">${h.f === 'd' ? 'chaque jour' : 'chaque semaine'}</small></span></div>`).join(''), '<button class="btn sm primary" data-act="newHabit">+ Ajouter</button>')}
      ${sec('Réunions et prédication', S.spi.meetings.map(m => `<div class="mini" data-act="editSpiMeeting" data-id="${m.id}"><span><b>${esc(m.n)}</b> · ${DAYS[m.day - 1]} ${fmtT(m.start)}–${fmtT(m.end)}${m.w && m.w !== 'AB' ? ' · sem. ' + m.w : ''}</span></div>`).join(''), '<button class="btn sm primary" data-act="newSpiMeeting">+ Ajouter</button>')}
      ${sec('Mon assemblée', `<div class="fld"><input id="congq" placeholder="Nom de ton assemblée ou ville" value="${esc(S.spi.cong || '')}"></div><button class="btn wide" data-act="congSearch">🔎 Trouver mes horaires de réunion</button><div id="congres"></div>`)}
      ${sec('Verset ou pensée du moment (vide = texte de l’année)', `<div class="fld"><textarea rows="2" data-set="spi.verse" data-type="">${esc(S.spi.verse)}</textarea></div>`)}
      ${S.spi.confirmed ? '' : '<button class="btn wide" data-act="spiConfirm">✔ Les horaires des réunions sont corrects</button>'}`;
  }
  return `<p class="mut">Mettre Jéhovah en premier : cette page t’aide à garder ta routine, sans te juger.</p>` + tabsHtml + body;
};
ACT.sTab = d => { UI.sTab = d.v; render(); };
ACT.smNav = d => { UI.sm = shiftYM(UI.sm || curYM(), +d.v); render(); };
ACT.spiConfirm = () => { S.spi.confirmed = true; commit(); toast('✔ Horaires confirmés'); };
function habitForm(id) {
  const h = id ? byId(S.spi.habits, id) : null;
  openForm({
    title: h ? 'Modifier l’habitude' : 'Nouvelle habitude', values: h || { f: 'd' },
    fields: [{ k: 'n', label: 'Nom', req: true }, { k: 'f', label: 'Fréquence', type: 'select', opts: [['d', 'Chaque jour'], ['w', 'Chaque semaine']] }],
    onSubmit: v => { if (h) Object.assign(h, v); else S.spi.habits.push({ id: uid(), ...v }); commit(); },
    onDelete: h ? () => { if (confirmDel('Supprimer cette habitude ?')) { removeId(S.spi.habits, id); closeModal(); commit(); } } : null
  });
}
ACT.newHabit = () => habitForm(null); ACT.editHabit = d => habitForm(d.id);
function spiMeetingForm(id) {
  const m = id ? byId(S.spi.meetings, id) : null;
  openForm({
    title: m ? 'Modifier' : 'Nouvelle activité', values: m || { k: 'reunion', day: 4, start: '19:30', end: '21:00', w: 'AB' },
    fields: [{ k: 'n', label: 'Nom (ex : Réunion de semaine)', req: true }, { k: 'k', label: 'Type', type: 'select', half: true, opts: [['reunion', 'Réunion'], ['predic', 'Prédication'], ['autre', 'Autre']] },
      { k: 'day', label: 'Jour', type: 'select', half: true, opts: DAYS.map((d, i) => [i + 1, d]) },
      { k: 'start', label: 'Début', type: 'time', req: true, half: true }, { k: 'end', label: 'Fin', type: 'time', req: true, half: true },
      { k: 'w', label: 'Semaines', type: 'select', opts: [['AB', 'Toutes les semaines'], ['A', 'Semaine A seulement'], ['B', 'Semaine B seulement']] }],
    onSubmit: v => { v.day = +v.day; if (m) Object.assign(m, v); else S.spi.meetings.push({ id: uid(), ...v }); S.spi.confirmed = true; commit(); },
    onDelete: m ? () => { if (confirmDel()) { removeId(S.spi.meetings, id); closeModal(); commit(); } } : null
  });
}
ACT.newSpiMeeting = () => spiMeetingForm(null); ACT.editSpiMeeting = d => spiMeetingForm(d.id);
function ministryForm(id) {
  const m = id ? byId(S.spi.ministry, id) : null;
  openForm({
    title: m ? 'Modifier la sortie' : 'Prédication', values: m || { date: today(), hours: 2 },
    fields: [{ k: 'date', label: 'Date', type: 'date', req: true, half: true }, { k: 'hours', label: 'Heures (ex : 1,5)', type: 'number', req: true, half: true }, { k: 'note', label: 'Note (facultatif)' }],
    onSubmit: v => { v.hours = Number(v.hours) || 0; if (m) Object.assign(m, v); else S.spi.ministry.push({ id: uid(), ...v }); commit(); },
    onDelete: m ? () => { if (confirmDel()) { removeId(S.spi.ministry, id); closeModal(); commit(); } } : null
  });
}
ACT.newMinistry = () => ministryForm(null); ACT.editMinistry = d => ministryForm(d.id);
