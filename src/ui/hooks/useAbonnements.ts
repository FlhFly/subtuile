import { useCallback, useEffect, useState } from 'react';
import { chargerAbonnementsAJour } from '../../data/services/abonnements';
import { aujourdhui } from '../../domain/dates';
import type { Abonnement } from '../../domain/types';
import { useStorage } from '../contexts/StorageContext';

export interface EtatAbonnements {
  abonnements: Abonnement[];
  chargement: boolean;
  erreur: string | null;
  recharger: () => Promise<void>;
}

/**
 * Abonnements vivants, mis au jour, rechargés à chaque écriture dans le
 * stockage (souscription au StorageProvider).
 */
export function useAbonnements(): EtatAbonnements {
  const storage = useStorage();
  const [abonnements, setAbonnements] = useState<Abonnement[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const recharger = useCallback(async () => {
    try {
      const liste = await chargerAbonnementsAJour(storage, aujourdhui());
      setAbonnements(liste);
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setChargement(false);
    }
  }, [storage]);

  useEffect(() => {
    let actif = true;
    const charger = () => {
      if (actif) void recharger();
    };
    charger();
    const desinscrire = storage.souscrire(charger);
    return () => {
      actif = false;
      desinscrire();
    };
  }, [storage, recharger]);

  return { abonnements, chargement, erreur, recharger };
}
