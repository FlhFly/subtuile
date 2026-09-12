/**
 * Moteur financier (EF-40 à EF-44, §4.5) — fonctions pures sur les
 * abonnements, en devise de saisie (la conversion d'affichage EF-45 vient
 * ensuite).
 *
 * Règles :
 * - « payant » = abonnement vivant, actif, récurrent, hors essai en cours ; les
 *   archivés, résiliés et en pause sortent des totaux (EF-06) ;
 * - montant supporté = part payée si partagé (EF-44), sinon le prix ; un
 *   montant estimé marque le total comme estimé (EF-04b) ;
 * - prévisionnel (EF-42) : montants réels par mois civil — chaque occurrence
 *   de renouvellement dans le mois compte, au prix en vigueur à sa date (hausse
 *   annoncée comprise), à partir du mois courant ; un abonnement annuel pèse
 *   sur son mois d'échéance ;
 * - dépenses passées (EF-43) : occurrences des mois précédents au prix de
 *   l'époque (historique des prix) ; un résilié compte jusqu'à sa date de fin ;
 *   un archivé ou un abonnement en pause compte jusqu'à sa dernière
 *   modification (meilleure approximation du changement de statut, V1).
 */

import {
  ancrageCycle,
  comparerDates,
  montantMensuel,
  occurrencesEntre,
  prixEffectif,
  prixEnVigueur,
} from './dates';
import { bornesDuMois, decalerMois, moisDe } from './echeancier';
import { prixSelonHistorique } from './prix';
import type { Abonnement, Categorie, DateISO } from './types';

export interface Totaux {
  mensuel: number;
  annuel: number;
  /** au moins un montant estimé (EF-04b) */
  estime: boolean;
  nbPayants: number;
}

/** Abonnement qui coûte aujourd'hui : vivant, actif, récurrent, hors essai en cours. */
export function estPayant(abo: Abonnement, jour: DateISO): boolean {
  if (abo.deletedAt !== null || abo.statut.type !== 'actif') return false;
  if (abo.periodicite.type !== 'recurrente') return false;
  return !(abo.essai !== null && comparerDates(abo.essai.dateFin, jour) >= 0);
}

export function abonnementsPayants(
  abonnements: readonly Abonnement[],
  jour: DateISO,
): Abonnement[] {
  return abonnements.filter((a) => estPayant(a, jour));
}

/** Coût mensuel normalisé supporté par l'utilisateur (EF-40, EF-44). */
export function mensuelNormalise(abo: Abonnement): number {
  return montantMensuel(prixEffectif(abo), abo.periodicite);
}

export function totaux(abonnements: readonly Abonnement[], jour: DateISO): Totaux {
  const payants = abonnementsPayants(abonnements, jour);
  const mensuel = payants.reduce((s, a) => s + mensuelNormalise(a), 0);
  return {
    mensuel,
    annuel: mensuel * 12,
    estime: payants.some((a) => a.montantEstime),
    nbPayants: payants.length,
  };
}

export interface PartCategorie {
  categorie: Categorie;
  mensuel: number;
  /** fraction du total mensuel (0 à 1) */
  part: number;
  nb: number;
}

/** Répartition du coût mensuel par catégorie, la plus lourde d'abord (EF-41). */
export function repartitionParCategorie(
  abonnements: readonly Abonnement[],
  jour: DateISO,
): PartCategorie[] {
  return repartition(abonnementsPayants(abonnements, jour), (a) => a.categorie).map((r) => ({
    categorie: r.cle as Categorie,
    mensuel: r.mensuel,
    part: r.part,
    nb: r.nb,
  }));
}

export interface PartMoyen {
  /** null = sans moyen de paiement renseigné */
  moyenPaiementId: string | null;
  mensuel: number;
  part: number;
  nb: number;
}

/** Répartition du coût mensuel par moyen de paiement (EF-41). */
export function repartitionParMoyenPaiement(
  abonnements: readonly Abonnement[],
  jour: DateISO,
): PartMoyen[] {
  return repartition(abonnementsPayants(abonnements, jour), (a) => a.moyenPaiementId ?? '').map(
    (r) => ({
      moyenPaiementId: r.cle === '' ? null : r.cle,
      mensuel: r.mensuel,
      part: r.part,
      nb: r.nb,
    }),
  );
}

