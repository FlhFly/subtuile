import { describe, expect, it } from 'vitest';
import { CLE_ALERTES_LUES, ecrireAlertesLues, lireAlertesLues } from '../src/data/alertesLues';
import { DATE_REFERENCE_DEMO, jeuDemo } from '../src/data/fixtures/demo';
import { ALERTES_DEFAUT, type StockageCleValeur } from '../src/data/preferences';
import {
  appliquerLues,
  calculerAlertes,
  cleAlerte,
  clesApresMarquage,
  dateDeCle,
  FENETRE_ANNONCE_JOURS,
  nettoyerCles,
  nombreNonLues,
  seuilEcheance,
  type Alerte,
} from '../src/domain/alertes';
import {
  creerAbonnement,
  creerMoyenPaiement,
  type NouvelAbonnement,
} from '../src/domain/fabriques';
import { PERIODICITES, type Abonnement, type MoyenPaiement } from '../src/domain/types';

const JOUR = '2026-09-11';

/** Mensuel ancré le 14 : prochaine échéance le 14/09 → J-3. */
function abo(champs: Partial<NouvelAbonnement> & { nom: string }): Abonnement {
  return creerAbonnement(
    { prix: 10, periodicite: PERIODICITES.mensuelle, dateDebut: '2026-01-14', ...champs },
    { jour: JOUR },
  );
}

function alertes(
  abonnements: Abonnement[],
  moyensPaiement: MoyenPaiement[] = [],
  defauts = ALERTES_DEFAUT,
  jour = JOUR,
  lues: string[] = [],
): Alerte[] {
  return calculerAlertes({ abonnements, moyensPaiement, defauts, jour, lues });
}

const types = (liste: Alerte[]) => liste.map((a) => a.type);

describe('moteur d’alertes (EF-30) — échéance J-X', () => {
  it('alerte à J-3 par défaut, pas à J-4 ; seuil propre à l’abonnement prioritaire', () => {
    const j3 = abo({ nom: 'J-3' });
    const j4 = abo({ nom: 'J-4', dateDebut: '2026-01-15' });
    expect(
      alertes([j3, j4]).map((a) =>
        a.type === 'carte' ? a.libelle : a.type === 'sauvegarde' ? '' : a.nom,
      ),
    ).toEqual(['J-3']);
    const a = alertes([j3])[0]!;
    expect(a).toMatchObject({
      type: 'echeance',
      niveau: 'urg',
      date: '2026-09-14',
      jours: 3,
      prix: 10,
      periodicite: PERIODICITES.mensuelle,
      lue: false,
      cle: cleAlerte('echeance', j3.id, '2026-09-14'),
    });
    const j4Perso = abo({ nom: 'J-4 perso', dateDebut: '2026-01-15', alerteJoursAvant: 7 });
    expect(seuilEcheance(j4Perso, ALERTES_DEFAUT)).toBe(7);
    expect(alertes([j4Perso])[0]).toMatchObject({ type: 'echeance', jours: 4, niveau: 'warn' });
    expect(alertes([j3], [], { ...ALERTES_DEFAUT, echeanceJours: 0 })).toEqual([]);
  });

  it('montant supporté : part payée si partagé, montant estimé signalé', () => {
    const partage = abo({ nom: 'Partagé', partage: { prixTotal: 10, partPayee: 5 } });
    expect(alertes([partage])[0]).toMatchObject({ prix: 5, montantEstime: false });
    const estime = abo({ nom: 'Estimé', montantEstime: true });
    expect(alertes([estime])[0]).toMatchObject({ prix: 10, montantEstime: true });
  });

  it('aucune alerte d’échéance en pause, résilié, archivé, à vie ou à l’usage', () => {
    const liste = [
      abo({ nom: 'Pause', statut: { type: 'en_pause', repriseLe: null } }),
      abo({ nom: 'Résilié', statut: { type: 'resilie_actif_jusquau', jusquau: '2026-09-14' } }),
      abo({ nom: 'Archivé', statut: { type: 'archive' } }),
      abo({ nom: 'À vie', periodicite: PERIODICITES.aVie }),
      abo({ nom: 'Usage', periodicite: PERIODICITES.aLUsage }),
    ];
    expect(alertes(liste)).toEqual([]);
  });
});

