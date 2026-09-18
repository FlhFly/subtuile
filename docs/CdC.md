# Cahier des charges — Subtuile
*Application de suivi d'abonnements et de contrats récurrents*

**Version :** 1.33 — 18/09/2026 (retours : version du système et du navigateur dans le message ; candidats C21, C22, C23)
**Statut :** En vigueur
**Plateforme :** Web / PWA installable
**Usage :** Personnel (mono-utilisateur), évolutif
**Édition :** publique, centrée sur l'application.

---

## 1. Contexte et objectifs

L'objectif est de centraliser le suivi de tous les abonnements personnels (Strava, Netflix, Amazon Prime, Claude, ChatGPT, etc.) dans une application unique, afin de :

1. Visualiser d'un coup d'œil les prochaines échéances de renouvellement.
2. Savoir immédiatement **comment** chaque abonnement est payé (Apple Pay / compte App Store, PayPal, CB…).
3. Pouvoir se désabonner rapidement via un lien direct vers la page de gestion du service.
4. Maîtriser le budget global (coût mensuel/annuel normalisé, prévisionnel).
5. Ne jamais rater une fin d'essai gratuit ou une date limite de préavis.

**Contrainte assumée :** pas de Mac disponible → le natif iOS est écarté au profit d'une PWA, développable avec la stack déjà maîtrisée (HTML/CSS/JS, VS Code, Claude Code).

---

## 2. Périmètre

| Inclus (MVP complet) | Hors périmètre (évolutions) |
|---|---|
| Gestion complète des abonnements et cas particuliers | Synchronisation multi-appareils (CloudKit/Supabase) |
| Catalogue de services préchargé + saisie libre | Application native iOS / présence App Store |
| Moyens de paiement comme entité dédiée | Widget écran d'accueil natif |
| Liens et deep links de désabonnement | Import automatique (emails, relevés bancaires) |
| Alertes d'échéance (voir contrainte §5.4) | Multi-utilisateur / partage de comptes |
| Vue financière complète | Détection automatique de hausses de prix |
| Export / import JSON | Taux de change en ligne — la devise par abonnement (EF-45b) et la devise d'affichage (EF-45) n'utilisent que des taux indicatifs figés |
| Thème clair / sombre / système | Suivi de consommation (kWh, m³) — relève d'une app dédiée |
| Contrats de la vie courante : énergie, eau, télécom, assurances (montant estimé, régularisation) *(v1.9)* | Agrégation bancaire automatique par API — payante et incompatible « zéro tracking » |

---

## 3. Modèle de données

### 3.1 Entité `Abonnement`

| Champ | Type | Détail |
|---|---|---|
| id | uuid | |
| serviceId | ref → Service, nullable | null si saisie libre |
| formuleId | ref → formule du catalogue, nullable *(v1.11)* | rattache l'abonnement à une formule précise (ex. Netflix Standard) — support futur de la comparaison prix saisi vs prix officiel (C15) ; null si saisie libre ou formule inconnue |
| formule | texte libre, nullable *(v1.21)* | libellé de formule saisi à la main (ex. « Max ») quand aucune formule du catalogue ne convient (option « Autre ») ou en saisie libre |
| nom | string | pré-rempli depuis le catalogue |
| categorie | enum | Streaming, Sport, IA, Cloud, Presse, Musique, Autre… |
| periodicite | objet | voir §3.2 |
| prix | decimal | prix courant |
| montantEstime | bool *(v1.9)* | montant variable affiché « ~X € » ; les totaux incluant des montants estimés sont marqués comme tels |
| regularisation | objet nullable *(v1.9)* | { date } — échéance annuelle de régularisation (mensualités lissées énergie), avec alerte dédiée |
| prixFutur | objet nullable *(v1.9)* | { date, montant } — hausse annoncée : alerte à l'approche, application automatique à la date, versement dans historiquePrix |
| rappel | objet nullable *(v1.31)* | { date, texte } — rappel libre à une date (« renégocier la box en janvier ») : ligne sur la fiche, alerte du jour J pendant 30 jours, même résilié (ex-C14, EF-74) |
| modeResiliation | enum *(v1.9)* | lien (défaut), telephone, courrier_recommande, espace_client — avec contact associé ; adapte le bouton « Gérer / Résilier » (EF-21b) |
| referenceClient | string optionnel *(v1.9)* | n° client / n° de contrat, affiché en évidence sur la fiche |
| devise | enum *(v1.16)* | devise de saisie de l'abonnement : EUR, USD, GBP ou CHF (EF-45b) ; la devise proposée par défaut à la création est un réglage. Jusqu'au lot 4 : EUR |
| dateDebut | date | |
| prochaineEcheance | date | calculée, modifiable manuellement |
| essai | objet nullable | { dateFin, prixApres } |
| engagement | objet nullable | { dureeMois, preavisJours } → date limite de résiliation calculée |
| partage | objet nullable | { prixTotal, partPayee } — les vues financières utilisent partPayee |
| moyenPaiementId | ref → MoyenPaiement | instrument réel (CB, PayPal…), y compris derrière un compte Apple |
| canalAchat | enum | direct (défaut), app_store, google_play — pilote le lien de résiliation (EF-21) ; distinct du moyen de paiement car un même service peut être souscrit par les deux canaux, souvent à des tarifs différents (frais des stores) |
| statut | enum | actif, en_pause, resilie_actif_jusquau (avec date), archive |
| urlGestion | string | héritée du catalogue, surchargeable |
| historiquePrix | liste | { date, prix } — trace les hausses tarifaires |
| tags | liste de chaînes libres *(v1.14)* | étiquettes en complément de la catégorie (maison, voiture, pro…), filtrables (ex-C13) |
| notes | string | |

### 3.2 Périodicité

| Type | Paramètres | Exemples |
|---|---|---|
| recurrente | unité (jour/semaine/mois/an) + intervalle | mensuel = mois×1, trimestriel = mois×3, 28 jours = jour×28 |
| a_vie | — | achat unique, pas d'échéance |
| a_l_usage | plafond indicatif optionnel | crédits API, recharge |

### 3.3 Entité `MoyenPaiement`

| Champ | Détail |
|---|---|
| id, type | CB, PayPal, Apple Pay / App Store, prélèvement SEPA, autre |
| libelle | ex. « CB perso » |
| quatreDerniers | optionnel, jamais le numéro complet |
| dateExpiration | optionnel → déclenche l'alerte « carte expirée » |
| couleur | pour l'affichage sur les tuiles |

⚠️ **Aucune donnée bancaire réelle n'est stockée** (ni numéro complet, ni CVV). Uniquement des libellés descriptifs. Données 100 % locales → contrainte RGPD minimale. Garde locale *(v1.28, revue RGPD du 16/09/2026)* : les 4 derniers chiffres sont limités à quatre chiffres exactement ; toute suite de 13 à 19 chiffres validée par la clé de Luhn est refusée dans le libellé d'un moyen de paiement et signalée dans la référence client et les notes d'un abonnement ; les imports JSON ne conservent que les 4 derniers chiffres et masquent un numéro complet.

