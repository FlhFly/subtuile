/**
 * Recette du lot 3 (CdC §6) : « un essai gratuit et un préavis déclenchent les
 * bonnes alertes aux bonnes dates ». Rejoue le parcours hors navigateur :
 * abonnements saisis via le formulaire et enregistrés, alertes calculées à
 * plusieurs dates avec les défauts EF-30, état lu, échéancier, rappels .ics,
 * cycle de vie automatique au chargement.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ALERTES_DEFAUT } from '../src/data/preferences';
import {
  changerStatut,
  chargerAbonnementsAJour,
  enregistrerAbonnement,
} from '../src/data/services/abonnements';
import { creerDexieProvider, type DexieProvider } from '../src/data/storage/dexieProvider';
import {
  appliquerLues,
  calculerAlertes,
  clesApresMarquage,
  nombreNonLues,
  type Alerte,
} from '../src/domain/alertes';
import { evenementsAVenir, grouperParMois } from '../src/domain/echeancier';
import { creerMoyenPaiement } from '../src/domain/fabriques';
import {
  abonnementDepuisFormulaire,
  formulaireVide,
  validerFormulaire,
  type EtatFormulaire,
} from '../src/domain/formulaire';
import type { Abonnement, Langue, MoyenPaiement } from '../src/domain/types';
import {
  formaterDate,
  formaterMontant,
  libelleCompteur,
  libellePeriodicite,
  traduire,
  traduireNombre,
} from '../src/i18n';
import type { I18n } from '../src/ui/contexts/I18nContext';
import { libellesAlerte } from '../src/ui/libellesAlertes';
import { icsDepuisEvenements } from '../src/ui/rappelsIcs';

const JOUR = '2026-09-12';

/** I18n sans React, pour vérifier les libellés rendus par les écrans. */
function i18n(langue: Langue): I18n {
  return {
    langue,
    t: (cle, params) => traduire(langue, cle, params),
    tn: (cle, n, params) => traduireNombre(langue, cle, n, params),
    montant: (v, devise) => formaterMontant(langue, v, devise),
    date: (d, style) => formaterDate(langue, d, style),
    compteur: (jours) => libelleCompteur(langue, jours),
    periodicite: (p, plafond) => libellePeriodicite(langue, p, plafond),
    changerLangue: () => undefined,
  };
}
const fr = i18n('fr');

const saisie = (partiel: Partial<EtatFormulaire>): EtatFormulaire => ({
  ...formulaireVide(JOUR),
  ...partiel,
});

let storage: DexieProvider;
let abos: Abonnement[];
let cb: MoyenPaiement;
const nomDe = (a: Alerte | Abonnement): string => ('libelle' in a ? a.libelle : a.nom);
const alertesLe = (jour: string, lues: string[] = []): Alerte[] =>
  calculerAlertes({ abonnements: abos, moyensPaiement: [cb], defauts: ALERTES_DEFAUT, jour, lues });

beforeAll(async () => {
  storage = creerDexieProvider('subtuile-recette-lot3');
  cb = await storage.moyensPaiement.enregistrer(
    creerMoyenPaiement({ type: 'cb', libelle: 'CB perso', dateExpiration: '2026-10' }),
  );
  const formulaires: EtatFormulaire[] = [
    // essai gratuit jusqu'au 17/09 (J-5), puis 11,99 € / mois
    saisie({
      nom: 'Disney+',
      prix: '11,99',
      categorie: 'streaming',
      dateDebut: '2026-09-03',
      essai: true,
      essaiFin: '2026-09-17',
      essaiPrix: '11,99',
      moyenPaiementId: cb.id,
    }),
    // engagement 12 mois, préavis 30 j : fin le 22/10, date limite le 22/09 (J-10)
    saisie({
      nom: 'Basic-Fit',
      prix: '24,99',
      categorie: 'sport',
      dateDebut: '2025-10-22',
      engagement: true,
      engagementMois: '12',
      engagementPreavis: '30',
    }),
    // renouvellement le 15/09 (J-3), hausse annoncée le 02/10 (J-20), alerte propre J-7
    saisie({
      nom: 'Netflix',
      prix: '13,49',
      categorie: 'streaming',
      dateDebut: '2026-01-15',
      prixFutur: true,
      prixFuturDate: '2026-10-02',
      prixFuturMontant: '14,99',
      moyenPaiementId: cb.id,
      alerteJoursAvant: 7,
    }),
    // régularisation annuelle le 09/10 (J-27), montant estimé
    saisie({
      nom: 'EDF',
      prix: '64',
      categorie: 'vie_courante',
      dateDebut: '2026-01-20',
      montantEstime: true,
      regularisationDate: '2026-10-09',
    }),
    saisie({ nom: 'Canal+', prix: '19,99', categorie: 'streaming', dateDebut: '2026-01-14' }),
    saisie({ nom: 'Spotify', prix: '10,99', categorie: 'musique', dateDebut: '2026-01-20' }),
  ];
  for (const f of formulaires) {
    expect(validerFormulaire(f), f.nom).toEqual({});
    await enregistrerAbonnement(storage, abonnementDepuisFormulaire(f, { jour: JOUR }), JOUR);
  }
  const charges = await chargerAbonnementsAJour(storage, JOUR);
  const id = (nom: string) => charges.find((a) => nomDe(a) === nom)!.id;
  // résilié — actif jusqu'au 14/09 ; en pause jusqu'au 13/09
  await changerStatut(
    storage,
    id('Canal+'),
    { type: 'resilie_actif_jusquau', jusquau: '2026-09-14' },
    JOUR,
  );
  await changerStatut(storage, id('Spotify'), { type: 'en_pause', repriseLe: '2026-09-13' }, JOUR);
  abos = await chargerAbonnementsAJour(storage, JOUR);
});

