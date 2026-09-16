/**
 * « Proposer un service » (EF-09) : entrée « Mes services » ajoutée au
 * catalogue local, réutilisable comme une entrée du catalogue embarqué.
 * Couleur et initiales sont générées ; l'id est préfixé pour ne jamais
 * entrer en collision avec les ids stables du catalogue.
 */

import { estUrlValide, normaliserUrl } from './formulaire';
import { nouvelId } from '../lib/ids';
import { maintenant } from '../lib/horloge';
import { cleNom, normaliserTexte } from './tri';
import { initialesDuNom } from './tuile';
import type { Categorie, Service, ServicePersonnalise } from './types';

export const PREFIXE_ID_PERSONNALISE = 'perso-';

/** Palette de fonds de tuile pour les services proposés (lisible en blanc). */
export const PALETTE_PERSONNALISEE = [
  '#c2410c',
  '#b91c1c',
  '#be185d',
  '#7e22ce',
  '#4338ca',
  '#1d4ed8',
  '#0e7490',
  '#047857',
  '#4d7c0f',
  '#a16207',
] as const;

/** Couleur déterministe à partir du nom (même nom → même couleur). */
export function couleurPourNom(nom: string): string {
  const texte = normaliserTexte(nom);
  let h = 0;
  for (let i = 0; i < texte.length; i += 1) h = (h * 31 + texte.charCodeAt(i)) >>> 0;
  return PALETTE_PERSONNALISEE[h % PALETTE_PERSONNALISEE.length] ?? PALETTE_PERSONNALISEE[0];
}

export interface FormulaireServicePersonnalise {
  nom: string;
  categorie: Categorie;
  urlGestion: string;
}

export type CodeErreurService = 'requis' | 'url' | 'existe';
export type ErreursService = Partial<
  Record<keyof FormulaireServicePersonnalise, CodeErreurService>
>;

export function formulaireServiceVide(): FormulaireServicePersonnalise {
  return { nom: '', categorie: 'autre', urlGestion: '' };
}

/** Vrai si un service (embarqué ou personnalisé) porte déjà ce nom. */
/** Même nom rapproché qu'un service existant (accents, casse et ponctuation ignorés), comme la bascule EF-09. */
export function nomDejaPris(nom: string, existants: readonly Service[]): boolean {
  const cle = cleNom(nom);
  return cle !== '' && existants.some((s) => cleNom(s.nom) === cle);
}

export function validerServicePersonnalise(
  etat: FormulaireServicePersonnalise,
  existants: readonly Service[],
): ErreursService {
  const erreurs: ErreursService = {};
  if (etat.nom.trim() === '') erreurs.nom = 'requis';
  else if (nomDejaPris(etat.nom, existants)) erreurs.nom = 'existe';
  const url = normaliserUrl(etat.urlGestion);
  if (url !== null && !estUrlValide(url)) erreurs.urlGestion = 'url';
  return erreurs;
}

/** Construit l'entité à partir d'un formulaire VALIDE. */
export function creerServicePersonnalise(
  etat: FormulaireServicePersonnalise,
  instant = maintenant(),
): ServicePersonnalise {
  const nom = etat.nom.trim();
  return {
    id: `${PREFIXE_ID_PERSONNALISE}${nouvelId()}`,
    updatedAt: instant,
    deletedAt: null,
    nom,
    categorie: etat.categorie,
    couleur: couleurPourNom(nom),
    logo: { type: 'initiales', valeur: initialesDuNom(nom) },
    urlGestion: normaliserUrl(etat.urlGestion),
    deepLinks: {},
    periodicitesConnues: [{ type: 'recurrente', unite: 'mois', intervalle: 1 }],
    formules: [],
    modeResiliation: 'lien',
    contactResiliation: null,
    montantEstime: false,
    populaire: true,
  };
}

export function estServicePersonnalise(service: Pick<Service, 'id'>): boolean {
  return service.id.startsWith(PREFIXE_ID_PERSONNALISE);
}
