/**
 * Dictionnaire français — langue de référence (EF-17b).
 * Clés plates « domaine.sujet » ; les paramètres s'écrivent {nom}.
 * Le dictionnaire anglais est typé sur celui-ci : toute clé manquante ou en
 * trop est une erreur de compilation.
 */
export const fr = {
  /* Navigation */
  'nav.accueil': 'Accueil',
  'nav.reglages': 'Réglages',
  'nav.retour': 'Retour',
  'nav.ajouter': 'Ajouter un abonnement',

  /* Actions communes */
  'commun.annuler': 'Annuler',
  'commun.enregistrer': 'Enregistrer',
  'commun.fermer': 'Fermer',
  'commun.modifier': 'Modifier',
  'commun.supprimer': 'Supprimer',
  'commun.confirmer': 'Confirmer',
  'commun.chargement': 'Chargement…',

  /* Accueil */
  'accueil.titre': 'Mes abonnements',
  'accueil.totalMensuel': 'Par mois (normalisé)',
  'accueil.actifs.un': '{n} actif',
  'accueil.actifs.plusieurs': '{n} actifs',
  'accueil.parAn': '≈ {montant} / an',
  'accueil.ouvrir': 'Ouvrir {nom}',
  'accueil.nombre.un': '{n} abonnement',
  'accueil.nombre.plusieurs': '{n} abonnements',

  /* Tuiles (EF-10) */
  'tuile.sous.usage': 'à l’usage',
  'tuile.sous.usagePlafond': 'à l’usage · plafond ~{montant} / mois',
  'tuile.sous.essai': 'Essai · puis {montant} {periodicite}',
  'tuile.sous.partage': 'ma part {montant} {periodicite}',
  'tuile.partage': 'partagé',
  'paiement.court.cb': 'CB',
  'paiement.court.paypal': 'PayPal',
  'paiement.court.apple_pay': 'App Store',
  'paiement.court.sepa': 'SEPA',
  'paiement.court.autre': 'Autre',
  'accueil.vide.titre': 'Aucun abonnement',
  'accueil.vide.texte': 'Ajoutez votre premier abonnement depuis le catalogue ou en saisie libre.',
  'accueil.vide.demo': 'Ou chargez le jeu de démonstration depuis les réglages.',

  /* Réglages */
  'reglages.titre': 'Réglages',
  'reglages.apparence': 'Apparence',
  'reglages.theme': 'Thème',
  'reglages.general': 'Général',
  'reglages.langue': 'Langue',
  'reglages.donnees': 'Données',
  'reglages.demo.titre': 'Jeu de démonstration',
  'reglages.demo.texte':
    '13 abonnements et 4 moyens de paiement repris de la maquette. Recharger remplace les entrées de démo existantes, sans toucher aux vôtres.',
  'reglages.demo.bouton': 'Charger le jeu de démo',
  'reglages.demo.charge': 'Jeu de démo chargé',
  'reglages.confidentialite': 'Confidentialité',
  'reglages.confidentialite.texte':
    '100 % local, hors ligne. Aucune donnée bancaire réelle — uniquement des libellés descriptifs. Rien ne quitte votre appareil.',
  'reglages.apropos': 'À propos',
  'reglages.apropos.texte': 'Subtuile {version} — logiciel libre sous licence AGPL-3.0.',
  'reglages.apropos.depot': 'Code source',

  /* Thème, langue, affichage, tri */
  'theme.clair': 'Clair',
  'theme.sombre': 'Sombre',
  'theme.systeme': 'Système',
  'langue.fr': 'Français',
  'langue.en': 'English',
  'affichage.grille': 'Grille',
  'affichage.liste': 'Liste',
  'tri.echeance': 'Échéance',
  'tri.prix': 'Prix',
  'tri.nom': 'Nom',
  'tri.categorie': 'Catégorie',
  'tri.personnalise': 'Ordre personnalisé',

  /* Catégories (§3.1) */
  'categorie.streaming': 'Streaming',
  'categorie.sport': 'Sport',
  'categorie.musique': 'Musique',
  'categorie.ia': 'IA',
  'categorie.cloud': 'Cloud',
  'categorie.productivite': 'Productivité',
  'categorie.presse': 'Presse',
  'categorie.gaming': 'Gaming',
  'categorie.securite': 'Sécurité',
  'categorie.vie_courante': 'Vie courante',
  'categorie.autre': 'Autre',

  /* Statuts (EF-06) */
  'statut.actif': 'Actif',
  'statut.en_pause': 'En pause',
  'statut.en_pause.jusquau': 'En pause jusqu’au {date}',
  'statut.resilie_actif_jusquau': 'Résilié — actif jusqu’au {date}',
  'statut.archive': 'Archivé',

  /* Canal d'achat (EF-21) */
  'canal.direct': 'Direct',
  'canal.app_store': 'App Store',
  'canal.google_play': 'Google Play',

  /* Mode de résiliation (EF-21b) */
  'resiliation.lien': 'Lien de résiliation',
  'resiliation.telephone': 'Par téléphone',
  'resiliation.courrier_recommande': 'Courrier recommandé',
  'resiliation.espace_client': 'Espace client',

  /* Moyens de paiement (§3.3) */
  'paiement.cb': 'Carte bancaire',
  'paiement.paypal': 'PayPal',
  'paiement.apple_pay': 'Apple Pay / App Store',
  'paiement.sepa': 'Prélèvement SEPA',
  'paiement.autre': 'Autre',

  /* Périodicité (§3.2) — suffixes de prix et libellés */
  'periodicite.quotidienne': '/ jour',
  'periodicite.hebdomadaire': '/ semaine',
  'periodicite.mensuelle': '/ mois',
  'periodicite.trimestrielle': '/ trimestre',
  'periodicite.semestrielle': '/ semestre',
  'periodicite.annuelle': '/ an',
  'periodicite.tousLes.jour': 'tous les {n} jours',
  'periodicite.tousLes.semaine': 'toutes les {n} semaines',
  'periodicite.tousLes.mois': 'tous les {n} mois',
  'periodicite.tousLes.an': 'tous les {n} ans',
  'periodicite.a_vie': 'à vie',
  'periodicite.a_l_usage': 'à l’usage',
  'periodicite.plafond': 'plafond ~{montant}',

  /* Compteur J-X (EF-10, EF-11) */
  'compteur.jours': 'J-{n}',
  'compteur.aujourdhui': 'Aujourd’hui',
  'compteur.depasse': 'J+{n}',
  'compteur.essai': 'Essai · J-{n}',
  'compteur.preavis': 'Préavis · J-{n}',
  'compteur.echeance': 'J-{n} · {date}',
  'compteur.echeance.aujourdhui': 'Aujourd’hui · {date}',
  'compteur.echeance.depasse': 'J+{n} · {date}',
  'compteur.aVie': 'À vie',
  'compteur.aLUsage': 'À l’usage',
  'compteur.pause': 'En pause',
  'compteur.pause.jusquau': 'En pause → {date}',
  'compteur.resilie': 'Résilié → {date}',
  'compteur.archive': 'Archivé',

  /* Montants */
  'montant.estime': '~{montant}',
  'montant.parMois': '{montant} / mois',

  /* Toasts (EF-01b, EF-19) */
  'toast.annuler': 'Annuler',
  'toast.actionAnnulee': 'Action annulée',
} as const;

export type CleTraduction = keyof typeof fr;
export type Dictionnaire = Record<CleTraduction, string>;
