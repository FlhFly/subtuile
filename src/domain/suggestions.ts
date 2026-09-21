/**
 * Suggestions d'économies (EF-72, EF-71, reste de C3 — lot 5). Fonctions
 * pures, 100 % locales, fondées sur les formules du catalogue et l'usage
 * déclaré :
 * - doublons potentiels : plusieurs abonnements payants dans une même
 *   catégorie de loisirs ; « résilier le moins utilisé libérerait ~X / mois » ;
 * - passage à l'annuel : formule annuelle de la même offre et du même canal
 *   moins chère que douze mensualités au prix réellement payé ;
 * - canal moins cher : même offre en direct moins chère que via un store.
 */

import { comparaisonCanaux, deviseFormule, nomDeBaseFormule } from './catalogue';
import { sansConversion, type Convertisseur } from './devises';
import { abonnementsPayants, mensuelNormalise } from './finances';
import type { Abonnement, Categorie, DateISO, Devise, Formule, Service } from './types';

/** Catégories où plusieurs abonnements se recoupent vraiment (la vie courante et « autre » en sont exclues). */
export const CATEGORIES_A_DOUBLONS: readonly Categorie[] = [
  'streaming',
  'musique',
  'ia',
  'cloud',
  'productivite',
  'sport',
  'presse',
  'gaming',
  'securite',
];

export interface DoublonCategorie {
  categorie: Categorie;
  /** abonnements payants de la catégorie, le plus cher d'abord */
  abonnements: { id: string; nom: string; mensuel: number; usageParSemaine: number | null }[];
  /** candidat à la résiliation : le moins utilisé si un usage est déclaré, sinon le moins cher */
  candidat: { id: string; nom: string; mensuel: number };
  /** vrai si le candidat vient d'un usage déclaré */
  selonUsage: boolean;
}

export function doublonsParCategorie(
  abonnements: readonly Abonnement[],
  jour: DateISO,
  convertir: Convertisseur = sansConversion,
): DoublonCategorie[] {
  const parCategorie = new Map<Categorie, DoublonCategorie['abonnements']>();
  for (const abo of abonnementsPayants(abonnements, jour)) {
    if (!CATEGORIES_A_DOUBLONS.includes(abo.categorie)) continue;
    const liste = parCategorie.get(abo.categorie) ?? [];
    liste.push({
      id: abo.id,
      nom: abo.nom,
      mensuel: mensuelNormalise(abo, convertir),
      usageParSemaine: abo.usageParSemaine ?? null,
    });
    parCategorie.set(abo.categorie, liste);
  }
  const resultat: DoublonCategorie[] = [];
  for (const [categorie, liste] of parCategorie) {
    if (liste.length < 2) continue;
    liste.sort((a, b) => b.mensuel - a.mensuel || a.nom.localeCompare(b.nom));
    const declares = liste.filter((a) => a.usageParSemaine !== null);
    const selonUsage = declares.length > 0;
    const candidat = selonUsage
      ? [...declares].sort(
          (a, b) => (a.usageParSemaine ?? 0) - (b.usageParSemaine ?? 0) || b.mensuel - a.mensuel,
        )[0]!
      : liste[liste.length - 1]!;
    resultat.push({
      categorie,
      abonnements: liste,
      candidat: { id: candidat.id, nom: candidat.nom, mensuel: candidat.mensuel },
      selonUsage,
    });
  }
  return resultat.sort((a, b) => b.candidat.mensuel - a.candidat.mensuel);
}

export interface SuggestionAnnuel {
  formule: Formule;
  devise: Devise;
  /** économie sur un an, dans la devise de l'abonnement */
  economieAnnuelle: number;
}

/**
 * Passage à l'annuel pour un abonnement mensuel issu du catalogue : formule
 * annuelle de la même offre et du même canal, dans la même devise, moins
 * chère que douze fois le prix réellement payé.
 */
export function suggestionAnnuel(abo: Abonnement, service?: Service): SuggestionAnnuel | null {
  if (!service || abo.formuleId === null || abo.partage) return null;
  const p = abo.periodicite;
  if (p.type !== 'recurrente' || p.unite !== 'mois' || p.intervalle !== 1) return null;
  const actuelle = service.formules.find((f) => f.id === abo.formuleId);
  if (!actuelle) return null;
  const annuelle = service.formules.find(
    (f) =>
      f.periodicite.type === 'recurrente' &&
      f.periodicite.unite === 'an' &&
      f.periodicite.intervalle === 1 &&
      f.canal === actuelle.canal &&
      nomDeBaseFormule(f) === nomDeBaseFormule(actuelle) &&
      deviseFormule(f) === abo.devise,
  );
  if (!annuelle) return null;
  const economie = Math.round((abo.prix * 12 - annuelle.prix) * 100) / 100;
  return economie > 0
    ? { formule: annuelle, devise: abo.devise, economieAnnuelle: economie }
    : null;
}

export interface SuggestionCanal {
  direct: Formule;
  /** économie par période de facturation, dans la devise de la formule */
  ecart: number;
  devise: Devise;
}

/** Même offre moins chère en direct, pour un abonnement du catalogue payé via un store. */
export function suggestionCanal(abo: Abonnement, service?: Service): SuggestionCanal | null {
  if (!service || abo.formuleId === null || abo.canalAchat === 'direct') return null;
  const actuelle = service.formules.find((f) => f.id === abo.formuleId);
  if (!actuelle) return null;
  const c = comparaisonCanaux(service, actuelle);
  return c
    ? { direct: c.direct, ecart: Math.round(c.ecart * 100) / 100, devise: deviseFormule(c.direct) }
    : null;
}

export interface SuggestionEconomie {
  abonnementId: string;
  nom: string;
  type: 'annuel' | 'canal';
  /** économie ramenée à l'année, convertie dans la devise d'affichage */
  economieAnnuelle: number;
}

/** Suggestions chiffrées pour tous les abonnements payants, la plus forte économie d'abord. */
export function suggestionsEconomies(
  abonnements: readonly Abonnement[],
  services: ReadonlyMap<string, Service>,
  jour: DateISO,
  convertir: Convertisseur = sansConversion,
): SuggestionEconomie[] {
  const resultat: SuggestionEconomie[] = [];
  for (const abo of abonnementsPayants(abonnements, jour)) {
    const service = abo.serviceId ? services.get(abo.serviceId) : undefined;
    const annuel = suggestionAnnuel(abo, service);
    if (annuel) {
      resultat.push({
        abonnementId: abo.id,
        nom: abo.nom,
        type: 'annuel',
        economieAnnuelle: convertir(annuel.economieAnnuelle, annuel.devise),
      });
    }
    const canal = suggestionCanal(abo, service);
    if (canal && abo.periodicite.type === 'recurrente') {
      const parAn =
        abo.periodicite.unite === 'an'
          ? 1 / abo.periodicite.intervalle
          : abo.periodicite.unite === 'mois'
            ? 12 / abo.periodicite.intervalle
            : abo.periodicite.unite === 'semaine'
              ? 52 / abo.periodicite.intervalle
              : 365 / abo.periodicite.intervalle;
      resultat.push({
        abonnementId: abo.id,
        nom: abo.nom,
        type: 'canal',
        economieAnnuelle: convertir(canal.ecart * parAn, canal.devise),
      });
    }
  }
  return resultat.sort((a, b) => b.economieAnnuelle - a.economieAnnuelle);
}