afterAll(async () => {
  await storage.supprimerBase();
});

describe('recette lot 3 — essai et préavis alertent aux bonnes dates (CdC §6)', () => {
  it('le 12/09 : renouvellement J-3, préavis J-10, hausse J-20, régularisation J-27, carte M-1 — pas encore l’essai', () => {
    const liste = alertesLe(JOUR);
    expect(
      liste.map((a) => `${a.type}:${a.type === 'carte' ? a.libelle : a.nom}:${a.jours}`),
    ).toEqual([
      'echeance:Netflix:3',
      'preavis:Basic-Fit:10',
      'prix_futur:Netflix:20',
      'regularisation:EDF:27',
      'carte:CB perso:49',
    ]);
    // en pause, résilié : aucun renouvellement ; Basic-Fit se renouvelle le 22/09 (J-10 > J-3)
    expect(liste.some((a) => nomDe(a) === 'Spotify' || nomDe(a) === 'Canal+')).toBe(false);
    expect(liste.find((a) => a.type === 'carte')).toMatchObject({ nbAbonnements: 2 });
  });

  it('fin d’essai : alerte à J-2 (défaut EF-30), ni avant ni en doublon avec le renouvellement', () => {
    expect(alertesLe('2026-09-14').some((a) => a.type === 'essai')).toBe(false);
    const le15 = alertesLe('2026-09-15');
    const essai = le15.find((a) => a.type === 'essai')!;
    expect(essai).toMatchObject({ nom: 'Disney+', date: '2026-09-17', jours: 2, niveau: 'trial' });
    expect(le15.filter((a) => nomDe(a) === 'Disney+')).toHaveLength(1);
    const l = libellesAlerte(fr, essai);
    expect(l.pastille).toBe('J-2');
    expect(l.titre).toBe('Fin d’essai Disney+ le 17 sept. 2026');
    // avec un défaut à J-7, l'alerte arrive dès le 10/09
    const large = calculerAlertes({
      abonnements: abos,
      moyensPaiement: [],
      defauts: { ...ALERTES_DEFAUT, essaiJours: 7 },
      jour: '2026-09-10',
    });
    expect(large.find((a) => a.type === 'essai')).toMatchObject({ jours: 7 });
  });

  it('préavis : alerte à J-14 (défaut EF-30) sur la date limite fin d’engagement − préavis', () => {
    expect(alertesLe('2026-09-07').some((a) => a.type === 'preavis')).toBe(false);
    const le8 = alertesLe('2026-09-08').find((a) => a.type === 'preavis')!;
    expect(le8).toMatchObject({
      nom: 'Basic-Fit',
      date: '2026-09-22',
      jours: 14,
      preavisJours: 30,
    });
    const l = libellesAlerte(
      fr,
      alertesLe(JOUR).find((a) => a.type === 'preavis')!,
    );
    expect(l.pastille).toBe('J-10');
    expect(l.titre).toBe('Préavis Basic-Fit avant le 22 sept. 2026');
    expect(l.sousTitre).toBe('Dernier jour pour résilier sans reconduction (préavis 30 j)');
  });

  it('seuil propre à l’abonnement : Netflix alerte dès J-7 pour son renouvellement', () => {
    expect(alertesLe('2026-09-08').find((a) => a.type === 'echeance')).toMatchObject({
      nom: 'Netflix',
      jours: 7,
      niveau: 'warn',
    });
    expect(alertesLe('2026-09-07').some((a) => a.type === 'echeance')).toBe(false);
  });

  it('« tout marquer lu » puis une nouvelle alerte le lendemain redevient à lire (EF-31)', () => {
    const lues = clesApresMarquage(alertesLe(JOUR), [], JOUR);
    expect(nombreNonLues(appliquerLues(alertesLe(JOUR), lues))).toBe(0);
    expect(nombreNonLues(alertesLe('2026-09-13', lues))).toBe(0);
    const le15 = alertesLe('2026-09-15', lues);
    expect(nombreNonLues(le15)).toBe(1);
    expect(le15.find((a) => !a.lue)).toMatchObject({ type: 'essai', nom: 'Disney+' });
  });

  it('échéancier : fin d’essai, préavis, fin résiliée et renouvellements, groupés par mois (EF-16)', () => {
    const evts = evenementsAVenir(abos, JOUR);
    expect(evts.map((e) => `${e.date} ${e.type} ${e.nom}`)).toEqual([
      '2026-09-14 fin_resilie Canal+',
      '2026-09-15 renouvellement Netflix',
      '2026-09-17 fin_essai Disney+',
      '2026-09-20 renouvellement EDF',
      '2026-09-22 preavis Basic-Fit',
      '2026-09-22 renouvellement Basic-Fit',
    ]);
    expect(grouperParMois(evts).map((g) => g.mois)).toEqual(['2026-09']);
  });

  it('rappels .ics : alarmes calées sur les défauts et le seuil propre (EF-32)', () => {
    const evts = evenementsAVenir(abos, JOUR);
    const ics = icsDepuisEvenements(fr, evts, ALERTES_DEFAUT, new Map(abos.map((a) => [a.id, a])));
    const lignes = ics.split('\r\n');
    expect(lignes.filter((l) => l === 'BEGIN:VEVENT')).toHaveLength(6);
    expect(lignes).toContain('DTSTART;VALUE=DATE:20260917');
    expect(lignes).toContain('TRIGGER;VALUE=DURATION:-P2D'); // fin d'essai
    expect(lignes).toContain('TRIGGER;VALUE=DURATION:-P14D'); // préavis
    expect(lignes).toContain('TRIGGER;VALUE=DURATION:-P7D'); // Netflix, seuil propre
    expect(lignes).toContain('TRIGGER;VALUE=DURATION:PT9H'); // fin résiliée, le jour même
    expect(lignes.some((l) => l.startsWith('SUMMARY:Disney+ — Fin d’essai'))).toBe(true);
  });

  it('cycle de vie au chargement : reprise, archivage, hausse appliquée, régularisation reportée', async () => {
    const le15 = await chargerAbonnementsAJour(storage, '2026-09-15');
    const nom = (liste: Abonnement[], n: string) => liste.find((a) => nomDe(a) === n)!;
    expect(nom(le15, 'Spotify').statut).toEqual({ type: 'actif' });
    expect(nom(le15, 'Canal+').statut).toEqual({ type: 'archive' });
    expect(nom(le15, 'Netflix').prix).toBe(13.49);

    const le10 = await chargerAbonnementsAJour(storage, '2026-10-10');
    expect(nom(le10, 'Netflix').prix).toBe(14.99);
    expect(nom(le10, 'Netflix').prixFutur).toBeNull();
    expect(nom(le10, 'Netflix').historiquePrix.at(-1)).toEqual({ date: '2026-10-02', prix: 14.99 });
    expect(nom(le10, 'EDF').regularisation).toEqual({ date: '2027-10-09' });
    // persisté : relecture directe
    expect((await storage.abonnements.lire(nom(le10, 'Canal+').id))?.statut).toEqual({
      type: 'archive',
    });
    // plus aucune alerte pour l'archivé, et l'essai terminé laisse place au renouvellement
    const apres = calculerAlertes({
      abonnements: le10,
      moyensPaiement: [cb],
      defauts: ALERTES_DEFAUT,
      jour: '2026-10-15',
    });
    expect(apres.some((a) => nomDe(a) === 'Canal+')).toBe(false);
    expect(apres.find((a) => nomDe(a) === 'Disney+')).toMatchObject({
      type: 'echeance',
      date: '2026-10-17',
    });
  });
});
