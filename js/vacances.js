'use strict';
/* =====================================================================
   vacances.js — vacances scolaires (zone C : académie de Montpellier) et jours fériés
   Sources : calendrier officiel (service-public.gouv.fr, Journal officiel).
   Les dates « fin » sont le DERNIER jour de vacances (la reprise a lieu le lendemain).
   Pendant ces périodes, l'emploi du temps des cours est masqué.
   ➜ Chaque année : ajouter ici les nouvelles dates.
   ===================================================================== */
const VAC = [
  ['Vacances de la Toussaint', '2026-10-17', '2026-11-01'], ['Vacances de Noël', '2026-12-19', '2027-01-03'],
  ['Vacances d’hiver', '2027-02-06', '2027-02-21'], ['Vacances de printemps', '2027-04-03', '2027-04-18'],
  ['Pont de l’Ascension', '2027-05-06', '2027-05-09'], ['Vacances d’été', '2027-07-03', '2027-09-01'],
  ['Vacances de la Toussaint', '2027-10-23', '2027-11-07'], ['Vacances de Noël', '2027-12-18', '2028-01-02'],
  ['Vacances d’hiver', '2028-02-12', '2028-02-27'], ['Vacances de printemps', '2028-04-15', '2028-05-01'],
  ['Pont de l’Ascension', '2028-05-25', '2028-05-28'], ['Vacances d’été', '2028-07-04', '2028-08-31']
].map(([n, from, to]) => ({ n, from, to }));
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
    h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
    mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(new Date(y, mo - 1, da));
}
const FERIES = {};
function feriesOf(y) {
  if (FERIES[y]) return FERIES[y];
  const e = easter(y), m = {};
  m[`${y}-01-01`] = 'Jour de l’an'; m[`${y}-05-01`] = 'Fête du travail'; m[`${y}-05-08`] = 'Victoire 1945'; m[`${y}-07-14`] = 'Fête nationale';
  m[`${y}-08-15`] = 'Assomption'; m[`${y}-11-01`] = 'Toussaint'; m[`${y}-11-11`] = 'Armistice'; m[`${y}-12-25`] = 'Noël';
  m[addDays(e, 1)] = 'Lundi de Pâques'; m[addDays(e, 39)] = 'Ascension'; m[addDays(e, 50)] = 'Lundi de Pentecôte';
  return (FERIES[y] = m);
}
const ferieOn = ds => feriesOf(+ds.slice(0, 4))[ds] || null;
const vacationOn = ds => { const v = VAC.find(x => ds >= x.from && ds <= x.to); return v ? v.n : null; };
/** Jour sans cours (vacances ou férié) */
const noSchool = ds => vacationOn(ds) || ferieOn(ds);
/** Vacances en cours, ou prochaines vacances : {n, from, to, resume, inDays, now} */
function vacationInfo() {
  const T = today(), v = VAC.find(x => T >= x.from && T <= x.to), nx = v || VAC.find(x => x.from > T);
  return nx ? { n: nx.n, from: nx.from, to: nx.to, resume: addDays(nx.to, 1), inDays: diffDays(nx.from, T), now: !!v } : null;
}
