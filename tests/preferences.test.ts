import { describe, expect, it } from 'vitest';
import {
  ALERTES_DEFAUT,
  CLE_PREFERENCES,
  ecrirePreferences,
  lirePreferences,
  normaliserPreferences,
  preferencesDefaut,
  type StockageCleValeur,
} from '../src/data/preferences';

function stockageMemoire(
  initial: Record<string, string> = {},
): StockageCleValeur & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

describe('préférences d’interface (§3.5)', () => {
  it('défauts : langue détectée, thème système, grille, tri par échéance, EUR, alertes EF-30', () => {
    expect(preferencesDefaut('fr-FR')).toEqual({
      langue: 'fr',
      theme: 'systeme',
      affichage: 'grille',
      tri: 'echeance',
      deviseAffichage: 'EUR',
      formatDate: 'jma',
      alertes: { echeanceJours: 3, essaiJours: 2, preavisJours: 14, carteMois: 1 },
      onboardingVu: false,
      versionVue: null,
      derniereSauvegarde: null,
    });
    expect(preferencesDefaut('en-US').langue).toBe('en');
    expect(ALERTES_DEFAUT.echeanceJours).toBe(3);
  });

  it('lecture : stockage vide → défauts', () => {
    expect(lirePreferences(stockageMemoire(), 'fr')).toEqual(preferencesDefaut('fr'));
  });

  it('aller-retour écriture / lecture', () => {
    const s = stockageMemoire();
    const p = {
      ...preferencesDefaut('fr'),
      theme: 'sombre' as const,
      langue: 'en' as const,
      affichage: 'liste' as const,
    };
    ecrirePreferences(s, p);
    expect(s.data.has(CLE_PREFERENCES)).toBe(true);
    expect(lirePreferences(s, 'fr')).toEqual(p);
  });

  it('tolère un JSON corrompu ou des valeurs inconnues', () => {
    expect(lirePreferences(stockageMemoire({ [CLE_PREFERENCES]: '{oops' }), 'fr')).toEqual(
      preferencesDefaut('fr'),
    );
    const s = stockageMemoire({
      [CLE_PREFERENCES]: JSON.stringify({
        langue: 'es',
        theme: 'neon',
        affichage: 'liste',
        tri: 42,
        deviseAffichage: 'JPY',
        alertes: { echeanceJours: -1, essaiJours: 5, preavisJours: 'x' },
      }),
    });
    expect(lirePreferences(s, 'fr')).toEqual({
      langue: 'fr',
      theme: 'systeme',
      affichage: 'liste',
      tri: 'echeance',
      deviseAffichage: 'EUR',
      formatDate: 'jma',
      alertes: { echeanceJours: 3, essaiJours: 5, preavisJours: 14, carteMois: 1 },
      onboardingVu: false,
      versionVue: null,
      derniereSauvegarde: null,
    });
  });

  it('normalise une valeur non objet', () => {
    const d = preferencesDefaut('fr');
    expect(normaliserPreferences(null, d)).toEqual(d);
    expect(normaliserPreferences('texte', d)).toEqual(d);
    expect(normaliserPreferences(null, d).alertes).not.toBe(d.alertes); // copie
  });

  it('écriture silencieuse si le stockage est indisponible', () => {
    const cassé: StockageCleValeur = {
      getItem: () => {
        throw new Error('indisponible');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => undefined,
    };
    expect(() => ecrirePreferences(cassé, preferencesDefaut('fr'))).not.toThrow();
    expect(lirePreferences(cassé, 'fr')).toEqual(preferencesDefaut('fr'));
  });
});

describe('onboarding (C7)', () => {
  it('non vu par défaut, conservé à la lecture, valeur étrangère → défaut', () => {
    expect(preferencesDefaut('fr').onboardingVu).toBe(false);
    const stockage = stockageMemoire();
    ecrirePreferences(stockage, { ...preferencesDefaut('fr'), onboardingVu: true });
    expect(lirePreferences(stockage, 'fr').onboardingVu).toBe(true);
    const defaut = preferencesDefaut('fr');
    expect(normaliserPreferences({ onboardingVu: 'oui' }, defaut).onboardingVu).toBe(false);
    expect(normaliserPreferences({ onboardingVu: true }, defaut).onboardingVu).toBe(true);
  });
});
