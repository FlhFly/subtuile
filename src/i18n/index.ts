/**
 * Architecture de traduction (EF-17b) : dictionnaire centralisé, libellés et
 * formats localisés (dates, montants, compteur J-X / D-X). Aucun composant ne
 * porte de chaîne en dur : tout passe par `traduire` et les formateurs.
 * Module sans React ; le hook `useI18n` vit dans src/ui/contexts.
 */

import { estDateISO, parseDateISO } from '../domain/dates';
import {
  LANGUES,
  type DateISO,
  type FormatDate,
  type Langue,
  type Periodicite,
} from '../domain/types';
import { en } from './en';
import { fr, type CleTraduction, type Dictionnaire } from './fr';

export type { CleTraduction, Dictionnaire } from './fr';

export const DICTIONNAIRES: Record<Langue, Dictionnaire> = { fr, en };

const LOCALES: Record<Langue, string> = { fr: 'fr-FR', en: 'en-GB' };

export type Parametres = Record<string, string | number>;

/** Traduit une clé et interpole les paramètres {nom}. Clé inconnue → la clé elle-même. */
export function traduire(langue: Langue, cle: CleTraduction, params?: Parametres): string {
  const modele = DICTIONNAIRES[langue][cle] ?? fr[cle] ?? cle;
  if (!params) return modele;
  return modele.replace(/\{(\w+)\}/g, (_, nom: string) =>
    nom in params ? String(params[nom]) : `{${nom}}`,
  );
}

/** Clés déclinées en `.un` / `.plusieurs`. */
export type ClePluriel =
  | 'accueil.nombre'
  | 'accueil.actifs'
  | 'duree.an'
  | 'duree.mois'
  | 'paiements.nombre'
  | 'catalogue.nombre'
  | 'toast.migration'
  | 'alertes.nonLues'
  | 'alertes.echeance.titre'
  | 'alertes.carte.sous'
  | 'alertes.rappel.depuis'
  | 'edition.plus.renseignees'
  | 'edition.garde.autres'
  | 'finances.payants'
  | 'finances.categories'
  | 'finances.rapport.hausses'
  | 'fiche.paiements.tout'
  | 'import.csv.rejetees'
  | 'import.csv.importer'
  | 'toast.importeCsv'
  | 'toast.importeReleve'
  | 'import.releve.ajouter';

/** « 2 ans et 3 mois », « 5 mois », « 12 j », « aujourd'hui » (EF-18). */
export function libelleDuree(
  langue: Langue,
  duree: { annees: number; mois: number; jours: number },
): string {
  const ans = duree.annees > 0 ? traduireNombre(langue, 'duree.an', duree.annees) : null;
  const mois = duree.mois > 0 ? traduireNombre(langue, 'duree.mois', duree.mois) : null;
  if (ans && mois) return traduire(langue, 'duree.et', { a: ans, b: mois });
  if (ans) return ans;
  if (mois) return mois;
  if (duree.jours > 0) return traduire(langue, 'duree.jours', { n: duree.jours });
  return traduire(langue, 'duree.aujourdhui');
}

/** Singulier / pluriel : `cle.un` pour n = 1, `cle.plusieurs` sinon (0 compris : « 0 abonnements »). */
export function traduireNombre(
  langue: Langue,
  cle: ClePluriel,
  n: number,
  params: Parametres = {},
): string {
  const suffixe = n === 1 ? 'un' : 'plusieurs';
  return traduire(langue, `${cle}.${suffixe}` as CleTraduction, { n, ...params });
}

/** Langue de l'interface à partir de la langue du navigateur : fr si francophone, sinon en. */
export function detecterLangue(langueNavigateur: string | undefined): Langue {
  const code = (langueNavigateur ?? '').toLowerCase();
  return code.startsWith('fr') ? 'fr' : 'en';
}

export function estLangue(valeur: unknown): valeur is Langue {
  return typeof valeur === 'string' && (LANGUES as readonly string[]).includes(valeur);
}

/* ---------------------------------------------------------------------------
 * Formats
 * ------------------------------------------------------------------------- */

const formateursMontant = new Map<string, Intl.NumberFormat>();

/** Montant en devise, localisé (ex. « 9,99 € » / « €9.99 »). */
export function formaterMontant(langue: Langue, montant: number, devise = 'EUR'): string {
  const cle = `${langue}:${devise}`;
  let f = formateursMontant.get(cle);
  if (!f) {
    f = new Intl.NumberFormat(LOCALES[langue], { style: 'currency', currency: devise });
    formateursMontant.set(cle, f);
  }
  return f.format(montant);
}

