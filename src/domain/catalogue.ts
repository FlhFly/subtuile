/**
 * Catalogue de services (§3.4, §7.8) : recherche, aide à la saisie libre
 * (EF-02b), pré-remplissage du formulaire (EF-02), comparaison des canaux
 * (« souvent moins cher en direct »), regroupement par catégorie.
 */

import type { EtatFormulaire } from './formulaire';
import { presetDepuisPeriodicite } from './formulaire';
import { estServicePersonnalise } from './servicePersonnalise';
import { normaliserTexte } from './tri';
import {
  CATEGORIES,
  type CanalAchat,
  type Catalogue,
  type Categorie,
  type Devise,
  type Formule,
  type Periodicite,
  type Service,
  type ServicePersonnalise,
} from './types';

/** Recherche tolérante (accents, casse) sur le nom et l'identifiant. */
export function rechercherServices(services: readonly Service[], texte: string): Service[] {
  const requete = normaliserTexte(texte);
  if (requete === '') return [...services];
  return services.filter(
    (s) => normaliserTexte(s.nom).includes(requete) || normaliserTexte(s.id).includes(requete),
  );
}

/**
 * Services proposés dans la sélection du formulaire : les populaires tant
 * qu'aucune recherche n'est saisie, sinon le résultat de la recherche
 * (maquette : « recherchez pour tout voir »).
 */
export function servicesPourSelection(services: readonly Service[], recherche: string): Service[] {
  if (normaliserTexte(recherche) === '') return services.filter((s) => s.populaire);
  return rechercherServices(services, recherche);
}

export const SUGGESTIONS_MAX = 3;
export const SUGGESTIONS_MIN_CARACTERES = 2;

/** EF-02b : jusqu'à 3 services du catalogue correspondant au nom saisi (dès 2 caractères). */
export function suggestionsCatalogue(services: readonly Service[], nom: string): Service[] {
  if (normaliserTexte(nom).length < SUGGESTIONS_MIN_CARACTERES) return [];
  return rechercherServices(services, nom).slice(0, SUGGESTIONS_MAX);
}

/** Vrai si le service ne se souscrit que via l'App Store (deep link sans adresse de gestion). */
export function appStoreSeulement(service: Service): boolean {
  return service.urlGestion === null && service.deepLinks.app_store !== undefined;
}

/** Canal d'achat par défaut : celui de la formule, sinon App Store si le service n'existe que là. */
export function canalParDefaut(service: Service, formule?: Formule): CanalAchat {
  if (formule) return formule.canal;
  return appStoreSeulement(service) ? 'app_store' : 'direct';
}

/** Formule proposée par défaut : la première du catalogue. */
export function formuleParDefaut(service: Service): Formule | undefined {
  return service.formules[0];
}

const memePeriodicite = (a: Periodicite, b: Periodicite): boolean =>
  a.type === b.type &&
  (a.type !== 'recurrente' ||
    b.type !== 'recurrente' ||
    (a.unite === b.unite && a.intervalle === b.intervalle));

/** Nom d'une formule sans son suffixe de canal (« Individuel — App Store » → « individuel »). */
const nomDeBase = (f: Formule): string => (f.nom.split(' — ')[0] ?? f.nom).trim().toLowerCase();

export interface ComparaisonCanaux {
  direct: Formule;
  store: Formule;
  /** économie en passant en direct */
  ecart: number;
}

/**
 * EF-02 : si une formule App Store / Google Play choisie a un équivalent direct
 * moins cher (même périodicité), renvoie la paire ; sinon undefined.
 */
export function comparaisonCanaux(
  service: Service,
  formuleChoisie?: Formule,
): ComparaisonCanaux | undefined {
  if (formuleChoisie?.canal === 'direct') return undefined;
  const stores = service.formules.filter((f) => f.canal !== 'direct');
  const candidats = formuleChoisie ? [formuleChoisie] : stores;
  for (const store of candidats) {
    const directs = service.formules
      .filter((f) => f.canal === 'direct' && memePeriodicite(f.periodicite, store.periodicite))
      .sort((a, b) => a.prix - b.prix);
    /* même offre en direct si elle existe (« Plus — direct » pour « Plus — App Store »), sinon la moins chère */
    const direct = directs.find((f) => nomDeBase(f) === nomDeBase(store)) ?? directs[0];
    if (direct && direct.prix < store.prix) {
      return { direct, store, ecart: store.prix - direct.prix };
    }
  }
  return undefined;
}

/**
 * Devise de saisie visée (réglage « Devise ») : les tarifs du catalogue, en
 * euros sauf mention (`Formule.devise`), y sont convertis aux taux indicatifs
 * pour que la sélection reste sur la devise de l'utilisateur (EF-45b). Sans
 * cible, le tarif reste dans sa devise.
 */
