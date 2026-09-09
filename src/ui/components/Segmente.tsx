import styles from './Segmente.module.css';

export interface OptionSegment<V extends string> {
  valeur: V;
  libelle: string;
}

interface Props<V extends string> {
  /** libellé accessible du groupe */
  nom: string;
  options: readonly OptionSegment<V>[];
  valeur: V;
  onChange: (valeur: V) => void;
}

/** Sélecteur segmenté (thème, langue, grille / liste…), navigable au clavier. */
export function Segmente<V extends string>({ nom, options, valeur, onChange }: Props<V>) {
  return (
    <div className={styles.groupe} role="radiogroup" aria-label={nom}>
      {options.map((o) => {
        const actif = o.valeur === valeur;
        return (
          <button
            key={o.valeur}
            type="button"
            role="radio"
            aria-checked={actif}
            className={actif ? styles.actif : styles.option}
            onClick={() => onChange(o.valeur)}
          >
            {o.libelle}
          </button>
        );
      })}
    </div>
  );
}