describe('moteur d’alertes — fin d’essai (EF-04) et préavis (EF-05)', () => {
  it('fin d’essai à J-2 par défaut ; l’essai en cours remplace l’alerte d’échéance', () => {
    const j2 = abo({
      nom: 'Essai J-2',
      dateDebut: '2026-09-01',
      essai: { dateFin: '2026-09-13', prixApres: 12 },
    });
    const liste = alertes([j2]);
    expect(types(liste)).toEqual(['essai']);
    expect(liste[0]).toMatchObject({
      niveau: 'trial',
      date: '2026-09-13',
      jours: 2,
      prixApres: 12,
      cle: cleAlerte('essai', j2.id, '2026-09-13'),
    });
    // J-3 : ni alerte d'essai (seuil J-2), ni alerte d'échéance (l'essai porte la date)
    const j3 = abo({
      nom: 'Essai J-3',
      dateDebut: '2026-09-01',
      essai: { dateFin: '2026-09-14', prixApres: 12 },
    });
    expect(alertes([j3])).toEqual([]);
    expect(types(alertes([j3], [], { ...ALERTES_DEFAUT, essaiJours: 7 }))).toEqual(['essai']);
    // essai terminé : retour au cycle payant ancré à la fin d'essai
    const fini = abo({
      nom: 'Essai fini',
      dateDebut: '2026-07-31',
      essai: { dateFin: '2026-08-14', prixApres: 12 },
    });
    expect(alertes([fini])[0]).toMatchObject({ type: 'echeance', date: '2026-09-14', jours: 3 });
  });

  it('préavis : date limite = fin d’engagement − préavis, à J-14 par défaut, même en pause', () => {
    const j9 = abo({
      nom: 'Salle',
      dateDebut: '2025-10-20',
      engagement: { dureeMois: 12, preavisJours: 30 },
    });
    const liste = alertes([j9]);
    expect(types(liste)).toEqual(['preavis']);
    expect(liste[0]).toMatchObject({
      niveau: 'trial',
      date: '2026-09-20',
      jours: 9,
      preavisJours: 30,
      cle: cleAlerte('preavis', j9.id, '2026-09-20'),
    });
    const j19 = abo({
      nom: 'Salle loin',
      dateDebut: '2025-10-30',
      engagement: { dureeMois: 12, preavisJours: 30 },
    });
    expect(alertes([j19])).toEqual([]);
    expect(types(alertes([j19], [], { ...ALERTES_DEFAUT, preavisJours: 30 }))).toEqual(['preavis']);
    const pause = abo({
      nom: 'Salle en pause',
      dateDebut: '2025-10-20',
      engagement: { dureeMois: 12, preavisJours: 30 },
      statut: { type: 'en_pause', repriseLe: null },
    });
    expect(types(alertes([pause]))).toEqual(['preavis']);
    const archive = { ...pause, statut: { type: 'archive' } as const };
    expect(alertes([archive])).toEqual([]);
  });
});

