/**
 * Modèle de données — CdC §3 (v1.15).
 *
 * Conventions :
 * - `DateISO` : date civile LOCALE « YYYY-MM-DD », sans heure ni fuseau (EF-03).
 *   Les comparaisons lexicographiques sur ce format sont chronologiques.
 * - `Horodatage` : instant ISO 8601 complet (updatedAt, deletedAt).
 * - Montants en EUR, seule devise de saisie en V1 (annexe B).
 * - Les identifiants d'énumérations sont stables et servent de clés i18n ;
 *   aucun libellé ici.
 */

export type DateISO = string;
export type Horodatage = string;

/* ---------------------------------------------------------------------------
 * §3.5 — Champs techniques communs (préparation sync)
 * ------------------------------------------------------------------------- */

export interface EntiteTechnique {
  /** uuid v4 */
  id: string;
  /** mis à jour à chaque écriture */
  updatedAt: Horodatage;
  /** suppression logique (tombstone) ; null = vivant */
  deletedAt: Horodatage | null;
}

/* ---------------------------------------------------------------------------
 * §3.1 — Énumérations
 * ------------------------------------------------------------------------- */

export const CATEGORIES = [
  'streaming',
  'sport',
  'musique',
  'ia',
  'cloud',
  'productivite',
  'presse',
  'gaming',
  'securite',
  'vie_courante',
  'autre',
] as const;
export type Categorie = (typeof CATEGORIES)[number];

export const CANAUX_ACHAT = ['direct', 'app_store', 'google_play'] as const;
export type CanalAchat = (typeof CANAUX_ACHAT)[number];

export const MODES_RESILIATION = [
  'lien',
  'telephone',
  'courrier_recommande',
  'espace_client',
] as const;
export type ModeResiliation = (typeof MODES_RESILIATION)[number];

export type DeviseSaisie = 'EUR';
export const DEVISES_AFFICHAGE = ['EUR', 'USD', 'GBP', 'CHF'] as const;
export type DeviseAffichage = (typeof DEVISES_AFFICHAGE)[number];

/* ---------------------------------------------------------------------------
 * §3.2 — Périodicité
 * ------------------------------------------------------------------------- */

export const UNITES_PERIODE = ['jour', 'semaine', 'mois', 'an'] as const;
export type UnitePeriode = (typeof UNITES_PERIODE)[number];

export interface PeriodiciteRecurrente {
  type: 'recurrente';
  unite: UnitePeriode;
  /** entier ≥ 1 : mensuel = mois×1, trimestriel = mois×3, 28 jours = jour×28 */
  intervalle: number;
}
export interface PeriodiciteAVie {
  type: 'a_vie';
}
export interface PeriodiciteALUsage {
  type: 'a_l_usage';
  /** plafond indicatif optionnel (crédits API, recharge) */
  plafond: number | null;
}
export type Periodicite = PeriodiciteRecurrente | PeriodiciteAVie | PeriodiciteALUsage;

/** Périodicités usuelles, réutilisées par le formulaire et le catalogue. */
export const PERIODICITES = {
  hebdomadaire: { type: 'recurrente', unite: 'semaine', intervalle: 1 },
  vingtHuitJours: { type: 'recurrente', unite: 'jour', intervalle: 28 },
  mensuelle: { type: 'recurrente', unite: 'mois', intervalle: 1 },
  trimestrielle: { type: 'recurrente', unite: 'mois', intervalle: 3 },
  semestrielle: { type: 'recurrente', unite: 'mois', intervalle: 6 },
  annuelle: { type: 'recurrente', unite: 'an', intervalle: 1 },
  aVie: { type: 'a_vie' },
  aLUsage: { type: 'a_l_usage', plafond: null },
} as const satisfies Record<string, Periodicite>;

/* ---------------------------------------------------------------------------
 * §3.1 — Statut (EF-06)
 * ------------------------------------------------------------------------- */

export interface StatutActif {
  type: 'actif';
}
export interface StatutEnPause {
  type: 'en_pause';
  /** reprise automatique « en pause jusqu'au X » (v1.14) ; null = indéterminée */
  repriseLe: DateISO | null;
}
export interface StatutResilie {
  type: 'resilie_actif_jusquau';
  jusquau: DateISO;
}
export interface StatutArchive {
  type: 'archive';
}
export type Statut = StatutActif | StatutEnPause | StatutResilie | StatutArchive;
export type TypeStatut = Statut['type'];
export const TYPES_STATUT = ['actif', 'en_pause', 'resilie_actif_jusquau', 'archive'] as const;

