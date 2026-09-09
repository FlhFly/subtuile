/** Libellés partagés entre tuile et fiche : compteur et statut, à partir des modèles du domaine. */

import type { Compteur } from '../domain/tuile';
import type { Abonnement } from '../domain/types';
import type { I18n } from './contexts/I18nContext';

export function libelleCompteur(i18n: I18n, c: Compteur): string {
  const { t, date } = i18n;
  switch (c.type) {
    case 'echeance':
      if (c.jours === 0) return t('compteur.echeance.aujourdhui', { date: date(c.date) });
      if (c.jours < 0) return t('compteur.echeance.depasse', { n: -c.jours, date: date(c.date) });
      return t('compteur.echeance', { n: c.jours, date: date(c.date) });
    case 'essai':
      return t('compteur.essai', { n: c.jours });
    case 'preavis':
      return t('compteur.preavis', { n: c.jours });
    case 'pause':
      return c.repriseLe
        ? t('compteur.pause.jusquau', { date: date(c.repriseLe) })
        : t('compteur.pause');
    case 'resilie':
      return t('compteur.resilie', { date: date(c.jusquau) });
    case 'archive':
      return t('compteur.archive');
    case 'a_vie':
      return t('compteur.aVie');
    case 'a_l_usage':
      return t('compteur.aLUsage');
  }
}

export function libelleStatut(i18n: I18n, abo: Pick<Abonnement, 'statut'>): string {
  const s = abo.statut;
  switch (s.type) {
    case 'actif':
      return i18n.t('statut.actif');
    case 'en_pause':
      return s.repriseLe
        ? i18n.t('statut.en_pause.jusquau', { date: i18n.date(s.repriseLe) })
        : i18n.t('statut.en_pause');
    case 'resilie_actif_jusquau':
      return i18n.t('statut.resilie_actif_jusquau', { date: i18n.date(s.jusquau) });
    case 'archive':
      return i18n.t('statut.archive');
  }
}
