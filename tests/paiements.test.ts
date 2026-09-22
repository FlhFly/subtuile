import { describe, expect, it } from 'vitest';
import { lireExportJson } from '../src/data/importExport';
import { ALERTES_DEFAUT } from '../src/data/preferences';
import { calculerAlertes } from '../src/domain/alertes';
import { creerAbonnement } from '../src/domain/fabriques';
import {
  abonnementDepuisFormulaire,
  formulaireDepuisAbonnement,
  formulairePourDuplication,
} from '../src/domain/formulaire';
import {
  annulerConfirmation,
  confirmation,
  confirmations,
  confirmerPaiement,
  echeanceAConfirmer,
  montantEcheance,
} from '../src/domain/paiements';
import { PERIODICITES, SCHEMA_VERSION, type Abonnement } from '../src/domain/types';

const JOUR = '2026-09-22';
const abo = (champs: Partial<Abonnement> & { nom: string }): Abonnement =>
  creerAbonnement(
    { prix: 10, periodicite: PERIODICITES.mensuelle, dateDebut: '2026-01-05', ...champs },
    { jour: JOUR },
  );

describe('échéance à confirmer sur la fiche (EF-76, lot 6)', () => {
  it('hors fenêtre d’alerte : le dernier prélèvement passé ; dans la fenêtre : la prochaine échéance', () => {
    const a = abo({ nom: 'Netflix' });
    expect(echeanceAConfirmer(a, JOUR, 3)).toEqual({
      date: '2026-09-05',
      montant: 10,
      confirmation: null,
    });
    const proche = abo({ nom: 'Box', dateDebut: '2026-01-24' });
    expect(echeanceAConfirmer(proche, JOUR, 3)?.date).toBe('2026-09-24');
    // le jour même, l'échéance du jour est proposée
    expect(echeanceAConfirmer(abo({ nom: 'Jour', dateDebut: '2026-01-22' }), JOUR, 0)?.date).toBe(
      '2026-09-22',
    );
  });

  it('rien pour un archivé, un non récurrent ou un essai gratuit sans prélèvement passé', () => {
    expect(echeanceAConfirmer(abo({ nom: 'A', statut: { type: 'archive' } }), JOUR, 3)).toBeNull();
    expect(
      echeanceAConfirmer(abo({ nom: 'V', periodicite: PERIODICITES.aVie }), JOUR, 3),
    ).toBeNull();
    const essai = abo({
      nom: 'Essai',
      dateDebut: '2026-09-10',
      essai: { dateFin: '2026-09-24', prixApres: 10 },
    });
    expect(echeanceAConfirmer(essai, JOUR, 7)).toBeNull();
  });

  it('montant attendu : part payée, prix de l’époque, hausse annoncée pour une échéance à venir', () => {
    const partage = abo({ nom: 'P', prix: 18, partage: { prixTotal: 18, partPayee: 6 } });
    expect(montantEcheance(partage, '2026-09-05', JOUR)).toBe(6);
    const hausse = abo({
      nom: 'H',
      prix: 10,
      historiquePrix: [
        { date: '2026-01-05', prix: 8 },
        { date: '2026-06-01', prix: 10 },
      ],
      prixFutur: { date: '2026-10-01', montant: 12 },
    });
    expect(montantEcheance(hausse, '2026-03-05', JOUR)).toBe(8);
    expect(montantEcheance(hausse, '2026-09-05', JOUR)).toBe(10);
    expect(montantEcheance(hausse, '2026-10-05', JOUR)).toBe(12);
  });
});

describe('confirmer et annuler un paiement (EF-76)', () => {
  it('une entrée par échéance, triée ; annulation ; données antérieures sans le champ', () => {
    const a = abo({ nom: 'Netflix' });
    const un = confirmerPaiement(a, '2026-09-05', 10, JOUR);
    const deux = confirmerPaiement(un, '2026-08-05', 9.5, '2026-09-23');
    const encore = confirmerPaiement(deux, '2026-09-05', 11, '2026-09-24');
    expect(confirmations(encore)).toEqual([
      { echeance: '2026-08-05', montant: 9.5, confirmeLe: '2026-09-23' },
      { echeance: '2026-09-05', montant: 11, confirmeLe: '2026-09-24' },
    ]);
    expect(echeanceAConfirmer(encore, JOUR, 3)).toMatchObject({
      date: '2026-09-05',
      montant: 11,
      confirmation: { confirmeLe: '2026-09-24' },
    });
    expect(confirmation(annulerConfirmation(encore, '2026-09-05'), '2026-09-05')).toBeNull();
    const ancien = { ...a } as Partial<Abonnement>;
    delete ancien.paiementsConfirmes;
    expect(confirmations(ancien as Abonnement)).toEqual([]);
    expect(echeanceAConfirmer(ancien as Abonnement, JOUR, 3)?.confirmation).toBeNull();
  });

  it('conservé à l’édition, non recopié à la duplication', () => {
    const a = confirmerPaiement(abo({ nom: 'Netflix' }), '2026-09-05', 10, JOUR);
    const edite = abonnementDepuisFormulaire(
      { ...formulaireDepuisAbonnement(a, JOUR), notes: 'modifié' },
      { jour: JOUR },
      a,
    );
    expect(confirmations(edite)).toHaveLength(1);
    const copie = abonnementDepuisFormulaire(formulairePourDuplication(a, JOUR, '(copie)'), {
      jour: JOUR,
    });
    expect(confirmations(copie)).toEqual([]);
  });

  it('l’échéance confirmée ne déclenche plus d’alerte de renouvellement', () => {
    const a = abo({ nom: 'Box', dateDebut: '2026-01-24' });
    const avant = calculerAlertes({
      abonnements: [a],
      moyensPaiement: [],
      defauts: ALERTES_DEFAUT,
      jour: JOUR,
    });
    expect(avant.some((x) => x.type === 'echeance')).toBe(true);
    const paye = confirmerPaiement(a, '2026-09-24', 10, JOUR);
    const apres = calculerAlertes({
      abonnements: [paye],
      moyensPaiement: [],
      defauts: ALERTES_DEFAUT,
      jour: JOUR,
    });
    expect(apres.some((x) => x.type === 'echeance')).toBe(false);
  });

  it('import JSON : confirmations valides gardées, une par échéance, triées', () => {
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
          {
            ...base,
            id: 'a',
            paiementsConfirmes: [
              { echeance: '2026-09-01', montant: 30, confirmeLe: '2026-09-02' },
              { echeance: '2026-08-01', montant: 29, confirmeLe: '2026-08-01' },
              { echeance: '2026-09-01', montant: 31, confirmeLe: '2026-09-03' },
              { echeance: 'hier', montant: 30, confirmeLe: '2026-09-02' },
              { echeance: '2026-07-01', montant: -5, confirmeLe: '2026-07-02' },
              'nimporte',
            ],
          },
          { ...base, id: 'b' },
        ],
      }),
      JOUR,
    );
    expect(apercu.donnees.abonnements.map((x) => confirmations(x))).toEqual([
      [
        { echeance: '2026-08-01', montant: 29, confirmeLe: '2026-08-01' },
        { echeance: '2026-09-01', montant: 30, confirmeLe: '2026-09-02' },
      ],
      [],
    ]);
  });
});
