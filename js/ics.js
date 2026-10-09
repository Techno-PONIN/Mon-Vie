'use strict';
/* =====================================================================
   ics.js — import / export de calendriers au format .ics (iCalendar)
   • Import : Pronote, Apple Calendrier, Google Agenda… (copie à un instant donné)
   • Export : tes événements et échéances, à ouvrir dans Calendrier Apple
   Tout se passe sur l'appareil : le fichier n'est envoyé nulle part.
   ===================================================================== */
const unEsc = s => String(s || '').replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');
/** Transforme le texte d'un fichier .ics en liste d'événements simples. */
function parseICS(text) {
  const lines = String(text).replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n');   // « dé-pliage » des lignes longues
  const out = []; let ev = null;
  const toLocal = (val, params) => {
    const m = /^(\d{4})(\d\d)(\d\d)(?:T(\d\d)(\d\d)(\d\d)?)?(Z)?$/.exec(val.trim()); if (!m) return null;
    if (!m[4] || /VALUE=DATE/i.test(params)) return { date: `${m[1]}-${m[2]}-${m[3]}`, time: '', allDay: true };
    let d = m[7] ? new Date(Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0))) : new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));   // Z = UTC → heure locale de l'appareil
    return { date: iso(d), time: `${pad(d.getHours())}:${pad(d.getMinutes())}`, min: d.getTime() / 60000, allDay: false };
  };
  for (const ln of lines) {
    if (ln === 'BEGIN:VEVENT') { ev = {}; continue; }
    if (ln === 'END:VEVENT') { if (ev && ev.s) out.push(ev); ev = null; continue; }
    if (!ev) continue;
    const i = ln.indexOf(':'); if (i < 0) continue;
    const [name, ...pr] = ln.slice(0, i).split(';'), params = pr.join(';'), val = ln.slice(i + 1), k = name.toUpperCase();
    if (k === 'DTSTART') ev.s = toLocal(val, params); else if (k === 'DTEND') ev.e = toLocal(val, params);
    else if (k === 'SUMMARY') ev.title = unEsc(val); else if (k === 'LOCATION') ev.place = unEsc(val);
    else if (k === 'DESCRIPTION') ev.desc = unEsc(val); else if (k === 'UID') ev.uid = val; else if (k === 'CATEGORIES') ev.cats = unEsc(val);
    else if (k === 'RRULE') ev.rrule = val;
  }
  return out;
}
const icsCancelled = e => /annul|absent|abs\b/i.test((e.cats || '') + ' ' + (e.title || ''));
let ICS_PENDING = null;
ACT.importICS = () => $('#icsFile').click();
function icsFileChosen(file) {
  if (!file) return; const r = new FileReader();
  r.onload = () => {
    const evs = parseICS(r.result);
    if (!evs.length) return window.alert('Aucun événement trouvé dans ce fichier. Est-ce bien un fichier .ics ?');
    ICS_PENDING = evs;
    const dates = evs.map(e => e.s.date).sort(), canc = evs.filter(icsCancelled).length, rec = evs.filter(e => e.rrule).length;
    openForm({
      title: '📅 Importer un calendrier', submit: 'Importer', values: { etab: '', skipCancel: true, replace: true },
      top: `<div class="hint"><b>${evs.length}</b> événements du <b>${fmtShort(dates[0])}</b> au <b>${fmtShort(dates[dates.length - 1])}</b>${canc ? ` dont ${canc} annulé(s) / absence(s)` : ''}.${rec ? `<br>⚠️ ${rec} événement(s) répétitif(s) : seule la première date est importée.` : ''}</div>`,
      fields: [
        { k: 'etab', label: 'Nom de ce calendrier (ex : Collège du Salagou)', list: S.settings.etabs, req: true },
        { k: 'skipCancel', label: 'Ne pas importer les cours annulés / absences', type: 'checkbox' },
        { k: 'replace', label: 'Remplacer l’import précédent de ce même calendrier (évite les doublons)', type: 'checkbox' }
      ],
      onSubmit: v => {
        let list = ICS_PENDING; ICS_PENDING = null;
        if (v.skipCancel) list = list.filter(e => !icsCancelled(e));
        if (v.replace) S.events = S.events.filter(e => !(e.src === 'ics' && e.cal === v.etab));
        const seen = new Set(S.events.filter(e => e.src === 'ics').map(e => e.cal + '|' + e.key));
        let n = 0;
        list.forEach(e => {
          const key = (e.uid || '') + e.s.date + e.s.time + (e.title || ''); if (seen.has(v.etab + '|' + key)) return;
          const dur = e.e && !e.s.allDay && e.e.min != null ? Math.max(0, Math.round(e.e.min - e.s.min)) : (e.s.allDay ? 480 : 0);
          S.events.push({ id: uid(), title: (icsCancelled(e) ? '❌ ' : '') + (e.title || 'Sans titre'), date: e.s.date, time: e.s.time, dur, cat: 'travail', place: e.place || '', remind: 0, notes: v.etab, src: 'ics', cal: v.etab, key });
          n++;
        });
        if (v.etab && !S.settings.etabs.includes(v.etab)) S.settings.etabs.push(v.etab);
        commit(); toast(`📅 ${n} événement(s) importé(s)`);
      },
      onDelete: null
    });
  };
  r.readAsText(file);
}
ACT.deleteICS = () => {
  const n = S.events.filter(e => e.src === 'ics').length;
  if (!n) return toast('Aucun événement importé');
  if (confirmDel(`Supprimer les ${n} événements importés depuis des fichiers .ics ?`)) { S.events = S.events.filter(e => e.src !== 'ics'); commit(); toast('🧹 Imports supprimés'); }
};
/** Export : tes événements (hors imports) et tes tâches datées → fichier .ics pour Calendrier Apple */
ACT.exportICS = () => {
  const esc2 = s => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z', d8 = s => s.replace(/-/g, '');
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Centre de commande//FR', 'CALSCALE:GREGORIAN'];
  const add = (uidv, title, date, time, dur, place, notes) => {
    L.push('BEGIN:VEVENT', `UID:${uidv}@centre-de-commande`, `DTSTAMP:${stamp}`, `SUMMARY:${esc2(title)}`);
    if (time) { const a = toMin(time), b = a + (Number(dur) || 60); L.push(`DTSTART:${d8(date)}T${time.replace(':', '')}00`, `DTEND:${d8(date)}T${fromMin(Math.min(b, 1439)).replace(':', '')}00`); }
    else L.push(`DTSTART;VALUE=DATE:${d8(date)}`, `DTEND;VALUE=DATE:${d8(addDays(date, 1))}`);
    if (place) L.push(`LOCATION:${esc2(place)}`); if (notes) L.push(`DESCRIPTION:${esc2(notes)}`);
    L.push('END:VEVENT');
  };
  S.events.filter(e => e.src !== 'ics').forEach(e => add(e.id, e.title, e.date, e.time, e.dur, e.place, e.notes));
  S.tasks.filter(t => !t.done && t.due).forEach(t => add(t.id, '✅ ' + t.title, t.due, '', 0, '', t.cat));
  L.push('END:VCALENDAR');
  const n = L.filter(x => x === 'BEGIN:VEVENT').length; if (!n) return toast('Rien à exporter');
  downloadFile(`centre-de-commande-agenda-${today()}.ics`, L.join('\r\n'), 'text/calendar');
  toast(`⬇ ${n} élément(s) exportés`);
};
