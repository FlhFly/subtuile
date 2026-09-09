import { createContext, useContext, type ReactNode } from 'react';
import type { StorageProvider } from '../../data/storage';

const StorageContext = createContext<StorageProvider | null>(null);

export function StorageContextProvider({
  storage,
  children,
}: {
  storage: StorageProvider;
  children: ReactNode;
}) {
  return <StorageContext.Provider value={storage}>{children}</StorageContext.Provider>;
}

/** Accès au StorageProvider (§5.6) — le seul chemin vers les données depuis l'UI. */
export function useStorage(): StorageProvider {
  const storage = useContext(StorageContext);
  if (!storage) throw new Error('useStorage : StorageContextProvider absent');
  return storage;
}
