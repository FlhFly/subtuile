/**
 * Échéancier (EF-16, §7.4) : événements datés dérivés des abonnements —
 * renouvellements, fins d'essai, dates limites de résiliation, fins
 * d'abonnement résilié — en liste chronologique groupée par mois, ou en
 * calendrier mensuel (occurrences du mois affiché).
 */

import {
  ancrageCycle,
  calculerProchaineEcheance,
  comparerDates,
  dateLimiteResiliation,
  dernierJourDuMois,
  joursAvant,
  niveauCompteur,
  occurrencesEntre,
  parseDateISO,
  prixEffectif,
  toDateISO,
} from './dates';
import { COULEUR_TUILE_DEFAUT, initialesDuNom } from './tuile';
import type { Abonnement, DateISO, Devise, Periodicite } from './types';

export type TypeEvenement = 'renouvellement' | 'fin_essai' | 'preavis' | 'fin_resilie';
/** couleur de la puce : compteur (ok / warn / urg), violet (essai, préavis), neutre (fin résilié) */
export type NiveauEvenement = 'ok' | 'warn' | 'urg' | 'trial' | 'neutre';

export interface Evenement {
  cle: string;
  type: TypeEvenement;
  date: DateISO;
  /** jours restants depuis le jour courant (négatif si passé) */
  jours: number;
  niveau: NiveauEvenement;
  abonnementId: string;
  nom: string;
  couleur: string;
  initiales: string;
  periodicite: Periodicite;
  /** devise de saisie du montant (EF-45b) */
  devise: Devise;
  /** montant supporté au renouvellement ; prix après essai ; null sinon */
  montant: number | null;
  montantEstime: boolean;
  preavisJours: number | null;
}

/** Apparence d'une ligne (couleur, initiales), résolue par l'appelant avec le catalogue. */
export type Apparence = (abo: Abonnement) => { couleur: string; initiales: string };

export const apparenceParDefaut: Apparence = (abo) => ({
  couleur: abo.couleur ?? COULEUR_TUILE_DEFAUT,
  initiales: abo.logo?.valeur ?? initialesDuNom(abo.nom),
});

function evenement(
  abo: Abonnement,
  type: TypeEvenement,
  date: DateISO,
  jour: DateISO,
  apparence: Apparence,
  extra: Partial<Pick<Evenement, 'montant' | 'preavisJours'>> = {},
): Evenement {
  const jours = joursAvant(date, jour);
  const niveau: NiveauEvenement =
    type === 'renouvellement' ? niveauCompteur(jours) : type === 'fin_resilie' ? 'neutre' : 'trial';
  return {
    cle: `${type}:${abo.id}:${date}`,
    type,
    date,
    jours,
    niveau,
    abonnementId: abo.id,
    nom: abo.nom,
    ...apparence(abo),
    periodicite: abo.periodicite,
    devise: abo.devise,
    montant: extra.montant ?? null,
    montantEstime: abo.montantEstime,
    preavisJours: extra.preavisJours ?? null,
  };
}

function actif(abo: Abonnement): boolean {
  return abo.deletedAt === null && abo.statut.type !== 'archive';
}

/** Événements « spéciaux » d'un abonnement (hors renouvellements), dans [debut, fin]. */
function evenementsSpeciaux(
  abo: Abonnement,
  jour: DateISO,
  debut: DateISO,
  fin: DateISO,
  apparence: Apparence,
): Evenement[] {
  const dans = (d: DateISO) => comparerDates(d, debut) >= 0 && comparerDates(d, fin) <= 0;
  const liste: Evenement[] = [];
  if (abo.statut.type === 'actif' && abo.essai && dans(abo.essai.dateFin)) {
    liste.push(
      evenement(abo, 'fin_essai', abo.essai.dateFin, jour, apparence, {
        montant: abo.essai.prixApres,
      }),
    );
  }
  if (abo.statut.type === 'actif' && abo.engagement) {
    const limite = dateLimiteResiliation(abo, jour);
    if (limite && dans(limite)) {
      liste.push(
        evenement(abo, 'preavis', limite, jour, apparence, {
          preavisJours: abo.engagement.preavisJours,
        }),
      );
    }
  }
  if (abo.statut.type === 'resilie_actif_jusquau' && dans(abo.statut.jusquau)) {
    liste.push(evenement(abo, 'fin_resilie', abo.statut.jusquau, jour, apparence));
  }
  return liste;
}

export function comparerEvenements(a: Evenement, b: Evenement): number {
  return (
    comparerDates(a.date, b.date) ||
    a.nom.localeCompare(b.nom, undefined, { sensitivity: 'base' }) ||
    a.type.localeCompare(b.type)
  );
}

/**
 * Liste chronologique (vue liste) : pour chaque abonnement vivant non archivé,
 * son prochain renouvellement, sa fin d'essai en cours, sa date limite de
 * résiliation, sa fin d'abonnement résilié — à partir d'aujourd'hui.
 */
