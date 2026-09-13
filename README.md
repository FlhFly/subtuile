# Subtuile

Suivi d'abonnements et de contrats récurrents. Gratuit, open source,
hors ligne, zéro tracking : vos données ne quittent jamais votre appareil.

**Application : <https://flhfly.github.io/subtuile/>** — s'installe sur l'écran d'accueil et
fonctionne sans réseau.

- 🗂 Tuiles avec compteur de renouvellement, ordre personnalisé
- 🔔 Alertes fins d'essai, préavis, régularisations, hausses annoncées
- 💳 Moyens de paiement et canal d'achat (App Store / direct)
- 📊 Vue financière : totaux, répartitions, prévisionnel 12 mois, dépenses passées
- 💱 Devises EUR / USD / GBP / CHF à taux indicatifs
- 💾 Export / import JSON, import CSV, rappels calendrier .ics
- 🌐 FR / EN — PWA installable, 100 % hors ligne

**Statut : v1.0.1 — lot 4/4 « Finances & données » livré, application en ligne ; corrections au
fil des retours. Lot 5 « Pilotage » à venir.**

## Installation
Subtuile est un site web installable (PWA). Ouvrez <https://flhfly.github.io/subtuile/> puis :

- **Android (Chrome)** : menu ⋮ → « Installer l'application », ou la rangée « Installer
  l'application » dans Réglages › À propos.
- **iPhone / iPad (Safari)** : Partager → « Sur l'écran d'accueil ».
- **Ordinateur (Chrome, Edge)** : icône d'installation dans la barre d'adresse.

Ouverte une première fois, l'app fonctionne entièrement hors ligne ; une nouvelle version est
proposée à l'ouverture (« Recharger »). Aucune donnée ne quitte l'appareil : pas de compte, pas
de serveur, pas de tracking. Pensez à exporter une sauvegarde JSON depuis Réglages › Données.

## Fonctionnalités
Accueil en tuiles avec compteur J-X, codes couleur et pastille du moyen de paiement, tri (dont
ordre personnalisé par glisser-déposer), filtres, recherche, grille ou liste ; cloche et centre
d'alertes (renouvellement, fin d'essai, préavis, carte expirant, régularisation, hausse
annoncée ; défauts réglables) ; échéancier en liste par mois ou en calendrier ; fiche détail
(engagement et date limite, historique des prix, changement de prix à date, duplication, rappel
.ics) ; création et édition en saisie libre ou depuis le catalogue (79 services avec formules et
tarifs indicatifs, « moins cher en direct », suggestions, « Proposer un service »), garde contre
la perte de saisie ; moyens de paiement ; « Gérer / Résilier » routé selon le canal, démarches
hors ligne, « résilié — actif jusqu'au » ; cycle de vie automatique (essai → payant, hausse
appliquée, résilié archivé, pause reprise, régularisation reportée) ; toutes périodicités ;
finances (total mensuel normalisé et annuel, répartition par catégorie et par moyen de paiement,
prévisionnel 12 mois, dépenses passées) ; devise par abonnement et devise d'affichage à taux
indicatifs ; export / import JSON (fusion ou remplacement), import CSV ; PWA hors ligne ;
onboarding à la première ouverture ; thème clair / sombre / système, format de date au choix,
interface FR / EN, jeu de démonstration.

## Documentation
- [Cahier des charges](docs/CdC.md) — fait foi sur le périmètre
- [Maquette v6](docs/maquette-v6.html) — référence visuelle
- [Roadmap](ROADMAP.md) — avancement par lot · [Changelog](CHANGELOG.md)

## Développement
Prérequis : Node.js ≥ 20.

```
npm install        # dépendances
npm run dev        # serveur de développement (http://localhost:5173)
npm test           # tests unitaires (Vitest)
npm run lint       # ESLint
npm run build      # build de production dans dist/
npm run preview    # sert dist/ avec le service worker (test du hors ligne)
```

Stack : React 18, Vite, TypeScript strict, Dexie (IndexedDB), date-fns, vite-plugin-pwa, Vitest.
Règles d'architecture et méthode de travail : [CLAUDE.md](CLAUDE.md).

Déploiement : chaque push sur `main` lance [deploy.yml](.github/workflows/deploy.yml) (lint,
tests, build avec `--base=/subtuile/`) et pousse `dist/` sur la branche `gh-pages`, servie par
GitHub Pages. Prérequis, une seule fois : Settings › Pages du dépôt, source « Deploy from a
branch », branche `gh-pages`, dossier `/ (root)`.

## Licence
AGPL-3.0 — voir [LICENSE](LICENSE).

**Logo et nom « Subtuile » : tous droits réservés, hors licence AGPL.**

## Soutenir
L'app est gratuite, sans pub ni tracking. Un don libre aide à la faire vivre :

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/M1G426XAKZ)

## Crédits
- Police [Space Grotesk](https://github.com/floriankarsten/space-grotesk) de Florian Karsten, licence SIL OFL 1.1, embarquée via fontsource.
