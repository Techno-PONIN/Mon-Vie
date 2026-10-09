'use strict';
/* =====================================================================
   assistant.js — assistant LOCAL (sans internet, sans IA externe).
   Il comprend des questions simples par mots-clés et répond en calculant
   à partir de TES données. Il ne devine rien : s'il ne comprend pas, il le dit.

   ➜ Préparation d'une IA externe (NON connectée aujourd'hui) :
     Assistant.registerProvider(async (question, contexte) => "réponse")
     Tant qu'aucun fournisseur n'est enregistré, tout reste local.
   ===================================================================== */
const Assistant = {
  provider: null,
  registerProvider(fn) { this.provider = fn; },
  /** Résumé minimal que l'on pourrait transmettre à une IA externe (rien n'est envoyé sans fournisseur) */
  context() { return { date: today(), tachesOuvertes: openTasks().length, prochainCours: (upcomingCourses(1)[0] || {}).date || null }; }
};
const A_HELP = ['Qu’est-ce que je dois faire aujourd’hui ?', 'Que dois-je préparer ?', 'Quels cours ai-je demain ?', 'Quelles tâches sont en retard ?', 'Où en est mon budget ?', 'Que manque-t-il pour les courses ?', 'J’ai 15 minutes', 'Ajoute : appeler le garage demain', 'Qu’est-ce qui est urgent ?', 'Heures à rattraper ?'];
const li = a => a.length ? '<ul>' + a.map(x => `<li>${x}</li>`).join('') + '</ul>' : '';

/** Répond à une question ; renvoie du HTML (déjà échappé). */
function assistantAnswer(q) {
  const n = norm(q), T = today(), has = (...w) => w.some(x => n.includes(norm(x)));
  let m;
  if ((m = q.match(/^\s*(ajoute|ajouter|note|noter|rappelle[- ]moi|cree|creer)\s*(?:une? tache|la tache)?\s*[:\-]?\s*(.+)$/i)) && m[2]) {
    const p = parseQuick(m[2]); const t = addTask({ title: p.title, due: p.due, prio: p.prio, dur: p.dur, cat: p.cat }); commit();
    return `✅ Tâche ajoutée : <b>${esc(t.title)}</b>${t.due ? ' · ' + dueLabel(t.due) : ''} <small>(${esc(t.cat)}, ${PRIO[t.prio].l.toLowerCase()})</small>`;
  }
  if (has('en retard', 'retard')) {
    const l = openTasks().filter(t => t.due && t.due < T);
    return l.length ? `⏳ ${l.length} tâche(s) en retard :` + li(l.map(t => esc(t.title) + ' <small>(' + dueLabel(t.due) + ')</small>')) : '👌 Aucune tâche en retard.';
  }
  if (has('urgent')) {
    const l = openTasks().filter(t => t.prio === 'urgent'), a = attentionItems(new Set(l.map(t => t.id)));
    return (l.length ? '🔴 Tâches urgentes :' + li(l.map(t => esc(t.title))) : 'Aucune tâche marquée urgente.') + (a.length ? '⚠️ À surveiller :' + li(a.map(x => x.text)) : '');
  }
  if (has('rattrap')) {
    const l = S.makeups.filter(x => makeupLeft(x) > 0);
    return l.length ? '⏳ Heures à rattraper :' + li(l.map(x => { const c = byId(S.classes, x.classId); return `${esc(c ? c.name : '?')} : ${hFmt(makeupLeft(x))}${x.due ? ' avant le ' + fmtShort(x.due) : ''}`; })) : '🎉 Aucune heure à rattraper.';
  }
  if (has('budget', 'depens', 'argent')) {
    const b = budgetCalc(curYM());
    return `💰 Ce mois-ci : disponible <b>${money(b.left)}</b>, déjà dépensé ${money(b.spent)}, prévision de fin de mois ${money(b.forecast)}.` + li(b.alerts.map(a => esc(a.text)));
  }
  if (has('course', 'manque', 'ingredient')) {
    const miss = missingIngredients(), open = S.shop.filter(x => !x.done);
    return `🛒 ${open.length} produit(s) dans la liste.` + (miss.length ? ' Il manque pour tes repas des 3 prochains jours :' + li(miss.map(esc)) : ' Rien ne manque pour tes repas prévus.');
  }
  if (has('minute', 'min ')) {
    const k = Number((n.match(/(\d+)\s*min/) || [])[1]) || 15;
    const l = ranked().filter(t => !t.dur || t.dur <= k).slice(0, 3);
    return l.length ? `⏱ En ${k} min, tu peux faire :` + li(l.map(t => esc(t.title) + (t.dur ? ` <small>(${t.dur} min)</small>` : ''))) : `Aucune tâche courte à proposer pour ${k} min.`;
  }
  if (has('demain') && has('cours', 'emploi', 'programme', 'agenda')) {
    const D = addDays(T, 1), it = itemsOn(D);
    return `📅 ${fmtLong(D)} :` + (it.length ? li(it.map(x => (x.time ? fmtT(x.time) + ' · ' : '') + esc(x.title))) : ' rien de prévu.');
  }
  if (has('prepar')) {
    const u = upcomingCourses(3), l = u.filter(x => !S.sessions.some(s => s.classId === x.slot.classId && s.date === x.date));
    const t = ranked().filter(x => norm(x.title).includes('prepar')).slice(0, 3);
    return (l.length ? '📝 Cours sans séance préparée :' + li(l.map(x => esc(courseText(x.slot)) + ' <small>(' + relDay(x.date) + ')</small>')) : '📝 Tes prochains cours ont tous une séance.') + (t.length ? 'Tâches de préparation :' + li(t.map(x => esc(x.title))) : '');
  }
  if (has('aujourd', 'faire', 'journee', 'programme')) {
    const it = itemsOn(T), r = ranked().slice(0, 3);
    return `📅 ${fmtLong(T)} :` + (it.length ? li(it.map(x => (x.time ? fmtT(x.time) + ' · ' : '') + esc(x.title))) : ' aucun rendez-vous.') + (r.length ? '🔥 Priorités :' + li(r.map(t => esc(t.title))) : '');
  }
  if (has('bonjour', 'salut', 'coucou')) return `Bonjour ${esc(S.settings.name)} ! Pose-moi une question (ex : « Qu’est-ce que je dois faire aujourd’hui ? »).`;
  return `Je n’ai pas compris cette demande. Je suis un assistant <b>local</b> : je comprends des questions simples sur tes tâches, ton agenda, tes cours, ton budget et tes courses.` + (Assistant.provider ? '' : '<br><small>Aucune IA externe n’est connectée.</small>');
}

