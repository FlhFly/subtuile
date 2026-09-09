import { describe, expect, it } from 'vitest';
import {
  actualiserAbonnement,
  COULEURS_MOYEN_PAIEMENT,
  creerAbonnement,
  creerMoyenPaiement,
  periodicitePersonnalisee,
} from '../src/domain/fabriques';
import { PERIODICITES } from '../src/domain/types';

const JOUR = '2026-09-09';
const INSTANT = '2026-09-09T10:00:00.000Z';

describe('creerAbonnement', () => {
  it('complète les valeurs par défaut et calcule l’échéance', () => {
    const a = creerAbonnement(
      { nom: 'Test', prix: 9.99, periodicite: PERIODICITES.mensuelle, dateDebut: '2026-01-31' },
      { jour: JOUR, instant: INSTANT },
    );
    expect(a.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(a.updatedAt).toBe(INSTANT);
    expect(a.deletedAt).toBeNull();
    expect(a.statut).toEqual({ type: 'actif' });
    expect(a.canalAchat).toBe('direct');
    expect(a.modeResiliation).toBe('lien');
    expect(a.devise).toBe('EUR');
    expect(a.categorie).toBe('autre');
    expect(a.tags).toEqual([]);
    expect(a.prochaineEcheance).toBe('2026-09-30'); // mois court depuis un 31
    expect(a.historiquePrix).toEqual([{ date: '2026-01-31', prix: 9.99 }]);
  });

  it('respecte un id fourni et un historique explicite', () => {
    const a = creerAbonnement(
      {
        id: 'fixe',
        nom: 'Test',
        prix: 12,
        periodicite: PERIODICITES.mensuelle,
        dateDebut: '2026-01-01',
        historiquePrix: [{ date: '2026-01-01', prix: 10 }],
      },
      { jour: JOUR },
    );
    expect(a.id).toBe('fixe');
    expect(a.historiquePrix).toEqual([{ date: '2026-01-01', prix: 10 }]);
  });

  it('ancre l’historique à la fin d’essai', () => {
    const a = creerAbonnement(
      {
        nom: 'Essai',
        prix: 11.99,
        periodicite: PERIODICITES.mensuelle,
        dateDebut: '2026-09-01',
        essai: { dateFin: '2026-09-15', prixApres: 11.99 },
      },
      { jour: JOUR },
    );
    expect(a.historiquePrix).toEqual([{ date: '2026-09-15', prix: 11.99 }]);
    expect(a.prochaineEcheance).toBe('2026-09-15');
  });

  it('à l’usage : pas d’historique, pas d’échéance', () => {
    const a = creerAbonnement(
      {
        nom: 'API',
        prix: 0,
        periodicite: { type: 'a_l_usage', plafond: 15 },
        dateDebut: '2026-01-01',
      },
      { jour: JOUR },
    );
    expect(a.historiquePrix).toEqual([]);
    expect(a.prochaineEcheance).toBeNull();
  });
});

describe('actualiserAbonnement', () => {
  const base = creerAbonnement(
    { nom: 'Test', prix: 9.99, periodicite: PERIODICITES.mensuelle, dateDebut: '2026-01-15' },
    { jour: '2026-09-01' },
  );

  it('renvoie le même objet quand rien ne change', () => {
    expect(base.prochaineEcheance).toBe('2026-09-15');
    expect(actualiserAbonnement(base, '2026-09-10')).toBe(base);
  });

  it('recalcule l’échéance dépassée', () => {
    const maj = actualiserAbonnement(base, '2026-09-16');
    expect(maj).not.toBe(base);
    expect(maj.prochaineEcheance).toBe('2026-10-15');
  });

  it('applique un prix futur atteint', () => {
    const avecHausse = { ...base, prixFutur: { date: '2026-09-15', montant: 12.99 } };
    const maj = actualiserAbonnement(avecHausse, '2026-09-15');
    expect(maj.prix).toBe(12.99);
    expect(maj.prixFutur).toBeNull();
    expect(maj.historiquePrix.at(-1)).toEqual({ date: '2026-09-15', prix: 12.99 });
    expect(maj.prochaineEcheance).toBe('2026-09-15');
  });
});

describe('creerMoyenPaiement / periodicitePersonnalisee', () => {
  it('pose les défauts et la couleur du type', () => {
    const mp = creerMoyenPaiement({ type: 'paypal', libelle: 'PayPal' }, { instant: INSTANT });
    expect(mp.couleur).toBe(COULEURS_MOYEN_PAIEMENT.paypal);
    expect(mp.quatreDerniers).toBeNull();
    expect(mp.dateExpiration).toBeNull();
    expect(mp.deletedAt).toBeNull();
    expect(mp.updatedAt).toBe(INSTANT);
  });

  it('valide l’intervalle personnalisé', () => {
    expect(periodicitePersonnalisee('jour', 28)).toEqual({
      type: 'recurrente',
      unite: 'jour',
      intervalle: 28,
    });
    expect(() => periodicitePersonnalisee('mois', 0)).toThrow(RangeError);
    expect(() => periodicitePersonnalisee('semaine', 1.5)).toThrow(RangeError);
  });
});