export interface CibleDevise {
  devise: Devise;
  /** conversion d'un montant depuis la devise `de` vers `devise`, arrondie au centime */
  convertir: (montant: number, de: Devise) => number;
}

/** Devise de facturation d'une formule (euros par défaut). */
export function deviseFormule(formule: Pick<Formule, 'devise'>): Devise {
  return formule.devise ?? 'EUR';
}

/** Texte de prix d'une formule dans la devise cible (« 13,49 » → « 14,66 » en USD). */
export function prixFormule(
  formule: Formule,
  cible?: CibleDevise,
): { prix: string; devise: Devise } {
  const source = deviseFormule(formule);
  const montant = cible
    ? Math.round(cible.convertir(formule.prix, source) * 100) / 100
    : formule.prix;
  return { prix: String(montant).replace('.', ','), devise: cible?.devise ?? source };
}

/**
 * EF-02 : pré-remplit le formulaire depuis un service (nom, catégorie, adresse,
 * périodicité, tarif de la formule, canal, mode de résiliation, montant estimé).
 * Les champs libres déjà saisis (notes, tags, moyen de paiement…) sont conservés.
 */
export function preRemplirDepuisService(
  etat: EtatFormulaire,
  service: Service,
  formule: Formule | undefined = formuleParDefaut(service),
  cible?: CibleDevise,
): EtatFormulaire {
  const periodicite: Periodicite | undefined =
    formule?.periodicite ?? service.periodicitesConnues[0];
  const preset = periodicite ? presetDepuisPeriodicite(periodicite) : {};
  const tarif = formule ? prixFormule(formule, cible) : null;
  return {
    ...etat,
    ...preset,
    serviceId: service.id,
    formuleId: formule?.id ?? null,
    nom: service.nom,
    categorie: service.categorie,
    prix: tarif ? tarif.prix : etat.prix,
    devise: tarif ? tarif.devise : etat.devise,
    urlGestion: service.urlGestion ?? '',
    canalAchat: canalParDefaut(service, formule),
    modeResiliation: service.modeResiliation,
    contactResiliation: service.contactResiliation ?? '',
    montantEstime: service.montantEstime,
  };
}

/** Détache le formulaire du catalogue (retour en saisie libre) sans perdre la saisie. */
export function detacherDuCatalogue(etat: EtatFormulaire): EtatFormulaire {
  return { ...etat, serviceId: null, formuleId: null };
}

/** Choix d'une formule : tarif, périodicité et canal suivent. */
export function appliquerFormule(
  etat: EtatFormulaire,
  formule: Formule,
  cible?: CibleDevise,
): EtatFormulaire {
  const tarif = prixFormule(formule, cible);
  return {
    ...etat,
    ...presetDepuisPeriodicite(formule.periodicite),
    formuleId: formule.id,
    prix: tarif.prix,
    devise: tarif.devise,
    canalAchat: formule.canal,
  };
}

export interface GroupeCatalogue {
  categorie: Categorie;
  services: Service[];
}

/** Services regroupés par catégorie, dans l'ordre du modèle, catégories vides omises. */
export function grouperParCategorie(services: readonly Service[]): GroupeCatalogue[] {
  return CATEGORIES.map((categorie) => ({
    categorie,
    services: services.filter((s) => s.categorie === categorie),
  })).filter((g) => g.services.length > 0);
}

/**
 * Catalogue vu par l'app (EF-09) : les services proposés par l'utilisateur
 * (« Mes services », vivants) précèdent le catalogue embarqué ; version et
 * fraîcheur restent celles du jeu de référence.
 */
export function fusionnerCatalogue(
  embarque: Catalogue,
  personnalises: readonly ServicePersonnalise[],
): Catalogue {
  const vivants = personnalises.filter((s) => s.deletedAt === null);
  if (vivants.length === 0) return embarque;
  return { ...embarque, data: [...vivants, ...embarque.data] };
}

export interface GroupesCatalogue {
  /** entrées proposées par l'utilisateur, en tête (maquette) */
  mesServices: Service[];
  parCategorie: GroupeCatalogue[];
}

/** Regroupement pour l'écran Catalogue : « Mes services » puis les catégories. */
export function grouperAvecMesServices(services: readonly Service[]): GroupesCatalogue {
  const mesServices = services.filter((s) => estServicePersonnalise(s));
  const embarques = services.filter((s) => !estServicePersonnalise(s));
  return { mesServices, parCategorie: grouperParCategorie(embarques) };
}
