import { useEffect, useRef, useState } from 'react';
import { chargerJeuDemo } from './data/fixtures/demo';
import { nouveautesNonVues } from './data/notesDeVersion';
import { purgerSuppressions } from './data/services/maintenance';
import { creerStorageParDefaut } from './data/storage';
import { BarreNavigation, type Onglet } from './ui/components/BarreNavigation';
import { AlertesContextProvider } from './ui/contexts/AlertesContext';
import { useI18n } from './ui/contexts/I18nContext';
import { MiseAJourProvider } from './ui/contexts/MiseAJourContext';
import { PreferencesContextProvider, usePreferences } from './ui/contexts/PreferencesContext';
import { StorageContextProvider, useStorage } from './ui/contexts/StorageContext';
import { ToastContextProvider, useToast } from './ui/contexts/ToastContext';
import { useAbonnements } from './ui/hooks/useAbonnements';
import { useCatalogue } from './ui/hooks/useCatalogue';
import { Accueil } from './ui/screens/Accueil';
import { Alertes } from './ui/screens/Alertes';
import { Catalogue } from './ui/screens/Catalogue';
import { Echeancier } from './ui/screens/Echeancier';
import { Edition } from './ui/screens/Edition';
import { Fiche } from './ui/screens/Fiche';
import { Finances } from './ui/screens/Finances';
import { Import } from './ui/screens/Import';
import { MoyensPaiement } from './ui/screens/MoyensPaiement';
import { Nouveautes } from './ui/screens/Nouveautes';
import { Onboarding } from './ui/screens/Onboarding';
import { Reglages } from './ui/screens/Reglages';

/** Écrans livrés ; navigation par état, sans routeur. */
type Ecran =
  | { nom: 'accueil' }
  | { nom: 'echeancier' }
  | { nom: 'finances' }
  | { nom: 'reglages' }
  | { nom: 'alertes' }
  | { nom: 'paiements'; retour?: Ecran }
  | { nom: 'catalogue' }
  | { nom: 'import'; retour?: Ecran }
  | { nom: 'nouveautes'; retour?: Ecran }
  | { nom: 'fiche'; id: string; retour?: Ecran }
  | {
      nom: 'edition';
      /** abonnement modifié ; null = création */
      id: string | null;
      retour: Ecran;
      serviceId?: string;
      /** création par duplication (EF-07) */
      copieDe?: string;
    };

const ONGLETS: readonly Onglet[] = ['accueil', 'echeancier', 'finances', 'reglages'];
const VERSION_APP = __APP_VERSION__;

/**
 * Racine de l'application : fournit le stockage (§5.6), les préférences
 * (§3.5), les toasts (EF-19) et les alertes (EF-31), enregistre le service
 * worker (§5.2), puis affiche l'écran courant.
 */
export default function App() {
  const [storage] = useState(() => creerStorageParDefaut());
  return (
    <StorageContextProvider storage={storage}>
      <PreferencesContextProvider>
        <ToastContextProvider>
          <MiseAJourProvider>
            <AlertesContextProvider>
              <Navigation />
            </AlertesContextProvider>
          </MiseAJourProvider>
        </ToastContextProvider>
      </PreferencesContextProvider>
    </StorageContextProvider>
  );
}

