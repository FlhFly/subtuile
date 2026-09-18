/**
 * Page Confidentialité et mentions légales (§7, revue RGPD du 2026-09-16) :
 * ce que l'app enregistre et où, ce qui ne quitte jamais l'appareil, les
 * exports, les e-mails de contact, l'hébergement, les droits et l'éditeur.
 * Miroir : PRIVACY.md à la racine du dépôt — les deux évoluent ensemble.
 */

import type { Langue } from '../domain/types';
import { ADRESSE_CONTACT } from './contact';

/** Date de la dernière révision du texte (ISO). */
export const CONFIDENTIALITE_MAJ = '2026-09-18';
export const URL_DEPOT = 'https://github.com/FlhFly/subtuile';
export const URL_POLITIQUE_GITHUB =
  'https://docs.github.com/site-policy/privacy-policies/github-privacy-statement';
export const HEBERGEUR =
  'GitHub, Inc. (GitHub Pages), 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107';

export interface LienConfidentialite {
  libelle: string;
  url: string;
}

export interface SectionConfidentialite {
  titre: string;
  paragraphes: string[];
  liens?: LienConfidentialite[];
}

const FR: SectionConfidentialite[] = [
  {
    titre: 'En bref',
    paragraphes: [
      'Subtuile fonctionne entièrement sur votre appareil, hors ligne, sans compte ni serveur. L’app n’envoie aucune donnée : pas de traceur, pas de publicité, pas de police ni de script chargés depuis l’extérieur.',
    ],
  },
  {
    titre: 'Ce que l’app enregistre sur votre appareil',
    paragraphes: [
      'Vos abonnements : nom, prix, périodicité, dates, catégorie, statut, canal d’achat, adresse de gestion, référence client, notes et historique des prix.',
      'Vos moyens de paiement : un libellé, le type et, pour une carte, les 4 derniers chiffres et le mois d’expiration. Jamais le numéro complet ni le cryptogramme : l’app refuse un numéro complet et masque celui qu’un fichier importé contiendrait.',
      'Les services que vous proposez au catalogue, vos préférences (langue, thème, devise, format de date, alertes) et la liste des alertes déjà lues.',
      'Tout cela vit dans le stockage du navigateur (IndexedDB et localStorage), sur cet appareil seulement : chaque navigateur ou appareil a ses propres données.',
    ],
  },
  {
    titre: 'Effacement',
    paragraphes: [
      '« Effacer toutes les données » (Réglages › Données) supprime définitivement abonnements, moyens de paiement et services proposés.',
      'Un élément supprimé un par un reste 30 jours dans la base locale, le temps d’un retour en arrière, puis est détruit à l’ouverture de l’app.',
      'Supprimer les données du site dans le navigateur, ou désinstaller l’app, efface tout, réglages compris.',
    ],
  },
  {
    titre: 'Vos exports',
    paragraphes: [
      'Les fichiers JSON, CSV et .ics sont créés sur votre appareil, en clair, uniquement quand vous le demandez. Ils contiennent vos données : gardez-les en lieu sûr et ne les partagez pas.',
      'Un import lit le fichier sur l’appareil ; rien n’est envoyé.',
    ],
  },
  {
    titre: 'Quand vous nous écrivez',
    paragraphes: [
      '« Signaler un bug ou proposer une idée » et « Proposer un service » ouvrent votre messagerie avec un message pré-rempli : version de l’app, type d’appareil et, quand le navigateur la donne, version du système et du navigateur (par exemple « iPhone · iOS 17.5 · Safari 17.5 »), langue, plus le nom et l’adresse du service proposé. Vous voyez tout avant d’envoyer.',
      `L’auteur reçoit alors votre adresse e-mail et votre message. Ils servent uniquement à vous répondre et à améliorer l’app, ne sont transmis à personne et sont supprimés au plus tard douze mois après la réponse. Écrivez à ${ADRESSE_CONTACT} pour les consulter ou les faire supprimer avant.`,
    ],
  },
  {
    titre: 'Hébergement du site',
    paragraphes: [
      `L’app est servie sur subtuile.com par GitHub Pages (${HEBERGEUR}, États-Unis). Comme tout hébergeur, GitHub peut consigner des journaux techniques lors du chargement des pages (adresse IP, date, fichier demandé) ; l’auteur n’y a pas accès et l’app n’en tient aucun.`,
      'Une fois installée, l’app ne contacte le site que pour vérifier si une mise à jour existe.',
    ],
    liens: [{ libelle: 'Politique de confidentialité de GitHub', url: URL_POLITIQUE_GITHUB }],
  },
  {
    titre: 'Vos droits',
    paragraphes: [
      'Vos données restent chez vous : vous les consultez, corrigez, exportez et effacez directement dans l’app, sans demande à formuler.',
      `Pour les e-mails que vous nous avez envoyés, les droits d’accès, de rectification et d’effacement s’exercent à ${ADRESSE_CONTACT}.`,
    ],
  },
  {
    titre: 'Mentions légales',
    paragraphes: [
      `Éditeur : FlhFly, particulier, à titre non professionnel. Contact : ${ADRESSE_CONTACT}.`,
      `Hébergeur : ${HEBERGEUR}, États-Unis.`,
      'Code source publié sous licence AGPL-3.0 ; le nom et le logo Subtuile restent réservés. Les marques citées dans le catalogue appartiennent à leurs propriétaires.',
    ],
    liens: [{ libelle: 'Dépôt public du projet', url: URL_DEPOT }],
  },
];

