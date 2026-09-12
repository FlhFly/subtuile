import { useCallback, useMemo } from 'react';
import type { DateISO, Langue, Periodicite } from '../../domain/types';
import {
  formaterDate,
  formaterMontant,
  libelleCompteur,
  libellePeriodicite,
  traduire,
  traduireNombre,
  type ClePluriel,
  type CleTraduction,
  type Parametres,
  type StyleDate,
} from '../../i18n';
import { usePreferences } from './PreferencesContext';

export interface I18n {
  langue: Langue;
  t: (cle: CleTraduction, params?: Parametres) => string;
  tn: (cle: ClePluriel, n: number, params?: Parametres) => string;
  montant: (valeur: number, devise?: string) => string;
  date: (date: DateISO, style?: StyleDate) => string;
  compteur: (jours: number) => string;
  periodicite: (p: Periodicite, montantPlafond?: string) => string;
  changerLangue: (langue: Langue) => void;
}

/** Traduction et formats localisés, pilotés par la langue des préférences (EF-17b). */
export function useI18n(): I18n {
  const { preferences, modifier } = usePreferences();
  const langue = preferences.langue;
  const formatDate = preferences.formatDate;

  const changerLangue = useCallback((l: Langue) => modifier({ langue: l }), [modifier]);

  return useMemo<I18n>(
    () => ({
      langue,
      t: (cle, params) => traduire(langue, cle, params),
      tn: (cle, n, params) => traduireNombre(langue, cle, n, params),
      montant: (valeur, devise) => formaterMontant(langue, valeur, devise),
      date: (date, style) => formaterDate(langue, date, style, formatDate),
      compteur: (jours) => libelleCompteur(langue, jours),
      periodicite: (p, plafond) => libellePeriodicite(langue, p, plafond),
      changerLangue,
    }),
    [langue, formatDate, changerLangue],
  );
}
