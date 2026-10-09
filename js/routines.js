'use strict';
/* =====================================================================
   routines.js — routines personnalisables (matin, soir, ou les tiennes).
   Chaque routine est une liste de cases à cocher ; les cases se remettent
   à zéro chaque jour (le journal est conservé 60 jours).
   ===================================================================== */
const routineDone = (r, itemId) => !!(S.routineLog[today()] || {})[r.id + ':' + itemId];
function routineProgress(r) {
  const n = r.items.length, d = r.items.filter(i => routineDone(r, i.id)).length;
  return { n, d, pc: n ? d / n * 100 : 0 };
}
/** Bloc HTML réutilisé dans la vue Routines, « Ma matinée » et « Ma fin de journée » */
function routineBlock(r, withEdit = true) {
  if (!r) return '';
  const p = routineProgress(r);
  return `<div class="card"><div class="bh"><h2>${esc(r.name)} <small>${p.d}/${p.n}</small></h2>${withEdit ? `<button class="link" data-act="editRoutine" data-id="${r.id}">Modifier</button>` : ''}</div>${bar(p.pc)}
    ${r.items.map(i => `<label class="chkrow"><input type="checkbox" data-act="toggleRoutine" data-r="${r.id}" data-i="${i.id}" ${routineDone(r, i.id) ? 'checked' : ''}> <span class="${routineDone(r, i.id) ? 'strike' : ''}">${esc(i.t)}</span></label>`).join('') || empty('Aucune étape : modifie la routine pour en ajouter.')}</div>`;
}
ACT.toggleRoutine = (d, el) => {
  const T = today(); S.routineLog[T] = S.routineLog[T] || {}; const k = d.r + ':' + d.i;
  if (el.checked) S.routineLog[T][k] = true; else delete S.routineLog[T][k];
  save(); render();
};
VIEWS.routines = () => `<p class="mut">Tes routines se remettent à zéro chaque jour. Modifie-les librement : étapes, noms, nombre de routines.</p>
  ${S.routines.map(r => routineBlock(r)).join('')}<button class="btn wide" data-act="newRoutine">+ Nouvelle routine</button>`;
ACT.newRoutine = () => routineForm(null); ACT.editRoutine = d => routineForm(d.id);
function routineForm(id) {
  const r = id ? byId(S.routines, id) : null;
  openForm({
    title: r ? 'Modifier la routine' : 'Nouvelle routine', values: r ? { name: r.name, items: r.items.map(i => i.t).join('\n') } : { name: '', items: '' },
    fields: [{ k: 'name', label: 'Nom (ex : ☀️ Routine du matin)', req: true }, { k: 'items', label: 'Étapes (une par ligne)', type: 'textarea', rows: 8 }],
    onSubmit: v => {
      const lines = v.items.split('\n').map(x => x.trim()).filter(Boolean);
      const old = r ? r.items : [], items = lines.map(t => old.find(o => o.t === t) || { id: uid(), t });   // garde l'état des étapes inchangées
      if (r) { r.name = v.name; r.items = items; } else S.routines.push({ id: uid(), name: v.name, items });
      commit();
    },
    onDelete: r ? () => { if (confirmDel('Supprimer cette routine ?')) { removeId(S.routines, id); closeModal(); commit(); } } : null
  });
}