function repartition(
  payants: readonly Abonnement[],
  cleDe: (a: Abonnement) => string,
): { cle: string; mensuel: number; part: number; nb: number }[] {
  const total = payants.reduce((s, a) => s + mensuelNormalise(a), 0);
  const parCle = new Map<string, { mensuel: number; nb: number }>();
  for (const a of payants) {
    const cle = cleDe(a);
    const c = parCle.get(cle) ?? { mensuel: 0, nb: 0 };
    c.mensuel += mensuelNormalise(a);
    c.nb += 1;
    parCle.set(cle, c);
  }
  return [...parCle.entries()]
    .map(([cle, c]) => ({
      cle,
      mensuel: c.mensuel,
      part: total > 0 ? c.mensuel / total : 0,
      nb: c.nb,
    }))
    .sort((x, y) => y.mensuel - x.mensuel || y.nb - x.nb || x.cle.localeCompare(y.cle));
}

export interface MoisMontant {
  /** « YYYY-MM » */
  mois: string;
  montant: number;
  /** au moins un montant estimé dans le mois */
  estime: boolean;
  /** nombre de prélèvements dans le mois */
  nb: number;
}

export interface SerieMensuelle {
  mois: MoisMontant[];
  total: number;
  moyenne: number;
  estime: boolean;
}

/** Montant supporté à une date : part payée si partagé, sinon le prix en vigueur à la date. */
function montantAuJour(abo: Abonnement, date: DateISO, passe: boolean): number {
  if (abo.partage) return abo.partage.partPayee;
  return passe ? prixSelonHistorique(abo.historiquePrix, date, abo.prix) : prixEnVigueur(abo, date);
}

/** Dernier jour où un abonnement peut encore générer un prélèvement, selon son statut. */
function finPrelevements(abo: Abonnement): DateISO | null {
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

function serie(
  abonnements: readonly Abonnement[],
  premierMois: string,
  nbMois: number,
  passe: boolean,
  jour: DateISO,
): SerieMensuelle {
  const mois: MoisMontant[] = [];
  for (let k = 0; k < nbMois; k += 1) {
    const m = decalerMois(premierMois, k);
    const { debut, fin } = bornesDuMois(m);
    let montant = 0;
    let estime = false;
    let nb = 0;
    for (const abo of abonnements) {
      if (abo.deletedAt !== null || abo.periodicite.type !== 'recurrente') continue;
      if (!passe && abo.statut.type !== 'actif') continue;
      const limite = passe ? finPrelevements(abo) : null;
      for (const date of occurrencesEntre(ancrageCycle(abo), abo.periodicite, debut, fin)) {
        // passé : prélèvements strictement avant aujourd'hui et avant la fin du statut
        if (passe && comparerDates(date, jour) >= 0) continue;
        if (limite !== null && comparerDates(date, limite) >= 0) continue;
        montant += montantAuJour(abo, date, passe);
        estime = estime || abo.montantEstime;
        nb += 1;
      }
    }
    mois.push({ mois: m, montant, estime, nb });
  }
  const total = mois.reduce((s, x) => s + x.montant, 0);
  return {
    mois,
    total,
    moyenne: nbMois > 0 ? total / nbMois : 0,
    estime: mois.some((x) => x.estime),
  };
}

/** Prévisionnel des `nbMois` mois civils à partir du mois courant (EF-42). */
export function previsionnel(
  abonnements: readonly Abonnement[],
  jour: DateISO,
  nbMois = 12,
): SerieMensuelle {
  return serie(abonnements, moisDe(jour), nbMois, false, jour);
}

/** Dépenses des `nbMois` mois civils précédant le mois courant (EF-43). */
export function depensesPassees(
  abonnements: readonly Abonnement[],
  jour: DateISO,
  nbMois = 12,
): SerieMensuelle {
  return serie(abonnements, decalerMois(moisDe(jour), -nbMois), nbMois, true, jour);
}
