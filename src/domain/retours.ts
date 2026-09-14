/**
 * Retours utilisateurs (bugs, idées) par e-mail : l'app n'envoie rien
 * elle-même, elle ouvre la messagerie de l'appareil avec un message
 * pré-rempli (version, appareil, langue). Fonctions pures.
 */

export type TypeRetour = 'bug' | 'idee';

/** Lien `mailto:` avec sujet et corps encodés. */
export function lienRetour(adresse: string, sujet: string, corps: string): string {
  return `mailto:${adresse}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`;
}

/** Appareil et navigateur en clair pour le message, d'après le user agent. */
export function decrireAppareil(userAgent: string, pointsTactiles = 0): string {
  const ua = userAgent;
  const appareil = /iPhone/.test(ua)
    ? 'iPhone'
    : /iPad/.test(ua) || (/Macintosh/.test(ua) && pointsTactiles > 1)
      ? 'iPad'
      : /Android/.test(ua)
        ? 'Android'
        : /Windows/.test(ua)
          ? 'Windows'
          : /Macintosh/.test(ua)
            ? 'Mac'
            : /Linux/.test(ua)
              ? 'Linux'
              : 'Autre';
  const navigateur = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Chrome\//.test(ua) || /CriOS\//.test(ua)
          ? 'Chrome'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'navigateur inconnu';
  return `${appareil} · ${navigateur}`;
}
