import type { DateISO, Langue } from '../domain/types';

/**
 * Notes de version affichées dans l'app (Réglages › À propos › Nouveautés) :
 * ce qui change pour l'utilisateur, en français et en anglais, de la plus
 * récente à la plus ancienne. À compléter à chaque nouvelle version ; la
 * première entrée est toujours la version de package.json (vérifié par test).
 */
export interface NoteDeVersion {
  version: string;
  date: DateISO;
  notes: Record<Langue, readonly string[]>;
}

export const NOTES_DE_VERSION: readonly NoteDeVersion[] = [
  {
    version: '1.0.3',
    date: '2026-09-13',
    notes: {
      fr: [
        'Rappel de sauvegarde dans le centre d’alertes quand vos données n’ont pas été exportées depuis un mois ; date de la dernière sauvegarde dans les réglages.',
        'Mettre en pause peut fixer une date de reprise : l’abonnement redémarre tout seul ce jour-là.',
        'À la création, « Déjà suivi ? » prévient si un abonnement du même service ou du même nom existe.',
        'Quand une nouvelle version attend, « Mise à jour disponible » apparaît dans À propos.',
        'En réorganisant les tuiles, la page défile toute seule près des bords.',
      ],
      en: [
        'Backup reminder in the alerts centre when your data has not been exported for a month; last backup date in Settings.',
        'Pausing can set a resume date: the subscription restarts on its own that day.',
        'When creating, “Already tracked?” warns if a subscription with the same service or name exists.',
        'When a new version is waiting, “Update available” shows in About.',
        'While rearranging tiles, the page scrolls on its own near the edges.',
      ],
    },
  },
  {
    version: '1.0.2',
    date: '2026-09-13',
    notes: {
      fr: [
        'Sur iPhone et Android, l’icône calendrier des champs de date ouvre bien le sélecteur natif.',
        'Dans le formulaire, « Ajouter un moyen de paiement » crée une carte, un compte PayPal ou un prélèvement sans quitter la saisie ; il est sélectionné aussitôt.',
      ],
      en: [
        'On iPhone and Android, the calendar icon on date fields now opens the native picker.',
        'In the form, “Add a payment method” creates a card, PayPal account or direct debit without leaving the entry; it is selected right away.',
      ],
    },
  },
  {
    version: '1.0.1',
    date: '2026-09-13',
    notes: {
      fr: [
        'Nouvel écran « Nouveautés » dans Réglages › À propos : ce qui change à chaque version, et un rappel à l’ouverture après une mise à jour.',
        'Sur iPhone : la barre de navigation reste en bas de l’écran, les champs ne zooment plus, le formulaire est centré.',
        '« Soutenir le projet » dans À propos : un don libre, l’app reste gratuite, sans pub ni tracking.',
      ],
      en: [
        'New “What’s new” screen in Settings › About: what changes in each version, with a reminder when the app opens after an update.',
        'On iPhone: the navigation bar stays at the bottom, fields no longer zoom, the form is centred.',
        '“Support the project” in About: a free-will donation, the app stays free, no ads, no tracking.',
      ],
    },
  },
  {
    version: '1.0.0',
    date: '2026-09-13',
    notes: {
      fr: [
        'Première version publique : vos abonnements suivis sur votre appareil, sans compte ni serveur.',
        'Accueil en tuiles avec compteur de renouvellement ; tri, filtres, recherche, ordre personnalisé par glisser-déposer.',
        'Alertes : renouvellements, fins d’essai, préavis, cartes qui expirent, régularisations, hausses annoncées.',
        'Échéancier en liste ou en calendrier ; rappels à ajouter à votre agenda (.ics).',
        'Finances : totaux mensuel et annuel, répartitions, prévisionnel 12 mois, dépenses passées.',
        'Devises EUR, USD, GBP et CHF à taux indicatifs ; chaque abonnement garde sa devise.',
        'Catalogue de 79 services avec formules et tarifs indicatifs, « moins cher en direct », vos propres services.',
        'Sauvegarde et restauration JSON, import CSV depuis un tableur.',
        'Application installable et utilisable hors ligne ; introduction à la première ouverture.',
      ],
      en: [
        'First public release: your subscriptions tracked on your device, with no account and no server.',
        'Home in tiles with a renewal countdown; sort, filters, search, custom order by drag and drop.',
        'Alerts: renewals, trial ends, notice periods, expiring cards, adjustments, announced price rises.',
        'Schedule as a list or a calendar; reminders to add to your own calendar (.ics).',
        'Finances: monthly and yearly totals, breakdowns, 12-month forecast, past spending.',
        'Currencies EUR, USD, GBP and CHF at indicative rates; each subscription keeps its own currency.',
        'Catalog of 79 services with plans and indicative prices, “cheaper direct”, your own services.',
        'JSON backup and restore, CSV import from a spreadsheet.',
        'Installable app that works offline; introduction on first launch.',
      ],
    },
  },
];

/** Vrai tant que l'utilisateur n'a pas consulté les nouveautés de la version installée. */
export function nouveautesNonVues(versionVue: string | null, versionApp: string): boolean {
  return versionVue !== versionApp;
}
