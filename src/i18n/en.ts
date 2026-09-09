import type { Dictionnaire } from './fr';

/** English dictionary — same keys as `fr`, enforced by the type. */
export const en: Dictionnaire = {
  /* Navigation */
  'nav.accueil': 'Home',
  'nav.reglages': 'Settings',
  'nav.retour': 'Back',
  'nav.ajouter': 'Add a subscription',

  /* Common actions */
  'commun.annuler': 'Cancel',
  'commun.enregistrer': 'Save',
  'commun.fermer': 'Close',
  'commun.modifier': 'Edit',
  'commun.supprimer': 'Delete',
  'commun.confirmer': 'Confirm',
  'commun.chargement': 'Loading…',

  /* Home */
  'accueil.titre': 'My subscriptions',
  'accueil.totalMensuel': 'Per month (normalized)',
  'accueil.nombre.un': '{n} subscription',
  'accueil.nombre.plusieurs': '{n} subscriptions',
  'accueil.vide.titre': 'No subscriptions',
  'accueil.vide.texte': 'Add your first subscription from the catalog or free entry.',
  'accueil.vide.demo': 'Or load the demo data set from the settings.',

  /* Settings */
  'reglages.titre': 'Settings',
  'reglages.apparence': 'Appearance',
  'reglages.theme': 'Theme',
  'reglages.general': 'General',
  'reglages.langue': 'Language',
  'reglages.donnees': 'Data',
  'reglages.demo.titre': 'Demo data set',
  'reglages.demo.texte':
    '13 subscriptions and 4 payment methods taken from the mockup. Reloading replaces existing demo entries without touching yours.',
  'reglages.demo.bouton': 'Load the demo data set',
  'reglages.demo.charge': 'Demo data set loaded',
  'reglages.confidentialite': 'Privacy',
  'reglages.confidentialite.texte':
    '100% local, offline. No real banking data — descriptive labels only. Nothing leaves your device.',
  'reglages.apropos': 'About',
  'reglages.apropos.texte': 'Subtuile {version} — free software under the AGPL-3.0 license.',
  'reglages.apropos.depot': 'Source code',

  /* Theme, language, layout, sort */
  'theme.clair': 'Light',
  'theme.sombre': 'Dark',
  'theme.systeme': 'System',
  'langue.fr': 'Français',
  'langue.en': 'English',
  'affichage.grille': 'Grid',
  'affichage.liste': 'List',
  'tri.echeance': 'Renewal',
  'tri.prix': 'Price',
  'tri.nom': 'Name',
  'tri.categorie': 'Category',
  'tri.personnalise': 'Custom order',

  /* Categories */
  'categorie.streaming': 'Streaming',
  'categorie.sport': 'Sport',
  'categorie.musique': 'Music',
  'categorie.ia': 'AI',
  'categorie.cloud': 'Cloud',
  'categorie.productivite': 'Productivity',
  'categorie.presse': 'News',
  'categorie.gaming': 'Gaming',
  'categorie.securite': 'Security',
  'categorie.vie_courante': 'Everyday life',
  'categorie.autre': 'Other',

  /* Statuses */
  'statut.actif': 'Active',
  'statut.en_pause': 'Paused',
  'statut.en_pause.jusquau': 'Paused until {date}',
  'statut.resilie_actif_jusquau': 'Cancelled — active until {date}',
  'statut.archive': 'Archived',

  /* Purchase channel */
  'canal.direct': 'Direct',
  'canal.app_store': 'App Store',
  'canal.google_play': 'Google Play',

  /* Cancellation mode */
  'resiliation.lien': 'Cancellation link',
  'resiliation.telephone': 'By phone',
  'resiliation.courrier_recommande': 'Registered mail',
  'resiliation.espace_client': 'Customer account',

  /* Payment methods */
  'paiement.cb': 'Bank card',
  'paiement.paypal': 'PayPal',
  'paiement.apple_pay': 'Apple Pay / App Store',
  'paiement.sepa': 'SEPA direct debit',
  'paiement.autre': 'Other',

  /* Billing cycle */
  'periodicite.quotidienne': '/ day',
  'periodicite.hebdomadaire': '/ week',
  'periodicite.mensuelle': '/ month',
  'periodicite.trimestrielle': '/ quarter',
  'periodicite.semestrielle': '/ half-year',
  'periodicite.annuelle': '/ year',
  'periodicite.tousLes.jour': 'every {n} days',
  'periodicite.tousLes.semaine': 'every {n} weeks',
  'periodicite.tousLes.mois': 'every {n} months',
  'periodicite.tousLes.an': 'every {n} years',
  'periodicite.a_vie': 'lifetime',
  'periodicite.a_l_usage': 'pay as you go',
  'periodicite.plafond': 'cap ~{montant}',

  /* Countdown */
  'compteur.jours': 'D-{n}',
  'compteur.aujourdhui': 'Today',
  'compteur.depasse': 'D+{n}',
  'compteur.essai': 'Trial · D-{n}',
  'compteur.preavis': 'Notice · D-{n}',

  /* Amounts */
  'montant.estime': '~{montant}',
  'montant.parMois': '{montant} / month',

  /* Toasts */
  'toast.annuler': 'Undo',
  'toast.actionAnnulee': 'Action undone',
};
