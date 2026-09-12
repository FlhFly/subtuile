import { describe, expect, it } from 'vitest';
import { DATE_REFERENCE_DEMO, IDS_DEMO, jeuDemo } from '../src/data/fixtures/demo';
import {
  casesCalendrier,
  decalerMois,
  evenementsAVenir,
  evenementsDuMois,
  grouperParMois,
  moisDe,
} from '../src/domain/echeancier';
import { creerAbonnement } from '../src/domain/fabriques';
import { PERIODICITES, type Abonnement } from '../src/domain/types';

const JOUR = '2026-09-12';

function abo(champs: Partial<Abonnement> & { nom: string }): Abonnement {
  return creerAbonnement(
    { prix: 10, periodicite: PERIODICITES.mensuelle, dateDebut: '2026-01-14', ...champs },
    { jour: JOUR },
  );
}

describe('échéancier (EF-16) — liste chronologique', () => {
  it('un renouvellement par abonnement actif, fins d’essai, préavis et fins résiliées, triés', () => {
    const liste = evenementsAVenir(
      [
        abo({ nom: 'Mensuel' }), // 14/09
        abo({ nom: 'Annuel', periodicite: PERIODICITES.annuelle, dateDebut: '2025-09-13' }), // 13/09
        abo({
          nom: 'Essai',
          dateDebut: '2026-09-01',
          essai: { dateFin: '2026-09-20', prixApres: 12 },
        }),
        abo({
          nom: 'Salle',
          dateDebut: '2025-10-20',
          engagement: { dureeMois: 12, preavisJours: 30 },
        }), // limite 20/09 + renouvellement mensuel ancré le 20
        abo({ nom: 'Résilié', statut: { type: 'resilie_actif_jusquau', jusquau: '2026-09-30' } }),
        abo({ nom: 'Pause', statut: { type: 'en_pause', repriseLe: null } }),
        abo({ nom: 'Archivé', statut: { type: 'archive' } }),
        abo({ nom: 'À vie', periodicite: PERIODICITES.aVie }),
        { ...abo({ nom: 'Fantôme' }), deletedAt: '2026-09-01T00:00:00.000Z' },
      ],
      JOUR,
    );
    expect(liste.map((e) => `${e.date} ${e.type} ${e.nom}`)).toEqual([
      '2026-09-13 renouvellement Annuel',
      '2026-09-14 renouvellement Mensuel',
      '2026-09-20 fin_essai Essai',
      '2026-09-20 preavis Salle',
      '2026-09-20 renouvellement Salle',
      '2026-09-30 fin_resilie Résilié',
    ]);
    const essai = liste.find((e) => e.type === 'fin_essai')!;
    expect(essai).toMatchObject({ niveau: 'trial', jours: 8, montant: 12 });
    const preavis = liste.find((e) => e.type === 'preavis')!;
    expect(preavis).toMatchObject({ niveau: 'trial', preavisJours: 30, montant: null });
    expect(liste.find((e) => e.type === 'fin_resilie')).toMatchObject({ niveau: 'neutre' });
    expect(liste[0]).toMatchObject({ niveau: 'urg', jours: 1, montant: 10 });
    expect(liste[0]!.cle).toBe(`renouvellement:${liste[0]!.abonnementId}:2026-09-13`);
  });

  it('montant supporté (part payée) et apparence par défaut ou résolue', () => {
    const partage = abo({
      nom: 'Netflix',
      partage: { prixTotal: 10, partPayee: 6 },
      couleur: '#123456',
    });
    const [e] = evenementsAVenir([partage], JOUR);
    expect(e).toMatchObject({ montant: 6, couleur: '#123456', initiales: 'Ne' });
    const [f] = evenementsAVenir([partage], JOUR, () => ({ couleur: '#abc', initiales: 'NF' }));
    expect(f).toMatchObject({ couleur: '#abc', initiales: 'NF' });
  });

  it('groupement par mois et navigation de mois', () => {
    const liste = evenementsAVenir(
      [
        abo({ nom: 'A' }),
        abo({ nom: 'B', periodicite: PERIODICITES.annuelle, dateDebut: '2025-11-03' }),
        abo({ nom: 'C', periodicite: PERIODICITES.trimestrielle, dateDebut: '2026-07-20' }),
      ],
      JOUR,
    );
    expect(grouperParMois(liste).map((g) => [g.mois, g.evenements.map((e) => e.nom)])).toEqual([
      ['2026-09', ['A']],
      ['2026-10', ['C']],
      ['2026-11', ['B']],
    ]);
    expect(moisDe(JOUR)).toBe('2026-09');
    expect(decalerMois('2026-09', 1)).toBe('2026-10');
    expect(decalerMois('2026-01', -1)).toBe('2025-12');
    expect(decalerMois('2026-12', 2)).toBe('2027-02');
  });

  it('jeu de démo à sa date de référence : Strava, Basic-Fit, Disney+, Canal+ ; pas Spotify ni Dropbox', () => {
    const jeu = jeuDemo(DATE_REFERENCE_DEMO);
    const liste = evenementsAVenir(jeu.abonnements, DATE_REFERENCE_DEMO);
    const ids = IDS_DEMO.abonnements;
    const de = (id: string) => liste.filter((e) => e.abonnementId === id).map((e) => e.type);
    expect(de(ids.strava)).toEqual(['renouvellement']);
    expect(de(ids.disney)).toEqual(['fin_essai']);
    expect(de(ids.basicFit)).toEqual(['renouvellement', 'preavis']);
    expect(de(ids.canal)).toEqual(['fin_resilie']);
    expect(de(ids.spotify)).toEqual([]);
    expect(de(ids.dropbox)).toEqual([]);
    expect(liste[0]).toMatchObject({ nom: 'Strava', jours: 2 });
  });
});

