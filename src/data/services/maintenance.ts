/**
 * Entretien du stockage local (§3.5, revue RGPD du 2026-09-16) : les
 * suppressions logiques (tombstones) gardent leur contenu le temps d'un
 * éventuel retour en arrière, puis sont détruites physiquement.
 */

import type { StorageProvider } from '../storage/StorageProvider';

/** Délai de conservation d'une suppression logique avant purge physique. */
export const PURGE_SUPPRESSIONS_JOURS = 30;

/** Horodatage ISO en deçà duquel une suppression est purgée. */
export function limitePurge(maintenant: Date, jours = PURGE_SUPPRESSIONS_JOURS): string {
  return new Date(maintenant.getTime() - jours * 86_400_000).toISOString();
}

/**
 * Détruit, dans les trois dépôts, les entités supprimées depuis plus de
 * `jours` jours ; renvoie le nombre d'entités purgées. Appelé à l'ouverture.
 */
export async function purgerSuppressions(
  storage: StorageProvider,
  maintenant = new Date(),
  jours = PURGE_SUPPRESSIONS_JOURS,
): Promise<number> {
  const avant = limitePurge(maintenant, jours);
  const nombres = await Promise.all([
    storage.abonnements.purger(avant),
    storage.moyensPaiement.purger(avant),
    storage.servicesPersonnalises.purger(avant),
  ]);
  return nombres.reduce((total, n) => total + n, 0);
}