export function evenementsAVenir(
  abonnements: readonly Abonnement[],
  jour: DateISO,
  apparence: Apparence = apparenceParDefaut,
): Evenement[] {
  const liste: Evenement[] = [];
  const SANS_FIN = '9999-12-31';
  for (const abo of abonnements) {
    if (!actif(abo)) continue;
    const essaiEnCours = abo.essai !== null && comparerDates(abo.essai.dateFin, jour) >= 0;
    const echeance = calculerProchaineEcheance(abo, jour);
    // pendant l'essai, la fin d'essai porte la date du premier prélèvement
    if (echeance !== null && !essaiEnCours) {
      liste.push(
        evenement(abo, 'renouvellement', echeance, jour, apparence, {
          montant: prixEffectif(abo),
        }),
      );
    }
    liste.push(...evenementsSpeciaux(abo, jour, jour, SANS_FIN, apparence));
  }
  return liste.sort(comparerEvenements);
}

/** « 2026-09 » → premier et dernier jour du mois. */
export function bornesDuMois(anneeMois: string): { debut: DateISO; fin: DateISO } {
  return { debut: `${anneeMois}-01`, fin: dernierJourDuMois(anneeMois) };
}

/**
 * Événements d'un mois (vue calendrier) : toutes les occurrences de
 * renouvellement tombant dans le mois (passées comprises, pour relire le mois
 * en cours), fins d'essai, dates limites, fins d'abonnement résilié.
 */
export function evenementsDuMois(
  abonnements: readonly Abonnement[],
  anneeMois: string,
  jour: DateISO,
  apparence: Apparence = apparenceParDefaut,
): Evenement[] {
  const { debut, fin } = bornesDuMois(anneeMois);
  const liste: Evenement[] = [];
  for (const abo of abonnements) {
    if (!actif(abo)) continue;
    const p = abo.periodicite;
    if (p.type === 'recurrente' && abo.statut.type === 'actif') {
      const ancrage = ancrageCycle(abo);
      for (const date of occurrencesEntre(ancrage, p, debut, fin)) {
        // pendant un essai, le cycle payant démarre à la fin d'essai (ancrage) : rien avant
        liste.push(
          evenement(abo, 'renouvellement', date, jour, apparence, { montant: prixEffectif(abo) }),
        );
      }
    }
    liste.push(...evenementsSpeciaux(abo, jour, debut, fin, apparence));
  }
  return liste.sort(comparerEvenements);
}

export interface GroupeMois {
  /** « YYYY-MM » */
  mois: string;
  evenements: Evenement[];
}

export function grouperParMois(evenements: readonly Evenement[]): GroupeMois[] {
  const groupes: GroupeMois[] = [];
  for (const e of evenements) {
    const mois = e.date.slice(0, 7);
    const dernier = groupes.at(-1);
    if (dernier && dernier.mois === mois) dernier.evenements.push(e);
    else groupes.push({ mois, evenements: [e] });
  }
  return groupes;
}

export function moisDe(date: DateISO): string {
  return date.slice(0, 7);
}

export function decalerMois(anneeMois: string, n: number): string {
  const d = parseDateISO(`${anneeMois}-01`);
  d.setMonth(d.getMonth() + n);
  return toDateISO(d).slice(0, 7);
}

export interface CaseCalendrier {
  /** null = case de remplissage avant le 1er ou après le dernier jour */
  date: DateISO | null;
  numero: number | null;
  evenements: Evenement[];
  aujourdhui: boolean;
}

/**
 * Grille du mois, semaines commençant le lundi (7 × 5 ou 6 cases), chaque
 * case portant ses événements.
 */
export function casesCalendrier(
  anneeMois: string,
  evenements: readonly Evenement[],
  jour: DateISO,
): CaseCalendrier[] {
  const { debut, fin } = bornesDuMois(anneeMois);
  const nbJours = Number(fin.slice(8, 10));
  // getDay() : 0 = dimanche → décalage lundi = 0 … dimanche = 6
  const decalage = (parseDateISO(debut).getDay() + 6) % 7;
  const parDate = new Map<DateISO, Evenement[]>();
  for (const e of evenements) {
    const liste = parDate.get(e.date) ?? [];
    liste.push(e);
    parDate.set(e.date, liste);
  }
  const cases: CaseCalendrier[] = [];
  for (let i = 0; i < decalage; i += 1) {
    cases.push({ date: null, numero: null, evenements: [], aujourdhui: false });
  }
  for (let n = 1; n <= nbJours; n += 1) {
    const date = `${anneeMois}-${String(n).padStart(2, '0')}`;
    cases.push({ date, numero: n, evenements: parDate.get(date) ?? [], aujourdhui: date === jour });
  }
  while (cases.length % 7 !== 0) {
    cases.push({ date: null, numero: null, evenements: [], aujourdhui: false });
  }
  return cases;
}
