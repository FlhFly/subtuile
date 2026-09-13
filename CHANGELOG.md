# Changelog

Toutes les évolutions notables de Subtuile sont consignées ici.
Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) ;
versionnage sémantique : `0.N.0` = fin du lot N (tag `lot-N`), `1.0.0` = mise en ligne.
Chaque étape committée ajoute son entrée dans « Non publié ».

## [Non publié]

### Lot 4 — correctif de déploiement (2026-09-13)

#### Corrigé
- Workflow GitHub Pages : le premier déploiement échouait à l'activation automatique de Pages,
  que le jeton du workflow n'a pas le droit de faire, et le réglage « GitHub Actions » renvoyait
  une erreur côté GitHub. Le workflow publie désormais `dist/` (avec `.nojekyll`) sur la branche
  `gh-pages`, que Pages sert en « Deploy from a branch » ; documenté dans le README.

## [1.0.0] — 2026-09-13 — tag `lot-4` — Finances & données, mise en ligne

Lot 4 du CdC §6 : moteur financier et écran Finances (totaux normalisés, répartitions,
prévisionnel 12 mois, dépenses passées), devises à taux indicatifs et devise par abonnement,
export / import JSON et import CSV, réorganisation des tuiles par glisser-déposer, PWA
installable et hors ligne, onboarding à la première ouverture, mise en ligne sur GitHub Pages.
Critère de validation « totaux vérifiés à la main sur le jeu de démo ; app installée et
fonctionnelle hors ligne » rejoué par un test de recette (totaux recomposés à la main) et
vérifié à l'écran par FlhFly (installation, coupure réseau) avant le tag.

### Lot 4 — étape 8 : revue finale, recette, version 1.0.0, mise en ligne (2026-09-13)

