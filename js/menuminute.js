/* ===== MENU MINUTE : lien + import de la semaine générée dans l'app « Menu Minute » ===== */
const MENU_MINUTE_URL = 'https://claude.ai/artifact/VsL6nqADVbVDJ7sxn2eSt1';
// Midi / Soir du lundi au dimanche (semaine du lundi indiqué)
const MM_WEEKS = {
  '2026-10-12': {
    meals: [
      ['Salade de pâtes complètes, pois chiches, feta', 'Rougail boucané aux lentilles + riz complet'],
      ['Restes de rougail boucané + riz', 'Wraps de boucané effiloché, crudités, avocat'],
      ['Riz + poêlée de légumes + jambon ou fromage', 'Omelette jambon-champignons + salade'],
      ['Wraps jambon-fromage-crudités', 'Poulet basquaise + riz complet'],
      ['Restes de poulet basquaise + riz', 'Steak haché ou escalope de dinde + légumes + riz'],
      ['Salade composée œufs, jambon, fromage, avocat', 'Escalopes de poulet ou dinde + poêlée de légumes + riz'],
      ['Restes des escalopes + légumes + riz', 'Omelette + soupe de légumes + pain complet']
    ],
    shop: [
      ['Œufs', '2 boîtes (18)', 6.98], ['Yaourts grecs / skyr', '2 packs', 4.58], ['Yaourts nature', '1 pack', 1.19], ['Yaourt coco', '1 pack', 2.49],
      ['Lait', '1 L', 1.05], ['Lait d’avoine ou de coco', '1 L', 1.89], ['Beurre', '1', 2.19], ['Fromage râpé', '1', 1.99], ['Fromage frais', '1', 1.79], ['Feta', '1', 2.49],
      ['Riz complet', '1 kg', 1.69], ['Flocons d’avoine', '500 g', 1.29], ['Muesli sans sucre ajouté', '1', 2.49], ['Pain complet tranché', '2 sachets', 2.78],
      ['Pâtes complètes', '500 g', 1.09], ['Pois chiches en boîte', '1', 0.89], ['Lentilles en boîte', '1', 0.89], ['Olives', '1 pot', 1.49], ['Tomates concassées', '4 boîtes', 2.76],
      ['Huile d’olive', '1', 4.99], ['Amandes / noix', '1 sachet', 3.49], ['Légumes vapeur surgelés', '3 sachets', 5.37], ['Soupe de légumes surgelée', '1 sachet', 1.99], ['Fruits rouges surgelés', '1 sachet', 2.49],
      ['Boucané fumé (porc)', '800 g', 7.90], ['Hauts de cuisse de poulet', '1 kg', 6.50], ['Steak haché ou escalope de dinde', '4', 6.50], ['Escalope de poulet ou dinde', '6', 8.90], ['Jambon blanc', '2 paquets', 4.58],
      ['Tomates', '1,5 kg', 3.30], ['Poivrons', '3', 2.50], ['Concombre', '1', 0.79], ['Salade verte', '1', 1.19], ['Carottes', '500 g', 0.75], ['Champignons', '1 barquette', 1.59],
      ['Avocats', '7', 5.60], ['Bananes', '6', 1.80], ['Citrons', '2', 1.20], ['Pommes et poires', '1', 4.00], ['Gingembre frais', '1', 0.90], ['Pommes de terre', '1 kg', 1.49],
      ['Oignons', '3', 1.20], ['Ail', '1 tête', 0.99], ['Thym', '1', 1.29], ['Laurier', '1', 1.29]
    ]
  }
};
function mmBar() {
  const wk = mondayOf(UI.mw ? UI.mw : today()), w = MM_WEEKS[wk];
  return `<div class="card"><div class="bh"><h2>🍽️ Menu Minute</h2></div>
    <p class="mut sm">Ton menu de la semaine généré dans l’application « Menu Minute » (petits-déjeuners, courses Lidl / Hyper U, adaptations de chacun).</p>
    <div class="row"><a class="btn sm" target="_blank" rel="noopener" href="${MENU_MINUTE_URL}">Ouvrir Menu Minute</a>
    ${w ? `<button class="btn sm primary" data-act="mmImport">⬇ Importer cette semaine</button>` : ''}</div>
    ${w ? '' : '<p class="mut sm">Pas de menu importable pour cette semaine : demande-moi de mettre à jour l’app après chaque nouveau menu.</p>'}</div>`;
}
ACT.mmImport = () => {
  const wk = mondayOf(UI.mw), w = MM_WEEKS[wk]; if (!w) return;
  const W = S.meals[wk] = S.meals[wk] || {};
  w.meals.forEach(([l, d], i) => { W[i + 'l'] = Object.assign({}, W[i + 'l'], { n: l }); W[i + 'd'] = Object.assign({}, W[i + 'd'], { n: d }); });
  let n = 0; w.shop.forEach(([name, qty, price]) => { if (addShop(name, { qty, price })) n++; });
  commit(); toast(`✔ Menu importé · ${n} article(s) ajouté(s) aux courses`, { label: 'Voir', fn: () => go('courses') });
};
