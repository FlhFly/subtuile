/**
 * Tri, filtres et recherche de l'accueil (EF-12, EF-15). Fonctions pures :
 * l'écran ne fait que composer `appliquerCriteres`.
 */

import { comparerDates, joursAvant, montantMensuel, prixEffectif } from './dates';
import type { Abonnement, Categorie, DateISO, TriAccueil } from './types';

const SANS_ECHEANCE = Number.POSITIVE_INFINITY;

/* ---------------------------------------------------------------------------
 * Tri
 * ------------------------------------------------------------------------- */

/**
 * Clé de tri par échéance : jours avant la fin d'essai si un essai est en
 * cours, sinon avant la prochaine échéance ; les abonnements sans échéance
 * (à vie, à l'usage, en pause, résiliés, archivés) passent en dernier.
 */
export function cleEcheance(abo: Abonnement, jour: DateISO): number {
  if (abo.essai && comparerDates(abo.essai.dateFin, jour) >= 0) {
    return joursAvant(abo.essai.dateFin, jour);
  }
  if (abo.prochaineEcheance !== null) return joursAvant(abo.prochaineEcheance, jour);
  return SANS_ECHEANCE;
}

function comparerNoms(a: Abonnement, b: Abonnement): number {
  return a.nom.localeCompare(b.nom, undefined, { sensitivity: 'base' });
}

/** Renvoie une copie triée selon le critère (EF-12) ; le nom départage les égalités. */
export function trierAbonnements(
  abonnements: readonly Abonnement[],
  tri: TriAccueil,
  jour: DateISO,
): Abonnement[] {
  const copie = [...abonnements];
  switch (tri) {
    case 'echeance':
      return copie.sort(
        (a, b) => cleEcheance(a, jour) - cleEcheance(b, jour) || comparerNoms(a, b),
      );
    case 'prix':
      return copie.sort(
        (a, b) =>
          montantMensuel(prixEffectif(b), b.periodicite) -
            montantMensuel(prixEffectif(a), a.periodicite) || comparerNoms(a, b),
      );
    case 'nom':
      return copie.sort(comparerNoms);
    case 'categorie':
      return copie.sort((a, b) => a.categorie.localeCompare(b.categorie) || comparerNoms(a, b));
    case 'personnalise':
      return copie.sort(
        (a, b) =>
          (a.ordre ?? Number.POSITIVE_INFINITY) - (b.ordre ?? Number.POSITIVE_INFINITY) ||
          cleEcheance(a, jour) - cleEcheance(b, jour) ||
          comparerNoms(a, b),
      );
  }
}

/* ---------------------------------------------------------------------------
 * Filtres
 * ------------------------------------------------------------------------- */

export const FILTRES_STATUT = ['tous', 'actifs', 'en_pause', 'resilies', 'archives'] as const;
export type FiltreStatut = (typeof FILTRES_STATUT)[number];

export const TOUS = 'tous';
export const TOUTES = 'toutes';

export interface CriteresAccueil {
  tri: TriAccueil;
  /** « tous » = tout sauf les archivés (EF-06) */
  statut: FiltreStatut;
  categorie: Categorie | typeof TOUTES;
  moyenPaiementId: string | typeof TOUS;
  tag: string | typeof TOUS;
  recherche: string;
}

export const CRITERES_DEFAUT: CriteresAccueil = {
  tri: 'echeance',
  statut: 'tous',
  categorie: TOUTES,
  moyenPaiementId: TOUS,
  tag: TOUS,
  recherche: '',
};

/** Vue par défaut de l'accueil : tout sauf les archivés (EF-06). */
export function nonArchives(abonnements: readonly Abonnement[]): Abonnement[] {
  return abonnements.filter((a) => a.statut.type !== 'archive');
}

