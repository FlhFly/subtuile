import { describe, expect, it } from 'vitest';
import { doublonsPotentiels } from '../src/domain/doublons';
import { creerAbonnement } from '../src/domain/fabriques';
import { PERIODICITES, type Abonnement } from '../src/domain/types';

const JOUR = '2026-09-13';
const abo = (champs: Partial<Abonnement> & { id: string; nom: string }): Abonnement =>
  creerAbonnement(
    { prix: 10, periodicite: PERIODICITES.mensuelle, dateDebut: '2026-01-10', ...champs },
    { jour: JOUR },
  );

const liste = [
  abo({ id: 'n1', nom: 'Netflix', serviceId: 'netflix' }),
  abo({ id: 'n2', nom: 'Netflix (archivé)', serviceId: 'netflix', statut: { type: 'archive' } }),
  abo({ id: 'e1', nom: 'EDF Élec', serviceId: null }),
  abo({
    id: 's1',
    nom: 'Spotify',
    serviceId: 'spotify',
    statut: { type: 'en_pause', repriseLe: null },
  }),
];

describe('doublons à la création (C3)', () => {
  it('même service du catalogue, sauf archivés', () => {
    expect(
      doublonsPotentiels(liste, { serviceId: 'netflix', nom: 'Autre' }).map((a) => a.id),
    ).toEqual(['n1']);
  });

  it('même nom, accents et casse ignorés, en pause compris', () => {
    expect(
      doublonsPotentiels(liste, { serviceId: null, nom: 'edf elec' }).map((a) => a.id),
    ).toEqual(['e1']);
    expect(doublonsPotentiels(liste, { serviceId: null, nom: 'SPOTIFY' }).map((a) => a.id)).toEqual(
      ['s1'],
    );
  });

  it('rien pour un nom vide, un nom inconnu, ou l’abonnement exclu (modification)', () => {
    expect(doublonsPotentiels(liste, { serviceId: null, nom: '' })).toEqual([]);
    expect(doublonsPotentiels(liste, { serviceId: null, nom: 'Canal+' })).toEqual([]);
    expect(doublonsPotentiels(liste, { serviceId: 'netflix', nom: 'Netflix' }, 'n1')).toEqual([]);
  });
});
