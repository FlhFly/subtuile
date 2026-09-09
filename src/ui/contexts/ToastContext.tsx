import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useI18n } from './I18nContext';
import styles from './Toast.module.css';

export interface ActionToast {
  libelle: string;
  executer: () => void | Promise<void>;
}

interface Toast {
  id: number;
  message: string;
  action: ActionToast | null;
}

interface ContexteToast {
  /** retour visuel simple (EF-19), ~3 s */
  afficher: (message: string) => void;
  /** avec action d'annulation (EF-01b), ~6 s */
  afficherAvecAction: (message: string, action: ActionToast) => void;
  fermer: () => void;
}

const DUREE_SIMPLE = 3000;
const DUREE_AVEC_ACTION = 6000;

const ToastContext = createContext<ContexteToast | null>(null);

export function ToastContextProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  const compteur = useRef(0);

  const fermer = useCallback(() => {
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = null;
    setToast(null);
  }, []);

  const montrer = useCallback((message: string, action: ActionToast | null, duree: number) => {
    if (minuteur.current) clearTimeout(minuteur.current);
    compteur.current += 1;
    setToast({ id: compteur.current, message, action });
    minuteur.current = setTimeout(() => setToast(null), duree);
  }, []);

  const valeur = useMemo<ContexteToast>(
    () => ({
      afficher: (message) => montrer(message, null, DUREE_SIMPLE),
      afficherAvecAction: (message, action) => montrer(message, action, DUREE_AVEC_ACTION),
      fermer,
    }),
    [montrer, fermer],
  );

  useEffect(
    () => () => {
      if (minuteur.current) clearTimeout(minuteur.current);
    },
    [],
  );

  return (
    <ToastContext.Provider value={valeur}>
      {children}
      {toast ? <ToastVue toast={toast} onFermer={fermer} /> : null}
    </ToastContext.Provider>
  );
}

function ToastVue({ toast, onFermer }: { toast: Toast; onFermer: () => void }) {
  const { t } = useI18n();
  return (
    <div className={styles.zone} role="status" aria-live="polite">
      <div className={styles.toast} key={toast.id}>
        <span className={styles.message}>{toast.message}</span>
        {toast.action ? (
          <button
            type="button"
            className={styles.action}
            onClick={() => {
              void toast.action?.executer();
              onFermer();
            }}
          >
            {toast.action.libelle}
          </button>
        ) : null}
        <button
          type="button"
          className={styles.fermer}
          onClick={onFermer}
          aria-label={t('commun.fermer')}
        >
          ×
        </button>
      </div>
    </div>
  );
}

export function useToast(): ContexteToast {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast : ToastContextProvider absent');
  return ctx;
}