const EN: SectionConfidentialite[] = [
  {
    titre: 'In short',
    paragraphes: [
      'Subtuile runs entirely on your device, offline, with no account and no server. The app sends no data: no tracker, no advertising, no font or script loaded from outside.',
    ],
  },
  {
    titre: 'What the app stores on your device',
    paragraphes: [
      'Your subscriptions: name, price, cycle, dates, category, status, purchase channel, management address, customer reference, notes and price history.',
      'Your payment methods: a label, the type and, for a card, the last 4 digits and the expiry month. Never the full number or the security code: the app rejects a full number and masks any found in an imported file.',
      'The services you suggest for the catalog, your preferences (language, theme, currency, date format, alerts) and the list of alerts already read.',
      'All of this lives in the browser storage (IndexedDB and localStorage) on this device only: each browser or device has its own data.',
    ],
  },
  {
    titre: 'Erasing',
    paragraphes: [
      '“Erase all data” (Settings › Data) permanently deletes subscriptions, payment methods and suggested services.',
      'An item deleted one at a time stays 30 days in the local database, in case you change your mind, then is destroyed when the app opens.',
      'Clearing the site data in the browser, or uninstalling the app, erases everything, settings included.',
    ],
  },
  {
    titre: 'Your exports',
    paragraphes: [
      'JSON, CSV and .ics files are created on your device, unencrypted, only when you ask for them. They contain your data: keep them somewhere safe and do not share them.',
      'An import reads the file on the device; nothing is sent.',
    ],
  },
  {
    titre: 'When you write to us',
    paragraphes: [
      '“Report a bug or suggest an idea” and “Suggest a service” open your mail app with a pre-filled message: app version, device type and, when the browser provides them, system and browser versions (for example “iPhone · iOS 17.5 · Safari 17.5”), language, plus the name and address of the suggested service. You see everything before sending.',
      `The author then receives your e-mail address and your message. They are used only to reply and improve the app, are passed on to no one, and are deleted at the latest twelve months after the reply. Write to ${ADRESSE_CONTACT} to read or delete them earlier.`,
    ],
  },
  {
    titre: 'Site hosting',
    paragraphes: [
      `The app is served on subtuile.com by GitHub Pages (${HEBERGEUR}, USA). Like any host, GitHub may keep technical logs when pages load (IP address, date, requested file); the author has no access to them and the app keeps none.`,
      'Once installed, the app only contacts the site to check whether an update exists.',
    ],
    liens: [{ libelle: 'GitHub privacy statement', url: URL_POLITIQUE_GITHUB }],
  },
  {
    titre: 'Your rights',
    paragraphes: [
      'Your data stays with you: you read, correct, export and erase it directly in the app, with no request to make.',
      `For the e-mails you sent us, the rights of access, rectification and erasure are exercised at ${ADRESSE_CONTACT}.`,
    ],
  },
  {
    titre: 'Legal notice',
    paragraphes: [
      `Publisher: FlhFly, a private individual, on a non-professional basis. Contact: ${ADRESSE_CONTACT}.`,
      `Host: ${HEBERGEUR}, USA.`,
      'Source code published under the AGPL-3.0 licence; the Subtuile name and logo remain reserved. Brands named in the catalog belong to their owners.',
    ],
    liens: [{ libelle: 'Public repository of the project', url: URL_DEPOT }],
  },
];

export function sectionsConfidentialite(langue: Langue): SectionConfidentialite[] {
  return langue === 'fr' ? FR : EN;
}
