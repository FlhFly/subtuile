import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  limitePurge,
  PURGE_SUPPRESSIONS_JOURS,
  purgerSuppressions,
} from '../src/data/services/maintenance';
import { creerDexieProvider, type DexieProvider } from '../src/data/storage/dexieProvider';
import { creerAbonnement, creerMoyenPaiement } from '../src/domain/fabriques';
import { creerServicePersonnalise } from '../src/domain/servicePersonnalise';
import { PERIODICITES } from '../src/domain/types';

const JOUR = '2026-09-17';
const MAINTENANT = new Date('2026-09-17T10:00:00.000Z');

describe('purge des suppressions logiques (§3.5, revue RGPD)', () => {
  let storage: DexieProvider;
  beforeEach(() => {
    storage = creerDexieProvider(`subtuile-test-purge-${Date.now()}-${Math.random()}`);
  });
  afterEach(async () => {
    await storage.supprimerBase();
  });

  it('limite : 30 jours avant l’instant donné', () => {
    expect(PURGE_SUPPRESSIONS_JOURS).toBe(30);
    expect(limitePurge(MAINTENANT)).toBe('2026-08-18T10:00:00.000Z');
    expect(limitePurge(MAINTENANT, 1)).toBe('2026-09-16T10:00:00.000Z');
  });

  it('détruit les suppressions de plus de 30 jours dans les trois dépôts, garde les récentes et les vivants', async () => {
    const abo = (nom: string) =>
      creerAbonnement(
        { nom, prix: 5, periodicite: PERIODICITES.mensuelle, dateDebut: '2026-01-01' },
        { jour: JOUR },
      );
    const vieux = abo('Vieux');
    const recent = abo('Récent');
    const vivant = abo('Vivant');
    const mp = creerMoyenPaiement({ type: 'cb', libelle: 'CB', quatreDerniers: '4412' });
    const perso = creerServicePersonnalise({ nom: 'Ma salle', categorie: 'sport', urlGestion: '' });
    await storage.abonnements.enregistrerPlusieurs([vieux, recent, vivant]);
    await storage.moyensPaiement.enregistrer(mp);
    await storage.servicesPersonnalises.enregistrer(perso);
    for (const [depot, id] of [
      [storage.abonnements, vieux.id],
      [storage.abonnements, recent.id],
      [storage.moyensPaiement, mp.id],
      [storage.servicesPersonnalises, perso.id],
    ] as const) {
      await depot.supprimer(id);
    }
    // suppressions anciennes : abonnement « Vieux », moyen de paiement et service proposé
    const dater = async (depot: typeof storage.abonnements, id: string, deletedAt: string) => {
      const e = (await depot.lire(id, { inclureSupprimes: true }))!;
      await depot.enregistrer({ ...e, deletedAt });
    };
    const ancien = '2026-07-01T00:00:00.000Z';
    await dater(storage.abonnements, vieux.id, ancien);
    await dater(storage.moyensPaiement as unknown as typeof storage.abonnements, mp.id, ancien);
    await dater(
      storage.servicesPersonnalises as unknown as typeof storage.abonnements,
      perso.id,
      ancien,
    );

    expect(await purgerSuppressions(storage, MAINTENANT)).toBe(3);
    const abos = await storage.abonnements.lister({ inclureSupprimes: true });
    expect(abos.map((a) => a.nom).sort()).toEqual(['Récent', 'Vivant']);
    expect(await storage.moyensPaiement.lister({ inclureSupprimes: true })).toEqual([]);
    expect(await storage.servicesPersonnalises.lister({ inclureSupprimes: true })).toEqual([]);
    // une seconde passe ne trouve plus rien
    expect(await purgerSuppressions(storage, MAINTENANT)).toBe(0);
  });
});
