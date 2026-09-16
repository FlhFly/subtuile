import { ADRESSE_CONTACT } from '../data/contact';
import { decrireAppareil, lienRetour } from '../domain/retours';
import type { Categorie, Langue } from '../domain/types';
import type { CleTraduction, Parametres } from '../i18n';

const VERSION_APP = __APP_VERSION__;

/** Ce qu'il faut d'un service pour le proposer au catalogue commun. */
export interface ServiceAProposer {
  nom: string;
  categorie: Categorie;
  urlGestion: string | null;
}

/**
 * E-mail pré-rempli vers l'adresse de contact pour proposer un service au
 * catalogue commun (EF-09) : nom, catégorie, adresse, puis version, appareil
 * et langue. L'app n'envoie rien elle-même, elle ouvre la messagerie.
 */
export function lienPropositionService(
  t: (cle: CleTraduction, params?: Parametres) => string,
  langue: Langue,
  service: ServiceAProposer,
): string {
  return lienRetour(
    ADRESSE_CONTACT,
    t('retours.sujet.service', { version: VERSION_APP, nom: service.nom }),
    t('retours.corps.service', {
      nom: service.nom,
      categorie: t(`categorie.${service.categorie}`),
      url: service.urlGestion ?? '—',
      version: VERSION_APP,
      appareil: decrireAppareil(window.navigator.userAgent, window.navigator.maxTouchPoints),
      langue,
    }),
  );
}
