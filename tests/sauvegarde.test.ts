import { describe, expect, it } from 'vitest';
import { ALERTES_DEFAUT } from '../src/data/preferences';
import {
  calculerAlertes,
  SAUVEGARDE_MIN_ABONNEMENTS,
  SAUVEGARDE_RAPPEL_JOURS,
  type Alerte,
} from '../src/domain/alertes';
import { creerAbonnement } from '../src/domain/fabriques';
import { PERIODICITES, type Abonnement } from '../src/domain/types';

const JOUR = '2026-09-13';
const abo = (id: string, champs: Partial<Abonnement> = {}): Abonnement =>
  creerAbonnement(
    {
      id,
      nom: id,
      prix: 10,
      periodicite: PERIODICITES.mensuelle,
      dateDebut: '2026-01-01',
      ...champs,
    },
    { jour: JOUR },
  );
const trois = [abo('a'), abo('b'), abo('c')];
const sauvegardes = (alertes: Alerte[]) => alertes.filter((a) => a.type === 'sauvegarde');
const calculer = (
  abonnements: Abonnement[],
  derniereSauvegarde: string | null | undefined,
  lues: string[] = [],
) =>
  sauvegardes(
    calculerAlertes({
      abonnements,
      moyensPaiement: [],
      defauts: ALERTES_DEFAUT,
      jour: JOUR,
      lues,
      derniereSauvegarde,
    }),
  );

describe('rappel de sauvegarde (C1)', () => {
  it('aucun rappel sans préférence, sans abonnement, ou avec moins de trois abonnements jamais sauvegardés', () => {
    expect(calculer(trois, undefined)).toEqual([]);
    expect(calculer([], null)).toEqual([]);
    expect(calculer(trois.slice(0, SAUVEGARDE_MIN_ABONNEMENTS - 1), null)).toEqual([]);
    expect(calculer([abo('x', { statut: { type: 'archive' } })], null)).toEqual([]);
  });

  it('jamais sauvegardé, trois abonnements : rappel « jamais », classé en dernier', () => {
    const [a] = calculer(trois, null);
    expect(a).toMatchObject({
      type: 'sauvegarde',
      cle: 'sauvegarde:global:jamais',
      niveau: 'warn',
      joursDepuis: null,
      nbAbonnements: 3,
      lue: false,
    });
    const toutes = calculerAlertes({
      abonnements: [...trois, abo('proche', { dateDebut: '2026-08-14' })],
      moyensPaiement: [],
      defauts: ALERTES_DEFAUT,
      jour: JOUR,
      derniereSauvegarde: null,
    });
    expect(toutes.at(-1)?.type).toBe('sauvegarde');
  });

  it('dernier export récent : rien ; au-delà du délai : « il y a n jours », clé par date d’export', () => {
    expect(calculer(trois, '2026-09-01')).toEqual([]);
    const [a] = calculer(trois, '2026-08-01');
    expect(a).toMatchObject({
      cle: 'sauvegarde:global:2026-08-01',
      joursDepuis: 43,
      derniereSauvegarde: '2026-08-01',
    });
    expect(43).toBeGreaterThanOrEqual(SAUVEGARDE_RAPPEL_JOURS);
    // un seul abonnement suffit quand une sauvegarde a déjà eu lieu
    expect(calculer([abo('seul')], '2026-08-01')).toHaveLength(1);
  });

  it('marquée lue, elle se tait jusqu’à l’export suivant', () => {
    expect(calculer(trois, '2026-08-01', ['sauvegarde:global:2026-08-01'])[0]?.lue).toBe(true);
    expect(calculer(trois, '2026-08-02', ['sauvegarde:global:2026-08-01'])[0]?.lue).toBe(false);
  });
});
