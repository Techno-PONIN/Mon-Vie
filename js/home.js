'use strict';
/* =====================================================================
   home.js — Centre de commande (page d'accueil), modes « Débordé / J'ai du
   temps / Ma matinée / Fin de journée », tableau de bord et statistiques.
   Idée directrice : répondre à « Qu'est-ce qui compte vraiment maintenant ? »
   ===================================================================== */

/* ---------- Blocs d'information ---------- */
function nextCourseBlock() {
  const cur = currentCourse(), nx = upcomingCourses(1)[0];
  if (!cur && !nx) return `<div class="card info"><div class="ct">🏫 Prochain cours</div><div class="mut">Aucun cours dans ton emploi du temps.</div><button class="btn sm" data-act="goProf">Saisir mon emploi du temps</button></div>`;
  let h = '<div class="card info">';
  if (cur) h += `<div class="ct">🟢 Cours en cours</div><div class="big">${esc(courseText(cur))}</div><div class="mut">jusqu’à ${fmtT(cur.end)}</div>${nx ? '<hr>' : ''}`;
  if (nx) h += `<div class="ct">🏫 Prochain cours</div><div class="big">${esc(courseText(nx.slot))}</div>
    <div class="mut">${nx.date === today() ? relIn(nx.date, nx.slot.start) : relDay(nx.date)}</div>
    <div class="row"><button class="btn sm" data-act="prepareNext">📝 Préparer</button><button class="btn sm" data-act="nextCourses">Cours suivant ▸</button></div>`;
  return h + '</div>';
}
ACT.nextCourses = () => {
  const l = upcomingCourses(4);
  openModal(`<h2>🏫 Cours suivants</h2>${l.length ? l.map((c, i) => `<div class="card ${i === 0 ? 'info' : ''}"><div class="mut">${relDay(c.date)}${c.date === today() ? ' · ' + relIn(c.date, c.slot.start) : ''}</div><div class="${i === 0 ? 'big' : ''}">${esc(courseText(c.slot))}</div></div>`).join('') : empty('Aucun cours trouvé dans les 3 prochaines semaines.')}
  <div class="mact"><button class="btn" data-act="prepareNext">📝 Préparer le prochain</button><span class="sp"></span><button class="btn primary" data-act="closeModal">Fermer</button></div>`);
};

