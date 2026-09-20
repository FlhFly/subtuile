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
    version: '1.1.0',
    date: '2026-09-18',
    notes: {
      fr: [
        'Finances › Budget mensuel : fixez un plafond global ; jauge, marge restante ou dépassement, et alerte dans le centre d’alertes quand le plafond est dépassé.',
        'Finances › Objectif d’économie : « passer sous X / mois d’ici le … » ; la carte suit votre progression et annonce l’objectif atteint.',
        'Finances › Évolution 24 mois du total mensuel au prix de l’époque, et Rapport 12 mois : dépensé, moyenne, hausses subies, abonnements ajoutés et arrêtés.',
        'Fiche › Derniers paiements : chaque prélèvement passé au tarif de l’époque, et le total dépensé depuis le début de l’abonnement.',
        'Finances › Foyer & partage : vos abonnements partagés, votre part face au prix plein, total du foyer et montant pris en charge par les autres.',
        'Fiche › Usage & coût réel : déclarez vos utilisations par semaine pour voir le coût par utilisation, ou ce qu’un abonnement inutilisé vous coûte.',
        'Finances › Économies possibles (passer en annuel, moins cher en direct) et Doublons potentiels par catégorie, avec le moins utilisé à résilier.',
      ],
      en: [
        'Finances › Monthly budget: set an overall cap; gauge, remaining margin or overrun, and an alert in the alert centre when the cap is exceeded.',
        'Finances › Savings goal: “get under X / month by …”; the card tracks your progress and announces when the goal is reached.',
        'Finances › 24-month trend of the monthly total at the prices of the time, and 12-month report: spent, average, price increases, added and stopped.',
        'Details › Latest payments: every past charge at the price of the time, and the total spent since the subscription started.',
        'Finances › Household & sharing: your shared subscriptions, your share versus the full price, household total and amount covered by others.',
        'Details › Usage & real cost: declare your uses per week to see the cost per use, or what an unused subscription costs you.',
        'Finances › Possible savings (switch to yearly, cheaper direct) and possible duplicates by category, with the least used one to cancel.',
      ],
    },
  },
  {
    version: '1.0.28',
    date: '2026-09-18',
    notes: {
      fr: [
        'Mode discret : un appui sur le total de l’accueil masque tous les montants de l’app (« **** € ») ; un second appui les rétablit. Réglable aussi dans Apparence.',
      ],
      en: [
        'Discreet mode: tapping the home total hides every amount in the app (“**** €”); tapping again shows them. Also available in Appearance settings.',
      ],
    },
  },
  {
    version: '1.0.27',
    date: '2026-09-18',
    notes: {
      fr: [
        'Apparence : nouveau thème OLED, à noirs purs, à côté de Clair, Sombre et Système ; la barre d’état de l’app installée suit le thème choisi.',
      ],
      en: [
        'Appearance: new OLED theme with pure blacks, next to Light, Dark and System; the status bar of the installed app follows the chosen theme.',
      ],
    },
  },
  {
    version: '1.0.26',
    date: '2026-09-18',
    notes: {
      fr: [
        'Signaler un bug : le message pré-rempli indique aussi la version du système et du navigateur (ex. « iPhone · iOS 17.5 · Safari 17.5 ») pour cibler le problème.',
      ],
      en: [
        'Report a bug: the pre-filled message now also states the system and browser versions (e.g. “iPhone · iOS 17.5 · Safari 17.5”) to pinpoint the issue.',
      ],
    },
  },
  {
    version: '1.0.25',
    date: '2026-09-17',
    notes: {
      fr: [
        'Chargement plus rapide et mises à jour plus légères : l’app est découpée en morceaux (bibliothèques, catalogue, écrans) mis en cache séparément.',
        'Une mise à jour ne retélécharge plus que ce qui a changé ; tout reste disponible hors ligne.',
      ],
      en: [
        'Faster loading and lighter updates: the app is split into pieces (libraries, catalog, screens) cached separately.',
        'An update only downloads what changed; everything stays available offline.',
      ],
    },
  },
  {
    version: '1.0.24',
    date: '2026-09-17',
    notes: {
      fr: [
        'Rappel à une date : dans les options avancées d’un abonnement, notez une date et un mot (« renégocier la box ») ; l’app vous le rappelle ce jour-là.',
        'Le rappel apparaît sur la fiche et dans le centre d’alertes pendant 30 jours à partir de sa date, même pour un abonnement résilié.',
      ],
      en: [
        'Reminder on a date: in the advanced options of a subscription, set a date and a note (“renegotiate the box”); the app reminds you that day.',
        'The reminder shows on the details page and in the alert centre for 30 days from its date, even for a cancelled subscription.',
      ],
    },
  },
  {
    version: '1.0.23',
    date: '2026-09-17',
    notes: {
      fr: [
        'Alertes : ouvrir une alerte la passe en lue ; « Tout marquer comme lu » reste disponible pour le reste.',
      ],
      en: [
        'Alerts: opening an alert marks it as read; “Mark all as read” remains available for the rest.',
      ],
    },
  },
  {
    version: '1.0.22',
    date: '2026-09-17',
    notes: {
      fr: [
        'Réglages › Données › Confidentialité ouvre une page dédiée : données enregistrées, effacement, exports, e-mails de contact, hébergement, droits.',
        'Mentions légales ajoutées (éditeur, hébergeur GitHub Pages, licence) ; le même texte est publié dans le dépôt (PRIVACY.md).',
      ],
      en: [
        'Settings › Data › Privacy opens a dedicated page: stored data, erasing, exports, contact e-mails, hosting, your rights.',
        'Legal notice added (publisher, GitHub Pages host, licence); the same text is published in the repository (PRIVACY.md).',
      ],
    },
  },
  {
    version: '1.0.21',
    date: '2026-09-17',
    notes: {
      fr: [
        'Moyens de paiement : le tiret de la date d’expiration s’ajoute tout seul après l’année (2027 puis 09 donne 2027-09), même au clavier numérique.',
        'Nouveautés : chaque version détaille désormais ses changements en plusieurs points ; les versions récentes ont été complétées.',
      ],
      en: [
        'Payment methods: the dash in the expiry date is added automatically after the year (2027 then 09 gives 2027-09), even on the numeric keypad.',
        'What’s new: each version now lists its changes in several points; recent versions have been completed.',
      ],
    },
  },
  {
    version: '1.0.20',
    date: '2026-09-17',
    notes: {
      fr: [
        'Moyen de paiement : un numéro de carte complet est refusé dans le libellé ; seuls les 4 derniers chiffres sont prévus.',
        'Abonnement : une mise en garde s’affiche si les notes ou la référence client ressemblent à un numéro de carte.',
        'Import JSON : les moyens de paiement importés ne gardent que les 4 derniers chiffres ; un numéro complet est masqué.',
        'Les éléments supprimés depuis plus de 30 jours sont définitivement effacés à l’ouverture de l’app.',
      ],
      en: [
        'Payment method: a full card number is rejected in the label; only the last 4 digits are expected.',
        'Subscription: a warning appears when the notes or the customer reference look like a card number.',
        'JSON import: imported payment methods keep only the last 4 digits; a full number is masked.',
        'Items deleted more than 30 days ago are permanently erased when the app opens.',
      ],
    },
  },
  {
    version: '1.0.19',
    date: '2026-09-16',
    notes: {
      fr: [
        'Réglages › Données : « Exporter (CSV) » télécharge un tableau, une ligne par abonnement, lisible dans Excel ou Numbers.',
        'Colonnes : nom, prix, devise, périodicité, échéance, catégorie, statut, service, canal, moyen de paiement, date de début, notes.',
        'Le fichier exporté se réimporte tel quel ; l’import comprend aussi « 2 ans », « 10 jours », « à vie » ou « usage ».',
      ],
      en: [
        'Settings › Data: “Export (CSV)” downloads a table, one row per subscription, readable in Excel or Numbers.',
        'Columns: name, price, currency, cycle, due date, category, status, service, channel, payment method, start date, notes.',
        'The exported file imports back as is; the import also understands “2 years”, “10 days”, “lifetime” or “usage”.',
      ],
    },
  },
  {
    version: '1.0.18',
    date: '2026-09-16',
    notes: {
      fr: [
        'Import CSV : quand le fichier n’est pas reconnu, choisissez vous-même le séparateur, le titre et la colonne de chaque information.',
        'L’aperçu se met à jour à chaque changement ; le panneau des colonnes s’ouvre de lui-même si des lignes sont ignorées.',
      ],
      en: [
        'CSV import: when the file is not recognised, pick the separator, the header and the column of each field yourself.',
        'The preview updates at each change; the columns panel opens by itself when rows are skipped.',
      ],
    },
  },
  {
    version: '1.0.17',
    date: '2026-09-16',
    notes: {
      fr: [
        'Catalogue : vie courante revue (Uber One, Deliveroo, Fnac+, Ulys, Babbel, Duolingo, Headspace, Calm, Petit BamBou), tarifs et formules à jour.',
        'EDF, Engie, TotalEnergies, Veolia et MAIF : adresses de gestion et contacts de résiliation vérifiés.',
        'Fin de la revue du catalogue : 74 services sur 79 datés, 233 formules ; restent indicatifs YouTube Music, Dashlane, LinkedIn, Fitness Park, L’Équipe.',
      ],
      en: [
        'Catalog: everyday life reviewed (Uber One, Deliveroo, Fnac+, Ulys, Babbel, Duolingo, Headspace, Calm, Petit BamBou), prices and plans updated.',
        'EDF, Engie, TotalEnergies, Veolia and MAIF: management addresses and cancellation contacts checked.',
        'Catalog review complete: 74 of 79 services dated, 233 plans; YouTube Music, Dashlane, LinkedIn, Fitness Park and L’Équipe stay indicative.',
      ],
    },
  },
  {
    version: '1.0.16',
    date: '2026-09-16',
    notes: {
      fr: [
        'Catalogue : jeux vidéo revus — PlayStation Plus (1, 3 et 12 mois des trois paliers), Xbox Game Pass, Nintendo Switch Online, GeForce NOW, Apple Arcade, Twitch.',
        'Sécurité revue — NordVPN, Proton, Surfshark, ExpressVPN : prix hors TVA, renouvellement annuel et première période de 2 ans.',
      ],
      en: [
        'Catalog: gaming reviewed — PlayStation Plus (1, 3 and 12 months of all three tiers), Xbox Game Pass, Nintendo Switch Online, GeForce NOW, Apple Arcade, Twitch.',
        'Security reviewed — NordVPN, Proton, Surfshark, ExpressVPN: prices before VAT, annual renewal and first 2-year period.',
      ],
    },
  },
  {
    version: '1.0.15',
    date: '2026-09-16',
    notes: {
      fr: [
        'Catalogue : sport revu — Basic-Fit (facturé par 4 semaines), Zwift, TrainingPeaks, komoot, AllTrails, Garmin Connect+, Apple Fitness+.',
        'Presse revue — Le Monde, Mediapart, Les Échos, Cafeyn ; L’Équipe reste indicatif, Fitness Park sans formule (tarifs par club).',
      ],
      en: [
        'Catalog: sport reviewed — Basic-Fit (billed every 4 weeks), Zwift, TrainingPeaks, komoot, AllTrails, Garmin Connect+, Apple Fitness+.',
        'Press reviewed — Le Monde, Mediapart, Les Échos, Cafeyn; L’Équipe stays indicative, Fitness Park has no plan (club prices).',
      ],
    },
  },
  {
    version: '1.0.14',
    date: '2026-09-16',
    notes: {
      fr: [
        'Après l’ajout d’un abonnement dont le service est inconnu, l’app propose de l’enregistrer dans « Mes services » et de l’envoyer à l’auteur.',
        'Réglages › Général : interrupteur « Proposer les services inconnus » pour désactiver ou réactiver cette proposition.',
        '« Proposer un service » refuse aussi les variantes de ponctuation d’un nom déjà au catalogue (« basic fit » pour Basic-Fit).',
      ],
      en: [
        'After adding a subscription whose service is unknown, the app offers to save it in “My services” and to send it to the author.',
        'Settings › General: “Offer unknown services” switch to turn this suggestion off or on.',
        '“Suggest a service” also rejects punctuation variants of a name already in the catalog (“basic fit” for Basic-Fit).',
      ],
    },
  },
  {
    version: '1.0.13',
    date: '2026-09-16',
    notes: {
      fr: [
        'Catalogue › Mes services : quand un service proposé rejoint le catalogue officiel, l’app propose de basculer vers la version officielle.',
        'Les abonnements liés passent sur l’entrée officielle en gardant prix, périodicité, devise et moyen de paiement ; annulable, refus mémorisé.',
      ],
      en: [
        'Catalog › My services: when a suggested service joins the official catalog, the app offers to switch to the official entry.',
        'Linked subscriptions move to the official entry keeping price, cycle, currency and payment method; undoable, refusal remembered.',
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
