import { describe, expect, it } from 'vitest';
import { differencesFormulaire, formulaireVide } from '../src/domain/formulaire';

const JOUR = '2026-09-12';

describe('garde contre la perte de saisie : champs modifiés', () => {
  const base = { ...formulaireVide(JOUR), nom: 'Netflix', prix: '13.49', tags: 'foyer' };

  it('aucune différence pour un état identique, des espaces de bord ou un montant réécrit', () => {
    expect(differencesFormulaire(base, { ...base })).toEqual([]);
    expect(differencesFormulaire(base, { ...base, nom: ' Netflix ' })).toEqual([]);
    expect(differencesFormulaire(base, { ...base, prix: '13,49' })).toEqual([]);
    expect(differencesFormulaire(base, { ...base, prix: '13,490' })).toEqual([]);
  });

  it('liste les champs modifiés dans l’ordre du formulaire, tous types confondus', () => {
    expect(
      differencesFormulaire(base, {
        ...base,
        nom: 'Netflix Premium',
        prix: '14,99',
        essai: true,
        moyenPaiementId: 'mp-1',
        alerteJoursAvant: 7,
        notes: 'x',
      }),
    ).toEqual(['nom', 'prix', 'essai', 'moyenPaiementId', 'alerteJoursAvant', 'notes']);
    expect(differencesFormulaire(base, { ...base, prix: 'abc' })).toEqual(['prix']);
    expect(differencesFormulaire(base, { ...base, prix: '' })).toEqual(['prix']);
    expect(differencesFormulaire({ ...base, essai: true }, { ...base, essai: false })).toEqual([
      'essai',
    ]);
  });
});
