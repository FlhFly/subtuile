import { useI18n } from '../contexts/I18nContext';
import { Icone } from './Icone';
import styles from './BarreNavigation.module.css';

export type Onglet = 'accueil' | 'reglages';

interface Props {
  actif: Onglet;
  onAller: (onglet: Onglet) => void;
  onAjouter: () => void;
}

/**
 * Navigation basse de la maquette. En V1 seuls les écrans livrés y figurent
 * (échéancier au lot 3, finances au lot 4) — aucune entrée factice.
 */
export function BarreNavigation({ actif, onAller, onAjouter }: Props) {
  const { t } = useI18n();
  return (
    <nav className={styles.barre} aria-label={t('nav.accueil')}>
      <button
        type="button"
        className={actif === 'accueil' ? styles.ongletActif : styles.onglet}
        onClick={() => onAller('accueil')}
        aria-current={actif === 'accueil' ? 'page' : undefined}
      >
        <Icone nom="tuile" taille={22} />
        {t('nav.accueil')}
      </button>
      <button
        type="button"
        className={styles.ajouter}
        onClick={onAjouter}
        aria-label={t('nav.ajouter')}
      >
        <Icone nom="plus" taille={24} />
      </button>
      <button
        type="button"
        className={actif === 'reglages' ? styles.ongletActif : styles.onglet}
        onClick={() => onAller('reglages')}
        aria-current={actif === 'reglages' ? 'page' : undefined}
      >
        <Icone nom="reglages" taille={22} />
        {t('nav.reglages')}
      </button>
    </nav>
  );
}
