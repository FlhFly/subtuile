/**
 * Changement de prix depuis la fiche (EF-08, EF-08b). À une date passée ou du
 * jour, le nouveau prix entre dans l'historique (chronologie des prix en
 * vigueur, une entrée par date) et devient le prix courant s'il est le plus
 * récent ; à une date future, il devient la hausse annoncée, appliquée
 * automatiquement à la date (EF-08b).
 */

import { comparerDates, estDateISO } from './dates';
import { parserMontant } from './formulaire';
import type { Abonnement, DateISO, EntreeHistoriquePrix } from './types';

export interface FormulaireChangementPrix {
  montant: string;
  dateEffet: string;
}

export type ErreursPrix = Partial<
  Record<keyof FormulaireChangementPrix, 'requis' | 'nombre' | 'date'>
>;

export function formulairePrixVide(jour: DateISO): FormulaireChangementPrix {
  return { montant: '', dateEffet: jour };
}

export function validerChangementPrix(etat: FormulaireChangementPrix): ErreursPrix {
  const erreurs: ErreursPrix = {};
  if (etat.montant.trim() === '') erreurs.montant = 'requis';
  else {
    const m = parserMontant(etat.montant);
    if (m === null || m < 0) erreurs.montant = 'nombre';
  }
  if (!estDateISO(etat.dateEffet)) erreurs.dateEffet = 'date';
  return erreurs;
}

/** Vrai si la date d'effet est à venir : le changement devient une hausse annoncée. */
export function estHausseAnnoncee(dateEffet: DateISO, jour: DateISO): boolean {
  return comparerDates(dateEffet, jour) > 0;
}

/** Historique trié par date, une seule entrée par date (la nouvelle remplace l'ancienne). */
export function insererDansHistorique(
  historique: readonly EntreeHistoriquePrix[],
  entree: EntreeHistoriquePrix,
): EntreeHistoriquePrix[] {
  return [...historique.filter((h) => h.date !== entree.date), entree].sort((a, b) =>
    comparerDates(a.date, b.date),
  );
}

/** Prix en vigueur à `jour` d'après l'historique (dernière entrée ≤ jour) ; `defaut` si aucune. */
export function prixSelonHistorique(
  historique: readonly EntreeHistoriquePrix[],
  jour: DateISO,
  defaut: number,
): number {
  let prix = defaut;
  for (const h of historique) if (comparerDates(h.date, jour) <= 0) prix = h.prix;
  return prix;
}

/** Applique un changement de prix validé. Fonction pure : ne touche ni updatedAt ni le stockage. */
export function appliquerChangementPrix(
  abo: Abonnement,
  montant: number,
  dateEffet: DateISO,
  jour: DateISO,
): Abonnement {
  if (estHausseAnnoncee(dateEffet, jour)) {
    return { ...abo, prixFutur: { date: dateEffet, montant } };
  }
  const historiquePrix = insererDansHistorique(abo.historiquePrix, {
    date: dateEffet,
    prix: montant,
  });
  const prix = prixSelonHistorique(historiquePrix, jour, abo.prix);
  const partage = abo.partage
    ? { prixTotal: prix, partPayee: Math.min(abo.partage.partPayee, prix) }
    : null;
  return { ...abo, prix, historiquePrix, partage };
}
