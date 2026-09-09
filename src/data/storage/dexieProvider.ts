/**
 * Implémentation locale du StorageProvider sur IndexedDB via Dexie (§5.1).
 * Seul fichier du projet autorisé à importer Dexie.
 */

import Dexie, { type Table } from 'dexie';
import { maintenant } from '../../lib/horloge';
import {
  SCHEMA_VERSION,
  type Abonnement,
  type EntiteTechnique,
  type ExportJSON,
  type Horodatage,
  type MoyenPaiement,
  type ServicePersonnalise,
} from '../../domain/types';
import type {
  BilanImport,
  Depot,
  Ecouteur,
  ModeImport,
  OptionsLecture,
  StorageProvider,
} from './StorageProvider';

export const NOM_BASE_DEFAUT = 'subtuile';

class SubtuileDB extends Dexie {
  declare abonnements: Table<Abonnement, string>;
  declare moyensPaiement: Table<MoyenPaiement, string>;
  declare servicesPersonnalises: Table<ServicePersonnalise, string>;

  constructor(nom: string) {
    super(nom);
    // Seules les clés utiles aux requêtes sont indexées ; les valeurs null
    // (deletedAt, prochaineEcheance…) ne sont pas indexables : on filtre en mémoire.
    this.version(1).stores({
      abonnements:
        'id, prochaineEcheance, categorie, statut.type, moyenPaiementId, serviceId, updatedAt',
      moyensPaiement: 'id, updatedAt',
      servicesPersonnalises: 'id, updatedAt',
    });
  }
}

class DepotDexie<T extends EntiteTechnique> implements Depot<T> {
  constructor(
    private readonly table: Table<T, string>,
    private readonly notifier: () => void,
  ) {}

  async lister(options: OptionsLecture = {}): Promise<T[]> {
    const tous = await this.table.toArray();
    return options.inclureSupprimes ? tous : tous.filter((e) => e.deletedAt === null);
  }

  async lire(id: string, options: OptionsLecture = {}): Promise<T | undefined> {
    const e = await this.table.get(id);
    if (!e) return undefined;
    if (e.deletedAt !== null && !options.inclureSupprimes) return undefined;
    return e;
  }

  async enregistrer(entite: T): Promise<T> {
    const e = { ...entite, updatedAt: maintenant() };
    await this.table.put(e);
    this.notifier();
    return e;
  }

  async enregistrerPlusieurs(entites: T[]): Promise<T[]> {
    if (entites.length === 0) return [];
    const instant = maintenant();
    const copies = entites.map((e) => ({ ...e, updatedAt: instant }));
    await this.table.bulkPut(copies);
    this.notifier();
    return copies;
  }

  async supprimer(id: string): Promise<boolean> {
    const e = await this.table.get(id);
    if (!e || e.deletedAt !== null) return false;
    const instant = maintenant();
    await this.table.put({ ...e, deletedAt: instant, updatedAt: instant });
    this.notifier();
    return true;
  }

  async restaurer(id: string): Promise<boolean> {
    const e = await this.table.get(id);
    if (!e || e.deletedAt === null) return false;
    await this.table.put({ ...e, deletedAt: null, updatedAt: maintenant() });
    this.notifier();
    return true;
  }

  async purger(avant: Horodatage): Promise<number> {
    const tous = await this.table.toArray();
    const ids = tous.filter((e) => e.deletedAt !== null && e.deletedAt < avant).map((e) => e.id);
    if (ids.length === 0) return 0;
    await this.table.bulkDelete(ids);
    this.notifier();
    return ids.length;
  }
}

export class DexieProvider implements StorageProvider {
  readonly abonnements: Depot<Abonnement>;
  readonly moyensPaiement: Depot<MoyenPaiement>;
  readonly servicesPersonnalises: Depot<ServicePersonnalise>;

  private readonly db: SubtuileDB;
  private readonly ecouteurs = new Set<Ecouteur>();

  constructor(nomBase: string = NOM_BASE_DEFAUT) {
    this.db = new SubtuileDB(nomBase);
    const notifier = () => this.notifier();
    this.abonnements = new DepotDexie(this.db.abonnements, notifier);
    this.moyensPaiement = new DepotDexie(this.db.moyensPaiement, notifier);
    this.servicesPersonnalises = new DepotDexie(this.db.servicesPersonnalises, notifier);
  }

  private notifier(): void {
    for (const e of this.ecouteurs) e();
  }

  souscrire(ecouteur: Ecouteur): () => void {
    this.ecouteurs.add(ecouteur);
    return () => {
      this.ecouteurs.delete(ecouteur);
    };
  }

  async exporter(): Promise<ExportJSON> {
    const [abonnements, moyensPaiement, servicesPersonnalises] = await Promise.all([
      this.abonnements.lister(),
      this.moyensPaiement.lister(),
      this.servicesPersonnalises.lister(),
    ]);
    return {
      app: 'subtuile',
      schemaVersion: SCHEMA_VERSION,
      exporteLe: maintenant(),
      abonnements,
      moyensPaiement,
      servicesPersonnalises,
    };
  }

  async importer(donnees: ExportJSON, mode: ModeImport): Promise<BilanImport> {
    if (donnees.app !== 'subtuile') throw new Error('Fichier étranger à Subtuile');
    if (!Number.isInteger(donnees.schemaVersion) || donnees.schemaVersion > SCHEMA_VERSION) {
      throw new Error(`Schéma ${String(donnees.schemaVersion)} plus récent que ${SCHEMA_VERSION}`);
    }
    const tables = [this.db.abonnements, this.db.moyensPaiement, this.db.servicesPersonnalises];
    const bilan = await this.db.transaction('rw', tables, async () => {
      if (mode === 'remplacement') await Promise.all(tables.map((t) => t.clear()));
      return {
        abonnements: await fusionner(this.db.abonnements, donnees.abonnements, mode),
        moyensPaiement: await fusionner(this.db.moyensPaiement, donnees.moyensPaiement, mode),
        servicesPersonnalises: await fusionner(
          this.db.servicesPersonnalises,
          donnees.servicesPersonnalises,
          mode,
        ),
      };
    });
    this.notifier();
    return bilan;
  }

  async effacerTout(): Promise<void> {
    await Promise.all([
      this.db.abonnements.clear(),
      this.db.moyensPaiement.clear(),
      this.db.servicesPersonnalises.clear(),
    ]);
    this.notifier();
  }

  fermer(): void {
    this.db.close();
  }

  /** Destruction physique de la base (tests, réinitialisation). */
  async supprimerBase(): Promise<void> {
    await this.db.delete();
  }
}

/** Écrit les entités importées ; en fusion, garde la version la plus récente par id. */
async function fusionner<T extends EntiteTechnique>(
  table: Table<T, string>,
  entites: T[] | undefined,
  mode: ModeImport,
): Promise<number> {
  if (!Array.isArray(entites) || entites.length === 0) return 0;
  if (mode === 'remplacement') {
    await table.bulkPut(entites);
    return entites.length;
  }
  const existants = await table.bulkGet(entites.map((e) => e.id));
  const aEcrire = entites.filter((e, i) => {
    const ex = existants[i];
    return !ex || ex.updatedAt < e.updatedAt;
  });
  if (aEcrire.length > 0) await table.bulkPut(aEcrire);
  return aEcrire.length;
}

export function creerDexieProvider(nomBase?: string): DexieProvider {
  return new DexieProvider(nomBase);
}