/**
 * Mode discret (EF-75) : le nombre d'un montant formaté devient « **** », la
 * devise et le reste du texte sont conservés (« 12,99 € » → « **** € »,
 * « €12.99 » → « €**** »).
 */
export function masquerMontant(texte: string): string {
  return texte.replace(/\d[\d\s\u00a0\u202f.,]*\d|\d/, '****');
}

export type StyleDate = 'court' | 'moyen' | 'long' | 'mois' | 'moisCourt' | 'semaine';

const OPTIONS_DATE: Record<StyleDate, Intl.DateTimeFormatOptions> = {
  mois: { month: 'long', year: 'numeric' },
  semaine: { weekday: 'short' },
  moisCourt: { month: 'short' },
  court: { day: '2-digit', month: '2-digit', year: 'numeric' },
  moyen: { day: 'numeric', month: 'short', year: 'numeric' },
  long: { day: 'numeric', month: 'long', year: 'numeric' },
};

/**
 * Date civile localisée (« 15/09/2026 », « 15 sept. 2026 » / « 15 Sept 2026 »).
 * Le style court suit le format de date choisi dans les préférences s'il est fourni.
 */
export function formaterDate(
  langue: Langue,
  date: DateISO,
  style: StyleDate = 'court',
  format?: FormatDate,
): string {
  if (style === 'court' && format) return formaterDateSaisie(date, format);
  return new Intl.DateTimeFormat(LOCALES[langue], OPTIONS_DATE[style]).format(parseDateISO(date));
}

/** « 2026-09-15 » → « 15/09/2026 », « 09/15/2026 » ou « 2026-09-15 » selon le format. */
export function formaterDateSaisie(date: DateISO, format: FormatDate): string {
  const [a, m, j] = date.split('-');
  switch (format) {
    case 'jma':
      return `${j}/${m}/${a}`;
    case 'mja':
      return `${m}/${j}/${a}`;
    case 'iso':
      return date;
  }
}

/**
 * Saisie d'une date dans le format choisi (séparateurs / . - ou espace, année
 * sur 4 chiffres) ; une date ISO est toujours acceptée (sélecteur natif).
 * Renvoie la date ISO, ou null si la saisie n'est pas une date valide.
 */
export function parserDateSaisie(texte: string, format: FormatDate): DateISO | null {
  const t = texte.trim();
  if (t === '') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return estDateISO(t) ? t : null;
  const parties = t.split(/[/.\-\s]+/);
  if (parties.length !== 3 || !parties.every((p) => /^\d+$/.test(p))) return null;
  const [p1, p2, p3] = parties as [string, string, string];
  const [annee, mois, jour] =
    format === 'iso' ? [p1, p2, p3] : format === 'mja' ? [p3, p1, p2] : [p3, p2, p1];
  if (annee.length !== 4 || mois.length > 2 || jour.length > 2) return null;
  const iso = `${annee}-${mois.padStart(2, '0')}-${jour.padStart(2, '0')}`;
  return estDateISO(iso) ? iso : null;
}

/** Libellé du compteur : J-X / D-X, « Aujourd'hui », J+X si dépassé. */
export function libelleCompteur(langue: Langue, jours: number): string {
  if (jours === 0) return traduire(langue, 'compteur.aujourdhui');
  if (jours < 0) return traduire(langue, 'compteur.depasse', { n: -jours });
  return traduire(langue, 'compteur.jours', { n: jours });
}

/** Suffixe ou libellé d'une périodicité (« / mois », « tous les 28 jours », « à vie »…). */
export function libellePeriodicite(
  langue: Langue,
  p: Periodicite,
  montantPlafond?: string,
): string {
  switch (p.type) {
    case 'a_vie':
      return traduire(langue, 'periodicite.a_vie');
    case 'a_l_usage':
      return p.plafond !== null && montantPlafond !== undefined
        ? `${traduire(langue, 'periodicite.a_l_usage')} · ${traduire(langue, 'periodicite.plafond', { montant: montantPlafond })}`
        : traduire(langue, 'periodicite.a_l_usage');
    case 'recurrente': {
      if (p.intervalle === 1) {
        const cle = {
          jour: 'periodicite.quotidienne',
          semaine: 'periodicite.hebdomadaire',
          mois: 'periodicite.mensuelle',
          an: 'periodicite.annuelle',
        } as const;
        return traduire(langue, cle[p.unite]);
      }
      if (p.unite === 'mois' && p.intervalle === 3)
        return traduire(langue, 'periodicite.trimestrielle');
      if (p.unite === 'mois' && p.intervalle === 6)
        return traduire(langue, 'periodicite.semestrielle');
      return traduire(langue, `periodicite.tousLes.${p.unite}`, { n: p.intervalle });
    }
  }
}
