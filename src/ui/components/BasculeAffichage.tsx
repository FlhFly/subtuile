import { MODES_AFFICHAGE, type ModeAffichage } from '../../domain/types';
import { useI18n } from '../contexts/I18nContext';
import { Icone } from './Icone';
import styles from './BasculeAffichage.module.css';

interface Props {
  valeur: ModeAffichage;
  onChange: (mode: ModeAffichage) => void;
}

const ICONES = { grille: 'tuile', liste: 'liste' } as const;

/** Bascule grille / liste de l'accueil (EF-12b), persistée dans les préférences. */
export function BasculeAffichage({ valeur, onChange }: Props) {
  const { t } = useI18n();
  return (
    <div className={styles.bascule} role="radiogroup" aria-label={t('affichage.grille')}>
      {MODES_AFFICHAGE.map((mode) => (
        <button
          key={mode}
          type="button"
          role="radio"
          aria-checked={valeur === mode}
          aria-label={t(`affichage.${mode}`)}
          className={valeur === mode ? styles.actif : styles.option}
          onClick={() => onChange(mode)}
        >
          <Icone nom={ICONES[mode]} taille={14} />
        </button>
      ))}
    </div>
  );
}
