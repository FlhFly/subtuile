import type { Langue } from '../../domain/types';
import styles from './Drapeau.module.css';

/** Drapeaux de la maquette (formes simples, aucun asset externe) : réglages et onboarding. */
export function Drapeau({ langue }: { langue: Langue }) {
  return (
    <span className={styles.drapeau} aria-hidden="true">
      {langue === 'fr' ? (
        <svg width="30" height="30" viewBox="0 0 30 30">
          <rect width="10" height="30" fill="#26429c" />
          <rect x="10" width="10" height="30" fill="#fdfaf3" />
          <rect x="20" width="10" height="30" fill="#c8102e" />
        </svg>
      ) : (
        <svg width="30" height="30" viewBox="0 0 30 30">
          <rect width="30" height="30" fill="#012169" />
          <path d="M0 0 30 30M30 0 0 30" stroke="#fdfaf3" strokeWidth="6" />
          <path d="M0 0 30 30M30 0 0 30" stroke="#c8102e" strokeWidth="2.4" />
          <path d="M15 0v30M0 15h30" stroke="#fdfaf3" strokeWidth="10" />
          <path d="M15 0v30M0 15h30" stroke="#c8102e" strokeWidth="5.4" />
        </svg>
      )}
    </span>
  );
}
