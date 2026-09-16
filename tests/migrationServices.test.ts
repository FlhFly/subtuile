import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CATALOGUE_EMBARQUE, trouverService } from '../src/data/refdata/RefDataProvider';
import {
  enregistrerServicePersonnalise,
  migrerVersOfficiel,
} from '../src/data/services/servicesPersonnalises';
import { creerDexieProvider, type DexieProvider } from '../src/data/storage/dexieProvider';
import { creerAbonnement } from '../src/domain/fabriques';
import {
  cleNom,
  correspondancesOfficielles,
  migrerAbonnements,
} from '../src/domain/migrationServices';
import { creerServicePersonnalise } from '../src/domain/servicePersonnalise';
import { PERIODICITES, type Abonnement } from '../src/domain/types';

const JOUR = '2026-09-16';
const basicFit = trouverService(CATALOGUE_EMBARQUE, 'basicfit')!;
const maison = creerServicePersonnalise({
  nom: 'basic fit',
  categorie: 'sport',
  urlGestion: 'https://exemple.test/basic',
});
const autre = creerServicePersonnalise({ nom: 'Ma salle', categorie: 'sport', urlGestion: '' });
const abo = (id: string, champs: Partial<Abonnement>): Abonnement =>
  creerAbonnement(
    {
      id,
      nom: id,
      prix: 24.99,
      periodicite: PERIODICITES.mensuelle,
      dateDebut: '2026-01-10',
      devise: 'USD',
      moyenPaiementId: 'mp-1',
      ...champs,
    },
    { jour: JOUR },
  );

describe('migration « Mes services » → catalogue commun (EF-09)', () => {
  it('cleNom : accents, casse et ponctuation ignorés', () => {
    expect(cleNom('Basic-Fit')).toBe('basic fit');
    expect(cleNom('  basic   FIT ')).toBe('basic fit');
    expect(cleNom('Canal+')).toBe('canal');
    expect(cleNom('Éléphant Télé')).toBe('elephant tele');
  });

  it('correspondances : nom rapproché, entrées supprimées ou refusées ignorées, nom sans homonyme ignoré', () => {
    const catalogue = CATALOGUE_EMBARQUE.data;
    expect(correspondancesOfficielles([maison, autre], catalogue)).toEqual([
      { personnalise: maison, officiel: basicFit },
    ]);
    expect(correspondancesOfficielles([maison], catalogue, [maison.id])).toEqual([]);
    expect(
      correspondancesOfficielles([{ ...maison, deletedAt: '2026-09-16T10:00:00.000Z' }], catalogue),
    ).toEqual([]);
    // une entrée maison présente dans le catalogue fusionné ne se rapproche pas d'elle-même
    expect(correspondancesOfficielles([maison], [maison, ...catalogue])).toEqual([
      { personnalise: maison, officiel: basicFit },
    ]);
  });

  it('migrerAbonnements : seuls les abonnements liés changent, prix et compagnie conservés', () => {
    const lie = abo('lie', { serviceId: maison.id, urlGestion: maison.urlGestion });
    const lieAvecUrlPerso = abo('perso', {
      serviceId: maison.id,
      urlGestion: 'https://mon-espace.test',
      modeResiliation: 'telephone',
      contactResiliation: '01 02 03 04 05',
    });
    const sansLien = abo('libre', { serviceId: null });
    const migres = migrerAbonnements([lie, lieAvecUrlPerso, sansLien], {
      personnalise: maison,
      officiel: basicFit,
    });
    expect(migres.map((a) => a.id)).toEqual(['lie', 'perso']);
    const [m1, m2] = migres as [Abonnement, Abonnement];
    // liaison et formule
    expect(m1.serviceId).toBe('basicfit');
    expect(m1.formuleId).toBeNull();
    // héritée de l'entrée maison → reprise de l'officiel
    expect(m1.urlGestion).toBe(basicFit.urlGestion);
    expect(m1.modeResiliation).toBe(basicFit.modeResiliation);
    // saisie par l'utilisateur → conservée
    expect(m2.urlGestion).toBe('https://mon-espace.test');
    expect(m2.modeResiliation).toBe('telephone');
    expect(m2.contactResiliation).toBe('01 02 03 04 05');
    // tout le reste intact
    expect(m1).toMatchObject({
      prix: 24.99,
      devise: 'USD',
      periodicite: PERIODICITES.mensuelle,
      moyenPaiementId: 'mp-1',
      nom: 'lie',
    });
  });
});

describe('migrerVersOfficiel (stockage)', () => {
  let storage: DexieProvider;
  beforeEach(() => {
    storage = creerDexieProvider(`subtuile-test-migration-${Date.now()}-${Math.random()}`);
  });
  afterEach(async () => {
    await storage.supprimerBase();
  });

  it('réécrit les abonnements liés, retire l’entrée maison, et se laisse annuler', async () => {
    await enregistrerServicePersonnalise(storage, maison);
    await storage.abonnements.enregistrerPlusieurs([
      abo('a', { serviceId: maison.id }),
      abo('b', { serviceId: maison.id }),
      abo('c', { serviceId: null }),
    ]);
    const bilan = await migrerVersOfficiel(storage, { personnalise: maison, officiel: basicFit });
    expect(bilan.nbAbonnements).toBe(2);
    const apres = await storage.abonnements.lister();
    expect(
      apres
        .filter((a) => a.serviceId === 'basicfit')
        .map((a) => a.id)
        .sort(),
    ).toEqual(['a', 'b']);
    expect(apres.find((a) => a.id === 'c')?.serviceId).toBeNull();
    expect(await storage.servicesPersonnalises.lister()).toEqual([]);

    await bilan.annuler();
    const restaures = await storage.abonnements.lister();
    expect(
      restaures
        .filter((a) => a.serviceId === maison.id)
        .map((a) => a.id)
        .sort(),
    ).toEqual(['a', 'b']);
    expect((await storage.servicesPersonnalises.lister()).map((s) => s.id)).toEqual([maison.id]);
  });
});
