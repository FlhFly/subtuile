/**
 * Rappels calendrier (EF-32) : transforme les événements de l'échéancier en
 * fichier ICS, avec une alarme calée sur les défauts d'alerte (EF-30) — le
 * seuil propre de l'abonnement pour ses renouvellements.
 */

import { seuilEcheance } from '../domain/alertes';
import type { Evenement } from '../domain/echeancier';
import { genererIcs, type RappelIcs } from '../domain/ics';
import { maintenant } from '../lib/horloge';
import type { Abonnement, DefautsAlerte } from '../domain/types';
import type { I18n } from './contexts/I18nContext';
import { descriptionRappel, titreRappel } from './libellesEcheancier';

export function alarmePourEvenement(
  e: Evenement,
  defauts: DefautsAlerte,
  abo: Pick<Abonnement, 'alerteJoursAvant'> | undefined,
): number {
  switch (e.type) {
    case 'renouvellement':
      return abo ? seuilEcheance(abo, defauts) : defauts.echeanceJours;
    case 'fin_essai':
      return defauts.essaiJours;
    case 'preavis':
      return defauts.preavisJours;
    case 'fin_resilie':
      return 0;
  }
}

export function rappelsDepuisEvenements(
  i18n: I18n,
  evenements: readonly Evenement[],
  defauts: DefautsAlerte,
  abonnementsParId: ReadonlyMap<string, Abonnement>,
): RappelIcs[] {
  return evenements.map((e) => ({
    uid: e.cle,
    date: e.date,
    titre: titreRappel(i18n, e),
    description: descriptionRappel(i18n, e),
    alarmeJours: alarmePourEvenement(e, defauts, abonnementsParId.get(e.abonnementId)),
  }));
}

export function icsDepuisEvenements(
  i18n: I18n,
  evenements: readonly Evenement[],
  defauts: DefautsAlerte,
  abonnementsParId: ReadonlyMap<string, Abonnement>,
): string {
  return genererIcs(rappelsDepuisEvenements(i18n, evenements, defauts, abonnementsParId), {
    horodatage: maintenant(),
    libelleAlarme: i18n.t('ics.alarme'),
  });
}
