/**
 * Export / import JSON (EF-50) : lecture tolérante d'une sauvegarde Subtuile.
 * Le fichier est vérifié (origine, schemaVersion, structure) puis chaque entité
 * est normalisée par les fabriques du domaine — les champs absents reçoivent
 * leurs valeurs par défaut, les champs techniques (§3.5) sont conservés.
 */

import { masquerNumerosDeCarte, quatreDerniersDepuis } from '../domain/carte';
import { estAnneeMois } from '../domain/dates';
import { normaliserAnneeMois } from '../domain/moyenPaiement';
import { creerAbonnement, creerMoyenPaiement } from '../domain/fabriques';
import {
  DEVISES,
  SCHEMA_VERSION,
  TYPES_MOYEN_PAIEMENT,
  TYPES_STATUT,
  type Abonnement,
  type DateISO,
  type ExportJSON,
  type MoyenPaiement,
  type ServicePersonnalise,
} from '../domain/types';
import type { StorageProvider } from './storage/StorageProvider';

export type CodeErreurImport = 'json' | 'etranger' | 'schema' | 'structure';

export class ErreurImport extends Error {
  constructor(
    public readonly code: CodeErreurImport,
    detail = '',
  ) {
    super(detail === '' ? code : `${code} : ${detail}`);
    this.name = 'ErreurImport';
  }
}

export interface ApercuImport {
  donnees: ExportJSON;
  nbAbonnements: number;
  nbMoyensPaiement: number;
  nbServicesPersonnalises: number;
  /** instant de l'export, tel qu'inscrit dans le fichier ; null si absent */
  exporteLe: string | null;
}

const estObjet = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const estChaine = (v: unknown): v is string => typeof v === 'string';
const estNombre = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function horodatage(v: unknown): string | undefined {
  return estChaine(v) && v !== '' ? v : undefined;
}

function normaliserAbonnement(brut: unknown, i: number, jour: DateISO): Abonnement {
  const chemin = `abonnements[${i}]`;
  if (!estObjet(brut)) throw new ErreurImport('structure', chemin);
  if (!estChaine(brut.id) || brut.id === '') throw new ErreurImport('structure', `${chemin}.id`);
  if (!estChaine(brut.nom)) throw new ErreurImport('structure', `${chemin}.nom`);
  if (!estNombre(brut.prix)) throw new ErreurImport('structure', `${chemin}.prix`);
  if (!estObjet(brut.periodicite) || !estChaine(brut.periodicite.type)) {
    throw new ErreurImport('structure', `${chemin}.periodicite`);
  }
  if (!estChaine(brut.dateDebut)) throw new ErreurImport('structure', `${chemin}.dateDebut`);
  const statut =
    estObjet(brut.statut) && (TYPES_STATUT as readonly unknown[]).includes(brut.statut.type)
      ? brut.statut
      : { type: 'actif' };
  const devise = (DEVISES as readonly unknown[]).includes(brut.devise) ? brut.devise : 'EUR';
  const champs = {
    ...brut,
    statut,
    devise,
    deletedAt: horodatage(brut.deletedAt) ?? null,
  } as unknown as Parameters<typeof creerAbonnement>[0];
  return creerAbonnement(champs, { jour, instant: horodatage(brut.updatedAt) });
}

function normaliserMoyenPaiement(brut: unknown, i: number): MoyenPaiement {
  const chemin = `moyensPaiement[${i}]`;
  if (!estObjet(brut)) throw new ErreurImport('structure', chemin);
  if (!estChaine(brut.id) || brut.id === '') throw new ErreurImport('structure', `${chemin}.id`);
  if (!(TYPES_MOYEN_PAIEMENT as readonly unknown[]).includes(brut.type)) {
    throw new ErreurImport('structure', `${chemin}.type`);
  }
  if (!estChaine(brut.libelle)) throw new ErreurImport('structure', `${chemin}.libelle`);
  // revue RGPD : jamais de numéro de carte complet, même venu d'un fichier
  const expiration = estChaine(brut.dateExpiration) ? normaliserAnneeMois(brut.dateExpiration) : '';
  const champs = {
    ...brut,
    libelle: masquerNumerosDeCarte(brut.libelle),
    quatreDerniers: quatreDerniersDepuis(brut.quatreDerniers),
    dateExpiration: estAnneeMois(expiration) ? expiration : null,
    deletedAt: horodatage(brut.deletedAt) ?? null,
  } as unknown as Parameters<typeof creerMoyenPaiement>[0];
  return creerMoyenPaiement(champs, { instant: horodatage(brut.updatedAt) });
}

function normaliserServicePersonnalise(brut: unknown, i: number): ServicePersonnalise {
  const chemin = `servicesPersonnalises[${i}]`;
  if (!estObjet(brut)) throw new ErreurImport('structure', chemin);
  if (!estChaine(brut.id) || brut.id === '') throw new ErreurImport('structure', `${chemin}.id`);
  if (!estChaine(brut.nom)) throw new ErreurImport('structure', `${chemin}.nom`);
  return {
    ...(brut as unknown as ServicePersonnalise),
    updatedAt: horodatage(brut.updatedAt) ?? new Date().toISOString(),
    deletedAt: horodatage(brut.deletedAt) ?? null,
  };
}

function liste(v: unknown, chemin: string): unknown[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) throw new ErreurImport('structure', chemin);
  return v;
}

/** Lit et vérifie le texte d'une sauvegarde JSON ; lève `ErreurImport` sinon. */
export function lireExportJson(texte: string, jour: DateISO): ApercuImport {
  let brut: unknown;
  try {
    brut = JSON.parse(texte);
  } catch {
    throw new ErreurImport('json');
  }
  if (!estObjet(brut) || Array.isArray(brut)) throw new ErreurImport('structure', 'racine');
  if (brut.app !== 'subtuile') throw new ErreurImport('etranger');
  if (!Number.isInteger(brut.schemaVersion)) throw new ErreurImport('schema', 'absent');
  if ((brut.schemaVersion as number) > SCHEMA_VERSION) {
    throw new ErreurImport('schema', `${String(brut.schemaVersion)} > ${SCHEMA_VERSION}`);
  }
  const abonnements = liste(brut.abonnements, 'abonnements').map((a, i) =>
    normaliserAbonnement(a, i, jour),
  );
  const moyensPaiement = liste(brut.moyensPaiement, 'moyensPaiement').map(normaliserMoyenPaiement);
  const servicesPersonnalises = liste(brut.servicesPersonnalises, 'servicesPersonnalises').map(
    normaliserServicePersonnalise,
  );
  const donnees: ExportJSON = {
    app: 'subtuile',
    schemaVersion: brut.schemaVersion as number,
    exporteLe: horodatage(brut.exporteLe) ?? '',
    abonnements,
    moyensPaiement,
    servicesPersonnalises,
  };
  return {
    donnees,
    nbAbonnements: abonnements.filter((a) => a.deletedAt === null).length,
    nbMoyensPaiement: moyensPaiement.filter((m) => m.deletedAt === null).length,
    nbServicesPersonnalises: servicesPersonnalises.filter((s) => s.deletedAt === null).length,
    exporteLe: horodatage(brut.exporteLe) ?? null,
  };
}

/** Texte JSON de la sauvegarde complète (indenté, lisible). */
export async function exporterJson(storage: StorageProvider): Promise<string> {
  return JSON.stringify(await storage.exporter(), null, 2);
}

/** « subtuile-sauvegarde-2026-09-12.json » */
export function nomFichierExport(jour: DateISO): string {
  return `subtuile-sauvegarde-${jour}.json`;
}
