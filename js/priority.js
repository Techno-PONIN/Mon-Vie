/** Interprète une phrase libre : « Préparer activité 4e pour jeudi » → titre + échéance… */
function parseQuick(raw) {
  let t = ' ' + String(raw).trim().replace(/\s+/g, ' ') + ' ';
  const out = { title: '', due: '', prio: 'normal', dur: 0, cat: null };
  const T = today(), END = '(?=\\s|[.,!?;]|$)';
  const take = re => { const m = t.match(re); if (m) t = t.replace(re, ' '); return m; };
  let m;
  // priorité
  if (take(new RegExp('(^|\\s)(urgent|urgente|urgence)' + END, 'i')) || take(/(^|\s)!!+(?=\s|$)/)) out.prio = 'urgent';
  else if (take(new RegExp('(^|\\s)(important|importante)' + END, 'i'))) out.prio = 'important';
  else if (take(new RegExp('(^|\\s)(faible priorité|faible|plus tard)' + END, 'i'))) out.prio = 'low';
  // durée
  if ((m = take(new RegExp('(^|\\s)(\\d{1,3})\\s?(min|mn|minutes?)' + END, 'i')))) out.dur = +m[2];
  else if ((m = take(new RegExp('(^|\\s)(\\d{1,2})\\s?(h|heures?)' + END, 'i')))) out.dur = +m[2] * 60;
  else if (take(new RegExp('(^|\\s)(rapide|vite fait)' + END, 'i'))) out.dur = 5;
  // dates
  const WD = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  const MO = ['janvier', 'f[ée]vrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'ao[uû]t', 'septembre', 'octobre', 'novembre', 'd[ée]cembre'];
  if (take(new RegExp('(^|\\s)(aujourd[\'’]hui|ce soir|ce matin)' + END, 'i'))) out.due = T;
  else if (take(new RegExp('(^|\\s)apr[èe]s[- ]demain' + END, 'i'))) out.due = addDays(T, 2);
  else if (take(new RegExp('(^|\\s)demain' + END, 'i'))) out.due = addDays(T, 1);
  else if ((m = take(new RegExp('(^|\\s)dans (\\d{1,2}) (jours?|semaines?)' + END, 'i')))) out.due = addDays(T, +m[2] * (/sem/i.test(m[3]) ? 7 : 1));
  else if (take(new RegExp('(^|\\s)(la )?semaine prochaine' + END, 'i'))) out.due = addDays(mondayOf(T), 7);
  else if ((m = take(new RegExp('(^|\\s)(' + WD.join('|') + ')(\\s+prochain)?' + END, 'i')))) {
    const idx = WD.indexOf(m[2].toLowerCase()); out.due = addDays(T, ((idx - (dow(T) - 1) + 7) % 7) || 7);
  } else if ((m = take(new RegExp('(^|\\s)(\\d{1,2})[/.-](\\d{1,2})(?:[/.-](\\d{2,4}))?' + END)))) {
    const y0 = new Date().getFullYear(); let y = m[4] ? (+m[4] < 100 ? 2000 + +m[4] : +m[4]) : y0;
    let d = new Date(y, +m[3] - 1, +m[2]); if (!m[4] && iso(d) < T) d = new Date(y + 1, +m[3] - 1, +m[2]);
    if (!isNaN(d)) out.due = iso(d);
  } else if ((m = take(new RegExp('(^|\\s)(?:le )?(\\d{1,2})(?:er)? (' + MO.join('|') + ')' + END, 'i')))) {
    const mi = MO.findIndex(x => new RegExp('^' + x + '$', 'i').test(m[3])); const y = new Date().getFullYear();
    let d = new Date(y, mi, +m[2]); if (iso(d) < T) d = new Date(y + 1, mi, +m[2]); out.due = iso(d);
  } else if ((m = take(new RegExp('(^|\\s)le (\\d{1,2})(?:er)?' + END, 'i')))) {
    const now = new Date(); let d = new Date(now.getFullYear(), now.getMonth(), +m[2]); if (iso(d) < T) d = new Date(now.getFullYear(), now.getMonth() + 1, +m[2]); out.due = iso(d);
  }
  // catégorie par mots-clés
  const n = norm(raw);
  const rules = [
    ['Association', /asso\b|association|cotisation|tresor|subvention|assemblee generale|\bag\b/],
    ['Courses', /courses|supermarche|a acheter/],
    ['Administratif', /impot|dossier|formulaire|declaration|attestation|mutuelle|\bcaf\b|inscription|facture|rectorat|administratif|papier/],
    ['Famille', /creche|ecole|enfant|famille|anniversaire|pediatre|medecin|nounou/],
    ['Maison', /menage|\breparer|ranger|linge|jardin|maison|bricol|lessive/],
    ['Projets', /projet/],
    ['Travail', /cours|classe|eleve|\b[3-6]e\b|activite|seance|evaluation|devoir|\btp\b|pronote|college|conseil de classe|reunion|sequence|correction|copies/]
  ];
  for (const [c, re] of rules) if (re.test(n)) { out.cat = c; break; }
  // nettoyage du titre
  t = t.replace(/\s+/g, ' ').trim();
  const dangling = /(^|\s)(pour le|pour|avant le|avant|d['’]ici|pour la|le|la|à|au|vers)$/i;
  while (dangling.test(t)) t = t.replace(dangling, '').trim();
  out.title = cap(t.replace(/^[-–:,\s]+|[-–:,\s]+$/g, '')) || cap(String(raw).trim());
  return out;
}

/** « Que dois-je faire ? » — score de priorité d'une tâche :
    urgence/importance (priorité choisie) + proximité de l'échéance + retard + statut − effort.
    Aucune tâche n'est jamais supprimée automatiquement : le score ne fait que trier. */
const PW = { urgent: 100, important: 60, normal: 30, low: 10 };
function score(t) {
  let s = PW[t.prio] ?? 30;                                   // urgence + importance
  if (t.due) {
    const d = diffDays(t.due, today());
    if (d < 0) s += 80 + Math.min(-d, 10) * 4;                // retard
    else if (d === 0) s += 70; else if (d === 1) s += 45;     // proximité de l'échéance
    else if (d <= 3) s += 25; else if (d <= 7) s += 10;
  }
  if (t.status === 'doing') s += 12;                          // déjà commencée : on la termine
  if (t.status === 'wait') s -= 40;                           // en attente d'autrui
  if (t.dur && t.dur <= 15) s += 4;                           // tâche rapide
  s -= Math.min(t.dur || 0, 180) / 15;                        // effort (jusqu'à −12)
  return s;
}
const openTasks = () => S.tasks.filter(t => !t.done);
const ranked = () => openTasks().filter(t => t.status !== 'wait').sort((a, b) => score(b) - score(a));
