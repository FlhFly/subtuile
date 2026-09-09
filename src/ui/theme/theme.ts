/**
 * Thème d'apparence (EF-17) : clair / sombre / système.
 * tokens.css lit `data-theme` sur la racine ; « système » retire l'attribut et
 * laisse jouer la préférence du navigateur (prefers-color-scheme).
 */

import type { Theme } from '../../domain/types';

export type ThemeEffectif = Exclude<Theme, 'systeme'>;

/** Élément racine minimal (document.documentElement, ou un substitut en test). */
export interface RacineTheme {
  dataset: { theme?: string | undefined };
}

export function appliquerTheme(theme: Theme, racine: RacineTheme): void {
  if (theme === 'systeme') delete racine.dataset.theme;
  else racine.dataset.theme = theme;
}

/** Thème réellement affiché, la préférence système étant résolue par l'appelant. */
export function themeEffectif(theme: Theme, systemePrefereSombre: boolean): ThemeEffectif {
  if (theme === 'systeme') return systemePrefereSombre ? 'sombre' : 'clair';
  return theme;
}

export const REQUETE_SOMBRE = '(prefers-color-scheme: dark)';
