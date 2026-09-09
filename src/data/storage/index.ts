import { creerDexieProvider } from './dexieProvider';
import type { StorageProvider } from './StorageProvider';

export type { StorageProvider } from './StorageProvider';

/** Implémentation V1 : IndexedDB local via Dexie. Point d'entrée unique pour l'app. */
export function creerStorageParDefaut(): StorageProvider {
  return creerDexieProvider();
}
