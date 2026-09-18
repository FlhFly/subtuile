/**
 * Pilotage (lot 5, EF-70) : budget mensuel global, puis objectif d'économie.
 * Fonctions pures ; les paramètres vivent dans l'enregistrement unique
 * `pilotage` du stockage (§3.5, schéma d'export 2).
 */

import type { Convertisseur } from './devises';
import { joursAvant } from './dates';
import type { DateISO, ParametresPilotage } from './types';

export const ID_PILOTAGE = 'pilotage';

/** Paramètres avant toute saisie : ni budget, ni objectif. */
export function parametresPilotageDefaut(): ParametresPilotage {
  return { id: ID_PILOTAGE, budgetMensuel: null, objectif: null, updatedAt: '', deletedAt: null };
}

export interface EtatBudget {
  /** plafond, dans la devise d'affichage */
  budget: number;
  /** total mensuel normalisé, dans la devise d'affichage */
  total: number;
  /** total − budget : négatif = marge restante */
  ecart: number;
  /** total / budget, non borné (la jauge le borne à 1) */
  ratio: number;
  depasse: boolean;
}

/** État du budget face au total mensuel, les deux dans la devise d'affichage. */
export function etatBudget(totalMensuel: number, budget: number): EtatBudget {
  const ecart = totalMensuel - budget;
  return {
    budget,
    total: totalMensuel,
    ecart,
    ratio: budget > 0 ? totalMensuel / budget : 0,
    depasse: ecart > 0.005,
  };
}

/** Budget enregistré, converti dans la devise d'affichage ; null sans budget. */
export function budgetConverti(
  parametres: Pick<ParametresPilotage, 'budgetMensuel'>,
  convertir: Convertisseur,
): number | null {
  const b = parametres.budgetMensuel;
  return b ? convertir(b.montant, b.devise) : null;
}

export interface ObjectifConverti {
  /** cible mensuelle, dans la devise d'affichage */
  cible: number;
  date: DateISO;
}

/** Objectif enregistré, cible convertie dans la devise d'affichage ; null sans objectif. */
export function objectifConverti(
  parametres: Pick<ParametresPilotage, 'objectif'>,
  convertir: Convertisseur,
): ObjectifConverti | null {
  const o = parametres.objectif;
  return o ? { cible: convertir(o.cible, o.devise), date: o.date } : null;
}

export interface EtatObjectif {
  cible: number;
  total: number;
  date: DateISO;
  /** total − cible : négatif ou nul = objectif atteint */
  ecart: number;
  atteint: boolean;
  /** jours restants avant la date (négatif = date passée) */
  joursRestants: number;
  datePassee: boolean;
  /** cible / total, bornée à 1 : 1 = objectif atteint */
  progression: number;
}

/** Progression vers l'objectif « passer sous X d'ici [date] », tout dans la devise d'affichage. */
export function etatObjectif(
  totalMensuel: number,
  objectif: ObjectifConverti,
  jour: DateISO,
): EtatObjectif {
  const ecart = totalMensuel - objectif.cible;
  const atteint = ecart <= 0.005;
  const joursRestants = joursAvant(objectif.date, jour);
  return {
    cible: objectif.cible,
    total: totalMensuel,
    date: objectif.date,
    ecart: Math.round(ecart * 100) / 100,
    atteint,
    joursRestants,
    datePassee: joursRestants < 0,
    progression: atteint || totalMensuel <= 0 ? 1 : Math.min(objectif.cible / totalMensuel, 1),
  };
}

/** Date portée par la clé de l'alerte de dépassement : une par mois civil. */
export function dateCleBudget(jour: DateISO): DateISO {
  return `${jour.slice(0, 7)}-01`;
}
