/**
 * Tri et filtres de l'accueil (EF-12). L'étape 5 pose le tri par échéance
 * (défaut) et le filtre de statut implicite « non archivés » ; l'étape 7
 * complète prix, nom, catégorie et les filtres explicites.
 */

import { comparerDates, joursAvant, montantMensuel, prixEffectif } from './dates';
import type { Abonnement, DateISO, TriAccueil } from './types';

const SANS_ECHEANCE = Number.POSITIVE_INFINITY;

/**
 * Clé de tri par échéance : jours avant la fin d'essai si un essai est en
 * cours, sinon avant la prochaine échéance ; les abonnements sans échéance
 * (à vie, à l'usage, en pause, résiliés, archivés) passent en dernier.
 */
export function cleEcheance(abo: Abonnement, jour: DateISO): number {
  if (abo.essai && comparerDates(abo.essai.dateFin, jour) >= 0) {
    return joursAvant(abo.essai.dateFin, jour);
  }
  if (abo.prochaineEcheance !== null) return joursAvant(abo.prochaineEcheance, jour);
  return SANS_ECHEANCE;
}

function comparerNoms(a: Abonnement, b: Abonnement): number {
  return a.nom.localeCompare(b.nom, undefined, { sensitivity: 'base' });
}

/** Renvoie une copie triée selon le critère (EF-12) ; le nom départage les égalités. */
export function trierAbonnements(
  abonnements: readonly Abonnement[],
  tri: TriAccueil,
  jour: DateISO,
): Abonnement[] {
  const copie = [...abonnements];
  switch (tri) {
    case 'echeance':
      return copie.sort(
        (a, b) => cleEcheance(a, jour) - cleEcheance(b, jour) || comparerNoms(a, b),
      );
    case 'prix':
      return copie.sort(
        (a, b) =>
          montantMensuel(prixEffectif(b), b.periodicite) -
            montantMensuel(prixEffectif(a), a.periodicite) || comparerNoms(a, b),
      );
    case 'nom':
      return copie.sort(comparerNoms);
    case 'categorie':
      return copie.sort((a, b) => a.categorie.localeCompare(b.categorie) || comparerNoms(a, b));
    case 'personnalise':
      return copie.sort(
        (a, b) =>
          (a.ordre ?? Number.POSITIVE_INFINITY) - (b.ordre ?? Number.POSITIVE_INFINITY) ||
          cleEcheance(a, jour) - cleEcheance(b, jour) ||
          comparerNoms(a, b),
      );
  }
}

/** Vue par défaut de l'accueil : tout sauf les archivés (EF-06). */
export function nonArchives(abonnements: readonly Abonnement[]): Abonnement[] {
  return abonnements.filter((a) => a.statut.type !== 'archive');
}
