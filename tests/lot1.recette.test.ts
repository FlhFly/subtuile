/**
 * Recette du lot 1 (CdC §6) : « créer 5 abonnements variés, échéances justes,
 * tuiles conformes ». Rejoue le parcours réel hors navigateur : saisie via le
 * modèle du formulaire, enregistrement par le service, relecture depuis le
 * stockage, modèle de tuile et libellés fr / en.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chargerAbonnementsAJour, enregistrerAbonnement } from '../src/data/services/abonnements';
import { creerDexieProvider, type DexieProvider } from '../src/data/storage/dexieProvider';
import { anciennete, montantMensuel, prixEffectif } from '../src/domain/dates';
import { creerMoyenPaiement } from '../src/domain/fabriques';
import {
  abonnementDepuisFormulaire,
  formulaireDepuisAbonnement,
  formulaireVide,
  validerFormulaire,
  type EtatFormulaire,
} from '../src/domain/formulaire';
import { appliquerCriteres, CRITERES_DEFAUT } from '../src/domain/tri';
import { modeleTuile } from '../src/domain/tuile';
import type { Abonnement, Langue } from '../src/domain/types';
import {
  formaterDate,
  formaterMontant,
  libelleCompteur as compteurJX,
  libelleDuree,
  libellePeriodicite,
  traduire,
  traduireNombre,
} from '../src/i18n';
import type { I18n } from '../src/ui/contexts/I18nContext';
import { libelleCompteur } from '../src/ui/libelles';

const JOUR = '2026-09-10';

/** I18n sans React, pour vérifier les libellés rendus par les composants. */
function i18n(langue: Langue): I18n {
  return {
    langue,
    t: (cle, params) => traduire(langue, cle, params),
    tn: (cle, n, params) => traduireNombre(langue, cle, n, params),
    montant: (v, devise) => formaterMontant(langue, v, devise),
    date: (d, style) => formaterDate(langue, d, style),
    compteur: (jours) => compteurJX(langue, jours),
    periodicite: (p, plafond) => libellePeriodicite(langue, p, plafond),
    changerLangue: () => undefined,
  };
}

const saisie = (partiel: Partial<EtatFormulaire>): EtatFormulaire => ({
  ...formulaireVide(JOUR),
  ...partiel,
});

let storage: DexieProvider;
let abos: Abonnement[];
const par = (nom: string) => abos.find((a) => a.nom === nom)!;

beforeAll(async () => {
  storage = creerDexieProvider('subtuile-recette-lot1');
  const sepa = await storage.moyensPaiement.enregistrer(
    creerMoyenPaiement({ type: 'sepa', libelle: 'Prélèvement' }),
  );
  const cb = await storage.moyensPaiement.enregistrer(
    creerMoyenPaiement({ type: 'cb', libelle: 'CB' }),
  );

  const formulaires: EtatFormulaire[] = [
    // 1. mensuel ancré un 31, partagé, hausse annoncée
    saisie({
      nom: 'Netflix',
      prix: '13,49',
      categorie: 'streaming',
      dateDebut: '2026-01-31',
      partage: true,
      partagePart: '6,75',
      prixFutur: true,
      prixFuturDate: '2026-10-01',
      prixFuturMontant: '14,99',
      moyenPaiementId: cb.id,
      urlGestion: 'netflix.com/cancelplan',
      tags: 'foyer',
    }),
    // 2. annuel avec engagement, échéance dans 2 jours
    saisie({
      nom: 'Strava',
      prix: '79,99',
      categorie: 'sport',
      preset: 'annuelle',
      dateDebut: '2023-09-12',
      engagement: true,
      engagementMois: '12',
      engagementPreavis: '30',
      moyenPaiementId: cb.id,
    }),
    // 3. périodicité personnalisée de 28 jours, prélèvement SEPA
    saisie({
      nom: 'Lycamobile',
      prix: '9,99',
      categorie: 'vie_courante',
      preset: 'perso',
      persoIntervalle: '28',
      persoUnite: 'jour',
      dateDebut: '2026-08-20',
      moyenPaiementId: sepa.id,
    }),
    // 4. essai gratuit en cours, souscrit via l'App Store
    saisie({
      nom: 'Disney+',
      prix: '11,99',
      categorie: 'streaming',
      dateDebut: '2026-09-01',
      essai: true,
      essaiFin: '2026-09-14',
      essaiPrix: '11,99',
      canalAchat: 'app_store',
    }),
    // 5. à l'usage avec plafond indicatif
    saisie({
      nom: 'Claude API',
      prix: '',
      categorie: 'ia',
      typePeriodicite: 'a_l_usage',
      plafond: '15',
      dateDebut: '2025-11-10',
      tags: 'pro',
    }),
  ];

  for (const f of formulaires) {
    expect(validerFormulaire(f), f.nom).toEqual({});
    await enregistrerAbonnement(storage, abonnementDepuisFormulaire(f, { jour: JOUR }), JOUR);
  }
  abos = await chargerAbonnementsAJour(storage, JOUR);
});

afterAll(async () => {
  await storage.supprimerBase();
});

