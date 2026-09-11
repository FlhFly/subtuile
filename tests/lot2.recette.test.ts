/**
 * Recette du lot 2 (CdC §6) : « chaque tuile affiche son moyen de paiement ;
 * "Résilier" ouvre la bonne page selon le canal ». Rejoue le parcours réel
 * hors navigateur : moyens de paiement saisis via leur formulaire (§7.6),
 * abonnements créés depuis le catalogue (formules, canaux, modes hors ligne),
 * depuis un service proposé (EF-09) et en saisie libre, relecture depuis le
 * stockage, pastille de la tuile et action du bouton « Gérer / Résilier ».
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CATALOGUE_EMBARQUE } from '../src/data/refdata/RefDataProvider';
import { chargerAbonnementsAJour, enregistrerAbonnement } from '../src/data/services/abonnements';
import { creerDexieProvider, type DexieProvider } from '../src/data/storage/dexieProvider';
import { etatExpirationCarte } from '../src/domain/dates';
import {
  appliquerFormule,
  appStoreSeulement,
  canalParDefaut,
  comparaisonCanaux,
  fusionnerCatalogue,
  preRemplirDepuisService,
  suggestionsCatalogue,
} from '../src/domain/catalogue';
import {
  abonnementDepuisFormulaire,
  formulaireVide,
  validerFormulaire,
  type EtatFormulaire,
} from '../src/domain/formulaire';
import {
  formulaireMoyenPaiementVide,
  moyenPaiementDepuisFormulaire,
  usageParMoyen,
  validerMoyenPaiement,
} from '../src/domain/moyenPaiement';
import {
  actionResiliation,
  cleEtapes,
  DEEP_LINKS,
  lienTelephone,
  statutApresResiliation,
} from '../src/domain/resiliation';
import { creerServicePersonnalise } from '../src/domain/servicePersonnalise';
import { modeleTuile } from '../src/domain/tuile';
import type { Abonnement, MoyenPaiement, Service, ServicePersonnalise } from '../src/domain/types';

const JOUR = '2026-09-11';

let storage: DexieProvider;
let abos: Abonnement[];
let moyens: MoyenPaiement[];
let catalogue: Service[];
let salle: ServicePersonnalise;

/** Abonnement par identifiant de service du catalogue, ou par nom en saisie libre. */
const abo = (cle: string) => abos.find((a) => a.serviceId === cle || a.nom === cle)!;
const service = (id: string) => catalogue.find((s) => s.id === id)!;
const moyenDe = (a: Abonnement) => moyens.find((m) => m.id === a.moyenPaiementId);
const serviceDe = (a: Abonnement) => catalogue.find((s) => s.id === a.serviceId);
const tuile = (cle: string) => {
  const a = abo(cle);
  return modeleTuile(a, JOUR, moyenDe(a), serviceDe(a));
};
const action = (cle: string) => {
  const a = abo(cle);
  return actionResiliation(a, serviceDe(a));
};