export function filtrerParStatut(
  abonnements: readonly Abonnement[],
  filtre: FiltreStatut,
): Abonnement[] {
  switch (filtre) {
    case 'tous':
      return nonArchives(abonnements);
    case 'actifs':
      return abonnements.filter((a) => a.statut.type === 'actif');
    case 'en_pause':
      return abonnements.filter((a) => a.statut.type === 'en_pause');
    case 'resilies':
      return abonnements.filter((a) => a.statut.type === 'resilie_actif_jusquau');
    case 'archives':
      return abonnements.filter((a) => a.statut.type === 'archive');
  }
}

export function compterParStatut(abonnements: readonly Abonnement[]): Record<FiltreStatut, number> {
  const compte: Record<FiltreStatut, number> = {
    tous: 0,
    actifs: 0,
    en_pause: 0,
    resilies: 0,
    archives: 0,
  };
  for (const a of abonnements) {
    switch (a.statut.type) {
      case 'actif':
        compte.actifs += 1;
        compte.tous += 1;
        break;
      case 'en_pause':
        compte.en_pause += 1;
        compte.tous += 1;
        break;
      case 'resilie_actif_jusquau':
        compte.resilies += 1;
        compte.tous += 1;
        break;
      case 'archive':
        compte.archives += 1;
        break;
    }
  }
  return compte;
}

const memeTag = (a: string, b: string): boolean => normaliserTexte(a) === normaliserTexte(b);

/** Tags distincts (insensibles à la casse et aux accents), triés. */
export function tagsDisponibles(abonnements: readonly Abonnement[]): string[] {
  const tags: string[] = [];
  for (const a of abonnements) {
    for (const tag of a.tags) {
      if (!tags.some((t) => memeTag(t, tag))) tags.push(tag);
    }
  }
  return tags.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

/* ---------------------------------------------------------------------------
 * Recherche (EF-15)
 * ------------------------------------------------------------------------- */

/** Minuscules, sans accents ni espaces superflus, pour une comparaison tolérante. */
export function normaliserTexte(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Nom rapproché : accents, casse et ponctuation ignorés (« Basic-Fit » ≡ « basic fit »). */
export function cleNom(nom: string): string {
  return normaliserTexte(nom)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Recherche textuelle sur le nom, les tags, la référence client et les notes. */
export function rechercher(abonnements: readonly Abonnement[], texte: string): Abonnement[] {
  const requete = normaliserTexte(texte);
  if (requete === '') return [...abonnements];
  return abonnements.filter((a) =>
    [a.nom, ...a.tags, a.referenceClient ?? '', a.notes].some((champ) =>
      normaliserTexte(champ).includes(requete),
    ),
  );
}

/* ---------------------------------------------------------------------------
 * Composition
 * ------------------------------------------------------------------------- */

/** Vrai si un filtre ou une recherche s'écarte des défauts (le tri n'est pas un filtre). */
export function filtresActifs(criteres: CriteresAccueil): boolean {
  return (
    criteres.statut !== CRITERES_DEFAUT.statut ||
    criteres.categorie !== CRITERES_DEFAUT.categorie ||
    criteres.moyenPaiementId !== CRITERES_DEFAUT.moyenPaiementId ||
    criteres.tag !== CRITERES_DEFAUT.tag ||
    criteres.recherche.trim() !== ''
  );
}

/** Applique statut, catégorie, moyen de paiement, tag, recherche, puis le tri. */
export function appliquerCriteres(
  abonnements: readonly Abonnement[],
  criteres: CriteresAccueil,
  jour: DateISO,
): Abonnement[] {
  let liste = filtrerParStatut(abonnements, criteres.statut);
  if (criteres.categorie !== TOUTES) {
    liste = liste.filter((a) => a.categorie === criteres.categorie);
  }
  if (criteres.moyenPaiementId !== TOUS) {
    liste = liste.filter((a) => a.moyenPaiementId === criteres.moyenPaiementId);
  }
  if (criteres.tag !== TOUS) {
    const tag = criteres.tag;
    liste = liste.filter((a) => a.tags.some((t) => memeTag(t, tag)));
  }
  liste = rechercher(liste, criteres.recherche);
  return trierAbonnements(liste, criteres.tri, jour);
}
