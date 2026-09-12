/**
 * Installation de la PWA (§5.2) : où en est l'appareil, sans effet de bord.
 * - `installee` : l'app tourne en mode autonome (écran d'accueil).
 * - `ios` : Safari iPhone / iPad, pas d'invite d'installation : le chemin est
 *   Partager → « Sur l'écran d'accueil ».
 * - `navigateur` : tout autre navigateur ; l'invite native (`beforeinstallprompt`)
 *   est proposée quand le navigateur la fournit.
 */
export type EtatInstallation = 'installee' | 'ios' | 'navigateur';

export function plateformeInstallation(
  userAgent: string,
  autonome: boolean,
  pointsTactiles = 0,
): EtatInstallation {
  if (autonome) return 'installee';
  const iphone = /iPhone|iPad|iPod/i.test(userAgent);
  /* iPadOS se présente comme un Mac, mais avec un écran tactile */
  const ipad = /Macintosh/.test(userAgent) && pointsTactiles > 1;
  return iphone || ipad ? 'ios' : 'navigateur';
}

/** Mode autonome : media query standard, ou l'indicateur propre à Safari iOS. */
export function estAutonome(fenetre: Window): boolean {
  const safari = fenetre.navigator as Navigator & { standalone?: boolean };
  return fenetre.matchMedia('(display-mode: standalone)').matches || safari.standalone === true;
}
