import { useState } from 'react';
import { creerStorageParDefaut } from './data/storage';
import { PreferencesContextProvider } from './ui/contexts/PreferencesContext';
import { StorageContextProvider } from './ui/contexts/StorageContext';
import { Accueil } from './ui/screens/Accueil';
import { Reglages } from './ui/screens/Reglages';

/** Écrans du lot 1 ; fiche et édition arrivent à l'étape 6. Navigation par état, sans routeur. */
type Ecran = { nom: 'accueil' } | { nom: 'reglages' };

/**
 * Racine de l'application : fournit le stockage (§5.6) et les préférences
 * (§3.5), puis affiche l'écran courant.
 */
export default function App() {
  const [storage] = useState(() => creerStorageParDefaut());
  return (
    <StorageContextProvider storage={storage}>
      <PreferencesContextProvider>
        <Navigation />
      </PreferencesContextProvider>
    </StorageContextProvider>
  );
}

function Navigation() {
  const [ecran, setEcran] = useState<Ecran>({ nom: 'accueil' });
  return (
    <main className="app">
      {ecran.nom === 'accueil' ? (
        <Accueil onOuvrirReglages={() => setEcran({ nom: 'reglages' })} />
      ) : (
        <Reglages onRetour={() => setEcran({ nom: 'accueil' })} />
      )}
    </main>
  );
}
