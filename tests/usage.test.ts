import { describe, expect, it } from 'vitest';
import { lireExportJson } from '../src/data/importExport';
import { creerAbonnement } from '../src/domain/fabriques';
import { PERIODICITES, SCHEMA_VERSION, type Abonnement } from '../src/domain/types';
import { CHOIX_USAGE, coutUsage } from '../src/domain/usage';

const JOUR = '2026-09-20';
const abo = (champs: Partial<Abonnement> & { nom: string }): Abonnement =>
  creerAbonnement(
    { prix: 13, periodicite: PERIODICITES.mensuelle, dateDebut: '2026-01-10', ...champs },
    { jour: JOUR },
  );

describe('usage déclaré et coût réel (EF-71, lot 5)', () => {
  it('non déclaré par défaut ; coût par utilisation à partir des utilisations par semaine', () => {
    expect(CHOIX_USAGE).toEqual([0, 1, 3, 7]);
    expect(abo({ nom: 'Sans' }).usageParSemaine).toBeNull();
    expect(coutUsage(abo({ nom: 'Sans' }))).toBeNull();
    const c = coutUsage(abo({ nom: 'Netflix', usageParSemaine: 3 }))!;
    expect(c.mensuel).toBe(13);
    expect(c.utilisationsParMois).toBe(13);
    expect(c.parUtilisation).toBe(1);
    expect(c.nonUtilise).toBe(false);
  });

  it('jamais utilisé : signalé, pas de coût unitaire ; part payée si partagé ; annuel ramené au mois', () => {
    expect(coutUsage(abo({ nom: 'Oublié', usageParSemaine: 0 }))).toMatchObject({
      nonUtilise: true,
      parUtilisation: null,
      mensuel: 13,
    });
    const partage = coutUsage(
      abo({
        nom: 'Partagé',
        prix: 18,
        partage: { prixTotal: 18, partPayee: 6 },
        usageParSemaine: 1,
      }),
    )!;
    expect(partage.mensuel).toBe(6);
    expect(partage.parUtilisation).toBe(1.38);
    const annuel = coutUsage(
      abo({ nom: 'Annuel', prix: 120, periodicite: PERIODICITES.annuelle, usageParSemaine: 7 }),
    )!;
    expect(annuel.mensuel).toBe(10);
    expect(annuel.parUtilisation).toBe(0.33);
    expect(
      coutUsage(abo({ nom: 'À vie', periodicite: PERIODICITES.aVie, usageParSemaine: 3 })),
    ).toBeNull();
  });

  it('import JSON : usage gardé s’il est un nombre positif ou nul, sinon aucun', () => {
    const base = {
      nom: 'Box',
      prix: 30,
      periodicite: PERIODICITES.mensuelle,
      dateDebut: '2026-01-01',
    };
    const apercu = lireExportJson(
      JSON.stringify({
        app: 'subtuile',
        schemaVersion: SCHEMA_VERSION,
        abonnements: [
          { ...base, id: 'a', usageParSemaine: 3 },
          { ...base, id: 'b', usageParSemaine: -2 },
          { ...base, id: 'c', usageParSemaine: 'souvent' },
          { ...base, id: 'd' },
        ],
      }),
      JOUR,
    );
    expect(apercu.donnees.abonnements.map((a) => a.usageParSemaine)).toEqual([3, null, null, null]);
  });
});
