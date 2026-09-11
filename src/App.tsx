import { useState } from 'react';
import { creerStorageParDefaut } from './data/storage';
import { BarreNavigation, type Onglet } from './ui/components/BarreNavigation';
import { AlertesContextProvider } from './ui/contexts/AlertesContext';
import { PreferencesContextProvider } from './ui/contexts/PreferencesContext';
import { StorageContextProvider } from './ui/contexts/StorageContext';
import { ToastContextProvider } from './ui/contexts/ToastContext';
import { useAbonnements } from './ui/hooks/useAbonnements';
import { useCatalogue } from './ui/hooks/useCatalogue';
import { Accueil } from './ui/screens/Accueil';
import { Alertes } from './ui/screens/Alertes';
import { Catalogue } from './ui/screens/Catalogue';
import { Edition } from './ui/screens/Edition';
import { Fiche } from './ui/screens/Fiche';
import { MoyensPaiement } from './ui/screens/MoyensPaiement';
import { Reglages } from './ui/screens/Reglages';

/** Écrans livrés ; navigation par état, sans routeur. */
type Ecran =
  | { nom: 'accueil' }
  | { nom: 'reglages' }
  | { nom: 'alertes' }
  | { nom: 'paiements'; retour?: Ecran }
  | { nom: 'catalogue' }
  | { nom: 'fiche'; id: string }
  | { nom: 'edition'; id: string | null; retour: Ecran; serviceId?: string };

/**
 * Racine de l'application : fournit le stockage (§5.6), les préférences
 * (§3.5), les toasts (EF-19) et les alertes (EF-31), puis affiche l'écran
 * courant.
 */
export default function App() {
  const [storage] = useState(() => creerStorageParDefaut());
  return (
    <StorageContextProvider storage={storage}>
      <PreferencesContextProvider>
        <ToastContextProvider>
          <AlertesContextProvider>
            <Navigation />
          </AlertesContextProvider>
        </ToastContextProvider>
      </PreferencesContextProvider>
    </StorageContextProvider>
  );
}

function Navigation() {
  const [ecran, setEcran] = useState<Ecran>({ nom: 'accueil' });
  const { abonnements } = useAbonnements();
  const { parId: services } = useCatalogue();

  const onglet: Onglet = ecran.nom === 'reglages' ? 'reglages' : 'accueil';
  const avecBarre = ecran.nom === 'accueil' || ecran.nom === 'reglages';

  let contenu;
  switch (ecran.nom) {
    case 'accueil':
      contenu = (
        <Accueil
          onOuvrirAbonnement={(id) => setEcran({ nom: 'fiche', id })}
          onAjouter={() => setEcran({ nom: 'edition', id: null, retour: { nom: 'accueil' } })}
          onOuvrirAlertes={() => setEcran({ nom: 'alertes' })}
        />
      );
      break;
    case 'alertes':
      contenu = (
        <Alertes
          onRetour={() => setEcran({ nom: 'accueil' })}
          onOuvrir={(a) =>
            setEcran(
              a.type === 'carte'
                ? { nom: 'paiements', retour: { nom: 'alertes' } }
                : { nom: 'fiche', id: a.abonnementId },
            )
          }
        />
      );
      break;
    case 'reglages':
      contenu = (
        <Reglages
          onRetour={() => setEcran({ nom: 'accueil' })}
          onOuvrirPaiements={() => setEcran({ nom: 'paiements' })}
          onOuvrirCatalogue={() => setEcran({ nom: 'catalogue' })}
        />
      );
      break;
    case 'paiements': {
      const retour = ecran.retour ?? { nom: 'reglages' as const };
      contenu = <MoyensPaiement onRetour={() => setEcran(retour)} />;
      break;
    }
    case 'catalogue':
      contenu = (
        <Catalogue
          onRetour={() => setEcran({ nom: 'reglages' })}
          onUtiliser={(s) =>
            setEcran({ nom: 'edition', id: null, retour: { nom: 'catalogue' }, serviceId: s.id })
          }
        />
      );
      break;
    case 'fiche':
      contenu = (
        <Fiche
          key={ecran.id}
          id={ecran.id}
          onRetour={() => setEcran({ nom: 'accueil' })}
          onModifier={(id) => setEcran({ nom: 'edition', id, retour: { nom: 'fiche', id } })}
        />
      );
      break;
    case 'edition': {
      const existant = ecran.id ? abonnements.find((a) => a.id === ecran.id) : undefined;
      // en modification, attendre que l'abonnement soit chargé avant d'initialiser le formulaire
      contenu =
        ecran.id && !existant ? null : (
          <Edition
            key={ecran.id ?? `nouveau-${ecran.serviceId ?? ''}`}
            existant={existant}
            serviceInitial={ecran.serviceId ? services.get(ecran.serviceId) : undefined}
            onFermer={() => setEcran(ecran.retour)}
            onEnregistre={(id) => setEcran({ nom: 'fiche', id })}
          />
        );
      break;
    }
  }

  return (
    <div className="coquille">
      <main className="app">{contenu}</main>
      {avecBarre ? (
        <BarreNavigation
          actif={onglet}
          onAller={(o) => setEcran({ nom: o })}
          onAjouter={() => setEcran({ nom: 'edition', id: null, retour: ecran })}
        />
      ) : null}
    </div>
  );
}
