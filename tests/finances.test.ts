import { describe, expect, it } from 'vitest';
import { DATE_REFERENCE_DEMO, IDS_DEMO, jeuDemo } from '../src/data/fixtures/demo';
import { creerAbonnement } from '../src/domain/fabriques';
import {
  abonnementsPayants,
  depensesPassees,
  estPayant,
  mensuelNormalise,
  previsionnel,
  repartitionParCategorie,
  repartitionParMoyenPaiement,
  totaux,
} from '../src/domain/finances';
import { PERIODICITES, type Abonnement } from '../src/domain/types';

const JOUR = '2026-09-12';

function abo(champs: Partial<Abonnement> & { nom: string }, instant?: string): Abonnement {
  return creerAbonnement(
    { prix: 10, periodicite: PERIODICITES.mensuelle, dateDebut: '2026-01-14', ...champs },
    { jour: JOUR, ...(instant ? { instant } : {}) },
  );
}

describe('moteur financier — totaux (EF-40, EF-44, EF-04b)', () => {
  it('payant : vivant, actif, récurrent, hors essai en cours', () => {
    expect(estPayant(abo({ nom: 'Mensuel' }), JOUR)).toBe(true);
    expect(
      estPayant(abo({ nom: 'Essai fini', essai: { dateFin: '2026-09-01', prixApres: 10 } }), JOUR),
    ).toBe(true);
    const nonPayants = [
      abo({
        nom: 'Essai',
        dateDebut: '2026-09-01',
        essai: { dateFin: '2026-09-20', prixApres: 10 },
      }),
      abo({ nom: 'Pause', statut: { type: 'en_pause', repriseLe: null } }),
      abo({ nom: 'Résilié', statut: { type: 'resilie_actif_jusquau', jusquau: '2026-09-30' } }),
      abo({ nom: 'Archivé', statut: { type: 'archive' } }),
      abo({ nom: 'À vie', periodicite: PERIODICITES.aVie }),
      abo({ nom: 'Usage', periodicite: PERIODICITES.aLUsage }),
      { ...abo({ nom: 'Fantôme' }), deletedAt: '2026-09-01T00:00:00.000Z' },
    ];
    expect(abonnementsPayants(nonPayants, JOUR)).toEqual([]);
  });

  it('total mensuel normalisé, annuel = ×12, part payée, montant estimé signalé', () => {
    const liste = [
      abo({ nom: 'Mensuel' }),
      abo({ nom: 'Annuel', prix: 120, periodicite: PERIODICITES.annuelle }),
      abo({ nom: 'Partagé', prix: 20, partage: { prixTotal: 20, partPayee: 5 } }),
      abo({ nom: 'Estimé', prix: 30, montantEstime: true }),
      abo({
        nom: 'Essai',
        dateDebut: '2026-09-01',
        essai: { dateFin: '2026-09-20', prixApres: 99 },
      }),
    ];
    expect(mensuelNormalise(liste[1]!)).toBe(10);
    expect(totaux(liste, JOUR)).toEqual({ mensuel: 55, annuel: 660, estime: true, nbPayants: 4 });
    expect(totaux(liste.slice(0, 3), JOUR)).toMatchObject({ mensuel: 25, estime: false });
    expect(totaux([], JOUR)).toEqual({ mensuel: 0, annuel: 0, estime: false, nbPayants: 0 });
  });

  it('répartition par catégorie et par moyen de paiement (EF-41), la plus lourde d’abord', () => {
    const liste = [
      abo({ nom: 'A', categorie: 'streaming', moyenPaiementId: 'cb' }),
      abo({ nom: 'B', categorie: 'ia', prix: 30, moyenPaiementId: 'cb' }),
      abo({ nom: 'C', categorie: 'streaming', prix: 20, moyenPaiementId: null }),
    ];
    expect(repartitionParCategorie(liste, JOUR)).toEqual([
      { categorie: 'streaming', mensuel: 30, part: 0.5, nb: 2 },
      { categorie: 'ia', mensuel: 30, part: 0.5, nb: 1 },
    ]);
    expect(repartitionParMoyenPaiement(liste, JOUR)).toEqual([
      { moyenPaiementId: 'cb', mensuel: 40, part: 40 / 60, nb: 2 },
      { moyenPaiementId: null, mensuel: 20, part: 20 / 60, nb: 1 },
    ]);
    expect(repartitionParCategorie([], JOUR)).toEqual([]);
  });
});

