/** Aides de tracé des graphiques Finances (donut CSS, barres) — pures, testables. */

import type { Categorie } from '../domain/types';

/** Couleurs de catégorie de la maquette (donut, listes). */
export const COULEURS_CATEGORIE: Record<Categorie, string> = {
  streaming: '#113ccf',
  sport: '#fc5200',
  musique: '#a238ff',
  ia: '#10a37f',
  cloud: '#1399ff',
  productivite: '#8b3dff',
  presse: '#b05e00',
  gaming: '#107c10',
  securite: '#4687ff',
  vie_courante: '#1b4fa0',
  autre: '#7d7568',
};

/** Segments d'un `conic-gradient` à partir de parts (0 à 1) et de couleurs. */
export function degradeDonut(parts: readonly { part: number; couleur: string }[]): string {
  if (parts.length === 0) return 'var(--sand)';
  let cumul = 0;
  const segments = parts.map((p) => {
    const debut = cumul;
    cumul += p.part * 100;
    return `${p.couleur} ${debut.toFixed(1)}% ${Math.min(100, cumul).toFixed(1)}%`;
  });
  return `conic-gradient(${segments.join(', ')})`;
}

export interface Barre {
  /** hauteur en pixels, ≥ 4 si la valeur est positive */
  hauteur: number;
  /** vrai pour la ou les barres au maximum */
  max: boolean;
  /** étiquette de valeur affichée au-dessus (barre au maximum ou proche, ou première) */
  etiquette: boolean;
}

/** Hauteurs des barres d'un histogramme (maquette : 96 px max, 4 px minimum). */
export function barres(valeurs: readonly number[], hauteurMax = 96): Barre[] {
  const max = Math.max(0, ...valeurs);
  return valeurs.map((v, i) => ({
    hauteur: v > 0 ? Math.max(4, Math.round((v / (max || 1)) * hauteurMax)) : 0,
    max: max > 0 && v === max,
    etiquette: v > 0 && (v >= max * 0.75 || i === 0),
  }));
}
