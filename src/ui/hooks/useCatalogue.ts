import { useEffect, useMemo, useState } from 'react';
import { CATALOGUE_EMBARQUE, refDataEmbarque } from '../../data/refdata/RefDataProvider';
import { fusionnerCatalogue } from '../../domain/catalogue';
import type { Catalogue, Service, ServicePersonnalise } from '../../domain/types';
import { useStorage } from '../contexts/StorageContext';

/**
 * Catalogue vu par l'app : jeu de référence via le RefDataProvider (§5.6),
 * fusionné avec « Mes services » (EF-09) lus dans le stockage et rechargés
 * à chaque écriture. La source de référence pourra devenir distante sans
 * changer les composants.
 */
export function useCatalogue(): {
  catalogue: Catalogue;
  parId: Map<string, Service>;
  personnalises: ServicePersonnalise[];
} {
  const storage = useStorage();
  const [embarque, setEmbarque] = useState<Catalogue>(CATALOGUE_EMBARQUE);
  const [personnalises, setPersonnalises] = useState<ServicePersonnalise[]>([]);

  useEffect(() => {
    let actif = true;
    void refDataEmbarque.catalogue.charger().then((charge) => {
      if (actif) setEmbarque((courant) => (courant === charge ? courant : charge));
    });
    return () => {
      actif = false;
    };
  }, []);

  useEffect(() => {
    let actif = true;
    const charger = () => {
      void storage.servicesPersonnalises.lister().then((liste) => {
        if (actif) setPersonnalises(liste);
      });
    };
    charger();
    const desinscrire = storage.souscrire(charger);
    return () => {
      actif = false;
      desinscrire();
    };
  }, [storage]);

  const catalogue = useMemo(
    () => fusionnerCatalogue(embarque, personnalises),
    [embarque, personnalises],
  );
  const parId = useMemo(() => new Map(catalogue.data.map((s) => [s.id, s])), [catalogue]);
  return { catalogue, parId, personnalises };
}
