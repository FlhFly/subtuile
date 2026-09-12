/**
 * Devises (EF-45, EF-45b) : symboles et conversion à des taux figés
 * « indicatifs » (jeu de données de référence §5.6, base EUR). Aucun appel
 * réseau ; les taux portent leur date de fraîcheur.
 */

import type { Abonnement, DateISO, Devise, TauxChange } from './types';

export const SYMBOLES: Record<Devise, string> = { EUR: '€', USD: '$', GBP: '£', CHF: 'CHF' };

/** Convertit un montant de `de` vers `vers` (taux exprimés par rapport à la base EUR). */
export function convertir(montant: number, de: Devise, vers: Devise, taux: TauxChange): number {
  if (de === vers) return montant;
  return (montant / taux.taux[de]) * taux.taux[vers];
}

/** Fonction de conversion vers une devise cible, à passer au moteur financier. */
export type Convertisseur = (montant: number, devise: Devise) => number;

export const sansConversion: Convertisseur = (montant) => montant;

export function convertisseurVers(vers: Devise, taux: TauxChange): Convertisseur {
  return (montant, devise) => convertir(montant, devise, vers, taux);
}

/** Vrai si au moins un abonnement vivant non archivé est saisi dans une autre devise. */
export function contientAutreDevise(
  abonnements: readonly Pick<Abonnement, 'devise' | 'statut' | 'deletedAt'>[],
  vers: Devise,
): boolean {
  return abonnements.some(
    (a) => a.deletedAt === null && a.statut.type !== 'archive' && a.devise !== vers,
  );
}

export interface FraicheurTaux {
  publieLe: DateISO;
  version: number;
}
