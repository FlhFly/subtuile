/**
 * Cas d'usage autour des abonnements, au-dessus du StorageProvider.
 * Les composants passent par ici (ou par les hooks) — jamais par Dexie.
 */

import { calculerProchaineEcheance } from '../../domain/dates';
import { actualiserAbonnement } from '../../domain/fabriques';
import { appliquerOrdre } from '../../domain/ordre';
import type { Abonnement, DateISO, Statut } from '../../domain/types';
import type { StorageProvider } from '../storage/StorageProvider';

/** Enregistre (création ou modification) après mise au jour de l'échéance. */
export async function enregistrerAbonnement(
  storage: StorageProvider,
  abo: Abonnement,
  jour: DateISO,
): Promise<Abonnement> {
  return storage.abonnements.enregistrer(actualiserAbonnement(abo, jour));
}

/** Change le statut (EF-06) et recalcule l'échéance ; renvoie l'entité enregistrée, ou undefined si absente. */
export async function changerStatut(
  storage: StorageProvider,
  id: string,
  statut: Statut,
  jour: DateISO,
): Promise<Abonnement | undefined> {
  const abo = await storage.abonnements.lire(id);
  if (!abo) return undefined;
  const maj = { ...abo, statut };
  return storage.abonnements.enregistrer({
    ...maj,
    prochaineEcheance: calculerProchaineEcheance(maj, jour),
  });
}

/** Suppression logique (EF-01) ; l'annulation passe par `storage.abonnements.restaurer` (EF-01b). */
export async function supprimerAbonnement(storage: StorageProvider, id: string): Promise<boolean> {
  return storage.abonnements.supprimer(id);
}

/**
 * Liste les abonnements vivants, mis « au jour » (EF-03 : échéances dépassées
 * recalculées, EF-06 : résiliés archivés après leur date, pauses reprises à
 * leur date, EF-08b : prix futurs atteints appliqués). Les entités modifiées
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

/**
 * EF-14 : inscrit l'ordre personnalisé des tuiles visibles (`ids`, dans
 * l'ordre voulu) et persiste les seuls abonnements dont la position change.
 * Renvoie la liste complète mise à jour, dans l'ordre reçu.
 */
export async function enregistrerOrdre(
  storage: StorageProvider,
  abonnements: readonly Abonnement[],
  ids: readonly string[],
  jour: DateISO,
): Promise<Abonnement[]> {
  const aJour = appliquerOrdre(abonnements, ids, jour);
  const modifies = aJour.filter((a, i) => a !== abonnements[i]);
  if (modifies.length === 0) return aJour;
  const enregistres = await storage.abonnements.enregistrerPlusieurs(modifies);
  const parId = new Map(enregistres.map((a) => [a.id, a]));
  return aJour.map((a) => parId.get(a.id) ?? a);
}