function Navigation() {
  const [ecran, setEcran] = useState<Ecran>({ nom: 'accueil' });
  const { abonnements } = useAbonnements();
  const { parId: services } = useCatalogue();
  const { preferences, modifier } = usePreferences();
  const storage = useStorage();
  const toast = useToast();
  const { t } = useI18n();

  /* Chaque écran s'ouvre en haut de page (navigation par état, sans routeur). */
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [ecran]);

  /* Suppressions logiques de plus de 30 jours détruites à l'ouverture (§3.5, revue RGPD) */
  useEffect(() => {
    purgerSuppressions(storage).catch(() => undefined);
  }, [storage]);

  /* Après une mise à jour, rappel des nouveautés (une fois par ouverture) ; rien à la première ouverture */
  const rappelFait = useRef(false);
  useEffect(() => {
    if (rappelFait.current) return;
    rappelFait.current = true;
    if (preferences.versionVue !== null && nouveautesNonVues(preferences.versionVue, VERSION_APP)) {
      toast.afficherAvecAction(t('toast.nouveautes', { version: VERSION_APP }), {
        libelle: t('toast.nouveautes.voir'),
        executer: () => setEcran({ nom: 'nouveautes', retour: { nom: 'accueil' } }),
      });
    }
  }, [preferences.versionVue, toast, t]);

  const onglet = (ONGLETS as readonly string[]).includes(ecran.nom)
    ? (ecran.nom as Onglet)
    : 'accueil';
  const avecBarre = (ONGLETS as readonly string[]).includes(ecran.nom);
  const ouvrirFiche = (id: string, retour?: Ecran) => setEcran({ nom: 'fiche', id, retour });

  /* Onboarding (C7) à la première ouverture, ou rejoué depuis les réglages ; il remplace l'écran courant. */
  const terminerOnboarding = () => modifier({ onboardingVu: true });
  if (!preferences.onboardingVu) {
    return (
      <div className="coquille">
        <main className="app">
          <Onboarding
            onTerminer={terminerOnboarding}
            onCatalogue={() => {
              terminerOnboarding();
              setEcran({ nom: 'edition', id: null, retour: { nom: 'accueil' } });
            }}
            onImport={() => {
              terminerOnboarding();
              setEcran({ nom: 'import', retour: { nom: 'accueil' } });
            }}
            onDemo={() => {
              void chargerJeuDemo(storage).then(() => {
                terminerOnboarding();
                setEcran({ nom: 'accueil' });
                toast.afficher(t('reglages.demo.charge'));
              });
            }}
          />
        </main>
      </div>
    );
  }

  let contenu;
  switch (ecran.nom) {
    case 'accueil':
      contenu = (
        <Accueil
          onOuvrirAbonnement={(id) => ouvrirFiche(id)}
          onAjouter={() => setEcran({ nom: 'edition', id: null, retour: { nom: 'accueil' } })}
          onOuvrirAlertes={() => setEcran({ nom: 'alertes' })}
        />
      );
      break;
    case 'echeancier':
      contenu = <Echeancier onOuvrir={(id) => ouvrirFiche(id, { nom: 'echeancier' })} />;
      break;
    case 'finances':
      contenu = (
        <Finances
          onOuvrirPaiements={() => setEcran({ nom: 'paiements', retour: { nom: 'finances' } })}
        />
      );
      break;
    case 'alertes':
      contenu = (
        <Alertes
          onRetour={() => setEcran({ nom: 'accueil' })}
          onOuvrir={(a) =>
            a.type === 'carte'
              ? setEcran({ nom: 'paiements', retour: { nom: 'alertes' } })
              : a.type === 'sauvegarde'
                ? setEcran({ nom: 'reglages' })
                : ouvrirFiche(a.abonnementId, { nom: 'alertes' })
          }
        />
      );
      break;
    case 'reglages':
      contenu = (
        <Reglages
          onOuvrirPaiements={() => setEcran({ nom: 'paiements' })}
          onOuvrirCatalogue={() => setEcran({ nom: 'catalogue' })}
          onOuvrirImport={() => setEcran({ nom: 'import' })}
          onRevoirIntro={() => modifier({ onboardingVu: false })}
          onOuvrirNouveautes={() => setEcran({ nom: 'nouveautes' })}
        />
      );
      break;
    case 'paiements': {
      const retour = ecran.retour ?? { nom: 'reglages' as const };
      contenu = <MoyensPaiement onRetour={() => setEcran(retour)} />;
      break;
    }
    case 'import':
      contenu = (
        <Import
          onRetour={() => setEcran(ecran.retour ?? { nom: 'reglages' })}
          onTermine={() => setEcran({ nom: 'accueil' })}
        />
      );
      break;
    case 'nouveautes':
      contenu = <Nouveautes onRetour={() => setEcran(ecran.retour ?? { nom: 'reglages' })} />;
      break;
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
    case 'fiche': {
      const retour = ecran.retour ?? { nom: 'accueil' as const };
      contenu = (
        <Fiche
          key={ecran.id}
          id={ecran.id}
          onRetour={() => setEcran(retour)}
          onModifier={(id) => setEcran({ nom: 'edition', id, retour: ecran })}
          onDupliquer={(id) => setEcran({ nom: 'edition', id: null, retour: ecran, copieDe: id })}
        />
      );
      break;
    }
    case 'edition': {
      const source = ecran.id ?? ecran.copieDe;
      const charge = source ? abonnements.find((a) => a.id === source) : undefined;
      // en modification ou duplication, attendre que l'abonnement soit chargé avant d'initialiser le formulaire
      contenu =
        source && !charge ? null : (
          <Edition
            key={ecran.id ?? `nouveau-${ecran.serviceId ?? ''}-${ecran.copieDe ?? ''}`}
            existant={ecran.id ? charge : undefined}
            modele={ecran.copieDe ? charge : undefined}
            serviceInitial={ecran.serviceId ? services.get(ecran.serviceId) : undefined}
            onFermer={() => setEcran(ecran.retour)}
            onEnregistre={(id) => ouvrirFiche(id)}
          />
        );
      break;
    }
  }

  return (
    <div className="coquille">
      <main className={avecBarre ? 'app app--barre' : 'app'}>{contenu}</main>
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
