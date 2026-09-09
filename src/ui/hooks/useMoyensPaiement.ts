import { useEffect, useState } from 'react';
import type { MoyenPaiement } from '../../domain/types';
import { useStorage } from '../contexts/StorageContext';

/** Moyens de paiement vivants, indexés par id, rechargés à chaque écriture. */
export function useMoyensPaiement(): Map<string, MoyenPaiement> {
  const storage = useStorage();
  const [parId, setParId] = useState<Map<string, MoyenPaiement>>(() => new Map());

  useEffect(() => {
    let actif = true;
    const charger = () => {
      void storage.moyensPaiement.lister().then((liste) => {
        if (actif) setParId(new Map(liste.map((m) => [m.id, m])));
      });
    };
    charger();
    const desinscrire = storage.souscrire(charger);
    return () => {
      actif = false;
      desinscrire();
    };
  }, [storage]);

  return parId;
}
