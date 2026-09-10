import { useState } from 'react';
import { creerStorageParDefaut } from './data/storage';
import { BarreNavigation, type Onglet } from './ui/components/BarreNavigation';
import { PreferencesContextProvider } from './ui/contexts/PreferencesContext';
import { StorageContextProvider } from './ui/contexts/StorageContext';
import { ToastContextProvider } from './ui/contexts/ToastContext';
import { useAbonnements } from './ui/hooks/useAbonnements';
import { Accueil } from './ui/screens/Accueil';
import { Edition } from './ui/screens/Edition';
import { Fiche } from './ui/screens/Fiche';
import { MoyensPaiement } from './ui/screens/MoyensPaiement';
import { Reglages } from './ui/screens/Reglages';

/** Écrans du lot 1 ; navigation par état, sans routeur. */
type Ecran =
  | { nom: 'accueil' }
  | { nom: 'reglages' }
  | { nom: 'paiements' }
  | { nom: 'fiche'; id: string }
  | { nom: 'edition'; id: string | null; retour: Ecran };

/**
 * Racine de l'application : fournit le stockage (§5.6), les préférences
 * (§3.5) et les toasts (EF-19), puis affiche l'écran courant.
 */
export default function App() {
  const [storage] = useState(() => creerStorageParDefaut());
  return (
    <StorageContextProvider storage={storage}>
      <PreferencesContextProvider>
        <ToastContextProvider>
          <Navigation />
        </ToastContextProvider>
      </PreferencesContextProvider>
    </StorageContextProvider>
  );
}

function Navigation() {
  const [ecran, setEcran] = useState<Ecran>({ nom: 'accueil' });
  const { abonnements } = useAbonnements();

  const onglet: Onglet = ecran.nom === 'reglages' ? 'reglages' : 'accueil';
  const avecBarre = ecran.nom === 'accueil' || ecran.nom === 'reglages';

  let contenu;
  switch (ecran.nom) {
    case 'accueil':
      contenu = (
        <Accueil
          onOuvrirAbonnement={(id) => setEcran({ nom: 'fiche', id })}
          onAjouter={() => setEcran({ nom: 'edition', id: null, retour: { nom: 'accueil' } })}
        />
      );
      break;
    case 'reglages':
      contenu = (
        <Reglages
          onRetour={() => setEcran({ nom: 'accueil' })}
          onOuvrirPaiements={() => setEcran({ nom: 'paiements' })}
        />
      );
      break;
    case 'paiements':
      contenu = <MoyensPaiement onRetour={() => setEcran({ nom: 'reglages' })} />;
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
            key={ecran.id ?? 'nouveau'}
            existant={existant}
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