#### Ajouté
- `tests/lot4.recette.test.ts` : jeu de démo chargé dans le stockage à sa date de référence ;
  total mensuel recomposé à la main abonnement par abonnement (163,69 €, 8 payants, exclusions
  justifiées : essai, résilié, pause, archivé, à l'usage), répartition par catégorie et
  prévisionnel août / septembre à la main, conversion en dollars, export JSON relu puis
  réimporté en fusion et en remplacement dans un second stockage, ordre personnalisé persisté,
  configuration hors ligne et manifeste, onboarding à la première ouverture. 307 tests.
- Déploiement continu : `.github/workflows/deploy.yml` (lint, tests, build avec
  `--base=/subtuile/`, publication sur GitHub Pages à chaque push sur `main`).

#### Modifié
- Version 1.0.0 ; README finalisé (adresse de l'application, installation Android / iOS /
  ordinateur, fonctionnalités réelles, déploiement) ; ROADMAP (lot 4 ✅, lot 5 « prochain ») ;
  CLAUDE.md (adresse en ligne, règle du statut README).
- Audit des règles d'architecture : Dexie confiné au stockage, aucune requête réseau hors
  enregistrement du service worker, libellés fr / en à parité, dates locales, aucune chaîne en
  dur.

### Lot 4 — étape 7 : onboarding à la première ouverture (2026-09-13)

#### Ajouté
- Onboarding (C7, maquette v6) en trois écrans, affiché à la première ouverture : présentation
  (100 % local et hors ligne, échéances, finances, alertes), puis devise par défaut, langue et
  format de date (chaque choix est enregistré aussitôt dans les préférences), puis premier
  abonnement : « Choisir dans le catalogue », « Importer des données (JSON / CSV) »,
  « Découvrir avec le jeu de démonstration » ou « Plus tard ». « Passer » en haut à droite à
  tout moment ; pastilles d'étape et bouton « Continuer » / « Commencer » en bas.
- Réglages › Général › « Revoir l'introduction » rejoue le parcours.
- Préférence `onboardingVu` (localStorage) : les utilisateurs existants voient l'introduction
  une fois à la prochaine ouverture.

#### Modifié
- Écran Import : retour vers l'écran d'origine (accueil depuis l'onboarding, réglages sinon).
- Drapeaux des langues extraits en composant partagé (réglages, onboarding).
- CdC v1.17 : onboarding décrit en §7.10, C7 marqué réalisé.

### Lot 4 — étape 6 : PWA installable et hors ligne, À propos (2026-09-12)

#### Ajouté
- PWA (§5.2, EF-51) : manifeste (nom, affichage autonome, couleurs du thème, icônes 192 / 512
  et maskable), service worker généré par vite-plugin-pwa (outil prévu au CdC §5.1) qui
  précache tout le bundle, police comprise : l'app fonctionne intégralement hors ligne une
  fois ouverte. Toast « Prête à fonctionner hors ligne » ; quand une nouvelle version attend,
  toast « Nouvelle version disponible » avec « Recharger ».
- Icônes de l'app générées par `scripts/generer-icones.cjs` (PNG écrits sans dépendance,
  motif de quatre tuiles aux couleurs des tokens), favicon SVG, icône iOS, couleur de barre
  système clair / sombre.
- Réglages › À propos : « Installer l'application » quand le navigateur fournit l'invite
  native (Chrome, Edge, Android) ; sur iPhone / iPad, rappel du chemin Partager → « Sur
  l'écran d'accueil » ; « Application installée » en mode autonome. « Soutenir le projet »
  reste masqué tant qu'aucun lien de don n'est fourni (§4.7).

#### Modifié
- Dépendance de développement ajoutée : vite-plugin-pwa 1.3.0 (workbox), conformément au
  CdC §5.1. Le chemin de base d'un déploiement sous sous-dossier se passe à la construction
  (`vite build --base=…`) ; manifeste et service worker le suivent.

### Lot 4 — étape 5 : réorganisation des tuiles, tri « ordre personnalisé » (2026-09-12)

#### Ajouté
- Tri « Ordre personnalisé » (EF-14) : le choisir ouvre le mode réorganisation de la maquette :
  bandeau « Glissez les tuiles pour les réordonner » avec bouton « Terminé », tuiles qui
  tremblent, filtres et recherche remis à zéro pour voir toute la liste. Les tuiles se déplacent
  au doigt ou à la souris (événements pointeur, en grille comme en liste) et au clavier (flèches
  sur une tuile ayant le focus). Chaque déplacement est enregistré aussitôt ; « Terminé »
  confirme par un toast. Le tremblement est coupé si le système demande moins de mouvement.
- Au premier passage en « Ordre personnalisé », l'ordre de départ est celui affiché à cet
  instant (par exemple le tri par prix) ; ensuite chaque abonnement garde sa position, un
  abonnement jamais classé se place en fin de liste. Réorganiser une liste filtrée ne déplace
  pas les tuiles masquées.

#### Modifié
- Panneau « Trier par » complet : cinq options avec leur description, dont « Votre ordre —
  glissez pour réorganiser ».
- Domaine `ordre.ts` (déplacer, ordonner selon une suite d'identifiants, inscrire les
  positions) et service `enregistrerOrdre`, qui n'écrit que les positions qui changent.

### Lot 4 — correctif : la devise du réglage reste sélectionnée avec le catalogue (2026-09-12)

#### Corrigé
- Formulaire : avec une devise réglée sur le dollar, choisir un service du catalogue forçait
  l'euro (retour FlhFly). Les tarifs du catalogue, en euros, sont désormais convertis dans la
  devise du réglage aux taux indicatifs, arrondis au centime, et la sélection reste sur cette
  devise ; changer de formule fait de même. Un abonnement existant garde sa propre devise.

### Lot 4 — étape 4 : export et import JSON, import CSV (2026-09-12)

#### Ajouté
- Réglages › Données : « Exporter (JSON) » télécharge la sauvegarde complète
  (`subtuile-sauvegarde-AAAA-MM-JJ.json`, schemaVersion, entités vivantes) ; « Importer
  (JSON / CSV) » ouvre l'écran d'import (EF-50, EF-52).
- Écran **Import de données** d'après la maquette : choix Sauvegarde JSON ou Tableur CSV
  (fichier lu sur l'appareil, rien n'est envoyé). JSON : nom du fichier, « n abonnements,
  n moyens de paiement détectés », date de l'export, « Fusionner avec l'existant » (garde la
  version la plus récente d'un même identifiant) ou « Tout remplacer » avec confirmation
  rouge rappelant ce qui sera effacé ; erreurs expliquées (JSON illisible, fichier étranger,
  schéma plus récent, structure abîmée). CSV : séparateur détecté (« ; », « , », tabulation),
  en-tête reconnu en français ou en anglais sinon ordre nom / prix / périodicité / échéance,
  aperçu des lignes reconnues, lignes ignorées avec leur raison, « Importer n lignes » ;
  échéance à venir posée en surcharge manuelle, échéance passée prise comme date de début,
  devise du réglage.
- `src/data/importExport.ts` (lecture tolérante : champs absents complétés par les fabriques,
  tombstones conservés, devise ou statut inconnus ramenés aux défauts) et `src/domain/csv.ts`
  (découpage avec guillemets, détection d'en-tête, mots de périodicité, dates au format choisi
  puis au format inverse). Tests `importExport.test.ts`. 286 tests.

### Lot 4 — étape 3 : devises — taux indicatifs, devise d'affichage, devise par abonnement (2026-09-12)

#### Ajouté
- Devise par abonnement (EF-45b) : puces « € · $ · £ · CHF » sur la même ligne que le champ
  prix, comme dans la maquette (retour FlhFly), devise proposée depuis le réglage « Devise »,
  note « Saisi en USD — converti en EUR dans les totaux (taux indicatifs au …) » quand la
  devise diffère ; les tarifs du catalogue restent en euros (repassage automatique en EUR
  quand une formule est appliquée). Les libellés de prix du formulaire affichent le symbole
  choisi. La devise suit l'abonnement sur la tuile, la
  fiche (prix, part, historique, changement de prix), les alertes, l'échéancier et les
  rappels .ics.
- Devise d'affichage (EF-45) : réglage « Devise » dans Réglages › Général (dépliant avec
  symboles, note « taux indicatifs au 24 août 2026 »), qui sert aussi de devise par défaut à
  la saisie. Les totaux de l'accueil et de Finances (totaux, répartitions, prévisionnel,
  dépenses passées) sont convertis au jeu de taux embarqué (`taux.json`, base EUR,
  RefDataProvider §5.6) ; note « Totaux convertis en … » dès qu'un abonnement est dans une
  autre devise ; sur la fiche, le coût mensuel d'un abonnement en devise étrangère est aussi
  donné converti.
- `src/domain/devises.ts` (symboles, conversion, convertisseur, détection d'une autre devise),
  moteur financier paramétré par un convertisseur, hooks `useTaux` et `useConversion`, tests
  `devises.test.ts`. 280 tests.

#### Modifié
- Modèle : `devise` d'un abonnement passe de « EUR seulement » à EUR / USD / GBP / CHF ; les
  données existantes (toutes en EUR) restent valides sans migration. CdC EF-45b : le réglage
  « Devise » est le même que la devise d'affichage en V1.

### Lot 4 — correctif après recette de l'étape 2 (2026-09-12)

#### Corrigé
- Le total mensuel de l'accueil comptait les abonnements en essai gratuit à leur plein tarif,
  alors que Finances les exclut tant que l'essai court (écart de 11,99 € constaté par FlhFly
  avec Disney+). L'accueil utilise maintenant le même calcul (`totaux`) que Finances.