/* ---------------------------------------------------------------------------
 * §3.1 — Sous-objets
 * ------------------------------------------------------------------------- */

/** EF-04 : « essai jusqu'au X, puis Y € » */
export interface Essai {
  dateFin: DateISO;
  prixApres: number;
}
/** EF-05 : date limite de résiliation = fin d'engagement − préavis */
export interface Engagement {
  dureeMois: number;
  preavisJours: number;
}
/** EF-44 : les vues financières utilisent partPayee */
export interface Partage {
  prixTotal: number;
  partPayee: number;
}
/** EF-04b : régularisation annuelle (mensualités lissées) */
export interface Regularisation {
  date: DateISO;
}
/** EF-08b : hausse annoncée, appliquée automatiquement à la date */
export interface PrixFutur {
  date: DateISO;
  montant: number;
}
/**
 * EF-08 : chronologie des prix. Chaque entrée = prix en vigueur À PARTIR de
 * `date` ; la première entrée est posée à la création (dateDebut, prix
 * initial), les suivantes à chaque hausse (EF-08, EF-08b). Permet de
 * reconstituer le montant « au tarif de l'époque » (EF-13b, EF-43).
 */
export interface EntreeHistoriquePrix {
  date: DateISO;
  prix: number;
}

/* ---------------------------------------------------------------------------
 * §3.4 — Logo évolutif (rendu à repli icone → upload → initiales ; V1 : initiales)
 * ------------------------------------------------------------------------- */

export const LOGO_TYPES = ['initiales', 'icone', 'upload'] as const;
export type LogoType = (typeof LOGO_TYPES)[number];
export interface Logo {
  type: LogoType;
  /** initiales : texte ; icone : slug de la bibliothèque ; upload : data URL locale */
  valeur: string;
}

/* ---------------------------------------------------------------------------
 * §3.1 — Abonnement
 * ------------------------------------------------------------------------- */

export interface Abonnement extends EntiteTechnique {
  /** null si saisie libre */
  serviceId: string | null;
  /** formule du catalogue (v1.11) ; null si saisie libre ou inconnue */
  formuleId: string | null;
  nom: string;
  categorie: Categorie;
  periodicite: Periodicite;
  /** prix courant */
  prix: number;
  /** montant variable : affiché « ~X € », totaux marqués (EF-04b) */
  montantEstime: boolean;
  regularisation: Regularisation | null;
  prixFutur: PrixFutur | null;
  modeResiliation: ModeResiliation;
  /** contact associé au mode de résiliation : n° de téléphone, adresse postale, URL espace client */
  contactResiliation: string | null;
  /** n° client / n° de contrat, affiché en évidence */
  referenceClient: string | null;
  devise: DeviseSaisie;
  dateDebut: DateISO;
  /**
   * Surcharge manuelle de la prochaine échéance (CdC : « calculée, modifiable
   * manuellement »). Devient le nouvel ancrage du cycle ; null = calcul depuis
   * dateDebut (ou la fin d'essai).
   */
  echeanceManuelle: DateISO | null;
  /** valeur calculée par le moteur de dates, dénormalisée pour le tri et les index */
  prochaineEcheance: DateISO | null;
  essai: Essai | null;
  engagement: Engagement | null;
  partage: Partage | null;
  /** instrument réel (CB, PayPal…), y compris derrière un compte Apple */
  moyenPaiementId: string | null;
  /** pilote le lien de résiliation (EF-21), distinct du moyen de paiement */
  canalAchat: CanalAchat;
  statut: Statut;
  /** héritée du catalogue, surchargeable */
  urlGestion: string | null;
  historiquePrix: EntreeHistoriquePrix[];
  /** étiquettes libres en complément de la catégorie (v1.14) */
  tags: string[];
  notes: string;

  /* Compléments hors tableau §3.1, requis par des exigences du CdC */

  /** couleur de tuile en saisie libre ou surcharge du catalogue (EF-10) ; null = service / défaut */
  couleur: string | null;
  /** logo en saisie libre ou surcharge du catalogue (§3.4) ; null = service / initiales du nom */
  logo: Logo | null;
  /** alerte J-X propre à l'abonnement (EF-30) ; null = défaut global */
  alerteJoursAvant: number | null;
  /** position dans le tri « ordre personnalisé » (EF-14) ; null = jamais réordonné */
  ordre: number | null;
}

/* ---------------------------------------------------------------------------
 * §3.3 — Moyen de paiement (jamais de numéro complet ni de CVV)
 * ------------------------------------------------------------------------- */

