/**
 * Import de relevé bancaire (EF-73, lot 5). Fonctions pures, 100 % locales :
 * lecture d'un CSV de banque (date, libellé, montant ou débit), détection des
 * paiements récurrents (libellé rapproché, montants proches, cadence régulière),
 * rapprochement avec le catalogue et avec les abonnements déjà suivis. Le
 * relevé n'est jamais conservé : seuls les abonnements choisis sont créés.
 */

import { decouperLigne, detecterSeparateur, type Separateur } from './csv';
import { comparerDates, joursEntre } from './dates';
import { creerAbonnement } from './fabriques';
import { normaliserTexte } from './tri';
import {
  PERIODICITES,
  type Abonnement,
  type DateISO,
  type Devise,
  type FormatDate,
  type PeriodiciteRecurrente,
  type Service,
} from './types';

/* ---------------------------------------------------------------------------
 * Lecture du fichier
 * ------------------------------------------------------------------------- */

export type ColonneReleve = 'date' | 'libelle' | 'montant';
export type ColonnesReleve = Record<ColonneReleve, number>;
export const COLONNES_RELEVE: readonly ColonneReleve[] = ['date', 'libelle', 'montant'];

export interface OptionsReleve {
  separateur?: Separateur;
  enTete?: boolean;
  colonnes?: ColonnesReleve;
}

export interface Operation {
  date: DateISO;
  libelle: string;
  /** montant débité, toujours positif */
  montant: number;
}

export interface LectureReleve {
  separateur: Separateur;
  enTete: boolean;
  colonnes: ColonnesReleve;
  premiereLigne: string[];
  /** débits lisibles, du plus ancien au plus récent */
  operations: Operation[];
  /** lignes de données du fichier (hors en-tête) */
  nbLignes: number;
  /** lignes ignorées : crédits, date ou montant illisible */
  nbIgnorees: number;
}

const MOTS_RELEVE: Record<ColonneReleve, string[]> = {
  date: ['date', 'date operation', 'date de l operation', 'date d operation', 'date comptable'],
  libelle: [
    'libelle',
    'libelle operation',
    'libelle simplifie',
    'description',
    'label',
    'intitule',
    'designation',
    'details',
    'detail',
    'operation',
    'payee',
    'memo',
    'name',
    'reference',
  ],
  montant: [
    'montant',
    'debit',
    'amount',
    'montant eur',
    'montant en euros',
    'withdrawal',
    'paid out',
  ],
};

