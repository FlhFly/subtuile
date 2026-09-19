/**
 * Vue « Foyer & partage » (EF-44b, lot 5) : abonnements partagés, part payée
 * face au prix plein, total du foyer face au total personnel. Montants
 * mensuels normalisés, convertis dans la devise d'affichage. Fonctions pures.
 */

import { montantMensuel } from './dates';
import { sansConversion, type Convertisseur } from './devises';
import { abonnementsPayants } from './finances';
import type { Abonnement, DateISO } from './types';

export interface LignePartage {
  abonnementId: string;
  nom: string;
  /** prix plein, par mois */
  plein: number;
  /** part supportée par l'utilisateur, par mois */
  part: number;
  /** part prise en charge par les autres, par mois */
  autres: number;
}

export interface VueFoyer {
  /** abonnements partagés payants, le plus gros écart d'abord */
  partages: LignePartage[];
  /** total mensuel au prix plein de tous les abonnements payants */
  totalFoyer: number;
  /** total mensuel réellement supporté (celui des totaux EF-40) */
  totalPersonnel: number;
  /** ce que le partage fait économiser chaque mois : foyer − personnel */
  priseEnCharge: number;
}

export function vueFoyer(
  abonnements: readonly Abonnement[],
  jour: DateISO,
  convertir: Convertisseur = sansConversion,
): VueFoyer {
  const payants = abonnementsPayants(abonnements, jour);
  const partages: LignePartage[] = [];
  let totalFoyer = 0;
  let totalPersonnel = 0;
  for (const abo of payants) {
    const mensuel = (prix: number) => convertir(montantMensuel(prix, abo.periodicite), abo.devise);
    const plein = mensuel(abo.prix);
    const part = mensuel(abo.partage ? abo.partage.partPayee : abo.prix);
    totalFoyer += plein;
    totalPersonnel += part;
    if (abo.partage) {
      partages.push({ abonnementId: abo.id, nom: abo.nom, plein, part, autres: plein - part });
    }
  }
  partages.sort((a, b) => b.autres - a.autres || a.nom.localeCompare(b.nom));
  return { partages, totalFoyer, totalPersonnel, priseEnCharge: totalFoyer - totalPersonnel };
}
