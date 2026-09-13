/**
 * Préférences d'interface (§3.5) : localStorage, distinctes des données métier.
 * Lecture tolérante (valeurs inconnues → défauts), écriture atomique.
 * Le stockage est injecté pour rester testable hors navigateur.
 */

import { detecterLangue, estLangue } from '../i18n';
import {
  DEVISES_AFFICHAGE,
  FORMATS_DATE,
  MODES_AFFICHAGE,
  THEMES,
  TRIS_ACCUEIL,
  type DefautsAlerte,
  type Langue,
  type Preferences,
} from '../domain/types';

export const CLE_PREFERENCES = 'subtuile.preferences';

/** Sous-ensemble de l'API Storage utilisé (localStorage, ou un substitut en test). */
export interface StockageCleValeur {
  getItem(cle: string): string | null;
  setItem(cle: string, valeur: string): void;
  removeItem(cle: string): void;
}

/** EF-30 : défauts globaux d'alerte (J-3, essai J-2, préavis J-14, carte M-1). */
export const ALERTES_DEFAUT: DefautsAlerte = {
  echeanceJours: 3,
  essaiJours: 2,
  preavisJours: 14,
  carteMois: 1,
};

/** Format de date par défaut selon la langue : JJ/MM/AAAA en français, MM/JJ/AAAA en anglais. */
export function formatDateDefaut(langue: Langue): Preferences['formatDate'] {
  return langue === 'en' ? 'mja' : 'jma';
}

export function preferencesDefaut(langueNavigateur?: string): Preferences {
  const langue = detecterLangue(langueNavigateur);
  return {
    langue,
    theme: 'systeme',
    affichage: 'grille',
    tri: 'echeance',
    deviseAffichage: 'EUR',
    formatDate: formatDateDefaut(langue),
    alertes: { ...ALERTES_DEFAUT },
    onboardingVu: false,
  };
}

function parmi<T extends string>(valeur: unknown, valeurs: readonly T[], defaut: T): T {
  return typeof valeur === 'string' && (valeurs as readonly string[]).includes(valeur)
    ? (valeur as T)
    : defaut;
}

function entierPositif(valeur: unknown, defaut: number): number {
  return typeof valeur === 'number' && Number.isInteger(valeur) && valeur >= 0 ? valeur : defaut;
}

/** Normalise une valeur brute (JSON du localStorage) en préférences valides. */
export function normaliserPreferences(brut: unknown, defaut: Preferences): Preferences {
  if (typeof brut !== 'object' || brut === null)
    return { ...defaut, alertes: { ...defaut.alertes } };
  const o = brut as Record<string, unknown>;
  const alertesBrut =
    typeof o.alertes === 'object' && o.alertes !== null
      ? (o.alertes as Record<string, unknown>)
      : {};
  return {
    langue: estLangue(o.langue) ? o.langue : defaut.langue,
    theme: parmi(o.theme, THEMES, defaut.theme),
    affichage: parmi(o.affichage, MODES_AFFICHAGE, defaut.affichage),
    tri: parmi(o.tri, TRIS_ACCUEIL, defaut.tri),
    deviseAffichage: parmi(o.deviseAffichage, DEVISES_AFFICHAGE, defaut.deviseAffichage),
    formatDate: parmi(o.formatDate, FORMATS_DATE, defaut.formatDate),
    alertes: {
      echeanceJours: entierPositif(alertesBrut.echeanceJours, defaut.alertes.echeanceJours),
      essaiJours: entierPositif(alertesBrut.essaiJours, defaut.alertes.essaiJours),
      preavisJours: entierPositif(alertesBrut.preavisJours, defaut.alertes.preavisJours),
      carteMois: entierPositif(alertesBrut.carteMois, defaut.alertes.carteMois),
    },
    onboardingVu: typeof o.onboardingVu === 'boolean' ? o.onboardingVu : defaut.onboardingVu,
  };
}

/** Lit les préférences ; toute valeur absente ou corrompue retombe sur les défauts. */
export function lirePreferences(
  stockage: StockageCleValeur,
  langueNavigateur?: string,
): Preferences {
  const defaut = preferencesDefaut(langueNavigateur);
  let brut: unknown = null;
  try {
    const texte = stockage.getItem(CLE_PREFERENCES);
    brut = texte === null ? null : JSON.parse(texte);
  } catch {
    brut = null;
  }
  return normaliserPreferences(brut, defaut);
}

export function ecrirePreferences(stockage: StockageCleValeur, preferences: Preferences): void {
  try {
    stockage.setItem(CLE_PREFERENCES, JSON.stringify(preferences));
  } catch {
    // stockage indisponible (navigation privée, quota) : l'app continue avec l'état en mémoire
  }
}
