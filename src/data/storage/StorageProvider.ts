/**
 * Couche d'accès unique aux données métier (CdC §5.6).
 * Tout composant passe par cette interface ; l'implémentation locale est Dexie
 * (dexieProvider.ts), une implémentation distante pourra s'y substituer sans
 * toucher à l'interface. Aucun composant n'importe Dexie directement.
 */

import type {
  Abonnement,
  EntiteTechnique,
  ExportJSON,
  Horodatage,
  MoyenPaiement,
  ParametresPilotage,
  ServicePersonnalise,
} from '../../domain/types';

export interface OptionsLecture {
  /** inclure les entités supprimées logiquement (tombstones §3.5) */
  inclureSupprimes?: boolean;
}

/** Dépôt d'une famille d'entités portant les champs techniques §3.5. */
export interface Depot<T extends EntiteTechnique> {
  lister(options?: OptionsLecture): Promise<T[]>;
  lire(id: string, options?: OptionsLecture): Promise<T | undefined>;
  /** insère ou remplace ; `updatedAt` est posé par le dépôt */
  enregistrer(entite: T): Promise<T>;
  enregistrerPlusieurs(entites: T[]): Promise<T[]>;
  /** suppression logique (EF-01) ; renvoie false si l'entité n'existe pas ou est déjà supprimée */
  supprimer(id: string): Promise<boolean>;
  /** annulation d'une suppression logique (EF-01b) */
  restaurer(id: string): Promise<boolean>;
  /** suppression physique des tombstones antérieurs à `avant` ; renvoie le nombre purgé */
  purger(avant: Horodatage): Promise<number>;
}

export type ModeImport = 'fusion' | 'remplacement';

export interface BilanImport {
  abonnements: number;
  moyensPaiement: number;
  servicesPersonnalises: number;
}

export type Ecouteur = () => void;

export interface StorageProvider {
  readonly abonnements: Depot<Abonnement>;
  readonly moyensPaiement: Depot<MoyenPaiement>;
  readonly servicesPersonnalises: Depot<ServicePersonnalise>;
  /** enregistrement unique `pilotage` (budget, objectif — lot 5) */
  readonly parametres: Depot<ParametresPilotage>;

  /** EF-50 : sauvegarde complète des entités vivantes */
  exporter(): Promise<ExportJSON>;
  /**
   * EF-50 : import. `remplacement` vide tout avant d'écrire ; `fusion`
   * conserve, pour chaque id, la version la plus récente (updatedAt).
   * Lève une erreur si le schéma est plus récent que celui de l'app.
   */
  importer(donnees: ExportJSON, mode: ModeImport): Promise<BilanImport>;

  /** efface toutes les données métier (réglages → « tout effacer ») */
  effacerTout(): Promise<void>;

  /** notification après chaque écriture ; renvoie la fonction de désinscription */
  souscrire(ecouteur: Ecouteur): () => void;

  /** libère la connexion */
  fermer(): void;
}
