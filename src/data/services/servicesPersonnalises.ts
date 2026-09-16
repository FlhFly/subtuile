/** Cas d'usage « Mes services » (EF-09), au-dessus du StorageProvider. */

import { migrerAbonnements, type Correspondance } from '../../domain/migrationServices';
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

export interface BilanMigration {
  nbAbonnements: number;
  /** remet l'entrée maison et les abonnements tels qu'ils étaient (EF-01b) */
  annuler: () => Promise<void>;
}

/**
 * EF-09 : bascule une entrée « Mes services » vers la version officielle du
 * catalogue — abonnements liés réécrits (`migrerAbonnements`), entrée maison
 * supprimée logiquement. Annulable tant que le toast est affiché.
 */
export async function migrerVersOfficiel(
  storage: StorageProvider,
  correspondance: Correspondance,
): Promise<BilanMigration> {
  const tous = await storage.abonnements.lister();
  const avant = tous.filter((a) => a.serviceId === correspondance.personnalise.id);
  const apres = migrerAbonnements(tous, correspondance);
  if (apres.length > 0) await storage.abonnements.enregistrerPlusieurs(apres);
  await storage.servicesPersonnalises.supprimer(correspondance.personnalise.id);
  return {
    nbAbonnements: apres.length,
    annuler: async () => {
      await storage.servicesPersonnalises.restaurer(correspondance.personnalise.id);
      if (avant.length > 0) await storage.abonnements.enregistrerPlusieurs(avant);
    },
  };
}

export async function restaurerServicePersonnalise(
  storage: StorageProvider,
  id: string,
): Promise<boolean> {
  return storage.servicesPersonnalises.restaurer(id);
}
