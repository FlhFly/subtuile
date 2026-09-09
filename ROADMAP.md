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
| 1 — Socle | Modèle, moteur d'échéances, stockage, tuiles, fiche, formulaire, tri/filtres | 0.1.0 · tag `lot-1` | 🔄 |
| 2 — Paiement & désabonnement | Moyens de paiement, catalogue complet, deep links, routage résiliation | 0.2.0 · tag `lot-2` | ⬜ |
| 3 — Cas particuliers & alertes | Essais, engagement/préavis, statuts, centre d'alertes, ICS | 0.3.0 · tag `lot-3` | ⬜ |
| 4 — Finances & données | Vue financière, prévisionnel, export/import, PWA, mise en ligne | 1.0.0 · tag `lot-4` | ⬜ |
| 5 — Pilotage | Objectif d'économie, usage & coût réel, suggestions, import relevé | 1.1.0 · tag `lot-5` | ⬜ |

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
| 7 | Tri/filtres + annulation par toast | ⬜ |
| 8 | Revue contre le critère CdC §6, tag `lot-1` | ⬜ |

| Exigence | Fonctionnalité | Statut |
|---|---|---|
| §3 | Modèle de données complet (Abonnement, MoyenPaiement, Service, formules, champs techniques §3.5) | ✅ étape 2 |
| EF-03 [M] | Moteur d'échéances : toutes périodicités (dont perso et 28 j), mois courts, date locale, passage d'échéance, compteur J-X | ✅ étape 2 (56 tests) |
| EF-04b [S] | Montant estimé « ~X € » et régularisation (modèle + affichage ; alerte au lot 3) | ✅ étapes 2 et 5 (alerte de régularisation au lot 3) |
| §5.6 | StorageProvider (Dexie) et RefDataProvider (catalogue minimal 12 services, taux) | ✅ étape 3 |
| EF-01 [M] | CRUD des abonnements, suppression définitive avec confirmation | ✅ étapes 3 et 6 |
| EF-01b [S] | Annulation par toast (~6 s) après suppression / changement d'état | ⬜ |
| EF-02 [M] | Création en saisie libre : périodicités complètes, canal d'achat, champs vie courante | ✅ étape 6 (mode catalogue au lot 2) |
| EF-10 [M] | Accueil en grille de tuiles : nom, logo (initiales), prix + périodicité, compteur J-X, pastille paiement, badge canal | ✅ étape 5 |
| EF-11 [M] | Codes couleur d'urgence du compteur (vert / orange / rouge / violet) | ✅ étapes 2 et 5 |
| EF-12 [M] | Tri (échéance, prix, nom, catégorie) et filtres (catégorie, statut, moyen de paiement, tags) | ⬜ |
| EF-12b [S] | Mode grille / liste persisté | ✅ étape 5 |
| EF-13 [M] | Fiche détail : toutes les infos + actions (modifier, statut, archiver, supprimer) | ✅ étape 6 (routage « Résilier » par canal au lot 2) |
| EF-15 [S] | Recherche textuelle globale (écart bilan v1, ciblé lot 1) | ⬜ |
| EF-17 [S] | Thème clair / sombre / système | ✅ étape 4 (tokens à l'étape 1) |
| EF-17b [S] | Architecture i18n FR / EN, langue persistée | ✅ étape 4 (dictionnaires complétés à chaque écran) |
| EF-18 [S] | « Abonné depuis » sur la fiche | ✅ étape 6 |
| EF-19 [S] | Toast de retour après chaque action | ✅ étape 6 (annulation à l'étape 7) |
| §3.4 | Champ logo `{ type, valeur }` avec rendu à repli (V1 : initiales) | ✅ étape 5 (icone / upload retombent sur les initiales) |
| §7.7 | Écran Réglages minimal (thème, langue) — complété aux lots 3 et 4 | ✅ étape 4 |
| §5.5 | Chargement du jeu de démo (fixtures) depuis les réglages, pour tester chaque lot | ✅ étape 4 (fixtures à l'étape 3) |

## Lot 2 — Paiement & désabonnement

| Exigence | Fonctionnalité | Statut |
|---|---|---|
| §3.3 / §7.6 | Écran Moyens de paiement : liste, ajout, édition, couleur, 4 derniers chiffres | ⬜ |
| Annexe A | Catalogue complet (74 services, 11 familles) + vie courante française avec modeResiliation | ⬜ |
| EF-02 [M] | Création depuis le catalogue (pré-remplissage) + mention tarif direct plus avantageux | ⬜ |
| EF-02b [S] | Aide à la saisie libre (3 suggestions du catalogue) | ⬜ |
| EF-09 [S] | « Proposer un service » → groupe « Mes services » | ⬜ |
| §7.8 | Écran Catalogue | ⬜ |
| EF-20 [M] | Bouton « Gérer / Résilier » ouvrant urlGestion | ⬜ |
| EF-21 [M] | Routage selon le canal (App Store / Google Play / direct) + badge | ⬜ |
| EF-21b [S] | Modes de résiliation hors ligne (téléphone, courrier recommandé, espace client) | ⬜ |
| EF-22 [S] | Proposition « résilié-actif-jusqu'au » après clic sur Résilier | ⬜ |
| §5.3 | Deep links App Store, Google Play, PayPal | ⬜ |

## Lot 3 — Cas particuliers & alertes

| Exigence | Fonctionnalité | Statut |
|---|---|---|
| EF-04 [M] | Essais gratuits : « essai jusqu'au X, puis Y € » | ⬜ |
| EF-04b [S] | Alerte de régularisation annuelle | ⬜ |
| EF-05 [M] | Engagement / préavis : date limite de résiliation | ⬜ |
| EF-06 [M] | Statuts actif / en pause / résilié-actif-jusqu'au / archivé | ⬜ |
| EF-07 [S] | Duplication d'un abonnement | ⬜ |
| EF-08 [S] | Historique des prix, saisie d'une hausse à date | ⬜ |
| EF-08b [S] | Prix futur programmé (alerte, application automatique) | ⬜ |
| EF-16 [S] | Écran Échéancier (liste chronologique) | ⬜ |
| EF-30 [M] | Alertes paramétrables J-X, fin d'essai, préavis, expiration de carte ; défauts globaux | ⬜ |
| EF-31 [M] | Centre d'alertes in-app : badge, liste, « tout marquer comme lu » | ⬜ |
| EF-32 [S] | Export ICS d'un rappel | ⬜ |

## Lot 4 — Finances & données

| Exigence | Fonctionnalité | Statut |
|---|---|---|
| EF-40 [M] | Total mensuel normalisé et total annuel (montants estimés marqués) | ⬜ |
| EF-41 [M] | Répartition par catégorie et par moyen de paiement | ⬜ |
| EF-42 [M] | Prévisionnel 12 mois | ⬜ |
| EF-43 [S] | Historique des dépenses passées (12 mois ; 24 mois au lot 5) | ⬜ |
| EF-44 [S] | Prise en compte de partPayee | ⬜ |
| EF-45 [S] | Devise d'affichage à taux indicatifs (EUR / USD / GBP / CHF) | ⬜ |
| EF-50 [M] | Export JSON (schemaVersion) et import fusion / remplacement | ⬜ |
| EF-52 [S] | Import CSV simple | ⬜ |
| EF-14 [S] | Réorganisation des tuiles par drag & drop, tri « ordre personnalisé » | ⬜ |
| EF-51 [M] / §5.2 | PWA : manifest, service worker, 100 % hors ligne | ⬜ |
| §7.7 / §7.9 | Réglages complets (export/import, Confidentialité, Automatisation) et écran À propos | ⬜ |
| — | Mise en ligne (GitHub Pages ou Netlify), README finalisé | ⬜ |

## Lot 5 — Pilotage

| Exigence | Fonctionnalité | Statut |
|---|---|---|
| EF-70 [S] | Objectif d'économie avec progression | ⬜ |
| EF-71 [S] | Usage déclaré & coût réel par utilisation | ⬜ |
| EF-72 [S] | Suggestions d'économies (annuel vs mensuel, canal moins cher) via les formules du catalogue | ⬜ |
| EF-73 [S] | Import de relevé bancaire CSV : détection locale des récurrences, doublons, ajout groupé | ⬜ |
| EF-06 | Pause avec date de reprise automatique | ⬜ |
| EF-13b [S] | Journal « Derniers paiements » sur la fiche | ⬜ |
| EF-43 [S] | Historique des dépenses étendu à 24 mois | ⬜ |
| EF-44b [S] | Vue « Foyer & partage » | ⬜ |

## Évolutions (hors V1, non planifiées)

| Réf. | Piste |
|---|---|
| EF-33 | Notifications Web Push (nécessite un serveur d'envoi, §5.4) |
| §5.6 | Catalogue et taux chargés à distance (lecture seule, fallback embarqué) ; synchronisation multi-appareils |
| C1 | Rappel de sauvegarde / export automatique périodique |
| C3 | Détection de doublons à la création manuelle |
| C7 | Onboarding au premier lancement |
| C8 | Verrouillage de l'app (code / WebAuthn) |
| C9 | Rapport annuel exportable |
| C10 | Pictos de marques (dépendance npm) + upload de logo personnel |
| C12 | Compteur d'économies réalisées |
| C14 | Rappel libre à date par abonnement |
| C15 | Veille tarifaire : catalogue distant, comparaison locale des prix |
