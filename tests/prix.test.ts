import { describe, expect, it } from 'vitest';
import {
  actualiserAbonnement,
  actualiserRegularisation,
  creerAbonnement,
} from '../src/domain/fabriques';
import {
  appliquerChangementPrix,
  estHausseAnnoncee,
  formulairePrixVide,
  insererDansHistorique,
  prixSelonHistorique,
  validerChangementPrix,
} from '../src/domain/prix';
import { PERIODICITES, type Abonnement } from '../src/domain/types';

const JOUR = '2026-09-12';

function abo(champs: Partial<Abonnement> & { nom: string }): Abonnement {
  return creerAbonnement(
    { prix: 10, periodicite: PERIODICITES.mensuelle, dateDebut: '2026-01-14', ...champs },
    { jour: JOUR },
  );
}

describe('changement de prix depuis la fiche (EF-08, EF-08b)', () => {
  it('validation : montant requis et numérique, date valide', () => {
    expect(validerChangementPrix(formulairePrixVide(JOUR))).toEqual({ montant: 'requis' });
    expect(validerChangementPrix({ montant: 'abc', dateEffet: JOUR })).toEqual({
      montant: 'nombre',
    });
    expect(validerChangementPrix({ montant: '-1', dateEffet: JOUR })).toEqual({
      montant: 'nombre',
    });
    expect(validerChangementPrix({ montant: '12,99', dateEffet: '2026-13-01' })).toEqual({
      dateEffet: 'date',
    });
    expect(validerChangementPrix({ montant: '12,99', dateEffet: JOUR })).toEqual({});
  });

  it('historique : trié, une entrée par date, prix en vigueur = dernière entrée ≤ jour', () => {
    const h = [
      { date: '2026-01-14', prix: 10 },
      { date: '2026-06-01', prix: 11 },
    ];
    expect(insererDansHistorique(h, { date: '2026-03-01', prix: 10.5 }).map((e) => e.prix)).toEqual(
      [10, 10.5, 11],
    );
    expect(insererDansHistorique(h, { date: '2026-06-01', prix: 12 })).toEqual([
      { date: '2026-01-14', prix: 10 },
      { date: '2026-06-01', prix: 12 },
    ]);
    expect(prixSelonHistorique(h, '2026-05-31', 99)).toBe(10);
    expect(prixSelonHistorique(h, '2026-06-01', 99)).toBe(11);
    expect(prixSelonHistorique([], JOUR, 99)).toBe(99);
  });

  it('date du jour ou passée : prix courant et historique mis à jour', () => {
    const a = abo({ nom: 'A' });
    const maj = appliquerChangementPrix(a, 12.99, JOUR, JOUR);
    expect(maj.prix).toBe(12.99);
    expect(maj.historiquePrix).toEqual([
      { date: '2026-01-14', prix: 10 },
      { date: JOUR, prix: 12.99 },
    ]);
    expect(maj.prixFutur).toBeNull();
    // correction antidatée avant la dernière entrée : l'historique change, pas le prix courant
    const corrige = appliquerChangementPrix(maj, 9, '2026-03-01', JOUR);
    expect(corrige.prix).toBe(12.99);
    expect(corrige.historiquePrix.map((h) => h.prix)).toEqual([10, 9, 12.99]);
  });

  it('date future : hausse annoncée, historique intact ; partage suivi', () => {
    const a = abo({ nom: 'A', partage: { prixTotal: 10, partPayee: 6 } });
    expect(estHausseAnnoncee('2026-10-01', JOUR)).toBe(true);
    expect(estHausseAnnoncee(JOUR, JOUR)).toBe(false);
    const future = appliquerChangementPrix(a, 12, '2026-10-01', JOUR);
    expect(future.prixFutur).toEqual({ date: '2026-10-01', montant: 12 });
    expect(future.prix).toBe(10);
    expect(future.historiquePrix).toHaveLength(1);
    // baisse immédiate sous la part payée : la part est plafonnée au nouveau prix
    const baisse = appliquerChangementPrix(a, 5, JOUR, JOUR);
    expect(baisse.partage).toEqual({ prixTotal: 5, partPayee: 5 });
    const hausse = appliquerChangementPrix(a, 14, JOUR, JOUR);
    expect(hausse.partage).toEqual({ prixTotal: 14, partPayee: 6 });
  });
});

describe('régularisation annuelle reportée (EF-04b)', () => {
  it('une date passée est reportée à l’anniversaire suivant, une date à venir reste', () => {
    const passee = abo({ nom: 'EDF', regularisation: { date: '2025-09-11' } });
    // l'anniversaire 2026 est déjà passé le 12/09 : report à 2027
    expect(actualiserRegularisation(passee, JOUR).regularisation).toEqual({ date: '2027-09-11' });
    expect(actualiserRegularisation(passee, '2026-09-11').regularisation).toEqual({
      date: '2026-09-11',
    });
    const aujourdhui = abo({ nom: 'EDF', regularisation: { date: JOUR } });
    expect(actualiserRegularisation(aujourdhui, JOUR)).toBe(aujourdhui);
    const lointaine = abo({ nom: 'EDF', regularisation: { date: '2023-02-28' } });
    expect(actualiserRegularisation(lointaine, JOUR).regularisation).toEqual({
      date: '2027-02-28',
    });
    const sans = abo({ nom: 'Sans' });
    expect(actualiserRegularisation(sans, JOUR)).toBe(sans);
  });

  it('intégrée à la mise au jour : reportée et persistable avec le reste', () => {
    const a = abo({ nom: 'EDF', regularisation: { date: '2026-09-01' } });
    const maj = actualiserAbonnement(a, JOUR);
    expect(maj.regularisation).toEqual({ date: '2027-09-01' });
    expect(actualiserAbonnement(maj, JOUR)).toBe(maj);
  });
});
