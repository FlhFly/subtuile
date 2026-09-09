import { useEffect, useMemo, useState } from 'react';
import { CATALOGUE_EMBARQUE, refDataEmbarque } from '../../data/refdata/RefDataProvider';
import type { Catalogue, Service } from '../../domain/types';

/**
 * Catalogue de services via le RefDataProvider (§5.6). Le jeu embarqué est
 * disponible immédiatement ; la source pourra devenir distante sans changer
 * les composants.
 */
export function useCatalogue(): { catalogue: Catalogue; parId: Map<string, Service> } {
  const [catalogue, setCatalogue] = useState<Catalogue>(CATALOGUE_EMBARQUE);

  useEffect(() => {
    let actif = true;
    void refDataEmbarque.catalogue.charger().then((charge) => {
      if (actif) setCatalogue((courant) => (courant === charge ? courant : charge));
    });
    return () => {
      actif = false;
    };
  }, []);

  const parId = useMemo(() => new Map(catalogue.data.map((s) => [s.id, s])), [catalogue]);
  return { catalogue, parId };
}
