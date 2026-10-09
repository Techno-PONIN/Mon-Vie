/* ===== PARAMÈTRES ===== */
VIEWS.settings = () => {
  const s = S.settings, n = s.notif, set = (path, type = '') => `data-set="${path}" data-type="${type}"`;
  const chk = (path, label) => `<label class="chkrow"><input type="checkbox" ${set(path, 'bool')} ${path.split('.').reduce((o, k) => o[k], S) ? 'checked' : ''}> ${label}</label>`;
  return `
  ${sec('👤 Profil', `<div class="fld"><label>Prénom</label><input ${set('settings.name')} value="${esc(s.name)}"></div><div class="fld"><label>Matière enseignée</label><input ${set('settings.subject')} value="${esc(s.subject)}"></div>`)}
  ${sec('🎨 Apparence', `<div class="fld"><label>Thème</label><select ${set('settings.theme')}>${[['auto', 'Automatique'], ['light', 'Clair'], ['dark', 'Sombre']].map(([k, l]) => `<option value="${k}" ${s.theme === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div><div class="fld"><label>Couleur principale</label><input type="color" ${set('settings.color')} value="${s.color}"></div>`)}
  ${sec('🏫 Professeur', `<div class="fld"><label>Cette semaine est une semaine…</label><select data-set-week><option value="A" ${weekType(today()) === 'A' ? 'selected' : ''}>A</option><option value="B" ${weekType(today()) === 'B' ? 'selected' : ''}>B</option></select></div>
    <div class="fld"><label>Établissements (un par ligne)</label><textarea rows="3" ${set('settings.etabs', 'list')}>${esc(s.etabs.join('\n'))}</textarea></div>
    <div class="row"><button class="btn" data-act="goProfClasses">Classes</button><button class="btn" data-act="goProfEdt">Horaires</button></div>`)}
  ${sec('✅ Catégories de tâches', `<div class="fld"><textarea rows="2" ${set('settings.cats', 'list')}>${esc(s.cats.join(', '))}</textarea><small class="mut">Séparées par des virgules.</small></div>`)}
  ${sec('💰 Budget : catégories et limites', `<div class="fld"><label>Catégories de dépenses (séparées par des virgules)</label><textarea rows="2" ${set('budget.cats', 'list')}>${esc(bcats().join(', '))}</textarea></div>` + bcats().map(c => `<div class="fld half"><label>${c}</label><input type="number" step="any" ${set('budget.limits.' + c, 'num')} value="${S.budget.limits[c] ?? 0}"></div>`).join(''))}
  ${sec('🥗 Habitudes alimentaires', `<div class="fld"><textarea rows="2" placeholder="ex : peu de viande rouge, pas de porc, repas rapides en semaine…" ${set('settings.foodPrefs')}>${esc(s.foodPrefs)}</textarea></div>`)}
  ${sec('🔔 Rappels', `<div class="fld"><label>Prévenir avant un cours (minutes)</label><input type="number" ${set('settings.notif.coursLead', 'num')} value="${n.coursLead}"></div>
    ${chk('settings.notif.cours', 'Cours')}${chk('settings.notif.makeups', 'Rattrapages urgents')}${chk('settings.notif.events', 'Rendez-vous / événements')}${chk('settings.notif.echeance', 'Échéances (la veille)')}${chk('settings.notif.courses', 'Courses : ingrédients manquants')}${chk('settings.notif.budget', 'Alertes budget')}
    ${chk('settings.notif.weekly', 'Lundi matin : « Voici ta semaine »')}${chk('settings.notif.daily', 'Fin de journée : tâches importantes restantes')}${chk('settings.notif.monthly', 'Fin de mois : bilan')}${chk('settings.notif.backup', 'Rappel de sauvegarde mensuel')}
    <div class="row"><button class="btn" data-act="enableBrowserNotif">Activer les notifications du navigateur</button></div><small class="mut">Les rappels fonctionnent quand l’application est ouverte (aucun serveur n’est utilisé).</small>`)}
  ${sec('🌤 Météo', `${chk('settings.weather', 'Afficher la météo (Open-Meteo, seules les coordonnées de la ville sont envoyées)')}<div class="fld"><label>Ville</label><input ${set('settings.city')} value="${esc(s.city)}"></div><div class="fld half"><label>Latitude</label><input type="number" step="any" ${set('settings.lat', 'num')} value="${s.lat}"></div><div class="fld half"><label>Longitude</label><input type="number" step="any" ${set('settings.lon', 'num')} value="${s.lon}"></div>`)}
  ${sec('💾 Mes données', `<div class="row wrap"><button class="btn primary" data-act="exportJSON">⬇ Exporter (JSON)</button><button class="btn" data-act="importJSON">⬆ Importer</button><button class="btn" data-act="csvAsso">CSV association</button><button class="btn" data-act="csvBudget">CSV budget</button></div>
    <input type="file" id="importFile" accept=".json,application/json" hidden>
    <div class="mut sm">Dernière sauvegarde : ${S.flags.lastExport ? fmtLong(S.flags.lastExport) : 'jamais'}. Les données restent sur cet appareil ; l’export sert à les sauvegarder ou à changer d’appareil.</div>
    <div class="row wrap"><button class="btn" data-act="loadDemo">🧪 Charger les données de démonstration</button><button class="btn" data-act="clearDemo">Effacer les données de démonstration</button><button class="btn danger" data-act="resetAll">⚠️ Tout effacer</button></div>`)}
  <p class="mut sm center">Mon Centre de commande · 100 % local · aucune publicité · aucun suivi<br>🤖 L’assistant est local : aucune IA externe n’est connectée.</p>`;
};
ACT.goProfClasses = () => { UI.prof = 'classes'; go('prof'); }; ACT.goProfEdt = () => { UI.prof = 'edt'; go('prof'); };
document.addEventListener('change', e => {
  const el = e.target;
  if (el.matches && el.matches('.quick input[type=date]')) el.classList.toggle('has', !!el.value);
  if (el.dataset.set) {
    const path = el.dataset.set.split('.'), last = path.pop(), obj = path.reduce((o, k) => o[k], S), t = el.dataset.type;
    let v = el.type === 'checkbox' ? el.checked : el.value;
    if (t === 'num') v = Number(v) || 0; else if (t === 'list') v = String(v).split(/[\n,]+/).map(x => x.trim()).filter(Boolean);
    obj[last] = v; save(); applyTheme(); if (el.dataset.set === 'budget.cats') render(); if (['asso.opening'].includes(el.dataset.set)) render(); if (el.dataset.set.startsWith('settings.weather') || el.dataset.set.startsWith('settings.lat') || el.dataset.set.startsWith('settings.lon')) { localStorage.removeItem('weather-cache'); }
  } else if (el.dataset.setWeek !== undefined) {
    const mon = mondayOf(today()); S.settings.weekRef = el.value === 'A' ? mon : addDays(mon, -7); save(); toast('Semaine ' + el.value + ' enregistrée');
  } else if (el.dataset.range) {
    const v = +el.value;
    if (el.dataset.range === 'class') byId(S.classes, el.dataset.id).progress = v; else byId(S.projects, el.dataset.id).value = v;
    save(); MODALR && MODALR(); render();
  } else if (el.id === 'importFile') importFile(el.files[0]);
});
document.addEventListener('input', e => { const el = e.target; if (el.dataset.setUi) { UI[el.dataset.setUi] = el.value; const pos = el.selectionStart; render(); const n = $('[data-set-ui]'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } } });

