import { useEffect, useRef } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { useToast } from '../contexts/ToastContext';

/**
 * Service worker (§5.2, EF-51) : enregistré en production seulement, via le
 * module virtuel de vite-plugin-pwa chargé à la demande (rien en développement
 * ni dans les tests). Toast quand l'app est prête hors ligne, toast avec
 * action « Recharger » quand une nouvelle version attend.
 */
export function MiseAJourApp() {
  const { t } = useI18n();
  const toast = useToast();
  const contexte = useRef({ t, toast });

  useEffect(() => {
    contexte.current = { t, toast };
  });

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    let annule = false;
    void import('virtual:pwa-register').then(({ registerSW }) => {
      if (annule) return;
      const mettreAJour = registerSW({
        onOfflineReady() {
          contexte.current.toast.afficher(contexte.current.t('toast.horsLignePrete'));
        },
        onNeedRefresh() {
          contexte.current.toast.afficherAvecAction(contexte.current.t('toast.majDisponible'), {
            libelle: contexte.current.t('toast.majRecharger'),
            executer: () => mettreAJour(true),
          });
        },
      });
    });
    return () => {
      annule = true;
    };
  }, []);

  return null;
}
