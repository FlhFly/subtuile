/**
 * Cas d'usage autour des abonnements, au-dessus du StorageProvider.
 * Les composants passent par ici (ou par les hooks) — jamais par Dexie.
 */

import { actualiserAbonnement } from '../../domain/fabriques';
import type { Abonnement, DateISO } from '../../domain/types';
import type { StorageProvider } from '../storage/StorageProvider';

/**
 * Liste les abonnements vivants, mis « au jour » (EF-03 : échéances dépassées
 * recalculées, EF-08b : prix futurs atteints appliqués). Les entités modifiées
 * sont persistées ; les autres ne sont pas réécrites.
 */
export async function chargerAbonnementsAJour(
  storage: StorageProvider,
  jour: DateISO,
): Promise<Abonnement[]> {
  const liste = await storage.abonnements.lister();
  const aJour = liste.map((a) => actualiserAbonnement(a, jour));
  const modifies = aJour.filter((a, i) => a !== liste[i]);
  if (modifies.length === 0) return aJour;
  const enregistres = await storage.abonnements.enregistrerPlusieurs(modifies);
  const parId = new Map(enregistres.map((a) => [a.id, a]));
  return aJour.map((a) => parId.get(a.id) ?? a);
}
