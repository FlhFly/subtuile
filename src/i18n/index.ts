/**
 * Architecture de traduction (EF-17b) : dictionnaire centralisé, libellés et
 * formats localisés (dates, montants, compteur J-X / D-X). Aucun composant ne
 * porte de chaîne en dur : tout passe par `traduire` et les formateurs.
 * Module sans React ; le hook `useI18n` vit dans src/ui/contexts.
 */

import { parseDateISO } from '../domain/dates';
import { LANGUES, type DateISO, type Langue, type Periodicite } from '../domain/types';
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

/** Singulier / pluriel : `cle.un` pour n = 1, `cle.plusieurs` sinon (0 compris : « 0 abonnements »). */
export function traduireNombre(
  langue: Langue,
  cle: 'accueil.nombre',
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

export type StyleDate = 'court' | 'moyen' | 'long';

const OPTIONS_DATE: Record<StyleDate, Intl.DateTimeFormatOptions> = {
  court: { day: '2-digit', month: '2-digit', year: 'numeric' },
  moyen: { day: 'numeric', month: 'short', year: 'numeric' },
  long: { day: 'numeric', month: 'long', year: 'numeric' },
};

/** Date civile localisée (« 15/09/2026 » / « 15/09/2026 », « 15 sept. 2026 » / « 15 Sept 2026 »). */
export function formaterDate(langue: Langue, date: DateISO, style: StyleDate = 'court'): string {
  return new Intl.DateTimeFormat(LOCALES[langue], OPTIONS_DATE[style]).format(parseDateISO(date));
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
