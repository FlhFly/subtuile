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
  type DateISO,
  type Devise,
  type FormatDate,
  type Periodicite,
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
  reconnues: LigneCsv[];
  rejetees: LigneRejetee[];
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
  ],
} as const;
type Colonne = keyof typeof MOTS_COLONNES;

function normaliser(texte: string): string {
  return texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Reconnaît un en-tête : au moins « nom » et « prix » identifiés. Renvoie l'index de chaque colonne. */
export function reconnaitreEnTete(champs: readonly string[]): Record<Colonne, number> | null {
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

/** « mois » / « monthly » / « an »… → périodicité ; vide → mensuelle ; inconnu → null. */
export function periodiciteDepuisTexte(texte: string): Periodicite | null {
  const t = normaliser(texte).replace(/\.$/, '');
  if (t === '') return PERIODICITES.mensuelle;
  for (const [periodicite, mots] of MOTS_PERIODICITE) {
    if (mots.some((m) => normaliser(m) === t)) return periodicite;
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

/** Analyse complète d'un texte CSV : lignes reconnues et rejetées, avec leurs raisons. */
export function analyserCsv(
  texte: string,
  format: FormatDate,
  parserDate: (t: string, f: FormatDate) => DateISO | null,
): AnalyseCsv {
  const separateur = detecterSeparateur(texte);
  const lignes = texte.split(/\r?\n/).filter((l) => l.trim() !== '');
  const reconnues: LigneCsv[] = [];
  const rejetees: LigneRejetee[] = [];
  let colonnes: Record<Colonne, number> = { nom: 0, prix: 1, periodicite: 2, echeance: 3 };
  let enTete = false;
  let depart = 0;
  const premiere = lignes[0];
  if (premiere !== undefined) {
    const detectees = reconnaitreEnTete(decouperLigne(premiere, separateur));
    if (detectees) {
      colonnes = detectees;
      enTete = true;
      depart = 1;
    }
  }
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
  return { separateur, enTete, reconnues, rejetees };
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
