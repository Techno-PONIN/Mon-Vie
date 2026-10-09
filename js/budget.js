'use strict';
/* =====================================================================
   budget.js — budget familial : revenus, charges fixes, dépenses variables,
   épargne. Tout est saisi à la main : aucune connexion bancaire.
   ===================================================================== */

/** Calculs d'un mois (ym = 'AAAA-MM') : disponible, déjà dépensé, prévision de fin de mois, alertes. */
function budgetCalc(ym) {
  const [y, m] = ym.split('-').map(Number), dim = new Date(y, m, 0).getDate();
  const isCur = ym === curYM(), day = isCur ? new Date().getDate() : dim;
  const tx = S.budget.tx.filter(t => t.date.startsWith(ym));
  const cats = bcats().concat([...new Set(tx.map(t => t.cat))].filter(c => !bcats().includes(c)));   // catégories supprimées mais utilisées
  const byCat = {}, fc = {}, alerts = [];
  cats.forEach(c => { byCat[c] = sum(tx.filter(t => t.cat === c), 'amount'); });
  const spent = sum(Object.values(byCat));
  cats.forEach(c => {
    fc[c] = isCur ? byCat[c] / Math.max(day, 1) * dim : byCat[c];
    const lim = Number(S.budget.limits[c]) || 0;
    if (!lim) return;
    if (byCat[c] > lim) alerts.push({ cat: c, level: 'over', text: `${c} : cette catégorie dépasse ton budget prévu (${money(byCat[c])} pour ${money(lim)}).` });
    else if (isCur && day >= 7 && fc[c] > lim) alerts.push({ cat: c, level: 'risk', text: `${c} : cette catégorie risque de dépasser ton budget prévu (prévision ${money(fc[c])} pour ${money(lim)}).` });
  });
  const income = sum(S.budget.incomes, 'amount'), fixed = sum(S.budget.fixed, 'amount'), savings = sum(S.budget.savings, 'amount');
  const limTotal = sum(bcats().map(c => Number(S.budget.limits[c]) || 0));
  return {
    income, fixed, savings, spent, byCat, fc, alerts, cats,
    left: income - fixed - savings - spent,                                  // 💰 disponible ce mois-ci
    forecast: income - fixed - savings - sum(Object.values(fc)),             // 📅 prévision de fin de mois
    limTotal, budgetLeft: limTotal - spent, dim, day
  };
}

