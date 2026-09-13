/**
 * Moteur d'alertes (EF-30, EF-04, EF-04b, EF-05, EF-08b — CdC §4.4, §5.4).
 * Les alertes sont DÉRIVÉES des données à chaque ouverture de l'app (PWA sans
 * push) ; seul l'état « lu » est persisté, par clé stable.
 *
 * Règles :
 * - échéance : abonnement actif, renouvellement dans ≤ seuil jours (seuil propre
 *   `alerteJoursAvant`, sinon défaut global) ; pendant un essai en cours c'est
 *   l'alerte « fin d'essai » qui porte cette date (pas de doublon) ;
 * - fin d'essai : abonnement actif en essai, ≤ défaut « essai » jours ;
 * - préavis : engagement (actif ou en pause), date limite de résiliation
 *   ≤ défaut « préavis » jours ;
 * - carte : moyen de paiement utilisé par au moins un abonnement non archivé,
 *   expirant dans ≤ défaut « carte » mois (M-1) ou déjà expiré ;
 * - régularisation annuelle et hausse annoncée : dans ≤ 30 jours (fenêtre
 *   d'annonce), abonnement actif ou en pause ;
 * - jamais d'alerte pour un abonnement archivé ou résilié.
 */

import {
  calculerProchaineEcheance,
  comparerDates,
  dateLimiteResiliation,
  decalerJours,
  dernierJourDuMois,
  etatExpirationCarte,
  joursAvant,
  niveauCompteur,
  prixEffectif,
} from './dates';
import type {
  Abonnement,
  DateISO,
  DefautsAlerte,
  Devise,
  MoyenPaiement,
  Periodicite,
} from './types';

export const TYPES_ALERTE = [
  'echeance',
  'essai',
  'preavis',
  'carte',
  'regularisation',
  'prix_futur',
  'sauvegarde',
] as const;
export type TypeAlerte = (typeof TYPES_ALERTE)[number];

/** Couleur de la pastille : rouge, orange, violet (essai / préavis, comme sur les tuiles). */
export type NiveauAlerte = 'urg' | 'warn' | 'trial';

/** Fenêtre d'annonce des régularisations et hausses de prix, en jours. */
export const FENETRE_ANNONCE_JOURS = 30;
/** Les clés « lu » plus anciennes que cette durée sont oubliées. */
export const RETENTION_LUES_JOURS = 90;
/** C1 : rappel de sauvegarde au-delà de ce délai depuis le dernier export… */
export const SAUVEGARDE_RAPPEL_JOURS = 30;
/** … ou, sans aucun export, dès ce nombre d'abonnements non archivés. */
export const SAUVEGARDE_MIN_ABONNEMENTS = 3;

interface AlerteBase {
  /** `${type}:${cibleId}:${date}` — stable tant que l'événement ne bouge pas */
  cle: string;
  niveau: NiveauAlerte;
  /** date de l'événement */
  date: DateISO;
  /** jours restants (≤ 0 : aujourd'hui ou dépassé) */
  jours: number;
  lue: boolean;
}
export interface AlerteEcheance extends AlerteBase {
  type: 'echeance';
  abonnementId: string;
  nom: string;
  devise: Devise;
  /** montant supporté (part payée si partagé) */
  prix: number;
  montantEstime: boolean;
  periodicite: Periodicite;
  moyenPaiementId: string | null;
}
export interface AlerteEssai extends AlerteBase {
  type: 'essai';
  abonnementId: string;
  nom: string;
  devise: Devise;
  prixApres: number;
  periodicite: Periodicite;
}
export interface AlertePreavis extends AlerteBase {
  type: 'preavis';
  abonnementId: string;
  nom: string;
  preavisJours: number;
}
export interface AlerteCarte extends AlerteBase {
  type: 'carte';
  moyenPaiementId: string;
  libelle: string;
  /** « YYYY-MM » */
  expiration: string;
  /** mois civils entre aujourd'hui et le mois d'expiration (M-1 = le mois prochain, ≤ 0 = ce mois ou passé) */
  moisRestants: number;
  expiree: boolean;
  /** abonnements non archivés réglés avec ce moyen */
  nbAbonnements: number;
}
export interface AlerteRegularisation extends AlerteBase {
  type: 'regularisation';
  abonnementId: string;
  nom: string;
  devise: Devise;
  /** mensualité lissée en vigueur */
  prix: number;
  montantEstime: boolean;
  periodicite: Periodicite;
}
export interface AlertePrixFutur extends AlerteBase {
  type: 'prix_futur';
  abonnementId: string;
  nom: string;
  devise: Devise;
  prix: number;
  nouveauPrix: number;
  /** variation arrondie en % (négative pour une baisse) */
  variationPourCent: number;
  periodicite: Periodicite;
}
export interface AlerteSauvegarde extends AlerteBase {
  type: 'sauvegarde';
  /** date du dernier export JSON ; null = jamais */
  derniereSauvegarde: DateISO | null;
  /** jours écoulés depuis ; null si jamais */
  joursDepuis: number | null;
  nbAbonnements: number;
}
export type Alerte =
  | AlerteEcheance
  | AlerteEssai
  | AlertePreavis
  | AlerteCarte
  | AlerteRegularisation
  | AlertePrixFutur
  | AlerteSauvegarde;

