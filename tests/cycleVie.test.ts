import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chargerAbonnementsAJour } from '../src/data/services/abonnements';
import { creerDexieProvider, type DexieProvider } from '../src/data/storage/dexieProvider';
import { actualiserAbonnement, actualiserStatut, creerAbonnement } from '../src/domain/fabriques';
import {
  abonnementDepuisFormulaire,
  formulairePourDuplication,
  validerFormulaire,
} from '../src/domain/formulaire';
import { PERIODICITES, type Abonnement, type Statut } from '../src/domain/types';

const JOUR = '2026-09-11';

function abo(champs: Partial<Abonnement> & { nom: string }, jour = JOUR): Abonnement {
  return creerAbonnement(
    { prix: 10, periodicite: PERIODICITES.mensuelle, dateDebut: '2026-01-14', ...champs },
    { jour },
  );
}
const statut = (s: Statut) => s;

describe('cycle de vie automatique (EF-06, EF-08b)', () => {
  it('« résilié — actif jusqu’au » devient archivé le lendemain de la date, pas avant', () => {
    const hier = abo({
      nom: 'A',
      statut: statut({ type: 'resilie_actif_jusquau', jusquau: '2026-09-10' }),
    });
    expect(actualiserStatut(hier, JOUR).statut).toEqual({ type: 'archive' });
    const aujourdhui = abo({
      nom: 'B',
      statut: statut({ type: 'resilie_actif_jusquau', jusquau: JOUR }),
    });
    expect(actualiserStatut(aujourdhui, JOUR)).toBe(aujourdhui);
    const demain = abo({
      nom: 'C',
      statut: statut({ type: 'resilie_actif_jusquau', jusquau: '2026-09-12' }),
    });
    expect(actualiserAbonnement(demain, JOUR)).toBe(demain);
    const archive = actualiserAbonnement(hier, JOUR);
    expect(archive.statut.type).toBe('archive');
    expect(archive.prochaineEcheance).toBeNull();
  });

  it('« en pause jusqu’au » reprend à la date et retrouve une échéance', () => {
    const reprise = abo({ nom: 'A', statut: statut({ type: 'en_pause', repriseLe: JOUR }) });
    expect(reprise.prochaineEcheance).toBeNull();
    const repris = actualiserAbonnement(reprise, JOUR);
    expect(repris.statut).toEqual({ type: 'actif' });
    expect(repris.prochaineEcheance).toBe('2026-09-14');
    const plusTard = abo({
      nom: 'B',
      statut: statut({ type: 'en_pause', repriseLe: '2026-09-12' }),
    });
    expect(actualiserAbonnement(plusTard, JOUR)).toBe(plusTard);
    const sansDate = abo({ nom: 'C', statut: statut({ type: 'en_pause', repriseLe: null }) });
    expect(actualiserAbonnement(sansDate, JOUR)).toBe(sansDate);
  });

  it('actif, archivé : inchangés ; statut et prix futur appliqués dans le même passage', () => {
    const actif = abo({ nom: 'A' });
    expect(actualiserAbonnement(actif, JOUR)).toBe(actif);
    const archive = abo({ nom: 'B', statut: statut({ type: 'archive' }) });
    expect(actualiserAbonnement(archive, JOUR)).toBe(archive);
    const combine = abo({
      nom: 'C',
      statut: statut({ type: 'en_pause', repriseLe: '2026-09-01' }),
      prixFutur: { date: '2026-09-05', montant: 12 },
    });
    const maj = actualiserAbonnement(combine, JOUR);
    expect(maj).toMatchObject({ statut: { type: 'actif' }, prix: 12, prixFutur: null });
    expect(maj.historiquePrix.at(-1)).toEqual({ date: '2026-09-05', prix: 12 });
    expect(maj.prochaineEcheance).toBe('2026-09-14');
  });
});

