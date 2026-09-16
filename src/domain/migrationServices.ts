/**
 * Migration d'une entrée « Mes services » vers la version officielle du
 * catalogue (EF-09, CdC v1.25) : détection par nom rapproché, réécriture des
 * abonnements liés sans toucher au prix, à la périodicité, à la devise ni au
 * moyen de paiement. Fonctions pures ; l'écran propose, jamais de bascule
 * silencieuse.
 */

import { estServicePersonnalise } from './servicePersonnalise';
import { cleNom } from './tri';
import type { Abonnement, Service, ServicePersonnalise } from './types';

export interface Correspondance {
  personnalise: ServicePersonnalise;
  officiel: Service;
}

export { cleNom };

/**
 * Vrai si le nom saisi désigne un service déjà connu du catalogue fourni
 * (embarqué et « Mes services ») : même nom rapproché, ou nom d'un service
 * contenu tel quel dans la saisie (« Canal famille » → Canal+). Sert à ne
 * proposer l'ajout à « Mes services » que pour un service vraiment inconnu.
 */
export function serviceConnu(nom: string, catalogue: readonly Service[]): boolean {
  const cle = cleNom(nom);
  if (cle === '') return true;
  return catalogue.some((s) => {
    const c = cleNom(s.nom);
    return c !== '' && (c === cle || ` ${cle} `.includes(` ${c} `));
  });
}

/**
 * Entrées « Mes services » vivantes dont le nom rapproché correspond à un
 * service du catalogue embarqué, hors refus mémorisés (`migrationsRefusees`).
 */
export function correspondancesOfficielles(
  personnalises: readonly ServicePersonnalise[],
  catalogue: readonly Service[],
  refuses: readonly string[] = [],
): Correspondance[] {
  const officiels = new Map<string, Service>();
  for (const s of catalogue) {
    if (!estServicePersonnalise(s) && !officiels.has(cleNom(s.nom)))
      officiels.set(cleNom(s.nom), s);
  }
  const ecartes = new Set(refuses);
  const resultat: Correspondance[] = [];
  for (const p of personnalises) {
    if (p.deletedAt !== null || ecartes.has(p.id)) continue;
    const officiel = officiels.get(cleNom(p.nom));
    if (officiel) resultat.push({ personnalise: p, officiel });
  }
  return resultat;
}

/**
 * Abonnements à réécrire pour une correspondance : ceux qui pointaient
 * l'entrée maison passent sur le service officiel. La formule est remise à
 * zéro (l'utilisateur en choisira une), l'adresse de gestion et le mode de
 * résiliation ne sont repris de l'officiel que s'ils venaient de l'entrée
 * maison ; tout le reste (prix, périodicité, devise, moyen de paiement,
 * statut, notes…) est conservé. Seuls les abonnements modifiés sont renvoyés.
 */
export function migrerAbonnements(
  abonnements: readonly Abonnement[],
  { personnalise, officiel }: Correspondance,
): Abonnement[] {
  return abonnements
    .filter((a) => a.serviceId === personnalise.id)
    .map((a) => {
      const urlHeritee = a.urlGestion === null || a.urlGestion === personnalise.urlGestion;
      const resiliationHeritee =
        a.modeResiliation === personnalise.modeResiliation &&
        a.contactResiliation === personnalise.contactResiliation;
      return {
        ...a,
        serviceId: officiel.id,
        formuleId: null,
        urlGestion: urlHeritee ? (officiel.urlGestion ?? a.urlGestion) : a.urlGestion,
        modeResiliation: resiliationHeritee ? officiel.modeResiliation : a.modeResiliation,
        contactResiliation: resiliationHeritee ? officiel.contactResiliation : a.contactResiliation,
      };
    });
}
