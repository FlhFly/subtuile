/**
 * Évolution 24 mois et rapport 12 mois (lot 5, EF-43 étendu, début de C9).
 * Fonctions pures, reconstituées depuis les dates de début, les statuts et
 * l'historique des prix : rien de nouveau n'est saisi.
 *
 * - évolution : total mensuel NORMALISÉ à la fin de chaque mois (abonnements
 *   commencés et pas encore terminés à cette date, au prix de l'époque) ; le
 *   mois courant est pris au jour donné ;
 * - rapport : dépenses réelles des 12 derniers mois (EF-43), hausses de prix
 *   subies et mouvements (abonnements ajoutés, arrêtés) sur la période.
 */

import { ancragePasse, comparerDates, montantMensuel, occurrencesEntre } from './dates';
import { sansConversion, type Convertisseur } from './devises';
import { bornesDuMois, decalerMois, moisDe } from './echeancier';
import { depensesPassees, type SerieMensuelle } from './finances';
import { prixSelonHistorique } from './prix';
import type { Abonnement, DateISO, Devise } from './types';

export const EVOLUTION_NB_MOIS = 24;
export const RAPPORT_NB_MOIS = 12;

/** Date à partir de laquelle un abonnement ne pèse plus ; null = toujours en cours. */
function finDeCharge(abo: Abonnement): DateISO | null {
  switch (abo.statut.type) {
    case 'actif':
      return null;
    case 'resilie_actif_jusquau':
      return abo.statut.jusquau;
    case 'en_pause':
    case 'archive':
      return abo.updatedAt.slice(0, 10);
  }
}

function mensuelALaDate(abo: Abonnement, date: DateISO, convertir: Convertisseur): number {
  const prix = abo.partage
    ? abo.partage.partPayee
    : prixSelonHistorique(abo.historiquePrix, date, abo.prix);
  return convertir(montantMensuel(prix, abo.periodicite), abo.devise);
}

export interface Evolution {
  serie: SerieMensuelle;
  /** total du dernier point − total du premier */
  variation: number;
}

/** Total mensuel normalisé reconstitué, d'il y a `nbMois` mois à aujourd'hui (nbMois + 1 points). */
export function evolutionMensuelle(
  abonnements: readonly Abonnement[],
  jour: DateISO,
  options: { nbMois?: number; convertir?: Convertisseur } = {},
): Evolution {
  const nbMois = options.nbMois ?? EVOLUTION_NB_MOIS;
  const convertir = options.convertir ?? sansConversion;
  const courant = moisDe(jour);
  const mois = [];
  for (let k = -nbMois; k <= 0; k += 1) {
    const m = decalerMois(courant, k);
    const reference = k === 0 ? jour : bornesDuMois(m).fin;
    let montant = 0;
    let nb = 0;
    let estime = false;
    for (const abo of abonnements) {
      if (abo.deletedAt !== null || abo.periodicite.type !== 'recurrente') continue;
      if (comparerDates(abo.dateDebut, reference) > 0) continue;
      const fin = finDeCharge(abo);
      if (fin !== null && comparerDates(fin, reference) <= 0) continue;
      montant += mensuelALaDate(abo, reference, convertir);
      estime = estime || abo.montantEstime;
      nb += 1;
    }
    mois.push({ mois: m, montant, estime, nb });
  }
  const total = mois.reduce((s, x) => s + x.montant, 0);
  const premier = mois[0]?.montant ?? 0;
  const dernier = mois[mois.length - 1]?.montant ?? 0;
  return {
    serie: { mois, total, moyenne: total / mois.length, estime: mois.some((x) => x.estime) },
    variation: dernier - premier,
  };
}

export interface HaussePrix {
  abonnementId: string;
  nom: string;
  date: DateISO;
  devise: Devise;
  avant: number;
  apres: number;
}

