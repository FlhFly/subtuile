import { describe, expect, it } from 'vitest';
import {
  appliquerTheme,
  REQUETE_SOMBRE,
  themeEffectif,
  type RacineTheme,
} from '../src/ui/theme/theme';

describe('thème d’apparence (EF-17)', () => {
  it('pose data-theme pour clair / sombre et le retire pour système', () => {
    const racine: RacineTheme = { dataset: {} };
    appliquerTheme('sombre', racine);
    expect(racine.dataset.theme).toBe('sombre');
    appliquerTheme('clair', racine);
    expect(racine.dataset.theme).toBe('clair');
    appliquerTheme('systeme', racine);
    expect('theme' in racine.dataset).toBe(false);
  });

  it('résout le thème effectif selon la préférence système', () => {
    expect(themeEffectif('systeme', true)).toBe('sombre');
    expect(themeEffectif('systeme', false)).toBe('clair');
    expect(themeEffectif('clair', true)).toBe('clair');
    expect(themeEffectif('sombre', false)).toBe('sombre');
    expect(REQUETE_SOMBRE).toBe('(prefers-color-scheme: dark)');
  });
});