describe('échéancier — vue calendrier', () => {
  it('occurrences du mois affiché, passées comprises, plus les événements spéciaux', () => {
    const abos = [
      abo({ nom: 'Mensuel 14' }),
      abo({ nom: 'Hebdo', periodicite: PERIODICITES.hebdomadaire, dateDebut: '2026-09-02' }),
      abo({ nom: 'Résilié', statut: { type: 'resilie_actif_jusquau', jusquau: '2026-10-05' } }),
    ];
    const sept = evenementsDuMois(abos, '2026-09', JOUR);
    expect(sept.map((e) => `${e.date} ${e.nom}`)).toEqual([
      '2026-09-02 Hebdo',
      '2026-09-09 Hebdo',
      '2026-09-14 Mensuel 14',
      '2026-09-16 Hebdo',
      '2026-09-23 Hebdo',
      '2026-09-30 Hebdo',
    ]);
    expect(sept[0]).toMatchObject({ jours: -10, niveau: 'urg' });
    const oct = evenementsDuMois(abos, '2026-10', JOUR);
    expect(oct.map((e) => `${e.date} ${e.type}`)).toContain('2026-10-05 fin_resilie');
    expect(oct.filter((e) => e.nom === 'Mensuel 14').map((e) => e.date)).toEqual(['2026-10-14']);
    // pendant l'essai, le cycle payant démarre à la fin d'essai : aucun renouvellement avant
    const essai = abo({
      nom: 'Essai',
      dateDebut: '2026-09-01',
      essai: { dateFin: '2026-09-20', prixApres: 12 },
    });
    expect(evenementsDuMois([essai], '2026-09', JOUR).map((e) => `${e.date} ${e.type}`)).toEqual([
      '2026-09-20 fin_essai',
      '2026-09-20 renouvellement',
    ]);
  });

  it('grille du mois : semaines du lundi au dimanche, cases de remplissage, aujourd’hui marqué', () => {
    const evenements = evenementsDuMois([abo({ nom: 'A' })], '2026-09', JOUR);
    const cases = casesCalendrier('2026-09', evenements, JOUR);
    // septembre 2026 commence un mardi → une case vide, 30 jours, complété à 35
    expect(cases).toHaveLength(35);
    expect(cases[0]).toMatchObject({ date: null, numero: null });
    expect(cases[1]).toMatchObject({ date: '2026-09-01', numero: 1 });
    expect(cases[12]).toMatchObject({ date: JOUR, aujourdhui: true });
    expect(cases[14]!.evenements.map((e) => e.nom)).toEqual(['A']);
    expect(cases.filter((c) => c.date !== null)).toHaveLength(30);
    expect(cases.filter((c) => c.aujourdhui)).toHaveLength(1);
    // novembre 2026 commence un dimanche → six cases vides, 30 jours, 42 cases
    expect(casesCalendrier('2026-11', [], JOUR)).toHaveLength(42);
    // février 2027 commence un lundi : 28 jours, 28 cases
    expect(casesCalendrier('2027-02', [], JOUR)).toHaveLength(28);
  });
});
