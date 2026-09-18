import { describe, expect, it } from 'vitest';
import {
  appliquerCouleurBarre,
  appliquerTheme,
  COULEURS_BARRE,
  REQUETE_SOMBRE,
  themeEffectif,
  type MetaCouleur,
  type RacineTheme,
} from '../src/ui/theme/theme';
import { THEMES } from '../src/domain/types';

describe('thème d’apparence (EF-17)', () => {
  it('pose data-theme pour clair / sombre et le retire pour système', () => {
    const racine: RacineTheme = { dataset: {} };
    appliquerTheme('sombre', racine);
    expect(racine.dataset.theme).toBe('sombre');
    appliquerTheme('clair', racine);
    expect(racine.dataset.theme).toBe('clair');
    appliquerTheme('systeme', racine);
    expect('theme' in racine.dataset).toBe(false);
    // OLED (C18, v1.0.27) : quatrième choix, forcé comme le sombre
    expect(THEMES).toEqual(['clair', 'sombre', 'oled', 'systeme']);
    appliquerTheme('oled', racine);
    expect(racine.dataset.theme).toBe('oled');
  });

  it('résout le thème effectif selon la préférence système', () => {
    expect(themeEffectif('systeme', true)).toBe('sombre');
    expect(themeEffectif('systeme', false)).toBe('clair');
    expect(themeEffectif('clair', true)).toBe('clair');
    expect(themeEffectif('sombre', false)).toBe('sombre');
    expect(REQUETE_SOMBRE).toBe('(prefers-color-scheme: dark)');
    expect(themeEffectif('oled', false)).toBe('oled');
    expect(themeEffectif('oled', true)).toBe('oled');
  });

  it('couleur de la barre d’état : forcée pour clair / sombre / OLED, par media pour système', () => {
    const metas: MetaCouleur[] = [
      { media: '(prefers-color-scheme: light)', content: '' },
      { media: '(prefers-color-scheme: dark)', content: '' },
    ];
    appliquerCouleurBarre('oled', metas);
    expect(metas.map((m) => m.content)).toEqual(['#000000', '#000000']);
    appliquerCouleurBarre('clair', metas);
    expect(metas.map((m) => m.content)).toEqual([COULEURS_BARRE.clair, COULEURS_BARRE.clair]);
    appliquerCouleurBarre('systeme', metas);
    expect(metas.map((m) => m.content)).toEqual(['#f6f2ea', '#17130d']);
  });
});
