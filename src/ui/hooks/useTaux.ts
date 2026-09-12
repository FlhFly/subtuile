import { useEffect, useState } from 'react';
import { refDataEmbarque, TAUX_EMBARQUES } from '../../data/refdata/RefDataProvider';
import type { Taux } from '../../domain/types';

/** Taux de change indicatifs (EF-45) via le RefDataProvider (§5.6) ; jeu embarqué immédiat. */
export function useTaux(): Taux {
  const [taux, setTaux] = useState<Taux>(TAUX_EMBARQUES);
  useEffect(() => {
    let actif = true;
    void refDataEmbarque.taux.charger().then((charge) => {
      if (actif) setTaux((courant) => (courant === charge ? courant : charge));
    });
    return () => {
      actif = false;
    };
  }, []);
  return taux;
}
