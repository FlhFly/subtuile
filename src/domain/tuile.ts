/**
 * Modèle de présentation d'une tuile (EF-10, EF-11) : structure pure, sans
 * libellé ni React, calculée depuis l'abonnement, son moyen de paiement et
 * son service de catalogue. Le composant Tuile ne fait que traduire et
 * styler ce modèle, ce qui rend la logique testable.
 */

import {
  comparerDates,
  dateLimiteResiliation,
  joursAvant,
  niveauCompteur,
  SEUILS_URGENCE,
} from './dates';
import type {
  Abonnement,
  CanalAchat,
  DateISO,
  MoyenPaiement,
  Periodicite,
  Service,
  TypeMoyenPaiement,
} from './types';
import type { Devise } from './types';

/** Fond de la tuile : colorée (actif), sable (en pause), neutre pointillée (résilié, archivé). */
export type VarianteTuile = 'coloree' | 'pause' | 'neutre';

export type Compteur =
  | { type: 'echeance'; niveau: 'ok' | 'warn' | 'urg'; jours: number; date: DateISO }
  | { type: 'essai'; jours: number; date: DateISO }
  | { type: 'preavis'; jours: number; date: DateISO }
  | { type: 'pause'; repriseLe: DateISO | null }
  | { type: 'resilie'; jusquau: DateISO }
  | { type: 'archive' }
  | { type: 'a_vie' }
  | { type: 'a_l_usage' };

/** Couleur du chip compteur, alignée sur les tokens (ok / warn / urg / trial / neutre). */
export type CouleurCompteur = 'ok' | 'warn' | 'urg' | 'trial' | 'neutre';

export type SousTitre =
  | { type: 'usage'; plafond: number | null }
  | { type: 'essai'; prixApres: number; periodicite: Periodicite }
  | { type: 'partage'; partPayee: number; periodicite: Periodicite }
  | { type: 'prix'; prix: number; estime: boolean; periodicite: Periodicite };

export interface PastillePaiement {
  type: TypeMoyenPaiement;
  couleur: string;
}

export interface ModeleTuile {
  id: string;
  nom: string;
  initiales: string;
  couleur: string;
  variante: VarianteTuile;
  essai: boolean;
  archive: boolean;
  partage: boolean;
  canal: CanalAchat;
  /** devise de saisie des montants du sous-titre (EF-45b) */
  devise: Devise;
  sousTitre: SousTitre;
  compteur: Compteur;
  paiement: PastillePaiement | null;
}

export const COULEUR_TUILE_DEFAUT = '#5f5b53';

/** Initiales à partir du nom : deux premiers mots, sinon deux premières lettres. */
export function initialesDuNom(nom: string): string {
  const mots = nom
    .trim()
    .split(/[\s\-_/·]+/)
    .filter((m) => m.length > 0);
  if (mots.length === 0) return '?';
  if (mots.length === 1) {
    const m = mots[0] ?? '';
    return m.length >= 2 ? m.slice(0, 2) : m.toUpperCase();
  }
  return `${mots[0]?.charAt(0) ?? ''}${mots[1]?.charAt(0) ?? ''}`.toUpperCase();
}

/**
 * Rendu du logo à chaîne de repli (§3.4) : icone → upload → initiales.
 * En V1 seules les initiales sont rendues ; les autres types retombent sur
 * les initiales du nom sans jamais casser l'affichage.
 */
export function logoTuile(abo: Pick<Abonnement, 'nom' | 'logo'>, service?: Service): string {
  const candidats = [abo.logo, service?.logo];
  for (const logo of candidats) {
    if (logo && logo.type === 'initiales' && logo.valeur.trim().length > 0) return logo.valeur;
  }
  return initialesDuNom(abo.nom);
}

export function couleurTuile(abo: Pick<Abonnement, 'couleur'>, service?: Service): string {
  return abo.couleur ?? service?.couleur ?? COULEUR_TUILE_DEFAUT;
}

export function varianteTuile(abo: Pick<Abonnement, 'statut'>): VarianteTuile {
  switch (abo.statut.type) {
    case 'actif':
      return 'coloree';
    case 'en_pause':
      return 'pause';
    default:
      return 'neutre';
  }
}

/** Étiquette du compteur, dans l'ordre de priorité de la maquette. */
export function compteurTuile(
  abo: Pick<
    Abonnement,
    'statut' | 'essai' | 'engagement' | 'dateDebut' | 'periodicite' | 'prochaineEcheance'
  >,
  jour: DateISO,
): Compteur {
  const s = abo.statut;
  if (s.type === 'archive') return { type: 'archive' };
  if (s.type === 'en_pause') return { type: 'pause', repriseLe: s.repriseLe };
  if (s.type === 'resilie_actif_jusquau') return { type: 'resilie', jusquau: s.jusquau };
  if (abo.essai && comparerDates(abo.essai.dateFin, jour) >= 0) {
    return { type: 'essai', jours: joursAvant(abo.essai.dateFin, jour), date: abo.essai.dateFin };
  }
  const limite = dateLimiteResiliation(abo, jour);
  if (limite !== null) {
    const jours = joursAvant(limite, jour);
    if (jours <= SEUILS_URGENCE.warn) return { type: 'preavis', jours, date: limite };
  }
  if (abo.prochaineEcheance === null) {
    return abo.periodicite.type === 'a_vie' ? { type: 'a_vie' } : { type: 'a_l_usage' };
  }
  const jours = joursAvant(abo.prochaineEcheance, jour);
  return { type: 'echeance', niveau: niveauCompteur(jours), jours, date: abo.prochaineEcheance };
}

export function couleurCompteur(c: Compteur): CouleurCompteur {
  switch (c.type) {
    case 'echeance':
      return c.niveau;
    case 'essai':
    case 'preavis':
      return 'trial';
    default:
      return 'neutre';
  }
}

export function sousTitreTuile(
  abo: Pick<Abonnement, 'periodicite' | 'essai' | 'partage' | 'prix' | 'montantEstime'>,
  jour: DateISO,
): SousTitre {
  const p = abo.periodicite;
  if (p.type === 'a_l_usage') return { type: 'usage', plafond: p.plafond };
  if (abo.essai && comparerDates(abo.essai.dateFin, jour) >= 0) {
    return { type: 'essai', prixApres: abo.essai.prixApres, periodicite: p };
  }
  if (abo.partage) return { type: 'partage', partPayee: abo.partage.partPayee, periodicite: p };
  return { type: 'prix', prix: abo.prix, estime: abo.montantEstime, periodicite: p };
}

export function modeleTuile(
  abo: Abonnement,
  jour: DateISO,
  moyenPaiement?: MoyenPaiement,
  service?: Service,
): ModeleTuile {
  return {
    id: abo.id,
    nom: abo.nom,
    initiales: logoTuile(abo, service),
    couleur: couleurTuile(abo, service),
    variante: varianteTuile(abo),
    essai: abo.essai !== null && comparerDates(abo.essai.dateFin, jour) >= 0,
    archive: abo.statut.type === 'archive',
    partage: abo.partage !== null,
    canal: abo.canalAchat,
    devise: abo.devise,
    sousTitre: sousTitreTuile(abo, jour),
    compteur: compteurTuile(abo, jour),
    paiement: moyenPaiement ? { type: moyenPaiement.type, couleur: moyenPaiement.couleur } : null,
  };
}
