# Roadmap — Subtuile

Feuille de route tenue à jour **à chaque étape committée** : une fonctionnalité passe
⬜ à faire → 🔄 en cours → ✅ livrée (avec le tag ou le commit qui la livre).
Le périmètre est celui de [docs/CdC.md](docs/CdC.md) (§4 exigences, §6 lotissement, §7 écrans),
qui fait foi. Le détail des changements est dans [CHANGELOG.md](CHANGELOG.md).

Légende : **[M]** must have · **[S]** should have · EF-xx = exigence du CdC.

## Vue d'ensemble

| Lot | Contenu | Version cible | Statut |
|---|---|---|---|
| 0 — Initialisation | Dépôt, licence AGPL-3.0, docs, méthode | 0.0.0 · tag `init` | ✅ |
| 1 — Socle | Modèle, moteur d'échéances, stockage, tuiles, fiche, formulaire, tri/filtres | 0.1.0 · tag `lot-1` | ✅ 2026-09-10 |
| 2 — Paiement & désabonnement | Moyens de paiement, catalogue complet, deep links, routage résiliation | 0.2.0 · tag `lot-2` | ✅ 2026-09-11 |
| 3 — Cas particuliers & alertes | Essais, engagement/préavis, statuts, centre d'alertes, ICS | 0.3.0 · tag `lot-3` | ✅ 2026-09-12 |
| 4 — Finances & données | Vue financière, prévisionnel, export/import, PWA, mise en ligne | 1.0.0 · tag `lot-4` | ✅ 2026-09-13 |
| 5 — Pilotage | Objectif d'économie, usage & coût réel, suggestions, import relevé | 1.1.0 · tag `lot-5` | ⬜ prochain |

Critères de validation par lot : voir CdC §6.

## Lot 1 — Socle

Déroulé en 8 étapes (un commit validé par étape) :

