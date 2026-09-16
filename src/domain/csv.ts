/**
 * Import CSV simple (EF-52) : saisie initiale en masse — nom, prix,
 * périodicité, échéance. Séparateur détecté (« ; », « , » ou tabulation),
 * en-tête reconnu en français ou en anglais (sinon ordre des colonnes), prix
 * et dates dans le format choisi. Les lignes illisibles sont signalées avec
 * leur raison, jamais importées en silence.
 */

import { comparerDates } from './dates';
import {
  abonnementDepuisFormulaire,
  formulaireVide,
  parserMontant,
  presetDepuisPeriodicite,
  validerFormulaire,
} from './formulaire';
import {
  PERIODICITES,
  type Abonnement,
  type CanalAchat,
  type Categorie,
  type DateISO,
  type Devise,
  type FormatDate,
  type Langue,
  type Periodicite,
  type TypeStatut,
} from './types';

export type Separateur = ';' | ',' | '\t';

export interface LigneCsv {
  /** numéro de ligne dans le fichier (1 = première ligne de données) */
  numero: number;
  nom: string;
  /** prix tel que saisi, déjà lisible (« 11,99 ») */
  prix: string;
  periodicite: Periodicite;
  /** prochaine échéance ISO, ou null si absente */
  echeance: DateISO | null;
}

export type RaisonRejet = 'nom' | 'prix' | 'periodicite' | 'echeance' | 'colonnes';

export interface LigneRejetee {
  numero: number;
  raison: RaisonRejet;
  contenu: string;
}

export interface AnalyseCsv {
  separateur: Separateur;
  enTete: boolean;
  /** colonne de chaque champ (index dans la ligne, -1 = absente) */
  colonnes: ColonnesCsv;
  /** champs de la première ligne du fichier, pour nommer les colonnes à l'écran */
  premiereLigne: string[];
  reconnues: LigneCsv[];
  rejetees: LigneRejetee[];
}

/** Réglages choisis à la main quand la détection automatique ne convient pas (v1.27). */
export interface OptionsCsv {
  separateur?: Separateur;
  enTete?: boolean;
  colonnes?: ColonnesCsv;
}

/** Découpe une ligne CSV en champs (guillemets doubles, guillemet doublé = échappement). */
export function decouperLigne(ligne: string, separateur: Separateur): string[] {
  const champs: string[] = [];
  let courant = '';
  let entreGuillemets = false;
  for (let i = 0; i < ligne.length; i += 1) {
    const c = ligne[i]!;
    if (entreGuillemets) {
      if (c === '"' && ligne[i + 1] === '"') {
        courant += '"';
        i += 1;
      } else if (c === '"') entreGuillemets = false;
      else courant += c;
    } else if (c === '"') entreGuillemets = true;
    else if (c === separateur) {
      champs.push(courant);
      courant = '';
    } else courant += c;
  }
  champs.push(courant);
  return champs.map((x) => x.trim());
}

/** Séparateur le plus fréquent sur la première ligne non vide (« ; » par défaut). */
export function detecterSeparateur(texte: string): Separateur {
  const premiere = texte.split(/\r?\n/).find((l) => l.trim() !== '') ?? '';
  const candidats: Separateur[] = [';', ',', '\t'];
  let meilleur: Separateur = ';';
  let max = 0;
  for (const s of candidats) {
    const n = premiere.split(s).length - 1;
    if (n > max) {
      max = n;
      meilleur = s;
    }
  }
  return meilleur;
}

const MOTS_COLONNES = {
  nom: ['nom', 'name', 'service', 'abonnement', 'subscription', 'libellé', 'libelle'],
  prix: ['prix', 'price', 'montant', 'amount', 'cost', 'coût', 'cout'],
  periodicite: [
    'périodicité',
    'periodicite',
    'période',
    'periode',
    'cycle',
    'fréquence',
    'frequence',
    'frequency',
    'billing',
  ],
  echeance: [
    'échéance',
    'echeance',
    'date',
    'renouvellement',
    'renewal',
    'prochaine',
    'next',
    'due',
    'due date',
    'next due',
  ],
} as const;
export type Colonne = keyof typeof MOTS_COLONNES;
export type ColonnesCsv = Record<Colonne, number>;
export const COLONNES_CSV: readonly Colonne[] = ['nom', 'prix', 'periodicite', 'echeance'];
export const SEPARATEURS_CSV: readonly Separateur[] = [';', ',', '\t'];
const COLONNES_PAR_DEFAUT: ColonnesCsv = { nom: 0, prix: 1, periodicite: 2, echeance: 3 };

