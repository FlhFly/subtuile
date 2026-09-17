import { describe, expect, it } from 'vitest';
import {
  contientNumeroDeCarte,
  luhnValide,
  masquerNumerosDeCarte,
  numerosDeCarte,
  quatreDerniersDepuis,
} from '../src/domain/carte';
import { avertissementsFormulaire, formulaireVide } from '../src/domain/formulaire';

const JOUR = '2026-09-17';

describe('garde anti-numéro de carte (§3.3, revue RGPD)', () => {
  it('clé de Luhn : numéros de test valides, chiffre altéré refusé, longueurs hors 13-19 refusées', () => {
    expect(luhnValide('4111111111111111')).toBe(true);
    expect(luhnValide('5500000000000004')).toBe(true);
    expect(luhnValide('378282246310005')).toBe(true); // 15 chiffres
    expect(luhnValide('4111111111111112')).toBe(false);
    expect(luhnValide('0612345678')).toBe(false);
    expect(luhnValide('41111111111111111111')).toBe(false);
  });

  it('détection dans un texte : séparateurs tolérés, téléphone et références courtes ignorés', () => {
    expect(numerosDeCarte('Visa 4111 1111 1111 1111 (perso)')).toEqual(['4111 1111 1111 1111']);
    expect(numerosDeCarte('CB 4111-1111-1111-1111')).toEqual(['4111-1111-1111-1111']);
    expect(contientNumeroDeCarte('Tél. 06 12 34 56 78, réf. 2026-000123')).toBe(false);
    expect(contientNumeroDeCarte('Commande n° 1234567890123')).toBe(false); // 13 chiffres, Luhn faux
    expect(contientNumeroDeCarte('')).toBe(false);
  });

  it('masquage : seuls les 4 derniers chiffres restent, le reste du texte est conservé', () => {
    expect(masquerNumerosDeCarte('Visa 4111 1111 1111 1111 perso')).toBe('Visa ···· 1111 perso');
    expect(masquerNumerosDeCarte('Réf. 1234567890123')).toBe('Réf. 1234567890123');
  });

  it('4 derniers chiffres depuis une valeur importée', () => {
    expect(quatreDerniersDepuis('4412')).toBe('4412');
    expect(quatreDerniersDepuis('4111 1111 1111 1111')).toBe('1111');
    expect(quatreDerniersDepuis('12')).toBeNull();
    expect(quatreDerniersDepuis(null)).toBeNull();
    expect(quatreDerniersDepuis(4412)).toBeNull();
  });

  it('formulaire d’abonnement : avertissement sur la référence client et les notes', () => {
    const vide = formulaireVide(JOUR, 'EUR');
    expect(avertissementsFormulaire(vide)).toEqual({});
    expect(
      avertissementsFormulaire({ ...vide, referenceClient: '4111111111111111', notes: 'RAS' }),
    ).toEqual({ referenceClient: 'carte' });
    expect(
      avertissementsFormulaire({ ...vide, notes: 'Carte 5500 0000 0000 0004 expire 2027' }),
    ).toEqual({ notes: 'carte' });
  });
});