/** Combien de minutes libres avant le prochain engagement ? (null = occupé en ce moment) */
function freeMinutes() {
  const nm = nowMin(), its = itemsOn(today()).filter(x => x.time && (x.kind === 'course' || x.kind === 'event' || x.kind === 'family'));
  if (its.some(x => toMin(x.time) <= nm && x.end && nm < toMin(x.end))) return null;
  const next = its.filter(x => toMin(x.time) > nm).sort((a, b) => toMin(a.time) - toMin(b.time))[0];
  return next ? { min: toMin(next.time) - nm, until: next } : { min: 60, until: null };
}
/** Les 3 choses les plus importantes aujourd'hui (cours, rendez-vous, tâches mélangés) */
function topThree() {
  const T = today(), c = [], first = slotsOn(T)[0];
  if (first) c.push({ s: 96, html: `🏫 ${esc(courseText(first))}` });
  itemsOn(T).filter(x => x.kind === 'event' || x.kind === 'deadline').forEach(x => c.push({ s: IMPORTANT_CATS.includes(x.cat) || x.kind === 'deadline' ? 92 : 78, html: `📅 ${x.time ? fmtT(x.time) + ' ' : ''}${esc(x.title)}` }));
  ranked().filter(t => score(t) >= 50).slice(0, 5).forEach(t => c.push({ s: score(t), html: `${PRIO[t.prio].i} ${esc(t.title)}` }));
  return c.sort((a, b) => b.s - a.s).slice(0, 3);
}
/** 🔥 À faire maintenant — maximum 3 éléments : un engagement imminent puis les tâches les plus importantes */
function nowItems() {
  const out = [], nm = nowMin(), T = today();
  const soon = itemsOn(T).find(x => x.time && (x.kind === 'course' || x.kind === 'event') && toMin(x.time) - nm >= 0 && toMin(x.time) - nm <= 45);
  if (soon) out.push({ kind: 'soon', it: soon });
  ranked().filter(t => score(t) >= 55).slice(0, 3 - out.length).forEach(t => out.push({ kind: 'task', t }));
  return out;
}
/** ⚠️ Attention — urgent ou en retard */
function attentionItems(excludeIds) {
  const T = today(), out = [], ex = excludeIds || new Set();
  const late = openTasks().filter(t => t.due && t.due < T && !ex.has(t.id)).sort((a, b) => score(b) - score(a));
  late.slice(0, 3).forEach(t => out.push({ ic: '⏳', text: `En retard : ${esc(t.title)} <small>(${dueLabel(t.due)})</small>`, act: 'editTask', id: t.id }));
  if (late.length > 3) out.push({ ic: '⏳', text: `… et ${late.length - 3} autre${late.length - 3 > 1 ? 's' : ''} tâche(s) en retard`, act: 'goTasks' });
  openTasks().filter(t => t.prio === 'urgent' && !(t.due && t.due < T) && t.status !== 'wait' && !ex.has(t.id)).slice(0, 3).forEach(t => out.push({ ic: '🔴', text: `Urgent : ${esc(t.title)}`, act: 'editTask', id: t.id }));
  S.asso.deadlines.filter(d => d.status !== 'Fait' && diffDays(d.date, T) <= 2).forEach(d => out.push({ ic: '🏢', text: `${d.date < T ? 'Dépassée' : 'Bientôt'} : ${esc(d.title)} <small>(${fmtShort(d.date)})</small>`, act: 'editDeadline', id: d.id }));
  urgentMakeups().forEach(m => { const c = byId(S.classes, m.classId); out.push({ ic: '⏳', text: `Rattrapage ${esc(c ? c.name : '')} : ${hFmt(makeupLeft(m))} restantes avant le ${fmtShort(m.due)}`, act: 'goProf', rattrap: true }); });
  if (S.settings.notif.budget) budgetCalc(curYM()).alerts.forEach(a => out.push({ ic: '💰', text: esc(a.text), act: 'goBudget' }));
  return out;
}
/** 💡 Suggestions — actions utiles, toutes calculées à partir de tes données */
function suggestions() {
  const out = [], T = today(), h = new Date().getHours();
  const fm = freeMinutes();
  if (fm && fm.min >= 10) {
    const lim = Math.min(fm.min, 60), fits = ranked().filter(t => t.dur && t.dur <= lim).slice(0, 2);
    if (fits.length) out.push({ html: `⏱️ Tu as ${fm.until ? fm.min + ' minutes avant « ' + esc(fm.until.title) + ' »' : 'du temps devant toi'}. Voici ${fits.length} tâche${fits.length > 1 ? 's' : ''} que tu peux terminer :`, tasks: fits });
  }
  const inbox = S.notes.filter(n => n.kind === 'inbox').length;
  if (inbox) out.push({ html: `📥 ${inbox} élément${inbox > 1 ? 's' : ''} dans ta boîte de réception — environ ${Math.max(1, Math.round(inbox * .7))} min pour tout trier.`, act: 'sortInbox', label: 'Trier ma boîte' });
  const u = upcomingCourses(4).find(c => c.date <= addDays(T, 3) && !S.sessions.some(s => s.classId === c.slot.classId && s.date === c.date));
  if (u) { const x = courseInfo(u.slot); out.push({ html: `📝 Pas encore de préparation pour ton cours de <b>${esc(x.cls)}</b> (${relDay(u.date).toLowerCase()}).`, act: 'prepareFor', data: `data-slot="${u.slot.id}" data-date="${u.date}"`, label: 'Préparer' }); }
  const miss = missingIngredients();
  if (miss.length) out.push({ html: `🛒 Il manque ${miss.length} ingrédient${miss.length > 1 ? 's' : ''} dans ta liste pour les repas des prochains jours.`, act: 'addMissing', label: 'Ajouter à la liste' });
  const mat = byId(S.routines, 'matin'), soir = byId(S.routines, 'soir');
  if (mat && h < 11 && mat.items.length && routineProgress(mat).pc < 100) out.push({ html: `☀️ Ta routine du matin n’est pas terminée (${routineProgress(mat).d}/${routineProgress(mat).n}).`, act: 'modeMorning', label: 'Voir' });
  if (soir && h >= 19 && soir.items.length && routineProgress(soir).pc < 100) out.push({ html: `🌙 Ta routine du soir t’attend (${routineProgress(soir).d}/${routineProgress(soir).n}).`, act: 'modeEvening', label: 'Voir' });
  if (h >= 18 && S.budget.tx.length && !S.budget.tx.some(t => t.date === T)) out.push({ html: '💶 Tu n’as noté aucune dépense aujourd’hui.', act: 'newExpense', label: 'Noter une dépense' });
  return out;
}
ACT.prepareFor = d => { const slot = byId(S.slots, d.slot); if (slot) prepareCourse({ date: d.date, slot }); };
ACT.addMissing = () => { let n = 0; missingIngredients().forEach(i => { if (addShop(i)) n++; }); commit(); toast(`🛒 ${n} produit(s) ajouté(s)`, { label: 'Voir', fn: () => go('courses') }); };