export interface Rapport {
  /** premier jour de la période (inclus) */
  depuis: DateISO;
  total: number;
  moyenne: number;
  estime: boolean;
  /** changements de prix à la hausse sur la période, du plus récent au plus ancien */
  hausses: HaussePrix[];
  /** abonnements commencés sur la période */
  ajoutes: string[];
  /** abonnements résiliés, mis en pause ou archivés sur la période */
  arretes: string[];
}

/** Rapport des 12 derniers mois : dépenses réelles, hausses subies, mouvements. */
export function rapport12Mois(
  abonnements: readonly Abonnement[],
  jour: DateISO,
  options: { convertir?: Convertisseur } = {},
): Rapport {
  const depenses = depensesPassees(abonnements, jour, {
    nbMois: RAPPORT_NB_MOIS,
    ...(options.convertir ? { convertir: options.convertir } : {}),
  });
  const depuis = bornesDuMois(decalerMois(moisDe(jour), -RAPPORT_NB_MOIS)).debut;
  const dansPeriode = (d: DateISO) => comparerDates(d, depuis) >= 0 && comparerDates(d, jour) <= 0;
  const vivants = abonnements.filter((a) => a.deletedAt === null);

  const hausses: HaussePrix[] = [];
  for (const abo of vivants) {
    const historique = [...abo.historiquePrix].sort((a, b) => comparerDates(a.date, b.date));
    for (let i = 1; i < historique.length; i += 1) {
      const avant = historique[i - 1]!;
      const apres = historique[i]!;
      if (apres.prix > avant.prix && dansPeriode(apres.date)) {
        hausses.push({
          abonnementId: abo.id,
          nom: abo.nom,
          date: apres.date,
          devise: abo.devise,
          avant: avant.prix,
          apres: apres.prix,
        });
      }
    }
  }
  hausses.sort((a, b) => comparerDates(b.date, a.date));

  return {
    depuis,
    total: depenses.total,
    moyenne: depenses.moyenne,
    estime: depenses.estime,
    hausses,
    ajoutes: vivants.filter((a) => dansPeriode(a.dateDebut)).map((a) => a.nom),
    arretes: vivants
      .filter((a) => {
        const fin = finDeCharge(a);
        return fin !== null && dansPeriode(fin);
      })
      .map((a) => a.nom),
  };
}

/* ---------------------------------------------------------------------------
 * Journal des paiements d'un abonnement (EF-13b, lot 5)
 * ------------------------------------------------------------------------- */

export interface Paiement {
  date: DateISO;
  /** montant supporté au tarif de l'époque (part payée si partagé), dans la devise de l'abonnement */
  montant: number;
}

export interface JournalPaiements {
  /** du plus récent au plus ancien */
  paiements: Paiement[];
  /** total cumulé dépensé depuis le début de l'abonnement */
  cumul: number;
  estime: boolean;
}

/**
 * Prélèvements passés d'un abonnement récurrent, reconstitués depuis sa date
 * de début : chaque occurrence strictement avant aujourd'hui et avant la fin
 * de charge (résiliation, pause, archivage), au prix de l'historique. La
 * période d'essai gratuit est exclue : le premier paiement est la fin d'essai
 * (décision FlhFly du 2026-09-20).
 */
export function journalPaiements(abo: Abonnement, jour: DateISO): JournalPaiements {
  if (abo.periodicite.type !== 'recurrente') return { paiements: [], cumul: 0, estime: false };
  const fin = finDeCharge(abo);
  const paiements: Paiement[] = [];
  for (const date of occurrencesEntre(ancragePasse(abo), abo.periodicite, abo.dateDebut, jour)) {
    if (comparerDates(date, jour) >= 0) continue;
    if (fin !== null && comparerDates(date, fin) >= 0) continue;
    const montant = abo.partage
      ? abo.partage.partPayee
      : prixSelonHistorique(abo.historiquePrix, date, abo.prix);
    paiements.push({ date, montant });
  }
  paiements.reverse();
  const cumul = Math.round(paiements.reduce((s, p) => s + p.montant, 0) * 100) / 100;
  return { paiements, cumul, estime: abo.montantEstime };
}
