import styles from './Interrupteur.module.css';

interface Props {
  libelle: string;
  sousLibelle?: string | undefined;
  actif: boolean;
  onChange: (actif: boolean) => void;
}

/** Interrupteur (options avancées du formulaire), bouton `switch` accessible. */
export function Interrupteur({ libelle, sousLibelle, actif, onChange }: Props) {
  return (
    <div className={styles.ligne}>
      <span className={styles.textes}>
        <span className={styles.libelle}>{libelle}</span>
        {sousLibelle ? <span className={styles.sous}>{sousLibelle}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={actif}
        aria-label={libelle}
        className={actif ? styles.actif : styles.inactif}
        onClick={() => onChange(!actif)}
      >
        <span className={styles.curseur} />
      </button>
    </div>
  );
}
