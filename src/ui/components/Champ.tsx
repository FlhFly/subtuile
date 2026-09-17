import { useId, type ReactNode } from 'react';
import styles from './Champ.module.css';

interface Props {
  libelle: string;
  /** message d'erreur traduit ; absent = champ valide */
  erreur?: string | undefined;
  /** mise en garde traduite, non bloquante (ex. texte ressemblant à un numéro de carte) */
  avertissement?: string | undefined;
  aide?: string | undefined;
  /** le contrôle reçoit `id` et `aria-describedby` via la fonction de rendu */
  children: (attrs: {
    id: string;
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
  }) => ReactNode;
}

/** Libellé + contrôle + aide / erreur, avec le câblage d'accessibilité. */
export function Champ({ libelle, erreur, avertissement, aide, children }: Props) {
  const id = useId();
  const idMessage = `${id}-message`;
  const message = erreur ?? avertissement ?? aide;
  const classeMessage = erreur ? styles.erreur : avertissement ? styles.avertissement : styles.aide;
  return (
    <div className={erreur ? styles.champErreur : styles.champ}>
      <label className={styles.libelle} htmlFor={id}>
        {libelle}
      </label>
      {children({
        id,
        'aria-invalid': Boolean(erreur),
        'aria-describedby': message ? idMessage : undefined,
      })}
      {message ? (
        <p id={idMessage} className={classeMessage}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