export const TYPES_MOYEN_PAIEMENT = ['cb', 'paypal', 'apple_pay', 'sepa', 'autre'] as const;
export type TypeMoyenPaiement = (typeof TYPES_MOYEN_PAIEMENT)[number];

export interface MoyenPaiement extends EntiteTechnique {
  type: TypeMoyenPaiement;
  /** ex. « CB perso » */
  libelle: string;
  /** 4 derniers chiffres uniquement, optionnel */
  quatreDerniers: string | null;
  /** « YYYY-MM », optionnel → alerte « carte expirée » (EF-30) */
  dateExpiration: string | null;
  /** affichage de la pastille sur les tuiles */
  couleur: string;
}

/* ---------------------------------------------------------------------------
 * §3.4 — Service (catalogue) et formules (v1.11)
 * ------------------------------------------------------------------------- */

export interface Formule {
  /** stable, jamais renommé ni réutilisé */
  id: string;
  nom: string;
  prix: number;
  periodicite: Periodicite;
  canal: CanalAchat;
}

export interface Service {
  /** stable, jamais renommé ni réutilisé */
  id: string;
  nom: string;
  categorie: Categorie;
  /** fond de tuile */
  couleur: string;
  logo: Logo;
  /** page de gestion / résiliation ; null si aucune (résiliation hors ligne) */
  urlGestion: string | null;
  /** variantes selon canal d'achat (§5.3) */
  deepLinks: Partial<Record<CanalAchat, string>>;
  /** pré-remplissage à la création */
  periodicitesConnues: Periodicite[];
  formules: Formule[];
  modeResiliation: ModeResiliation;
  contactResiliation: string | null;
  /** vie courante : montant variable par défaut (EF-04b) */
  montantEstime: boolean;
  /** mis en avant dans la sélection du formulaire avant toute recherche (maquette v3) */
  populaire: boolean;
}

/** EF-09 : entrée « Mes services », réutilisable comme une entrée du catalogue. */
export interface ServicePersonnalise extends Service, EntiteTechnique {}

/* ---------------------------------------------------------------------------
 * §5.6 — Données de référence descendantes (contrat commun)
 * ------------------------------------------------------------------------- */

export interface RefData<T> {
  /** entier incrémenté à chaque publication */
  version: number;
  /** date de fraîcheur, affichable « … indicatifs au JJ/MM/AAAA » */
  publieLe: DateISO;
  data: T;
}

export type Catalogue = RefData<Service[]>;

/** EF-45 : taux figés « indicatifs », base EUR */
export interface TauxChange {
  base: DeviseSaisie;
  taux: Record<DeviseAffichage, number>;
}
export type Taux = RefData<TauxChange>;

/* ---------------------------------------------------------------------------
 * §3.5 — Préférences d'interface (localStorage, distinctes des données métier)
 * ------------------------------------------------------------------------- */

export const LANGUES = ['fr', 'en'] as const;
export type Langue = (typeof LANGUES)[number];

export const THEMES = ['clair', 'sombre', 'systeme'] as const;
export type Theme = (typeof THEMES)[number];

export const MODES_AFFICHAGE = ['grille', 'liste'] as const;
export type ModeAffichage = (typeof MODES_AFFICHAGE)[number];

export const TRIS_ACCUEIL = ['echeance', 'prix', 'nom', 'categorie', 'personnalise'] as const;
export type TriAccueil = (typeof TRIS_ACCUEIL)[number];

/** Format d'affichage et de saisie des dates courtes : JJ/MM/AAAA, MM/JJ/AAAA, AAAA-MM-JJ */
export const FORMATS_DATE = ['jma', 'mja', 'iso'] as const;
export type FormatDate = (typeof FORMATS_DATE)[number];

/** EF-30 : défauts globaux d'alerte, modifiables dans les réglages */
export interface DefautsAlerte {
  echeanceJours: number;
  essaiJours: number;
  preavisJours: number;
  carteMois: number;
}

export interface Preferences {
  langue: Langue;
  theme: Theme;
  affichage: ModeAffichage;
  tri: TriAccueil;
  deviseAffichage: DeviseAffichage;
  formatDate: FormatDate;
  alertes: DefautsAlerte;
}

/* ---------------------------------------------------------------------------
 * EF-50 — Export JSON (schemaVersion, migrations locales)
 * ------------------------------------------------------------------------- */

export const SCHEMA_VERSION = 1;

export interface ExportJSON {
  app: 'subtuile';
  schemaVersion: number;
  exporteLe: Horodatage;
  abonnements: Abonnement[];
  moyensPaiement: MoyenPaiement[];
  servicesPersonnalises: ServicePersonnalise[];
}
