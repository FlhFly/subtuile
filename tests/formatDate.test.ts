import { describe, expect, it } from 'vitest';
import {
  formatDateDefaut,
  lirePreferences,
  normaliserPreferences,
  preferencesDefaut,
  type StockageCleValeur,
} from '../src/data/preferences';
import { formaterDate, formaterDateSaisie, parserDateSaisie } from '../src/i18n';

function stockageMemoire(initial: Record<string, string> = {}): StockageCleValeur {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

describe('format de date choisi (réglage, affichage, saisie)', () => {
  it('affichage court selon le format ; les autres styles restent localisés', () => {
    expect(formaterDateSaisie('2026-09-05', 'jma')).toBe('05/09/2026');
    expect(formaterDateSaisie('2026-09-05', 'mja')).toBe('09/05/2026');
    expect(formaterDateSaisie('2026-09-05', 'iso')).toBe('2026-09-05');
    expect(formaterDate('fr', '2026-09-05', 'court', 'mja')).toBe('09/05/2026');
    expect(formaterDate('en', '2026-09-05', 'court', 'jma')).toBe('05/09/2026');
    expect(formaterDate('fr', '2026-09-05', 'court')).toBe('05/09/2026');
    expect(formaterDate('fr', '2026-09-05', 'long', 'mja')).toBe('5 septembre 2026');
    expect(formaterDate('en', '2026-09-05', 'mois', 'iso')).toBe('September 2026');
  });

  it('saisie : séparateurs tolérés, année sur 4 chiffres, ISO toujours accepté', () => {
    expect(parserDateSaisie('05/09/2026', 'jma')).toBe('2026-09-05');
    expect(parserDateSaisie('5.9.2026', 'jma')).toBe('2026-09-05');
    expect(parserDateSaisie('5-9-2026', 'jma')).toBe('2026-09-05');
    expect(parserDateSaisie(' 05 09 2026 ', 'jma')).toBe('2026-09-05');
    expect(parserDateSaisie('09/05/2026', 'mja')).toBe('2026-09-05');
    expect(parserDateSaisie('2026-09-05', 'iso')).toBe('2026-09-05');
    expect(parserDateSaisie('2026/9/5', 'iso')).toBe('2026-09-05');
    expect(parserDateSaisie('2026-09-05', 'jma')).toBe('2026-09-05');
    expect(parserDateSaisie('2026-09-05', 'mja')).toBe('2026-09-05');
  });

  it('saisie invalide : vide, partielle, année courte, jour ou mois impossible', () => {
    expect(parserDateSaisie('', 'jma')).toBeNull();
    expect(parserDateSaisie('05/09', 'jma')).toBeNull();
    expect(parserDateSaisie('05/09/26', 'jma')).toBeNull();
    expect(parserDateSaisie('31/02/2026', 'jma')).toBeNull();
    expect(parserDateSaisie('13/31/2026', 'mja')).toBeNull();
    expect(parserDateSaisie('05/09/2026', 'mja')).toBe('2026-05-09');
    expect(parserDateSaisie('abc', 'jma')).toBeNull();
    expect(parserDateSaisie('2026-13-01', 'iso')).toBeNull();
    expect(parserDateSaisie('123/09/2026', 'jma')).toBeNull();
  });

  it('préférence : défaut selon la langue, lecture tolérante', () => {
    expect(formatDateDefaut('fr')).toBe('jma');
    expect(formatDateDefaut('en')).toBe('mja');
    expect(preferencesDefaut('fr-FR').formatDate).toBe('jma');
    expect(preferencesDefaut('en-US').formatDate).toBe('mja');
    const defaut = preferencesDefaut('fr');
    expect(normaliserPreferences({ formatDate: 'iso' }, defaut).formatDate).toBe('iso');
    expect(normaliserPreferences({ formatDate: 'nimporte' }, defaut).formatDate).toBe('jma');
    expect(normaliserPreferences({}, defaut).formatDate).toBe('jma');
    const s = stockageMemoire({
      'subtuile.preferences': JSON.stringify({ ...defaut, formatDate: 'mja' }),
    });
    expect(lirePreferences(s, 'fr').formatDate).toBe('mja');
  });
});