/* ---------- Page d'accueil ---------- */
VIEWS.home = () => {
  if (UI.homeTab === 'dash') return renderDash();
  const T = today(), now = nowItems(), nowIds = new Set(now.filter(x => x.t).map(x => x.t.id));
  const hr = new Date().getHours(), hello = hr < 12 ? 'Bonjour' : hr < 18 ? 'Bon après-midi' : 'Bonsoir';
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 864e5);
  const todayAll = itemsOn(T).filter(x => !(x.kind === 'task' && nowIds.has(x.id)));
  const timed = todayAll.filter(x => x.kind !== 'task'), tasksToday = todayAll.filter(x => x.kind === 'task').map(x => byId(S.tasks, x.id)).filter(Boolean);
  const lateTasks = openTasks().filter(t => t.due && t.due < T && !nowIds.has(t.id));   // les tâches en retard apparaissent dans « Attention »
  const upc = [1, 2, 3].map(i => addDays(T, i)).map(ds => ({ ds, its: itemsOn(ds).filter(x => x.kind !== 'task' || ['urgent', 'important'].includes(x.prio)) })).filter(d => d.its.length);
  const att = attentionItems(nowIds), sug = suggestions().slice(0, 4);
  const inboxN = S.notes.filter(n => n.kind === 'inbox').length;
  return `
  ${S.flags.demo ? `<div class="banner">🧪 Données de démonstration affichées. <button class="btn sm" data-act="clearDemo">Effacer les données de démonstration</button></div>` : ''}
  <div class="hero"><div><div class="hi">${hello} ${esc(S.settings.name)} 👋</div><div class="date">${fmtLong(T)}</div><div class="quote">${esc(QUOTES[dayOfYear % QUOTES.length])}</div></div><div id="weather" class="weather"></div></div>
  ${quickForm(true)}
  <button class="mode red huge" data-act="modeOverwhelmed">🆘 JE SUIS DÉBORDÉ</button>
  <div class="modes4"><button class="mode" data-act="modeMinutes" data-v="5">⏱️ 5 min</button><button class="mode" data-act="modeMinutes" data-v="10">⏱️ 10 min</button><button class="mode" data-act="modeMinutes" data-v="15">⏱️ 15 min</button><button class="mode" data-act="modeMinutes" data-v="30">⏱️ 30 min</button></div>
  <div class="modes2"><button class="mode" data-act="modeMorning">☀️ Ma matinée</button><button class="mode dark" data-act="modeEvening">🌙 Ma fin de journée</button></div>
  ${sec('🔥 À faire maintenant', now.length ? now.map(x => x.kind === 'soon' ? `<div class="soon">${itemRow(x.it)}<div class="mut sm">⏰ ${relIn(T, x.it.time)}</div></div>` : taskCard(x.t)).join('') : empty(openTasks().length ? 'Rien d’urgent : tu peux avancer à ton rythme 👌' : '🎉 Aucune tâche. Vide ta tête avec « 📥 Capture rapide ».'))}
  ${nextCourseBlock()}
  ${sec('📅 Aujourd’hui', (timed.length ? timed.map(itemRow).join('') : '') + (tasksToday.length ? tasksToday.map(taskCard).join('') : '') + (!timed.length && !tasksToday.length ? empty(lateTasks.length ? 'Rien de prévu aujourd’hui (les retards sont dans « Attention »).' : 'Journée libre ✨') : ''), `<button class="link" data-act="goView" data-v="agenda">Agenda</button>`)}
  ${upc.length ? sec('⏭️ Prochainement <small>(72 h)</small>', upc.map(d => `<div class="dayrow"><div class="dn">${relDay(d.ds)}</div><div class="dl">${d.its.map(itemRow).join('')}</div></div>`).join('')) : ''}
  ${att.length ? sec('⚠️ Attention', att.map(a => `<div class="attn" data-act="${a.act}" ${a.id ? `data-id="${a.id}"` : ''}><span>${a.ic}</span><div class="grow">${a.text}</div></div>`).join('')) : ''}
  ${sug.length ? sec('💡 Suggestions', sug.map(s => `<div class="sugg"><div>${s.html}</div>${s.tasks ? s.tasks.map(t => `<div class="mini"><button class="chk" data-act="toggleTask" data-id="${t.id}" aria-label="Terminer"></button><span>${PRIO[t.prio].i} ${esc(t.title)} <small class="mut">⏱ ${t.dur} min</small></span></div>`).join('') : ''}${s.act ? `<button class="btn sm" data-act="${s.act}" ${s.data || ''}>${s.label}</button>` : ''}</div>`).join('')) : ''}
  ${inboxN ? `<div class="alert info" data-act="sortInbox" role="button" tabindex="0">📥 ${inboxN} à trier <button class="link">Trier ma boîte</button></div>` : ''}
  <div class="center"><button class="link" data-act="homeDash">📊 Tableau de bord</button> · <button class="link" data-act="goView" data-v="routines">🔁 Routines</button></div>`;
};
ACT.homeDash = () => { UI.homeTab = 'dash'; render(); window.scrollTo(0, 0); };
ACT.homeDay = () => { UI.homeTab = 'day'; render(); window.scrollTo(0, 0); };
ACT.goProf = () => go('prof'); ACT.goTasks = () => go('tasks'); ACT.goBudget = () => go('budget'); ACT.goNotes = () => go('notes'); ACT.goFamille = () => go('famille'); ACT.goCourses = () => go('courses');
ACT.openItem = d => {
  const k = d.kind;
  if (k === 'task') taskForm(d.id); else if (k === 'event') ACT.editEvent(d); else if (k === 'deadline') ACT.editDeadline(d);
  else if (k === 'family') ACT.editFamily(d); else if (k === 'course') go('prof');
};

