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
