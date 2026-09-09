import styles from './Chips.module.css';

export interface OptionChip<V extends string | number> {
  valeur: V;
  libelle: string;
  /** pastille colorée (moyens de paiement) */
  couleur?: string;
}

interface Props<V extends string | number> {
  nom: string;
  options: readonly OptionChip<V>[];
  valeur: V;
  onChange: (valeur: V) => void;
}

/** Groupe de chips à choix unique (catégorie, périodicité, canal…), reprenant la maquette. */
export function Chips<V extends string | number>({ nom, options, valeur, onChange }: Props<V>) {
  return (
    <div className={styles.groupe} role="radiogroup" aria-label={nom}>
      {options.map((o) => {
        const actif = o.valeur === valeur;
        return (
          <button
            key={String(o.valeur)}
            type="button"
            role="radio"
            aria-checked={actif}
            className={actif ? styles.actif : styles.chip}
            onClick={() => onChange(o.valeur)}
          >
            {o.couleur ? (
              <span className={styles.pastille} style={{ background: o.couleur }} />
            ) : null}
            {o.libelle}
          </button>
        );
      })}
    </div>
  );
}
