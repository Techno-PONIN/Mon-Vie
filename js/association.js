/* ===== ASSOCIATION ===== */
VIEWS.asso = () => {
  const A = S.asso, ym = UI.am;
  const tabsH = tabs(UI.aTab, [['fin', '💶 Trésorerie'], ['ech', '📋 Échéances'], ['doc', '📄 Documents']], 'aTab');
  if (UI.aTab === 'doc') {
    const l = [...(A.docs || [])].sort((a, b) => a.title.localeCompare(b.title));
    return tabsH + sec('Documents importants', l.length ? l.map(d => `<div class="card click" data-act="editAssoDoc" data-id="${d.id}"><div class="ct">📄 ${esc(d.title)}</div><div class="mut">${d.place ? '📍 ' + esc(d.place) : ''}${d.date ? ' · ' + fmtShort(d.date) : ''}</div>${d.notes ? `<div class="sm">${esc(d.notes)}</div>` : ''}</div>`).join('') : empty('Référence ici tes documents importants (statuts, assurance, bilans…) et l’endroit où les retrouver.'), `<button class="btn sm primary" data-act="newAssoDoc">+ Document</button>`);
  }
  if (UI.aTab === 'ech') {
    const l = [...A.deadlines].sort((a, b) => a.date.localeCompare(b.date));
    return tabsH + sec('Échéances', `<div class="tscroll"><table class="tbl"><tr><th>Échéance</th><th>Date</th><th>Statut</th><th>Priorité</th></tr>${l.map(d => `<tr class="${d.status !== 'Fait' && d.date < today() ? 'late' : ''}" data-act="editDeadline" data-id="${d.id}"><td>${esc(d.title)}</td><td>${fmtShort(d.date)}</td><td><span class="st st-${norm(d.status).replace(/\s/g, '')}" data-act="cycleDeadline" data-id="${d.id}">${d.status}</span></td><td>${PRIO[d.prio].i} ${PRIO[d.prio].l}</td></tr>`).join('') || '<tr><td colspan="4" class="mut">Aucune échéance.</td></tr>'}</table></div>`, `<button class="btn sm primary" data-act="newDeadline">+ Échéance</button><button class="btn sm" data-act="csvAsso2">CSV</button>`);
  }
  const bal = Number(A.opening || 0) + sum(A.tx.filter(t => t.type === 'in'), 'amount') - sum(A.tx.filter(t => t.type === 'out'), 'amount');
  const mt = A.tx.filter(t => t.date.startsWith(ym)), rec = sum(mt.filter(t => t.type === 'in'), 'amount'), dep = sum(mt.filter(t => t.type === 'out'), 'amount');
  const months = Array.from({ length: 6 }, (_, i) => shiftYM(curYM(), i - 5)), vals = months.map(m => [sum(A.tx.filter(t => t.date.startsWith(m) && t.type === 'in'), 'amount'), sum(A.tx.filter(t => t.date.startsWith(m) && t.type === 'out'), 'amount')]), mx = Math.max(1, ...vals.flat());
  return tabsH + `<div class="calbar"><button class="ib" data-act="amNav" data-v="-1">‹</button><h2>${ymLabel(ym)}</h2><button class="ib" data-act="amNav" data-v="1">›</button></div>
  <div class="tiles">${tile('Solde', money(bal), 'total')}${tile('Recettes', money(rec), 'ce mois')}${tile('Dépenses', money(dep), 'ce mois')}${tile('Solde mensuel', money(rec - dep))}</div>
  ${sec('Évolution (6 mois)', `<div class="chart">${months.map((m, i) => `<div class="cb"><div class="cbars"><i class="in" style="height:${vals[i][0] / mx * 100}%" title="${money(vals[i][0])}"></i><i class="out" style="height:${vals[i][1] / mx * 100}%" title="${money(vals[i][1])}"></i></div><small>${MONTHS[+m.slice(5) - 1].slice(0, 3)}</small></div>`).join('')}</div><div class="mut sm"><span class="lg in"></span> recettes <span class="lg out"></span> dépenses</div>`)}
  ${sec('Opérations', (mt.length ? [...mt].sort((a, b) => b.date.localeCompare(a.date)).map(t => `<div class="mini" data-act="editAssoTx" data-id="${t.id}"><span class="${t.type === 'in' ? 'pos' : 'neg'}"><b>${t.type === 'in' ? '+' : '−'}${money(t.amount)}</b></span><span> ${esc(t.cat)} · ${fmtShort(t.date)} ${t.comment ? '· ' + esc(t.comment) : ''} <small>${esc(t.pay || '')}${t.proof ? ' · ' + esc(t.proof) : ''}</small></span></div>`).join('') : empty('Aucune opération ce mois-ci.')), `<button class="btn sm primary" data-act="newAssoTx" data-type="out">− Dépense</button><button class="btn sm" data-act="newAssoTx" data-type="in">+ Recette</button><button class="btn sm" data-act="csvAsso">CSV</button>`)}
  <div class="row"><label class="mut sm">Solde initial du compte : </label><input type="number" step="any" style="max-width:130px" value="${A.opening || 0}" data-set="asso.opening" data-type="num"></div>`;
};
ACT.newAssoDoc = () => assoDocForm(null); ACT.editAssoDoc = d => assoDocForm(d.id);
function assoDocForm(id) {
  const x = id ? byId(S.asso.docs, id) : null;
  openForm({
    title: x ? 'Modifier le document' : 'Nouveau document', values: x || {},
    fields: [{ k: 'title', label: 'Document', req: true, list: ['Statuts', 'Récépissé de déclaration', 'Contrat d’assurance', 'Procès-verbal d’assemblée', 'Bilan financier', 'Relevé bancaire'] }, { k: 'place', label: 'Où le trouver (dossier, classeur, lien…)' }, { k: 'date', label: 'Date / validité', type: 'date' }, { k: 'notes', label: 'Notes', type: 'textarea', rows: 2 }],
    onSubmit: v => { if (x) Object.assign(x, v); else S.asso.docs.push({ id: uid(), ...v }); commit(); },
    onDelete: x ? () => { if (confirmDel()) { removeId(S.asso.docs, id); closeModal(); commit(); } } : null
  });
}
ACT.aTab = d => { UI.aTab = d.v; render(); }; ACT.amNav = d => { UI.am = shiftYM(UI.am, +d.v); render(); };
ACT.newAssoTx = d => assoTxForm(null, d.type); ACT.editAssoTx = d => assoTxForm(d.id);
function assoTxForm(id, type) {
  const t = id ? byId(S.asso.tx, id) : null;
  openForm({
    title: t ? 'Modifier l’opération' : (type === 'in' ? 'Nouvelle recette' : 'Nouvelle dépense'), values: t || { type, date: today(), pay: 'Virement', cat: 'Autres' },
    fields: [{ k: 'type', label: 'Type', type: 'select', half: true, opts: [['in', 'Recette'], ['out', 'Dépense']] }, { k: 'amount', label: 'Montant (€)', type: 'number', req: true, half: true }, { k: 'date', label: 'Date', type: 'date', req: true, half: true }, { k: 'cat', label: 'Catégorie', type: 'select', half: true, opts: ASSOCATS }, { k: 'pay', label: 'Moyen de paiement', type: 'select', opts: PAYS }, { k: 'proof', label: 'Justificatif (n° facture, référence…)' }, { k: 'comment', label: 'Commentaire' }],
    onSubmit: v => { if (t) Object.assign(t, v); else S.asso.tx.push({ id: uid(), ...v }); commit(); },
    onDelete: t ? () => { if (confirmDel()) { removeId(S.asso.tx, id); closeModal(); commit(); } } : null
  });
}
ACT.newDeadline = () => deadlineForm(null); ACT.editDeadline = d => deadlineForm(d.id);
ACT.cycleDeadline = (d, el, ev) => { ev.stopPropagation(); const x = byId(S.asso.deadlines, d.id), L = ['À faire', 'En cours', 'Fait']; x.status = L[(L.indexOf(x.status) + 1) % 3]; commit(); };
function deadlineForm(id) {
  const x = id ? byId(S.asso.deadlines, id) : null;
  openForm({
    title: x ? 'Modifier l’échéance' : 'Nouvelle échéance', values: x || { date: today(), status: 'À faire', prio: 'normal' },
    fields: [{ k: 'title', label: 'Échéance', req: true, list: ['Facture à payer', 'Déclaration en préfecture', 'Assemblée générale', 'Renouvellement assurance', 'Document à archiver', 'Vérification des comptes', 'Réunion du bureau'] }, { k: 'date', label: 'Date', type: 'date', req: true, half: true }, { k: 'status', label: 'Statut', type: 'select', half: true, opts: ['À faire', 'En cours', 'Fait'] }, { k: 'prio', label: 'Priorité', type: 'select', opts: Object.entries(PRIO).map(([k, v]) => [k, v.i + ' ' + v.l]) }],
    onSubmit: v => { if (x) Object.assign(x, v); else S.asso.deadlines.push({ id: uid(), ...v }); commit(); },
    onDelete: x ? () => { if (confirmDel()) { removeId(S.asso.deadlines, id); closeModal(); commit(); } } : null
  });
}
ACT.csvAsso = () => downloadFile('association-finances.csv', toCSV([['Date', 'Type', 'Catégorie', 'Montant', 'Moyen', 'Justificatif', 'Commentaire'], ...[...S.asso.tx].sort((a, b) => a.date.localeCompare(b.date)).map(t => [t.date, t.type === 'in' ? 'Recette' : 'Dépense', t.cat, String(t.amount).replace('.', ','), t.pay, t.proof, t.comment])]), 'text/csv');
ACT.csvAsso2 = () => downloadFile('association-echeances.csv', toCSV([['Échéance', 'Date', 'Statut', 'Priorité'], ...S.asso.deadlines.map(d => [d.title, d.date, d.status, PRIO[d.prio].l])]), 'text/csv');

