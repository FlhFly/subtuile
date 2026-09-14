# CLAUDE.md — Subtuile

## Projet
PWA de suivi d'abonnements et contrats récurrents. 100 % local,
hors ligne, zéro tracking, open source (AGPL-3.0).
**docs/CdC.md (v1.24) fait foi** sur le périmètre ; docs/maquette-v6.html
est la référence visuelle (référence, PAS une base de code).
En ligne : https://subtuile.com (GitHub Pages, domaine personnalisé via
public/CNAME, déployé par
.github/workflows/deploy.yml à chaque push sur main : build puis push de
dist/ sur la branche gh-pages, publiée par Pages en « Deploy from a branch »).

## Stack
React 18 + Vite + TypeScript strict · Dexie (IndexedDB) · date-fns ·
Vitest · vite-plugin-pwa (manifeste + service worker, §5.2) · CSS avec variables (src/ui/theme/tokens.css, extraites de la
maquette). Pas d'autre dépendance sans validation.

## Méthode de travail (impératif)
- Livraison par étapes : à chaque étape terminée → tests verts →
  UN commit avec message clair → attendre la validation de FlhFly
  avant l'étape suivante. Tag `lot-N` à la fin de chaque lot.
- Jamais plusieurs étapes d'un coup. Jamais de commit sans tests verts.
- Réponses concises, en français.

## Fichiers à tenir à jour (dans le même commit que l'étape)
- CHANGELOG.md : chaque étape committée ajoute son entrée détaillée dans
  « Non publié » (Ajouté / Modifié / Corrigé), insérée EN TÊTE de la
  section : l'entrée la plus récente est toujours la première. Au tag de
  lot, la section devient une version : 0.N.0 = lot N, 1.0.0 = mise en
  ligne (lot 4).
- src/data/notesDeVersion.ts : à chaque nouvelle version (tag de lot ou
  correctif 1.0.x), notes destinées aux utilisateurs, en fr et en en, concises ;
  la première entrée est la version de package.json (test). Entre deux lots,
  les corrections sortent en 1.0.x : section CHANGELOG, sans tag.
- ROADMAP.md : statut des étapes et des exigences livrées (⬜ → 🔄 → ✅,
  avec le tag ou le commit). Jamais de feature livrée sans sa case cochée ;
  toute exigence ajoutée ou déplacée entre lots y est reportée.
- README.md : ligne « Statut » (lot livré, version, adresse en ligne) mise à
  jour à chaque tag de lot ; fonctionnalités listées = fonctionnalités réelles.
- docs/CdC.md : cahier des charges de l'application ; toute évolution du
  périmètre s'y reporte. Il reste strictement centré sur le produit :
  aucune donnée personnelle, aucun sujet hors application.
- Les dossiers ignorés par git (docs/prive/, docs/maquette-v6-sources/)
  sont des documents de travail locaux : ne jamais les versionner ni en
  recopier le contenu dans le dépôt.
- Identité : l'auteur est désigné par son pseudo FlhFly (code, docs,
  commits).

## Architecture (règles non négociables)
- Tout accès aux données passe par StorageProvider (src/data/storage/).
  AUCUN appel Dexie direct depuis les composants.
- Données de référence (catalogue, taux) via RefDataProvider :
  contrat { version, publieLe, data }, fallback embarqué.
- Toutes les entités portent id (uuid), updatedAt, deletedAt
  (suppression logique) — CdC §3.5. Export JSON avec schemaVersion.
- Moteur de dates dans src/domain/dates.ts UNIQUEMENT, en date locale
  (jamais UTC). Règle des mois courts : échéance sur jour 29-31
  absent du mois → dernier jour du mois. Tests exhaustifs obligatoires
  (mensuel, trimestriel, annuel, hebdo, 28 jours, à vie, à l'usage).
- Tous les libellés via src/i18n/ (fr + en). Aucune chaîne en dur
  dans les composants.
- Préférences UI en localStorage ; données métier en IndexedDB.
- Aucune requête réseau. Aucun tracking. Aucun secret dans le code.
- Champ logo : objet { type, valeur }, rendu à repli
  icone → upload → initiales (V1 : initiales seulement).
- Ids du catalogue : stables, jamais renommés ni réutilisés.

## Commandes
npm run dev · npm run test · npm run typecheck · npm run lint · npm run format · npm run build ·
node scripts/generer-icones.cjs (régénère les icônes PWA de public/icons/) ·
build servi à la racine du domaine (aucun --base)

## Definition of done (toute étape)
Tests verts + lint OK + conforme au CdC + i18n complet + CHANGELOG.md et
ROADMAP.md à jour + commit.
