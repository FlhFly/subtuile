/**
 * Moyens de paiement (§3.3, §7.6) : formulaire, validation, conversion.
 * Jamais de numéro complet ni de CVV : libellé, 4 derniers chiffres et mois
 * d'expiration uniquement.
 */

import { estAnneeMois } from './dates';
import { creerMoyenPaiement, COULEURS_MOYEN_PAIEMENT, type ContexteFabrique } from './fabriques';
import type { Abonnement, MoyenPaiement, TypeMoyenPaiement } from './types';

export interface FormulaireMoyenPaiement {
  type: TypeMoyenPaiement;
  libelle: string;
  quatreDerniers: string;
  /** « YYYY-MM » */
  dateExpiration: string;
}

export type ChampMoyenPaiement = keyof FormulaireMoyenPaiement;
export type CodeErreurMoyenPaiement = 'requis' | 'quatre' | 'anneeMois';
export type ErreursMoyenPaiement = Partial<Record<ChampMoyenPaiement, CodeErreurMoyenPaiement>>;

export function formulaireMoyenPaiementVide(
  type: TypeMoyenPaiement = 'cb',
): FormulaireMoyenPaiement {
  return { type, libelle: '', quatreDerniers: '', dateExpiration: '' };
}

export function formulaireDepuisMoyenPaiement(m: MoyenPaiement): FormulaireMoyenPaiement {
  return {
    type: m.type,
    libelle: m.libelle,
    quatreDerniers: m.quatreDerniers ?? '',
    dateExpiration: m.dateExpiration ?? '',
  };
}

/** Types pour lesquels les 4 derniers chiffres et l'expiration ont un sens. */
export function porteCarte(type: TypeMoyenPaiement): boolean {
  return type === 'cb';
}

/** « 09/2026 », « 2026-09 », « 09-2026 » → « 2026-09» ; sinon la saisie nettoyée. */
export function normaliserAnneeMois(texte: string): string {
  const t = texte.trim();
  const mmaaaa = /^(\d{2})[/-](\d{4})$/.exec(t);
  if (mmaaaa) return `${mmaaaa[2]}-${mmaaaa[1]}`;
  const aaaamm = /^(\d{4})[/-](\d{2})$/.exec(t);
  if (aaaamm) return `${aaaamm[1]}-${aaaamm[2]}`;
  return t;
}

export function validerMoyenPaiement(etat: FormulaireMoyenPaiement): ErreursMoyenPaiement {
  const erreurs: ErreursMoyenPaiement = {};
  if (etat.libelle.trim() === '') erreurs.libelle = 'requis';
  const quatre = etat.quatreDerniers.trim();
  if (quatre !== '' && !/^\d{4}$/.test(quatre)) erreurs.quatreDerniers = 'quatre';
  const exp = normaliserAnneeMois(etat.dateExpiration);
  if (exp !== '' && !estAnneeMois(exp)) erreurs.dateExpiration = 'anneeMois';
  return erreurs;
}

/** Construit ou met à jour l'entité à partir d'un formulaire VALIDE. */
export function moyenPaiementDepuisFormulaire(
  etat: FormulaireMoyenPaiement,
  existant?: MoyenPaiement,
  ctx: ContexteFabrique = {},
): MoyenPaiement {
  const carte = porteCarte(etat.type);
  const quatre = etat.quatreDerniers.trim();
  const exp = normaliserAnneeMois(etat.dateExpiration);
  const champs = {
    type: etat.type,
    libelle: etat.libelle.trim(),
    quatreDerniers: carte && quatre !== '' ? quatre : null,
    dateExpiration: carte && exp !== '' ? exp : null,
  };
  if (!existant) return creerMoyenPaiement(champs, ctx);
  const couleur =
    existant.type === etat.type ? existant.couleur : COULEURS_MOYEN_PAIEMENT[etat.type];
  return { ...existant, ...champs, couleur };
}

/** Nombre d'abonnements non archivés par moyen de paiement. */
export function usageParMoyen(abonnements: readonly Abonnement[]): Map<string, number> {
  const usage = new Map<string, number>();
  for (const a of abonnements) {
    if (a.statut.type === 'archive' || a.moyenPaiementId === null) continue;
    usage.set(a.moyenPaiementId, (usage.get(a.moyenPaiementId) ?? 0) + 1);
  }
  return usage;
}