function normaliser(texte: string): string {
  return texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Reconnaît un en-tête : au moins « nom » et « prix » identifiés. Renvoie l'index de chaque colonne. */
export function reconnaitreEnTete(champs: readonly string[]): ColonnesCsv | null {
  const index: Partial<Record<Colonne, number>> = {};
  champs.forEach((champ, i) => {
    const c = normaliser(champ);
    for (const colonne of Object.keys(MOTS_COLONNES) as Colonne[]) {
      if (index[colonne] === undefined && MOTS_COLONNES[colonne].some((m) => normaliser(m) === c)) {
        index[colonne] = i;
      }
    }
  });
  if (index.nom === undefined || index.prix === undefined) return null;
  return {
    nom: index.nom,
    prix: index.prix,
    periodicite: index.periodicite ?? -1,
    echeance: index.echeance ?? -1,
  };
}

const MOTS_PERIODICITE: [Periodicite, string[]][] = [
  [PERIODICITES.hebdomadaire, ['semaine', 'hebdo', 'hebdomadaire', 'week', 'weekly', 'w']],
  [PERIODICITES.vingtHuitJours, ['28', '28 j', '28 jours', '28j', '28 days', '4 semaines']],
  [PERIODICITES.mensuelle, ['mois', 'mensuel', 'mensuelle', 'month', 'monthly', 'm', '1 mois']],
  [
    PERIODICITES.trimestrielle,
    ['trimestre', 'trimestriel', 'trimestrielle', 'quarter', 'quarterly', '3 mois'],
  ],
  [
    PERIODICITES.semestrielle,
    ['semestre', 'semestriel', 'semestrielle', 'half-year', 'half year', '6 mois'],
  ],
  [
    PERIODICITES.annuelle,
    ['an', 'annee', 'année', 'annuel', 'annuelle', 'year', 'yearly', 'annual', 'y', '12 mois'],
  ],
];

const UNITES_PAR_MOT: Record<string, 'jour' | 'semaine' | 'mois' | 'an'> = {
  jour: 'jour',
  jours: 'jour',
  day: 'jour',
  days: 'jour',
  semaine: 'semaine',
  semaines: 'semaine',
  week: 'semaine',
  weeks: 'semaine',
  mois: 'mois',
  month: 'mois',
  months: 'mois',
  an: 'an',
  ans: 'an',
  annee: 'an',
  annees: 'an',
  year: 'an',
  years: 'an',
};
const MOTS_A_VIE = ['à vie', 'a vie', 'vie', 'lifetime', 'one-time', 'one time'];
const MOTS_USAGE = ["à l'usage", 'à l’usage', "a l'usage", 'a l’usage', 'usage', 'pay as you go'];
const MOTS_QUOTIDIEN = ['jour', 'quotidien', 'quotidienne', 'day', 'daily', 'd'];

/**
 * « mois » / « monthly » / « an »… → périodicité ; vide → mensuelle ; « 2 ans »,
 * « 10 jours », « à vie », « usage » compris (v1.27, aller-retour avec l'export) ;
 * inconnu → null.
 */
export function periodiciteDepuisTexte(texte: string): Periodicite | null {
  const t = normaliser(texte).replace(/\.$/, '');
  if (t === '') return PERIODICITES.mensuelle;
  for (const [periodicite, mots] of MOTS_PERIODICITE) {
    if (mots.some((m) => normaliser(m) === t)) return periodicite;
  }
  if (MOTS_A_VIE.some((m) => normaliser(m) === t)) return PERIODICITES.aVie;
  if (MOTS_USAGE.some((m) => normaliser(m) === t)) return PERIODICITES.aLUsage;
  if (MOTS_QUOTIDIEN.includes(t)) return { type: 'recurrente', unite: 'jour', intervalle: 1 };
  const m = /^(\d+)\s*([a-z]+)$/.exec(t);
  if (m) {
    const unite = UNITES_PAR_MOT[m[2] ?? ''];
    const intervalle = Number(m[1]);
    if (unite && Number.isInteger(intervalle) && intervalle >= 1) {
      return { type: 'recurrente', unite, intervalle };
    }
  }
  return null;
}

/** Date ISO, ou dans le format choisi ; le format « inverse » est tenté ensuite (fichier d'un autre pays). */
function lireDate(
  texte: string,
  format: FormatDate,
  parser: (t: string, f: FormatDate) => DateISO | null,
): DateISO | null {
  const t = texte.trim();
  if (t === '') return null;
  return parser(t, format) ?? parser(t, format === 'mja' ? 'jma' : 'mja');
}

/**
 * Analyse complète d'un texte CSV : lignes reconnues et rejetées, avec leurs
 * raisons. Sans option, tout est détecté (séparateur, en-tête fr / en, sinon
 * ordre nom, prix, périodicité, échéance) ; les options imposent le séparateur,
 * la présence d'un en-tête ou la colonne de chaque champ (v1.27).
 */
export function analyserCsv(
  texte: string,
  format: FormatDate,
  parserDate: (t: string, f: FormatDate) => DateISO | null,
  options: OptionsCsv = {},
): AnalyseCsv {
  // marque d'ordre des octets (BOM) des fichiers Excel ignorée
  const brut = texte.replace(/^\uFEFF/, '');
  const separateur = options.separateur ?? detecterSeparateur(brut);
  const lignes = brut.split(/\r?\n/).filter((l) => l.trim() !== '');
  const reconnues: LigneCsv[] = [];
  const rejetees: LigneRejetee[] = [];
  const premiere = lignes[0];
  const premiereLigne = premiere === undefined ? [] : decouperLigne(premiere, separateur);
  const detectees = reconnaitreEnTete(premiereLigne);
  const enTete = options.enTete ?? detectees !== null;
  const colonnes: ColonnesCsv = options.colonnes ?? detectees ?? COLONNES_PAR_DEFAUT;
  const depart = enTete ? 1 : 0;
  const champ = (champs: string[], colonne: Colonne): string =>
    colonnes[colonne] >= 0 ? (champs[colonnes[colonne]] ?? '') : '';

  lignes.slice(depart).forEach((ligne, i) => {
    const numero = i + 1;
    const champs = decouperLigne(ligne, separateur);
    const rejeter = (raison: RaisonRejet) => rejetees.push({ numero, raison, contenu: ligne });
    if (champs.length < 2) return rejeter('colonnes');
    const nom = champ(champs, 'nom');
    if (nom === '') return rejeter('nom');
    const prixTexte = champ(champs, 'prix');
    const prix = parserMontant(prixTexte);
    if (prix === null || prix < 0) return rejeter('prix');
    const periodicite = periodiciteDepuisTexte(champ(champs, 'periodicite'));
    if (periodicite === null) return rejeter('periodicite');
    const echeanceTexte = champ(champs, 'echeance');
    const echeance = lireDate(echeanceTexte, format, parserDate);
    if (echeanceTexte.trim() !== '' && echeance === null) return rejeter('echeance');
    reconnues.push({ numero, nom, prix: String(prix).replace('.', ','), periodicite, echeance });
    return undefined;
  });
  return { separateur, enTete, colonnes, premiereLigne, reconnues, rejetees };
}

/**
 * Abonnements à créer depuis les lignes reconnues : cycle démarré aujourd'hui,
 * échéance du fichier posée en surcharge manuelle (elle devient l'ancrage), devise
 * du réglage.
 */
export function abonnementsDepuisCsv(
  lignes: readonly LigneCsv[],
  jour: DateISO,
  devise: Devise,
): Abonnement[] {
  return lignes.map((l) => {
    const echeanceFuture = l.echeance !== null && comparerDates(l.echeance, jour) >= 0;
    const etat = {
      ...formulaireVide(jour, devise),
      nom: l.nom,
      prix: l.prix,
      ...presetDepuisPeriodicite(l.periodicite),
      dateDebut: l.echeance !== null && !echeanceFuture ? l.echeance : jour,
      echeanceManuelle: echeanceFuture ? l.echeance! : '',
    };
    const erreurs = validerFormulaire(etat);
    if (Object.keys(erreurs).length > 0) {
      throw new Error(`Ligne ${l.numero} invalide : ${Object.keys(erreurs).join(', ')}`);
    }
    return abonnementDepuisFormulaire(etat, { jour });
  });
}

/* ---------------------------------------------------------------------------
 * Export CSV (EF-52, v1.27) : une ligne par abonnement, relisible par l'import
 * ------------------------------------------------------------------------- */

/** En-têtes par langue ; nom, prix, périodicité et échéance sont reconnus par l'import. */
export const EN_TETES_CSV: Record<Langue, readonly string[]> = {
  fr: [
    'nom',
    'prix',
    'devise',
    'périodicité',
    'échéance',
    'catégorie',
    'statut',
    'service',
    'canal',
    'moyen de paiement',
    'date de début',
    'notes',
  ],
  en: [
    'name',
    'price',
    'currency',
    'cycle',
    'due date',
    'category',
    'status',
    'service',
    'channel',
    'payment method',
    'start date',
    'notes',
  ],
};

/** Libellés lisibles fournis par l'écran (i18n, catalogue, moyens de paiement). */
export interface LibellesExportCsv {
  categorie: (c: Categorie) => string;
  statut: (s: TypeStatut) => string;
  canal: (c: CanalAchat) => string;
  service: (id: string) => string | null;
  moyenPaiement: (id: string) => string | null;
}

const UNITES_TEXTE: Record<Langue, Record<'jour' | 'semaine' | 'mois' | 'an', [string, string]>> = {
  fr: {
    jour: ['jour', 'jours'],
    semaine: ['semaine', 'semaines'],
    mois: ['mois', 'mois'],
    an: ['an', 'ans'],
  },
  en: {
    jour: ['day', 'days'],
    semaine: ['week', 'weeks'],
    mois: ['month', 'months'],
    an: ['year', 'years'],
  },
};

/** Périodicité en texte relu par `periodiciteDepuisTexte` : « mois », « 2 ans », « à vie ». */
export function texteDepuisPeriodicite(p: Periodicite, langue: Langue): string {
  if (p.type === 'a_vie') return langue === 'fr' ? 'à vie' : 'lifetime';
  if (p.type === 'a_l_usage') return langue === 'fr' ? 'à l’usage' : 'usage';
  const [singulier, pluriel] = UNITES_TEXTE[langue][p.unite];
  return p.intervalle === 1 ? singulier : `${p.intervalle} ${pluriel}`;
}

/** Champ CSV : guillemets si séparateur ou guillemet (doublé) ; retours à la ligne remplacés. */
export function champCsv(valeur: string, separateur: Separateur = ';'): string {
  const v = valeur.replace(/\r?\n/g, ' / ');
  return v.includes(separateur) || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
}

function prixCsv(prix: number, langue: Langue): string {
  const texte = String(prix);
  return langue === 'fr' ? texte.replace('.', ',') : texte;
}

/**
 * Tableau CSV des abonnements (hors supprimés) : séparateur « ; », BOM UTF-8
 * pour Excel, fins de ligne CRLF, dates ISO, prix à la virgule en français.
 */
export function csvDepuisAbonnements(
  abonnements: readonly Abonnement[],
  langue: Langue,
  libelles: LibellesExportCsv,
): string {
  const lignes = [EN_TETES_CSV[langue].map((c) => champCsv(c))];
  for (const a of abonnements) {
    if (a.deletedAt !== null) continue;
    lignes.push(
      [
        a.nom,
        prixCsv(a.prix, langue),
        String(a.devise),
        texteDepuisPeriodicite(a.periodicite, langue),
        a.prochaineEcheance ?? '',
        libelles.categorie(a.categorie),
        libelles.statut(a.statut.type),
        a.serviceId === null ? '' : (libelles.service(a.serviceId) ?? ''),
        libelles.canal(a.canalAchat),
        a.moyenPaiementId === null ? '' : (libelles.moyenPaiement(a.moyenPaiementId) ?? ''),
        a.dateDebut,
        a.notes,
      ].map((v) => champCsv(v)),
    );
  }
  return `\uFEFF${lignes.map((l) => l.join(';')).join('\r\n')}\r\n`;
}

export function nomFichierCsv(jour: DateISO): string {
  return `subtuile-abonnements-${jour}.csv`;
}