describe('moteur d’alertes — carte expirant (EF-30, M-1)', () => {
  const carte = (dateExpiration: string) =>
    creerMoyenPaiement({ type: 'cb', libelle: 'CB', dateExpiration }, { jour: JOUR });

  it('carte utilisée expirant le mois prochain : alerte dès le 1er du mois précédent', () => {
    const cb = carte('2026-10');
    const utilise = abo({ nom: 'Netflix', moyenPaiementId: cb.id, dateDebut: '2026-01-20' });
    const liste = alertes([utilise], [cb]);
    expect(liste).toHaveLength(1);
    expect(liste[0]).toMatchObject({
      type: 'carte',
      niveau: 'warn',
      date: '2026-10-31',
      jours: 50,
      moyenPaiementId: cb.id,
      libelle: 'CB',
      expiration: '2026-10',
      moisRestants: 1,
      expiree: false,
      nbAbonnements: 1,
      cle: cleAlerte('carte', cb.id, '2026-10-31'),
    });
    expect(alertes([utilise], [cb], ALERTES_DEFAUT, '2026-08-31')).toEqual([]);
  });

  it('carte expirée : rouge ; carte inutilisée ou utilisée par un archivé seulement : rien', () => {
    const expiree = carte('2026-08');
    const utilise = abo({ nom: 'A', moyenPaiementId: expiree.id, dateDebut: '2026-01-20' });
    expect(alertes([utilise], [expiree])[0]).toMatchObject({
      type: 'carte',
      niveau: 'urg',
      expiree: true,
      jours: -11,
    });
    expect(alertes([abo({ nom: 'Sans carte', dateDebut: '2026-01-20' })], [expiree])).toEqual([]);
    const archive = { ...utilise, statut: { type: 'archive' } as const };
    expect(alertes([archive], [expiree])).toEqual([]);
  });

  it('défaut « carte » en mois et cartes sans date ou supprimées', () => {
    const loin = carte('2026-12');
    const utilise = abo({ nom: 'A', moyenPaiementId: loin.id, dateDebut: '2026-01-20' });
    expect(alertes([utilise], [loin])).toEqual([]);
    expect(types(alertes([utilise], [loin], { ...ALERTES_DEFAUT, carteMois: 3 }))).toEqual([
      'carte',
    ]);
    const sansDate = creerMoyenPaiement({ type: 'paypal', libelle: 'PayPal' });
    expect(alertes([{ ...utilise, moyenPaiementId: sansDate.id }], [sansDate])).toEqual([]);
    const supprimee = { ...carte('2026-08'), deletedAt: '2026-09-01T00:00:00.000Z' };
    expect(alertes([{ ...utilise, moyenPaiementId: supprimee.id }], [supprimee])).toEqual([]);
  });
});

