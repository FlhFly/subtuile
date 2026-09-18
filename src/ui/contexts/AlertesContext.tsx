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
import { totaux } from '../../domain/finances';
import { budgetConverti } from '../../domain/pilotage';
import { useConversion } from '../hooks/useConversion';
import { useParametres } from '../hooks/useParametres';
import { usePreferences } from './PreferencesContext';

interface ContexteAlertes {
  alertes: Alerte[];
  nonLues: number;
  jour: DateISO;
  /** « Tout marquer comme lu » (EF-31) */
  marquerToutesLues: () => void;
  /** une alerte ouverte est lue (EF-31, v1.30) */
  marquerLue: (alerte: Alerte) => void;
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
  /* EF-70 : total mensuel et plafond dans la devise d'affichage */
  const { devise, convertir } = useConversion();
  const { parametres } = useParametres();
  const budget = useMemo(() => {
    const plafond = budgetConverti(parametres, convertir);
    if (plafond === null) return null;
    return { total: totaux(abonnements, jour, convertir).mensuel, budget: plafond, devise };
  }, [parametres, convertir, abonnements, jour, devise]);
  const alertes = useMemo(
    () =>
      calculerAlertes({
        abonnements,
        moyensPaiement,
        defauts,
        jour,
        lues,
        derniereSauvegarde,
        budget,
      }),
    [abonnements, moyensPaiement, defauts, jour, lues, derniereSauvegarde, budget],
  );

  const marquerToutesLues = useCallback(() => {
    setLues((courantes) => {
      const cles = clesApresMarquage(alertes, courantes, jour);
      ecrireAlertesLues(localStorage, cles);
      return cles;
    });
  }, [alertes, jour]);

  const marquerLue = useCallback(
    (alerte: Alerte) => {
      if (alerte.lue) return;
      setLues((courantes) => {
        const cles = clesApresMarquage([alerte], courantes, jour);
        ecrireAlertesLues(localStorage, cles);
        return cles;
      });
    },
    [jour],
  );

  const valeur = useMemo(
    () => ({ alertes, nonLues: nombreNonLues(alertes), jour, marquerToutesLues, marquerLue }),
    [alertes, jour, marquerToutesLues, marquerLue],
  );
  return <AlertesContext.Provider value={valeur}>{children}</AlertesContext.Provider>;
}

export function useAlertes(): ContexteAlertes {
  const ctx = useContext(AlertesContext);
  if (!ctx) throw new Error('useAlertes : AlertesContextProvider absent');
  return ctx;
}
