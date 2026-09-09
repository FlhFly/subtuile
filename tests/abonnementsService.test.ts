import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  changerStatut,
  chargerAbonnementsAJour,
  enregistrerAbonnement,
  supprimerAbonnement,
} from '../src/data/services/abonnements';
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

  it('enregistrerAbonnement met l’échéance au jour avant d’écrire', async () => {
    const perime = creerAbonnement(
      { nom: 'Périmé', prix: 10, periodicite: PERIODICITES.mensuelle, dateDebut: '2026-01-15' },
      { jour: '2026-08-01' },
    );
    const enregistre = await enregistrerAbonnement(storage, perime, '2026-09-09');
    expect(enregistre.prochaineEcheance).toBe('2026-09-15');
    expect((await storage.abonnements.lire(perime.id))?.prochaineEcheance).toBe('2026-09-15');
  });

  it('changerStatut : pause supprime l’échéance, reprise la recalcule ; inconnu → undefined', async () => {
    const a = creerAbonnement(
      { nom: 'Spotify', prix: 11.12, periodicite: PERIODICITES.mensuelle, dateDebut: '2026-01-15' },
      { jour: '2026-09-09' },
    );
    await storage.abonnements.enregistrer(a);
    const enPause = await changerStatut(
      storage,
      a.id,
      { type: 'en_pause', repriseLe: null },
      '2026-09-09',
    );
    expect(enPause?.statut).toEqual({ type: 'en_pause', repriseLe: null });
    expect(enPause?.prochaineEcheance).toBeNull();
    const repris = await changerStatut(storage, a.id, { type: 'actif' }, '2026-09-20');
    expect(repris?.prochaineEcheance).toBe('2026-10-15');
    const archive = await changerStatut(storage, a.id, { type: 'archive' }, '2026-09-20');
    expect(archive?.statut.type).toBe('archive');
    expect(
      await changerStatut(storage, 'inconnu', { type: 'actif' }, '2026-09-20'),
    ).toBeUndefined();
  });

  it('supprimerAbonnement : suppression logique restaurable (EF-01b)', async () => {
    const a = creerAbonnement(
      { nom: 'À supprimer', prix: 5, periodicite: PERIODICITES.mensuelle, dateDebut: '2026-01-15' },
      { jour: '2026-09-09' },
    );
    await storage.abonnements.enregistrer(a);
    expect(await supprimerAbonnement(storage, a.id)).toBe(true);
    expect(await chargerAbonnementsAJour(storage, '2026-09-09')).toHaveLength(0);
    expect(await storage.abonnements.restaurer(a.id)).toBe(true);
    expect(await chargerAbonnementsAJour(storage, '2026-09-09')).toHaveLength(1);
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
