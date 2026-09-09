/**
 * Jeu de démonstration repris de la maquette v6 (13 abonnements, 4 moyens de
 * paiement), utilisé pour tester chaque lot (CdC §5.5).
 *
 * La maquette est figée au 16/08/2026 ; toutes les dates sont décalées du même
 * nombre de jours que « aujourd'hui », afin que les compteurs J-X (Strava J-2,
 * essai Disney+ J-5, préavis Basic-Fit J-10…) restent ceux de la maquette quel
 * que soit le jour où la démo est chargée. Les ids sont stables : recharger la
 * démo remplace les entités au lieu de les dupliquer.
 */

import { aujourdhui as dateDuJour, decalerJours, joursEntre } from '../../domain/dates';
import { creerAbonnement, creerMoyenPaiement } from '../../domain/fabriques';
import {
  PERIODICITES,
  type Abonnement,
  type DateISO,
  type MoyenPaiement,
} from '../../domain/types';
import type { StorageProvider } from '../storage/StorageProvider';

export const DATE_REFERENCE_DEMO: DateISO = '2026-08-16';

export const IDS_DEMO = {
  moyensPaiement: {
    cb: 'demo-mp-cb',
    paypal: 'demo-mp-paypal',
    appStore: 'demo-mp-app-store',
    sepa: 'demo-mp-sepa',
  },
  abonnements: {
    strava: 'demo-strava',
    netflix: 'demo-netflix',
    prime: 'demo-prime',
    claude: 'demo-claude-pro',
    chatgpt: 'demo-chatgpt-plus',
    disney: 'demo-disney',
    basicFit: 'demo-basic-fit',
    canal: 'demo-canal',
    spotify: 'demo-spotify',
    dropbox: 'demo-dropbox',
    lycamobile: 'demo-lycamobile',
    claudeApi: 'demo-claude-api',
    edf: 'demo-edf',
  },
} as const;

export interface JeuDemo {
  abonnements: Abonnement[];
  moyensPaiement: MoyenPaiement[];
}