/* ---------- Tableau de bord ---------- */
function renderDash() {
  const T = today(), mon = mondayOf(T), wk = Array.from({ length: 7 }, (_, i) => addDays(mon, i));
  const open = openTasks(), todayTasks = open.filter(t => t.due && t.due <= T).length;
  const evToday = itemsOn(T).filter(x => x.kind === 'event' || x.kind === 'family').length, coToday = slotsOn(T).length;
  const wTasks = open.filter(t => t.due && t.due >= mon && t.due <= wk[6]).length;
  const wEv = wk.reduce((a, d) => a + S.events.filter(e => e.date === d).length, 0);
  const wEch = wk.reduce((a, d) => a + S.asso.deadlines.filter(x => x.date === d && x.status !== 'Fait').length + S.events.filter(e => e.date === d && IMPORTANT_CATS.includes(e.cat)).length, 0);
  const b = budgetCalc(curYM()), projs = S.projects.filter(p => p.kind === 'project' && projProgress(p) < 100);
  // statistiques réelles : tâches terminées sur 7 jours
  const days = Array.from({ length: 7 }, (_, i) => addDays(T, i - 6)), cnt = days.map(d => S.tasks.filter(t => t.done && t.doneDate === d).length), mx = Math.max(1, ...cnt);
  const monthDone = S.tasks.filter(t => t.done && (t.doneDate || '').startsWith(curYM())).length;
  const sessDone = S.sessions.filter(s => s.status === 'Réalisée' && (s.date || '').startsWith(curYM())).length;
  const byCat = {}; open.forEach(t => byCat[t.cat] = (byCat[t.cat] || 0) + 1);
  const mk = mkTotals();
  return `<div class="center"><button class="link" data-act="homeDay">← Centre de commande</button></div>
  ${sec('Aujourd’hui', `<div class="tiles">${tile('Tâches', todayTasks, 'à faire / en retard', 'goTasks')}${tile('Événements', evToday)}${tile('Cours', coToday)}${tile('Rattrapages', mk.left ? hFmt(mk.left) : '0 h', 'restantes', 'goProf')}</div>`)}
  ${sec('Cette semaine', `<div class="tiles">${tile('Tâches', wTasks)}${tile('Événements', wEv)}${tile('Cours', wk.reduce((a, d) => a + slotsOn(d).length, 0))}${tile('Échéances', wEch)}</div>`)}
  ${sec('Budget', `<div class="tiles">${tile('Disponible ce mois-ci', money(b.left), '', 'goBudget')}${tile('Déjà dépensé', money(b.spent))}${tile('Prévision fin de mois', money(b.forecast))}</div>`)}
  ${sec('Projets en cours', projs.length ? projs.map(p => `<div class="proj" data-act="openProject" data-id="${p.id}"><div class="pt">${esc(p.title)}</div>${bar(projProgress(p))}</div>`).join('') : empty('Aucun projet en cours.'))}
  ${sec('📈 Statistiques', `<div class="lbl">Tâches terminées ces 7 derniers jours</div><div class="chart">${days.map((d, i) => `<div class="cb"><div class="cbars"><i class="in" style="height:${cnt[i] / mx * 100}%" title="${cnt[i]}"></i></div><small>${DAYS[dow(d) - 1].slice(0, 1)}<br><b>${cnt[i]}</b></small></div>`).join('')}</div>
    <div class="tiles sm">${tile('Terminées ce mois', monthDone)}${tile('Séances réalisées', sessDone, 'ce mois')}${tile('Tâches ouvertes', open.length)}</div>
    ${Object.keys(byCat).length ? `<div class="lbl">Tâches ouvertes par catégorie</div>${Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([c, n]) => `<div class="brow"><div class="grow"><b>${esc(c)}</b> <span class="mut">${n}</span>${bar(n / open.length * 100)}</div></div>`).join('')}` : ''}`)}`;
}