describe('transitions persistées au chargement', () => {
  let storage: DexieProvider;
  beforeAll(() => {
    storage = creerDexieProvider('subtuile-cycle-vie');
  });
  afterAll(async () => {
    await storage.supprimerBase();
  });

  it('chargerAbonnementsAJour archive les résiliés échus et reprend les pauses datées', async () => {
    const resilie = abo(
      { nom: 'Canal+', statut: statut({ type: 'resilie_actif_jusquau', jusquau: '2026-08-31' }) },
      '2026-08-01',
    );
    const pause = abo(
      { nom: 'Spotify', statut: statut({ type: 'en_pause', repriseLe: '2026-09-10' }) },
      '2026-08-01',
    );
    const intact = abo({ nom: 'Netflix' }, '2026-08-01');
    await storage.abonnements.enregistrerPlusieurs([resilie, pause, intact]);

    const liste = await chargerAbonnementsAJour(storage, JOUR);
    const par = (nom: string) => liste.find((a) => a.nom === nom)!;
    expect(par('Canal+').statut).toEqual({ type: 'archive' });
    expect(par('Spotify').statut).toEqual({ type: 'actif' });
    expect(par('Spotify').prochaineEcheance).toBe('2026-09-14');
    expect(par('Netflix').statut).toEqual({ type: 'actif' });

    // persisté : une relecture directe du stockage voit les nouveaux statuts
    expect((await storage.abonnements.lire(resilie.id))?.statut).toEqual({ type: 'archive' });
    expect((await storage.abonnements.lire(pause.id))?.statut).toEqual({ type: 'actif' });
  });
});

describe('duplication (EF-07)', () => {
  it('copie pré-remplie : nom suffixé, cycle repart d’aujourd’hui, référence non recopiée', () => {
    const source = abo({
      nom: 'Netflix',
      serviceId: 'netflix',
      formuleId: 'netflix_standard',
      prix: 13.49,
      dateDebut: '2021-03-06',
      echeanceManuelle: '2026-09-20',
      referenceClient: '014 522 887',
      moyenPaiementId: 'mp-1',
      partage: { prixTotal: 13.49, partPayee: 6.75 },
      tags: ['foyer'],
      notes: 'Compte partagé',
    });
    const f = formulairePourDuplication(source, JOUR, '(copie)');
    expect(f).toMatchObject({
      nom: 'Netflix (copie)',
      serviceId: 'netflix',
      formuleId: 'netflix_standard',
      prix: '13.49',
      dateDebut: JOUR,
      echeanceManuelle: '',
      referenceClient: '',
      moyenPaiementId: 'mp-1',
      partage: true,
      partagePart: '6.75',
      tags: 'foyer',
      notes: 'Compte partagé',
    });
    expect(validerFormulaire(f)).toEqual({});
    const copie = abonnementDepuisFormulaire(f, { jour: JOUR });
    expect(copie.id).not.toBe(source.id);
    expect(copie.statut).toEqual({ type: 'actif' });
    expect(copie.historiquePrix).toEqual([{ date: JOUR, prix: 13.49 }]);
    // premier prélèvement le jour de la souscription, comme pour toute création
    expect(copie.prochaineEcheance).toBe(JOUR);
  });

  it('un essai ou une hausse déjà passés ne sont pas recopiés ; à venir, ils le sont', () => {
    const passe = abo({
      nom: 'Disney+',
      dateDebut: '2026-08-01',
      essai: { dateFin: '2026-08-15', prixApres: 11.99 },
      prixFutur: { date: '2026-09-01', montant: 12.99 },
    });
    const f = formulairePourDuplication(passe, JOUR, '(copie)');
    expect(f).toMatchObject({ essai: false, essaiFin: '', prixFutur: false, prixFuturDate: '' });
    expect(validerFormulaire(f)).toEqual({});
    const aVenir = abo({
      nom: 'Disney+',
      dateDebut: '2026-09-10',
      essai: { dateFin: '2026-09-24', prixApres: 11.99 },
      prixFutur: { date: '2026-12-01', montant: 12.99 },
    });
    const g = formulairePourDuplication(aVenir, JOUR, '(copie)');
    expect(g).toMatchObject({
      essai: true,
      essaiFin: '2026-09-24',
      prixFutur: true,
      prixFuturDate: '2026-12-01',
    });
    expect(validerFormulaire(g)).toEqual({});
  });
});
