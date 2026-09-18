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

/** « 17_5 » ou « 17.5.1 » → « 17.5 » (majeure et mineure, sans le correctif). */
function courte(version: string): string {
  const [majeure, mineure] = version.replace(/_/g, '.').split('.');
  return mineure === undefined ? majeure! : `${majeure}.${mineure}`;
}

/**
 * Appareil, système et navigateur en clair pour le message, d'après le user
 * agent (v1.0.26). La version du système n'est donnée que lorsqu'elle est
 * fiable : iPhone et iPad anciens (« iOS 17.5 »), Android (« Android 14 »).
 * Un Mac ou un iPad récent annoncent une version figée depuis des années,
 * Windows 11 se présente comme Windows 10 : rien n'est inventé dans ces cas.
 */
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

  const ios = /(?:iPhone|CPU) OS (\d+(?:_\d+)*)/.exec(ua);
  const android = /Android (\d+(?:\.\d+)*)/.exec(ua);
  const systeme =
    (appareil === 'iPhone' || appareil === 'iPad') && ios
      ? `iOS ${courte(ios[1]!)}`
      : appareil === 'Android' && android
        ? `Android ${courte(android[1]!)}`
        : null;

  const navigateurs: [string, RegExp][] = [
    ['Edge', /Edg(?:iOS|A)?\/(\d+(?:\.\d+)*)/],
    ['Opera', /OPR\/(\d+(?:\.\d+)*)/],
    ['Firefox', /(?:Firefox|FxiOS)\/(\d+(?:\.\d+)*)/],
    ['Chrome', /(?:Chrome|CriOS)\/(\d+(?:\.\d+)*)/],
    ['Safari', /Version\/(\d+(?:\.\d+)*)[^)]*Safari\//],
  ];
  let navigateur = 'navigateur inconnu';
  for (const [nom, motif] of navigateurs) {
    const m = motif.exec(ua);
    if (m) {
      navigateur = `${nom} ${courte(m[1]!)}`;
      break;
    }
  }
  if (navigateur === 'navigateur inconnu' && /Safari\//.test(ua)) navigateur = 'Safari';

  return [appareil, systeme, navigateur].filter((x) => x !== null).join(' · ');
}
