/**
 * Moteur d'échéances — EF-03, EF-04b, EF-05, EF-11 (CdC v1.15).
 *
 * SEUL module autorisé à calculer des dates métier. Règles :
 * - Tout se fait en date civile LOCALE (« YYYY-MM-DD »), jamais en UTC.
 * - Règle des mois courts : une échéance calée sur un jour absent du mois
 *   (29-31) tombe le dernier jour de ce mois. Chaque occurrence est calculée
 *   depuis l'ANCRAGE (jamais depuis l'occurrence précédente) pour ne pas
 *   dériver : 31/01 → 28/02 → 31/03.
 * - Aucune fonction ne lit l'horloge implicitement : « aujourd'hui » est
 *   toujours un paramètre, ce qui rend le moteur entièrement testable.
 */

import {
  addDays,
  addMonths,
  addYears,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  isValid,
} from 'date-fns';
import type { Abonnement, DateISO, Periodicite, PeriodiciteRecurrente } from './types';

/* ---------------------------------------------------------------------------
 * Dates civiles locales
 * ------------------------------------------------------------------------- */

const RE_DATE_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Vrai si la chaîne est une date civile « YYYY-MM-DD » valide. */
export function estDateISO(valeur: unknown): valeur is DateISO {
  if (typeof valeur !== 'string') return false;
  const m = RE_DATE_ISO.exec(valeur);
  if (!m) return false;
  const [, a, mo, j] = m;
  const d = new Date(Number(a), Number(mo) - 1, Number(j));
  return (
    isValid(d) &&
    d.getFullYear() === Number(a) &&
    d.getMonth() === Number(mo) - 1 &&
    d.getDate() === Number(j)
  );
}

