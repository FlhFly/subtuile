/**
 * Thème d'apparence (EF-17) : clair / sombre / OLED (noirs purs, v1.0.27) / système.
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

/** Couleur de fond de chaque thème, reprise par la barre d'état de l'app installée. */
export const COULEURS_BARRE: Record<ThemeEffectif, string> = {
  clair: '#f6f2ea',
  sombre: '#17130d',
  oled: '#000000',
};

/** Balise <meta name="theme-color"> minimale (document ou substitut en test). */
export interface MetaCouleur {
  media: string;
  content: string;
}

/**
 * Aligne les balises theme-color sur le thème : forcé → même couleur pour
 * toutes ; système → chaque balise reprend la couleur de son media
 * (clair / sombre), comme dans index.html.
 */
export function appliquerCouleurBarre(theme: Theme, metas: Iterable<MetaCouleur>): void {
  for (const meta of metas) {
    meta.content =
      theme === 'systeme'
        ? meta.media.includes('dark')
          ? COULEURS_BARRE.sombre
          : COULEURS_BARRE.clair
        : COULEURS_BARRE[theme];
  }
}
