# Changelog

Toutes les évolutions notables de Subtuile sont consignées ici.
Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) ;
versionnage sémantique : `0.N.0` = fin du lot N (tag `lot-N`), `1.0.0` = mise en ligne.
Chaque étape committée ajoute son entrée dans « Non publié ».

## [Non publié]

### Lot 1 — étape 7 : tri, filtres, recherche, annulation par toast (2026-09-09)

#### Ajouté
- `src/domain/tri.ts` : critères de l'accueil (EF-12) — tri (échéance, prix, nom, catégorie ;
  « ordre personnalisé » attend le drag & drop du lot 4), filtre par statut (tous = non
  archivés, actifs, en pause, résiliés, archivés), par catégorie, par moyen de paiement, par tag
  (insensible à la casse et aux accents), recherche textuelle (EF-15) sur le nom, les tags, la
  référence client et les notes, tolérante aux accents et à la casse ; `appliquerCriteres`
  compose le tout, `compterParStatut` et `tagsDisponibles` alimentent les panneaux.
- Composant `BarreTriFiltres`, repris de la maquette : bouton recherche ouvrant un champ, chips
  « Trier », « Statut », « Catégorie », « Paiement », « Tag » ouvrant un panneau d'options avec
  sous-libellés (description du tri, nombre d'abonnements, pastille du moyen de paiement) et
  coche de sélection, lien « Réinitialiser les filtres », bascule grille / liste intégrée.
- Accueil : le tri est persisté dans les préférences, filtres et recherche valent pour la
  session ; états vides distincts pour une recherche sans résultat et des filtres sans
  correspondance ; les totaux en tête restent calculés sur tous les abonnements actifs.
- Annulation par toast (EF-01b) : après suppression (restauration du tombstone), mise en pause,
  reprise, archivage et désarchivage, le toast propose « Annuler » pendant ~6 s et confirme
  « Action annulée ».
- Icônes recherche, fermer, coche, chevron.
- Tests : filtres par statut et compteurs, tags, recherche (nom, tag, référence, notes, accents),
  composition des critères sur le jeu de démo. 158 tests.

### Lot 1 — étape 6 : fiche détail et formulaire de création / édition (2026-09-09)

#### Ajouté
- `src/domain/formulaire.ts` : modèle du formulaire en saisie libre (EF-01, EF-02), sans
  React — état des champs tels que saisis, analyse des montants (« 9,99 », « 1 234,50 € »),
  entiers, tags, adresses (schéma https ajouté, validation), conversion périodicité ↔ presets
  (mensuel, annuel, hebdo, trimestriel, « autre » = intervalle + unité, à vie, à l'usage avec
  plafond), validation champ par champ (requis, nombre, entier, date, date antérieure au début,
  part supérieure au total, adresse), construction de l'`Abonnement` : création complète via la
  fabrique, ou modification conservant id, statut et dates techniques, avec versement d'une
  hausse dans l'historique des prix (EF-08) et recalcul de l'échéance.
- `src/domain/dates.ts` : `anciennete` (années, mois, jours civils) pour « Abonné depuis »
  (EF-18) ; libellé `libelleDuree` fr / en (« 2 ans et 3 mois », « 12 j », « aujourd'hui »).
- `src/data/services/abonnements.ts` : `enregistrerAbonnement`, `changerStatut` (EF-06, avec
  recalcul de l'échéance), `supprimerAbonnement` (suppression logique, restaurable).
- Écran `Fiche` (EF-13, §7.2) conforme à la maquette : en-tête coloré comme la tuile avec badges
  canal et statut, ligne de prix, chip compteur ; bouton « Gérer / Résilier » ouvrant l'adresse
  de gestion (routage par canal et modes hors ligne au lot 2) ; encarts essai, engagement (fin
  et date limite de préavis), hausse annoncée, régularisation, pause, résiliation, archive ;
  détails (référence client copiable, échéance, périodicité, formule du catalogue, plafond, coût
  mensuel normalisé, abonné depuis, canal, moyen de paiement, mode de résiliation) ; partage,
  tags, historique des prix avec écarts, notes ; actions modifier, pause / reprise, archiver /
  désarchiver ; zone danger avec dialogue de confirmation avant suppression définitive (EF-01).
- Écran `Edition` (§7.3) : nom, prix, catégorie, type et presets de périodicité, périodicité
  personnalisée (« tous les N jours / semaines / mois / ans »), date de début avec aperçu de
  l'échéance calculée, surcharge manuelle de l'échéance, plafond à l'usage ; dépliant « options
  avancées » : essai, engagement, partage, montant estimé + régularisation, hausse annoncée,
  moyen de paiement, canal d'achat, mode de résiliation + contact, référence client, adresse,
  alerte J-X (défaut ou préréglages 1 / 2 / 3 / 7 / 14), tags, notes. Pour un abonnement
  partagé, le champ « Prix » est le prix plein et seule « Ma part » est demandée (le prix
  total du partage en est dérivé), afin de ne pas avoir deux notions de prix. Erreurs affichées sous
  chaque champ. Le mode catalogue arrive au lot 2.
- Composants : `Chips`, `Champ` (libellé, aide, erreur, câblage aria), `Interrupteur`,
  `BarreNavigation` (Accueil, +, Réglages — échéancier et finances n'apparaîtront qu'avec leurs
  lots), `ToastContextProvider` + `useToast` (EF-19, retour visuel ~3 s ; variante avec action
  ~6 s prête pour l'annulation de l'étape 7).
- `App` : écrans fiche et édition en pile, barre de navigation sur accueil et réglages ; la
  tuile ouvre la fiche, le « + » et l'état vide ouvrent la création.
- i18n fr / en : fiche, formulaire, erreurs, toasts, durées.
- Tests : `formulaire.test.ts` (analyse des saisies, presets, validation, création, aller-retour
  exact sur les 13 abonnements de démo, hausse versée dans l'historique), ancienneté, actions de
  statut et suppression, durées. 154 tests.

### Lot 1 — étape 5 : accueil en tuiles, compteur J-X, codes couleur, grille / liste (2026-09-09)

#### Ajouté
- `src/domain/tuile.ts` : modèle de présentation pur d'une tuile (EF-10, EF-11), testable sans
  React — variante de fond selon le statut (colorée / sable en pause / neutre pointillée),
  compteur dans l'ordre de priorité de la maquette (archivé, en pause, résilié → date, essai
  J-X, préavis J-X si ≤ 14 j, à vie, à l'usage, échéance J-X · date avec niveau vert / orange /
  rouge), sous-titre (à l'usage avec plafond, essai « puis X », partage « ma part X », prix
  éventuellement « ~ » estimé), pastille du moyen de paiement, badge canal. Logo à chaîne de
  repli (§3.4) : initiales de l'abonnement → du service → du nom ; les types icone / upload
  retombent sur les initiales sans casser l'affichage. Couleur : abonnement → service → défaut.
- `src/domain/tri.ts` : tri par échéance (défaut EF-12 : essai en cours, puis prochaine
  échéance, sans échéance en dernier, nom pour départager), et déjà prix, nom, catégorie,
  ordre personnalisé ; filtre « non archivés » (EF-06).
- Composant `Tuile` (grille et ligne, EF-12b) reprenant les valeurs de la maquette v6 : logo
  30 px, badge paiement, nom + badges « partagé » et canal, chip compteur coloré (blanc sur
  tuile colorée), contour violet pendant un essai, opacité réduite si archivé. Accessible :
  bouton avec libellé « Ouvrir {nom} », focus visible.
- Composant `BasculeAffichage` (grille / liste), persisté dans les préférences (EF-12b).
- Accueil (§7.1) conforme à la maquette : total mensuel normalisé en grand avec nombre
  d'actifs, total annuel, bouton réglages, barre avec compteur d'abonnements et bascule,
  grille 2 colonnes ou liste, état vide. Les archivés sont masqués ; les tuiles s'ouvriront
  sur la fiche à l'étape 6.
- Hooks `useMoyensPaiement` (index par id, rechargé à chaque écriture) et `useCatalogue`
  (via le RefDataProvider).
- i18n fr / en : libellés de tuile, compteur (« J-3 · 18/08/2026 », « Aujourd'hui »,
  « J+2 »), moyens de paiement courts, « {n} actifs », « ≈ X / an ».
- Tests : `tuile.test.ts` (logo et couleur à repli, variantes, compteurs et sous-titres sur
  le jeu de démo, priorité essai > préavis), `tri.test.ts` (ordre exact de la démo par
  échéance, prix, nom, catégorie, personnalisé, non-mutation). 136 tests.

#### Corrigé
- Le bouton « Charger le jeu de démo » chargeait les dates figées de la maquette (16/08) au lieu
  de les décaler au jour courant : les compteurs (Strava J-2, essai Disney+, préavis Basic-Fit)
  étaient déjà passés à l'ouverture. `chargerJeuDemo` décale désormais au jour courant par défaut.

### Lot 1 — étape 4 : i18n, thème, squelette de l'app, réglages (2026-09-09)

#### Ajouté
- `src/i18n/` : dictionnaires `fr` (référence) et `en` typé sur le français — toute clé
  manquante ou en trop est une erreur de compilation (EF-17b). Clés plates par domaine
  (navigation, accueil, réglages, énumérations du modèle : catégories, statuts, canaux, modes
  de résiliation, moyens de paiement, périodicités, thèmes, tris), interpolation `{param}`,
  singulier / pluriel, détection de la langue du navigateur, formats localisés via `Intl`
  (montants, dates civiles sans décalage de fuseau, compteur « J-X » / « D-X », libellés de
  périodicité dont « tous les 28 jours »).
- `src/data/preferences.ts` : préférences d'interface en localStorage (§3.5) — langue, thème,
  affichage grille / liste, tri, devise d'affichage, défauts d'alerte EF-30 (J-3, essai J-2,
  préavis J-14, carte M-1). Lecture tolérante : JSON corrompu ou valeur inconnue → défaut.
- `src/ui/theme/theme.ts` : thème clair / sombre / système appliqué par `data-theme` sur la
  racine (EF-17), la préférence système restant gérée par tokens.css.
- Contextes React : `StorageContextProvider` + `useStorage` (seul accès aux données depuis
  l'UI), `PreferencesContextProvider` + `usePreferences` (persistance, application du thème et
  de la langue du document), `useI18n` (traduction et formats liés à la langue courante).
- `src/data/services/abonnements.ts` : `chargerAbonnementsAJour` — liste mise au jour (échéances
  dépassées recalculées, prix futurs appliqués), une seule écriture groupée pour les entités
  modifiées, aucune réécriture sinon. Hook `useAbonnements` abonné aux changements du stockage.
- Composants : `Icone` (famille linéaire SVG, sans asset de marque), `Segmente` (sélecteur
  segmenté accessible), `EnTete` (titre, sous-titre, actions).
- Écrans : `Accueil` en squelette (en-tête avec nombre d'abonnements et total mensuel
  normalisé marqué « ~ » si un montant est estimé, état vide, liste provisoire) ; `Reglages`
  minimal (§7.7) — apparence, langue, chargement du jeu de démo (§5.5), confidentialité,
  à propos avec version injectée par Vite et lien vers le dépôt.
- `App.tsx` : fournisseurs de contexte et navigation par état entre Accueil et Réglages, sans
  routeur.
- Tests : `i18n.test.ts` (mêmes clés et mêmes paramètres fr / en, couverture des énumérations,
  formats), `preferences.test.ts`, `theme.test.ts`, `abonnementsService.test.ts`. 118 tests.

### Lot 1 — étape 3 : stockage, données de référence, fixtures (2026-09-09)

#### Ajouté
- `src/data/storage/StorageProvider.ts` : couche d'accès unique (§5.6). Un `Depot<T>` par
  entité (lister, lire, enregistrer, enregistrerPlusieurs, supprimer logique, restaurer, purger
  les tombstones), export / import JSON (fusion « dernière écriture gagne » par id, ou
  remplacement), `effacerTout`, souscription aux changements.
- `src/data/storage/dexieProvider.ts` : implémentation IndexedDB via Dexie 4, base `subtuile`
  v1 (trois tables, index sur échéance, catégorie, statut, moyen de paiement, service).
  `updatedAt` posé par le dépôt à chaque écriture ; refus d'un export de schéma plus récent.
- `src/data/refdata/RefDataProvider.ts` : contrat `{ version, publieLe, data }` (§5.6),
  sources embarquées, validation complète des JSON (catégories, périodicités, canaux, ids de
  services et de formules uniques, taux positifs, base EUR), aides `trouverService` /
  `trouverFormule`.
- `src/data/refdata/catalogue.json` (v1, tarifs indicatifs au 24/08/2026) : 12 services avec
  formules à ids stables — Strava, Netflix, Amazon Prime, Claude, ChatGPT (direct 20 € /
  App Store 23 €, illustre EF-02), Disney+, Canal+, Spotify, Dropbox, iCloud+ (App Store,
  deep link EF-21), EDF et Engie (vie courante : montant estimé, résiliation par téléphone).
- `src/data/refdata/taux.json` (v1, 24/08/2026) : taux indicatifs EUR → USD, GBP, CHF (EF-45).
- `src/domain/fabriques.ts` : `creerAbonnement` (défauts, historique initial, échéance
  calculée), `actualiserAbonnement` (prix futur + échéance, sans écriture inutile),
  `creerMoyenPaiement`, `periodicitePersonnalisee`.
- `src/data/fixtures/demo.ts` : jeu de démo de la maquette v6 (13 abonnements, 4 moyens de
  paiement) à ids stables, dates décalées pour conserver les compteurs de la maquette
  (Strava J-2, essai Disney+ J-5, préavis Basic-Fit J-10…) ; `chargerJeuDemo` idempotent.
- `src/lib/ids.ts` (uuid natif), `src/lib/horloge.ts` (instant injectable),
  `decalerJours` dans le moteur de dates.
- Tests : `storage.test.ts` (CRUD, tombstones, restauration, purge, souscription, export /
  import fusion et remplacement), `refdata.test.ts` (contrat, unicité des ids, validation),
  `fabriques.test.ts`, `fixtures.test.ts` (échéances et codes couleur de la maquette,
  cohérence référentielle, chargement idempotent). 98 tests au total.
- Dépendance de développement `fake-indexeddb` (IndexedDB en mémoire pour Vitest).

### Lot 1 — étape 2 : modèle de données et moteur d'échéances (2026-09-08)

#### Ajouté
- `src/domain/types.ts` : modèle §3 complet. `Abonnement` (serviceId, formuleId, périodicité,
  montantEstime, regularisation, prixFutur, modeResiliation + contactResiliation,
  referenceClient, essai, engagement, partage, canalAchat, statut en union discriminée avec
  reprise automatique de pause, historiquePrix, tags…), `MoyenPaiement`, `Service` + `Formule`
  (ids stables), `ServicePersonnalise`, logo évolutif `{ type, valeur }`, champs techniques §3.5
  (`id`, `updatedAt`, `deletedAt`), contrat `RefData { version, publieLe, data }` pour le
  catalogue et les taux, `Preferences` d'interface, `ExportJSON` avec `SCHEMA_VERSION`.
  Ajouts hors tableau §3.1, justifiés par des EF : `echeanceManuelle` (surcharge de l'échéance
  calculée), `couleur` / `logo` (saisie libre, EF-10), `alerteJoursAvant` (EF-30), `ordre`
  (EF-14). Convention : `historiquePrix` est la chronologie des prix en vigueur.
- `src/domain/dates.ts` : moteur d'échéances en date civile locale, sans lecture implicite de
  l'horloge. Occurrences calculées depuis l'ancrage (jamais de dérive 31 → 28 → 28), règle des
  mois courts et 29 février, toutes périodicités (jour, semaine, mois, an × intervalle),
  `calculerProchaineEcheance` (surcharge manuelle, cycle payant ancré à la fin d'essai, statuts
  sans renouvellement), `occurrencesEntre` (base du prévisionnel et du journal des paiements),
  engagement avec reconduction tacite et date limite de préavis (EF-05), compteur J-X et niveau
  d'urgence ok / warn / urg / trial (EF-11, seuils 14 et 3 jours), normalisation mensuelle et
  annuelle sur 365,25 jours (EF-40), part payée (EF-44), prix futur (EF-08b).
- `tests/dates.test.ts` : 56 tests — validation et parsing local (sans UTC), mois courts,
  bissextiles, trimestriel, semestriel, hebdo, 28 jours, personnalisées, ancrages vieux de 20 ans,
  passage d'échéance, J-0, statuts, essai, engagement, seuils de couleur, montants, prix futur.

### Lot 1 — étape 1b : police embarquée (2026-09-08)

#### Ajouté
- Police Space Grotesk de la maquette embarquée dans le bundle via
  `@fontsource-variable/space-grotesk` (police variable, licence OFL 1.1, 56 ko de woff2
  découpés par plage Unicode). Aucune requête réseau ; `--font-sans` pointe sur
  « Space Grotesk Variable » avec la pile système en repli.

### Lot 1 — étape 1 : initialisation du projet (2026-09-08)

#### Ajouté
- Projet Vite 7 + React 18.3 + TypeScript 5.9 strict (`noUncheckedIndexedAccess`,
  `verbatimModuleSyntax`, projet en références `tsconfig.app.json` / `tsconfig.node.json`).
- Dépendances d'exécution épinglées : `react`, `react-dom`, `dexie` 4, `date-fns` 4.
- Outillage : Vitest 5 (`npm test`), ESLint 9 en configuration plate avec typescript-eslint et
  `eslint-plugin-react-hooks` (`npm run lint`), Prettier 3 (`npm run format`), `npm run typecheck`,
  `npm run build`.
- `src/ui/theme/tokens.css` : tokens extraits de la maquette v6 — palettes clair et sombre
  (surfaces, encre, sable, carte, traits), couleurs d'état du compteur J-X (ok / warn / urg /
  trial), ombres, typographie (échelle de tailles, graisses, interlettrage), rayons, espacements,
  durées. Thème sombre via `[data-theme="sombre"]` ou préférence système (EF-17, bascule à
  l'étape 4).
- `src/ui/theme/base.css` : reset minimal et styles globaux.
- `index.html`, `src/main.tsx`, `src/App.tsx` (squelette affichant la marque),
  `src/vite-env.d.ts`.
- `tests/smoke.test.ts` : test de fumée de l'outillage.
- `.gitattributes` (LF partout), `.prettierrc`, `.prettierignore`, `.gitignore` complété
  (`coverage/`, `*.tsbuildinfo`, `.vite/`).

## [0.0.0] — 2026-09-08 — tag `init`

### Ajouté
- Initialisation du dépôt Subtuile sous licence AGPL-3.0 (LICENSE : texte officiel intégral,
  copyright FlhFly ; nom et logo hors licence, tous droits réservés).
- README.md, CONTRIBUTING.md (clause de re-licenciement), CLAUDE.md (méthode et règles
  d'architecture), .gitignore, CHANGELOG.md, ROADMAP.md (avancement par lot et par exigence).
- Arborescence cible du kit de démarrage (§2) : `src/domain`, `src/data/{storage,refdata,fixtures}`,
  `src/i18n`, `src/ui/{theme,components,screens}`, `src/lib`, `public`, `tests`.
- Documentation : `docs/CdC.md` (v1.15, fait foi),
  `docs/maquette-v6.html` (référence visuelle). Les documents de travail et les sources de
  maquette restent locaux (ignorés par git).
