import { useRef, useState } from 'react';
import { estDateISO } from '../../domain/dates';
import { formaterDateSaisie, parserDateSaisie } from '../../i18n';
import { useI18n } from '../contexts/I18nContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { Champ } from './Champ';
import { Icone } from './Icone';
import styles from './ChampDate.module.css';

interface Props {
  libelle: string;
  erreur?: string | undefined;
  aide?: string | undefined;
  /** date ISO, ou texte en cours de saisie (invalide tant qu'il ne se lit pas) */
  valeur: string;
  onChange: (valeur: string) => void;
  autoFocus?: boolean;
}

/**
 * Champ de date saisi dans le format choisi dans les réglages (JJ/MM/AAAA,
 * MM/JJ/AAAA ou AAAA-MM-JJ), avec un bouton calendrier qui ouvre le sélecteur
 * natif (`showPicker`). La valeur transmise est ISO dès que la saisie se lit,
 * sinon le texte brut, que la validation refusera (« Date invalide »).
 */
export function ChampDate({ libelle, erreur, aide, valeur, onChange, autoFocus }: Props) {
  const { t } = useI18n();
  const { preferences } = usePreferences();
  const format = preferences.formatDate;
  const natif = useRef<HTMLInputElement>(null);
  const afficher = (v: string) => (estDateISO(v) ? formaterDateSaisie(v, format) : v);

  const [texte, setTexte] = useState(() => afficher(valeur));
  const [precedent, setPrecedent] = useState({ valeur, format });
  if (precedent.valeur !== valeur || precedent.format !== format) {
    // valeur changée de l'extérieur (calendrier, pré-remplissage, format) : resynchroniser
    setPrecedent({ valeur, format });
    if (parserDateSaisie(texte, format) !== valeur) setTexte(afficher(valeur));
  }

  const saisir = (brut: string) => {
    setTexte(brut);
    onChange(parserDateSaisie(brut, format) ?? brut);
  };
  /**
   * Sur ordinateur, seul `showPicker` ouvre le calendrier natif ; à défaut, focus puis clic
   * sur le sélecteur. Sur écran tactile, le sélecteur reçoit le toucher lui-même (CSS).
   */
  const ouvrirCalendrier = () => {
    const el = natif.current;
    if (!el) return;
    try {
      if (typeof el.showPicker === 'function') el.showPicker();
      else {
        el.focus();
        el.click();
      }
    } catch {
      el.focus();
      el.click();
    }
  };
  const motif = t(`formatDate.${format}`);

  return (
    <Champ libelle={libelle} erreur={erreur} aide={aide}>
      {(a) => (
        <div className={styles.groupe}>
          <input
            {...a}
            type="text"
            inputMode="numeric"
            value={texte}
            onChange={(e) => saisir(e.target.value)}
            placeholder={motif}
            autoComplete="off"
            autoFocus={autoFocus}
          />
          <span className={styles.calendrier}>
            <button
              type="button"
              className={styles.bouton}
              onClick={ouvrirCalendrier}
              aria-label={t('champDate.calendrier')}
            >
              <Icone nom="calendrier" taille={18} />
            </button>
            <input
              ref={natif}
              type="date"
              className={styles.natif}
              value={estDateISO(valeur) ? valeur : ''}
              onChange={(e) => {
                if (e.target.value) onChange(e.target.value);
              }}
              tabIndex={-1}
              aria-hidden="true"
            />
          </span>
        </div>
      )}
    </Champ>
  );
}
