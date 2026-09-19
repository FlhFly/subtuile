import { describe, expect, it } from 'vitest';
import { creerAbonnement } from '../src/domain/fabriques';
import { totaux } from '../src/domain/finances';
import { vueFoyer } from '../src/domain/foyer';
import { PERIODICITES, type Abonnement } from '../src/domain/types';

const JOUR = '2026-09-19';
const abo = (champs: Partial<Abonnement> & { nom: string }): Abonnement =>
  creerAbonnement(
    { prix: 10, periodicite: PERIODICITES.mensuelle, dateDebut: '2026-01-10', ...champs },
    { jour: JOUR },
  );

describe('vue « Foyer & partage » (EF-44b, lot 5)', () => {
  it('part payée face au prix plein, totaux foyer et personnel, plus gros écart d’abord', () => {
    const liste = [
      abo({ nom: 'Seul', prix: 10 }),
      abo({ nom: 'Netflix', prix: 18, partage: { prixTotal: 18, partPayee: 6 } }),
      abo({
        nom: 'Annuel partagé',
        prix: 120,
        periodicite: PERIODICITES.annuelle,
        partage: { prixTotal: 120, partPayee: 60 },
      }),
      abo({
        nom: 'En pause',
        prix: 50,
        statut: { type: 'archive' },
      }),
    ];
    const v = vueFoyer(liste, JOUR);
    expect(v.partages.map((p) => [p.nom, p.plein, p.part, p.autres])).toEqual([
      ['Netflix', 18, 6, 12],
      ['Annuel partagé', 10, 5, 5],
    ]);
    expect(v.totalFoyer).toBe(38);
    expect(v.totalPersonnel).toBe(21);
    expect(v.priseEnCharge).toBe(17);
    // cohérent avec les totaux de l'accueil
    expect(v.totalPersonnel).toBe(totaux(liste, JOUR).mensuel);
  });

  it('aucun partage : liste vide, foyer = personnel', () => {
    const v = vueFoyer([abo({ nom: 'Seul' })], JOUR);
    expect(v.partages).toEqual([]);
    expect(v.priseEnCharge).toBe(0);
  });
});
