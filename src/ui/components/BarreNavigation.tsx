import { useI18n } from '../contexts/I18nContext';
import { Icone, type NomIcone } from './Icone';
import styles from './BarreNavigation.module.css';

/** Onglets livrés ; Finances rejoint la barre au lot 4 (aucune entrée factice). */
export type Onglet = 'accueil' | 'echeancier' | 'reglages';

interface Props {
  actif: Onglet;
  onAller: (onglet: Onglet) => void;
  onAjouter: () => void;
}

const ONGLETS: { nom: Onglet; icone: NomIcone }[] = [
  { nom: 'accueil', icone: 'navAccueil' },
  { nom: 'echeancier', icone: 'navEcheancier' },
  { nom: 'reglages', icone: 'navReglages' },
];

/**
 * Navigation basse, à l'identique de la maquette : onglets de 60 px à icône
 * de 22 px et libellé de 10,5 px, bouton « + » central de 50 px. Le « + » est
 * inséré au milieu des onglets.
 */
export function BarreNavigation({ actif, onAller, onAjouter }: Props) {
  const { t } = useI18n();
  const milieu = Math.ceil(ONGLETS.length / 2);
  const onglet = ({ nom, icone }: (typeof ONGLETS)[number]) => (
    <button
      key={nom}
      type="button"
      className={actif === nom ? styles.ongletActif : styles.onglet}
      onClick={() => onAller(nom)}
      aria-current={actif === nom ? 'page' : undefined}
    >
      <Icone nom={icone} taille={22} epaisseur={2.4} />
      {t(`nav.${nom}`)}
    </button>
  );
  return (
    <nav className={styles.barre} aria-label={t('nav.principale')}>
      {ONGLETS.slice(0, milieu).map(onglet)}
      <button
        type="button"
        className={styles.ajouter}
        onClick={onAjouter}
        aria-label={t('nav.ajouter')}
      >
        <Icone nom="plus" taille={24} epaisseur={2.4} />
      </button>
      {ONGLETS.slice(milieu).map(onglet)}
    </nav>
  );
}
