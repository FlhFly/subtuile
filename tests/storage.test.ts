import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { creerDexieProvider, type DexieProvider } from '../src/data/storage/dexieProvider';
import { creerAbonnement, creerMoyenPaiement } from '../src/domain/fabriques';
import {
  PERIODICITES,
  SCHEMA_VERSION,
  type Abonnement,
  type ExportJSON,
} from '../src/domain/types';

const JOUR = '2026-09-09';
let compteur = 0;
let storage: DexieProvider;

function abo(nom: string, extra: Partial<Abonnement> = {}): Abonnement {
  return creerAbonnement(
    { nom, prix: 10, periodicite: PERIODICITES.mensuelle, dateDebut: '2026-01-15', ...extra },
    { jour: JOUR },
  );
}

beforeEach(() => {
  compteur += 1;
  storage = creerDexieProvider(`subtuile-test-${compteur}`);
});

afterEach(async () => {
  await storage.supprimerBase();
});

describe('Depot — CRUD et suppression logique (§3.5, EF-01, EF-01b)', () => {
  it('enregistre, relit et liste ; updatedAt est posé par le dépôt', async () => {
    const a = abo('Netflix', { updatedAt: '2000-01-01T00:00:00.000Z' });
    const avant = new Date().toISOString();
    const enregistre = await storage.abonnements.enregistrer(a);
    expect(enregistre.updatedAt >= avant).toBe(true);
    expect(enregistre.updatedAt).not.toBe('2000-01-01T00:00:00.000Z');
    expect(await storage.abonnements.lire(a.id)).toEqual(enregistre);
    expect(await storage.abonnements.lister()).toEqual([enregistre]);
  });

  it('enregistrer est un upsert', async () => {
    const a = abo('Netflix');
    await storage.abonnements.enregistrer(a);
    await storage.abonnements.enregistrer({ ...a, prix: 15 });
    const tous = await storage.abonnements.lister();
    expect(tous).toHaveLength(1);
    expect(tous[0]?.prix).toBe(15);
  });

  it('supprimer pose un tombstone, restaurer l’efface', async () => {
    const a = abo('Spotify');
    await storage.abonnements.enregistrer(a);
    expect(await storage.abonnements.supprimer(a.id)).toBe(true);
    expect(await storage.abonnements.lire(a.id)).toBeUndefined();
    expect(await storage.abonnements.lister()).toEqual([]);
    const fantome = await storage.abonnements.lire(a.id, { inclureSupprimes: true });
    expect(fantome?.deletedAt).toMatch(/^\d{4}-/);
    expect(await storage.abonnements.lister({ inclureSupprimes: true })).toHaveLength(1);

    expect(await storage.abonnements.supprimer(a.id)).toBe(false); // déjà supprimé
    expect(await storage.abonnements.restaurer(a.id)).toBe(true);
    expect((await storage.abonnements.lire(a.id))?.deletedAt).toBeNull();
    expect(await storage.abonnements.restaurer(a.id)).toBe(false); // déjà vivant
    expect(await storage.abonnements.supprimer('inconnu')).toBe(false);
  });

  it('purger ne détruit que les tombstones antérieurs à la date donnée', async () => {
    const vieux = abo('Vieux');
    const recent = abo('Récent');
    const vivant = abo('Vivant');
    await storage.abonnements.enregistrerPlusieurs([vieux, recent, vivant]);
    await storage.abonnements.supprimer(vieux.id);
    const limite = new Date(Date.now() + 1000).toISOString();
    await new Promise((r) => setTimeout(r, 2));
    await storage.abonnements.supprimer(recent.id);
    // « récent » est supprimé après `limite` seulement si l'horloge a avancé ; on force le cas
    const fantomeRecent = (await storage.abonnements.lire(recent.id, { inclureSupprimes: true }))!;
    await storage.abonnements.enregistrer({
      ...fantomeRecent,
      deletedAt: '2999-01-01T00:00:00.000Z',
    });

    expect(await storage.abonnements.purger(limite)).toBe(1);
    const restants = await storage.abonnements.lister({ inclureSupprimes: true });
    expect(restants.map((e) => e.nom).sort()).toEqual(['Récent', 'Vivant']);
  });

  it('les trois dépôts sont indépendants', async () => {
    const mp = creerMoyenPaiement({ type: 'cb', libelle: 'CB' });
    await storage.moyensPaiement.enregistrer(mp);
    expect(await storage.moyensPaiement.lister()).toHaveLength(1);
    expect(await storage.abonnements.lister()).toHaveLength(0);
    expect(await storage.servicesPersonnalises.lister()).toHaveLength(0);
  });
});

