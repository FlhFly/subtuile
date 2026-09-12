/** Libellés d'un événement de l'échéancier (ligne de l'écran, rappel ICS). */

import type { Evenement } from '../domain/echeancier';
import type { I18n } from './contexts/I18nContext';

export interface LibellesEvenement {
  /** type d'événement, sous le nom (« Renouvellement · / mois ») */
  sous: string;
  /** montant affiché à droite */
  somme: string;
  /** puce J-X, « Essai · J-2 », date de fin… */
  puce: string;
}

export function libellesEvenement(i18n: I18n, e: Evenement): LibellesEvenement {
  const { t, montant, date, compteur, periodicite } = i18n;
  const prix = (v: number) =>
    e.montantEstime ? t('montant.estime', { montant: montant(v, e.devise) }) : montant(v, e.devise);
  switch (e.type) {
    case 'renouvellement':
      return {
        sous: t('echeancier.ev.renouvellement', { periodicite: periodicite(e.periodicite) }),
        somme: e.montant !== null ? prix(e.montant) : t('commun.vide'),
        puce: compteur(e.jours),
      };
    case 'fin_essai':
      return {
        sous: t('echeancier.ev.fin_essai', {
          montant: e.montant !== null ? montant(e.montant, e.devise) : t('commun.vide'),
          periodicite: periodicite(e.periodicite),
        }),
        somme: montant(0, e.devise),
        puce: t('echeancier.puce.essai', { compteur: compteur(e.jours) }),
      };
    case 'preavis':
      return {
        sous: t('echeancier.ev.preavis', { n: e.preavisJours ?? 0 }),
        somme: t('commun.vide'),
        puce: t('echeancier.puce.preavis', { compteur: compteur(e.jours) }),
      };
    case 'fin_resilie':
      return {
        sous: t('echeancier.ev.fin_resilie'),
        somme: t('commun.vide'),
        puce: date(e.date),
      };
  }
}

/** Titre du rappel calendrier : « Netflix — Renouvellement · / mois ». */
export function titreRappel(i18n: I18n, e: Evenement): string {
  return `${e.nom} — ${libellesEvenement(i18n, e).sous}`;
}

/** Description du rappel : montant s'il y en a un, puis l'invitation à ouvrir Subtuile. */
export function descriptionRappel(i18n: I18n, e: Evenement): string {
  const { somme } = libellesEvenement(i18n, e);
  const montant = e.type === 'renouvellement' || e.type === 'fin_essai' ? somme : '';
  return [montant, i18n.t('ics.description')].filter((x) => x !== '').join('\n');
}
