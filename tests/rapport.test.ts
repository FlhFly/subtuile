import { describe, expect, it } from 'vitest';
import { creerAbonnement } from '../src/domain/fabriques';
import { evolutionMensuelle, journalPaiements, rapport12Mois } from '../src/domain/rapport';
import { PERIODICITES, type Abonnement } from '../src/domain/types';

const JOUR = '2026-09-19';

function abo(champs: Partial<Abonnement> & { nom: string }, instant?: string): Abonnement {
  return creerAbonnement(
    { prix: 10, periodicite: PERIODICITES.mensuelle, dateDebut: '2024-01-10', ...champs },
    { jour: JOUR, ...(instant ? { instant } : {}) },
  );
}

describe('évolution 24 mois (lot 5, EF-43 étendu)', () => {
  it('total mensuel normalisé à la fin de chaque mois, au prix de l’époque', () => {
    const ancien = abo({
      nom: 'Ancien',
      prix: 12,
      historiquePrix: [
        { date: '2024-01-10', prix: 10 },
        { date: '2026-03-01', prix: 12 },
      ],
    });
    const recent = abo({
      nom: 'Récent',
      prix: 120,
      periodicite: PERIODICITES.annuelle,
      dateDebut: '2026-06-15',
    });
    const e = evolutionMensuelle([ancien, recent], JOUR);
    expect(e.serie.mois).toHaveLength(25);
    expect(e.serie.mois[0]).toMatchObject({ mois: '2024-09', montant: 10, nb: 1 });
    expect(e.serie.mois.find((m) => m.mois === '2026-02')?.montant).toBe(10);
    expect(e.serie.mois.find((m) => m.mois === '2026-03')?.montant).toBe(12);
    expect(e.serie.mois.find((m) => m.mois === '2026-05')?.montant).toBe(12);
    // annuel de 120 : 10 par mois normalisé, compté dès son mois de début
    expect(e.serie.mois.find((m) => m.mois === '2026-06')?.montant).toBe(22);
    expect(e.serie.mois[24]).toMatchObject({ mois: '2026-09', montant: 22, nb: 2 });
    expect(e.variation).toBe(12);
  });

  it('résilié jusqu’à sa fin, archivé jusqu’à sa dernière modification, supprimé et à vie ignorés', () => {
    const resilie = abo({
      nom: 'Résilié',
      statut: { type: 'resilie_actif_jusquau', jusquau: '2026-04-30' },
    });
    const archive = abo(
      { nom: 'Archivé', statut: { type: 'archive' } },
      '2026-02-10T08:00:00.000Z',
    );
    const supprime = { ...abo({ nom: 'Supprimé' }), deletedAt: '2026-09-01T00:00:00.000Z' };
    const aVie = abo({ nom: 'À vie', periodicite: PERIODICITES.aVie });
    const e = evolutionMensuelle([resilie, archive, supprime, aVie], JOUR, { nbMois: 8 });
    const montant = (m: string) => e.serie.mois.find((x) => x.mois === m)?.montant;
    expect(montant('2026-01')).toBe(20);
    expect(montant('2026-02')).toBe(10); // archivé le 10 février
    expect(montant('2026-03')).toBe(10);
    expect(montant('2026-04')).toBe(0); // résilié au 30 avril : plus de charge à cette date
    expect(montant('2026-09')).toBe(0);
  });
});

describe('rapport 12 mois (lot 5, début de C9)', () => {
  it('dépenses réelles, hausses subies, abonnements ajoutés et arrêtés sur la période', () => {
    const hausse = abo({
      nom: 'Netflix',
      prix: 15,
      historiquePrix: [
        { date: '2024-01-10', prix: 12 },
        { date: '2025-03-01', prix: 13 }, // hors période
        { date: '2026-05-01', prix: 15 },
      ],
    });
    const baisse = abo({
      nom: 'Baisse',
      prix: 8,
      historiquePrix: [
        { date: '2024-01-10', prix: 10 },
        { date: '2026-02-01', prix: 8 },
      ],
    });
    const nouveau = abo({ nom: 'Nouveau', dateDebut: '2026-07-01' });
    const arrete = abo({
      nom: 'Arrêté',
      statut: { type: 'resilie_actif_jusquau', jusquau: '2026-08-31' },
    });
    const r = rapport12Mois([hausse, baisse, nouveau, arrete], JOUR);
    expect(r.depuis).toBe('2025-09-01');
    expect(r.hausses).toEqual([
      {
        abonnementId: hausse.id,
        nom: 'Netflix',
        date: '2026-05-01',
        devise: 'EUR',
        avant: 13,
        apres: 15,
      },
    ]);
    expect(r.ajoutes).toEqual(['Nouveau']);
    expect(r.arretes).toEqual(['Arrêté']);
    expect(r.total).toBeGreaterThan(0);
    expect(r.moyenne).toBeCloseTo(r.total / 12);
  });
});

describe('journal des paiements et total cumulé (EF-13b, lot 5)', () => {
  it('occurrences passées au prix de l’époque, du plus récent au plus ancien, cumul', () => {
    const a = abo({
      nom: 'Netflix',
      prix: 15,
      dateDebut: '2026-05-10',
      historiquePrix: [
        { date: '2026-05-10', prix: 12 },
        { date: '2026-08-01', prix: 15 },
      ],
    });
    const j = journalPaiements(a, JOUR);
    expect(j.paiements).toEqual([
      { date: '2026-09-10', montant: 15 },
      { date: '2026-08-10', montant: 15 },
      { date: '2026-07-10', montant: 12 },
      { date: '2026-06-10', montant: 12 },
      { date: '2026-05-10', montant: 12 },
    ]);
    expect(j.cumul).toBe(66);
    expect(j.estime).toBe(false);
  });

  it('part payée si partagé, arrêt à la résiliation, rien pour un abonnement à vie ou à venir', () => {
    const partage = abo({
      nom: 'Partagé',
      prix: 18,
      dateDebut: '2026-07-01',
      partage: { prixTotal: 18, partPayee: 6 },
    });
    expect(journalPaiements(partage, JOUR).cumul).toBe(18);
    const resilie = abo({
      nom: 'Résilié',
      dateDebut: '2026-01-05',
      statut: { type: 'resilie_actif_jusquau', jusquau: '2026-03-31' },
    });
    expect(journalPaiements(resilie, JOUR).paiements.map((p) => p.date)).toEqual([
      '2026-03-05',
      '2026-02-05',
      '2026-01-05',
    ]);
    expect(
      journalPaiements(abo({ nom: 'À vie', periodicite: PERIODICITES.aVie }), JOUR).paiements,
    ).toEqual([]);
    expect(journalPaiements(abo({ nom: 'Futur', dateDebut: '2026-10-01' }), JOUR).cumul).toBe(0);
  });
});