export interface ContexteAlertes {
  abonnements: readonly Abonnement[];
  moyensPaiement: readonly MoyenPaiement[];
  defauts: DefautsAlerte;
  jour: DateISO;
  /** clés déjà lues (état persisté) */
  lues?: readonly string[];
  /** date du dernier export JSON (rappel C1) ; absent = pas de rappel */
  derniereSauvegarde?: DateISO | null;
}

export function cleAlerte(type: TypeAlerte, cibleId: string, date: DateISO): string {
  return `${type}:${cibleId}:${date}`;
}

/** Seuil J-X d'un abonnement : valeur propre, sinon défaut global (EF-30). */
export function seuilEcheance(
  abo: Pick<Abonnement, 'alerteJoursAvant'>,
  defauts: DefautsAlerte,
): number {
  return abo.alerteJoursAvant ?? defauts.echeanceJours;
}

const ORDRE_NIVEAU: Record<NiveauAlerte, number> = { urg: 0, trial: 1, warn: 2 };

function libelleTri(a: Alerte): string {
  return a.type === 'carte' ? a.libelle : a.type === 'sauvegarde' ? '' : a.nom;
}

/** Ordre du centre d'alertes : la plus proche d'abord, puis la plus grave, puis le nom. */
export function comparerAlertes(a: Alerte, b: Alerte): number {
  return (
    a.jours - b.jours ||
    ORDRE_NIVEAU[a.niveau] - ORDRE_NIVEAU[b.niveau] ||
    libelleTri(a).localeCompare(libelleTri(b), undefined, { sensitivity: 'base' })
  );
}

function alertesAbonnement(abo: Abonnement, defauts: DefautsAlerte, jour: DateISO): Alerte[] {
  const statut = abo.statut.type;
  if (statut === 'archive' || statut === 'resilie_actif_jusquau') return [];
  const alertes: Alerte[] = [];
  const base = { abonnementId: abo.id, nom: abo.nom, devise: abo.devise, lue: false } as const;

  if (statut === 'actif') {
    const essaiEnCours = abo.essai !== null && comparerDates(abo.essai.dateFin, jour) >= 0;
    if (abo.essai && essaiEnCours) {
      const jours = joursAvant(abo.essai.dateFin, jour);
      if (jours <= defauts.essaiJours) {
        alertes.push({
          ...base,
          type: 'essai',
          cle: cleAlerte('essai', abo.id, abo.essai.dateFin),
          niveau: 'trial',
          date: abo.essai.dateFin,
          jours,
          prixApres: abo.essai.prixApres,
          periodicite: abo.periodicite,
        });
      }
    } else {
      const echeance = calculerProchaineEcheance(abo, jour);
      if (echeance !== null) {
        const jours = joursAvant(echeance, jour);
        if (jours <= seuilEcheance(abo, defauts)) {
          alertes.push({
            ...base,
            type: 'echeance',
            cle: cleAlerte('echeance', abo.id, echeance),
            niveau: niveauCompteur(jours) === 'urg' ? 'urg' : 'warn',
            date: echeance,
            jours,
            prix: prixEffectif(abo),
            montantEstime: abo.montantEstime,
            periodicite: abo.periodicite,
            moyenPaiementId: abo.moyenPaiementId,
          });
        }
      }
    }
  }

  if (abo.engagement) {
    const limite = dateLimiteResiliation(abo, jour);
    if (limite !== null) {
      const jours = joursAvant(limite, jour);
      if (jours <= defauts.preavisJours) {
        alertes.push({
          ...base,
          type: 'preavis',
          cle: cleAlerte('preavis', abo.id, limite),
          niveau: 'trial',
          date: limite,
          jours,
          preavisJours: abo.engagement.preavisJours,
        });
      }
    }
  }

  if (abo.regularisation) {
    const jours = joursAvant(abo.regularisation.date, jour);
    if (jours >= 0 && jours <= FENETRE_ANNONCE_JOURS) {
      alertes.push({
        ...base,
        type: 'regularisation',
        cle: cleAlerte('regularisation', abo.id, abo.regularisation.date),
        niveau: 'warn',
        date: abo.regularisation.date,
        jours,
        prix: abo.prix,
        montantEstime: abo.montantEstime,
        periodicite: abo.periodicite,
      });
    }
  }

  if (abo.prixFutur) {
    const jours = joursAvant(abo.prixFutur.date, jour);
    if (jours >= 0 && jours <= FENETRE_ANNONCE_JOURS) {
      const variation =
        abo.prix > 0 ? Math.round(((abo.prixFutur.montant - abo.prix) / abo.prix) * 100) : 0;
      alertes.push({
        ...base,
        type: 'prix_futur',
        cle: cleAlerte('prix_futur', abo.id, abo.prixFutur.date),
        niveau: 'warn',
        date: abo.prixFutur.date,
        jours,
        prix: abo.prix,
        nouveauPrix: abo.prixFutur.montant,
        variationPourCent: variation,
        periodicite: abo.periodicite,
      });
    }
  }

  return alertes;
}

