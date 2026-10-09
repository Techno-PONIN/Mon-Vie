/** Devine la catégorie de course d'un produit. */
function guessShopCat(name) {
  const n = norm(name);
  const rules = [
    ['Enfant', /couche|lingette|petit pot|compote|infantile|biberon|bebe|enfant/],
    ['Hygiène', /shampo|savon|dentifrice|deodorant|coton|brosse a dent|gel douche|rasoir|mouchoir/],
    ['Maison', /lessive|eponge|sac poubelle|vaisselle|papier toilette|essuie|ampoule|pile|cartouche|menager|javel|adoucissant/],
    ['Surgelés', /surgel|glace|frites|pizza|poisson pane/],
    ['Boissons', /\beau\b|jus|soda|vin|biere|sirop|cola|limonade|boisson/],
    ['Viande', /poulet|boeuf|steak|jambon|saucisse|viande|poisson|saumon|dinde|porc|lardon|merguez|cabillaud|hache/],
    ['Fruits/légumes', /pomme|banane|orange|citron|tomate|carotte|salade|courgette|oignon|\bail\b|legume|fruit|poireau|concombre|poivron|avocat|fraise|raisin|champignon|haricot vert|brocoli/],
    ['Produits frais', /lait|yaourt|fromage|beurre|oeuf|creme|mozzarella|frais|skyr|fromage blanc|gruyere|emmental/],
    ['Épicerie', /pate|riz|farine|sucre|huile|conserve|cereale|cafe|\bthe\b|biscuit|pain|chocolat|sauce|\bsel\b|epice|confiture|semoule|lentille|ble|chips|gateau/]
  ];
  for (const [c, re] of rules) if (re.test(n)) return c;
  return 'Autres';
}

/* ===== COURSES ===== */
VIEWS.courses = () => {
  const open = S.shop.filter(x => !x.done), done = S.shop.filter(x => x.done);
  const est = sum(S.shop.filter(x => !x.done).map(x => (Number(x.price) || 0) * (parseFloat(String(x.qty).replace(',', '.')) || 1)));
  const item = x => `<div class="shop ${x.done ? 'done' : ''}"><button class="chk" data-act="toggleShop" data-id="${x.id}">${x.done ? '✔' : ''}</button><div class="tb" data-act="editShop" data-id="${x.id}"><b>${esc(x.name)}</b> <span class="mut">${x.qty && x.qty != 1 ? '× ' + esc(x.qty) : ''}${x.price ? ' · ' + money(x.price) : ''}</span></div><button class="ib" data-act="delShop" data-id="${x.id}">✕</button></div>`;
  return `<form class="quick" data-form="addShop"><input name="q" placeholder="Ajouter… ex : 2 lait, pâtes 1,50€" autocomplete="off" required><button class="btn primary">Ajouter</button></form>
  <div class="row"><button class="btn sm" data-act="habituals">🔁 Courses habituelles</button><button class="btn sm" data-act="genFromMeals">🍽️ Depuis les repas</button><span class="sp"></span>${done.length ? '<button class="btn sm" data-act="clearShop">Vider les cochés</button>' : ''}</div>
  ${open.length ? `<div class="mut sm">${open.length} produit${open.length > 1 ? 's' : ''}${est ? ' · estimé ' + money(est) : ''}</div>` : ''}
  ${SHOPCATS.map(c => { const l = open.filter(x => x.cat === c); return l.length ? sec(c, l.map(item).join('')) : ''; }).join('') || empty('Liste vide 🛒')}
  ${done.length ? sec('Dans le panier', done.map(item).join('')) : ''}`;
};
function addShop(name, o = {}) {
  name = name.trim(); if (!name) return false;
  const h = S.shopHist[norm(name)];
  if (S.shop.some(x => !x.done && norm(x.name) === norm(name))) return false;
  S.shop.push({ id: uid(), name, qty: o.qty || '1', price: o.price ?? (h ? h.price : 0), cat: o.cat || (h ? h.cat : guessShopCat(name)), done: false });
  return true;
}
ACT.addShop = (f, fd) => {
  let q = String(fd.get('q')).trim(), qty = '1', price = 0, m;
  if ((m = q.match(/(\d+[.,]?\d*)\s?(€|euros?)/i))) { price = +m[1].replace(',', '.'); q = q.replace(m[0], ' ').trim(); }
  if ((m = q.match(/^(\d+)\s*x?\s+(.+)/i))) { qty = m[1]; q = m[2]; } else if ((m = q.match(/(.+?)\s+x\s?(\d+)$/i))) { q = m[1]; qty = m[2]; }
  q.split(/[,;]+/).forEach(n => addShop(n, { qty, price })); commit(); const i = $('form[data-form=addShop] input'); i && i.focus();
};
ACT.toggleShop = d => {
  const x = byId(S.shop, d.id); x.done = !x.done;
  if (x.done) { const k = norm(x.name), h = S.shopHist[k] || { name: x.name, count: 0 }; Object.assign(h, { name: x.name, cat: x.cat, price: x.price || h.price || 0, qty: x.qty, count: h.count + 1 }); delete h.demo; S.shopHist[k] = h; }
  commit();
};
ACT.delShop = d => { removeId(S.shop, d.id); commit(); };
ACT.clearShop = () => { S.shop = S.shop.filter(x => !x.done); commit(); };
ACT.editShop = d => {
  const x = byId(S.shop, d.id);
  openForm({ title: 'Produit', values: x, fields: [{ k: 'name', label: 'Produit', req: true }, { k: 'qty', label: 'Quantité', half: true }, { k: 'price', label: 'Prix estimé (€)', type: 'number', half: true }, { k: 'cat', label: 'Rayon', type: 'select', opts: SHOPCATS }], onSubmit: v => { v.price = Number(v.price) || 0; Object.assign(x, v); commit(); } });
};
ACT.newShop = () => openForm({
  title: '🛒 Ajouter un produit', values: { qty: '1' },
  fields: [{ k: 'name', label: 'Produit', req: true }, { k: 'qty', label: 'Quantité', half: true }, { k: 'price', label: 'Prix estimé (€)', type: 'number', half: true }],
  onSubmit: v => { addShop(v.name, { qty: v.qty || '1', price: Number(v.price) || 0 }); commit(); toast('🛒 Ajouté à la liste'); }
});
ACT.habituals = () => {
  const hist = Object.entries(S.shopHist).filter(([k]) => !S.shop.some(x => !x.done && norm(x.name) === k)).sort((a, b) => b[1].count - a[1].count);
  openModal(`<h2>🔁 Courses habituelles</h2>${hist.length ? `<div id="habList">${hist.map(([k, h]) => `<label class="chkrow"><input type="checkbox" value="${esc(k)}" checked> ${esc(h.name)} <span class="mut">(${h.count}×, ${h.cat})</span></label>`).join('')}</div>` : empty('Aucun achat précédent : les produits que tu coches apparaîtront ici.')}
  <div class="mact"><span class="sp"></span><button class="btn" data-act="closeModal">Annuler</button>${hist.length ? '<button class="btn primary" data-act="addHabituals">Ajouter la sélection</button>' : ''}</div>`);
};
ACT.addHabituals = () => { let n = 0; $$('#habList input:checked').forEach(i => { const h = S.shopHist[i.value]; if (addShop(h.name, { qty: h.qty, price: h.price, cat: h.cat })) n++; }); closeModal(); commit(); toast(`🛒 ${n} produit(s) ajouté(s)`); };