export function jeuDemo(aujourdhui: DateISO = DATE_REFERENCE_DEMO): JeuDemo {
  const decalage = joursEntre(DATE_REFERENCE_DEMO, aujourdhui);
  const d = (iso: DateISO): DateISO => decalerJours(iso, decalage);
  const ctx = { jour: aujourdhui };
  const mp = IDS_DEMO.moyensPaiement;
  const ids = IDS_DEMO.abonnements;

  const moyensPaiement: MoyenPaiement[] = [
    creerMoyenPaiement(
      {
        id: mp.cb,
        type: 'cb',
        libelle: 'CB perso',
        quatreDerniers: '4412',
        // expire le mois prochain → alerte « carte expirée » (lot 3)
        dateExpiration: d('2026-09-01').slice(0, 7),
      },
      ctx,
    ),
    creerMoyenPaiement({ id: mp.paypal, type: 'paypal', libelle: 'PayPal perso' }, ctx),
    creerMoyenPaiement(
      { id: mp.appStore, type: 'apple_pay', libelle: 'Compte App Store (Apple Pay)' },
      ctx,
    ),
    creerMoyenPaiement({ id: mp.sepa, type: 'sepa', libelle: 'Prélèvement — compte courant' }, ctx),
  ];

  const abonnements: Abonnement[] = [
    creerAbonnement(
      {
        id: ids.strava,
        serviceId: 'strava',
        formuleId: 'strava_annuel',
        nom: 'Strava',
        categorie: 'sport',
        periodicite: PERIODICITES.annuelle,
        prix: 79.99,
        dateDebut: d('2023-08-18'),
        moyenPaiementId: mp.cb,
        urlGestion: 'https://www.strava.com/account',
        historiquePrix: [
          { date: d('2023-08-18'), prix: 59.99 },
          { date: d('2025-08-18'), prix: 79.99 },
        ],
        tags: ['perso'],
        notes: 'Renouvellement automatique — vérifier l’offre annuelle avant l’échéance.',
      },
      ctx,
    ),
    creerAbonnement(
      {
        id: ids.netflix,
        serviceId: 'netflix',
        formuleId: 'netflix_standard',
        nom: 'Netflix',
        categorie: 'streaming',
        periodicite: PERIODICITES.mensuelle,
        prix: 13.49,
        dateDebut: d('2021-03-06'),
        partage: { prixTotal: 13.49, partPayee: 6.75 },
        prixFutur: { date: d('2026-10-06'), montant: 14.99 },
        moyenPaiementId: mp.cb,
        urlGestion: 'https://www.netflix.com/cancelplan',
        historiquePrix: [
          { date: d('2021-03-06'), prix: 11.99 },
          { date: d('2024-10-06'), prix: 13.49 },
        ],
        tags: ['foyer'],
        notes: 'Partagé avec Léa — elle paie l’autre moitié. Hausse annoncée par mail.',
      },
      ctx,
    ),
    creerAbonnement(
      {
        id: ids.prime,
        serviceId: 'prime',
        formuleId: 'prime_annuel',
        nom: 'Amazon Prime',
        categorie: 'streaming',
        periodicite: PERIODICITES.annuelle,
        prix: 69.9,
        dateDebut: d('2019-09-30'),
        moyenPaiementId: mp.paypal,
        urlGestion: 'https://www.amazon.fr/mc',
        historiquePrix: [
          { date: d('2019-09-30'), prix: 49 },
          { date: d('2023-09-30'), prix: 69.9 },
        ],
        tags: ['foyer'],
      },
      ctx,
    ),
    creerAbonnement(
      {
        id: ids.claude,
        serviceId: 'claude',
        formuleId: 'claude_pro_mensuel',
        nom: 'Claude Pro',
        categorie: 'ia',
        periodicite: PERIODICITES.mensuelle,
        prix: 21.6,
        dateDebut: d('2025-01-28'),
        moyenPaiementId: mp.cb,
        urlGestion: 'https://claude.ai/settings/billing',
      },
      ctx,
    ),
    creerAbonnement(
      {
        id: ids.chatgpt,
        serviceId: 'chatgpt',
        formuleId: 'chatgpt_plus_app_store',
        nom: 'ChatGPT Plus',
        categorie: 'ia',
        periodicite: PERIODICITES.mensuelle,
        prix: 23,
        dateDebut: d('2024-05-24'),
        moyenPaiementId: mp.appStore,
        canalAchat: 'app_store',
        tags: ['pro'],
        notes: 'Souscrit via l’App Store (23 €) — 20 € en direct.',
      },
      ctx,
    ),
    creerAbonnement(
      {
        id: ids.disney,
        serviceId: 'disney',
        formuleId: 'disney_standard',
        nom: 'Disney+',
        categorie: 'streaming',
        periodicite: PERIODICITES.mensuelle,
        prix: 11.99,
        dateDebut: d('2026-08-07'),
        essai: { dateFin: d('2026-08-21'), prixApres: 11.99 },
        moyenPaiementId: mp.cb,
        urlGestion: 'https://www.disneyplus.com/account',
        notes: 'Essai 14 jours — décider avant la fin.',
      },
      ctx,
    ),
    creerAbonnement(
      {
        id: ids.basicFit,
        nom: 'Basic-Fit',
        categorie: 'sport',
        periodicite: PERIODICITES.mensuelle,
        prix: 24.99,
        dateDebut: d('2025-09-25'),
        engagement: { dureeMois: 12, preavisJours: 30 },
        moyenPaiementId: mp.sepa,
        couleur: '#e07800',
        logo: { type: 'initiales', valeur: 'BF' },
        urlGestion: 'https://my.basic-fit.com',
        notes: 'Saisie libre (hors catalogue). Engagement 12 mois, préavis 30 jours.',
      },
      ctx,
    ),
    creerAbonnement(
      {
        id: ids.canal,
        serviceId: 'canal',
        formuleId: 'canal_essentiel',
        nom: 'Canal+',
        categorie: 'streaming',
        periodicite: PERIODICITES.mensuelle,
        prix: 22.99,
        dateDebut: d('2024-09-30'),
        engagement: { dureeMois: 24, preavisJours: 30 },
        moyenPaiementId: mp.sepa,
        statut: { type: 'resilie_actif_jusquau', jusquau: d('2026-09-30') },
        modeResiliation: 'espace_client',
        contactResiliation: 'https://espaceclient.canalplus.com',
        urlGestion: 'https://espaceclient.canalplus.com',
        historiquePrix: [
          { date: d('2024-09-30'), prix: 19.99 },
          { date: d('2025-09-30'), prix: 22.99 },
        ],
        notes: 'Résilié — reste actif jusqu’à la fin de la période.',
      },
      ctx,
    ),
    creerAbonnement(
      {
        id: ids.spotify,
        serviceId: 'spotify',
        formuleId: 'spotify_premium',
        nom: 'Spotify',
        categorie: 'musique',
        periodicite: PERIODICITES.mensuelle,
        prix: 11.12,
        dateDebut: d('2020-01-15'),
        moyenPaiementId: mp.cb,
        statut: { type: 'en_pause', repriseLe: null },
        urlGestion: 'https://www.spotify.com/account/subscription',
        historiquePrix: [
          { date: d('2020-01-15'), prix: 9.99 },
          { date: d('2023-06-15'), prix: 11.12 },
        ],
        tags: ['perso'],
        notes: 'Mis en pause pendant l’été.',
      },
      ctx,
    ),
    creerAbonnement(
      {
        id: ids.dropbox,
        serviceId: 'dropbox',
        formuleId: 'dropbox_plus_annuel',
        nom: 'Dropbox Plus',
        categorie: 'cloud',
        periodicite: PERIODICITES.annuelle,
        prix: 119.88,
        dateDebut: d('2019-04-02'),
        moyenPaiementId: mp.paypal,
        statut: { type: 'archive' },
        urlGestion: 'https://www.dropbox.com/account/plan',
        historiquePrix: [
          { date: d('2019-04-02'), prix: 99 },
          { date: d('2022-04-02'), prix: 119.88 },
        ],
        notes: 'Résilié — remplacé par iCloud+.',
      },
      ctx,
    ),
    creerAbonnement(
      {
        id: ids.lycamobile,
        nom: 'Lycamobile',
        categorie: 'vie_courante',
        periodicite: PERIODICITES.vingtHuitJours,
        prix: 9.99,
        dateDebut: d('2026-08-05'),
        moyenPaiementId: mp.sepa,
        couleur: '#0aa5c2',
        logo: { type: 'initiales', valeur: 'Ly' },
        urlGestion: 'https://www.lycamobile.fr',
        notes:
          'Forfait mobile facturé tous les 28 jours — 13 prélèvements par an, d’où la périodicité personnalisée.',
      },
      ctx,
    ),
    creerAbonnement(
      {
        id: ids.claudeApi,
        nom: 'Claude API',
        categorie: 'ia',
        periodicite: { type: 'a_l_usage', plafond: 15 },
        prix: 0,
        dateDebut: d('2025-11-10'),
        moyenPaiementId: mp.cb,
        couleur: '#d97757',
        logo: { type: 'initiales', valeur: 'CA' },
        urlGestion: 'https://console.anthropic.com/settings/billing',
        tags: ['pro', 'remboursable'],
        notes:
          'Crédits API facturés à la consommation. Le plafond indicatif sert de repère budget, sans échéance fixe.',
      },
      ctx,
    ),
    creerAbonnement(
      {
        id: ids.edf,
        serviceId: 'edf',
        nom: 'EDF Élec',
        categorie: 'vie_courante',
        periodicite: PERIODICITES.mensuelle,
        prix: 64,
        montantEstime: true,
        regularisation: { date: d('2026-09-12') },
        dateDebut: d('2024-03-01'),
        moyenPaiementId: mp.sepa,
        modeResiliation: 'telephone',
        contactResiliation: '09 69 32 15 15 (EDF particuliers)',
        referenceClient: '014 522 887',
        urlGestion: 'https://particulier.edf.fr/fr/accueil/espace-client.html',
        historiquePrix: [
          { date: d('2024-03-01'), prix: 58 },
          { date: d('2025-08-01'), prix: 64 },
        ],
        tags: ['maison'],
        notes: 'Mensualités lissées — relevé réel à la régularisation.',
      },
      ctx,
    ),
  ];

  return { abonnements, moyensPaiement };
}

/**
 * Charge (ou recharge) le jeu de démo dans le stockage, décalé au jour
 * courant par défaut (sinon les compteurs de la maquette seraient déjà
 * passés) ; idempotent grâce aux ids stables.
 */
export async function chargerJeuDemo(
  storage: StorageProvider,
  aujourdhui: DateISO = dateDuJour(),
): Promise<JeuDemo> {
  const jeu = jeuDemo(aujourdhui);
  await storage.moyensPaiement.enregistrerPlusieurs(jeu.moyensPaiement);
  await storage.abonnements.enregistrerPlusieurs(jeu.abonnements);
  return jeu;
}