/* ---------- Modes ---------- */
const miniTask = t => `<div class="mini"><button class="chk" data-act="toggleTaskModal" data-id="${t.id}" aria-label="Terminer"></button><span>${PRIO[t.prio].i} ${esc(t.title)} <small class="mut">${t.due ? dueLabel(t.due) : ''}</small></span><button class="ib" data-act="postponeTask" data-id="${t.id}" title="Reporter à demain" aria-label="Reporter">⏭</button><button class="ib" data-act="taskOptions" data-id="${t.id}" title="Planifier, déléguer, supprimer…" aria-label="Options">⋯</button></div>`;
ACT.toggleTaskModal = d => { const t = byId(S.tasks, d.id); t.done = true; t.doneDate = today(); save(); render(); };
ACT.modeOverwhelmed = () => liveModal(() => {
  const rk = ranked(), now = rk.slice(0, 3), td = rk.slice(3, 8), rest = rk.slice(8);
  return `<h2>🆘 Respire. Voilà l’essentiel.</h2>
  <h3>🔥 MAINTENANT <small>(1 à 3)</small></h3>${now.length ? now.map(miniTask).join('') : empty('Rien ! 🎉')}
  <h3>📅 AUJOURD’HUI <small>(5 maximum en plus)</small></h3>${td.length ? td.map(miniTask).join('') : empty('—')}
  <h3>🕒 PLUS TARD <small>(${rest.length})</small></h3>${rest.length ? rest.slice(0, 15).map(miniTask).join('') + (rest.length > 15 ? `<div class="mut">… et ${rest.length - 15} autres</div>` : '') : empty('—')}
  <p class="mut sm">⏭ reporter · ⋯ planifier, déléguer, transformer en rappel ou supprimer. Rien n’est supprimé automatiquement.</p>
  <div class="mact">${rest.length ? '<button class="btn" data-act="postponeRest">⏭ Reporter le reste à demain</button>' : ''}<span class="sp"></span><button class="btn primary" data-act="closeModal">Compris</button></div>`;
});
ACT.postponeRest = () => {
  const rest = ranked().slice(8).filter(t => t.due && t.due <= today()); rest.forEach(t => t.due = addDays(today(), 1));
  commit(); toast(`⏭ ${rest.length} tâche(s) reportée(s) à demain`);
};
ACT.modeMinutes = d => { if (d && d.v) UI.minutes = +d.v; liveModal(() => {
  const N = UI.minutes, tasks = ranked().filter(t => t.dur && t.dur <= N), sug = [];
  const inbox = S.notes.filter(n => n.kind === 'inbox').length;
  if (inbox) sug.push(['📥', `Trier ta boîte de réception (${inbox})`, 'sortInbox']);
  sug.push(['💶', 'Noter une dépense', 'newExpense']);
  const nxd = reminders(7).find(r => r.it.kind === 'deadline'); if (nxd) sug.push(['⚠️', `Vérifier l’échéance : ${nxd.it.title}`, 'openItem', nxd.it]);
  if (N >= 10) sug.push(['📅', 'Regarder ta semaine', 'weekSummary']);
  if (N >= 15) { sug.push(['📝', 'Préparer le prochain cours', 'prepareNext']); sug.push(['🛒', 'Compléter la liste de courses', 'goCourses']); }
  return `<h2>⏱️ J’ai <span class="sel">${N} minutes</span></h2>
  <div class="seg">${[5, 10, 15, 30].map(n => `<button class="${N === n ? 'on' : ''}" data-act="setMinutes" data-v="${n}">${n} min</button>`).join('')}</div>
  <h3>Tâches compatibles</h3>${tasks.length ? tasks.map(taskCard).join('') : empty('Aucune tâche avec une durée estimée ≤ ' + N + ' min. Ajoute « 5 min » dans le texte d’une tâche pour la retrouver ici.')}
  <h3>Idées</h3>${sug.map(s => `<button class="sug" data-act="${s[2]}" ${s[3] ? `data-kind="${s[3].kind}" data-id="${s[3].id}"` : ''}>${s[0]} ${esc(s[1])}</button>`).join('')}
  <div class="mact"><span class="sp"></span><button class="btn primary" data-act="closeModal">Fermer</button></div>`;
}); };
ACT.setMinutes = d => { UI.minutes = +d.v; MODALR && MODALR(); };

