import { useMemo } from 'react';
import { convertisseurVers, type Convertisseur } from '../../domain/devises';
import type { Devise, Taux } from '../../domain/types';
import { usePreferences } from '../contexts/PreferencesContext';
import { useTaux } from './useTaux';

export interface Conversion {
  /** devise d'affichage des totaux (EF-45), aussi proposée par défaut à la saisie (EF-45b) */
  devise: Devise;
  taux: Taux;
  convertir: Convertisseur;
}

/** Devise d'affichage des préférences et convertisseur aux taux indicatifs. */
export function useConversion(): Conversion {
  const { preferences } = usePreferences();
  const taux = useTaux();
  const devise = preferences.deviseAffichage;
  const convertir = useMemo(() => convertisseurVers(devise, taux.data), [devise, taux]);
  return { devise, taux, convertir };
}
