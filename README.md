# Subtuile

Suivi d'abonnements et de contrats récurrents. Gratuit, open source,
hors ligne, zéro tracking : vos données ne quittent jamais votre appareil.

- 🗂 Tuiles avec compteur de renouvellement
- 🔔 Alertes fins d'essai, préavis, régularisations
- 💳 Moyens de paiement et canal d'achat (App Store / direct)
- 📊 Vue financière, prévisionnel 12 mois
- 🌐 FR / EN — PWA installable

**Statut : en développement — lot 3/4 « Cas particuliers & alertes » livré (v0.3.0), lot 4 à venir.**

Disponible aujourd'hui : accueil en tuiles avec compteur J-X, codes couleur et pastille du
moyen de paiement, cloche et centre d'alertes (renouvellement J-X, fin d'essai, préavis,
carte expirant, régularisation, hausse annoncée ; défauts réglables), échéancier en liste par
mois ou en calendrier, fiche détail (engagement et date limite, historique des prix avec
changement de prix à date, duplication, rappel calendrier .ics), création et édition en
saisie libre ou depuis le catalogue (79 services avec formules et tarifs indicatifs, « moins
cher en direct », suggestions, « Proposer un service »), garde contre la perte de saisie,
moyens de paiement, bouton « Gérer / Résilier » routé selon le canal avec démarches hors
ligne et proposition « résilié — actif jusqu'au », cycle de vie automatique (essai → payant,
hausse appliquée, résilié archivé, pause reprise, régularisation reportée), toutes
périodicités, tri, filtres, recherche, annulation par toast, thème clair / sombre / système,
format de date au choix, interface FR / EN, jeu de démonstration.

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
```

Stack : React 18, Vite, TypeScript strict, Dexie (IndexedDB), date-fns, Vitest.
Règles d'architecture et méthode de travail : [CLAUDE.md](CLAUDE.md).

## Licence
AGPL-3.0 — voir [LICENSE](LICENSE).

**Logo et nom « Subtuile » : tous droits réservés, hors licence AGPL.**

## Soutenir
<!-- lien de don à ajouter à la mise en ligne -->

## Crédits
- Police [Space Grotesk](https://github.com/floriankarsten/space-grotesk) de Florian Karsten, licence SIL OFL 1.1, embarquée via fontsource.