/** ☀️ Ma matinée */
ACT.modeMorning = () => liveModal(() => {
  const T = today(), items = itemsOn(T), first = slotsOn(T)[0], three = topThree();
  const ech = reminders(2).filter(r => r.it.kind === 'deadline' || IMPORTANT_CATS.includes(r.it.cat));
  const rap = items.filter(x => x.kind === 'event' && S.events.find(e => e.id === x.id && e.remind));
  const quick = ranked().filter(t => t.dur && t.dur <= 10).slice(0, 3);
  const row = x => `<div class="rem"><span class="dot" style="background:${x.color}"></span>${x.time ? fmtT(x.time) + ' ' : ''}${esc(x.title)}</div>`;
  return `<h2>☀️ Ma matinée</h2><div class="card info"><div class="ct">Voici les 3 choses les plus importantes aujourd’hui.</div>${three.length ? three.map((x, i) => `<div class="big3">${i + 1}. ${x.html}</div>`).join('') : '<div class="mut">Rien d’important : journée tranquille 🌿</div>'}</div>
  <h3>1. Événements du jour</h3>${items.filter(x => x.kind === 'event' || x.kind === 'family').map(row).join('') || empty('Aucun événement.')}
  <h3>2. Premier cours</h3>${first ? `<div class="card">${esc(courseText(first))}</div>` : empty('Pas de cours aujourd’hui.')}
  <h3>3. Tâches prioritaires</h3>${ranked().filter(t => score(t) >= 50).slice(0, 3).map(taskCard).join('') || empty('Aucune tâche prioritaire.')}
  <h3>4. Échéances</h3>${ech.map(r => `<div class="rem"><b>${relDay(r.date)}</b> ${esc(r.it.title)}</div>`).join('') || empty('Aucune échéance proche.')}
  <h3>5. Rappels</h3>${rap.map(row).join('') + urgentMakeups().map(m => `<div class="rem">⏳ Rattrapage ${esc((byId(S.classes, m.classId) || {}).name || '')} : ${hFmt(makeupLeft(m))} restantes</div>`).join('') || empty('Aucun rappel.')}
  <h3>6. Tâches rapides</h3>${quick.map(taskCard).join('') || empty('Aucune tâche rapide estimée.')}
  <h3>🔁 Routine</h3>${routineBlock(byId(S.routines, 'matin'))}
  <div class="mact"><span class="sp"></span><button class="btn primary" data-act="closeModal">C’est parti 💪</button></div>`;
});

