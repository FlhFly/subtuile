import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ecrirePreferences, lirePreferences } from '../../data/preferences';
import type { Preferences } from '../../domain/types';
import { appliquerCouleurBarre, appliquerTheme } from '../theme/theme';

interface ContextePreferences {
  preferences: Preferences;
  modifier: (partiel: Partial<Preferences>) => void;
}

const PreferencesContext = createContext<ContextePreferences | null>(null);

/**
 * Préférences d'interface (§3.5) : chargées depuis localStorage au démarrage,
 * persistées à chaque modification ; applique le thème (EF-17) et la langue
 * du document (EF-17b).
 */
export function PreferencesContextProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(() =>
    lirePreferences(localStorage, navigator.language),
  );

  const modifier = useCallback((partiel: Partial<Preferences>) => {
    setPreferences((courantes) => {
      const suivantes = { ...courantes, ...partiel };
      ecrirePreferences(localStorage, suivantes);
      return suivantes;
    });
  }, []);

  useEffect(() => {
    appliquerTheme(preferences.theme, document.documentElement);
    appliquerCouleurBarre(
      preferences.theme,
      document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'),
    );
  }, [preferences.theme]);

  useEffect(() => {
    document.documentElement.lang = preferences.langue;
  }, [preferences.langue]);

  const valeur = useMemo(() => ({ preferences, modifier }), [preferences, modifier]);
  return <PreferencesContext.Provider value={valeur}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): ContextePreferences {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences : PreferencesContextProvider absent');
  return ctx;
}
