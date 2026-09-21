/**
 * Usage déclaré et coût réel (EF-71, lot 5). Déclaratif uniquement : l'app ne
 * mesure rien, l'utilisateur choisit une fréquence d'utilisation par semaine.
 * Fonctions pures.
 */

import { montantMensuel, prixEffectif } from './dates';
import type { Abonnement } from './types';

/** Choix proposés sur la fiche : jamais, 1, 3 ou 7 utilisations par semaine. */
export const CHOIX_USAGE = [0, 1, 3, 7] as const;

const SEMAINES_PAR_MOIS = 52 / 12;

export interface CoutUsage {
  /** coût mensuel supporté (part payée si partagé), dans la devise de l'abonnement */
  mensuel: number;
  /** utilisations estimées par mois */
  utilisationsParMois: number;
  /** coût par utilisation ; null si l'abonnement n'est pas utilisé */
  parUtilisation: number | null;
  nonUtilise: boolean;
}

/** Coût par utilisation d'un abonnement récurrent dont l'usage est déclaré ; null sinon. */
export function coutUsage(
  abo: Pick<Abonnement, 'prix' | 'partage' | 'periodicite' | 'usageParSemaine'>,
): CoutUsage | null {
  if (abo.usageParSemaine === null || abo.usageParSemaine === undefined) return null;
  if (abo.periodicite.type !== 'recurrente') return null;
  const mensuel = montantMensuel(prixEffectif(abo), abo.periodicite);
  const utilisationsParMois = abo.usageParSemaine * SEMAINES_PAR_MOIS;
  const nonUtilise = abo.usageParSemaine <= 0;
  return {
    mensuel,
    utilisationsParMois,
    parUtilisation: nonUtilise ? null : Math.round((mensuel / utilisationsParMois) * 100) / 100,
    nonUtilise,
  };
}