/** 🌙 Ma fin de journée */
ACT.modeEvening = () => {
  const T = today(), tm = addDays(T, 1);
  liveModal(() => {
    const done = S.tasks.filter(t => t.done && t.doneDate === T), left = openTasks().filter(t => t.due && t.due <= T);
    const evs = itemsOn(tm).filter(x => x.kind === 'event' || x.kind === 'family'), cours = slotsOn(tm), remT = reminders(1).filter(r => r.date === tm);
    return `<h2>🌙 Ma fin de journée</h2>
    <h3>✅ Terminées aujourd’hui (${done.length})</h3>${done.length ? done.map(t => `<div class="mini dim"><span>✔ ${esc(t.title)}</span></div>`).join('') : empty('Aucune pour le moment.')}
    <h3>⏳ Restantes (${left.length})</h3>${left.length ? left.map(t => `<div class="mini"><button class="chk" data-act="toggleTaskModal" data-id="${t.id}" aria-label="Terminer"></button><span>${PRIO[t.prio].i} ${esc(t.title)}</span><button class="ib" data-act="postponeTask" data-id="${t.id}" aria-label="Reporter">⏭</button></div>`).join('') : empty('Tout est fait 🎉')}
    <h3>📅 Événements de demain (${fmtShort(tm)})</h3>${evs.length ? evs.map(x => `<div class="rem"><span class="dot" style="background:${x.color}"></span>${x.time ? fmtT(x.time) + ' ' : ''}${esc(x.title)}</div>`).join('') : empty('Rien de prévu.')}
    <h3>🏫 Cours de demain</h3>${cours.length ? cours.map(s => `<div class="rem">${esc(courseText(s))}</div>`).join('') : empty('Pas de cours demain.')}
    ${remT.length ? `<h3>🔔 Rappels importants</h3>${remT.map(r => `<div class="rem">${esc(r.it.title)}</div>`).join('')}` : ''}
    <h3>🔁 Routine</h3>${routineBlock(byId(S.routines, 'soir'))}
    <div class="mact">${left.length ? '<button class="btn" data-act="postponeAllToday">⏭ Reporter les tâches restantes</button>' : ''}<span class="sp"></span><button class="btn primary" data-act="closeModal">Bonne soirée</button></div>`;
  });
};
ACT.postponeAllToday = () => { const l = openTasks().filter(t => t.due && t.due <= today()); l.forEach(t => t.due = addDays(today(), 1)); save(); render(); toast(`⏭ ${l.length} tâche(s) reportée(s) à demain`); };

