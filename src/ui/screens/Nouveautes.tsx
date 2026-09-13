import { useEffect } from 'react';
import { NOTES_DE_VERSION } from '../../data/notesDeVersion';
import { EnTete } from '../components/EnTete';
import { useI18n } from '../contexts/I18nContext';
import { usePreferences } from '../contexts/PreferencesContext';
import styles from './Nouveautes.module.css';

const VERSION_APP = __APP_VERSION__;

interface Props {
  onRetour: () => void;
}

/**
 * Nouveautés (§7.9) : notes de version dans la langue de l'interface, de la
 * plus récente à la plus ancienne. Ouvrir l'écran marque la version installée
 * comme consultée (pastille « Nouveau » et rappel à l'ouverture éteints).
 */
export function Nouveautes({ onRetour }: Props) {
  const { t, langue, date } = useI18n();
  const { preferences, modifier } = usePreferences();

  useEffect(() => {
    if (preferences.versionVue !== VERSION_APP) modifier({ versionVue: VERSION_APP });
  }, [preferences.versionVue, modifier]);

  return (
    <div className={styles.ecran}>
      <EnTete
        titre={t('nouveautes.titre')}
        retour={{ icone: 'retour', libelle: t('nav.retour'), onClick: onRetour }}
      />
      <p className={styles.intro}>{t('nouveautes.sous')}</p>
      <ul className={styles.versions}>
        {NOTES_DE_VERSION.map((n) => (
          <li key={n.version} className={styles.version}>
            <div className={styles.versionEntete}>
              <span className={styles.numero}>
                {t('nouveautes.version', { version: n.version })}
              </span>
              {n.version === VERSION_APP ? (
                <span className={styles.actuelle}>{t('nouveautes.actuelle')}</span>
              ) : null}
              <span className={styles.date}>{date(n.date, 'long')}</span>
            </div>
            <ul className={styles.notes}>
              {n.notes[langue].map((texte) => (
                <li key={texte} className={styles.note}>
                  {texte}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