describe('moteur d’alertes — régularisation (EF-04b) et hausse annoncée (EF-08b)', () => {
  it(`régularisation annuelle dans la fenêtre de ${FENETRE_ANNONCE_JOURS} jours, jamais passée`, () => {
    const edf = abo({
      nom: 'EDF',
      dateDebut: '2026-01-20',
      montantEstime: true,
      prix: 64,
      regularisation: { date: '2026-10-10' },
    });
    const liste = alertes([edf]);
    expect(types(liste)).toEqual(['regularisation']);
    expect(liste[0]).toMatchObject({
      niveau: 'warn',
      date: '2026-10-10',
      jours: 29,
      prix: 64,
      montantEstime: true,
      cle: cleAlerte('regularisation', edf.id, '2026-10-10'),
    });
    expect(alertes([{ ...edf, regularisation: { date: '2026-10-12' } }])).toEqual([]);
    expect(alertes([{ ...edf, regularisation: { date: '2026-09-10' } }])).toEqual([]);
    expect(alertes([{ ...edf, regularisation: { date: JOUR } }])[0]).toMatchObject({ jours: 0 });
  });

  it('rappel libre à date (EF-74) : du jour J pendant 30 jours, même résilié, jamais archivé', () => {
    const r = abo({ nom: 'Box', rappel: { date: '2026-09-11', texte: 'renégocier la box' } });
    expect(types(alertes([r], [], ALERTES_DEFAUT, '2026-09-10'))).not.toContain('rappel');
    const jourJ = alertes([r], [], ALERTES_DEFAUT, '2026-09-11').find((x) => x.type === 'rappel');
    expect(jourJ).toMatchObject({
      type: 'rappel',
      nom: 'Box',
      texte: 'renégocier la box',
      jours: 0,
      niveau: 'warn',
      cle: cleAlerte('rappel', r.id, '2026-09-11'),
    });
    const apres = alertes([r], [], ALERTES_DEFAUT, '2026-10-01').find((x) => x.type === 'rappel');
    expect(apres?.jours).toBe(-20);
    expect(types(alertes([r], [], ALERTES_DEFAUT, '2026-10-12'))).not.toContain('rappel');
    const resilie = {
      ...r,
      statut: { type: 'resilie_actif_jusquau', jusquau: '2026-12-31' } as Abonnement['statut'],
    };
    expect(types(alertes([resilie], [], ALERTES_DEFAUT, '2026-09-11'))).toEqual(['rappel']);
    const archive = { ...r, statut: { type: 'archive' } as Abonnement['statut'] };
    expect(types(alertes([archive], [], ALERTES_DEFAUT, '2026-09-11'))).toEqual([]);
  });

  it('hausse annoncée : ancien et nouveau prix, variation en %, fenêtre de 30 jours', () => {
    const netflix = abo({
      nom: 'Netflix',
      dateDebut: '2026-01-20',
      prixFutur: { date: '2026-10-01', montant: 11 },
    });
    const liste = alertes([netflix]);
    expect(types(liste)).toEqual(['prix_futur']);
    expect(liste[0]).toMatchObject({
      niveau: 'warn',
      date: '2026-10-01',
      jours: 20,
      prix: 10,
      nouveauPrix: 11,
      variationPourCent: 10,
      cle: cleAlerte('prix_futur', netflix.id, '2026-10-01'),
    });
    expect(alertes([{ ...netflix, prixFutur: { date: '2026-10-15', montant: 11 } }])).toEqual([]);
    const baisse = { ...netflix, prixFutur: { date: '2026-10-01', montant: 8.5 } };
    expect(alertes([baisse])[0]).toMatchObject({ variationPourCent: -15 });
    // en pause : la hausse annoncée reste signalée
    const pause = { ...netflix, statut: { type: 'en_pause', repriseLe: null } as const };
    expect(types(alertes([pause]))).toEqual(['prix_futur']);
  });
});

