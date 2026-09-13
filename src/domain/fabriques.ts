/**
 * Fabriques d'entités : valeurs par défaut du modèle §3, champs techniques §3.5,
 * échéance calculée par le moteur de dates. Fonctions pures (l'instant et le
 * jour sont injectables).
 */

import { nouvelId } from '../lib/ids';
import { maintenant } from '../lib/horloge';
import {
  ancrageCycle,
  appliquerPrixFutur,
  aujourdhui,
  calculerProchaineEcheance,
  comparerDates,
  occurrenceSuivante,
} from './dates';
import type {
  Abonnement,
  DateISO,
  Horodatage,
  MoyenPaiement,
  Periodicite,
  PeriodiciteRecurrente,
  UnitePeriode,
} from './types';

type ChampsRequisAbonnement = Pick<Abonnement, 'nom' | 'prix' | 'periodicite' | 'dateDebut'>;
export type NouvelAbonnement = ChampsRequisAbonnement & Partial<Abonnement>;

export interface ContexteFabrique {
  /** date civile locale du jour */
  jour?: DateISO;
  /** instant courant (updatedAt) */
  instant?: Horodatage;
}

/**
 * Crée un abonnement complet à partir des champs requis (nom, prix,
 * périodicité, date de début) et de surcharges optionnelles.
 * - historiquePrix reçoit l'entrée initiale (prix en vigueur dès l'ancrage du
 *   cycle) si elle est absente et que l'abonnement est récurrent ;
 * - prochaineEcheance est calculée.
 */
export function creerAbonnement(champs: NouvelAbonnement, ctx: ContexteFabrique = {}): Abonnement {
  const jour = ctx.jour ?? aujourdhui();
  const base: Abonnement = {
    id: nouvelId(),
    updatedAt: ctx.instant ?? maintenant(),
    deletedAt: null,
    serviceId: null,
    formuleId: null,
    formule: null,
    categorie: 'autre',
    montantEstime: false,
    regularisation: null,
    prixFutur: null,
    modeResiliation: 'lien',
    contactResiliation: null,
    referenceClient: null,
    devise: 'EUR',
    echeanceManuelle: null,
    prochaineEcheance: null,
    essai: null,
    engagement: null,
    partage: null,
    moyenPaiementId: null,
    canalAchat: 'direct',
    statut: { type: 'actif' },
    urlGestion: null,
    historiquePrix: [],
    tags: [],
    notes: '',
    couleur: null,
    logo: null,
    alerteJoursAvant: null,
    ordre: null,
    ...champs,
  };
  if (base.historiquePrix.length === 0 && base.periodicite.type === 'recurrente') {
    base.historiquePrix = [{ date: ancrageCycle(base), prix: base.prix }];
  }
  base.prochaineEcheance = calculerProchaineEcheance(base, jour);
  return base;
}

/**
 * Transitions automatiques de statut (EF-06) : « résilié — actif jusqu'au »
 * devient archivé le lendemain de la date ; « en pause jusqu'au » reprend à la
 * date. Renvoie le MÊME objet si rien ne change.
 */
export function actualiserStatut(abo: Abonnement, jour: DateISO): Abonnement {
  const s = abo.statut;
  if (s.type === 'resilie_actif_jusquau' && comparerDates(s.jusquau, jour) < 0) {
    return { ...abo, statut: { type: 'archive' } };
  }
  if (s.type === 'en_pause' && s.repriseLe !== null && comparerDates(s.repriseLe, jour) <= 0) {
    return { ...abo, statut: { type: 'actif' } };
  }
  return abo;
}

/**
 * EF-04b : une régularisation annuelle passée est reportée à sa prochaine
 * date anniversaire (la facture suivante ne doit pas être une surprise non plus).
 */
export function actualiserRegularisation(abo: Abonnement, jour: DateISO): Abonnement {
  const r = abo.regularisation;
  if (!r || comparerDates(r.date, jour) >= 0) return abo;
  const annuel: PeriodiciteRecurrente = { type: 'recurrente', unite: 'an', intervalle: 1 };
  return { ...abo, regularisation: { date: occurrenceSuivante(r.date, annuel, jour) } };
}

/**
 * Met un abonnement « au jour » : transitions de statut (EF-06), régularisation
 * reportée (EF-04b), prix futur atteint (EF-08b), prochaine échéance
 * recalculée (EF-03). Renvoie le MÊME objet si rien ne change, afin d'éviter
 * des écritures inutiles.
 */
export function actualiserAbonnement(abo: Abonnement, jour: DateISO): Abonnement {
  const avecPrix = appliquerPrixFutur(
    actualiserRegularisation(actualiserStatut(abo, jour), jour),
    jour,
  );
  const echeance = calculerProchaineEcheance(avecPrix, jour);
  if (avecPrix === abo && echeance === abo.prochaineEcheance) return abo;
  return { ...avecPrix, prochaineEcheance: echeance };
}

type ChampsRequisMoyenPaiement = Pick<MoyenPaiement, 'type' | 'libelle'>;
export type NouveauMoyenPaiement = ChampsRequisMoyenPaiement & Partial<MoyenPaiement>;

/** Couleur de pastille par défaut selon le type (extraite de la maquette). */
export const COULEURS_MOYEN_PAIEMENT: Record<MoyenPaiement['type'], string> = {
  cb: '#2f5fd0',
  paypal: '#0f8bd0',
  apple_pay: '#5f5b53',
  sepa: '#4a7d35',
  autre: '#7d7568',
};

export function creerMoyenPaiement(
  champs: NouveauMoyenPaiement,
  ctx: ContexteFabrique = {},
): MoyenPaiement {
  return {
    id: nouvelId(),
    updatedAt: ctx.instant ?? maintenant(),
    deletedAt: null,
    quatreDerniers: null,
    dateExpiration: null,
    couleur: COULEURS_MOYEN_PAIEMENT[champs.type],
    ...champs,
  };
}

/** Périodicité « personnalisée » saisie librement (unité + intervalle), validée. */
export function periodicitePersonnalisee(unite: UnitePeriode, intervalle: number): Periodicite {
  if (!Number.isInteger(intervalle) || intervalle < 1) {
    throw new RangeError(`Intervalle invalide : ${String(intervalle)}`);
  }
  return { type: 'recurrente', unite, intervalle };
}
