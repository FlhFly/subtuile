import { describe, expect, it } from 'vitest';
import { jeuDemo } from '../src/data/fixtures/demo';
import { dernierJourDuMois, estAnneeMois, etatExpirationCarte } from '../src/domain/dates';
import { creerMoyenPaiement, COULEURS_MOYEN_PAIEMENT } from '../src/domain/fabriques';
import {
  formaterSaisieExpiration,
  formulaireDepuisMoyenPaiement,
  formulaireMoyenPaiementVide,
  moyenPaiementDepuisFormulaire,
  normaliserAnneeMois,
  porteCarte,
  usageParMoyen,
  validerMoyenPaiement,
} from '../src/domain/moyenPaiement';

describe('expiration de carte (EF-30, M-1)', () => {
  it('mois civil « YYYY-MM » et dernier jour du mois', () => {
    expect(estAnneeMois('2026-09')).toBe(true);
    expect(estAnneeMois('2026-13')).toBe(false);
    expect(estAnneeMois('2026-9')).toBe(false);
    expect(estAnneeMois(null)).toBe(false);
    expect(dernierJourDuMois('2026-09')).toBe('2026-09-30');
    expect(dernierJourDuMois('2028-02')).toBe('2028-02-29');
    expect(dernierJourDuMois('2026-12')).toBe('2026-12-31');
    expect(() => dernierJourDuMois('2026-00')).toThrow(RangeError);
  });

  it('états : aucune, ok, bientôt (M-1), expirée', () => {
    expect(etatExpirationCarte(null, '2026-09-10')).toBe('aucune');
    expect(etatExpirationCarte('2027-06', '2026-09-10')).toBe('ok');
    expect(etatExpirationCarte('2026-10', '2026-09-10')).toBe('bientot'); // signalée dès le 01/09
    expect(etatExpirationCarte('2026-10', '2026-08-31')).toBe('ok');
    expect(etatExpirationCarte('2026-10', '2026-09-01')).toBe('bientot');
    expect(etatExpirationCarte('2026-09', '2026-09-30')).toBe('bientot'); // dernier jour de validité
    expect(etatExpirationCarte('2026-09', '2026-10-01')).toBe('expiree');
    expect(etatExpirationCarte('2026-12', '2026-09-10', 3)).toBe('bientot'); // seuil paramétrable
    expect(etatExpirationCarte('2026-12', '2026-09-10', 1)).toBe('ok');
  });
});

