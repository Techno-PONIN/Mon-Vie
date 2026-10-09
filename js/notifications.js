/* ----- Notifications internes ----- */
let NQ = [];
function pushNotif(key, text, o = {}) {
  if (S.flags.seen[key]) return;
  S.flags.seen[key] = Date.now();
  S.notifs.unshift({ id: uid(), text, at: Date.now(), act: o.act || '', data: o.data || {}, read: false });
  S.notifs.length = Math.min(S.notifs.length, 60);
  save(); updateBadges(); NQ.push({ text, o });
  if (S.settings.notif.browser && 'Notification' in window && Notification.permission === 'granted') { try { new Notification('Centre de commande', { body: text, icon: 'icon-192.png' }); } catch (e) { } }
}
function checkNotifs() {
  if (!S) return;
  NQ = []; runChecks();
  if (NQ.length === 1) { const { text, o } = NQ[0]; toast(text, o.act ? { label: 'Voir', fn: () => ACT[o.act] && ACT[o.act](o.data || {}) } : null); }
  else if (NQ.length > 1) toast(`🔔 ${NQ.length} nouvelles notifications`, { label: 'Voir', fn: () => ACT.bell() });
  NQ = [];
}
function runChecks() {
  const n = S.settings.notif, T = today(), nm = nowMin(), tm = addDays(T, 1), seen = S.flags.seen;
  Object.keys(seen).forEach(k => { if (Date.now() - seen[k] > 14 * 864e5) delete seen[k]; });
  if (n.cours) slotsOn(T).forEach(s => { const d = toMin(s.start) - nm; if (d >= 0 && d <= n.coursLead) pushNotif(`c-${T}-${s.id}`, `🔔 Dans ${d} min : ${courseText(s).replace(/^\S+ — /, '')}`, { act: 'goProf' }); });
  if (n.events) S.events.filter(e => e.date === T && e.time && e.remind).forEach(e => { const d = toMin(e.time) - nm; if (d >= 0 && d <= e.remind) pushNotif(`e-${e.id}-${T}`, `🔔 Dans ${d} min : ${e.title}`); });
  if (n.echeance) {
    S.tasks.filter(t => !t.done && t.due === tm).forEach(t => pushNotif(`d-${t.id}-${T}`, `⚠️ Échéance demain : ${t.title}`, { act: 'goTasks' }));
    S.asso.deadlines.filter(x => x.date === tm && x.status !== 'Fait').forEach(x => pushNotif(`d-${x.id}-${T}`, `⚠️ Échéance demain : ${x.title}`));
    S.events.filter(e => e.date === tm && IMPORTANT_CATS.includes(e.cat)).forEach(e => pushNotif(`d-${e.id}-${T}`, `⚠️ Échéance demain : ${e.title}`));
    const late = openTasks().filter(t => t.due && t.due < T).length; if (late && nm >= 7 * 60) pushNotif(`late-${T}`, `⏳ ${late} tâche${late > 1 ? 's' : ''} en retard`, { act: 'goTasks' });
  }
  if (n.makeups) urgentMakeups().forEach(m => { const c = byId(S.classes, m.classId); pushNotif(`mk-${m.id}-${T}`, `⏳ Rattrapage ${c ? c.name : ''} : ${hFmt(makeupLeft(m))} à faire avant le ${fmtShort(m.due)}`, { act: 'goProf' }); });
  if (n.courses) { const m = missingIngredients(); if (m.length && nm >= 8 * 60) pushNotif(`m-${T}`, `🛒 Il manque ${m.length} produit${m.length > 1 ? 's' : ''} dans ta liste de courses`, { act: 'goCourses' }); }
  if (n.budget) budgetCalc(curYM()).alerts.forEach(a => pushNotif(`b-${curYM()}-${a.cat}-${a.level}`, '⚠️ ' + a.text, { act: 'goBudget' }));
  if (n.weekly && dow(T) === 1 && nm >= 5 * 60) pushNotif(`w-${T}`, '📅 Voici ta semaine.', { act: 'weekSummary' });
  if (n.daily && nm >= 17 * 60) { const k = openTasks().filter(t => ['urgent', 'important'].includes(t.prio) && (!t.due || t.due <= T)).length; if (k) pushNotif(`f-${T}`, `🌙 Il reste ${k} tâche${k > 1 ? 's' : ''} importante${k > 1 ? 's' : ''}.`, { act: 'modeEvening' }); }
  if (n.monthly) {
    if (addDays(T, 1).slice(0, 7) !== curYM() && nm >= 17 * 60) pushNotif(`mo-${curYM()}`, '📊 Voici ton bilan du mois.', { act: 'bilan', data: { ym: curYM() } });
    else if (T.endsWith('-01')) pushNotif(`mo-${shiftYM(curYM(), -1)}`, '📊 Voici ton bilan du mois dernier.', { act: 'bilan', data: { ym: shiftYM(curYM(), -1) } });
  }
  if (n.backup) { const ref = S.flags.lastExport || S.flags.installed || T; if (diffDays(T, ref) > 30) pushNotif(`bk-${curYM()}`, '💾 Pense à sauvegarder tes données (Paramètres → Exporter).', { act: 'goSettings' }); }
}
ACT.enableBrowserNotif = async () => {
  if (!('Notification' in window)) return toast('Notifications non disponibles sur cet appareil');
  const r = await Notification.requestPermission(); S.settings.notif.browser = r === 'granted'; save(); toast(r === 'granted' ? '🔔 Notifications activées (application ouverte)' : 'Autorisation refusée');
};
ACT.bell = () => {
  S.notifs.forEach(x => x.read = true); save(); updateBadges();
  openModal(`<h2>🔔 Notifications</h2>${S.notifs.length ? S.notifs.map(x => `<div class="mini" ${x.act ? `data-act="notifGo" data-a="${x.act}" data-ym="${x.data.ym || ''}"` : ''}><span>${esc(x.text)} <small class="mut">${new Date(x.at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</small></span></div>`).join('') : empty('Aucune notification.')}
  <div class="mact">${S.notifs.length ? '<button class="btn" data-act="clearNotifs">Tout effacer</button>' : ''}<span class="sp"></span><button class="btn primary" data-act="closeModal">Fermer</button></div>`);
};
ACT.notifGo = d => { closeModal(); ACT[d.a] && ACT[d.a]({ ym: d.ym }); };
ACT.clearNotifs = () => { S.notifs = []; save(); closeModal(); updateBadges(); };