VIEWS.assistant = () => `<p class="mut sm">🔒 Assistant 100 % local : il répond avec tes données, sans internet. Aucune IA externe n’est connectée.</p>
  <div class="chat">${UI.chat.map(m => `<div class="msg ${m.who}">${m.who === 'me' ? esc(m.html) : m.html}</div>`).join('') || empty('Pose une question ou choisis une suggestion ci-dessous 👇')}</div>
  <form class="quick" data-form="askAssistant"><input name="q" placeholder="Ta question…" autocomplete="off" aria-label="Question"><button class="btn primary">Envoyer</button></form>
  <div class="chips">${A_HELP.map(h => `<button class="fchip" data-act="askSuggest" data-q="${esc(h)}">${esc(h)}</button>`).join('')}</div>`;
async function ask(q) {
  q = q.trim(); if (!q) return;
  UI.chat.push({ who: 'me', html: q });
  let a = assistantAnswer(q);
  if (Assistant.provider && /Je n’ai pas compris/.test(a)) { try { a = esc(await Assistant.provider(q, Assistant.context())); } catch (e) { } }
  UI.chat.push({ who: 'bot', html: a }); UI.chat = UI.chat.slice(-20); render();
  const c = $('.chat'); if (c) c.lastElementChild && c.lastElementChild.scrollIntoView({ block: 'nearest' });
}
ACT.askAssistant = (f, fd) => ask(String(fd.get('q') || ''));
ACT.askSuggest = d => ask(d.q);
ACT.goAssistant = () => go('assistant');