### 3.4 Entité `Service` (catalogue)

| Champ | Détail |
|---|---|
| id, nom, categorie | |
| couleur | fond de tuile |
| logo | **objet évolutif** *(v1.7)* : `{ type, valeur }` avec type ∈ initiales (V1, seul rendu implémenté), icone (référence à une bibliothèque de pictos de marques, évolution C10), upload (image fournie par l'utilisateur, stockée en local). Rendu à chaîne de repli : icone → upload → initiales — l'app ne casse jamais si un type n'est pas disponible |
| urlGestion | page de gestion/résiliation du service |
| deepLinks | variantes selon canal d'achat (voir §5.3) |
| periodicitesConnues | pré-remplissage à la création |
| formules *(v1.11)* | liste : `{ id, nom, prix, periodicite, canal, devise? }` *(v1.23 : `devise` facultative, euros par défaut, pour les services facturés en dollars ; le formulaire convertit depuis cette devise)* — les offres du service (ex. Netflix Essentiel/Standard/Premium ; tarif direct vs App Store). Remplace le champ tarifsIndicatifs. En V1, une seule formule par service suffit ; le schéma en accepte plusieurs sans migration. Les `id` de services et de formules sont **stables** : jamais renommés, jamais réutilisés — ils deviennent un contrat (formuleId des abonnements, futur catalogue distant) |
| verifieLe *(v1.22)* | date ISO facultative — dernière revue manuelle des données du service (adresse, formules, tarifs) ; `scripts/verifier-catalogue.cjs` contrôle la structure, teste les adresses et produit `docs/catalogue-verification.md` |

Le catalogue porte des métadonnées globales *(v1.11)* : `catalogueVersion` (entier incrémenté à chaque publication) et `publieLe` (date de fraîcheur des tarifs, affichable : « tarifs indicatifs au JJ/MM/AAAA »).

Le catalogue vit dans un **JSON embarqué** dans l'app, éditable, avec une vingtaine de services au lancement (annexe A). La saisie libre reste toujours possible.

**Logos de marques (v1.7)** — les logos (le N de Netflix, etc.) sont des marques déposées : ils ne peuvent être ni placés sous la licence du projet ni embarqués comme fichiers dans le dépôt public. Voie prévue pour l'évolution C10 : bibliothèque de pictos de marques consommée comme **dépendance npm** (type simple-icons — pictos monochromes référencés par slug, avec disclaimer marques), jamais d'assets copiés dans le dépôt ; upload personnel en solution universelle pour les services absents. La récupération de favicons à la volée (services Google/DuckDuckGo) est écartée : elle exige le réseau et contredit la promesse « zéro tracking ».

### 3.5 Champs techniques communs (préparation sync — v1.5)

Chaque entité (Abonnement, MoyenPaiement, entrée « Mes services ») porte : `id` (uuid), `updatedAt` (horodatage ISO mis à jour à chaque écriture) et `deletedAt` (suppression logique / tombstone — la suppression définitive d'EF-01 reste une suppression logique en interne, purgée physiquement à l'ouverture de l'app après 30 jours *(v1.28)*). L'export JSON porte un `schemaVersion` ; les évolutions de schéma passent par des migrations locales. Ces champs sont invisibles à l'utilisateur mais indispensables à une future synchronisation (résolution de conflits, propagation des suppressions). Les **préférences d'interface** *(v1.8)* — langue, devise d'affichage, format de date, thème, mode d'affichage, défauts d'alerte — sont persistées localement (localStorage acceptable) et restent distinctes des données métier, qui vivent dans IndexedDB derrière le StorageProvider (§5.6).

---

## 4. Exigences fonctionnelles

Notation : **[M]** = must have, **[S]** = should have.

### 4.1 Gestion des abonnements

- **EF-01 [M]** — CRUD complet des abonnements.
- **EF-01b [S]** — Annulation par toast « Annuler » (~6 s) après les actions destructives ou de changement d'état : suppression, résiliation, pause, archivage, import. *(issu de la maquette v4 — réalise C2)*
- **EF-02 [M]** — Création depuis le catalogue (pré-remplissage nom, couleur, URL, périodicité) ou en saisie libre, avec choix du **canal d'achat** (direct / App Store / Google Play). Si le catalogue signale un tarif direct plus avantageux, l'info est affichée à la création. *(ajouté en v1.3)*
- **EF-02b [S]** — Aide à la saisie libre : dès quelques caractères, l'app suggère jusqu'à 3 services du catalogue correspondants ; la sélection bascule en pré-remplissage catalogue, la suggestion reste ignorable. *(issu de la maquette v3)*
- **EF-03 [M]** — Calcul automatique de la prochaine échéance à partir de dateDebut + périodicité ; recalcul après chaque échéance passée. **Règle des mois courts** *(v1.8)* : une échéance calée sur un jour absent du mois (29-31) tombe le dernier jour de ce mois ; tous les calculs se font en **date locale** (jamais UTC) pour éviter les décalages de compteur J-X.
- **EF-04 [M]** — Gestion des essais gratuits : affichage distinct « essai jusqu'au X, puis Y € ».
- **EF-04b [S]** — Montant variable (vie courante) : flag « montant estimé » (affichage « ~X € », totaux marqués comme estimés) ; pour les mensualités lissées (énergie), échéance de **régularisation annuelle** à date avec alerte dédiée — la facture de régularisation ne doit jamais être une surprise. *(ajouté en v1.9)*
- **EF-05 [M]** — Gestion engagement/préavis : affichage de la date limite pour résilier sans reconduction.
- **EF-06 [M]** — Statuts : actif, en pause, résilié-actif-jusqu'au, archivé. Les archivés sortent des totaux mais restent consultables. La pause peut porter une **date de reprise automatique** (« en pause jusqu'au X ») *(v1.14)*.
- **EF-07 [S]** — Duplication d'un abonnement existant.
- **EF-08 [S]** — Historique des prix avec saisie d'une hausse à date.
- **EF-08b [S]** — Prix futur programmé : saisie d'une hausse annoncée { date, montant } ; alerte à l'approche, application automatique à la date, versement dans l'historique des prix. *(ajouté en v1.9)*
- **EF-09 [S]** — Ajout d'un service personnalisé au catalogue local (« proposer un service ») : l'entrée créée devient réutilisable comme une entrée du catalogue embarqué. *(issu de la maquette v1)* Envoi facultatif par e-mail à l'auteur pour le catalogue commun, message pré-rempli, rien n'est envoyé par l'app *(v1.24)*. Quand une entrée « Mes services » correspond à un service désormais présent au catalogue embarqué (nom rapproché, accents et casse ignorés), l'app le signale et **propose** de basculer : les abonnements liés passent sur l'entrée officielle en conservant prix, périodicité, devise et moyen de paiement, l'entrée maison est supprimée (annulable par toast), le prix saisi n'est jamais remplacé par un tarif du catalogue et le refus est mémorisé. Jamais de bascule silencieuse *(v1.25, approche validée le 15/09/2026)*. À l'inverse, quand un abonnement est saisi librement sous un nom inconnu du catalogue embarqué **et** de « Mes services » (aucune suggestion EF-02b retenue), l'app propose à l'enregistrement d'en créer l'entrée « Mes services » à partir des données déjà saisies — nom, catégorie, adresse de gestion — puis, facultativement, de l'envoyer à l'adresse de contact par le même message pré-rempli que « Proposer un service » *(v1.26, demande du 15/09/2026)*.

### 4.2 Tuiles et navigation

- **EF-10 [M]** — Écran principal en grille de tuiles ; chaque tuile affiche : nom, logo/couleur, prix + périodicité, **compteur J-X avant renouvellement**, pastille du moyen de paiement.
- **EF-11 [M]** — Code couleur d'urgence sur le compteur : vert (> 14 j), orange (≤ 14 j), rouge (≤ 3 j), violet (fin d'essai ou date limite de préavis imminente).
- **EF-12 [M]** — Tri : par échéance (défaut), par prix, par nom, par catégorie. Filtre par catégorie, statut, moyen de paiement.
- **EF-12b [S]** — Mode d'affichage de l'accueil : grille de tuiles (défaut) ou liste, persisté dans les préférences. *(issu de la maquette v4)*
- **EF-13 [M]** — Fiche détail au tap : toutes les infos + actions (modifier, se désabonner, changer statut, archiver).
- **EF-13b [S]** — Journal « Derniers paiements » sur la fiche : occurrences passées reconstituées (date, montant au tarif de l'époque). *(issu de la maquette v6 — lot 4)*
- **EF-14 [S]** — Réorganisation manuelle des tuiles (drag & drop) via un mode dédié, avec tri « ordre personnalisé » persistant. *(précisé par la maquette v2)*
- **EF-15 [S]** — Recherche textuelle.
- **EF-16 [S]** — Page « Prochaines échéances » en liste chronologique (équivalent fonctionnel du widget, dans l'app).
- **EF-17 [S]** — Thème d'apparence : clair / sombre / système (réglage global).
- **EF-17b [S]** — Interface bilingue FR/EN : dictionnaire de traduction centralisé, dates et libellés localisés (« J-X » / « D-X »), langue persistée. L'architecture de traduction se pose dès le lot 1 (rétrofit coûteux). *(issu de la maquette v4)*
- **EF-18 [S]** — Affichage de l'ancienneté « Abonné depuis » sur la fiche détail. *(issu de la maquette v1)*
- **EF-19 [S]** — Retour visuel systématique (toast) après chaque action : création, modification, suppression, export. *(issu de la maquette v2)*

### 4.3 Désabonnement rapide

- **EF-20 [M]** — Bouton « Gérer / Résilier » sur chaque fiche, ouvrant urlGestion.
- **EF-21 [M]** — Le routage du bouton dépend du **canal d'achat** (et non du moyen de paiement) : app_store → `itms-apps://apps.apple.com/account/subscriptions` (les abonnements App Store ne se résilient pas sur le site du service) ; google_play → page abonnements Google Play ; direct → urlGestion. Un badge sur la tuile et la fiche indique le canal quand il n'est pas « direct ». *(reformulé en v1.3)*
- **EF-21b [S]** — Mode de résiliation hors ligne : pour les contrats sans résiliation web (énergie, assurances, mutuelles), le champ modeResiliation adapte le bouton « Gérer / Résilier » — affichage du téléphone, de la démarche courrier recommandé ou du lien espace client au lieu d'une URL de résiliation. *(ajouté en v1.9)*
- **EF-22 [S]** — Après clic sur « Résilier », proposition de passer le statut en « résilié-actif-jusqu'au ».

### 4.4 Alertes d'échéance

- **EF-30 [M]** — Alerte paramétrable J-X par abonnement (défaut global : J-3), alerte fin d'essai (défaut J-2), alerte date limite de préavis, alerte expiration de carte (M-1). Préréglages J-1/2/3/7/14 à la création ; chaque défaut global modifiable dans les réglages. *(précisé par la maquette v2)*
- **EF-31 [M]** — Centre d'alertes in-app : badge + liste des alertes à l'ouverture, avec action « tout marquer comme lu » ; ouvrir une alerte (fiche, moyens de paiement, réglages) la marque lue à elle seule *(v1.30, retour FlhFly du 17/09/2026)*.
- **EF-32 [S]** — Export ICS d'un rappel vers le calendrier (contournement fiable de la limitation PWA, voir §5.4).
- **EF-33 [S]** — Notifications Web Push si un petit serveur de push est ajouté ultérieurement.

### 4.5 Vue financière

- **EF-40 [M]** — Total mensuel normalisé (annuel ÷ 12, etc.) et total annuel.
- **EF-41 [M]** — Répartition par catégorie et par moyen de paiement.
- **EF-42 [M]** — Prévisionnel des 12 prochains mois (montants réels par mois, un abonnement annuel pèse sur son mois d'échéance).
- **EF-43 [S]** — Historique des dépenses passées reconstitué depuis les échéances et l'historique des prix, sur **24 mois** *(porté de 12 à 24 par la maquette v6)*.
- **EF-44 [S]** — Prise en compte de partPayee pour les abonnements partagés.
- **EF-44b [S]** — Vue « Foyer & partage » : abonnements partagés avec part payée vs prix plein, total du foyer vs total personnel. *(issu de la maquette v6 — lot 4)*
- **EF-45 [S]** — Devise d'affichage (EUR/USD/GBP/CHF) : conversion des montants à des **taux figés explicitement étiquetés « indicatifs »** (aucun appel réseau). Les taux sont un **jeu de données de référence** au contrat du §5.6 *(v1.12)* : fichier versionné avec date `publieLe` (affichage « taux indicatifs au JJ/MM/AAAA »), embarqué en V1, remplaçable à distance sans release. La saisie se fait dans la devise de chaque abonnement (EF-45b), EUR par défaut. *(issu de la maquette v4, confirmé le 21/08 ; saisie multi-devise décidée le 11/09, v1.16)*
- **EF-45b [S]** — Devise de saisie par abonnement : chaque abonnement porte sa devise (EUR / USD / GBP / CHF), par exemple un service facturé en dollars ; la devise proposée par défaut à la création est le réglage « Devise » (le même que la devise d'affichage d'EF-45 en V1 ; onboarding C7 s'il est livré). Les totaux et la vue financière convertissent vers la devise d'affichage aux taux indicatifs d'EF-45 ; un montant saisi dans une autre devise que celle d'affichage est signalé comme converti. Livré au lot 4 avec EF-45. *(v1.16, décision du 11/09/2026)*

### 4.6 Données

- **EF-50 [M]** — Export JSON complet (sauvegarde) et import avec fusion ou remplacement.
- **EF-51 [M]** — Fonctionnement 100 % hors ligne après installation.
- **EF-52 [S]** — Import CSV simple (nom, prix, périodicité, échéance) pour la saisie initiale en masse. Séparateur et en-tête (fr / en) détectés ; quand l'en-tête n'est pas reconnu ou que des lignes sont ignorées, l'utilisateur choisit à la main le séparateur, la présence d'un en-tête et la colonne de chaque champ, l'aperçu se recalculant aussitôt *(v1.27)*. Export CSV des abonnements pour tableur — nom, prix, devise, périodicité, échéance, catégorie, statut, service, canal, moyen de paiement, date de début, notes ; séparateur « ; », relu tel quel par l'import *(v1.27, livré en 1.0.19)*.

### 4.7 Pilotage (lot 5 — ex-backlog promu par la maquette v6)

- **EF-70 [S]** — Objectif d'économie : cible « passer sous X €/mois d'ici [date] », progression affichée (« objectif atteint — Y € sous la cible » / « encore Z € à réduire »). *(ex-C4)*
- **EF-71 [S]** — Usage déclaré & coût réel : saisie d'une fréquence d'utilisation (utilisations/semaine), coût par utilisation, signal « non utilisé ce mois-ci — X € dépensés quand même », suggestion « résilier le moins utilisé libérerait ~Y €/mois ». Déclaratif uniquement — aucune mesure automatique. *(ex-C5)*
- **EF-72 [S]** — Suggestions d'économies : « passer en annuel économiserait X € » via les formules du catalogue, canal moins cher (lien EF-02/EF-21). *(ex-C6)*
- **EF-74 [S]** — Rappel libre à une date par abonnement : date + texte saisis dans les options avancées, affichés sur la fiche ; alerte « Rappel » du jour J pendant 30 jours pour tout abonnement non archivé ; ouvrir l'alerte mène à la fiche *(v1.31, ex-C14)*.
- **EF-73 [S]** — Import de relevé bancaire (CSV) : détection **100 % locale** des paiements récurrents, signalement des **doublons potentiels** (couvre l'esprit de C3), proposition groupée « ajouter N abonnement(s) », état « rien à ajouter — tout est déjà suivi ». Aucun agrégateur, aucune donnée montante. *(ex-C11 + C3)*

**Principe « aucune fonctionnalité factice »** *(v1.14)* : les éléments montrés en démo/aperçu dans la maquette mais irréalisables en V1 (notifications push sans serveur — §5.4, widget d'écran d'accueil natif — §2) sont **masqués en production** et n'apparaîtront que lorsqu'ils seront réellement fonctionnels.

---

## 5. Exigences techniques

### 5.1 Stack (proposée)

| Couche | Choix | Justification |
|---|---|---|
| Framework | React + Vite | écosystème, composants tuiles, compatible Claude Design |
| Langage | TypeScript | fiabilité du modèle de données |
| Stockage | IndexedDB via Dexie.js | données structurées locales, requêtes simples |
| PWA | manifest + service worker (vite-plugin-pwa) | installable, offline |
| Dates | date-fns | calculs d'échéances et périodicités |
| Hébergement | GitHub Pages ou Netlify | gratuit, HTTPS (requis pour PWA) |

### 5.2 PWA

- Installable sur l'écran d'accueil iOS/Android/desktop, affichage standalone.
- Service worker : cache complet de l'app, fonctionnement hors ligne intégral.
- Les données ne quittent jamais l'appareil (pas de backend, pas de compte).

### 5.3 Deep links

- `itms-apps://apps.apple.com/account/subscriptions` — abonnements App Store (iOS).
- `https://play.google.com/store/account/subscriptions` — équivalent Android.
- `https://www.paypal.com/myaccount/autopay/` — paiements automatiques PayPal.
- URLs de gestion par service : catalogue (annexe A), à vérifier au lot 2.

### 5.4 Contrainte connue — notifications

Une PWA iOS ne peut pas planifier de notification locale en arrière-plan (pas d'API Notification Triggers sur Safari ; le Web Push d'iOS 16.4+ exige un serveur d'envoi). Le MVP repose donc sur : alertes in-app à l'ouverture (EF-31) + export ICS vers le calendrier (EF-32). Le Web Push est prévu en évolution (EF-33). Ce point est assumé et documenté pour éviter toute mauvaise surprise.

### 5.5 Qualité et méthode

- Un dépôt Git ; **un commit/tag par étape validée**.
- Dépôt **public (open source) dès le lot 1** : aucun secret ni donnée personnelle dans le code ; fichiers LICENSE (**AGPL-3.0**, actée le 24/08), README et CONTRIBUTING.md dès l'initialisation (cf. annexe D).
- Livraison itérative par lots, validation avant de passer au lot suivant.
- Jeu de données de démonstration pour tester chaque lot ; le jeu de démo de la maquette v4 sert de fixtures de développement.
- **Tests unitaires du moteur de dates dès le lot 1** *(v1.8)* : périodicités (dont personnalisées et 28 jours), règle des mois courts (EF-03), passage d'échéance, compteurs J-X — c'est la zone à risque n°1 de l'app.
- Code structuré pour permettre plus tard une migration du stockage : couche d'accès aux données isolée, formalisée au §5.6.

### 5.6 Préparation à une version hébergée (backend-ready — v1.5)

Aucun backend en V1, mais l'architecture doit rendre son ajout possible sans réécriture :

- **Couche d'accès unique** : toutes les lectures/écritures passent par une interface `StorageProvider` ; implémentation locale (Dexie) en V1, implémentation distante ajoutable ensuite. Aucun appel direct au stockage depuis les composants. Applicable dès le lot 1.
- **Offline-first préservé** : si une sync arrive, le stockage local reste la source primaire (lecture/écriture immédiates), la synchronisation se fait en arrière-plan. L'avantage PWA hors ligne (EF-51) ne doit jamais régresser.
- **Métadonnées de sync** : champs techniques du §3.5 (uuid, updatedAt, tombstones) présents dès le lot 1 ; résolution de conflits envisagée en last-write-wins par entité.
- **Catalogue distant** : le catalogue embarqué (annexe A / maquette de référence) doit pouvoir être remplacé par une version chargée à distance, avec numéro de version et fallback embarqué — première brique « hébergée » à faible risque, sans compte utilisateur.
- **Données de référence descendantes — mécanisme unifié** *(v1.12)* : tout jeu de données de référence embarqué suit le même contrat — fichier JSON `{ version, publieLe, data }`, accès via un point unique `RefDataProvider` (symétrique du StorageProvider), fallback embarqué, cache local, chargement distant optionnel **jamais bloquant** hors ligne, aucune donnée montante. Jeux identifiés : le **catalogue** (§3.4 — y compris URLs/deep links, démarches de résiliation, mapping des pictos C10, formules et tarifs), les **taux de change** (EF-45), et en candidat futur un fichier de **méta-infos d'app** (annonces, note de version). Un seul mécanisme, N jeux branchables ; l'interface est posée dès le lot 1, la lecture distante s'active en évolution.
- **Veille tarifaire — données descendantes uniquement** *(v1.11)* : le catalogue est traité comme un **produit de données versionné** (formules et métadonnées du §3.4). L'évolution C15 consiste à publier ce catalogue depuis un pipeline serveur de collecte des prix (fichier JSON statique public — aucun backend requis), l'app le télécharge et effectue toutes les comparaisons **en local** : aucune donnée utilisateur ne remonte jamais, la promesse « zéro tracking » est préservée par construction. Le champ `formuleId` (§3.1) rattache chaque abonnement à une formule et rend possibles, sans migration : alerte de hausse officielle (« prix saisi ≠ prix catalogue »), suggestion de formule ou de canal moins cher, détection de promos. La collecte elle-même (sources, scraping/API, aspects juridiques) est un chantier propre à C15, hors V1.
- **Backend pressenti, non décidé** : Supabase (Auth avec Sign in with Apple, PostgreSQL, Row Level Security). Un backend débloquerait aussi le Web Push (EF-33, cf. §5.4).
- **Conformité si hébergement** : RGPD complet (hébergeur UE, politique de confidentialité, droit à l'effacement, minimisation) ; l'écran Confidentialité (§7) devra refléter le mode réel — la mention « données 100 % locales » disparaît dès qu'une sync est activée.
- **Coûts** : l'hébergement statique reste gratuit ; tout backend introduirait des coûts récurrents, à intégrer à la décision (§5.6, backend non décidé).

---

## 6. Lotissement

| Lot | Contenu | Critère de validation |
|---|---|---|
| **1 — Socle** | Modèle de données, CRUD, calcul des échéances, tuiles avec compteur et code couleur, tri/filtres (EF-01→03, 10→13) | Créer 5 abonnements variés, échéances justes, tuiles conformes |
| **2 — Paiement & désabonnement** | Entité MoyenPaiement, catalogue JSON, deep links, logique App Store/PayPal (EF-20→22, catalogue) | Chaque tuile affiche son moyen de paiement ; « Résilier » ouvre la bonne page selon le canal |
| **3 — Cas particuliers & alertes** | Essais, engagement/préavis, statuts, archivage, centre d'alertes, export ICS (EF-04→06, 30→32) | Un essai gratuit et un préavis déclenchent les bonnes alertes aux bonnes dates |
| **4 — Finances & données** | Vue financière complète, prévisionnel 12 mois, export/import JSON, import CSV, PWA finalisée (EF-40→52) | Totaux vérifiés à la main sur le jeu de démo ; app installée et fonctionnelle hors ligne |
| **5 — Pilotage** | Objectif d'économie, usage & coût réel, suggestions d'économies, import relevé bancaire avec doublons, journal des paiements, vue foyer, historique 24 mois (EF-70→73, EF-13b, EF-44b, EF-43 étendu) | Scénario complet : objectif fixé, usage déclaré, relevé importé sans doublon créé, suggestions cohérentes avec le catalogue |

### Phase design (préalable au lot 1)

Le design (Claude Design) intervient **avant le lot 1** et doit livrer une **maquette complète couvrant l'intégralité du périmètre**, pas seulement les tuiles :

- les **7 écrans** listés au §7 (accueil, fiche, création/édition, échéancier, finances, moyens de paiement, réglages) ;
- **tous les états et variantes** : codes couleur d'urgence du compteur (EF-11), tuile en essai gratuit, statuts (en pause, résilié-actif-jusqu'au, archivé), centre d'alertes avec badge, états vides (aucun abonnement, aucune alerte) ;
- les composants transverses : pastille moyen de paiement, formulaire catalogue vs saisie libre, graphiques de la vue financière.

Les lots 1 à 4 implémentent cette maquette sans redesign ; seuls des ajustements mineurs restent admis à chaque lot.

**Bilan maquette v1 (16/08/2026)** — la maquette HTML standalone livrée par Claude Design couvre les 7 écrans, le centre d'alertes, les codes couleur du compteur, tous les statuts, essais, engagement/préavis, abonnements partagés, historique des prix, duplication, deep links App Store/PayPal, ICS, vue financière complète, export/import et états vides, avec le jeu de démo demandé. Écarts à couvrir en développement (la maquette ne sera pas reprise) :

| Écart | Exigence | Lot cible |
|---|---|---|
| Suppression définitive d'un abonnement absente (seul l'archivage existe) — prévoir une confirmation | EF-01 [M] | Lot 1 |
| Filtre par moyen de paiement absent (statut et catégorie présents) | EF-12 [M] | Lot 1 |
| Recherche textuelle globale absente (seul le catalogue est cherchable) | EF-15 [S] | Lot 1 |
| Réorganisation des tuiles par drag & drop absente | EF-14 [S] | Lot 4 |
| Historique des dépenses passées absent (prévisionnel 12 mois présent) | EF-43 [S] | Lot 4 |

Éléments présents dans la maquette au-delà du CdC v1.0, intégrés en v1.1 : EF-09, EF-17, EF-18 et la section Confidentialité des réglages (§7).

**Bilan maquette v2 (18/08/2026)** — la v2 devient la **maquette de référence**. Les 5 écarts de la v1 sont tous couverts : suppression définitive avec double confirmation (EF-01), filtre par moyen de paiement (EF-12), recherche textuelle globale (EF-15), réorganisation drag & drop avec tri « ordre personnalisé » (EF-14) et historique des dépenses passées avec prix historisés (EF-43). Elle ajoute par ailleurs : thème clair, toasts (EF-19), préréglages d'alerte et défauts modifiables (EF-30), « tout marquer comme lu » (EF-31), écran catalogue dédié (§7), ajout/édition des moyens de paiement in-app. Écarts restants, à couvrir en développement :

| Écart | Exigence | Lot cible |
|---|---|---|
| Périodicité personnalisée (unité + intervalle : hebdo, 28 j…) non saisissable — le chip « Autre » existe sans champ associé | §3.2 / EF-02 [M] | Lot 1 |
| Plafond indicatif du type « à l'usage » absent du formulaire | §3.2 [S] | Lot 1 |
| Catalogue limité aux 12 services de démo — compléter avec les ~55 services de l'annexe A (donnée JSON, pas un sujet design) | Annexe A | Lot 2 |
| « Proposer un service » présent mais simulé (pas de formulaire d'ajout) | EF-09 [S] | Lot 2 |
| Flux d'import JSON (fusion vs remplacement) et CSV simulés, UI non maquettée | EF-50 [M] / EF-52 [S] | Lot 4 |
| Canal d'achat (exigence ajoutée en v1.3, postérieure à la maquette) : chips au formulaire, badge tuile/fiche, routage résiliation | §3.1 / EF-02, EF-21 [M] | Lot 1 (modèle, formulaire) + Lot 2 (routage) |

**Bilan maquette v3 (19/08/2026)** — la v3 devient la **maquette de référence** et couvre les 6 écarts de la v2 : périodicité personnalisée (chip « Autre » → intervalle + unité, démo Lycamobile 28 j), plafond indicatif « à l'usage » (démo Claude API), catalogue porté à **74 services en 11 familles** avec badges App Store et tarifs/périodicités pré-remplis, « Proposer un service » fonctionnel (formulaire + groupe « Mes services »), flux d'import complet (JSON fusion/remplacement avec confirmation, CSV avec aperçu des lignes reconnues), et canal d'achat (chips, badges tuile/fiche, routage, mention « souvent moins cher en direct » sur tarifs connus). Elle ajoute deux éléments intégrés au CdC : l'aide à la saisie libre (EF-02b) et une iconographie unifiée en une seule famille linéaire SVG. **La maquette couvre désormais l'intégralité du CdC** ; ne restent que les éléments non maquettables portés par les lots : coquille PWA (§5.2), calculs et persistance réels, imports réels (EF-50/52), Web Push (EF-33).

**Bilan maquette v4 (21/08/2026)** — la v4 devient la **maquette de référence**. Aucun retrait par rapport à la v3 ; les logos restent en initiales conformément au §3.4. Six ajouts, intégrés au CdC : interface bilingue FR/EN (EF-17b), devise d'affichage à taux indicatifs (EF-45, **à confirmer** — révise partiellement la décision « EUR uniquement »), mode grille/liste (EF-12b), annulation généralisée par toast (EF-01b, qui réalise le C2 du backlog), persistance des préférences d'interface (§3.5), téléchargements réels des exports JSON/ICS.

**Bilan maquette v6 (24/08/2026)** — la v6 devient la **maquette de référence finale**. Tous les écarts v1.9-v1.12 sont couverts : champs vie courante (montant estimé, régularisation, modes de résiliation avec démarches, référence client copiable), prix futur programmé, formules + formuleId, métadonnées catalogue/taux au contrat du §5.6 (« Catalogue v3 — tarifs indicatifs au 24/08/2026 »), écran À propos (licence AGPL-3.0, dépôt, soutien au projet). Elle maquette de plus une partie du backlog, promue en **lot 5 Pilotage** (EF-70→73) avec les extensions EF-06 (reprise auto), EF-13b, EF-43 (24 mois), EF-44b et le champ tags (§3.1). Les toggles push et widget y figurent en « démo/aperçu » : principe acté « aucune fonctionnalité factice » (§4.7).

---

## 7. Écrans

1. **Accueil** — grille de tuiles + barre de tri/filtre + total mensuel en tête.
2. **Fiche abonnement** — détail complet + actions.
3. **Création/édition** — formulaire avec choix catalogue ou saisie libre.
4. **Échéancier** — liste chronologique des prochaines échéances (groupée par mois), et vue calendrier mensuelle *(maquette v6, livrée au lot 3)*.
5. **Finances** — totaux, répartitions, prévisionnel.
6. **Moyens de paiement** — liste, ajout, édition, alerte expiration.
7. **Réglages** — devise par défaut de saisie et devise d'affichage (EF-45 / EF-45b), défauts d'alerte, thème d'apparence, langue, format de date *(v1.16 — JJ/MM/AAAA, MM/JJ/AAAA ou AAAA-MM-JJ, pour l'affichage et la saisie ; repris à l'onboarding C7)*, export/import, catalogue, rangée « Confidentialité » ouvrant une page dédiée *(v1.29, revue RGPD)* : données enregistrées et où, effacement et purge à 30 jours, exports en clair, e-mails de contact (contenu, usage, suppression sous douze mois), hébergement GitHub Pages et journaux techniques, droits, mentions légales (éditeur, hébergeur, licence) ; texte miroir dans PRIVACY.md à la racine du dépôt.
8. **Catalogue** — consultation des services préchargés + « Proposer un service », accessible depuis les réglages. *(issu de la maquette v2)*
9. **À propos** — licence AGPL-3.0, lien vers le dépôt public, soutien au projet (don), retours utilisateurs par e-mail *(v1.22 : « Signaler un bug ou proposer une idée » ouvre la messagerie avec version, appareil et langue pré-remplis ; l'app n'envoie rien elle-même ; v1.33 : version du système et du navigateur ajoutées quand le navigateur les donne — iOS et Android exacts, rien d'inventé sur Mac, iPad récent ou Windows)*, écran « Nouveautés » *(v1.19)* : notes de version dans la langue de l'interface, pastille tant que la version installée n'a pas été consultée, rappel à l'ouverture après une mise à jour. *(issu de la maquette v6)* Les réglages accueillent aussi la section « Automatisation » (avance des échéances, export ICS) — entrées push/widget masquées en V1 (§4.7).
10. **Onboarding** *(v1.17 — C7 promu en V1, maquette v6)* — trois écrans à la première ouverture : présentation (langue en tête dès le premier écran *(v1.21)*, 100 % local, échéances, finances, alertes), devise par défaut / format de date (préférences écrites au fil des choix), puis premier abonnement (catalogue, import JSON / CSV, jeu de démonstration, ou plus tard). « Passer » à tout moment ; rejouable depuis Réglages › Général › « Revoir l'introduction ».

---

## Annexe A — Catalogue initial (URLs indicatives, à vérifier au lot 2)

Environ 55 services répartis en 11 catégories. Pour les services souscrits via l'App Store (mention *App Store*), l'URL de gestion est remplacée par le deep link `itms-apps://apps.apple.com/account/subscriptions` (cf. EF-21). **Depuis la maquette v3, le catalogue embarqué (74 services, 11 familles, tarifs et périodicités indicatifs) fait référence ; la liste ci-dessous reste indicative.** URLs indicatives, à vérifier avant la mise en ligne. *(v1.9)* Le groupe « Vie courante » a été étendu au lot 2 (catalogue v2, 79 services) aux fournisseurs français courants (EDF, Engie, TotalEnergies, Veolia, principaux assureurs/mutuelles), avec modeResiliation pré-renseigné.

**Streaming vidéo** — Netflix (netflix.com/cancelplan) · Amazon Prime Video (amazon.fr/mc) · Disney+ (disneyplus.com/account) · HBO Max (hbomax.com/account) · Apple TV+ (*App Store*) · Canal+ (espaceclient.canalplus.com) · Paramount+ (paramountplus.com/account) · Crunchyroll (crunchyroll.com/account/membership) · ADN (animationdigitalnetwork.com) · YouTube Premium (youtube.com/paid_memberships) · Molotov (molotov.tv)

**Sport TV** — DAZN (dazn.com) · beIN Sports (beinsports.com)

**Musique & audio** — Spotify (spotify.com/account/subscription) · Deezer (deezer.com/account) · Apple Music (*App Store*) · Amazon Music (amazon.fr/music/settings) · YouTube Music (youtube.com/paid_memberships) · Tidal (tidal.com/account) · Audible (audible.fr/account)

**IA** — Claude (claude.ai/settings/billing) · ChatGPT (chatgpt.com → Settings → Subscription) · Gemini / Google AI (one.google.com/plans) · Copilot Pro (account.microsoft.com/services) · GitHub Copilot (github.com/settings/billing) · Midjourney (midjourney.com/account) · Perplexity (perplexity.ai/settings) · Le Chat Mistral (chat.mistral.ai)

**Cloud & stockage** — iCloud+ (*App Store* / Réglages iOS) · Google One (one.google.com/plans) · Dropbox (dropbox.com/account/plan) · Microsoft 365 / OneDrive (account.microsoft.com/services) · kDrive Infomaniak (manager.infomaniak.com) · pCloud (pcloud.com)

**Productivité & logiciels** — Adobe Creative Cloud (account.adobe.com/plans) · Canva Pro (canva.com/settings/billing) · Notion (notion.so → réglages) · 1Password (start.1password.com) · Bitwarden (vault.bitwarden.com) · Dashlane (app.dashlane.com) · LinkedIn Premium (linkedin.com/premium/manage)

**Sport & fitness** — Strava (strava.com/account) · Basic-Fit (my.basic-fit.com) · Fitness Park (espace membre) · Zwift (zwift.com/account) · TrainingPeaks (trainingpeaks.com) · Komoot Premium (komoot.com) · AllTrails+ (alltrails.com) · Garmin Connect+ (garmin.com → compte) · Apple Fitness+ (*App Store*)

**Presse & info** — Le Monde (moncompte.lemonde.fr) · L'Équipe (lequipe.fr → abonnement) · Mediapart (mediapart.fr → mon compte) · Les Échos (lesechos.fr → mes abonnements) · Cafeyn (cafeyn.co)

**Gaming** — PlayStation Plus (playstation.com → abonnements) · Xbox Game Pass (account.microsoft.com/services) · Nintendo Switch Online (accounts.nintendo.com) · GeForce Now (nvidia.com/geforce-now) · Apple Arcade (*App Store*) · Twitch (twitch.tv/subscriptions)

**VPN & sécurité** — NordVPN (my.nordaccount.com) · Proton (account.proton.me) · Surfshark (my.surfshark.com) · ExpressVPN (expressvpn.com)

**Vie courante** — Uber One (app Uber) · Deliveroo Plus (deliveroo.fr → compte) · Fnac+ (fnac.com → compte) · Télépéage Ulys / Bip&Go / Fulli (espace client) · Babbel (babbel.com) · Duolingo Super (*App Store* fréquent) · Headspace (headspace.com) · Calm (calm.com) · Petit BamBou (*App Store* fréquent)

*(liste extensible — une entrée = un objet JSON : nom, catégorie, couleur, initiales/emoji, urlGestion, périodicités connues)*

---

## Annexe B — Décisions actées

| Décision | Choix | Date |
|---|---|---|
| Plateforme | Web / PWA | 14/08/2026 |
| Ambition MVP | Périmètre complet, livré en 4 lots | 14/08/2026 |
| Synchronisation | Locale uniquement (migration possible) | 14/08/2026 |
| Backend | Aucun | 14/08/2026 |
| Maquette de référence | v1 Claude Design (HTML standalone), écarts tracés au §6 | 16/08/2026 |
| Maquette de référence | v2 Claude Design — couvre les 5 écarts de la v1, écarts restants au §6 | 18/08/2026 |
| Devise | V1 : EUR uniquement — multi-devise en évolution | 18/08/2026 |
| Canal d'achat | Champ canalAchat (direct / App Store / Google Play), distinct du moyen de paiement, pilote la résiliation | 19/08/2026 |
| Maquette de référence | v3 Claude Design — couvre l'intégralité du CdC ; catalogue embarqué de 74 services fait référence | 19/08/2026 |
| Architecture | Backend-ready sans backend en V1 : provisions §3.5 et §5.6 (uuid, updatedAt, tombstones, StorageProvider, offline-first, catalogue distant possible) | 19/08/2026 |
| Open source | Oui, dès le lot 1 ; licence à trancher (AGPL-3.0 recommandée) | 20/08/2026 |
| Logos de marques | Champ `logo` évolutif avec rendu à repli dès le lot 1 (§3.4) ; implémentation des pictos de marques en évolution (C10), jamais d'assets de marques dans le dépôt | 20/08/2026 |
| Maquette de référence | v4 Claude Design — aucun retrait, 6 ajouts intégrés (EF-01b, EF-12b, EF-17b, EF-45, §3.5) | 21/08/2026 |
| Devise d'affichage | **Confirmée** (EF-45) : taux figés étiquetés « indicatifs », révisés à chaque release ; saisie maintenue en EUR | 21/08/2026 |
| Vie courante | Couverte : 4 champs de modèle dès le lot 1 (montantEstime/regularisation, modeResiliation, referenceClient, prixFutur — EF-04b, EF-08b, EF-21b) + backlog C11-C14 ; suivi de consommation et agrégation bancaire exclus | 21/08/2026 |
| Veille tarifaire | Provision structurelle dès le lot 1 : formules multiples + ids stables + fraîcheur du catalogue (§3.4), formuleId sur les abonnements (§3.1), principe « données descendantes uniquement » (§5.6) ; collecte et suggestions en évolution C15 | 22/08/2026 |
| Données de référence | Mécanisme unifié `RefDataProvider` (§5.6) : contrat commun { version, publieLe, data } pour catalogue, taux de change et jeux futurs — interface posée au lot 1, lecture distante en évolution | 22/08/2026 |
| Licence | **AGPL-3.0 actée** ; clause de re-licenciement dans le CONTRIBUTING.md pour préserver un passage MIT futur | 24/08/2026 |
| Maquette de référence | **v6 Claude Design — référence finale** : écarts v1.9-v1.12 couverts, backlog C4/C5/C6/C11/C13 maquetté et promu en lot 5 « Pilotage » (EF-70→73) ; principe « aucune fonctionnalité factice » (push/widget masqués en V1) | 24/08/2026 |
| Nom de l'app | **Subtuile** — sub(scription) + tuile ; « Subtile » écarté après vérification (collision avec subtile.app, catégorie adjacente) ; choix « pour le moment », révisable jusqu'à la mise en ligne. Le logo et le nom sont des actifs de marque **hors licence AGPL** | 25/08/2026 |
| Devise de saisie | Par abonnement (EUR / USD / GBP / CHF, EF-45b) avec devise par défaut réglable (Réglages, onboarding C7) ; révise « saisie maintenue en EUR » ; livraison au lot 4 avec EF-45 | 11/09/2026 |
| Onboarding | C7 promu en V1 : trois écrans à la première ouverture (présentation, devise / langue / format de date, premier abonnement : catalogue, import, démo, plus tard), « Revoir l'introduction » dans les réglages ; livré au lot 4 étape 7 | 13/09/2026 |

---

## Annexe D — Open source et licence

- **Dépôt public dès le lot 1** (cf. §5.5) : LICENSE, README, CONTRIBUTING.md ; aucun secret ni donnée personnelle dans le code.
- **Licence actée : AGPL-3.0** *(24/08/2026)* — quiconque héberge une version modifiée doit republier son code. Pour préserver un éventuel changement futur de licence libre malgré des contributions externes, le CONTRIBUTING.md précise que les contributions acceptées incluent le droit de re-licencier le projet.
- **Contributions externes** : aucune obligation d'accepter les PR, de répondre aux issues ni d'assurer un support ; la licence exclut toute garantie.
- **Nom et logo** : actifs de marque hors licence AGPL, tous droits réservés (annexe B, 25/08/2026).
- **Exclus par principe** : publicité, vente ou exploitation des données — incompatibles avec la promesse « 100 % local, zéro tracking », qui est un argument de différenciation.
- Distribution attendue via l'écosystème open source (communautés self-hosted) plutôt que par le marketing.

## Annexe C — Backlog de complétude (candidats, non arbitrés)

Pistes identifiées pour une app « complète », candidates non arbitrées :

| # | Piste | Intérêt |
|---|---|---|
| C1 | Rappel de sauvegarde (« dernière sauvegarde il y a X jours ») — **réalisé** en v1.0.3 : alerte au-delà de 30 jours sans export, ou dès 3 abonnements sans aucune sauvegarde, date du dernier export dans Réglages › Données ; export automatique périodique : reste candidat | Parer le risque de perte des données locales |
| C2 | Corbeille / annulation après suppression définitive — **réalisé** par l'undo par toast (EF-01b, maquette v4) | Filet de sécurité |
| C3 | Détection de doublons à la création (service déjà actif) — **couvert en partie** par les doublons de l'import bancaire (EF-73) ; à la création manuelle : **réalisé** en v1.0.3 (avertissement « Déjà suivi ? » pour un même service du catalogue ou un même nom non archivé) | Qualité des données |
| C4 | Budget mensuel cible avec seuil d'alerte — **promu** : EF-70, lot 5 (maquette v6) | Pilotage — « abonnements > X €/mois » |
| C5 | Revue d'usage périodique avec proposition de résiliation — **promu** : EF-71, lot 5 (maquette v6) | Cœur de valeur des apps du genre |
| C6 | Comparatif mensuel vs annuel via les tarifs du catalogue — **promu** : EF-72, lot 5 (maquette v6) | Économies concrètes |
| C7 | Onboarding premier lancement (parcours guidé : import, catalogue, premier abonnement) — **réalisé** au lot 4 (§7.10, v1.17) | Prise en main |
| C8 | Verrouillage optionnel de l'app (code / Face ID via WebAuthn) | Confidentialité des dépenses |
| C9 | Rapport annuel exportable (récap des dépenses) | Bilan de fin d'année |
| C10 | Logos de marques dans les tuiles (bibliothèque de pictos en dépendance npm + upload perso, cf. §3.4) — la structure `logo` évolutive est provisionnée dès le lot 1, seul le rendu « initiales » est implémenté en V1 | Identité visuelle des tuiles |
| C11 | Détection d'abonnements depuis un export bancaire CSV : repérage local des prélèvements récurrents, proposition de création — aucun agrégateur, 100 % local *(v1.9)* — **promu** : EF-73, lot 5 (maquette v6) | Résout le vrai problème : la saisie initiale |
| C12 | Compteur d'économies réalisées : cumul des mensualités évitées depuis chaque résiliation — brique de gamification la plus saine *(v1.9)* | Motivation, valeur perçue |
| C13 | Tags libres (maison, voiture, pro…) en complément des catégories *(v1.9)* — **promu** : champ tags §3.1 + filtre EF-12, lots 1-2 (maquette v6) | Organisation, surtout avec les contrats vie courante |
| C14 | Rappel libre à date par abonnement (« renégocier la box en janvier », « comparer les offres élec ») *(v1.9)* — **promu** : EF-74, livré en 1.0.24 *(v1.31)* | Renégociations et échéances de prix fixes |
| C15 | Veille tarifaire : catalogue distant publié par un pipeline de collecte des prix (formules, promos, fraîcheur), comparaison 100 % locale → alertes de hausse officielles, suggestions de formule/canal moins cher, mises à jour de prix en un tap (cf. §5.6, provision §3.1/§3.4) | Données réelles à jour |
| C16 | Catalogue : paliers (formules) de chaque service vérifiés et complétés dans la bibliothèque, pour proposer à l'ajout tous les tiers disponibles quand l'utilisateur choisit un service *(v1.18, demande du 13/09/2026)* | Complétude du catalogue |
| C17 | Tarifs du catalogue par pays / devise : grille de prix locale selon le pays de l'utilisateur (à choisir à l'onboarding, avec la devise) plutôt qu'une conversion de l'euro aux taux indicatifs *(v1.18, demande du 13/09/2026)* | Justesse des tarifs proposés |
| C18 | Thème sombre « OLED » : noirs purs, en troisième choix du réglage d'apparence à côté de clair / sombre / système (EF-17) ; palette à définir avant intégration *(v1.25, demande du 15/09/2026)* | Confort de lecture de nuit, autonomie sur écrans OLED |
| C20 | Export JSON chiffré par mot de passe (AES-GCM via WebCrypto, 100 % local), en option à côté de l'export en clair ; import symétrique *(v1.28, revue RGPD du 16/09/2026)* | Sauvegardes protégées sur l'appareil |
| C19 | Store par plateforme : détection locale de l'appareil (iOS, Android, autre) et réglage « Boutique d'applications » (Automatique / App Store / Google Play / Les deux) pour ne proposer que les formules et le canal du store de l'utilisateur, et ne comparer « moins cher en direct » qu'avec ce store ; les services sans tarif direct gardent leurs formules App Store à titre indicatif. Limite connue : le catalogue n'a pas de prix Google Play (Apple affiche le prix de chaque abonnement, Google une fourchette) *(v1.27, demande du 16/09/2026)* | Formules pertinentes selon l'appareil |
| C21 | Mode discret : un appui sur le total de l'accueil masque tous les montants de l'app (« **** € » sur les tuiles, les totaux, la fiche, les finances, l'échéancier), un second appui les rétablit ; état mémorisé en préférence, indicateur discret (œil barré) *(v1.32, demande du 18/09/2026)* | Consulter l'app en public sans exposer ses dépenses |
| C22 | Personnalisation de l'affichage : couleur choisie par abonnement (champ `couleur` déjà prévu au modèle, EF-10, sans sélecteur à ce jour), contenu des tuiles au choix (prix, échéance, moyen de paiement, catégorie, badge), puis logo personnel (C10) ; réglages dans Réglages › Apparence *(v1.32, demande du 18/09/2026)* | Tuiles reconnaissables au premier coup d'œil |
| C23 | Langues et devises supplémentaires : le socle i18n (dictionnaires, pluriels, formats de date) et les devises (`DEVISES`, `taux.json`) sont extensibles ; ajouter une langue = un dictionnaire complet et ses formats, ajouter une devise = son taux indicatif et son symbole ; à relier à C17 pour les tarifs par pays. Pas une priorité *(v1.32, demande du 18/09/2026)* | Ouverture hors francophonie et zone euro |
