/**
 * Paramètres de pilotage (lot 5) : lecture avec valeurs par défaut et mise à
 * jour partielle de l'enregistrement unique `pilotage`.
 */

import { ID_PILOTAGE, parametresPilotageDefaut } from '../../domain/pilotage';
import type { ParametresPilotage } from '../../domain/types';
import type { StorageProvider } from '../storage/StorageProvider';

export type ChampsPilotage = Partial<Pick<ParametresPilotage, 'budgetMensuel' | 'objectif'>>;

export async function lireParametres(storage: StorageProvider): Promise<ParametresPilotage> {
  return (await storage.parametres.lire(ID_PILOTAGE)) ?? parametresPilotageDefaut();
}

/** Écrit les champs fournis, conserve les autres. */
export async function enregistrerParametres(
  storage: StorageProvider,
  champs: ChampsPilotage,
): Promise<ParametresPilotage> {
  const courant = await lireParametres(storage);
  return storage.parametres.enregistrer({ ...courant, ...champs });
}
