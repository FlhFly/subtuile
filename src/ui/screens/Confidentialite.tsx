import { CONFIDENTIALITE_MAJ, sectionsConfidentialite } from '../../data/confidentialite';
import { EnTete } from '../components/EnTete';
import { useI18n } from '../contexts/I18nContext';
import styles from './Confidentialite.module.css';

interface Props {
  onRetour: () => void;
}

/**
 * Confidentialité et mentions légales (§7, revue RGPD) : page dédiée ouverte
 * depuis Réglages, dans la langue de l'interface. Texte tenu dans
 * src/data/confidentialite.ts, miroir de PRIVACY.md.
 */
export function Confidentialite({ onRetour }: Props) {
  const { t, langue, date } = useI18n();
  return (
    <div className={styles.ecran}>
      <EnTete
        titre={t('confidentialite.titre')}
        retour={{ icone: 'retour', libelle: t('nav.retour'), onClick: onRetour }}
      />
      <p className={styles.intro}>{t('confidentialite.sous')}</p>
      <ul className={styles.sections}>
        {sectionsConfidentialite(langue).map((s) => (
          <li key={s.titre} className={styles.section}>
            <h2 className={styles.titre}>{s.titre}</h2>
            {s.paragraphes.map((p) => (
              <p key={p} className={styles.paragraphe}>
                {p}
              </p>
            ))}
            {s.liens?.map((l) => (
              <a key={l.url} className={styles.lien} href={l.url} target="_blank" rel="noreferrer">
                {l.libelle} ↗
              </a>
            ))}
          </li>
        ))}
      </ul>
      <p className={styles.maj}>
        {t('confidentialite.maj', { date: date(CONFIDENTIALITE_MAJ, 'long') })}
      </p>
    </div>
  );
}