#### Ajouté
- Réglages › Données : « Effacer toutes les données » avec confirmation (abonnements, moyens
  de paiement, services proposés ; les réglages restent), pour repartir de zéro.

### Lot 4 — étape 2 : écran Finances et onglet dans la barre (2026-09-12)

#### Ajouté
- Écran **Finances** (§7.5, écran 5 de la maquette) : cartes « Par mois (normalisé) » et
  « Par an » avec marque « ≈ » et note quand un montant est estimé (EF-40, EF-04b) ;
  répartition par catégorie en donut aux couleurs de la maquette avec liste montant et part
  (EF-41) ; prévisionnel 12 mois en barres à montants réels, mois au maximum en rouge,
  moyenne mensuelle (EF-42) ; dépenses passées 12 mois avec total et état vide « Pas encore
  d'historique » (EF-43) ; répartition par moyen de paiement avec jauges et bouton « Gérer »
  vers les moyens de paiement (EF-41) ; état vide « Rien à analyser ». Budget, objectif,
  doublons, foyer et évolution 24 mois de la maquette arrivent au lot 5.
- Onglet **Finances** dans la barre de navigation : quatre onglets comme dans la maquette,
  l'emplacement réservé disparaît. `graphiques.ts` (couleurs de catégorie, donut en
  `conic-gradient`, hauteurs de barres) testé. Style de date « moisCourt ». 276 tests.

### Lot 4 — étape 1 : moteur financier (2026-09-12)

