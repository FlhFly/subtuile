import { describe, expect, it } from 'vitest';
import { CATEGORIES } from '../src/domain/types';
import { barres, COULEURS_CATEGORIE, degradeDonut } from '../src/ui/graphiques';

describe('graphiques Finances', () => {
  it('donut : segments cumulés en pourcentage, sable si vide', () => {
    expect(degradeDonut([])).toBe('var(--sand)');
    expect(
      degradeDonut([
        { part: 0.5, couleur: '#a' },
        { part: 0.3, couleur: '#b' },
        { part: 0.2, couleur: '#c' },
      ]),
    ).toBe('conic-gradient(#a 0.0% 50.0%, #b 50.0% 80.0%, #c 80.0% 100.0%)');
  });

  it('barres : proportionnelles au maximum, minimum 4 px, étiquette sur le max, ≥ 75 % ou la première', () => {
    const b = barres([10, 100, 80, 0, 1]);
    expect(b.map((x) => x.hauteur)).toEqual([10, 96, 77, 0, 4]);
    expect(b.map((x) => x.max)).toEqual([false, true, false, false, false]);
    expect(b.map((x) => x.etiquette)).toEqual([true, true, true, false, false]);
    expect(barres([0, 0])).toEqual([
      { hauteur: 0, max: false, etiquette: false },
      { hauteur: 0, max: false, etiquette: false },
    ]);
  });

  it('chaque catégorie a une couleur', () => {
    for (const c of CATEGORIES) expect(COULEURS_CATEGORIE[c]).toMatch(/^#[0-9a-f]{6}$/);
  });
});