describe('formulaire moyen de paiement (§3.3)', () => {
  it('normalise les saisies d’expiration', () => {
    expect(normaliserAnneeMois('09/2026')).toBe('2026-09');
    expect(normaliserAnneeMois('09-2026')).toBe('2026-09');
    expect(normaliserAnneeMois('2026/09')).toBe('2026-09');
    expect(normaliserAnneeMois(' 2026-09 ')).toBe('2026-09');
    expect(normaliserAnneeMois('sept 2026')).toBe('sept 2026');
  });

  it('tiret automatique de la saisie d’expiration au clavier numérique (v1.0.21)', () => {
    expect(formaterSaisieExpiration('2027')).toBe('2027');
    expect(formaterSaisieExpiration('20270')).toBe('2027-0');
    expect(formaterSaisieExpiration('202709')).toBe('2027-09');
    expect(formaterSaisieExpiration('2027-09')).toBe('2027-09');
    expect(formaterSaisieExpiration('2027-')).toBe('2027'); // effacement du tiret
    expect(formaterSaisieExpiration('2027091')).toBe('2027-09'); // chiffres en trop ignorés
    expect(formaterSaisieExpiration('09/2027')).toBe('09/2027'); // formes libres normalisées à la validation
    expect(formaterSaisieExpiration('09-2027')).toBe('09-2027');
    expect(formaterSaisieExpiration('')).toBe('');
  });

  it('valide libellé, 4 chiffres et mois', () => {
    expect(validerMoyenPaiement({ ...formulaireMoyenPaiementVide(), libelle: 'CB' })).toEqual({});
    expect(validerMoyenPaiement(formulaireMoyenPaiementVide()).libelle).toBe('requis');
    expect(
      validerMoyenPaiement({
        ...formulaireMoyenPaiementVide(),
        libelle: 'CB',
        quatreDerniers: '12',
      }).quatreDerniers,
    ).toBe('quatre');
    expect(
      validerMoyenPaiement({
        ...formulaireMoyenPaiementVide(),
        libelle: 'CB',
        quatreDerniers: '44a2',
      }).quatreDerniers,
    ).toBe('quatre');
    expect(
      validerMoyenPaiement({
        ...formulaireMoyenPaiementVide(),
        libelle: 'CB',
        dateExpiration: '13/2026',
      }).dateExpiration,
    ).toBe('anneeMois');
    expect(
      validerMoyenPaiement({
        ...formulaireMoyenPaiementVide(),
        libelle: 'CB',
        dateExpiration: '09/2026',
        quatreDerniers: '4412',
      }),
    ).toEqual({});
  });

  it('refuse un numéro de carte complet dans le libellé (revue RGPD)', () => {
    expect(
      validerMoyenPaiement({
        type: 'cb',
        libelle: 'Visa 4111 1111 1111 1111',
        quatreDerniers: '1111',
        dateExpiration: '',
      }).libelle,
    ).toBe('carte');
    expect(
      validerMoyenPaiement({
        type: 'cb',
        libelle: 'Visa perso',
        quatreDerniers: '1111',
        dateExpiration: '',
      }),
    ).toEqual({});
  });

  it('création : couleur du type, champs carte seulement pour une CB', () => {
    const cb = moyenPaiementDepuisFormulaire({
      type: 'cb',
      libelle: ' CB perso ',
      quatreDerniers: '4412',
      dateExpiration: '09/2027',
    });
    expect(cb).toMatchObject({
      type: 'cb',
      libelle: 'CB perso',
      quatreDerniers: '4412',
      dateExpiration: '2027-09',
      couleur: COULEURS_MOYEN_PAIEMENT.cb,
      deletedAt: null,
    });
    expect(porteCarte('cb')).toBe(true);
    expect(porteCarte('paypal')).toBe(false);
    const paypal = moyenPaiementDepuisFormulaire({
      type: 'paypal',
      libelle: 'PayPal',
      quatreDerniers: '4412',
      dateExpiration: '2027-09',
    });
    expect(paypal.quatreDerniers).toBeNull();
    expect(paypal.dateExpiration).toBeNull();
  });

  it('modification : id conservé, couleur changée seulement si le type change', () => {
    const existant = creerMoyenPaiement({ type: 'cb', libelle: 'CB', couleur: '#123456' });
    const f = formulaireDepuisMoyenPaiement(existant);
    expect(f).toEqual({ type: 'cb', libelle: 'CB', quatreDerniers: '', dateExpiration: '' });
    const maj = moyenPaiementDepuisFormulaire(
      { ...f, libelle: 'CB pro', quatreDerniers: '9999' },
      existant,
    );
    expect(maj.id).toBe(existant.id);
    expect(maj.couleur).toBe('#123456');
    expect(maj.quatreDerniers).toBe('9999');
    const changeType = moyenPaiementDepuisFormulaire({ ...f, type: 'sepa' }, existant);
    expect(changeType.couleur).toBe(COULEURS_MOYEN_PAIEMENT.sepa);
    expect(changeType.quatreDerniers).toBeNull();
  });

  it('usage par moyen sur le jeu de démo (archivés exclus)', () => {
    const jeu = jeuDemo();
    const usage = usageParMoyen(jeu.abonnements);
    expect(usage.get('demo-mp-cb')).toBe(6); // Strava, Netflix, Claude Pro, Disney+, Spotify, Claude API
    expect(usage.get('demo-mp-paypal')).toBe(1); // Prime (Dropbox archivé)
    expect(usage.get('demo-mp-app-store')).toBe(1);
    expect(usage.get('demo-mp-sepa')).toBe(4);
  });
});
