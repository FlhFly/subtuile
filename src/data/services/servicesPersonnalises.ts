/** Cas d'usage « Mes services » (EF-09), au-dessus du StorageProvider. */

import type { ServicePersonnalise } from '../../domain/types';
import type { StorageProvider } from '../storage/StorageProvider';

export async function enregistrerServicePersonnalise(
  storage: StorageProvider,
  service: ServicePersonnalise,
): Promise<ServicePersonnalise> {
  return storage.servicesPersonnalises.enregistrer(service);
}

/**
 * Suppression logique restaurable (EF-01b). Les abonnements liés conservent
 * leur `serviceId` : ils retombent sur leurs propres couleur et initiales
 * tant que l'entrée est supprimée.
 */
export async function supprimerServicePersonnalise(
  storage: StorageProvider,
  id: string,
): Promise<boolean> {
  return storage.servicesPersonnalises.supprimer(id);
}

export async function restaurerServicePersonnalise(
  storage: StorageProvider,
  id: string,
): Promise<boolean> {
  return storage.servicesPersonnalises.restaurer(id);
}
