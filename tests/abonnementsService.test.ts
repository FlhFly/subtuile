import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { chargerAbonnementsAJour } from '../src/data/services/abonnements';
import { creerDexieProvider, type DexieProvider } from '../src/data/storage/dexieProvider';
import { creerAbonnement } from '../src/domain/fabriques';
import { PERIODICITES } from '../src/domain/types';

let storage: DexieProvider;

beforeEach(() => {
  storage = creerDexieProvider(`subtuile-test-service-${Date.now()}-${Math.random()}`);
});

afterEach(async () => {
  await storage.supprimerBase();
});

describe('chargerAbonnementsAJour', () => {
  it('recalcule et persiste les échéances dépassées, applique les prix futurs, ignore le reste', async () => {
    const perime = creerAbonnement(
      {
        id: 'perime',
        nom: 'Périmé',
        prix: 10,
        periodicite: PERIODICITES.mensuelle,
        dateDebut: '2026-01-15',
      },
      { jour: '2026-08-01' },
    );
    const hausse = creerAbonnement(
      {
        id: 'hausse',
        nom: 'Hausse',
        prix: 10,
        periodicite: PERIODICITES.mensuelle,
        dateDebut: '2026-01-20',
        prixFutur: { date: '2026-09-01', montant: 12 },
      },
      { jour: '2026-09-05' },
    );
    const aJour = creerAbonnement(
      {
        id: 'ajour',
        nom: 'À jour',
        prix: 10,
        periodicite: PERIODICITES.mensuelle,
        dateDebut: '2026-01-25',
      },
      { jour: '2026-09-05' },
    );
    expect(perime.prochaineEcheance).toBe('2026-08-15');
    await storage.abonnements.enregistrerPlusieurs([perime, hausse, aJour]);
    const updatedAvant = (await storage.abonnements.lire('ajour'))!.updatedAt;

    let ecritures = 0;
    const stop = storage.souscrire(() => {
      ecritures += 1;
    });
    const liste = await chargerAbonnementsAJour(storage, '2026-09-09');
    stop();

    expect(liste).toHaveLength(3);
    const par = (id: string) => liste.find((a) => a.id === id)!;
    expect(par('perime').prochaineEcheance).toBe('2026-09-15');
    expect(par('hausse').prix).toBe(12);
    expect(par('hausse').prixFutur).toBeNull();
    expect(par('ajour').prochaineEcheance).toBe('2026-09-25');
    expect(ecritures).toBe(1); // une seule écriture groupée

    // persisté : relecture depuis le stockage
    expect((await storage.abonnements.lire('perime'))?.prochaineEcheance).toBe('2026-09-15');
    expect((await storage.abonnements.lire('hausse'))?.prix).toBe(12);
    expect((await storage.abonnements.lire('ajour'))?.updatedAt).toBe(updatedAvant); // non réécrit
  });

  it('sans changement : aucune écriture', async () => {
    const a = creerAbonnement(
      { nom: 'Stable', prix: 10, periodicite: PERIODICITES.mensuelle, dateDebut: '2026-01-15' },
      { jour: '2026-09-09' },
    );
    await storage.abonnements.enregistrer(a);
    let ecritures = 0;
    const stop = storage.souscrire(() => {
      ecritures += 1;
    });
    const liste = await chargerAbonnementsAJour(storage, '2026-09-09');
    stop();
    expect(liste).toHaveLength(1);
    expect(ecritures).toBe(0);
  });
});