function motColonne(texte: string): string {
  return normaliserTexte(texte)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Montant d'un relevé : espaces, devise, séparateur de milliers, signe ou parenthèses tolérés. */
export function montantReleve(texte: string): number | null {
  // la classe « espace » couvre aussi les espaces insécables des montants français
  let t = texte.replace(/\s|[€$£]|EUR|USD|GBP|CHF/gi, '');
  if (t === '') return null;
  let negatif = false;
  if (/^\(.*\)$/.test(t)) {
    negatif = true;
    t = t.slice(1, -1);
  }
  if (t.startsWith('-') || t.endsWith('-')) {
    negatif = true;
    t = t.replace(/-/g, '');
  }
  t = t.replace(/^\+/, '');
  // « 1.234,56 » ou « 1,234.56 » : le dernier signe est la virgule décimale
  const virgule = t.lastIndexOf(',');
  const point = t.lastIndexOf('.');
  if (virgule >= 0 && point >= 0) {
    t = virgule > point ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
  } else {
    t = t.replace(',', '.');
  }
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return negatif ? -n : n;
}

type ParserDate = (t: string, f: FormatDate) => DateISO | null;

function lireDateReleve(texte: string, format: FormatDate, parser: ParserDate): DateISO | null {
  // « 05/09/2026 08:14 » : l'heure éventuelle est ignorée
  const t = texte.trim().split(/[ T]/)[0] ?? '';
  if (t === '') return null;
  return parser(t, format) ?? parser(t, format === 'mja' ? 'jma' : 'mja');
}

function reconnaitreEnTeteReleve(champs: readonly string[]): Partial<ColonnesReleve> | null {
  const trouve: Partial<ColonnesReleve> = {};
  champs.forEach((champ, i) => {
    const mot = motColonne(champ);
    for (const colonne of COLONNES_RELEVE) {
      if (trouve[colonne] === undefined && MOTS_RELEVE[colonne].includes(mot)) trouve[colonne] = i;
    }
  });
  return Object.keys(trouve).length > 0 ? trouve : null;
}

/** Colonnes devinées d'après le contenu : le plus de dates, le plus de montants, le texte le plus long. */
function devinerColonnes(
  lignes: readonly string[][],
  format: FormatDate,
  parser: ParserDate,
  connues: Partial<ColonnesReleve>,
): ColonnesReleve {
  const nb = Math.max(0, ...lignes.map((l) => l.length));
  const dates = new Array<number>(nb).fill(0);
  const montants = new Array<number>(nb).fill(0);
  const longueurs = new Array<number>(nb).fill(0);
  for (const champs of lignes.slice(0, 50)) {
    champs.forEach((c, i) => {
      if (lireDateReleve(c, format, parser) !== null) dates[i] = (dates[i] ?? 0) + 1;
      else if (montantReleve(c) !== null) montants[i] = (montants[i] ?? 0) + 1;
      else longueurs[i] = (longueurs[i] ?? 0) + c.trim().length;
    });
  }
  const pris = new Set<number>(Object.values(connues));
  const meilleur = (scores: readonly number[]): number => {
    let choix = -1;
    let max = 0;
    scores.forEach((s, i) => {
      if (!pris.has(i) && s > max) {
        max = s;
        choix = i;
      }
    });
    if (choix >= 0) pris.add(choix);
    return choix;
  };
  const date = connues.date ?? meilleur(dates);
  const montant = connues.montant ?? meilleur(montants);
  const libelle = connues.libelle ?? meilleur(longueurs);
  return { date, libelle, montant };
}

/**
 * Lit un relevé CSV : séparateur et colonnes détectés (en-tête fr / en, sinon
 * contenu), ou imposés par les options. Seuls les débits sont gardés : montants
 * négatifs si le fichier en contient, sinon tous les montants (colonne « Débit »).
 */
export function lireReleve(
  texte: string,
  format: FormatDate,
  parserDate: ParserDate,
  options: OptionsReleve = {},
): LectureReleve {
  // marque d'ordre des octets (BOM) des fichiers Excel ignorée
  const brut = texte.charCodeAt(0) === 0xfeff ? texte.slice(1) : texte;
  const separateur = options.separateur ?? detecterSeparateur(brut);
  const lignes = brut
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '')
    .map((l) => decouperLigne(l, separateur));
  const premiereLigne = lignes[0] ?? [];
  const detectees = reconnaitreEnTeteReleve(premiereLigne);
  const enTete = options.enTete ?? detectees !== null;
  const donnees = lignes.slice(enTete ? 1 : 0);
  const colonnes =
    options.colonnes ??
    devinerColonnes(donnees, format, parserDate, enTete ? (detectees ?? {}) : {});

  const lues: { date: DateISO; libelle: string; valeur: number }[] = [];
  for (const champs of donnees) {
    const date = lireDateReleve(champs[colonnes.date] ?? '', format, parserDate);
    const valeur = montantReleve(champs[colonnes.montant] ?? '');
    const libelle = (champs[colonnes.libelle] ?? '').trim();
    if (date === null || valeur === null || valeur === 0 || libelle === '') continue;
    lues.push({ date, libelle, valeur });
  }
  const signe = lues.some((l) => l.valeur < 0);
  const operations = lues
    .filter((l) => (signe ? l.valeur < 0 : true))
    .map((l) => ({ date: l.date, libelle: l.libelle, montant: Math.abs(l.valeur) }))
    .sort((a, b) => comparerDates(a.date, b.date));
  return {
    separateur,
    enTete,
    colonnes,
    premiereLigne,
    operations,
    nbLignes: donnees.length,
    nbIgnorees: donnees.length - operations.length,
  };
}

/* ---------------------------------------------------------------------------
 * Détection des paiements récurrents
 * ------------------------------------------------------------------------- */

/** Mots bancaires sans valeur pour reconnaître le marchand. */
const MOTS_VIDES = new Set([
  'prlv',
  'prelevement',
  'prelevt',
  'sepa',
  'carte',
  'cb',
  'paiement',
  'par',
  'achat',
  'facture',
  'fact',
  'vir',
  'virement',
  'de',
  'du',
  'le',
  'la',
  'les',
  'et',
  'en',
  'a',
  'au',
  'ref',
  'reference',
  'mandat',
  'num',
  'no',
  'id',
  'ics',
  'rum',
  'echeance',
  'abonnement',
  'abo',
  'mensuel',
  'mensualite',
  'www',
  'com',
  'fr',
  'net',
  'sas',
  'sa',
  'sarl',
  'inc',
  'ltd',
  'bill',
  'card',
  'payment',
  'direct',
  'debit',
  'pos',
  'purchase',
  'europe',
  'france',
  'paris',
  'international',
  'intl',
]);

