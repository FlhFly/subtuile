import { describe, expect, it } from 'vitest';
import { CATALOGUE_EMBARQUE } from '../src/data/refdata/RefDataProvider';
import { creerAbonnement } from '../src/domain/fabriques';
import {
  abonnementsDepuisReleve,
  cleLibelle,
  detecterRecurrences,
  lireReleve,
  montantReleve,
} from '../src/domain/releve';
import { PERIODICITES } from '../src/domain/types';
import { parserDateSaisie } from '../src/i18n';

const JOUR = '2026-09-21';
const SERVICES = CATALOGUE_EMBARQUE.data;

const RELEVE = [
  'Date;Libellé;Montant',
  '05/07/2026;PRLV SEPA NETFLIX.COM 0705;-13,49',
  '05/08/2026;PRLV SEPA NETFLIX.COM 0805;-13,49',
  '05/09/2026;PRLV SEPA NETFLIX.COM 0905;-14,99',
  '12/07/2026;CARTE X1234 SPOTIFY P2A9 STOCKHOLM;-11,12',
  '12/08/2026;CARTE X1234 SPOTIFY P3B1 STOCKHOLM;-11,12',
  '12/09/2026;CARTE X1234 SPOTIFY P4C7 STOCKHOLM;-11,12',
  '03/07/2026;CARTE X1234 APPLE.COM/BILL;-2,99',
  '03/08/2026;CARTE X1234 APPLE.COM/BILL;-2,99',
  '03/09/2026;CARTE X1234 APPLE.COM/BILL;-2,99',
  '15/07/2026;CARTE X1234 APPLE.COM/BILL;-9,99',
  '15/08/2026;CARTE X1234 APPLE.COM/BILL;-9,99',
  '14/09/2026;CARTE X1234 APPLE.COM/BILL;-9,99',
  '20/09/2025;PRLV SEPA SALLE DE GRIMPE BLOC 2025;-390,00',
  '18/09/2026;PRLV SEPA SALLE DE GRIMPE BLOC 2026;-399,00',
  '02/07/2026;CARTE X1234 SUPERMARCHE DUPONT;-84,20',
  '09/07/2026;CARTE X1234 SUPERMARCHE DUPONT;-23,75',
  '23/08/2026;CARTE X1234 SUPERMARCHE DUPONT;-141,02',
  '28/07/2026;VIR SALAIRE ENTREPRISE;2 400,00',
  '28/08/2026;VIR SALAIRE ENTREPRISE;2 400,00',
  '10/01/2026;PRLV SEPA ANCIENNE SALLE;-29,00',
  '10/02/2026;PRLV SEPA ANCIENNE SALLE;-29,00',
  '10/03/2026;PRLV SEPA ANCIENNE SALLE;-29,00',
].join('\n');

const lire = (texte: string) => lireReleve(texte, 'jma', parserDateSaisie);

describe('lecture d’un relevé bancaire CSV (EF-73)', () => {
  it('montants : signe, parenthèses, milliers, devise', () => {
    expect(montantReleve('-13,49')).toBe(-13.49);
    expect(montantReleve('2 400,00 €')).toBe(2400);
    expect(montantReleve('1.234,56')).toBe(1234.56);
    expect(montantReleve('1,234.56')).toBe(1234.56);
    expect(montantReleve('(12.50)')).toBe(-12.5);
    expect(montantReleve('12,50-')).toBe(-12.5);
    expect(montantReleve('+8')).toBe(8);
    expect(montantReleve('abc')).toBeNull();
    expect(montantReleve('')).toBeNull();
  });

  it('en-tête reconnu, seuls les débits sont gardés, triés par date', () => {
    const l = lire(RELEVE);
    expect(l.enTete).toBe(true);
    expect(l.colonnes).toEqual({ date: 0, libelle: 1, montant: 2 });
    expect(l.nbLignes).toBe(22);
    expect(l.operations).toHaveLength(20);
    expect(l.nbIgnorees).toBe(2);
    expect(l.operations[0]).toEqual({
      date: '2025-09-20',
      libelle: 'PRLV SEPA SALLE DE GRIMPE BLOC 2025',
      montant: 390,
    });
  });

  it('sans en-tête : colonnes devinées d’après le contenu ; colonne Débit sans signe', () => {
    const sansEnTete = lire(
      ['2026-08-05,12.99,Netflix.com', '2026-09-05,12.99,Netflix.com'].join('\n'),
    );
    expect(sansEnTete.enTete).toBe(false);
    expect(sansEnTete.colonnes).toEqual({ date: 0, libelle: 2, montant: 1 });
    expect(sansEnTete.operations.map((o) => o.montant)).toEqual([12.99, 12.99]);
    const debitCredit = lire(
      [
        'Date opération;Date valeur;Libellé;Débit;Crédit',
        '05/08/2026 08:14;06/08/2026;NETFLIX;13,49;',
        '28/08/2026 00:00;28/08/2026;SALAIRE;;2400,00',
      ].join('\n'),
    );
    expect(debitCredit.colonnes).toEqual({ date: 0, libelle: 2, montant: 3 });
    expect(debitCredit.operations).toEqual([
      { date: '2026-08-05', libelle: 'NETFLIX', montant: 13.49 },
    ]);
  });

  it('colonnes imposées à la main', () => {
    const l = lireReleve('a;05/09/2026;b;NETFLIX;-5', 'jma', parserDateSaisie, {
      enTete: false,
      colonnes: { date: 1, libelle: 3, montant: 4 },
    });
    expect(l.operations).toEqual([{ date: '2026-09-05', libelle: 'NETFLIX', montant: 5 }]);
  });
});