describe('moteur financier — prévisionnel à montants réels (EF-42)', () => {
  it('douze mois civils depuis le mois courant, un mensuel compte une fois par mois', () => {
    const p = previsionnel([abo({ nom: 'Mensuel' })], JOUR);
    expect(p.mois.map((m) => m.mois)).toEqual([
      '2026-09',
      '2026-10',
      '2026-11',
      '2026-12',
      '2027-01',
      '2027-02',
      '2027-03',
      '2027-04',
      '2027-05',
      '2027-06',
      '2027-07',
      '2027-08',
    ]);
    expect(p.mois.every((m) => m.montant === 10 && m.nb === 1)).toBe(true);
    expect(p.total).toBe(120);
    expect(p.moyenne).toBe(10);
    expect(p.estime).toBe(false);
  });

  it('un annuel pèse sur son mois d’échéance ; hebdo et 28 jours selon leurs occurrences', () => {
    const annuel = abo({
      nom: 'Annuel',
      prix: 120,
      periodicite: PERIODICITES.annuelle,
      dateDebut: '2025-11-03',
    });
    const p = previsionnel([annuel], JOUR);
    expect(p.mois.filter((m) => m.montant > 0).map((m) => [m.mois, m.montant])).toEqual([
      ['2026-11', 120],
    ]);
    const hebdo = abo({
      nom: 'Hebdo',
      prix: 5,
      periodicite: PERIODICITES.hebdomadaire,
      dateDebut: '2026-09-07',
    });
    const h = previsionnel([hebdo], JOUR).mois;
    expect(h[0]).toMatchObject({ mois: '2026-09', nb: 4, montant: 20 }); // 7, 14, 21, 28
    expect(h[2]).toMatchObject({ mois: '2026-11', nb: 5, montant: 25 }); // 2, 9, 16, 23, 30
    const vingtHuit = abo({
      nom: '28 j',
      periodicite: PERIODICITES.vingtHuitJours,
      dateDebut: '2026-09-02',
    });
    expect(previsionnel([vingtHuit], JOUR).mois[0]).toMatchObject({ nb: 2, montant: 20 }); // 2 et 30
  });

  it('hausse annoncée appliquée à sa date, part payée conservée, essai payant à sa fin', () => {
    const hausse = abo({ nom: 'Hausse', prixFutur: { date: '2026-10-01', montant: 12 } });
    const h = previsionnel([hausse], JOUR).mois;
    expect(h[0]?.montant).toBe(10);
    expect(h[1]?.montant).toBe(12);
    expect(h[11]?.montant).toBe(12);
    const partage = abo({
      nom: 'Partagé',
      partage: { prixTotal: 10, partPayee: 4 },
      prixFutur: { date: '2026-10-01', montant: 12 },
    });
    expect(previsionnel([partage], JOUR).mois[3]?.montant).toBe(4);
    const essai = abo({
      nom: 'Essai',
      prix: 12,
      dateDebut: '2026-09-01',
      essai: { dateFin: '2026-09-20', prixApres: 12 },
    });
    const e = previsionnel([essai], JOUR).mois;
    expect(e[0]).toMatchObject({ montant: 12, nb: 1 }); // premier prélèvement le 20/09
    expect(e[1]).toMatchObject({ montant: 12, nb: 1 }); // puis le 20/10
    const estime = abo({ nom: 'EDF', prix: 60, montantEstime: true });
    expect(previsionnel([estime], JOUR).estime).toBe(true);
  });

  it('pause, résilié, archivé, à vie et à l’usage ne pèsent pas sur l’avenir', () => {
    const liste = [
      abo({ nom: 'Pause', statut: { type: 'en_pause', repriseLe: '2026-10-01' } }),
      abo({ nom: 'Résilié', statut: { type: 'resilie_actif_jusquau', jusquau: '2026-12-31' } }),
      abo({ nom: 'Archivé', statut: { type: 'archive' } }),
      abo({ nom: 'À vie', periodicite: PERIODICITES.aVie }),
      abo({ nom: 'Usage', periodicite: PERIODICITES.aLUsage }),
    ];
    expect(previsionnel(liste, JOUR).total).toBe(0);
  });
});