#### Ajouté
- `src/domain/finances.ts` (EF-40 à EF-44) : abonnements « payants » (vivants, actifs,
  récurrents, hors essai en cours ; archivés, résiliés et en pause hors totaux), total mensuel
  normalisé et annuel avec part payée (EF-44) et marque « estimé » (EF-04b), répartition par
  catégorie et par moyen de paiement (la plus lourde d'abord), prévisionnel 12 mois à
  montants réels (chaque prélèvement du mois civil compte au prix en vigueur à sa date, hausse
  annoncée comprise ; un annuel pèse sur son mois d'échéance ; un essai paie à sa fin),
  dépenses passées sur 12 mois au prix de l'époque (historique des prix ; un résilié compte
  jusqu'à sa date de fin, un archivé ou un abonnement en pause jusqu'à sa dernière
  modification — approximation V1 documentée).
- Tests `finances.test.ts` : chaque règle, plus le jeu de démo à sa date de référence vérifié
  à la main (163,69 € / mois estimé pour 8 abonnements payants ; août 2026 à 242,31 € avec
  Strava annuel, septembre à 242,21 € avec Prime et deux prélèvements Lycamobile). 273 tests.

#### Modifié
- ROADMAP : découpage du lot 4 en 8 étapes.

## [0.3.0] — 2026-09-12 — tag `lot-3` — Cas particuliers & alertes

Lot 3 du CdC §6 : moteur d'alertes et centre d'alertes avec défauts réglables, cycle de vie
automatique des statuts, duplication, fiche enrichie (prix à date, engagement, régularisation),
écran Échéancier en liste et en calendrier, rappels calendrier .ics et section Automatisation,
barre de navigation et écran Réglages alignés sur la maquette, format de date au choix, garde
contre la perte de saisie. Critère de validation « un essai gratuit et un préavis déclenchent
les bonnes alertes aux bonnes dates » rejoué par un test de recette et vérifié à l'écran par
FlhFly avant le tag.

### Lot 3 — étape 7 : revue finale et recette (2026-09-12)

#### Ajouté
- `tests/lot3.recette.test.ts` : rejoue le critère du CdC §6 hors navigateur — six abonnements
  saisis via le formulaire (essai jusqu'au 17/09, engagement avec date limite le 22/09, hausse
  annoncée, régularisation, résilié jusqu'au 14/09, pause jusqu'au 13/09) et une carte expirant
  le mois prochain ; alertes calculées à plusieurs dates : l'essai n'alerte qu'à J-2, le préavis
  à J-14, le renouvellement selon le seuil propre (J-7), hausse, régularisation et carte dans
  leurs fenêtres ; libellés fr ; « tout marquer lu » puis nouvelle alerte le lendemain ;
  échéancier groupé par mois ; rappels .ics aux bonnes alarmes ; cycle de vie persisté au
  chargement (reprise, archivage, hausse appliquée, régularisation reportée). 261 tests.

#### Modifié
- Version 0.3.0 ; README (statut lot 3 livré, fonctionnalités réelles) ; ROADMAP (lot 3 ✅,
  lot 4 « prochain ») ; CdC (préférence « format de date » en §3.5 et §7, vue calendrier de
  l'échéancier en §7) ; CLAUDE.md (commandes de vérification complètes).
- Audit des règles d'architecture : Dexie confiné au stockage, aucune requête réseau, libellés
  fr / en à parité et sans clé orpheline, dates locales, aucune chaîne en dur.

### Lot 3 — écran Réglages réaligné sur la maquette (2026-09-12)

#### Modifié
- Réglages refaits d'après l'écran 7 de la maquette (retour FlhFly) : titre seul (onglet,
  sans flèche), sections en cartes de rangées (fond carte, rayon 20, séparateurs) ;
  Apparence en trois pilules de largeur égale ; Alertes par défaut en rangées compactes à
  sélecteur ; Général avec Langue (dépliant à drapeaux et coche), Format de date (dépliant),
  Moyens de paiement et Catalogue de services en rangées avec compte et chevron ;
  Automatisation en rangées (état « Activée », export .ics par rangée) ; Données (jeu de
  démonstration en rangée, chargement confirmé par toast ; Confidentialité) ; À propos
  (rangée « Open source — licence AGPL-3.0 » vers le dépôt) et version en pied de page.
  Devise par défaut, export / import, « Revoir l'introduction » et « Soutenir le projet »
  restent prévus au lot 4 ; le widget de la maquette n'est pas repris (§4.7).
- Composant `Segmente` retiré (plus utilisé) ; clés i18n orphelines supprimées.

### Lot 3 — étape 6 : rappels calendrier (.ics) et section Automatisation (2026-09-12)

#### Ajouté
- Fiche : « Ajouter le rappel au calendrier (ICS) » (EF-32, §5.4) — fichier .ics avec les
  prochains événements de l'abonnement (renouvellement, fin d'essai, date limite de
  résiliation, fin d'abonnement résilié), événements « journée entière » et alarme
  d'affichage calée sur les défauts d'alerte (seuil propre de l'abonnement pour ses
  renouvellements ; le jour même à 9 h pour une fin d'abonnement). Téléchargement réel.
- Réglages : section « Automatisation » (§7.9) — état de l'avance automatique des échéances
  (recalcul de la date, hausse appliquée, résilié archivé) et export calendrier de toutes les
  prochaines échéances en un fichier .ics ; note sur l'absence de push. Les bascules
  « synchronisation continue » et « notifications push » de la maquette ne sont pas
  reprises : impossibles dans une PWA 100 % locale (principe « aucune fonctionnalité
  factice », §4.7).
- `src/domain/ics.ts` (RFC 5545 : CRLF, échappement, pliage à 75 octets, UID stables,
  DTSTAMP, VALARM) et tests `ics.test.ts` ; `libellesEcheancier.ts` partagé entre l'écran et
  les rappels ; `telechargement.ts` (Blob + lien de téléchargement). 253 tests.

#### Modifié
- Note de l'échéancier : mention du rappel calendrier disponible depuis chaque fiche.

### Lot 3 — étape 5 : écran Échéancier et barre de navigation de la maquette (2026-09-12)

#### Ajouté
- Écran **Échéancier** (EF-16, §7.4), onglet de la barre basse : vue liste chronologique
  groupée par mois — pour chaque abonnement, prochain renouvellement (montant supporté,
  puce J-X colorée), fin d'essai (puis prix, puce violette), date limite de résiliation
  (préavis, violette), fin d'abonnement résilié (neutre) ; ligne = jour et semaine, logo,
  nom et type d'événement, montant et puce, touche → fiche. Vue calendrier : navigation
  par mois, grille du lundi au dimanche, pastilles aux couleurs des abonnements (« +n » au
  delà de trois), toutes les occurrences du mois affiché (passées comprises) ; toucher un
  jour ne montre que ses échéances. États vides et légende de la maquette.
- `src/domain/echeancier.ts` (événements à venir, événements du mois, groupement par mois,
  navigation de mois, grille du calendrier) et tests `echeancier.test.ts` dont le jeu de
  démo. Style de date « semaine » (« sam. »). 249 tests.

#### Modifié
- Barre de navigation basse refaite à l'identique de la maquette (demande FlhFly) : onglets
  Accueil, Échéancier, Réglages de 60 px avec les icônes de la maquette (trait 2,4), « + »
  central de 50 px, bord haut de 2 px, fond translucide. Finances rejoindra la barre au lot 4
  (aucune entrée factice). Icônes composées de plusieurs formes possibles dans `Icone`.
- La fiche revient vers l'écran qui l'a ouverte (accueil, échéancier ou alertes) ; la
  modification et la duplication reviennent à la fiche.

### Lot 3 — garde contre la perte de saisie dans le formulaire (2026-09-12)

#### Ajouté
- Formulaire : quitter par la flèche retour avec des changements non enregistrés ouvre un
  dialogue « Modifications non enregistrées » avec le récapitulatif des champs modifiés
  (libellé, ancienne valeur barrée → nouvelle, cinq lignes puis « + n autres ») et trois
  choix : Enregistrer, Abandonner les modifications, Continuer la saisie (demande FlhFly).
  Fermer l'onglet avec des changements en attente demande aussi confirmation au navigateur.
- `differencesFormulaire` (espaces de bord ignorés, montants comparés par valeur), testé.

### Lot 3 — format de date choisi : réglage et champ de saisie (2026-09-12)

#### Ajouté
- Réglage « Format de date » (JJ/MM/AAAA, MM/JJ/AAAA, AAAA-MM-JJ) dans Réglages › Général,
  défaut selon la langue (JJ/MM/AAAA en français, MM/JJ/AAAA en anglais), persisté avec les
  préférences (§3.5). Il pilote l'affichage des dates courtes partout dans l'app.
- Composant `ChampDate` : saisie au clavier dans le format choisi (séparateurs / . - tolérés,
  année sur 4 chiffres) avec un bouton calendrier qui ouvre le sélecteur natif ; remplace les
  sept sélecteurs natifs du formulaire et de la fiche, dont l'affichage suivait la langue du
  navigateur (mm/jj/aaaa chez FlhFly) et non celle de l'app. Une saisie illisible est refusée
  par la validation (« Date invalide »).
- `formaterDateSaisie`, `parserDateSaisie`, `formatDateDefaut` ; tests `formatDate.test.ts`.
  Icône calendrier. Le choix sera repris à l'onboarding (C7, lot 4).

#### Corrigé
- Bouton calendrier : sur ordinateur, un sélecteur natif invisible posé sur l'icône n'ouvrait
  pas le calendrier (seul le clic sur sa propre icône interne le fait) ; le bouton appelle
  désormais `showPicker()` sur le sélecteur, avec repli sur le focus (retour FlhFly).

### Lot 3 — corrections UX après recette de l'étape 4 (2026-09-12)

#### Corrigé
- Chaque écran s'ouvre en haut de page : la position de défilement de l'écran précédent ne
  se transmettait plus au suivant (retour FlhFly).

#### Modifié
- Formulaire : « Options avancées » reste replié même en modification, pour garder le bouton
  Enregistrer à portée ; le dépliant indique « n options renseignées » quand il cache des
  données (retour FlhFly). `compterOptionsAvancees` testé.
- Format des dates de saisie : les sélecteurs natifs suivent la langue du navigateur, pas
  celle de l'app ; un réglage « Format de date » est proposé pour le lot 4 (réglages complets
  et onboarding), décision à prendre.

### Lot 3 — étape 4 : fiche enrichie — prix à date, engagement, régularisation (2026-09-12)

#### Ajouté
- Fiche : « Modifier le prix » dans la section Historique des prix (EF-08) — nouveau prix et
  date d'effet. Une date passée ou du jour met à jour l'historique (une entrée par date, trié)
  et le prix courant s'il est le plus récent (part payée plafonnée si partagé) ; une date à
  venir programme une hausse annoncée (EF-08b). Annulable par toast. La section est visible
  pour tout abonnement récurrent.
- Fiche : ligne « Engagement : 12 mois · préavis 30 j » dans les détails (EF-05), en
  complément de l'encart qui affiche la fin d'engagement et la date limite de résiliation.
- Régularisation annuelle (EF-04b) : une date passée est reportée d'elle-même à l'anniversaire
  suivant à l'ouverture, avec les autres mises au jour.
- `src/domain/prix.ts` (validation, insertion dans l'historique, prix en vigueur, hausse
  annoncée) et tests `prix.test.ts` (dont le report de régularisation). 236 tests.

### Lot 3 — étape 3 : cycle de vie, statuts et duplication (2026-09-11)

#### Ajouté
- Transitions automatiques de statut à l'ouverture (EF-06) : « résilié — actif jusqu'au »
  devient archivé le lendemain de la date ; « en pause jusqu'au » reprend à la date et
  retrouve son échéance. Persistées au chargement, comme l'application des hausses annoncées
  (EF-08b) et le recalcul des échéances. Les archivés sortent des totaux et des alertes mais
  restent consultables par le filtre « Archivés ».
- Duplication (EF-07) : bouton « Dupliquer » sur la fiche → création pré-remplie avec une
  copie (nom suffixé « (copie) », cycle repartant d'aujourd'hui, référence client non
  recopiée, essai ou hausse déjà passés abandonnés), en mode catalogue ou saisie libre selon
  l'origine ; l'annulation ramène à la fiche d'origine.
- Tests `cycleVie.test.ts` : transitions et leurs bornes (le jour même reste résilié / en
  pause), même objet si rien ne change, statut et prix futur dans le même passage,
  persistance au chargement, duplication. 230 tests.

#### Modifié
- Fin d'essai (EF-04) : aucune bascule à faire, le cycle payant est ancré à la fin d'essai
  depuis le lot 1 et la tuile repasse d'elle-même au compteur de renouvellement.

### Lot 3 — étape 2 : centre d'alertes et défauts d'alerte (2026-09-11)

#### Ajouté
- Écran **Alertes** (EF-31, §5.4) : liste des alertes du jour (pastille colorée J-X / M-1 /
  +11 %, titre, sous-titre, chevron), ouverture de la fiche concernée ou des moyens de
  paiement pour une carte, « Tout marquer lu » avec toast, alertes lues estompées, état vide
  « Tout est calme », rappel du fonctionnement sans push avec les défauts en vigueur.
- Accueil : cloche en haut à droite (emplacement réservé depuis le lot 1) avec badge du nombre
  d'alertes non lues.
- Réglages : section « Alertes par défaut » (EF-30) — renouvellement (J-1 / 2 / 3 / 7 / 14),
  fin d'essai (J-1 / 2 / 3 / 7), date limite de préavis (J-7 / 14 / 30), expiration de carte
  (M-1 / 2 / 3), persistés dans les préférences et appliqués immédiatement aux alertes.
- `AlertesContext` : alertes recalculées à chaque changement d'abonnement, de moyen de
  paiement ou de défaut ; état lu chargé au démarrage et persisté au marquage.
  `libellesAlertes.ts` : libellés fr / en testés (`alertesLibelles.test.ts`). Style de date
  « mois » (« octobre 2026 »). Icônes cloche et chevron droit ; `EnTete` accepte un complément
  à droite. Domaine : `moisRestants` sur l'alerte carte. 224 tests.

#### Modifié
- L'écran Moyens de paiement revient vers l'écran d'origine (réglages ou alertes).

### Lot 3 — étape 1 : moteur d'alertes (2026-09-11)

#### Ajouté
- `src/domain/alertes.ts` (EF-30, EF-04, EF-04b, EF-05, EF-08b) : alertes dérivées des
  données à chaque ouverture de l'app (PWA sans push, §5.4) — renouvellement dans ≤ J-X
  (seuil propre à l'abonnement, sinon défaut global J-3 ; rouge ≤ 3 jours, orange au-delà),
  fin d'essai (J-2, violet ; remplace l'alerte de renouvellement pendant l'essai), date limite
  de préavis (J-14, violet, aussi en pause), carte expirant (M-1 ou déjà expirée, seulement si
  un abonnement non archivé l'utilise), régularisation annuelle et hausse annoncée (fenêtre
  de 30 jours, orange, avec ancien / nouveau prix et variation en %). Aucune alerte pour un
  abonnement archivé ou résilié. Clé stable par événement (`type:cible:date`), tri par
  proximité puis gravité puis nom.
- État « lu » (EF-31) : application des clés lues, compteur de non lues, « tout marquer
  comme lu », rétention de 90 jours des clés ; `src/data/alertesLues.ts` persiste les clés en
  localStorage comme les préférences (§3.5), lecture tolérante. Une échéance qui bouge produit
  une nouvelle clé, donc une alerte de nouveau non lue.
- Tests `alertes.test.ts` : chaque type et ses seuils, priorité du seuil propre, statuts
  exclus, cartes (utilisée, expirée, inutilisée, supprimée, défaut en mois), fenêtres
  d'annonce, tri, état lu et rétention, jeu de démo à sa date de référence (Strava J-2,
  préavis Basic-Fit J-10, régularisation EDF J-27, CB perso M-1 ; fin d'essai Disney+ trois
  jours plus tard). 220 tests.

#### Modifié
- ROADMAP : découpage du lot 3 en 7 étapes.

## [0.2.0] — 2026-09-11 — tag `lot-2` — Paiement & désabonnement

Lot 2 du CdC §6 : entité MoyenPaiement et écran dédié, catalogue de 79 services avec
formules et tarifs indicatifs, création depuis le catalogue et suggestions en saisie libre,
« Proposer un service », deep links des stores et de PayPal, bouton « Gérer / Résilier »
routé selon le canal d'achat avec démarches hors ligne et proposition « résilié — actif
jusqu'au ». Critère de validation « chaque tuile affiche son moyen de paiement ; "Résilier"
ouvre la bonne page selon le canal » rejoué par un test de recette et vérifié à l'écran par
FlhFly avant le tag.

### Lot 2 — étape 6 : revue finale et recette (2026-09-11)

#### Ajouté
- `tests/lot2.recette.test.ts` : rejoue le critère du CdC §6 hors navigateur — trois moyens
  de paiement saisis via leur formulaire (CB avec 4 derniers chiffres et expiration, PayPal,
  SEPA), neuf abonnements créés depuis le catalogue (Netflix direct, ChatGPT sur la formule
  App Store avec tarif direct moins cher, iCloud App Store seulement, Spotify via PayPal, EDF
  par téléphone, MAIF par courrier recommandé, Canal+ espace client), depuis un service
  proposé et en saisie libre Google Play ; pastille du moyen de paiement sur chaque tuile,
  usage par moyen, badge du canal, action du bouton « Gérer / Résilier » par canal (deep
  link du service ou du store) et par mode hors ligne, jeu d'étapes, statut proposé après
  résiliation, suppression du service proposé sans effet sur l'abonnement. 206 tests.

#### Modifié
- Version 0.2.0 ; README (statut lot 2 livré, fonctionnalités réelles) ; ROADMAP (lot 2 ✅).
- Audit des règles d'architecture : Dexie isolé dans `src/data/storage/`, aucune requête
  réseau dans `src/`, libellés fr / en à parité (test i18n), dates locales, aucune chaîne en
  dur dans les composants.

### Périmètre — devise de saisie par abonnement (2026-09-11)

#### Modifié
- CdC v1.16 : nouvelle exigence **EF-45b** — chaque abonnement pourra porter sa propre devise
  de saisie (EUR / USD / GBP / CHF, par exemple un service facturé en dollars) ; la devise
  proposée par défaut à la création devient un réglage (Réglages, puis onboarding C7 s'il est
  livré). EF-45 (devise d'affichage à taux indicatifs) convertit les totaux. Livraison prévue
  au lot 4 avec EF-45 ; l'annexe B « saisie maintenue en EUR » est révisée. ROADMAP : ligne
  EF-45b au lot 4. Aucun changement de code.

### Lot 2 — étape 5 : « Proposer un service », groupe « Mes services » (2026-09-11)

#### Ajouté
- `src/domain/servicePersonnalise.ts` (EF-09) : formulaire « Proposer un service » (nom,
  catégorie, adresse de gestion optionnelle), validation (nom requis, nom déjà présent au
  catalogue, adresse), création de l'entité `ServicePersonnalise` : id préfixé `perso-` (jamais
  en collision avec les ids stables du catalogue), initiales et couleur générées (palette de 10
  fonds, choix déterministe à partir du nom), périodicité mensuelle connue, résiliation par
  lien, mise en avant dans la sélection du formulaire.
- `src/domain/catalogue.ts` : `fusionnerCatalogue` (« Mes services » vivants en tête du jeu
  embarqué, version et fraîcheur inchangées) et `grouperAvecMesServices` (groupe « Mes
  services » puis les catégories).
- `src/data/services/servicesPersonnalises.ts` : enregistrement, suppression logique et
  restauration via le StorageProvider.
- Hook `useCatalogue` : catalogue fusionné avec « Mes services » lus dans IndexedDB et
  rechargés à chaque écriture. Le formulaire (mode catalogue, suggestions en saisie libre) et
  la fiche les voient comme n'importe quelle entrée du catalogue (EF-02 / EF-02b).
- Écran Catalogue (§7.8) : bouton « Proposer un service au catalogue » ouvrant le formulaire
  en place (aperçu logo / couleur pendant la saisie, chips de catégorie, adresse), groupe
  « Mes services » en tête avec « Utiliser » et suppression annulable par toast (EF-01b). Un
  abonnement lié à un service supprimé garde ses propres couleur et initiales.
- i18n fr / en ; tests `servicePersonnalise.test.ts` (couleur déterministe, validation,
  création, fusion avec tombstones exclus, sélection et pré-remplissage, regroupement).
  199 tests.

### Lot 2 — étape 4 : formulaire en mode catalogue, suggestions, écran Catalogue (2026-09-11)

#### Ajouté
- `src/domain/catalogue.ts` : recherche tolérante sur le nom et l'identifiant, suggestions
  (EF-02b : jusqu'à 3 services dès 2 caractères), pré-remplissage depuis un service (EF-02 :
  nom, catégorie, adresse, périodicité et tarif de la formule, canal d'achat — App Store si le
  service n'existe que là —, mode de résiliation, contact, montant estimé ; les champs libres
  déjà saisis sont conservés), application d'une formule, détachement du catalogue,
  comparaison des canaux (« souvent moins cher en direct » quand une formule App Store ou
  Google Play a un équivalent direct moins cher de même périodicité), regroupement par
  catégorie dans l'ordre du modèle.
- Formulaire (§7.3) : sélecteur « Catalogue / Saisie libre » à la création. Mode catalogue :
  recherche parmi les 79 services et grille de sélection (logo, nom, badge App Store) qui
  pré-remplit puis bascule sur les champs. Service lié affiché en tête avec « Détacher ».
  Chips de formules avec la fraîcheur des tarifs et la mention « moins cher en direct » (EF-02).
  En saisie libre, encart « Présent au catalogue — pré-remplir ? » avec jusqu'à 3 suggestions
  et « Non merci, garder ma saisie » (EF-02b). L'abonnement enregistre `serviceId` et
  `formuleId`.
- Écran `Catalogue` (§7.8) depuis les réglages : fraîcheur « Catalogue v2 — tarifs indicatifs
  au 24 août 2026 » (§5.6), recherche, services regroupés par catégorie avec adresse ou
  démarche, « Utiliser » ouvre la création pré-remplie. Section « Catalogue de services » dans
  les réglages. « Proposer un service » arrive à l'étape 5.
- i18n fr / en ; tests `catalogue.test.ts` (recherche, suggestions, pré-remplissage direct /
  App Store / vie courante, formules, détachement, comparaison des canaux, regroupement).
  192 tests.

#### Modifié
- Le formulaire porte `serviceId` et `formuleId` ; l'aller-retour formulaire ↔ abonnement
  les conserve.
- Modèle `Service` : drapeau `populaire` (maquette v3) — 12 services mis en avant dans la
  sélection du formulaire tant qu'aucune recherche n'est saisie (« 79 services au catalogue —
  recherchez pour tout voir »), sans défilement interne. Catalogue v2 complété en conséquence.
- Sélecteur « Catalogue / Saisie libre » et grille de sélection alignés sur la maquette
  (retour FlhFly) : deux boutons pleine largeur sur fond sable, tuiles de hauteur identique
  avec ligne « APP STORE » réservée, champ de recherche sur fond sable.
- Onglets = origine de l'entrée (retour FlhFly) : après un choix, on reste dans « Catalogue »
  et la grille laisse place à la carte du service lié avec « Changer » ; passer sur « Saisie
  libre » détache l'entrée en gardant les valeurs, revenir sur « Catalogue » rouvre la grille ;
  accepter une suggestion en saisie libre rattache l'entrée et bascule sur « Catalogue ».
  En modification, pas d'onglets : carte du service avec « Détacher ».
- Devise : les chips de devise du formulaire de la maquette v4 ne sont pas reprises — le CdC
  (§2, annexe B du 21/08) maintient la saisie en EUR ; la devise d'affichage viendra dans les
  réglages avec EF-45 au lot 4.

### Lot 2 — étape 3 : catalogue complet (2026-09-11)

#### Ajouté
- `src/data/refdata/catalogue.json` v2 (tarifs indicatifs au 24/08/2026) : 79 services repris
  du catalogue de la maquette v6 qui fait référence (annexe A) — 74 services en 11 familles
  de la v3 plus les 5 contrats « Maison » de la v6 — soit 10 catégories du modèle (streaming 13,
  vie courante 14, sport 9, IA 8, musique 7, productivité 7, cloud 6, gaming 6, presse 5,
  sécurité 4). Les 12 services curés au lot 1 (formules multiples, deep links, contacts) sont
  conservés à l'identique ; les autres portent une périodicité connue, une formule quand un
  tarif indicatif existe (24 formules à ids stables `service_mensuel` / `service_annuel`) et
  une adresse de gestion absolue.
- Services App Store seulement (Apple TV+, Apple Music, Apple Fitness+, Apple Arcade,
  iCloud+, Duolingo Super, Petit BamBou) : deep link vers les abonnements App Store, aucune
  adresse de gestion.
- Vie courante française (EF-21b, EF-04b) : EDF et Engie par téléphone, TotalEnergies et Veolia
  Eau par espace client, MAIF par courrier recommandé avec l'adresse postale ; montant estimé
  pour l'énergie et l'eau. Les services dont la maquette indique une démarche « site →
  rubrique » (L'Équipe, Mediapart, PlayStation Plus, Fnac+, Uber One…) sont en mode espace
  client avec la démarche en contact, et l'adresse du site quand elle existe.
- Tests : catalogue complet (effectif par catégorie, ids attendus), services App Store, vie
  courante, adresses absolues.

### Lot 2 — étape 2 : écran Moyens de paiement (2026-09-10)

#### Ajouté
- `src/domain/dates.ts` : mois civil « YYYY-MM », dernier jour du mois, état d'expiration d'une
  carte (EF-30, M-1) — « bientôt » dès le premier jour du mois précédant l'expiration (10/2026
  → dès le 01/09), « expirée » après le dernier jour, seuil en mois paramétrable par les
  défauts d'alerte des préférences.
- `src/domain/moyenPaiement.ts` : formulaire (type, libellé, 4 derniers chiffres, expiration),
  normalisation des saisies « 09/2026 » → « 2026-09 », validation (libellé requis, quatre
  chiffres, mois valide), conversion vers l'entité (les champs carte ne sont conservés que pour
  une CB ; la couleur ne change qu'avec le type), usage par moyen (abonnements non archivés).
- `src/data/services/moyensPaiement.ts` : enregistrement, suppression logique restaurable.
- Écran `MoyensPaiement` (§7.6, §3.3), repris de la maquette : une carte par moyen avec type et
  pastille, badge « Expire bientôt » / « Expirée », libellé, détail « ···· 4412 · exp. 2026-09 »,
  nombre d'abonnements, édition en place, suppression annulable par toast (la pastille disparaît
  des tuiles et revient à la restauration), ajout avec chips de type, deep link « Gérer les
  paiements automatiques PayPal » (§5.3), rappel « aucune donnée bancaire réelle ».
- Réglages : section « Moyens de paiement » avec le nombre et l'accès à l'écran ; navigation en
  pile depuis les réglages ; icône carte.
- i18n fr / en ; tests `moyenPaiement.test.ts` (mois et dernier jour, états d'expiration aux
  bornes, normalisation, validation, création et modification, usage sur le jeu de démo).
  178 tests.

### Lot 2 — étape 1 : désabonnement rapide, routage par canal et deep links (2026-09-10)

#### Ajouté
- `src/domain/resiliation.ts` : action derrière « Gérer / Résilier » (EF-20, EF-21, EF-21b,
  §5.3). Le routage dépend du canal d'achat, jamais du moyen de paiement : App Store →
  `itms-apps://apps.apple.com/account/subscriptions`, Google Play → page des abonnements
  Google Play (deep links du service s'ils existent), direct → selon le mode de résiliation :
  lien (adresse de l'abonnement, sinon celle du service, sinon « aucune »), téléphone,
  courrier recommandé, espace client (le contact sert d'adresse s'il en est une). Jeu d'étapes
  de la démarche par canal ou mode, statut proposé après résiliation « résilié — actif
  jusqu'à la prochaine échéance » (EF-22), détection de numéros de téléphone et lien `tel:`.
- Fiche : bouton routé (lien externe, `tel:`, courrier, espace client) avec note explicite
  (« un abonnement App Store ne se résilie pas sur le site du service », « Appeler : … »,
  « Lettre recommandée avec accusé de réception — … »), lien « Marquer comme résilié » ;
  après clic, bannière EF-22 avec les quatre étapes de la démarche à cocher et les boutons
  « Oui, marquer résilié » (statut changé, annulable par toast) / « Plus tard ».
- Icônes lien externe, téléphone, courrier ; i18n fr / en (boutons, notes, 24 étapes).
- Tests : `resiliation.test.ts` (routage par canal prioritaire sur le mode, adresse de
  l'abonnement puis du service, modes hors ligne, jeu d'étapes, statut proposé, détection
  d'adresses et de numéros).

#### Modifié
- Découpage du lot 2 en 6 étapes inscrit dans la ROADMAP.

## [0.1.0] — 2026-09-10 — tag `lot-1` — Socle

Lot 1 du CdC §6 : modèle de données, moteur d'échéances testé, stockage local, accueil en
tuiles avec compteur et code couleur, fiche détail, création / édition en saisie libre,
tri, filtres, recherche, annulation par toast, thème et interface FR / EN.
Critère de validation « créer 5 abonnements variés, échéances justes, tuiles conformes »
rejoué par un test de recette et validé à l'écran par FlhFly.

### Lot 1 — étape 8 : revue finale et recette (2026-09-10)

#### Ajouté
- `tests/lot1.recette.test.ts` : rejoue le critère du CdC §6 hors navigateur — cinq
  abonnements variés saisis via le modèle du formulaire (mensuel ancré un 31 et partagé avec
  hausse annoncée, annuel avec engagement, 28 jours en prélèvement SEPA, essai gratuit via
  l'App Store, à l'usage avec plafond), enregistrés par le service, relus depuis IndexedDB ;
  échéances attendues (30/09 par la règle des mois courts, J-2, 20/08 + 28 j, fin d'essai,
  aucune), modèles de tuile (niveaux rouge / orange / vert / violet, pastille de paiement,
  badge canal, sous-titres), libellés fr / en, ordre de l'accueil, total mensuel normalisé,
  ancienneté, hausse versée dans l'historique après modification. 165 tests.
- Audit des règles d'architecture (CLAUDE.md) : aucun import Dexie hors du provider, aucune
  requête réseau ni police distante, aucune chaîne en dur dans les composants, aucune date
  civile convertie en UTC, dépendances limitées à la stack validée.

#### Modifié
- Version 0.1.0 (affichée dans « À propos »), README : statut du lot 1 et fonctionnalités
  réellement disponibles.

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
