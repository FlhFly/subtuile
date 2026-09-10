/** Cas d'usage autour des moyens de paiement (§3.3), au-dessus du StorageProvider. */

import type { MoyenPaiement } from '../../domain/types';
import type { StorageProvider } from '../storage/StorageProvider';

export async function enregistrerMoyenPaiement(
  storage: StorageProvider,
  moyen: MoyenPaiement,
): Promise<MoyenPaiement> {
  return storage.moyensPaiement.enregistrer(moyen);
}

/**
 * Suppression logique (EF-01b : restaurable). Les abonnements qui y font
 * référence conservent l'id : la pastille disparaît des tuiles tant que le
 * moyen est supprimé, et revient s'il est restauré.
 */
export async function supprimerMoyenPaiement(
  storage: StorageProvider,
  id: string,
): Promise<boolean> {
  return storage.moyensPaiement.supprimer(id);
}

export async function restaurerMoyenPaiement(
  storage: StorageProvider,
  id: string,
): Promise<boolean> {
  return storage.moyensPaiement.restaurer(id);
}