/** « YYYY-MM-DD » → Date locale à minuit. Lève une erreur si invalide. */
export function parseDateISO(iso: DateISO): Date {
  if (!estDateISO(iso)) throw new RangeError(`Date invalide : ${String(iso)}`);
  const m = RE_DATE_ISO.exec(iso) as RegExpExecArray;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Date locale → « YYYY-MM-DD » (composantes locales, jamais toISOString). */
export function toDateISO(date: Date): DateISO {
  const a = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const j = String(date.getDate()).padStart(2, '0');
  return `${a}-${mo}-${j}`;
}

/** Date civile locale du jour (l'instant est injectable pour les tests). */
export function aujourdhui(maintenant: Date = new Date()): DateISO {
  return toDateISO(maintenant);
}

/** Comparaison chronologique de deux dates civiles (négatif, 0, positif). */
export function comparerDates(a: DateISO, b: DateISO): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Nombre de jours civils de `depuis` à `date` (négatif si `date` est passée). */
export function joursEntre(depuis: DateISO, date: DateISO): number {
  return differenceInCalendarDays(parseDateISO(date), parseDateISO(depuis));
}

/** Compteur J-X : jours civils restants avant `date` (0 = aujourd'hui, < 0 = passée). */
export function joursAvant(date: DateISO, jour: DateISO): number {
  return joursEntre(jour, date);
}

/** Décale une date civile de `n` jours (négatif accepté). */
export function decalerJours(date: DateISO, n: number): DateISO {
  if (!Number.isInteger(n)) throw new RangeError(`Décalage invalide : ${String(n)}`);
  return toDateISO(addDays(parseDateISO(date), n));
}

/* ---------------------------------------------------------------------------
 * Périodicité récurrente : occurrences depuis un ancrage
 * ------------------------------------------------------------------------- */

function verifierIntervalle(p: PeriodiciteRecurrente): void {
  if (!Number.isInteger(p.intervalle) || p.intervalle < 1) {
    throw new RangeError(`Intervalle invalide : ${String(p.intervalle)}`);
  }
}

function occurrenceDate(ancrage: Date, p: PeriodiciteRecurrente, k: number): Date {
  const n = k * p.intervalle;
  switch (p.unite) {
    case 'jour':
      return addDays(ancrage, n);
    case 'semaine':
      return addDays(ancrage, n * 7);
    case 'mois':
      return addMonths(ancrage, n); // date-fns borne au dernier jour du mois
    case 'an':
      return addYears(ancrage, n); // 29/02 → 28/02 les années non bissextiles
  }
}

/**
 * k-ième occurrence (k ≥ 0) depuis l'ancrage, avec la règle des mois courts.
 * k = 0 renvoie l'ancrage lui-même.
 */
export function ajouterPeriodes(ancrage: DateISO, p: PeriodiciteRecurrente, k: number): DateISO {
  verifierIntervalle(p);
  if (!Number.isInteger(k) || k < 0) throw new RangeError(`Indice invalide : ${String(k)}`);
  return toDateISO(occurrenceDate(parseDateISO(ancrage), p, k));
}

/** Estimation basse de l'indice de la première occurrence ≥ cible. */
function estimerIndice(ancrage: Date, cible: Date, p: PeriodiciteRecurrente): number {
  let brut: number;
  switch (p.unite) {
    case 'jour':
      brut = differenceInCalendarDays(cible, ancrage) / p.intervalle;
      break;
    case 'semaine':
      brut = differenceInCalendarDays(cible, ancrage) / (7 * p.intervalle);
      break;
    case 'mois':
      brut = differenceInCalendarMonths(cible, ancrage) / p.intervalle;
      break;
    case 'an':
      brut = differenceInCalendarMonths(cible, ancrage) / (12 * p.intervalle);
      break;
  }
  return Math.max(0, Math.floor(brut) - 1);
}

/** Indice k de la première occurrence ≥ `aPartirDe` (0 si l'ancrage est déjà ≥). */
export function indiceOccurrenceSuivante(
  ancrage: DateISO,
  p: PeriodiciteRecurrente,
  aPartirDe: DateISO,
): number {
  verifierIntervalle(p);
  const a = parseDateISO(ancrage);
  const cible = parseDateISO(aPartirDe);
  if (cible <= a) return 0;
  let k = estimerIndice(a, cible, p);
  while (occurrenceDate(a, p, k) < cible) k += 1;
  return k;
}

/** Première occurrence ≥ `aPartirDe` (l'ancrage lui-même s'il est ≥). */
export function occurrenceSuivante(
  ancrage: DateISO,
  p: PeriodiciteRecurrente,
  aPartirDe: DateISO,
): DateISO {
  return ajouterPeriodes(ancrage, p, indiceOccurrenceSuivante(ancrage, p, aPartirDe));
}

/** Toutes les occurrences comprises entre `debut` et `fin` inclus (ordre chronologique). */
export function occurrencesEntre(
  ancrage: DateISO,
  p: PeriodiciteRecurrente,
  debut: DateISO,
  fin: DateISO,
): DateISO[] {
  verifierIntervalle(p);
  if (comparerDates(debut, fin) > 0) return [];
  const a = parseDateISO(ancrage);
  const finDate = parseDateISO(fin);
  const resultat: DateISO[] = [];
  let k = indiceOccurrenceSuivante(ancrage, p, debut);
  let d = occurrenceDate(a, p, k);
  while (d <= finDate) {
    resultat.push(toDateISO(d));
    k += 1;
    d = occurrenceDate(a, p, k);
  }
  return resultat;
}

/* ---------------------------------------------------------------------------
 * EF-03 — Prochaine échéance d'un abonnement
 * ------------------------------------------------------------------------- */

export type AbonnementEcheance = Pick<
  Abonnement,
  'dateDebut' | 'periodicite' | 'echeanceManuelle' | 'essai' | 'statut'
>;

/** Ancrage du cycle de paiement : surcharge manuelle, sinon fin d'essai, sinon début. */
export function ancrageCycle(
  abo: Pick<Abonnement, 'dateDebut' | 'echeanceManuelle' | 'essai'>,
): DateISO {
  return abo.echeanceManuelle ?? abo.essai?.dateFin ?? abo.dateDebut;
}

/**
 * Prochaine échéance ≥ `jour`, ou null si l'abonnement n'a pas de renouvellement
 * attendu (à vie, à l'usage, en pause, résilié, archivé).
 * Une surcharge manuelle encore à venir est renvoyée telle quelle ; passée,
 * elle sert de nouvel ancrage au cycle.
 */
export function calculerProchaineEcheance(abo: AbonnementEcheance, jour: DateISO): DateISO | null {
  const p = abo.periodicite;
  if (p.type !== 'recurrente') return null;
  if (abo.statut.type !== 'actif') return null;
  return occurrenceSuivante(ancrageCycle(abo), p, jour);
}

/** Vrai si une échéance calculée précédemment est dépassée et doit être recalculée. */
export function echeanceDepassee(prochaineEcheance: DateISO | null, jour: DateISO): boolean {
  return prochaineEcheance !== null && comparerDates(prochaineEcheance, jour) < 0;
}

/* ---------------------------------------------------------------------------
 * EF-05 — Engagement et préavis
 * ------------------------------------------------------------------------- */

/**
 * Fin de la période d'engagement en cours (≥ `jour`), avec reconduction tacite
 * par périodes de `dureeMois` depuis dateDebut. Null sans engagement.
 */
export function finEngagement(
  abo: Pick<Abonnement, 'dateDebut' | 'engagement'>,
  jour: DateISO,
): DateISO | null {
  const e = abo.engagement;
  if (!e || !Number.isInteger(e.dureeMois) || e.dureeMois < 1) return null;
  const p: PeriodiciteRecurrente = { type: 'recurrente', unite: 'mois', intervalle: e.dureeMois };
  const lendemainDebut = toDateISO(addDays(parseDateISO(abo.dateDebut), 1));
  const cible = comparerDates(jour, lendemainDebut) > 0 ? jour : lendemainDebut;
  return occurrenceSuivante(abo.dateDebut, p, cible);
}

/**
 * Prochaine date limite pour résilier sans reconduction : fin d'engagement −
 * préavis. Si la limite de la période en cours est déjà passée, renvoie celle
 * de la période suivante (la période en cours se reconduit).
 */
export function dateLimiteResiliation(
  abo: Pick<Abonnement, 'dateDebut' | 'engagement'>,
  jour: DateISO,
): DateISO | null {
  const e = abo.engagement;
  if (!e) return null;
  let fin = finEngagement(abo, jour);
  if (fin === null) return null;
  let limite = toDateISO(addDays(parseDateISO(fin), -Math.max(0, e.preavisJours)));
  if (comparerDates(limite, jour) < 0) {
    fin = toDateISO(addMonths(parseDateISO(fin), e.dureeMois));
    limite = toDateISO(addDays(parseDateISO(fin), -Math.max(0, e.preavisJours)));
  }
  return limite;
}

/* ---------------------------------------------------------------------------
 * EF-11 — Compteur J-X et code couleur d'urgence
 * ------------------------------------------------------------------------- */

/** Seuils en jours : vert au-delà de `warn`, orange ≤ `warn`, rouge ≤ `urg`. */
export const SEUILS_URGENCE = { warn: 14, urg: 3 } as const;

export type NiveauUrgence = 'ok' | 'warn' | 'urg' | 'trial';
export type MotifUrgence = 'echeance' | 'essai' | 'preavis';

export interface Urgence {
  niveau: NiveauUrgence;
  /** jours restants (≤ 0 : aujourd'hui ou dépassé) */
  jours: number;
  motif: MotifUrgence;
  date: DateISO;
}

/** Couleur d'un simple compteur J-X (sans essai ni préavis). */
export function niveauCompteur(jours: number): Exclude<NiveauUrgence, 'trial'> {
  if (jours <= SEUILS_URGENCE.urg) return 'urg';
  if (jours <= SEUILS_URGENCE.warn) return 'warn';
  return 'ok';
}

export type AbonnementUrgence = AbonnementEcheance & Pick<Abonnement, 'engagement'>;

/**
 * Urgence affichée sur la tuile : violet (« trial ») si la fin d'essai ou la
 * date limite de préavis tombe dans ≤ 14 jours, sinon la couleur du compteur
 * de renouvellement. Null si rien n'est attendu.
 */
export function urgenceAbonnement(abo: AbonnementUrgence, jour: DateISO): Urgence | null {
  if (abo.statut.type === 'actif') {
    if (abo.essai && comparerDates(abo.essai.dateFin, jour) >= 0) {
      const jours = joursAvant(abo.essai.dateFin, jour);
      if (jours <= SEUILS_URGENCE.warn) {
        return { niveau: 'trial', jours, motif: 'essai', date: abo.essai.dateFin };
      }
    }
    const limite = dateLimiteResiliation(abo, jour);
    if (limite !== null) {
      const jours = joursAvant(limite, jour);
      if (jours <= SEUILS_URGENCE.warn) {
        return { niveau: 'trial', jours, motif: 'preavis', date: limite };
      }
    }
  }
  const echeance = calculerProchaineEcheance(abo, jour);
  if (echeance === null) return null;
  const jours = joursAvant(echeance, jour);
  return { niveau: niveauCompteur(jours), jours, motif: 'echeance', date: echeance };
}

/* ---------------------------------------------------------------------------
 * Montants : normalisation mensuelle / annuelle, part payée, prix futur
 * ------------------------------------------------------------------------- */

const JOURS_PAR_AN = 365.25;
const JOURS_PAR_MOIS = JOURS_PAR_AN / 12;

/** Coût mensuel normalisé (EF-40) ; 0 pour « à vie » et « à l'usage ». */
export function montantMensuel(prix: number, p: Periodicite): number {
  if (p.type !== 'recurrente') return 0;
  verifierIntervalle(p);
  switch (p.unite) {
    case 'jour':
      return (prix * JOURS_PAR_MOIS) / p.intervalle;
    case 'semaine':
      return (prix * JOURS_PAR_MOIS) / (7 * p.intervalle);
    case 'mois':
      return prix / p.intervalle;
    case 'an':
      return prix / (12 * p.intervalle);
  }
}

/** Coût annuel normalisé (EF-40). */
export function montantAnnuel(prix: number, p: Periodicite): number {
  return montantMensuel(prix, p) * 12;
}

/** Prix supporté par l'utilisateur : part payée si partagé (EF-44), sinon prix. */
export function prixEffectif(abo: Pick<Abonnement, 'prix' | 'partage'>): number {
  return abo.partage ? abo.partage.partPayee : abo.prix;
}

/** Prix en vigueur à `jour` : le prix futur programmé s'il est atteint (EF-08b). */
export function prixEnVigueur(abo: Pick<Abonnement, 'prix' | 'prixFutur'>, jour: DateISO): number {
  if (abo.prixFutur && comparerDates(abo.prixFutur.date, jour) <= 0) return abo.prixFutur.montant;
  return abo.prix;
}

/**
 * Applique un prix futur atteint : nouveau prix, versement de l'ancien dans
 * l'historique, prixFutur remis à null. Renvoie l'abonnement inchangé sinon.
 * Fonction pure : ne touche ni updatedAt ni le stockage.
 */
export function appliquerPrixFutur<
  T extends Pick<Abonnement, 'prix' | 'prixFutur' | 'historiquePrix'>,
>(abo: T, jour: DateISO): T {
  const pf = abo.prixFutur;
  if (!pf || comparerDates(pf.date, jour) > 0) return abo;
  const historique = [...abo.historiquePrix, { date: pf.date, prix: pf.montant }];
  return { ...abo, prix: pf.montant, prixFutur: null, historiquePrix: historique };
}
