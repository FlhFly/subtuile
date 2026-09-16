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
    version: '1.0.18',
    date: '2026-09-16',
    notes: {
      fr: [
        'Import CSV : quand le fichier n’est pas reconnu, choisissez vous-même le séparateur, le titre et la colonne de chaque information ; l’aperçu se met à jour.',
      ],
      en: [
        'CSV import: when the file is not recognised, pick the separator, the header and the column of each field yourself; the preview updates at once.',
      ],
    },
  },
  {
    version: '1.0.17',
    date: '2026-09-16',
    notes: {
      fr: [
        'Catalogue : vie courante revue (Uber One, Deliveroo, Fnac+, Ulys, Babbel, Duolingo, Headspace, Calm, Petit BamBou, énergie, MAIF). 79 services revus.',
      ],
      en: [
        'Catalog: everyday life reviewed (Uber One, Deliveroo, Fnac+, Ulys, Babbel, Duolingo, Headspace, Calm, Petit BamBou, energy, MAIF). All 79 services reviewed.',
      ],
    },
  },
  {
    version: '1.0.16',
    date: '2026-09-16',
    notes: {
      fr: [
        'Catalogue : jeux vidéo et sécurité revus (PlayStation Plus, Xbox Game Pass, Nintendo, GeForce NOW, Twitch, NordVPN, Proton, Surfshark, ExpressVPN).',
      ],
      en: [
        'Catalog: gaming and security reviewed (PlayStation Plus, Xbox Game Pass, Nintendo, GeForce NOW, Twitch, NordVPN, Proton, Surfshark, ExpressVPN).',
      ],
    },
  },
  {
    version: '1.0.15',
    date: '2026-09-16',
    notes: {
      fr: [
        'Catalogue : sport et presse revus (Basic-Fit, Zwift, komoot, AllTrails, Garmin, Apple Fitness+, Le Monde, Mediapart, Les Échos, Cafeyn) ; formules à jour.',
      ],
      en: [
        'Catalog: sport and press reviewed (Basic-Fit, Zwift, komoot, AllTrails, Garmin, Apple Fitness+, Le Monde, Mediapart, Les Échos, Cafeyn); plans updated.',
      ],
    },
  },
  {
    version: '1.0.14',
    date: '2026-09-16',
    notes: {
      fr: [
        'Service inconnu à l’ajout d’un abonnement : l’app propose de l’enregistrer dans « Mes services » et de l’envoyer à l’auteur. Réglable dans Réglages › Général.',
      ],
      en: [
        'Unknown service when adding a subscription: the app offers to save it in “My services” and to e-mail it to the author. Adjustable in Settings › General.',
      ],
    },
  },
  {
    version: '1.0.13',
    date: '2026-09-16',
    notes: {
      fr: [
        'Catalogue : quand un service que vous aviez ajouté vous-même rejoint le catalogue commun, l’app propose de basculer vos abonnements sur la version officielle.',
      ],
      en: [
        'Catalog: when a service you added yourself joins the shared catalog, the app offers to move your subscriptions to the official version.',
      ],
    },
  },
  {
    version: '1.0.12',
    date: '2026-09-15',
    notes: {
      fr: [
        'Dialogue « Un bug, une idée ? » : boutons à la même hauteur que ceux du formulaire et de la fiche.',
      ],
      en: ['“A bug, an idea?” dialog: buttons now match the height of the form and sheet buttons.'],
    },
  },
  {
    version: '1.0.11',
    date: '2026-09-14',
    notes: {
      fr: [
        'Catalogue : un service que vous proposez peut aussi être envoyé par e-mail à l’auteur, pour rejoindre le catalogue de tous.',
        'Le dialogue « Un bug, une idée ? » est réagencé : un bouton par ligne, plus de texte qui déborde.',
      ],
      en: [
        'Catalog: a service you suggest can also be e-mailed to the author, to join everyone’s catalog.',
        '“A bug, an idea?” dialog rearranged: one button per line, no more overflowing text.',
      ],
    },
  },
  {
    version: '1.0.10',
    date: '2026-09-14',
    notes: {
      fr: [
        'Catalogue : cloud et productivité revus (Google One, Microsoft 365, pCloud, kDrive, Adobe, Canva, Notion, 1Password, Bitwarden) ; formules à jour.',
      ],
      en: [
        'Catalog: cloud and productivity reviewed (Google One, Microsoft 365, pCloud, kDrive, Adobe, Canva, Notion, 1Password, Bitwarden); plans updated.',
      ],
    },
  },
  {
    version: '1.0.9',
    date: '2026-09-14',
    notes: {
      fr: [
        'Catalogue : services d’IA revus (ChatGPT, Gemini, Copilot, GitHub Copilot, Midjourney, Perplexity, Mistral) ; les tarifs en dollars sont affichés en dollars.',
      ],
      en: [
        'Catalog: AI services reviewed (ChatGPT, Gemini, Copilot, GitHub Copilot, Midjourney, Perplexity, Mistral); dollar prices are shown in dollars.',
      ],
    },
  },
  {
    version: '1.0.8',
    date: '2026-09-14',
    notes: {
      fr: [
        'Catalogue : services de musique revus (Apple Music, Amazon Music, Tidal, Audible) ; formules Famille et Étudiant ajoutées.',
      ],
      en: [
        'Catalog: music services reviewed (Apple Music, Amazon Music, Tidal, Audible); Family and Student plans added.',
      ],
    },
  },
  {
    version: '1.0.7',
    date: '2026-09-14',
    notes: {
      fr: [
        'Catalogue : services de streaming revus (HBO Max, Canal+, Paramount+, Crunchyroll, ADN, Molotov, DAZN, beIN, Apple TV+) ; formules et adresses à jour.',
      ],
      en: [
        'Catalog: streaming services reviewed (HBO Max, Canal+, Paramount+, Crunchyroll, ADN, Molotov, DAZN, beIN, Apple TV+); plans and addresses updated.',
      ],
    },
  },
  {
    version: '1.0.6',
    date: '2026-09-14',
    notes: {
      fr: [
        'Nouvelle adresse : subtuile.com. Si l’app venait de l’ancienne adresse, exportez vos données, désinstallez-la et réinstallez-la depuis subtuile.com.',
        'Réglages › À propos : « Signaler un bug ou proposer une idée » ouvre votre messagerie vers contact@subtuile.com, message pré-rempli.',
      ],
      en: [
        'New address: subtuile.com. If the app came from the old address, export your data, uninstall it and reinstall it from subtuile.com.',
        'Settings › About: “Report a bug or suggest an idea” opens your mail app to contact@subtuile.com with a prefilled message.',
      ],
    },
  },
  {
    version: '1.0.5',
    date: '2026-09-14',
    notes: {
      fr: [
        'Catalogue : tarifs des douze services les plus courants revus sur les pages officielles ; formules Famille, Étudiant et annuelles ajoutées.',
        'Adresse de l’espace client Canal+ corrigée.',
      ],
      en: [
        'Catalog: prices of the twelve most common services checked on official pages; Family, Student and yearly plans added.',
        'Canal+ customer area address fixed.',
      ],
    },
  },
  {
    version: '1.0.4',
    date: '2026-09-13',
    notes: {
      fr: [
        'Formulaire : formule saisie à la main (« Max », « Famille »…) ; « Autre » ignore les formules du catalogue. Claude Max ajouté au catalogue.',
        'Réglages : les délais d’alerte par défaut se choisissent dans une liste dépliée, à la même taille que le reste.',
        'Introduction : la langue se choisit dès le premier écran.',
      ],
      en: [
        'Form: a plan can be typed by hand (“Max”, “Family”…) and “Other” lets you skip the catalog plans; Claude Max added to the catalog.',
        'Settings: default alert lead times are picked from an expanded list, at the same size as the rest.',
        'Introduction: the language is chosen on the first screen.',
      ],
    },
  },
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
