/**
 * Désabonnement rapide (EF-20, EF-21, EF-21b, EF-22, §5.3).
 * Le routage dépend du CANAL D'ACHAT, pas du moyen de paiement : un abonnement
 * App Store ou Google Play se résilie dans le store, jamais sur le site du
 * service. En direct, le mode de résiliation décide de la démarche.
 */

import type {
  Abonnement,
  CanalAchat,
  DateISO,
  ModeResiliation,
  Service,
  StatutResilie,
} from './types';

/** Deep links des stores et de PayPal (§5.3). */
export const DEEP_LINKS = {
  app_store: 'itms-apps://apps.apple.com/account/subscriptions',
  google_play: 'https://play.google.com/store/account/subscriptions',
  paypal: 'https://www.paypal.com/myaccount/autopay/',
} as const;

export type ActionResiliation =
  /** ouvrir une page : le store (canal) ou l'adresse de gestion du service */
  | { type: 'lien'; url: string; source: 'app_store' | 'google_play' | 'service' }
  | { type: 'telephone'; contact: string | null }
  | { type: 'courrier_recommande'; contact: string | null }
  | { type: 'espace_client'; url: string | null; contact: string | null }
  /** résiliation par lien sans adresse connue */
  | { type: 'aucune' };

/** Jeu d'étapes de la démarche (checklist EF-22), selon le canal ou le mode. */
export type CleEtapes = CanalAchat | Exclude<ModeResiliation, 'lien'>;

export const NOMBRE_ETAPES = 4;

export function estUrl(texte: string | null | undefined): texte is string {
  return typeof texte === 'string' && /^https?:\/\//i.test(texte.trim());
}

/** Vrai si le contact ressemble à un numéro de téléphone (chiffres, espaces, +, points, tirets). */
export function estTelephone(texte: string | null | undefined): texte is string {
  if (typeof texte !== 'string') return false;
  const chiffres = texte.replace(/\D/g, '');
  return chiffres.length >= 8 && /^[\d\s+().-]+(\s*\(.*\))?$/.test(texte.trim());
}

/** Lien `tel:` à partir d'un contact (chiffres et + seulement). */
export function lienTelephone(contact: string): string {
  return `tel:${contact.replace(/[^\d+]/g, '')}`;
}

type AboResiliation = Pick<
  Abonnement,
  'canalAchat' | 'modeResiliation' | 'contactResiliation' | 'urlGestion'
>;

/** Action derrière le bouton « Gérer / Résilier » (EF-20, EF-21, EF-21b). */
export function actionResiliation(abo: AboResiliation, service?: Service): ActionResiliation {
  if (abo.canalAchat === 'app_store') {
    return {
      type: 'lien',
      url: service?.deepLinks.app_store ?? DEEP_LINKS.app_store,
      source: 'app_store',
    };
  }
  if (abo.canalAchat === 'google_play') {
    return {
      type: 'lien',
      url: service?.deepLinks.google_play ?? DEEP_LINKS.google_play,
      source: 'google_play',
    };
  }
  const contact = abo.contactResiliation?.trim() || null;
  const urlGestion = abo.urlGestion ?? service?.urlGestion ?? null;
  switch (abo.modeResiliation) {
    case 'telephone':
      return { type: 'telephone', contact };
    case 'courrier_recommande':
      return { type: 'courrier_recommande', contact };
    case 'espace_client':
      return { type: 'espace_client', url: estUrl(contact) ? contact : urlGestion, contact };
    case 'lien':
      return urlGestion ? { type: 'lien', url: urlGestion, source: 'service' } : { type: 'aucune' };
  }
}

/** Clé du jeu d'étapes de la démarche : store si canal store, sinon le mode. */
export function cleEtapes(abo: Pick<Abonnement, 'canalAchat' | 'modeResiliation'>): CleEtapes {
  if (abo.canalAchat !== 'direct') return abo.canalAchat;
  return abo.modeResiliation === 'lien' ? 'direct' : abo.modeResiliation;
}

/**
 * Statut proposé après résiliation (EF-22) : « résilié — actif jusqu'au »
 * la prochaine échéance, ou aujourd'hui s'il n'y en a pas (à vie, à l'usage).
 */
export function statutApresResiliation(
  abo: Pick<Abonnement, 'prochaineEcheance'>,
  jour: DateISO,
): StatutResilie {
  return { type: 'resilie_actif_jusquau', jusquau: abo.prochaineEcheance ?? jour };
}