describe('souscription aux changements', () => {
  it('notifie à chaque écriture, plus rien après désinscription', async () => {
    let appels = 0;
    const stop = storage.souscrire(() => {
      appels += 1;
    });
    const a = abo('A');
    await storage.abonnements.enregistrer(a);
    await storage.abonnements.supprimer(a.id);
    await storage.abonnements.restaurer(a.id);
    expect(appels).toBe(3);
    await storage.abonnements.lire(a.id);
    await storage.abonnements.lister();
    expect(appels).toBe(3); // les lectures ne notifient pas
    stop();
    await storage.abonnements.enregistrer(a);
    expect(appels).toBe(3);
  });
});

describe('export / import (EF-50)', () => {
  it('exporte les entités vivantes avec le schemaVersion', async () => {
    const a = abo('A');
    const b = abo('B');
    await storage.abonnements.enregistrerPlusieurs([a, b]);
    await storage.abonnements.supprimer(b.id);
    await storage.moyensPaiement.enregistrer(creerMoyenPaiement({ type: 'cb', libelle: 'CB' }));
    const exp = await storage.exporter();
    expect(exp.app).toBe('subtuile');
    expect(exp.schemaVersion).toBe(SCHEMA_VERSION);
    expect(exp.exporteLe).toMatch(/^\d{4}-/);
    expect(exp.abonnements.map((x) => x.nom)).toEqual(['A']);
    expect(exp.moyensPaiement).toHaveLength(1);
    expect(exp.servicesPersonnalises).toEqual([]);
  });

  it('remplacement : vide tout puis écrit', async () => {
    await storage.abonnements.enregistrer(abo('Ancien'));
    const nouveau = abo('Nouveau');
    const donnees: ExportJSON = {
      app: 'subtuile',
      schemaVersion: SCHEMA_VERSION,
      exporteLe: '2026-09-09T00:00:00.000Z',
      abonnements: [nouveau],
      moyensPaiement: [],
      servicesPersonnalises: [],
    };
    const bilan = await storage.importer(donnees, 'remplacement');
    expect(bilan).toEqual({ abonnements: 1, moyensPaiement: 0, servicesPersonnalises: 0 });
    expect((await storage.abonnements.lister()).map((x) => x.nom)).toEqual(['Nouveau']);
  });

  it('fusion : garde la version la plus récente de chaque id, ajoute les inconnus', async () => {
    const local = await storage.abonnements.enregistrer(abo('Local'));
    const plusVieux = { ...local, nom: 'Import périmé', updatedAt: '2000-01-01T00:00:00.000Z' };
    const plusRecent = { ...local, nom: 'Import récent', updatedAt: '2999-01-01T00:00:00.000Z' };
    const inconnu = abo('Inconnu');
    const base = {
      app: 'subtuile' as const,
      schemaVersion: SCHEMA_VERSION,
      exporteLe: '2026-09-09T00:00:00.000Z',
      moyensPaiement: [],
      servicesPersonnalises: [],
    };

    let bilan = await storage.importer({ ...base, abonnements: [plusVieux, inconnu] }, 'fusion');
    expect(bilan.abonnements).toBe(1);
    expect((await storage.abonnements.lire(local.id))?.nom).toBe('Local');

    bilan = await storage.importer({ ...base, abonnements: [plusRecent] }, 'fusion');
    expect(bilan.abonnements).toBe(1);
    expect((await storage.abonnements.lire(local.id))?.nom).toBe('Import récent');
    expect(await storage.abonnements.lister()).toHaveLength(2);
  });

  it('refuse un schéma plus récent ou un fichier étranger', async () => {
    const base: ExportJSON = {
      app: 'subtuile',
      schemaVersion: SCHEMA_VERSION + 1,
      exporteLe: '2026-09-09T00:00:00.000Z',
      abonnements: [],
      moyensPaiement: [],
      servicesPersonnalises: [],
    };
    await expect(storage.importer(base, 'fusion')).rejects.toThrow(/Schéma/);
    await expect(
      storage.importer({ ...base, schemaVersion: 1, app: 'autre' as 'subtuile' }, 'fusion'),
    ).rejects.toThrow(/étranger/);
  });

  it('effacerTout vide les trois dépôts', async () => {
    await storage.abonnements.enregistrer(abo('A'));
    await storage.moyensPaiement.enregistrer(creerMoyenPaiement({ type: 'cb', libelle: 'CB' }));
    await storage.effacerTout();
    expect(await storage.abonnements.lister({ inclureSupprimes: true })).toEqual([]);
    expect(await storage.moyensPaiement.lister({ inclureSupprimes: true })).toEqual([]);
  });
});
