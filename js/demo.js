ACT.clearDemo = () => {
  const f = a => a.filter(x => !x.demo);
  ['tasks', 'events', 'classes', 'slots', 'sessions', 'evals', 'notes', 'shop', 'family', 'projects', 'makeups'].forEach(k => S[k] = f(S[k]));
  S.asso.tx = f(S.asso.tx); S.asso.deadlines = f(S.asso.deadlines); S.asso.docs = f(S.asso.docs || []); ['incomes', 'fixed', 'savings', 'tx'].forEach(k => S.budget[k] = f(S.budget[k]));
  Object.keys(S.meals).forEach(k => { if (S.meals[k].demo) delete S.meals[k]; }); Object.keys(S.shopHist).forEach(k => { if (S.shopHist[k].demo) delete S.shopHist[k]; });
  if (S.flags.demoOpening) { S.asso.opening = 0; S.flags.demoOpening = false; }
  S.settings.etabs = S.settings.etabs.filter(e => e !== 'Collège Exemple'); S.notifs = []; S.flags.seen = {}; S.flags.demo = false;
  commit(); toast('🧹 Données de démonstration effacées');
};
function loadDemo() {
  const T = today(), D = o => ({ id: uid(), demo: true, ...o }), mon = mondayOf(T);
  if (!S.settings.etabs.includes('Collège Exemple')) S.settings.etabs.push('Collège Exemple');
  const c1 = D({ name: '5e A', level: '5e', etab: 'Collège Exemple', size: 26, room: '12', progress: 35, notes: 'Classe dynamique, aime la manipulation.' }),
    c2 = D({ name: '4e B', level: '4e', etab: 'Collège Exemple', size: 24, room: '12', progress: 50 }), c3 = D({ name: '3e C', level: '3e', etab: 'Collège Exemple', size: 22, room: '14', progress: 20, pp: true });
  S.classes.push(c1, c2, c3);
  [[1, '08:00', '09:00', c1], [1, '10:00', '11:00', c2], [2, '09:00', '10:00', c3], [3, '14:00', '15:00', c1], [4, '10:00', '11:00', c2], [4, '15:00', '16:00', c3], [5, '08:00', '09:00', c1]].forEach(([day, start, end, c]) => S.slots.push(D({ day, start, end, classId: c.id, room: '', week: 'AB' })));
  S.sessions.push(D({ classId: c1.id, chapter: 'Les objets techniques', title: 'Analyse fonctionnelle', date: addDays(T, -7), dur: 55, activity: 'Démontage d’un objet', status: 'Réalisée' }),
    D({ classId: c2.id, chapter: 'Programmation', title: 'Boucles et conditions', date: addDays(T, -3), dur: 55, status: 'À rattraper', remarks: 'Séance écourtée' }),
    D({ classId: c1.id, chapter: 'Les objets techniques', title: 'Chaîne d’énergie', date: addDays(T, 2), dur: 55, status: 'Préparée', obj: 'Identifier les composants d’une chaîne d’énergie' }));
  S.makeups.push(D({ classId: c2.id, hours: 3, doneHours: 1, due: addDays(T, 5), note: 'Sortie scolaire' }), D({ classId: c1.id, hours: 1, doneHours: 0, due: '', note: 'Absence' }));
  S.evals.push(D({ classId: c1.id, title: 'Évaluation chapitre 1', date: addDays(T, -10), note: 'Moyenne de classe correcte' }));
  S.tasks.push(D({ title: 'Corriger les copies de 5e', cat: 'Travail', prio: 'urgent', due: T, dur: 60 }), D({ title: 'Répondre au mail du collège', cat: 'Travail', prio: 'normal', due: T, dur: 5 }),
    D({ title: 'Préparer activité 4e', cat: 'Travail', prio: 'important', due: addDays(T, 2), dur: 60 }), D({ title: 'Envoyer l’attestation à la mutuelle', cat: 'Administratif', prio: 'important', due: addDays(T, 1), dur: 10 }),
    D({ title: 'Payer l’assurance de l’association', cat: 'Association', prio: 'important', due: addDays(T, 3), dur: 10 }), D({ title: 'Prendre rendez-vous chez le médecin', cat: 'Famille', prio: 'normal', due: '', dur: 5 }),
    D({ title: 'Appeler le garage', cat: 'Personnel', prio: 'normal', due: addDays(T, -1), dur: 10 }), D({ title: 'Ranger le bureau', cat: 'Maison', prio: 'low', due: '', dur: 30 }));
  S.events.push(D({ title: 'Conseil de classe 4e B', date: addDays(T, 2), time: '17:00', dur: 90, cat: 'reunion', place: 'Salle des profs', remind: 30 }),
    D({ title: 'Rendez-vous pédiatre', date: addDays(T, 3), time: '10:30', dur: 30, cat: 'famille', place: 'Cabinet', remind: 60 }), D({ title: 'Réunion du bureau', date: addDays(T, 5), time: '18:30', dur: 90, cat: 'asso', place: 'Salle associative', remind: 30 }),
    D({ title: 'Date limite : dossier inscription', date: addDays(T, 4), cat: 'echeance', dur: 0, remind: 0 }));
  S.notes.push(D({ kind: 'inbox', text: 'Penser à acheter cartouches imprimante', created: T }), D({ kind: 'inbox', text: 'Idée : projet robot suiveur de ligne pour les 3e', created: T }), D({ kind: 'idea', text: 'Faire un mur d’affichage des réalisations d’élèves', created: addDays(T, -4) }));
  S.asso.opening = 1200; S.flags.demoOpening = true;
  [[-70, 'in', 'Cotisations', 480, 'Virement'], [-45, 'out', 'Fournitures', 95.5, 'Carte'], [-30, 'in', 'Subventions', 600, 'Virement'], [-20, 'out', 'Assurance', 210, 'Prélèvement'], [-9, 'in', 'Cotisations', 150, 'Chèque'], [-4, 'out', 'Manifestations', 130, 'Espèces'], [-2, 'in', 'Dons', 60, 'Espèces']].forEach(([k, type, cat, amount, pay]) => S.asso.tx.push(D({ type, cat, amount, pay, date: addDays(T, k), proof: type === 'out' ? 'FAC-' + Math.abs(k) : '', comment: '' })));
  S.asso.deadlines.push(D({ title: 'Facture assurance à payer', date: addDays(T, 3), status: 'À faire', prio: 'important' }), D({ title: 'Déclaration en préfecture', date: addDays(T, 20), status: 'En cours', prio: 'normal' }), D({ title: 'Assemblée générale', date: addDays(T, 35), status: 'À faire', prio: 'low' }));
  S.asso.docs.push(D({ title: 'Statuts de l’association', place: 'Classeur bleu', note: 'Version 2022' }));
  S.budget.savings.push(D({ label: 'Livret', amount: 100 }));
  S.budget.incomes.push(D({ label: 'Salaire', amount: 2300 }), D({ label: 'Autres revenus', amount: 150 }));
  [['Loyer / prêt', 750], ['Électricité', 90], ['Téléphone', 30], ['Assurances', 110], ['Abonnements', 40]].forEach(([label, amount]) => S.budget.fixed.push(D({ label, amount })));
  const dd = k => { const d = new Date(); d.setDate(Math.max(1, d.getDate() - k)); return iso(d); };
  [['Alimentation', 87, 'Supermarché', 1], ['Alimentation', 64, 'Marché', 3], ['Alimentation', 52, 'Courses', 5], ['Transport', 45, 'Carburant', 2], ['Loisirs', 28, 'Cinéma', 4], ['Achats', 39, 'Vêtements', 6]].forEach(([cat, amount, label, k]) => S.budget.tx.push(D({ cat, amount, label, date: dd(k) })));
  ['Lait', 'Pâtes', 'Pommes', 'Yaourts'].forEach(n => S.shop.push(D({ name: n, qty: '1', price: 0, cat: guessShopCat(n), done: false })));
  [['Café', 3.2, 4], ['Pain', 1.1, 6], ['Œufs', 2.5, 3], ['Papier toilette', 4.5, 2]].forEach(([n, price, count]) => S.shopHist[norm(n)] = { name: n, cat: guessShopCat(n), price, qty: '1', count, demo: true });
  S.meals[mon] = { demo: true, '0d': { n: 'Pâtes bolognaise', i: 'pâtes, viande hachée, sauce tomate, oignon' }, '1d': { n: 'Poulet riz', i: 'poulet, riz, courgettes' }, '2l': { n: 'Salade composée', i: 'salade, tomates, thon' }, '3d': { n: 'Gratin de légumes', i: 'pommes de terre, crème, fromage râpé' } };
  S.family.push(D({ type: 'anniv', title: 'Anniversaire de Mamie', date: '1958-' + addDays(T, 9).slice(5) }), D({ type: 'ecole', title: 'Réunion parents-profs', date: addDays(T, 6), time: '18:00' }),
    D({ type: 'activite', title: 'Natation', date: addDays(T, 2), time: '17:30', notes: 'Piscine municipale' }), D({ type: 'doc', title: 'Carnet de santé', notes: 'Tiroir du bureau, dossier bleu' }));
  S.projects.push(D({ kind: 'project', title: 'Projet robot suiveur de ligne (3e)', goal: 'Réaliser un robot programmable avec les élèves', due: addDays(T, 60), steps: [{ t: 'Choisir le matériel', done: true }, { t: 'Écrire la fiche de séquence', done: false }, { t: 'Tester le prototype', done: false }], notes: 'Budget à voir avec le collège.' }),
    D({ kind: 'goal', title: 'Bouger 30 min par jour', goal: 'Activité physique', due: addDays(T, 90), steps: [], value: 40 }));
  S.flags.demo = true;
}

