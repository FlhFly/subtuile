/**
 * Ordre personnalisé des tuiles (EF-14) : fonctions pures de
 * réordonnancement. L'accueil déplace des identifiants ; les positions sont
 * ensuite inscrites dans `ordre` (entier croissant) et persistées.
 */

import { trierAbonnements } from './tri';
import type { Abonnement, DateISO } from './types';

/** Copie de `liste` où l'élément d'indice `de` est déplacé à l'indice `vers`. */
export function deplacer<T>(liste: readonly T[], de: number, vers: number): T[] {
  const copie = [...liste];
  if (de === vers || de < 0 || vers < 0 || de >= copie.length || vers >= copie.length) {
    return copie;
  }
  const [element] = copie.splice(de, 1) as [T];
  copie.splice(vers, 0, element);
  return copie;
}

/**
 * Réordonne `liste` selon la suite d'identifiants `ids` ; les éléments absents
 * de `ids` suivent, dans leur ordre d'origine.
 */
export function ordonnerSelon<T extends { id: string }>(
  liste: readonly T[],
  ids: readonly string[],
): T[] {
  const rang = new Map(ids.map((id, i) => [id, i]));
  return [...liste].sort((a, b) => {
    const ra = rang.get(a.id);
    const rb = rang.get(b.id);
    if (ra === undefined && rb === undefined) return 0;
    if (ra === undefined) return 1;
    if (rb === undefined) return -1;
    return ra - rb;
  });
}

/**
 * Inscrit un nouvel ordre : les abonnements visibles (`idsVisibles`, dans
 * l'ordre voulu) se répartissent sur les places qu'ils occupaient dans l'ordre
 * personnalisé complet ; les autres (filtrés, archivés) ne bougent pas. Un
 * abonnement jamais classé (`ordre` null) est placé d'après le tri par
 * échéance, en fin de liste. Renvoie la liste complète, dans l'ordre reçu ;
 * les abonnements dont la position ne change pas gardent leur référence.
 */
export function appliquerOrdre(
  abonnements: readonly Abonnement[],
  idsVisibles: readonly string[],
  jour: DateISO,
): Abonnement[] {
  const connus = new Set(abonnements.map((a) => a.id));
  const visibles = idsVisibles.filter((id, i) => connus.has(id) && idsVisibles.indexOf(id) === i);
  const ensemble = new Set(visibles);
  const position = new Map<string, number>();
  let suivant = 0;
  trierAbonnements(abonnements, 'personnalise', jour).forEach((a, i) => {
    const id = ensemble.has(a.id) ? (visibles[suivant++] ?? a.id) : a.id;
    position.set(id, i);
  });
  return abonnements.map((a) => {
    const p = position.get(a.id);
    return p === undefined || p === a.ordre ? a : { ...a, ordre: p };
  });
}
