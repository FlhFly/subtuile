/**
 * Données de référence descendantes — mécanisme unifié (CdC §5.6).
 * Contrat commun { version, publieLe, data } ; accès via un point unique,
 * fallback embarqué, lecture distante optionnelle (évolution) jamais bloquante.
 * Aucune donnée ne remonte.
 */

import { estDateISO } from '../../domain/dates';
import {
  CANAUX_ACHAT,
  CATEGORIES,
  DEVISES_AFFICHAGE,
  LOGO_TYPES,
  MODES_RESILIATION,
  UNITES_PERIODE,
  type CanalAchat,
  type Catalogue,
  type Formule,
  type Logo,
  type Periodicite,
  type RefData,
  type Service,
  type Taux,
  type TauxChange,
} from '../../domain/types';
import catalogueJson from './catalogue.json';
import tauxJson from './taux.json';

/* ---------------------------------------------------------------------------
 * Contrat
 * ------------------------------------------------------------------------- */

export interface SourceRefData<T> {
  charger(): Promise<RefData<T>>;
}

export interface RefDataProvider {
  readonly catalogue: SourceRefData<Service[]>;
  readonly taux: SourceRefData<TauxChange>;
}

/** Source embarquée : la valeur est déjà validée, renvoyée telle quelle. */
export function sourceEmbarquee<T>(valeur: RefData<T>): SourceRefData<T> {
  return { charger: () => Promise.resolve(valeur) };
}

/* ---------------------------------------------------------------------------
 * Validation (les JSON sont des données, on ne leur fait pas confiance)
 * ------------------------------------------------------------------------- */

export class ErreurRefData extends Error {
  constructor(chemin: string, attendu: string) {
    super(`Donnée de référence invalide : ${chemin} — ${attendu}`);
    this.name = 'ErreurRefData';
  }
}

type Brut = Record<string, unknown>;

function objet(v: unknown, chemin: string): Brut {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) {
    throw new ErreurRefData(chemin, 'objet attendu');
  }
  return v as Brut;
}
function chaine(v: unknown, chemin: string): string {
  if (typeof v !== 'string') throw new ErreurRefData(chemin, 'chaîne attendue');
  return v;
}
function chaineOuNull(v: unknown, chemin: string): string | null {
  return v === null || v === undefined ? null : chaine(v, chemin);
}
function nombre(v: unknown, chemin: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v))
    throw new ErreurRefData(chemin, 'nombre attendu');
  return v;
}
function booleen(v: unknown, chemin: string, defaut = false): boolean {
  if (v === undefined) return defaut;
  if (typeof v !== 'boolean') throw new ErreurRefData(chemin, 'booléen attendu');
  return v;
}
function tableau(v: unknown, chemin: string): unknown[] {
  if (!Array.isArray(v)) throw new ErreurRefData(chemin, 'tableau attendu');
  return v;
}
function parmi<T extends string>(v: unknown, valeurs: readonly T[], chemin: string): T {
  if (typeof v !== 'string' || !(valeurs as readonly string[]).includes(v)) {
    throw new ErreurRefData(chemin, `valeur parmi ${valeurs.join(', ')}`);
  }
  return v as T;
}

export function validerRefData<T>(brut: unknown, validerData: (data: unknown) => T): RefData<T> {
  const o = objet(brut, 'racine');
  const version = nombre(o.version, 'version');
  if (!Number.isInteger(version) || version < 1) throw new ErreurRefData('version', 'entier ≥ 1');
  const publieLe = chaine(o.publieLe, 'publieLe');
  if (!estDateISO(publieLe)) throw new ErreurRefData('publieLe', 'date YYYY-MM-DD');
  return { version, publieLe, data: validerData(o.data) };
}

function validerPeriodicite(v: unknown, chemin: string): Periodicite {
  const o = objet(v, chemin);
  switch (o.type) {
    case 'recurrente': {
      const intervalle = nombre(o.intervalle, `${chemin}.intervalle`);
      if (!Number.isInteger(intervalle) || intervalle < 1) {
        throw new ErreurRefData(`${chemin}.intervalle`, 'entier ≥ 1');
      }
      return {
        type: 'recurrente',
        unite: parmi(o.unite, UNITES_PERIODE, `${chemin}.unite`),
        intervalle,
      };
    }
    case 'a_vie':
      return { type: 'a_vie' };
    case 'a_l_usage':
      return {
        type: 'a_l_usage',
        plafond:
          o.plafond === null || o.plafond === undefined
            ? null
            : nombre(o.plafond, `${chemin}.plafond`),
      };
    default:
      throw new ErreurRefData(`${chemin}.type`, 'recurrente, a_vie ou a_l_usage');
  }
}

function validerLogo(v: unknown, chemin: string): Logo {
  const o = objet(v, chemin);
  return {
    type: parmi(o.type, LOGO_TYPES, `${chemin}.type`),
    valeur: chaine(o.valeur, `${chemin}.valeur`),
  };
}