| # | Étape | Statut |
|---|---|---|
| 1 | Init projet (Vite / TS strict / Vitest / lint) + arborescence + tokens.css | ✅ 2026-09-08 |
| 2 | types.ts (modèle §3 complet) + dates.ts + tests exhaustifs | ✅ 2026-09-08 |
| 3 | StorageProvider / Dexie + RefDataProvider + fixtures de démo | ✅ 2026-09-09 |
| 4 | i18n (fr, en) + thème clair/sombre/système + squelette App | ✅ 2026-09-09 |
| 5 | Accueil : tuiles, compteur J-X, codes couleur, grille/liste | ✅ 2026-09-09 |
| 6 | Fiche détail + formulaire création/édition | ✅ 2026-09-09 |
| 7 | Tri/filtres + annulation par toast | ✅ 2026-09-09 |
| 8 | Revue contre le critère CdC §6, tag `lot-1` | ✅ 2026-09-10 (test de recette `lot1.recette.test.ts`, audit des règles d'architecture) |

| Exigence | Fonctionnalité | Statut |
|---|---|---|
| §3 | Modèle de données complet (Abonnement, MoyenPaiement, Service, formules, champs techniques §3.5) | ✅ étape 2 |
| EF-03 [M] | Moteur d'échéances : toutes périodicités (dont perso et 28 j), mois courts, date locale, passage d'échéance, compteur J-X | ✅ étape 2 (56 tests) |
| EF-04b [S] | Montant estimé « ~X € » et régularisation (modèle + affichage ; alerte au lot 3) | ✅ étapes 2 et 5 (alerte de régularisation au lot 3) |
| §5.6 | StorageProvider (Dexie) et RefDataProvider (catalogue minimal 12 services, taux) | ✅ étape 3 |
| EF-01 [M] | CRUD des abonnements, suppression définitive avec confirmation | ✅ étapes 3 et 6 |
| EF-01b [S] | Annulation par toast (~6 s) après suppression / changement d'état | ✅ étape 7 (import au lot 4) |
| EF-02 [M] | Création en saisie libre : périodicités complètes, canal d'achat, champs vie courante | ✅ étape 6 (mode catalogue au lot 2) |
| EF-10 [M] | Accueil en grille de tuiles : nom, logo (initiales), prix + périodicité, compteur J-X, pastille paiement, badge canal | ✅ étape 5 |
| EF-11 [M] | Codes couleur d'urgence du compteur (vert / orange / rouge / violet) | ✅ étapes 2 et 5 |
| EF-12 [M] | Tri (échéance, prix, nom, catégorie) et filtres (catégorie, statut, moyen de paiement, tags) | ✅ étape 7 (« ordre personnalisé » livré avec EF-14, lot 4 étape 5) |
| EF-12b [S] | Mode grille / liste persisté | ✅ étape 5 |
| EF-13 [M] | Fiche détail : toutes les infos + actions (modifier, statut, archiver, supprimer) | ✅ étape 6 (routage « Résilier » par canal au lot 2) |
| EF-15 [S] | Recherche textuelle globale (écart bilan v1, ciblé lot 1) | ✅ étape 7 |
| EF-17 [S] | Thème clair / sombre / système | ✅ étape 4 (tokens à l'étape 1) |
| EF-17b [S] | Architecture i18n FR / EN, langue persistée | ✅ étape 4 (dictionnaires complétés à chaque écran) |
| EF-18 [S] | « Abonné depuis » sur la fiche | ✅ étape 6 |
| EF-19 [S] | Toast de retour après chaque action | ✅ étapes 6 et 7 |
| §3.4 | Champ logo `{ type, valeur }` avec rendu à repli (V1 : initiales) | ✅ étape 5 (icone / upload retombent sur les initiales) |
| §7.7 | Écran Réglages minimal (thème, langue) — complété aux lots 3 et 4 | ✅ étape 4 |
| §5.5 | Chargement du jeu de démo (fixtures) depuis les réglages, pour tester chaque lot | ✅ étape 4 (fixtures à l'étape 3) |

## Lot 2 — Paiement & désabonnement

Déroulé en 6 étapes (un commit validé par étape) :

| # | Étape | Statut |
|---|---|---|
| 1 | Routage « Gérer / Résilier » par canal, deep links, démarches hors ligne, proposition « résilié — actif jusqu'au » | ✅ 2026-09-10 |
| 2 | Écran Moyens de paiement : liste, ajout, édition, suppression avec annulation, expiration signalée | ✅ 2026-09-10 |
| 3 | Catalogue complet : 74 services en 11 familles + vie courante française avec mode de résiliation | ✅ 2026-09-11 (79 services, catalogue v2) |
| 4 | Formulaire en mode catalogue (pré-remplissage, « moins cher en direct »), aide à la saisie libre, écran Catalogue | ✅ 2026-09-11 |
| 5 | « Proposer un service » et groupe « Mes services » | ✅ 2026-09-11 |
| 6 | Revue contre le critère CdC §6, tag `lot-2`, version 0.2.0 | ✅ 2026-09-11 (test de recette `lot2.recette.test.ts`, audit des règles d'architecture) |

| Exigence | Fonctionnalité | Statut |
|---|---|---|
| §3.3 / §7.6 | Écran Moyens de paiement : liste, ajout, édition, couleur, 4 derniers chiffres | ✅ lot 2 étape 2 (expiration signalée M-1, alerte centralisée au lot 3) |
| Annexe A | Catalogue complet (74 services, 11 familles) + vie courante française avec modeResiliation | ✅ lot 2 étape 3 (79 services dont 5 contrats « Maison » de la v6 ; URLs indicatives à vérifier avant mise en ligne) |
| EF-02 [M] | Création depuis le catalogue (pré-remplissage) + mention tarif direct plus avantageux | ✅ lot 2 étape 4 |
| EF-02b [S] | Aide à la saisie libre (3 suggestions du catalogue) | ✅ lot 2 étape 4 |
| EF-09 [S] | « Proposer un service » → groupe « Mes services » | ✅ lot 2 étape 5 |
| §7.8 | Écran Catalogue | ✅ lot 2 étape 4 (« Proposer un service » à l'étape 5) |
| EF-20 [M] | Bouton « Gérer / Résilier » ouvrant urlGestion | ✅ lot 2 étape 1 |
| EF-21 [M] | Routage selon le canal (App Store / Google Play / direct) + badge | ✅ lot 2 étape 1 (badge dès le lot 1) |
| EF-21b [S] | Modes de résiliation hors ligne (téléphone, courrier recommandé, espace client) | ✅ lot 2 étape 1 |
| EF-22 [S] | Proposition « résilié-actif-jusqu'au » après clic sur Résilier | ✅ lot 2 étape 1 (avec étapes de la démarche à cocher) |
| §5.3 | Deep links App Store, Google Play, PayPal | ✅ lot 2 étape 1 (PayPal utilisé à l'étape 2) |

## Lot 3 — Cas particuliers & alertes

Déroulé en 7 étapes (un commit validé par étape), validé par FlhFly le 2026-09-11 :

| # | Étape | Statut |
|---|---|---|
| 1 | Moteur d'alertes (domaine) : échéance J-X, fin d'essai, préavis, expiration de carte M-1, régularisation, hausse annoncée ; état lu / non lu persisté | ✅ 2026-09-11 |
| 2 | Centre d'alertes : badge sur l'accueil, liste, « tout marquer comme lu » ; défauts d'alerte dans les réglages | ✅ 2026-09-11 |
| 3 | Cycle de vie et statuts : essai → payant, prix futur appliqué, résilié → archivé à l'échéance, archivés hors totaux, pause / reprise, duplication | ✅ 2026-09-11 |
| 4 | Fiche enrichie : engagement / préavis et date limite, historique des prix avec hausse à date, régularisation | ✅ 2026-09-12 |
| 5 | Écran Échéancier et son entrée dans la barre de navigation ; barre basse refaite à l'identique de la maquette (demande FlhFly du 2026-09-11, pour accueillir aussi Finances au lot 4) | ✅ 2026-09-12 |
| 6 | Export ICS d'un rappel, section « Automatisation » des réglages | ✅ 2026-09-12 |
| 7 | Revue contre le critère CdC §6, test de recette, version 0.3.0, tag `lot-3` | ✅ 2026-09-12 (test de recette `lot3.recette.test.ts`, audit des règles d'architecture) |
| — | Hors découpage, sur retours de recette : écran en haut de page, options avancées repliées avec compteur, format de date au choix (réglage + champ à calendrier), garde contre la perte de saisie avec récapitulatif, barre de navigation et écran Réglages alignés sur la maquette | ✅ 2026-09-12 |

| Exigence | Fonctionnalité | Statut |
|---|---|---|
| EF-04 [M] | Essais gratuits : « essai jusqu'au X, puis Y € » | ✅ lot 1 (tuile, fiche, cycle ancré à la fin d'essai) + lot 3 étapes 1-3 (alerte, transition) |
| EF-04b [S] | Alerte de régularisation annuelle | ✅ lot 3 étapes 1-2 (fenêtre 30 j, affichée au centre d'alertes) et 4 (date reportée à l'anniversaire suivant) |
| EF-05 [M] | Engagement / préavis : date limite de résiliation | ✅ lot 1 étape 6 (encart fin d'engagement + date limite) et lot 3 étapes 1-2 (alerte) et 4 (détail engagement / préavis) |
| EF-06 [M] | Statuts actif / en pause / résilié-actif-jusqu'au / archivé | ✅ lot 1 (actions de la fiche) + lot 3 étape 3 (archivage automatique après la date, reprise automatique à la date ; saisie de la date de reprise au lot 5) |
| EF-07 [S] | Duplication d'un abonnement | ✅ lot 3 étape 3 |
| EF-08 [S] | Historique des prix, saisie d'une hausse à date | ✅ lot 1 (historique) + lot 3 étape 4 (« Modifier le prix » à date, passée ou future) |
| EF-08b [S] | Prix futur programmé (alerte, application automatique) | ✅ lot 3 étapes 1-3 (alerte « hausse annoncée », application automatique à la date versée dans l'historique) |
| EF-16 [S] | Écran Échéancier (liste chronologique) | ✅ lot 3 étape 5 (liste par mois + vue calendrier de la maquette) |
| EF-30 [M] | Alertes paramétrables J-X, fin d'essai, préavis, expiration de carte ; défauts globaux | ✅ lot 3 étapes 1-2 (moteur, seuil par abonnement, défauts réglables) |
| EF-31 [M] | Centre d'alertes in-app : badge, liste, « tout marquer comme lu » | ✅ lot 3 étapes 1-2 |
| EF-32 [S] | Export ICS d'un rappel | ✅ lot 3 étape 6 (depuis la fiche, et toutes les échéances depuis Réglages › Automatisation) |

## Lot 4 — Finances & données

Déroulé en 8 étapes (un commit validé par étape), validé par FlhFly le 2026-09-12 :

| # | Étape | Statut |
|---|---|---|
| 1 | Moteur financier (domaine) : totaux normalisés avec part payée et montants estimés, répartition par catégorie et par moyen de paiement, prévisionnel 12 mois à montants réels, dépenses passées 12 mois | ✅ 2026-09-12 |
| 2 | Écran Finances (écran 5 de la maquette) et onglet Finances dans la barre | ✅ 2026-09-12 |
| 3 | Devises : taux indicatifs, devise d'affichage (EF-45), devise par abonnement et devise par défaut (EF-45b) | ✅ 2026-09-12 |
| 4 | Export / import JSON (fusion, remplacement, écran d'import), import CSV, rangées Réglages › Données | ✅ 2026-09-12 |
| 5 | Réorganisation des tuiles par glisser-déposer, tri « ordre personnalisé » | ✅ 2026-09-12 |
| 6 | PWA : manifest, icônes, service worker hors ligne, installation ; écran À propos et rangées restantes des réglages | ✅ 2026-09-12 (« Revoir l'introduction » livré à l'étape 7 ; « Soutenir le projet » livré le 2026-09-13 avec le lien Ko-fi) |
| 7 | Onboarding à la première ouverture : présentation, langue, devise par défaut, format de date, démo / import / premier abonnement | ✅ 2026-09-13 |
| 8 | Revue contre le critère CdC §6, recette, version 1.0.0, README finalisé, tag `lot-4`, mise en ligne | ✅ 2026-09-13 (test de recette `lot4.recette.test.ts`, audit des règles d'architecture, déploiement GitHub Pages) |

| Exigence | Fonctionnalité | Statut |
|---|---|---|
| EF-40 [M] | Total mensuel normalisé et total annuel (montants estimés marqués) | ✅ lot 4 étapes 1-2 |
| EF-41 [M] | Répartition par catégorie et par moyen de paiement | ✅ lot 4 étapes 1-2 (donut et jauges de la maquette) |
| EF-42 [M] | Prévisionnel 12 mois | ✅ lot 4 étapes 1-2 (montants réels par mois) |
| EF-43 [S] | Historique des dépenses passées (12 mois ; 24 mois au lot 5) | ✅ lot 4 étapes 1-2 (prix de l'époque) |
| EF-44 [S] | Prise en compte de partPayee | ✅ lot 4 étape 1 (part payée dans tous les totaux) |
| EF-45 [S] | Devise d'affichage à taux indicatifs (EUR / USD / GBP / CHF) | ✅ lot 4 étape 3 (réglage « Devise », totaux convertis, note de fraîcheur des taux) |
| EF-45b [S] | Devise de saisie par abonnement (EUR / USD / GBP / CHF) + devise par défaut dans les réglages (décision du 2026-09-11, CdC v1.16) | ✅ lot 4 étape 3 (chips à côté du prix, défaut = réglage « Devise », choisi aussi à l'onboarding depuis l'étape 7) |
| EF-50 [M] | Export JSON (schemaVersion) et import fusion / remplacement | ✅ lot 4 étape 4 (écran d'import de la maquette, lecture tolérante, confirmation du remplacement) |
| EF-52 [S] | Import CSV simple | ✅ lot 4 étape 4 (séparateur et en-tête détectés, aperçu, lignes ignorées expliquées) |
| EF-14 [S] | Réorganisation des tuiles par drag & drop, tri « ordre personnalisé » | ✅ lot 4 étape 5 (mode réorganisation de la maquette : glisser au doigt ou à la souris, flèches du clavier ; ordre persisté) |
| EF-51 [M] / §5.2 | PWA : manifest, service worker, 100 % hors ligne | ✅ lot 4 étape 6 (vite-plugin-pwa : précache complet du bundle, toast de mise à jour, invite d'installation, icônes générées) |
| §7.7 / §7.9 | Réglages complets (export/import, Confidentialité, Automatisation, tout effacer) et écran À propos | ✅ Automatisation (lot 3 étape 6), « Effacer toutes les données » (lot 4, avancé sur demande), export / import (étape 4), À propos (étape 6 : dépôt public, installation) et « Revoir l'introduction » (étape 7) livrés ; « Soutenir le projet » livré le 2026-09-13 avec le lien Ko-fi |
| — | Réglage « Format de date » (JJ/MM/AAAA, MM/JJ/AAAA, AAAA-MM-JJ) pour l'affichage et la saisie (demande FlhFly du 2026-09-12) | ✅ livré au lot 3 le 2026-09-12 (réglage + champ `ChampDate`) ; repris dans l'onboarding (lot 4 étape 7) |
| — | Mise en ligne (GitHub Pages ou Netlify), README finalisé | ✅ 2026-09-13 — <https://subtuile.com> (domaine personnalisé depuis le 2026-09-14, anciennement flhfly.github.io/subtuile) via `.github/workflows/deploy.yml` ; README finalisé |

## Après la v1.0.0 — corrections et améliorations (avant le lot 5)

Décision FlhFly du 2026-09-13 : le lot 5 attend les retours d'usage de la v1.0.0 ; corrections
et petites améliorations sont livrées en versions 1.0.x, sans tag de lot, avec leurs notes de
version dans l'app.

| Demande | Statut |
|---|---|
| Barre de navigation fixée, champs sans zoom, formulaire centré (test iPhone) | ✅ 2026-09-13 |
| Rangée « Soutenir le projet » (lien Ko-fi) | ✅ 2026-09-13 |
| Écran « Nouveautés » : notes de version par langue dans l'app, pastille et rappel après mise à jour | ✅ 2026-09-13 (v1.0.1) |
| Icône calendrier inopérante sur iPhone (test FlhFly) | ✅ 2026-09-13 (v1.0.2) |
| « + Ajouter un moyen de paiement » depuis le formulaire, aide quand aucun moyen n'existe | ✅ 2026-09-13 (v1.0.2) |
| Petites améliorations validées le 2026-09-13 : rangée « Mise à jour disponible » dans À propos ; pause avec date de reprise (EF-06) ; avertissement de doublon à la création (C3) ; rappel de sauvegarde (C1) ; défilement automatique pendant le glisser | ✅ 2026-09-13 (v1.0.3) |
| Retours FlhFly du 2026-09-13 (suite) : délais d'alerte en listes dépliées ; langue en tête de l'onboarding ; formule libre et option « Autre » ; catalogue v3 (Claude Max) | ✅ 2026-09-13 (v1.0.4) |
| Proposition de service envoyée par e-mail à l'auteur (catalogue commun) ; dialogue des retours réagencé | ✅ 2026-09-14 (v1.0.11) |
| Canal de retours utilisateurs (bugs, idées) : e-mail `contact@subtuile.com` (domaine subtuile.com acheté par FlhFly) ; rangée « Signaler un bug ou proposer une idée » dans À propos | ✅ 2026-09-14 (v1.0.6) |
| Hauteur des boutons du dialogue des retours alignée sur le formulaire et la fiche | ✅ 2026-09-15 (v1.0.12) |
| Remplacement d'une entrée « Mes services » par la version officielle quand elle rejoint le catalogue (EF-09) : proposition explicite, migration des abonnements liés, refus mémorisé | ✅ 2026-09-16 (v1.0.13, approche validée le 2026-09-15) |
| Thème sombre « OLED » (noirs purs) en troisième choix d'apparence (C18) ; maquette possible via Claude Design avant intégration | ⬜ demande FlhFly du 2026-09-15, pas avant les lots de catalogue |
| Saisie libre : à l'enregistrement d'un service inconnu du catalogue et de « Mes services », proposer d'en créer l'entrée depuis les données saisies, puis de l'envoyer à `contact@subtuile.com` avec le message pré-rempli de la v1.0.11 (EF-09) | ✅ 2026-09-16 (v1.0.14, avec le contrôle de doublon du formulaire aligné) |
| Domaine personnalisé subtuile.com (GitHub Pages, `public/CNAME`, build à la racine) ; ancienne adresse redirigée | ✅ 2026-09-14 |
| Vérification du catalogue (C16, plan en 5 étapes du 2026-09-14) : script de contrôle et rapport, puis revue par lots (populaires d'abord), `verifieLe` par service | ✅ 2026-09-16 (v1.0.17, catalogue v11) : script et rapport, puis huit lots — populaires, streaming, musique, IA, cloud + productivité (2026-09-14), sport + presse, gaming + sécurité, vie courante (2026-09-16) ; 74 services sur 79 datés `verifieLe`, 233 formules ; restent indicatifs YouTube Music, Dashlane, LinkedIn, Fitness Park, L'Équipe |
| Store par plateforme (C19) : détection iOS / Android, réglage « Boutique d'applications », formules et canal limités au store de l'appareil | ⬜ demande FlhFly du 2026-09-16, à prévoir plus tard |
| Export CSV des abonnements, mêmes colonnes que l'import (EF-52) | ✅ 2026-09-16 (v1.0.19, colonnes validées par FlhFly) |
| Import CSV : choix manuel du séparateur, de l'en-tête et des colonnes quand la détection ne convient pas (EF-52) | ✅ 2026-09-16 (v1.0.18) |
| Revue RGPD du 2026-09-16 (1/3) : garde anti-numéro de carte (libellé bloqué, notes et référence avertis), import JSON assaini, purge des suppressions après 30 jours | ✅ 2026-09-17 (v1.0.20) |
| Revue RGPD (2/3) : page Confidentialité dédiée ouverte depuis Réglages (comme Nouveautés : données stockées, exports en clair, hébergement GitHub Pages, e-mails de contact, droits), mentions légales, PRIVACY.md | ✅ 2026-09-17 (v1.0.22) |
| Revue RGPD (3/3) : export JSON chiffré par mot de passe (C20), verrouillage de l'app (C8) | ⬜ candidats |
| Retours FlhFly du 2026-09-17 : tiret automatique de la date d'expiration au clavier numérique ; notes de version en plusieurs points, versions récentes complétées | ✅ 2026-09-17 (v1.0.21) |
| Centre d'alertes : ouvrir une alerte la marque lue (EF-31) | ✅ 2026-09-17 (v1.0.23) |
| Rappel libre à une date par abonnement (C14 promu EF-74) : date + texte dans les options avancées, ligne sur la fiche, alerte du jour J pendant 30 jours | ✅ 2026-09-17 (v1.0.24) |
| Découpage du bundle (étape 5 du plan du 2026-09-14) : chunks React / Dexie / date-fns / i18n / catalogue, écrans secondaires chargés à la demande, précache complet conservé | ✅ 2026-09-17 (v1.0.25) |
| Retours par e-mail : ajouter la version du système et du navigateur au message pré-rempli quand le navigateur la donne (exacte sur iPhone et Android, approximative sur Mac et iPad) | ⬜ demande FlhFly du 2026-09-18, petit lot 1.0.x |
| Mode discret (C21) : appui sur le total de l'accueil pour masquer tous les montants (« **** € »), préférence mémorisée | ⬜ demande FlhFly du 2026-09-18 |
| Personnalisation de l'affichage (C22) : couleur par abonnement, contenu des tuiles au choix, puis logo personnel (C10) | ⬜ demande FlhFly du 2026-09-18 |

## Lot 5 — Pilotage (en attente des retours d'usage de la v1.0.0)

| Exigence | Fonctionnalité | Statut |
|---|---|---|
| EF-70 [S] | Objectif d'économie avec progression | ⬜ |
| EF-71 [S] | Usage déclaré & coût réel par utilisation | ⬜ |
| EF-72 [S] | Suggestions d'économies (annuel vs mensuel, canal moins cher) via les formules du catalogue | ⬜ |
| EF-73 [S] | Import de relevé bancaire CSV : détection locale des récurrences, doublons, ajout groupé | ⬜ |
| EF-06 | Pause avec date de reprise automatique | ✅ 2026-09-13 (v1.0.3 : date de reprise facultative choisie au moment de la pause ; la reprise automatique existait depuis le lot 3) |
| EF-13b [S] | Journal « Derniers paiements » sur la fiche | ⬜ |
| EF-43 [S] | Historique des dépenses étendu à 24 mois | ⬜ |
| EF-44b [S] | Vue « Foyer & partage » | ⬜ |

## Évolutions (hors V1, non planifiées)

| Réf. | Piste |
|---|---|
| EF-33 | Notifications Web Push (nécessite un serveur d'envoi, §5.4) |
| §5.6 | Catalogue et taux chargés à distance (lecture seule, fallback embarqué) ; synchronisation multi-appareils |
| C1 | Rappel de sauvegarde — ✅ v1.0.3 (alerte + date du dernier export dans les réglages) ; export automatique périodique : candidat |
| C3 | Détection de doublons à la création manuelle — ✅ v1.0.3 (avertissement « Déjà suivi ? ») |
| C7 | Onboarding au premier lancement (dont choix de la devise par défaut, EF-45b) |
| C8 | Verrouillage de l'app (code / WebAuthn) |
| C9 | Rapport annuel exportable |
| C10 | Pictos de marques (dépendance npm) + upload de logo personnel |
| C12 | Compteur d'économies réalisées |
| C14 | Rappel libre à date par abonnement — promu EF-74, ✅ 2026-09-17 (v1.0.24) |
| C15 | Veille tarifaire : catalogue distant, comparaison locale des prix |
| C16 | Catalogue : paliers (formules) de chaque service vérifiés et complétés dans la bibliothèque, pour proposer tous les tiers disponibles quand l'utilisateur choisit un service (demande FlhFly du 2026-09-13) |
| C17 | Tarifs du catalogue par pays / devise : grille locale (pays choisi à l'onboarding) plutôt qu'une conversion de l'euro aux taux indicatifs (demande FlhFly du 2026-09-13) |
| C18 | Thème sombre « OLED » (noirs purs) en troisième choix du réglage d'apparence, à côté de clair / sombre / système — EF-17 (demande FlhFly du 2026-09-15) |
| C19 | Store par plateforme : détection iOS / Android, réglage « Boutique d'applications », formules et canal limités au store de l'appareil (demande FlhFly du 2026-09-16) |
| C20 | Export JSON chiffré par mot de passe (WebCrypto, 100 % local), en option à côté de l'export en clair (revue RGPD du 2026-09-16) |
| C21 | Mode discret : un appui sur le total de l'accueil masque tous les montants de l'app (« **** € »), un second les rétablit ; préférence mémorisée (demande FlhFly du 2026-09-18) |
| C22 | Personnalisation de l'affichage : couleur choisie par abonnement (champ `couleur` du modèle, sans sélecteur à ce jour), contenu des tuiles au choix, puis logo personnel (C10) (demande FlhFly du 2026-09-18) |
| C23 | Langues et devises supplémentaires : socle i18n et liste des devises extensibles ; une langue = un dictionnaire complet et ses formats, une devise = taux indicatif et symbole ; à relier à C17. Pas une priorité (demande FlhFly du 2026-09-18) |

### Mesure d'audience

Aucune : l'app ne fait aucune requête et GitHub Pages ne fournit ni journaux ni compteur de visites (seules les statistiques du dépôt — vues, clones, étoiles — existent dans Insights › Traffic). Les installations d'une PWA ne se comptent nulle part. Si un ordre de grandeur devient nécessaire, la seule voie compatible avec « zéro tracking » est un comptage agrégé côté hébergement, par exemple en plaçant le domaine derrière le proxy Cloudflare (visiteurs uniques par jour et par pays, sans cookie ni script) ; ce serait à déclarer dans la page Confidentialité. Décision FlhFly en attente (question du 2026-09-18).