VIEWS.budget = () => {
  const ym = UI.bm, b = budgetCalc(ym), isCur = ym === curYM();
  const nav = `<div class="calbar"><button class="ib" data-act="bmNav" data-v="-1" aria-label="Mois précédent">‹</button><h2>${ymLabel(ym)}</h2><button class="ib" data-act="bmNav" data-v="1" aria-label="Mois suivant">›</button></div>`;
  let body = '';
  if (UI.bTab === 'apercu') {
    body = `<div class="hero3"><div class="tile big3"><div class="tl">💰 Disponible ce mois-ci</div><div class="tv ${b.left < 0 ? 'neg' : ''}">${money(b.left)}</div></div>
      <div class="tile big3"><div class="tl">📊 Déjà dépensé</div><div class="tv">${money(b.spent)}</div><div class="ts">dépenses variables</div></div>
      <div class="tile big3"><div class="tl">📅 Prévision de fin de mois</div><div class="tv ${b.forecast < 0 ? 'neg' : ''}">${isCur ? money(b.forecast) : '—'}</div><div class="ts">${isCur ? 'reste estimé' : 'mois en cours uniquement'}</div></div></div>
    <div class="tiles">${tile('Revenus', money(b.income))}${tile('Charges fixes', money(b.fixed))}${tile('Épargne', money(b.savings))}${tile('Budget variable restant', money(b.budgetLeft))}</div>
    ${b.alerts.map(a => `<div class="alert ${a.level === 'over' ? 'red' : ''}">⚠️ ${esc(a.text)}</div>`).join('')}
    ${sec('Dépenses variables', b.cats.map(c => { const lim = Number(S.budget.limits[c]) || 0, v = b.byCat[c], pc = lim ? v / lim * 100 : 0; return `<div class="brow"><div class="grow"><b>${esc(c)}</b> <span class="mut">${money(v)}${lim ? ' / ' + money(lim) : ''}</span>${lim ? bar(pc, pc > 100 ? 'red' : pc > 80 ? 'orange' : '') : ''}</div></div>`; }).join(''), `<button class="link" data-act="goSettings">Catégories & limites</button>`)}`;
  } else if (UI.bTab === 'depenses') {
    const l = S.budget.tx.filter(t => t.date.startsWith(ym)).sort((a, b) => b.date.localeCompare(a.date));
    body = `<form class="quick" data-form="addVar"><input name="amount" type="number" step="any" inputmode="decimal" placeholder="Montant €" required style="max-width:120px" aria-label="Montant"><select name="cat" aria-label="Catégorie">${bcats().map(c => `<option>${esc(c)}</option>`).join('')}</select><input name="label" placeholder="Libellé (facultatif)"><button class="btn primary">Noter</button></form>
    ${sec(`Dépenses du mois (${money(b.spent)})`, l.length ? l.map(t => `<div class="mini" data-act="editVar" data-id="${t.id}"><span><b>${money(t.amount)}</b> · ${esc(t.cat)} ${t.label ? '· ' + esc(t.label) : ''} <small>${fmtShort(t.date)}</small></span></div>`).join('') : empty('Aucune dépense saisie ce mois-ci.'), '<button class="link" data-act="csvBudget">Export CSV</button>')}`;
  } else {
    const k = { revenus: 'incomes', fixes: 'fixed', epargne: 'savings' }[UI.bTab], arr = S.budget[k];
    const T = { incomes: 'Revenus mensuels', fixed: 'Charges fixes mensuelles', savings: 'Épargne mensuelle' }[k];
    body = sec(T, (arr.length ? arr.map(x => `<div class="mini" data-act="editBL" data-k="${k}" data-id="${x.id}"><span>${esc(x.label)} <b>${money(x.amount)}</b></span></div>`).join('') : empty('Rien de saisi.')) + `<div class="tot">Total : ${money(sum(arr, 'amount'))}</div>`, `<button class="btn sm primary" data-act="newBL" data-k="${k}">+ Ajouter</button>`);
  }
  return nav + tabs(UI.bTab, [['apercu', 'Aperçu'], ['depenses', 'Dépenses'], ['revenus', 'Revenus'], ['fixes', 'Charges fixes'], ['epargne', 'Épargne']], 'bTab') + body + `<p class="mut sm">ℹ️ Aucune transaction bancaire n’est jamais effectuée : tout est saisi à la main.</p>`;
};
ACT.bTab = d => { UI.bTab = d.v; render(); };
ACT.bmNav = d => { UI.bm = shiftYM(UI.bm, +d.v); render(); };
ACT.goSettings = () => go('settings');
ACT.addVar = (f, fd) => {
  const a = Number(String(fd.get('amount')).replace(',', '.')); if (!a) return;
  S.budget.tx.push({ id: uid(), date: UI.bm === curYM() ? today() : UI.bm + '-01', cat: fd.get('cat'), label: fd.get('label'), amount: a }); commit(); toast('💶 Dépense notée');
};
/** Création rapide d'une dépense (bouton ➕, mode 5 minutes…) */
ACT.newExpense = () => openForm({
  title: '💶 Nouvelle dépense', values: { date: today(), cat: bcats()[0] },
  fields: [{ k: 'amount', label: 'Montant (€)', type: 'number', req: true, half: true }, { k: 'date', label: 'Date', type: 'date', half: true }, { k: 'cat', label: 'Catégorie', type: 'select', opts: bcats() }, { k: 'label', label: 'Libellé (facultatif)' }],
  onSubmit: v => { if (!v.amount) return; S.budget.tx.push({ id: uid(), ...v }); commit(); toast('💶 Dépense notée'); }
});
ACT.addVarExpense = ACT.newExpense;
ACT.editVar = d => {
  const t = byId(S.budget.tx, d.id);
  openForm({ title: 'Modifier la dépense', values: t, fields: [{ k: 'amount', label: 'Montant €', type: 'number', req: true, half: true }, { k: 'date', label: 'Date', type: 'date', half: true }, { k: 'cat', label: 'Catégorie', type: 'select', opts: bcats().includes(t.cat) ? bcats() : bcats().concat([t.cat]) }, { k: 'label', label: 'Libellé' }], onSubmit: v => { Object.assign(t, v); commit(); }, onDelete: () => { removeId(S.budget.tx, d.id); closeModal(); commit(); } });
};
ACT.newBL = d => blForm(d.k); ACT.editBL = d => blForm(d.k, d.id);
function blForm(k, id) {
  const x = id ? byId(S.budget[k], id) : null;
  const sugg = { incomes: ['Salaire', 'Allocations', 'Autres revenus'], fixed: ['Loyer / prêt', 'Électricité', 'Gaz', 'Eau', 'Téléphone', 'Internet', 'Abonnements', 'Assurances', 'Impôts', 'Crèche / école', 'Mutuelle'], savings: ['Livret', 'Épargne projet', 'Épargne de précaution'] }[k];
  openForm({
    title: { incomes: 'Revenu', fixed: 'Charge fixe', savings: 'Épargne' }[k], values: x || {},
    fields: [{ k: 'label', label: 'Libellé', req: true, list: sugg }, { k: 'amount', label: 'Montant mensuel (€)', type: 'number', req: true }],
    onSubmit: v => { if (x) Object.assign(x, v); else S.budget[k].push({ id: uid(), ...v }); commit(); },
    onDelete: x ? () => { removeId(S.budget[k], id); closeModal(); commit(); } : null
  });
}
ACT.csvBudget = () => downloadFile('budget-depenses.csv', toCSV([['Date', 'Catégorie', 'Libellé', 'Montant'], ...S.budget.tx.map(t => [t.date, t.cat, t.label, String(t.amount).replace('.', ',')])]), 'text/csv');