function validerFormule(v: unknown, chemin: string): Formule {
  const o = objet(v, chemin);
  return {
    id: chaine(o.id, `${chemin}.id`),
    nom: chaine(o.nom, `${chemin}.nom`),
    prix: nombre(o.prix, `${chemin}.prix`),
    periodicite: validerPeriodicite(o.periodicite, `${chemin}.periodicite`),
    canal: parmi(o.canal, CANAUX_ACHAT, `${chemin}.canal`),
  };
}

function validerDeepLinks(v: unknown, chemin: string): Partial<Record<CanalAchat, string>> {
  if (v === undefined || v === null) return {};
  const o = objet(v, chemin);
  const liens: Partial<Record<CanalAchat, string>> = {};
  for (const [cle, valeur] of Object.entries(o)) {
    liens[parmi(cle, CANAUX_ACHAT, `${chemin}.${cle}`)] = chaine(valeur, `${chemin}.${cle}`);
  }
  return liens;
}

export function validerService(v: unknown, chemin = 'service'): Service {
  const o = objet(v, chemin);
  const id = chaine(o.id, `${chemin}.id`);
  const c = `${chemin}[${id}]`;
  const formules = tableau(o.formules ?? [], `${c}.formules`).map((f, i) =>
    validerFormule(f, `${c}.formules[${i}]`),
  );
  const idsFormules = new Set<string>();
  for (const f of formules) {
    if (idsFormules.has(f.id))
      throw new ErreurRefData(`${c}.formules`, `id de formule en double : ${f.id}`);
    idsFormules.add(f.id);
  }
  return {
    id,
    nom: chaine(o.nom, `${c}.nom`),
    categorie: parmi(o.categorie, CATEGORIES, `${c}.categorie`),
    couleur: chaine(o.couleur, `${c}.couleur`),
    logo: validerLogo(o.logo, `${c}.logo`),
    urlGestion: chaineOuNull(o.urlGestion, `${c}.urlGestion`),
    deepLinks: validerDeepLinks(o.deepLinks, `${c}.deepLinks`),
    periodicitesConnues: tableau(o.periodicitesConnues ?? [], `${c}.periodicitesConnues`).map(
      (p, i) => validerPeriodicite(p, `${c}.periodicitesConnues[${i}]`),
    ),
    formules,
    modeResiliation:
      o.modeResiliation === undefined
        ? 'lien'
        : parmi(o.modeResiliation, MODES_RESILIATION, `${c}.modeResiliation`),
    contactResiliation: chaineOuNull(o.contactResiliation, `${c}.contactResiliation`),
    montantEstime: booleen(o.montantEstime, `${c}.montantEstime`),
  };
}

export function validerServices(data: unknown): Service[] {
  const services = tableau(data, 'data').map((s, i) => validerService(s, `data[${i}]`));
  const ids = new Set<string>();
  for (const s of services) {
    if (ids.has(s.id)) throw new ErreurRefData('data', `id de service en double : ${s.id}`);
    ids.add(s.id);
  }
  return services;
}

export function validerCatalogue(brut: unknown): Catalogue {
  return validerRefData(brut, validerServices);
}

export function validerTauxChange(data: unknown): TauxChange {
  const o = objet(data, 'data');
  if (o.base !== 'EUR') throw new ErreurRefData('data.base', 'EUR');
  const t = objet(o.taux, 'data.taux');
  const taux = {} as Record<(typeof DEVISES_AFFICHAGE)[number], number>;
  for (const devise of DEVISES_AFFICHAGE) {
    const valeur = nombre(t[devise], `data.taux.${devise}`);
    if (valeur <= 0) throw new ErreurRefData(`data.taux.${devise}`, 'nombre > 0');
    taux[devise] = valeur;
  }
  if (taux.EUR !== 1) throw new ErreurRefData('data.taux.EUR', '1 (devise de base)');
  return { base: 'EUR', taux };
}

export function validerTaux(brut: unknown): Taux {
  return validerRefData(brut, validerTauxChange);
}

/* ---------------------------------------------------------------------------
 * Jeux embarqués (fallback V1)
 * ------------------------------------------------------------------------- */

export const CATALOGUE_EMBARQUE: Catalogue = validerCatalogue(catalogueJson);
export const TAUX_EMBARQUES: Taux = validerTaux(tauxJson);

export const refDataEmbarque: RefDataProvider = {
  catalogue: sourceEmbarquee(CATALOGUE_EMBARQUE),
  taux: sourceEmbarquee(TAUX_EMBARQUES),
};

/* ---------------------------------------------------------------------------
 * Aides de consultation
 * ------------------------------------------------------------------------- */

export function trouverService(catalogue: Catalogue, id: string | null): Service | undefined {
  if (id === null) return undefined;
  return catalogue.data.find((s) => s.id === id);
}

export function trouverFormule(service: Service, formuleId: string | null): Formule | undefined {
  if (formuleId === null) return undefined;
  return service.formules.find((f) => f.id === formuleId);
}
