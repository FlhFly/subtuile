import { useCallback, useEffect, useState } from 'react';
import {
  enregistrerParametres,
  lireParametres,
  type ChampsPilotage,
} from '../../data/services/pilotage';
import { parametresPilotageDefaut } from '../../domain/pilotage';
import type { ParametresPilotage } from '../../domain/types';
import { useStorage } from '../contexts/StorageContext';

export interface EtatParametres {
  parametres: ParametresPilotage;
  chargement: boolean;
  enregistrer: (champs: ChampsPilotage) => Promise<void>;
}

/** Paramètres de pilotage (budget, objectif), rechargés à chaque écriture dans le stockage. */
export function useParametres(): EtatParametres {
  const storage = useStorage();
  const [parametres, setParametres] = useState<ParametresPilotage>(parametresPilotageDefaut);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    let actif = true;
    const charger = () => {
      void lireParametres(storage).then((p) => {
        if (!actif) return;
        setParametres(p);
        setChargement(false);
      });
    };
    charger();
    const desinscrire = storage.souscrire(charger);
    return () => {
      actif = false;
      desinscrire();
    };
  }, [storage]);

  const enregistrer = useCallback(
    async (champs: ChampsPilotage) => {
      await enregistrerParametres(storage, champs);
    },
    [storage],
  );

  return { parametres, chargement, enregistrer };
}