describe('moteur d’alertes — tri, état lu (EF-31) et jeu de démo', () => {
  it('tri : la plus proche d’abord, puis la plus grave, puis le nom ; tombstones ignorés', () => {
    const cb = creerMoyenPaiement({ type: 'cb', libelle: 'CB', dateExpiration: '2026-08' });
    const liste = alertes(
      [
        abo({ nom: 'Zed', moyenPaiementId: cb.id }), // échéance J-3 urg
        abo({ nom: 'Alpha', dateDebut: '2026-01-15', alerteJoursAvant: 7 }), // J-4 warn
        abo({
          nom: 'Salle',
          periodicite: PERIODICITES.annuelle,
          dateDebut: '2025-10-14',
          engagement: { dureeMois: 12, preavisJours: 30 },
        }), // préavis 14/09 J-3 trial (échéance annuelle le 14/10, hors seuil)
        { ...abo({ nom: 'Fantôme' }), deletedAt: '2026-09-01T00:00:00.000Z' },
      ],
      [cb],
    );
    expect(liste.map((a) => [a.type, a.jours])).toEqual([
      ['carte', -11],
      ['echeance', 3],
      ['preavis', 3],
      ['echeance', 4],
    ]);
  });

  it('état lu : application, compteur, « tout marquer comme lu », rétention des clés', () => {
    const a = abo({ nom: 'A' });
    const b = abo({ nom: 'B', dateDebut: '2026-01-13' });
    const [premiere, seconde] = alertes([a, b]);
    expect(premiere!.lue).toBe(false);
    const avecLues = appliquerLues([premiere!, seconde!], [premiere!.cle]);
    expect(avecLues.map((x) => x.lue)).toEqual([true, false]);
    expect(avecLues[1]).toBe(seconde);
    expect(nombreNonLues(avecLues)).toBe(1);
    expect(nombreNonLues(alertes([a, b], [], ALERTES_DEFAUT, JOUR, [premiere!.cle]))).toBe(1);

    const vieille = cleAlerte('echeance', a.id, '2026-06-01');
    const limite = cleAlerte('echeance', a.id, '2026-06-13');
    const cles = clesApresMarquage(avecLues, [vieille, limite, premiere!.cle], JOUR);
    expect(cles).toEqual([limite, premiere!.cle, seconde!.cle]);
    // ouvrir une alerte la marque lue, elle seule (v1.0.23)
    const uneSeule = clesApresMarquage([seconde!], [], JOUR);
    expect(uneSeule).toEqual([seconde!.cle]);
    expect(appliquerLues([premiere!, seconde!], uneSeule).map((x) => x.lue)).toEqual([false, true]);
    expect(nettoyerCles([vieille, limite, limite], JOUR)).toEqual([limite]);
    expect(dateDeCle(cleAlerte('carte', 'demo-mp-cb', '2026-09-30'))).toBe('2026-09-30');
    // une échéance qui bouge produit une nouvelle clé, donc une alerte non lue
    const decale = { ...a, echeanceManuelle: '2026-09-12' };
    expect(nombreNonLues(alertes([decale], [], ALERTES_DEFAUT, JOUR, [premiere!.cle]))).toBe(1);
  });

  it('jeu de démo à sa date de référence : renouvellement, préavis, carte, régularisation', () => {
    const jeu = jeuDemo(DATE_REFERENCE_DEMO);
    const liste = calculerAlertes({
      abonnements: jeu.abonnements,
      moyensPaiement: jeu.moyensPaiement,
      defauts: ALERTES_DEFAUT,
      jour: DATE_REFERENCE_DEMO,
    });
    const resume = liste.map(
      (x) =>
        `${x.type}:${x.type === 'carte' ? x.libelle : x.type === 'sauvegarde' ? '' : x.nom}:${x.jours}`,
    );
    expect(resume).toEqual([
      'echeance:Strava:2',
      'preavis:Basic-Fit:10',
      'regularisation:EDF Élec:27',
      'carte:CB perso:45',
    ]);
    const carte = liste.find((x) => x.type === 'carte');
    expect(carte?.type === 'carte' ? carte.nbAbonnements : 0).toBeGreaterThanOrEqual(1);
    // trois jours plus tard, la fin d'essai Disney+ entre dans la fenêtre J-2
    const plusTard = calculerAlertes({
      abonnements: jeu.abonnements,
      moyensPaiement: jeu.moyensPaiement,
      defauts: ALERTES_DEFAUT,
      jour: '2026-08-19',
    });
    expect(plusTard.find((x) => x.type === 'essai')).toMatchObject({ nom: 'Disney+', jours: 2 });
  });
});

describe('état lu persisté (localStorage)', () => {
  function stockageMemoire(initial: Record<string, string> = {}): StockageCleValeur {
    const data = new Map(Object.entries(initial));
    return {
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => void data.set(k, v),
      removeItem: (k) => void data.delete(k),
    };
  }

  it('lecture tolérante et aller-retour', () => {
    expect(lireAlertesLues(stockageMemoire())).toEqual([]);
    expect(lireAlertesLues(stockageMemoire({ [CLE_ALERTES_LUES]: '{oops' }))).toEqual([]);
    expect(lireAlertesLues(stockageMemoire({ [CLE_ALERTES_LUES]: '{"a":1}' }))).toEqual([]);
    expect(lireAlertesLues(stockageMemoire({ [CLE_ALERTES_LUES]: '["x", 3, "y"]' }))).toEqual([
      'x',
      'y',
    ]);
    const s = stockageMemoire();
    ecrireAlertesLues(s, ['echeance:a:2026-09-14']);
    expect(lireAlertesLues(s)).toEqual(['echeance:a:2026-09-14']);
    const casse: StockageCleValeur = {
      ...s,
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(() => ecrireAlertesLues(casse, ['x'])).not.toThrow();
  });
});
