/**
 * Paiements confirmés (EF-76, lot 6). L'utilisateur marque une échéance comme
 * « payée » depuis la fiche ou l'alerte de renouvellement : la confirmation
 * garde la date de l'échéance, le jour de confirmation et le montant. Purement
 * déclaratif, aucune connexion bancaire. Fonctions pures.
 */

import { calculerProchaineEcheance, comparerDates, joursAvant, prixEnVigueur } from './dates';
import { prixSelonHistorique } from './prix';
import { journalPaiements } from './rapport';
import type { Abonnement, DateISO, PaiementConfirme } from './types';

/** Confirmations d'un abonnement ; absentes sur les abonnements enregistrés avant la 1.2.0. */
export function confirmations(abo: Pick<Abonnement, 'paiementsConfirmes'>): PaiementConfirme[] {
  return abo.paiementsConfirmes ?? [];
}

/** Confirmation de l'échéance `date`, s'il y en a une. */
export function confirmation(
  abo: Pick<Abonnement, 'paiementsConfirmes'>,
  date: DateISO,
): PaiementConfirme | null {
  return confirmations(abo).find((p) => p.echeance === date) ?? null;
}

/**
 * Montant attendu à une échéance : part payée si partagé ; sinon le prix de
 * l'historique pour une échéance passée ou du jour, le prix en vigueur à la
 * date (hausse annoncée comprise) pour une échéance à venir.
 */
export function montantEcheance(abo: Abonnement, date: DateISO, jour: DateISO): number {
  if (abo.partage) return abo.partage.partPayee;
  return comparerDates(date, jour) > 0
    ? prixEnVigueur(abo, date)
    : prixSelonHistorique(abo.historiquePrix, date, abo.prix);
}

export interface EcheanceAConfirmer {
  date: DateISO;
  /** montant attendu, ou montant confirmé si l'échéance l'est déjà */
  montant: number;
  confirmation: PaiementConfirme | null;
}

/**
 * Échéance proposée à la confirmation sur la fiche : la prochaine si elle
 * entre dans la fenêtre d'alerte de renouvellement (même règle que l'alerte),
 * sinon le dernier prélèvement passé. Rien pour un abonnement archivé, non
 * récurrent, en essai gratuit sans prélèvement passé, ou sans échéance.
 */
export function echeanceAConfirmer(
  abo: Abonnement,
  jour: DateISO,
  seuilJours: number,
): EcheanceAConfirmer | null {
  if (abo.periodicite.type !== 'recurrente' || abo.statut.type === 'archive') return null;
  const essaiEnCours = abo.essai !== null && comparerDates(abo.essai.dateFin, jour) >= 0;
  const prochaine = essaiEnCours ? null : calculerProchaineEcheance(abo, jour);
  let date: DateISO | null = null;
  if (prochaine !== null && joursAvant(prochaine, jour) <= seuilJours) date = prochaine;
  else date = journalPaiements(abo, jour).paiements[0]?.date ?? null;
  if (date === null) return null;
  const c = confirmation(abo, date);
  return { date, montant: c ? c.montant : montantEcheance(abo, date, jour), confirmation: c };
}

/** Marque l'échéance `echeance` comme payée (remplace une confirmation existante), triée par date. */
export function confirmerPaiement(
  abo: Abonnement,
  echeance: DateISO,
  montant: number,
  jour: DateISO,
): Abonnement {
  const autres = confirmations(abo).filter((p) => p.echeance !== echeance);
  const paiementsConfirmes = [...autres, { echeance, montant, confirmeLe: jour }].sort((a, b) =>
    comparerDates(a.echeance, b.echeance),
  );
  return { ...abo, paiementsConfirmes };
}

/** Retire la confirmation de l'échéance `echeance`. */
export function annulerConfirmation(abo: Abonnement, echeance: DateISO): Abonnement {
  return {
    ...abo,
    paiementsConfirmes: confirmations(abo).filter((p) => p.echeance !== echeance),
  };
}
