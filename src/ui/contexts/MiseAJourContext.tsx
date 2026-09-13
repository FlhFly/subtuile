import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useI18n } from './I18nContext';
import { useToast } from './ToastContext';

interface ContexteMiseAJour {
  /** une nouvelle version attend d'être appliquée (service worker en attente) */
  disponible: boolean;
  /** applique la version en attente et recharge la page */
  appliquer: () => Promise<void>;
}

const RIEN: ContexteMiseAJour = { disponible: false, appliquer: async () => undefined };
const MiseAJourContext = createContext<ContexteMiseAJour>(RIEN);

/**
 * Service worker (§5.2, EF-51) : enregistré en production seulement, via le
 * module virtuel de vite-plugin-pwa chargé à la demande (rien en développement
 * ni dans les tests). Toast quand l'app est prête hors ligne ; quand une
 * nouvelle version attend, toast avec « Recharger » et rangée « Mise à jour
 * disponible » dans Réglages › À propos (`useMiseAJour`), pour ne pas dépendre
 * d'un toast de quelques secondes.
 */
export function MiseAJourProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const toast = useToast();
  const contexte = useRef({ t, toast });
  const [attente, setAttente] = useState<(() => Promise<void>) | null>(null);

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
          const appliquer = () => mettreAJour(true);
          setAttente(() => appliquer);
          contexte.current.toast.afficherAvecAction(contexte.current.t('toast.majDisponible'), {
            libelle: contexte.current.t('toast.majRecharger'),
            executer: appliquer,
          });
        },
      });
    });
    return () => {
      annule = true;
    };
  }, []);

  const valeur = useMemo<ContexteMiseAJour>(
    () => (attente ? { disponible: true, appliquer: attente } : RIEN),
    [attente],
  );
  return <MiseAJourContext.Provider value={valeur}>{children}</MiseAJourContext.Provider>;
}

export function useMiseAJour(): ContexteMiseAJour {
  return useContext(MiseAJourContext);
}