describe('moteur financier — dépenses passées au prix de l’époque (EF-43)', () => {
  it('douze mois précédant le mois courant, prix de l’historique à chaque prélèvement', () => {
    const a = abo({
      nom: 'Depuis mai',
      prix: 12,
      dateDebut: '2026-05-14',
      historiquePrix: [
        { date: '2026-05-14', prix: 10 },
        { date: '2026-08-01', prix: 12 },
      ],
    });
    const d = depensesPassees([a], JOUR);
    expect(d.mois[0]?.mois).toBe('2025-09');
    expect(d.mois[11]?.mois).toBe('2026-08');
    expect(d.mois.filter((m) => m.nb > 0).map((m) => [m.mois, m.montant])).toEqual([
      ['2026-05', 10],
      ['2026-06', 10],
      ['2026-07', 10],
      ['2026-08', 12],
    ]);
    expect(d.total).toBe(42);
    expect(d.moyenne).toBeCloseTo(3.5, 5);
  });

  it('résilié jusqu’à sa fin, archivé et en pause jusqu’à leur dernière modification', () => {
    const resilie = abo({
      nom: 'Résilié',
      statut: { type: 'resilie_actif_jusquau', jusquau: '2026-07-14' },
    });
    expect(
      depensesPassees([resilie], JOUR)
        .mois.filter((m) => m.nb > 0)
        .map((m) => m.mois),
    ).toEqual(['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06']);
    const archive = abo(
      { nom: 'Archivé', statut: { type: 'archive' } },
      '2026-04-20T10:00:00.000Z',
    );
    expect(depensesPassees([archive], JOUR).total).toBe(40); // janvier → avril
    const pause = abo(
      { nom: 'Pause', statut: { type: 'en_pause', repriseLe: null } },
      '2026-03-01T10:00:00.000Z',
    );
    expect(depensesPassees([pause], JOUR).total).toBe(20); // janvier, février
    const essai = abo({
      nom: 'Essai',
      dateDebut: '2026-06-01',
      essai: { dateFin: '2026-06-15', prixApres: 10 },
    });
    expect(
      depensesPassees([essai], JOUR)
        .mois.filter((m) => m.nb > 0)
        .map((m) => m.mois),
    ).toEqual(['2026-06', '2026-07', '2026-08']);
    expect(depensesPassees([], JOUR).total).toBe(0);
  });
});

describe('moteur financier — jeu de démo à sa date de référence (critère CdC §6)', () => {
  const jeu = jeuDemo(DATE_REFERENCE_DEMO);
  const ids = IDS_DEMO.abonnements;

  it('total mensuel normalisé vérifié à la main : 163,69 € estimé, 8 abonnements payants', () => {
    // Strava 79,99/12 + Netflix part 6,75 + Prime 69,90/12 + Claude Pro 21,60 + ChatGPT 23
    // + Basic-Fit 24,99 + Lycamobile 9,99 × 30,4375/28 + EDF ~64 ; Disney+ en essai,
    // Canal+ résilié, Spotify en pause, Dropbox archivé et Claude API à l'usage exclus
    const t = totaux(jeu.abonnements, DATE_REFERENCE_DEMO);
    expect(t.mensuel).toBeCloseTo(163.69, 1);
    expect(t.annuel).toBeCloseTo(1964.3, 0);
    expect(t.estime).toBe(true);
    expect(t.nbPayants).toBe(8);
    expect(abonnementsPayants(jeu.abonnements, DATE_REFERENCE_DEMO).map((a) => a.id)).not.toContain(
      ids.disney,
    );
  });

  it('répartitions : vie courante puis IA, sport, streaming ; SEPA en tête des moyens', () => {
    const cats = repartitionParCategorie(jeu.abonnements, DATE_REFERENCE_DEMO);
    expect(cats.map((c) => c.categorie)).toEqual(['vie_courante', 'ia', 'sport', 'streaming']);
    expect(cats[0]?.mensuel).toBeCloseTo(74.86, 1);
    expect(cats.reduce((s, c) => s + c.part, 0)).toBeCloseTo(1, 6);
    const moyens = repartitionParMoyenPaiement(jeu.abonnements, DATE_REFERENCE_DEMO);
    const mp = IDS_DEMO.moyensPaiement;
    expect(moyens.map((m) => m.moyenPaiementId)).toEqual([mp.sepa, mp.cb, mp.appStore, mp.paypal]);
    expect(moyens[0]?.mensuel).toBeCloseTo(99.85, 1);
  });

  it('prévisionnel : août 2026 avec Strava annuel, septembre avec Prime et deux Lycamobile', () => {
    const p = previsionnel(jeu.abonnements, DATE_REFERENCE_DEMO);
    expect(p.mois[0]?.mois).toBe('2026-08');
    // Strava 79,99 + Netflix 6,75 + Claude Pro 21,60 + ChatGPT 23 + Disney+ 11,99 (fin d'essai)
    // + Basic-Fit 24,99 + Lycamobile 9,99 + EDF 64
    expect(p.mois[0]?.montant).toBeCloseTo(242.31, 2);
    // Netflix, Prime 69,90, Claude Pro, ChatGPT, Disney+, Basic-Fit, Lycamobile ×2, EDF
    expect(p.mois[1]).toMatchObject({ mois: '2026-09', nb: 9 });
    expect(p.mois[1]?.montant).toBeCloseTo(242.21, 2);
    expect(p.mois.filter((m) => m.montant > 200)).toHaveLength(2); // les deux mois à annuel
    expect(p.estime).toBe(true);
  });
});
