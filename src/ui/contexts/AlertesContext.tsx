import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { ecrireAlertesLues, lireAlertesLues } from '../../data/alertesLues';
import {
  calculerAlertes,
  clesApresMarquage,
  nombreNonLues,
  type Alerte,
} from '../../domain/alertes';
import { aujourdhui } from '../../domain/dates';
import type { DateISO } from '../../domain/types';
import { useAbonnements } from '../hooks/useAbonnements';
import { useMoyensPaiement } from '../hooks/useMoyensPaiement';
import { usePreferences } from './PreferencesContext';

interface ContexteAlertes {
  alertes: Alerte[];
  nonLues: number;
  jour: DateISO;
  /** « Tout marquer comme lu » (EF-31) */
  marquerToutesLues: () => void;
}

const AlertesContext = createContext<ContexteAlertes | null>(null);

/**
 * Alertes du jour (EF-30, EF-31) : recalculées à partir des abonnements, des
 * moyens de paiement et des défauts d'alerte à chaque changement ; l'état « lu »
 * est lu au démarrage et persisté à chaque marquage.
 */
export function AlertesContextProvider({ children }: { children: ReactNode }) {
  const { abonnements } = useAbonnements();
  const moyensParId = useMoyensPaiement();
  const { preferences } = usePreferences();
  const [lues, setLues] = useState<string[]>(() => lireAlertesLues(localStorage));
  const jour = aujourdhui();

  const moyensPaiement = useMemo(() => [...moyensParId.values()], [moyensParId]);
  const defauts = preferences.alertes;
  const derniereSauvegarde = preferences.derniereSauvegarde;
  const alertes = useMemo(
    () => calculerAlertes({ abonnements, moyensPaiement, defauts, jour, lues, derniereSauvegarde }),
    [abonnements, moyensPaiement, defauts, jour, lues, derniereSauvegarde],
  );

  const marquerToutesLues = useCallback(() => {
    setLues((courantes) => {
      const cles = clesApresMarquage(alertes, courantes, jour);
      ecrireAlertesLues(localStorage, cles);
      return cles;
    });
  }, [alertes, jour]);

  const valeur = useMemo(
    () => ({ alertes, nonLues: nombreNonLues(alertes), jour, marquerToutesLues }),
    [alertes, jour, marquerToutesLues],
  );
  return <AlertesContext.Provider value={valeur}>{children}</AlertesContext.Provider>;
}

export function useAlertes(): ContexteAlertes {
  const ctx = useContext(AlertesContext);
  if (!ctx) throw new Error('useAlertes : AlertesContextProvider absent');
  return ctx;
}