describe('détection des paiements récurrents (EF-73)', () => {
  it('libellé rapproché : jargon bancaire, chiffres et dates ignorés', () => {
    expect(cleLibelle('PRLV SEPA NETFLIX.COM 0905')).toBe('netflix');
    expect(cleLibelle('CARTE X1234 SPOTIFY P2A9 STOCKHOLM')).toBe('spotify stockholm');
    expect(cleLibelle('CB 12/09')).toBe('');
  });

  it('cadence régulière et montants proches ; courses, salaire et abonnement arrêté écartés', () => {
    const r = detecterRecurrences(lire(RELEVE).operations, [], SERVICES, JOUR);
    expect(r.map((p) => [p.nom, p.montant, p.periodicite])).toEqual([
      ['Apple', 9.99, PERIODICITES.mensuelle],
      ['Apple', 2.99, PERIODICITES.mensuelle],
      ['Netflix', 14.99, PERIODICITES.mensuelle],
      ['Salle Grimpe', 399, PERIODICITES.annuelle],
      ['Spotify', 11.12, PERIODICITES.mensuelle],
    ]);
    const netflix = r.find((p) => p.nom === 'Netflix')!;
    expect(netflix).toMatchObject({
      serviceId: 'netflix',
      nbPaiements: 3,
      premierPaiement: '2026-07-05',
      dernierPaiement: '2026-09-05',
      dejaSuivi: null,
    });
  });

  it('« déjà suivi » : même service du catalogue ou nom présent dans le libellé ; aucun doublon créé', () => {
    const suivis = [
      creerAbonnement(
        {
          nom: 'Netflix',
          prix: 13.49,
          periodicite: PERIODICITES.mensuelle,
          dateDebut: '2025-01-05',
          serviceId: 'netflix',
        },
        { jour: JOUR },
      ),
      creerAbonnement(
        {
          nom: 'Salle de grimpe',
          prix: 390,
          periodicite: PERIODICITES.annuelle,
          dateDebut: '2025-09-20',
        },
        { jour: JOUR },
      ),
    ];
    const r = detecterRecurrences(lire(RELEVE).operations, suivis, SERVICES, JOUR);
    expect(r.filter((p) => p.dejaSuivi !== null).map((p) => p.nom)).toEqual([
      'Netflix',
      'Salle Grimpe',
    ]);
    const crees = abonnementsDepuisReleve(r, SERVICES, JOUR, 'EUR');
    expect(crees.map((a) => a.nom)).toEqual(['Apple', 'Apple', 'Spotify']);
    const spotify = crees.find((a) => a.nom === 'Spotify')!;
    expect(spotify).toMatchObject({
      serviceId: 'spotify',
      categorie: 'musique',
      prix: 11.12,
      dateDebut: '2026-09-12',
      prochaineEcheance: '2026-10-12',
    });
    // tout est suivi : rien à ajouter
    const tout = detecterRecurrences(
      lire(RELEVE).operations,
      [...suivis, ...crees],
      SERVICES,
      JOUR,
    );
    expect(abonnementsDepuisReleve(tout, SERVICES, JOUR, 'EUR')).toEqual([]);
  });

  it('« tous les 28 jours » seulement si chaque écart vaut 28', () => {
    const ops = ['2026-06-29', '2026-07-27', '2026-08-24', '2026-09-21'].map((date) => ({
      date,
      libelle: 'PRLV OPERATEUR MOBILE',
      montant: 9.99,
    }));
    const r = detecterRecurrences(ops.slice(0, 3), [], [], '2026-08-25');
    expect(r[0]!.periodicite).toEqual(PERIODICITES.vingtHuitJours);
  });
});
