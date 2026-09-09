/**
 * Fabriques d'entités : valeurs par défaut du modèle §3, champs techniques §3.5,
 * échéance calculée par le moteur de dates. Fonctions pures (l'instant et le
 * jour sont injectables).
 */

import { nouvelId } from '../lib/ids';
import { maintenant } from '../lib/horloge';
import { ancrageCycle, appliquerPrixFutur, aujourdhui, calculerProchaineEcheance } from './dates';
import type {
  Abonnement,
  DateISO,
  Horodatage,
  MoyenPaiement,
  Periodicite,
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
 * Met un abonnement « au jour » : applique un prix futur atteint (EF-08b) et
 * recalcule la prochaine échéance (EF-03). Renvoie le MÊME objet si rien ne
 * change, afin d'éviter des écritures inutiles.
 */
export function actualiserAbonnement(abo: Abonnement, jour: DateISO): Abonnement {
  const avecPrix = appliquerPrixFutur(abo, jour);
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