/** Mots significatifs d'un libellé bancaire : sans accents, chiffres, dates ni jargon. */
export function motsDuLibelle(libelle: string): string[] {
  return normaliserTexte(libelle)
    .replace(/[^a-z]+/g, ' ')
    .split(' ')
    .filter((m) => m.length >= 2 && !MOTS_VIDES.has(m));
}

/** Clé de rapprochement : les deux premiers mots significatifs (« PRLV SEPA NETFLIX.COM 0923 » → « netflix »). */
export function cleLibelle(libelle: string): string {
  return motsDuLibelle(libelle).slice(0, 2).join(' ');
}

interface Cadence {
  periodicite: PeriodiciteRecurrente;
  min: number;
  max: number;
}

const CADENCES: readonly Cadence[] = [
  { periodicite: PERIODICITES.hebdomadaire, min: 6, max: 8 },
  { periodicite: PERIODICITES.vingtHuitJours, min: 28, max: 28 },
  { periodicite: PERIODICITES.mensuelle, min: 26, max: 35 },
  { periodicite: PERIODICITES.trimestrielle, min: 85, max: 97 },
  { periodicite: PERIODICITES.semestrielle, min: 175, max: 190 },
  { periodicite: PERIODICITES.annuelle, min: 350, max: 380 },
];

/** Écart de montant toléré au sein d'un même abonnement (hausse de prix, centimes). */
const TOLERANCE_MONTANT = 0.15;

function mediane(valeurs: readonly number[]): number {
  const tri = [...valeurs].sort((a, b) => a - b);
  const m = Math.floor(tri.length / 2);
  return tri.length % 2 === 1 ? (tri[m] ?? 0) : ((tri[m - 1] ?? 0) + (tri[m] ?? 0)) / 2;
}

/** Cadence d'une suite de dates triées : écart médian dans une plage connue, deux tiers des écarts conformes. */
function cadenceDe(dates: readonly DateISO[]): PeriodiciteRecurrente | null {
  if (dates.length < 2) return null;
  const ecarts: number[] = [];
  for (let i = 1; i < dates.length; i += 1) ecarts.push(joursEntre(dates[i - 1]!, dates[i]!));
  const m = mediane(ecarts);
  // « tous les 28 jours » seulement si tous les écarts valent 28, sinon mensuel
  const cadence = CADENCES.find(
    (c) => m >= c.min && m <= c.max && (c.min !== c.max || ecarts.every((e) => e === c.min)),
  );
  if (!cadence) return null;
  const conformes = ecarts.filter((e) => e >= cadence.min && e <= cadence.max).length;
  return conformes * 3 >= ecarts.length * 2 ? cadence.periodicite : null;
}

export interface PaiementRecurrent {
  /** clé stable dans l'analyse (libellé rapproché + rang du groupe de montants) */
  cle: string;
  /** nom proposé : service du catalogue reconnu, sinon libellé nettoyé */
  nom: string;
  /** libellé bancaire du dernier paiement */
  libelle: string;
  /** montant du dernier paiement */
  montant: number;
  periodicite: PeriodiciteRecurrente;
  premierPaiement: DateISO;
  dernierPaiement: DateISO;
  nbPaiements: number;
  /** service du catalogue reconnu dans le libellé */
  serviceId: string | null;
  /** abonnement existant correspondant (« déjà suivi ») */
  dejaSuivi: { id: string; nom: string } | null;
}

function nomPropre(cle: string): string {
  return cle
    .split(' ')
    .map((m) => m.charAt(0).toUpperCase() + m.slice(1))
    .join(' ');
}

function compacter(texte: string): string {
  return normaliserTexte(texte).replace(/[^a-z0-9]+/g, '');
}

/** Service dont le nom figure dans le libellé ; le nom le plus long l'emporte (« Canal+ Séries » avant « Canal+ »). */
function serviceDuLibelle(libelle: string, services: readonly Service[]): Service | null {
  const compact = compacter(libelle);
  let choix: Service | null = null;
  let longueur = 0;
  for (const s of services) {
    const nom = compacter(s.nom);
    if (nom.length >= 4 && nom.length > longueur && compact.includes(nom)) {
      choix = s;
      longueur = nom.length;
    }
  }
  return choix;
}

