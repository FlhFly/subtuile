import { describe, expect, it } from 'vitest';
import { compterOptionsAvancees, formulaireVide } from '../src/domain/formulaire';

const JOUR = '2026-09-12';

describe('dépliant « Options avancées » replié (retour FlhFly)', () => {
  it('compte les options renseignées, zéro pour un formulaire vide', () => {
    const vide = formulaireVide(JOUR);
    expect(compterOptionsAvancees(vide)).toBe(0);
    expect(
      compterOptionsAvancees({
        ...vide,
        essai: true,
        engagement: true,
        partage: true,
        moyenPaiementId: 'mp-1',
        canalAchat: 'app_store',
        tags: 'foyer',
        notes: ' ',
      }),
    ).toBe(6);
    expect(compterOptionsAvancees({ ...vide, regularisationDate: '2026-10-01' })).toBe(1);
    expect(compterOptionsAvancees({ ...vide, montantEstime: true, regularisationDate: '' })).toBe(
      1,
    );
    expect(
      compterOptionsAvancees({
        ...vide,
        modeResiliation: 'telephone',
        referenceClient: '123',
        urlGestion: 'https://x.fr',
        alerteJoursAvant: 7,
        prixFutur: true,
      }),
    ).toBe(5);
  });
});
