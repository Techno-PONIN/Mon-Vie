/* ===== REPAS ===== */
const MSLOTS = [['l', 'Midi'], ['d', 'Soir']];
const mealIngs = m => (m && m.i ? m.i.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean) : []);
VIEWS.repas = () => {
  const wk = UI.mw, W = S.meals[weekKey(wk)] || {};
  return `<div class="calbar"><button class="ib" data-act="mwNav" data-v="-1">‹</button><h2>Semaine du ${fmtShort(wk)}</h2><button class="ib" data-act="mwNav" data-v="1">›</button></div>
  ${S.settings.foodPrefs ? `<div class="note">🥗 ${esc(S.settings.foodPrefs)}</div>` : ''}
  <div class="meals">${Array.from({ length: 7 }, (_, i) => `<div class="md ${addDays(wk, i) === today() ? 'tod' : ''}"><div class="mdn">${DAYS[i]} <small>${fmtShort(addDays(wk, i)).slice(4)}</small></div>
    ${MSLOTS.map(([k, l]) => { const m = W[i + k]; return `<div class="ms ${m && m.n ? 'filled' : ''}" data-act="editMeal" data-k="${i}${k}"><small>${l}</small><span>${m && m.n ? esc(m.n) : '＋'}</span></div>`; }).join('')}</div>`).join('')}</div>
  <div class="center"><button class="btn primary" data-act="genShop">🛒 Générer ma liste de courses</button></div>
  <p class="mut sm">Les ingrédients saisis dans chaque repas sont ajoutés à ta liste de courses (sans doublons).</p>`;
};
ACT.mwNav = d => { UI.mw = addDays(UI.mw, 7 * +d.v); render(); };
ACT.editMeal = d => {
  const wk = weekKey(UI.mw), m = (S.meals[wk] || {})[d.k] || {};
  openForm({
    title: `${DAYS[+d.k[0]]} — ${MSLOTS.find(x => x[0] === d.k[1])[1]}`, values: m,
    fields: [{ k: 'n', label: 'Repas', ph: 'ex : Pâtes bolognaise' }, { k: 'i', label: 'Ingrédients (séparés par des virgules)', type: 'textarea', ph: 'pâtes, viande hachée, sauce tomate, oignon' }],
    onSubmit: v => { S.meals[wk] = S.meals[wk] || {}; if (!v.n && !v.i) delete S.meals[wk][d.k]; else S.meals[wk][d.k] = v; commit(); },
    submit: 'OK'
  });
};
ACT.genShop = () => { let n = 0; Object.values(S.meals[weekKey(UI.mw)] || {}).forEach(m => mealIngs(m).forEach(i => { if (addShop(i)) n++; })); commit(); toast(n ? `🛒 ${n} ingrédient(s) ajouté(s) à la liste` : 'Rien à ajouter (déjà dans la liste ?)', n ? { label: 'Voir', fn: () => go('courses') } : null); };
ACT.genFromMeals = () => { UI.mw = mondayOf(today()); ACT.genShop(); };
/** Ingrédients des 3 prochains jours absents de la liste de courses. */
function missingIngredients() {
  const miss = new Set();
  for (let i = 0; i < 3; i++) {
    const ds = addDays(today(), i), W = S.meals[mondayOf(ds)] || {}, idx = dow(ds) - 1;
    MSLOTS.forEach(([k]) => mealIngs(W[idx + k]).forEach(g => { if (!S.shop.some(x => norm(x.name) === norm(g))) miss.add(g); }));
  }
  return [...miss];
}