function abonnementSuivi(
  abonnements: readonly Abonnement[],
  libelle: string,
  cle: string,
  serviceId: string | null,
): Abonnement | null {
  const compact = compacter(libelle);
  const cleCompacte = compacter(cle);
  for (const a of abonnements) {
    if (a.deletedAt !== null || a.statut.type === 'archive') continue;
    if (serviceId !== null && a.serviceId === serviceId) return a;
    const nom = compacter(a.nom);
    if (
      nom.length >= 3 &&
      (compact.includes(nom) || (cleCompacte.length >= 4 && nom.includes(cleCompacte)))
    ) {
      return a;
    }
  }
  return null;
}

/**
 * Paiements récurrents d'un relevé : opérations regroupées par libellé rapproché,
 * puis par montants proches (± 15 %), gardées si leur cadence est régulière
 * (hebdomadaire à annuelle, deux paiements au moins). Un abonnement arrêté
 * depuis plus d'une période et demie n'est pas proposé.
 */
export function detecterRecurrences(
  operations: readonly Operation[],
  abonnements: readonly Abonnement[],
  services: readonly Service[],
  jour: DateISO,
): PaiementRecurrent[] {
  const parCle = new Map<string, Operation[]>();
  for (const op of operations) {
    const cle = cleLibelle(op.libelle);
    if (cle === '') continue;
    const liste = parCle.get(cle) ?? [];
    liste.push(op);
    parCle.set(cle, liste);
  }
  const resultat: PaiementRecurrent[] = [];
  for (const [cle, liste] of parCle) {
    // groupes de montants proches : plusieurs formules chez un même marchand
    const groupes: Operation[][] = [];
    for (const op of [...liste].sort((a, b) => a.montant - b.montant)) {
      const groupe = groupes[groupes.length - 1];
      const base = groupe?.[0]?.montant;
      if (groupe && base !== undefined && op.montant <= base * (1 + TOLERANCE_MONTANT)) {
        groupe.push(op);
      } else {
        groupes.push([op]);
      }
    }
    groupes.forEach((groupe, rang) => {
      const ops = [...groupe].sort((a, b) => comparerDates(a.date, b.date));
      const periodicite = cadenceDe(ops.map((o) => o.date));
      const premier = ops[0];
      const dernier = ops[ops.length - 1];
      if (!periodicite || !premier || !dernier) return;
      const cadence = CADENCES.find((c) => c.periodicite === periodicite);
      if (cadence && joursEntre(dernier.date, jour) > cadence.max * 1.5) return;
      const service = serviceDuLibelle(dernier.libelle, services);
      const suivi = abonnementSuivi(abonnements, dernier.libelle, cle, service?.id ?? null);
      resultat.push({
        cle: `${cle}#${rang}`,
        nom: service?.nom ?? nomPropre(cle),
        libelle: dernier.libelle,
        montant: dernier.montant,
        periodicite,
        premierPaiement: premier.date,
        dernierPaiement: dernier.date,
        nbPaiements: ops.length,
        serviceId: service?.id ?? null,
        dejaSuivi: suivi ? { id: suivi.id, nom: suivi.nom } : null,
      });
    });
  }
  return resultat.sort((a, b) => a.nom.localeCompare(b.nom) || b.montant - a.montant);
}

/**
 * Abonnements à créer pour les paiements choisis : cycle ancré sur le dernier
 * paiement constaté (la prochaine échéance en découle), prix du dernier
 * paiement, service du catalogue rattaché s'il est reconnu. Les paiements déjà
 * suivis sont toujours écartés : aucun doublon créé.
 */
export function abonnementsDepuisReleve(
  paiements: readonly PaiementRecurrent[],
  services: readonly Service[],
  jour: DateISO,
  devise: Devise,
): Abonnement[] {
  return paiements
    .filter((p) => p.dejaSuivi === null)
    .map((p) => {
      const service = p.serviceId ? services.find((s) => s.id === p.serviceId) : undefined;
      return creerAbonnement(
        {
          nom: p.nom,
          prix: p.montant,
          devise,
          periodicite: p.periodicite,
          dateDebut: p.dernierPaiement,
          ...(service
            ? {
                serviceId: service.id,
                categorie: service.categorie,
                urlGestion: service.urlGestion,
                modeResiliation: service.modeResiliation,
                contactResiliation: service.contactResiliation,
                montantEstime: service.montantEstime,
              }
            : {}),
        },
        { jour },
      );
    });
}
