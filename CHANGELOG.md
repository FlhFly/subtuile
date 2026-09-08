# Changelog

Toutes les évolutions notables de Subtuile sont consignées ici.
Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) ;
versionnage sémantique : `0.N.0` = fin du lot N (tag `lot-N`), `1.0.0` = mise en ligne.
Chaque étape committée ajoute son entrée dans « Non publié ».

## [Non publié]

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