function alertesCartes(
  moyens: readonly MoyenPaiement[],
  abonnements: readonly Abonnement[],
  defauts: DefautsAlerte,
  jour: DateISO,
): AlerteCarte[] {
  const alertes: AlerteCarte[] = [];
  for (const m of moyens) {
    if (m.deletedAt !== null || m.dateExpiration === null) continue;
    const etat = etatExpirationCarte(m.dateExpiration, jour, defauts.carteMois);
    if (etat !== 'bientot' && etat !== 'expiree') continue;
    const nbAbonnements = abonnements.filter(
      (a) => a.moyenPaiementId === m.id && a.statut.type !== 'archive',
    ).length;
    if (nbAbonnements === 0) continue;
    const date = dernierJourDuMois(m.dateExpiration);
    const moisRestants =
      (Number(m.dateExpiration.slice(0, 4)) - Number(jour.slice(0, 4))) * 12 +
      (Number(m.dateExpiration.slice(5, 7)) - Number(jour.slice(5, 7)));
    alertes.push({
      type: 'carte',
      cle: cleAlerte('carte', m.id, date),
      niveau: etat === 'expiree' ? 'urg' : 'warn',
      date,
      jours: joursAvant(date, jour),
      lue: false,
      moyenPaiementId: m.id,
      libelle: m.libelle,
      expiration: m.dateExpiration,
      moisRestants,
      expiree: etat === 'expiree',
      nbAbonnements,
    });
  }
  return alertes;
}

/** Toutes les alertes du jour, triées, avec l'état « lu » appliqué. */
export function calculerAlertes(ctx: ContexteAlertes): Alerte[] {
  const vivants = ctx.abonnements.filter((a) => a.deletedAt === null);
  const alertes: Alerte[] = [
    ...vivants.flatMap((a) => alertesAbonnement(a, ctx.defauts, ctx.jour)),
    ...alertesCartes(ctx.moyensPaiement, vivants, ctx.defauts, ctx.jour),
    ...alerteSauvegarde(vivants, ctx.derniereSauvegarde, ctx.jour),
  ];
  return appliquerLues(alertes, ctx.lues ?? []).sort(comparerAlertes);
}

/**
 * C1 : rappel de sauvegarde. Sans aucun export : dès SAUVEGARDE_MIN_ABONNEMENTS
 * abonnements non archivés ; sinon au-delà de SAUVEGARDE_RAPPEL_JOURS jours.
 * Contexte sans préférence (`undefined`) : pas de rappel. Clé stable par date du
 * dernier export : marquée lue, l'alerte se tait jusqu'à l'export suivant.
 * Classée en dernier (jours « infinis »).
 */
function alerteSauvegarde(
  vivants: readonly Abonnement[],
  derniereSauvegarde: DateISO | null | undefined,
  jour: DateISO,
): Alerte[] {
  if (derniereSauvegarde === undefined) return [];
  const nbAbonnements = vivants.filter((a) => a.statut.type !== 'archive').length;
  if (nbAbonnements === 0) return [];
  if (derniereSauvegarde === null && nbAbonnements < SAUVEGARDE_MIN_ABONNEMENTS) return [];
  const joursDepuis = derniereSauvegarde === null ? null : joursAvant(jour, derniereSauvegarde);
  if (joursDepuis !== null && joursDepuis < SAUVEGARDE_RAPPEL_JOURS) return [];
  return [
    {
      type: 'sauvegarde',
      cle: cleAlerte('sauvegarde', 'global', derniereSauvegarde ?? 'jamais'),
      niveau: 'warn',
      date: jour,
      jours: Number.MAX_SAFE_INTEGER,
      lue: false,
      derniereSauvegarde,
      joursDepuis,
      nbAbonnements,
    },
  ];
}

export function appliquerLues(alertes: readonly Alerte[], lues: readonly string[]): Alerte[] {
  const ensemble = new Set(lues);
  return alertes.map((a) =>
    ensemble.has(a.cle) === a.lue ? a : { ...a, lue: ensemble.has(a.cle) },
  );
}

export function nombreNonLues(alertes: readonly Alerte[]): number {
  return alertes.filter((a) => !a.lue).length;
}

/** Date portée par une clé (dernier segment). */
export function dateDeCle(cle: string): DateISO {
  return cle.slice(cle.lastIndexOf(':') + 1);
}

/** Oublie les clés dont l'événement est passé depuis plus de RETENTION_LUES_JOURS. */
export function nettoyerCles(cles: readonly string[], jour: DateISO): string[] {
  const limite = decalerJours(jour, -RETENTION_LUES_JOURS);
  return [...new Set(cles)].filter((c) => comparerDates(dateDeCle(c), limite) >= 0);
}

/** « Tout marquer comme lu » (EF-31) : nouvelles clés lues à persister. */
export function clesApresMarquage(
  alertes: readonly Alerte[],
  lues: readonly string[],
  jour: DateISO,
): string[] {
  return nettoyerCles([...lues, ...alertes.map((a) => a.cle)], jour);
}