/* Résumé de la semaine (automatisation du lundi) */
ACT.weekSummary = () => {
  const mon = mondayOf(today());
  openModal(`<h2>📅 Voici ta semaine</h2><div class="mut">Semaine ${weekType(mon)}</div>${Array.from({ length: 7 }, (_, i) => {
    const ds = addDays(mon, i), its = itemsOn(ds); if (!its.length) return '';
    return `<h3>${fmtLong(ds)}${ds === today() ? ' · aujourd’hui' : ''}</h3>${its.map(x => `<div class="rem"><span class="dot" style="background:${x.color}"></span>${x.time ? fmtT(x.time) + ' ' : ''}${esc(x.title)}</div>`).join('')}`;
  }).join('') || empty('Semaine libre.')}<div class="mact"><span class="sp"></span><button class="btn primary" data-act="closeModal">C’est parti</button></div>`);
};
/* Bilan du mois */
ACT.bilan = d => {
  const ym = d.ym || (new Date().getDate() <= 2 ? shiftYM(curYM(), -1) : curYM());
  const done = S.tasks.filter(t => t.done && (t.doneDate || '').startsWith(ym)).length, late = openTasks().filter(t => t.due && t.due < today()).length;
  const sess = S.sessions.filter(s => s.status === 'Réalisée' && (s.date || '').startsWith(ym)).length;
  const A = S.asso.tx.filter(t => t.date.startsWith(ym)), rec = sum(A.filter(t => t.type === 'in'), 'amount'), dep = sum(A.filter(t => t.type === 'out'), 'amount');
  const b = budgetCalc(ym);
  openModal(`<h2>📊 Bilan de ${ymLabel(ym)}</h2><div class="tiles">${tile('Tâches terminées', done)}${tile('En retard', late)}${tile('Séances réalisées', sess)}</div>
  <h3>💰 Budget</h3><div class="mini"><span>Dépenses variables : <b>${money(b.spent)}</b> · reste disponible : <b>${money(b.left)}</b></span></div>${b.alerts.map(a => `<div class="alert">⚠️ ${esc(a.text)}</div>`).join('')}
  <h3>🏢 Association</h3><div class="mini"><span>Recettes ${money(rec)} · Dépenses ${money(dep)} · Solde du mois <b>${money(rec - dep)}</b></span></div>
  <h3>📁 Projets</h3>${S.projects.map(p => `<div class="proj"><div class="pt">${esc(p.title)}</div>${bar(projProgress(p))}</div>`).join('') || empty('—')}
  <div class="mact"><span class="sp"></span><button class="btn primary" data-act="closeModal">Fermer</button></div>`);
};

