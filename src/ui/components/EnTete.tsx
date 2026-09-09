import type { ReactNode } from 'react';
import { Icone, type NomIcone } from './Icone';
import styles from './EnTete.module.css';

interface Action {
  icone: NomIcone;
  libelle: string;
  onClick: () => void;
}

interface Props {
  titre: ReactNode;
  sousTitre?: ReactNode;
  /** bouton à gauche (retour) */
  retour?: Action;
  /** boutons à droite */
  actions?: Action[];
}

/** En-tête d'écran : titre, sous-titre optionnel, actions iconographiques. */
export function EnTete({ titre, sousTitre, retour, actions = [] }: Props) {
  return (
    <header className={styles.entete}>
      {retour ? (
        <button
          type="button"
          className={styles.bouton}
          onClick={retour.onClick}
          aria-label={retour.libelle}
        >
          <Icone nom={retour.icone} />
        </button>
      ) : null}
      <div className={styles.titres}>
        <h1 className={styles.titre}>{titre}</h1>
        {sousTitre ? <p className={styles.sousTitre}>{sousTitre}</p> : null}
      </div>
      <div className={styles.actions}>
        {actions.map((a) => (
          <button
            key={a.libelle}
            type="button"
            className={styles.bouton}
            onClick={a.onClick}
            aria-label={a.libelle}
          >
            <Icone nom={a.icone} />
          </button>
        ))}
      </div>
    </header>
  );
}
