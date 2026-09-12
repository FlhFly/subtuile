import { useEffect, useState } from 'react';
import { estAutonome, plateformeInstallation, type EtatInstallation } from '../../pwa/installation';

/** Événement Chromium `beforeinstallprompt`, absent des types DOM standard. */
interface EvenementInvitationInstallation extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface Installation {
  etat: EtatInstallation;
  /** vrai quand le navigateur a fourni une invite d'installation native */
  installable: boolean;
  installer: () => Promise<void>;
}

/**
 * Installation de la PWA (§5.2) : capture l'invite native quand le navigateur
 * la propose, suit l'installation effective (`appinstalled`).
 */
export function useInstallation(): Installation {
  const [invite, setInvite] = useState<EvenementInvitationInstallation | null>(null);
  const [etat, setEtat] = useState<EtatInstallation>(() =>
    plateformeInstallation(
      window.navigator.userAgent,
      estAutonome(window),
      window.navigator.maxTouchPoints,
    ),
  );

  useEffect(() => {
    const capturer = (e: Event) => {
      e.preventDefault();
      setInvite(e as EvenementInvitationInstallation);
    };
    const installee = () => {
      setInvite(null);
      setEtat('installee');
    };
    window.addEventListener('beforeinstallprompt', capturer);
    window.addEventListener('appinstalled', installee);
    return () => {
      window.removeEventListener('beforeinstallprompt', capturer);
      window.removeEventListener('appinstalled', installee);
    };
  }, []);

  const installer = async () => {
    if (!invite) return;
    await invite.prompt();
    const { outcome } = await invite.userChoice;
    if (outcome === 'accepted') setInvite(null);
  };

  return { etat, installable: invite !== null, installer };
}