describe('recette lot 1 — 5 abonnements variés (CdC §6)', () => {
  it('les 5 abonnements sont enregistrés et relus depuis le stockage', () => {
    expect(abos).toHaveLength(5);
    for (const a of abos) {
      expect(a.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(a.updatedAt).toMatch(/^\d{4}-/);
      expect(a.deletedAt).toBeNull();
    }
  });

  it('échéances justes (EF-03) : mois court, annuel, 28 jours, fin d’essai, à l’usage', () => {
    expect(par('Netflix').prochaineEcheance).toBe('2026-09-30'); // ancré le 31 → 30/09
    expect(par('Strava').prochaineEcheance).toBe('2026-09-12');
    expect(par('Lycamobile').prochaineEcheance).toBe('2026-09-17'); // 20/08 + 28 j
    expect(par('Disney+').prochaineEcheance).toBe('2026-09-14'); // fin d'essai
    expect(par('Claude API').prochaineEcheance).toBeNull();
  });

  it('tuiles conformes (EF-10, EF-11) : compteur, couleur, pastille, badge canal, sous-titre', async () => {
    const moyens = await storage.moyensPaiement.lister();
    const modele = (nom: string) => {
      const a = par(nom);
      return modeleTuile(
        a,
        JOUR,
        moyens.find((m) => m.id === a.moyenPaiementId),
      );
    };

    expect(modele('Lycamobile').paiement?.type).toBe('sepa');
    expect(modele('Netflix').paiement?.type).toBe('cb');
    expect(modele('Disney+').paiement).toBeNull();

    expect(modele('Strava').compteur).toEqual({
      type: 'echeance',
      niveau: 'urg',
      jours: 2,
      date: '2026-09-12',
    });
    expect(modele('Disney+').compteur).toEqual({ type: 'essai', jours: 4, date: '2026-09-14' });
    expect(modele('Disney+').essai).toBe(true);
    expect(modele('Disney+').canal).toBe('app_store');
    expect(modele('Lycamobile').compteur).toEqual({
      type: 'echeance',
      niveau: 'warn',
      jours: 7,
      date: '2026-09-17',
    });
    expect(modele('Netflix').compteur).toEqual({
      type: 'echeance',
      niveau: 'ok',
      jours: 20,
      date: '2026-09-30',
    });
    expect(modele('Netflix').sousTitre).toMatchObject({ type: 'partage', partPayee: 6.75 });
    expect(modele('Netflix').partage).toBe(true);
    expect(modele('Claude API').compteur).toEqual({ type: 'a_l_usage' });
    expect(modele('Claude API').sousTitre).toEqual({ type: 'usage', plafond: 15 });
    for (const a of abos) expect(modeleTuile(a, JOUR).variante).toBe('coloree');
  });

  it('libellés fr / en des tuiles (EF-17b)', () => {
    const fr = i18n('fr');
    const en = i18n('en');
    const c = (nom: string) => modeleTuile(par(nom), JOUR).compteur;
    expect(libelleCompteur(fr, c('Strava'))).toBe('J-2 · 12/09/2026');
    expect(libelleCompteur(en, c('Strava'))).toBe('D-2 · 12/09/2026');
    expect(libelleCompteur(fr, c('Disney+'))).toBe('Essai · J-4');
    expect(libelleCompteur(en, c('Disney+'))).toBe('Trial · D-4');
    expect(libelleCompteur(fr, c('Lycamobile'))).toBe('J-7 · 17/09/2026');
    expect(libelleCompteur(fr, c('Claude API'))).toBe('À l’usage');
    expect(fr.periodicite(par('Lycamobile').periodicite)).toBe('tous les 28 jours');
    expect(en.periodicite(par('Lycamobile').periodicite)).toBe('every 28 days');
    // Intl insère une espace fine insécable avant le symbole
    expect(fr.montant(prixEffectif(par('Netflix')))).toMatch(/^6,75\s€$/);
  });

  it('ordre par échéance sur l’accueil (EF-12) et totaux normalisés (EF-40)', () => {
    const tries = appliquerCriteres(abos, CRITERES_DEFAUT, JOUR);
    expect(tries.map((a) => a.nom)).toEqual([
      'Strava',
      'Disney+',
      'Lycamobile',
      'Netflix',
      'Claude API',
    ]);
    const total = abos.reduce((s, a) => s + montantMensuel(prixEffectif(a), a.periodicite), 0);
    // 6,75 + 79,99/12 + 9,99 × 30,4375/28 + 11,99 + 0
    expect(total).toBeCloseTo(36.27, 1);
    expect(
      appliquerCriteres(abos, { ...CRITERES_DEFAUT, tag: 'pro' }, JOUR).map((a) => a.nom),
    ).toEqual(['Claude API']);
    expect(appliquerCriteres(abos, { ...CRITERES_DEFAUT, recherche: 'lyca' }, JOUR)).toHaveLength(
      1,
    );
  });

  it('fiche : ancienneté (EF-18), hausse annoncée, engagement', () => {
    expect(libelleDuree('fr', anciennete(par('Strava').dateDebut, JOUR))).toBe('2 ans et 11 mois');
    expect(libelleDuree('en', anciennete(par('Lycamobile').dateDebut, JOUR))).toBe('21 d');
    expect(par('Netflix').prixFutur).toEqual({ date: '2026-10-01', montant: 14.99 });
    expect(par('Strava').engagement).toEqual({ dureeMois: 12, preavisJours: 30 });
    expect(par('Netflix').historiquePrix).toEqual([{ date: '2026-01-31', prix: 13.49 }]);
  });

  it('modification via le formulaire : hausse versée dans l’historique (EF-08)', async () => {
    const netflix = par('Netflix');
    const f = { ...formulaireDepuisAbonnement(netflix, JOUR), prix: '15,49' };
    expect(validerFormulaire(f)).toEqual({});
    await enregistrerAbonnement(
      storage,
      abonnementDepuisFormulaire(f, { jour: JOUR }, netflix),
      JOUR,
    );
    const relu = (await chargerAbonnementsAJour(storage, JOUR)).find((a) => a.id === netflix.id)!;
    expect(relu.prix).toBe(15.49);
    expect(relu.partage).toEqual({ prixTotal: 15.49, partPayee: 6.75 });
    expect(relu.historiquePrix).toEqual([
      { date: '2026-01-31', prix: 13.49 },
      { date: JOUR, prix: 15.49 },
    ]);
  });
});