beforeAll(async () => {
  storage = creerDexieProvider('subtuile-recette-lot2');

  // Trois moyens de paiement saisis via leur formulaire (§3.3, §7.6)
  const saisiesMoyens = [
    {
      ...formulaireMoyenPaiementVide('cb'),
      libelle: 'Visa perso',
      quatreDerniers: '4242',
      dateExpiration: '10/2026',
    },
    { ...formulaireMoyenPaiementVide('paypal'), libelle: 'PayPal' },
    { ...formulaireMoyenPaiementVide('sepa'), libelle: 'Prélèvement compte joint' },
  ];
  for (const f of saisiesMoyens) {
    expect(validerMoyenPaiement(f), f.libelle).toEqual({});
    await storage.moyensPaiement.enregistrer(moyenPaiementDepuisFormulaire(f));
  }
  moyens = await storage.moyensPaiement.lister();
  const cb = moyens.find((m) => m.type === 'cb')!;
  const paypal = moyens.find((m) => m.type === 'paypal')!;
  const sepa = moyens.find((m) => m.type === 'sepa')!;

  // Un service proposé (EF-09), fusionné au catalogue embarqué
  salle = await storage.servicesPersonnalises.enregistrer(
    creerServicePersonnalise({
      nom: 'Ma salle de sport',
      categorie: 'sport',
      urlGestion: 'masalle.fr/compte',
    }),
  );
  catalogue = fusionnerCatalogue(CATALOGUE_EMBARQUE, [salle]).data;

  /** Création depuis le catalogue (EF-02), formule choisie éventuelle. */
  const depuis = (id: string, extra: Partial<EtatFormulaire> = {}, formuleId?: string) => {
    const s = service(id);
    let f = preRemplirDepuisService(formulaireVide(JOUR), s);
    if (formuleId)
      f = appliquerFormule(
        f,
        s.formules.find((x) => x.id === formuleId)!,
      );
    return { ...f, dateDebut: '2026-08-15', ...extra };
  };
  const formulaires: EtatFormulaire[] = [
    // direct, lien de gestion du service, CB
    depuis('netflix', { moyenPaiementId: cb.id }),
    // formule App Store choisie alors qu'un tarif direct existe
    depuis('chatgpt', { moyenPaiementId: cb.id }, 'chatgpt_plus_app_store'),
    // service vendu uniquement sur l'App Store
    depuis('icloud', { moyenPaiementId: cb.id }),
    // direct, payé par PayPal
    depuis('spotify', { moyenPaiementId: paypal.id }),
    // vie courante : résiliation par téléphone, montant estimé, prélèvement
    depuis('edf', { moyenPaiementId: sepa.id, prix: '85' }),
    // vie courante : courrier recommandé
    depuis('maif', { moyenPaiementId: sepa.id, prix: '42,50' }),
    // espace client
    depuis('canal', { moyenPaiementId: cb.id }),
    // service proposé par l'utilisateur
    depuis(salle.id, { moyenPaiementId: sepa.id, prix: '29,90' }),
    // saisie libre, acheté sur Google Play, sans moyen de paiement
    {
      ...formulaireVide(JOUR),
      nom: 'Jeu mobile',
      prix: '4,99',
      categorie: 'autre',
      dateDebut: '2026-09-01',
      canalAchat: 'google_play',
    },
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

describe('recette lot 2 — moyens de paiement et désabonnement (CdC §6)', () => {
  it('les 9 abonnements sont enregistrés, liés à leur service et à leur moyen de paiement', () => {
    expect(abos).toHaveLength(9);
    expect(moyens).toHaveLength(3);
    expect(abo('netflix').nom).toBe(service('netflix').nom);
    expect(abo('chatgpt').formuleId).toBe('chatgpt_plus_app_store');
    expect(abo('chatgpt').prix).toBe(23);
    expect(abo('netflix').prochaineEcheance).toBe('2026-09-15');
    expect(abo('edf').montantEstime).toBe(true);
    expect(abo('Jeu mobile').serviceId).toBeNull();
  });

  it('chaque tuile affiche son moyen de paiement (EF-10, §3.3)', () => {
    const cb = moyens.find((m) => m.type === 'cb')!;
    const paypal = moyens.find((m) => m.type === 'paypal')!;
    const sepa = moyens.find((m) => m.type === 'sepa')!;
    expect(tuile('netflix').paiement).toEqual({ type: 'cb', couleur: cb.couleur });
    expect(tuile('spotify').paiement).toEqual({ type: 'paypal', couleur: paypal.couleur });
    expect(tuile('edf').paiement).toEqual({ type: 'sepa', couleur: sepa.couleur });
    expect(tuile(salle.id).paiement).toEqual({ type: 'sepa', couleur: sepa.couleur });
    expect(tuile('Jeu mobile').paiement).toBeNull();
    for (const a of abos) {
      const m = moyenDe(a);
      expect(modeleTuile(a, JOUR, m).paiement?.type ?? null).toBe(m?.type ?? null);
    }
    const usage = usageParMoyen(abos);
    expect(usage.get(cb.id)).toBe(4);
    expect(usage.get(paypal.id)).toBe(1);
    expect(usage.get(sepa.id)).toBe(3);
    expect(cb).toMatchObject({ quatreDerniers: '4242', dateExpiration: '2026-10' });
    // carte expirant le mois prochain : signalée dès le 1er du mois précédent (M-1)
    expect(etatExpirationCarte(cb.dateExpiration, JOUR)).toBe('bientot');
    expect(etatExpirationCarte(cb.dateExpiration, '2026-08-31')).toBe('ok');
    expect(etatExpirationCarte(cb.dateExpiration, '2026-11-01')).toBe('expiree');
  });

  it('badge du canal sur la tuile (EF-21) et pré-remplissage du canal depuis le catalogue', () => {
    expect(tuile('netflix').canal).toBe('direct');
    expect(tuile('chatgpt').canal).toBe('app_store');
    expect(tuile('icloud').canal).toBe('app_store');
    expect(tuile('Jeu mobile').canal).toBe('google_play');
    expect(appStoreSeulement(service('icloud'))).toBe(true);
    expect(canalParDefaut(service('icloud'))).toBe('app_store');
    expect(appStoreSeulement(service('chatgpt'))).toBe(false);
    const formuleStore = service('chatgpt').formules.find((f) => f.id === 'chatgpt_plus_app_store');
    expect(comparaisonCanaux(service('chatgpt'), formuleStore)).toMatchObject({
      direct: { id: 'chatgpt_plus_direct', prix: 20 },
      store: { id: 'chatgpt_plus_app_store', prix: 23 },
      ecart: 3,
    });
    expect(tuile('netflix').compteur).toMatchObject({
      type: 'echeance',
      jours: 4,
      date: '2026-09-15',
    });
  });

  it('« Résilier » ouvre la bonne page selon le canal (EF-20, EF-21, §5.3)', () => {
    expect(action('netflix')).toEqual({
      type: 'lien',
      url: 'https://www.netflix.com/cancelplan',
      source: 'service',
    });
    expect(action('spotify')).toEqual({
      type: 'lien',
      url: 'https://www.spotify.com/account/subscription',
      source: 'service',
    });
    // App Store : le store, jamais le site du service, deep link du service s'il existe
    expect(action('chatgpt')).toEqual({
      type: 'lien',
      url: service('chatgpt').deepLinks.app_store,
      source: 'app_store',
    });
    expect(service('chatgpt').deepLinks.app_store).toMatch(/^(itms-apps|https):\/\//);
    expect(action('icloud')).toEqual({
      type: 'lien',
      url: service('icloud').deepLinks.app_store,
      source: 'app_store',
    });
    // Google Play sans service : deep link générique du store
    expect(action('Jeu mobile')).toEqual({
      type: 'lien',
      url: DEEP_LINKS.google_play,
      source: 'google_play',
    });
    expect(cleEtapes(abo('netflix'))).toBe('direct');
    expect(cleEtapes(abo('chatgpt'))).toBe('app_store');
    expect(cleEtapes(abo('Jeu mobile'))).toBe('google_play');
  });

  it('démarches hors ligne : téléphone, courrier recommandé, espace client (EF-21b)', () => {
    expect(action('edf')).toEqual({
      type: 'telephone',
      contact: '09 69 32 15 15 (EDF particuliers)',
    });
    expect(lienTelephone('09 69 32 15 15 (EDF particuliers)')).toBe('tel:0969321515');
    expect(action('maif')).toEqual({
      type: 'courrier_recommande',
      contact: 'MAIF — 200 av. Salvador-Allende, 79038 Niort',
    });
    expect(action('canal')).toEqual({
      type: 'espace_client',
      url: 'https://espaceclient.canalplus.com',
      contact: 'https://espaceclient.canalplus.com',
    });
    expect(cleEtapes(abo('edf'))).toBe('telephone');
    expect(cleEtapes(abo('maif'))).toBe('courrier_recommande');
    expect(cleEtapes(abo('canal'))).toBe('espace_client');
  });

  it('après « Résilier » : proposition « résilié — actif jusqu’au » enregistrée (EF-22)', async () => {
    const netflix = abo('netflix');
    const statut = statutApresResiliation(netflix, JOUR);
    expect(statut).toEqual({ type: 'resilie_actif_jusquau', jusquau: '2026-09-15' });
    await enregistrerAbonnement(storage, { ...netflix, statut }, JOUR);
    const relu = (await chargerAbonnementsAJour(storage, JOUR)).find((a) => a.id === netflix.id)!;
    expect(relu.statut).toEqual(statut);
    // à l'usage : pas d'échéance, résilié dès aujourd'hui
    expect(statutApresResiliation({ prochaineEcheance: null }, JOUR).jusquau).toBe(JOUR);
  });

  it('service proposé : utilisable comme le catalogue, sa suppression n’altère pas l’abonnement (EF-09)', async () => {
    expect(suggestionsCatalogue(catalogue, 'ma salle').map((s) => s.id)).toContain(salle.id);
    expect(action(salle.id)).toEqual({
      type: 'lien',
      url: 'https://masalle.fr/compte',
      source: 'service',
    });
    expect(tuile(salle.id).initiales).toBe('MS');
    expect(tuile(salle.id).couleur).toBe(salle.couleur);

    await storage.servicesPersonnalises.supprimer(salle.id);
    const restants = await storage.servicesPersonnalises.lister();
    expect(fusionnerCatalogue(CATALOGUE_EMBARQUE, restants).data).toHaveLength(
      CATALOGUE_EMBARQUE.data.length,
    );
    const a = abo(salle.id);
    const sansService = modeleTuile(a, JOUR, moyenDe(a));
    expect(sansService.initiales).toBe('MS');
    expect(actionResiliation(a)).toEqual({
      type: 'lien',
      url: 'https://masalle.fr/compte',
      source: 'service',
    });
  });
});
