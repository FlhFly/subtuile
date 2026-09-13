import { useState, type ReactNode } from 'react';
import { SYMBOLES } from '../../domain/devises';
import { DEVISES, FORMATS_DATE, LANGUES, type Devise } from '../../domain/types';
import { Drapeau } from '../components/Drapeau';
import { Icone } from '../components/Icone';
import { useI18n } from '../contexts/I18nContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { useCatalogue } from '../hooks/useCatalogue';
import styles from './Onboarding.module.css';

interface Props {
  /** fin du parcours : « Commencer », « Passer » ou « Plus tard » */
  onTerminer: () => void;
  onCatalogue: () => void;
  onImport: () => void;
  onDemo: () => void;
}

const ETAPES = 3;

/**
 * Onboarding (C7, maquette v6) : trois écrans à la première ouverture —
 * présentation, devise / langue / format de date (préférences écrites au fil
 * des choix), puis premier abonnement (catalogue, import, démo, plus tard).
 * Rejouable depuis Réglages › « Revoir l'introduction ».
 */
export function Onboarding({ onTerminer, onCatalogue, onImport, onDemo }: Props) {
  const { t, langue, changerLangue } = useI18n();
  const { preferences, modifier } = usePreferences();
  const { catalogue } = useCatalogue();
  const [etape, setEtape] = useState(0);
  const derniere = etape === ETAPES - 1;
  const suivant = () => (derniere ? onTerminer() : setEtape((e) => e + 1));
  const libelleDevise = (d: Devise) => (SYMBOLES[d] === d ? d : `${SYMBOLES[d]} ${d}`);

  return (
    <div className={styles.ecran}>
      <div className={styles.haut}>
        <button type="button" className={styles.passer} onClick={onTerminer}>
          {t('onboarding.passer')}
        </button>
      </div>

      {etape === 0 ? (
        <section className={styles.corps}>
          <Logo />
          <h1 className={styles.titreGrand}>{t('onboarding.1.titre')}</h1>
          <p className={styles.sousTitre}>{t('onboarding.1.sous')}</p>
          <ul className={styles.points}>
            <Point icone="calendrier">{t('onboarding.1.b1')}</Point>
            <Point icone="navFinances">{t('onboarding.1.b2')}</Point>
            <Point icone="cloche">{t('onboarding.1.b3')}</Point>
          </ul>
        </section>
      ) : null}

      {etape === 1 ? (
        <section className={styles.corps}>
          <h1 className={styles.titre}>{t('onboarding.2.titre')}</h1>
          <p className={styles.sousTitre}>{t('onboarding.2.sous')}</p>

          <span className={styles.legende}>{t('reglages.devise')}</span>
          <div className={styles.chips} role="radiogroup" aria-label={t('reglages.devise')}>
            {DEVISES.map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={preferences.deviseAffichage === d}
                className={preferences.deviseAffichage === d ? styles.chipActif : styles.chip}
                onClick={() => modifier({ deviseAffichage: d })}
              >
                {libelleDevise(d)}
              </button>
            ))}
          </div>

          <span className={styles.legende}>{t('reglages.langue')}</span>
          <div className={styles.langues}>
            {LANGUES.map((l) => (
              <button
                key={l}
                type="button"
                className={langue === l ? styles.langueActive : styles.langue}
                aria-pressed={langue === l}
                onClick={() => changerLangue(l)}
              >
                <span className={styles.langueGauche}>
                  <Drapeau langue={l} />
                  {t(`langue.${l}`)}
                </span>
                {langue === l ? (
                  <span className={styles.coche}>
                    <Icone nom="coche" taille={12} epaisseur={3} />
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          <span className={styles.legende}>{t('reglages.formatDate')}</span>
          <div className={styles.chips} role="radiogroup" aria-label={t('reglages.formatDate')}>
            {FORMATS_DATE.map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={preferences.formatDate === f}
                className={preferences.formatDate === f ? styles.chipActif : styles.chip}
                onClick={() => modifier({ formatDate: f })}
              >
                {t(`formatDate.${f}`)}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {etape === 2 ? (
        <section className={styles.corps}>
          <h1 className={styles.titre}>{t('onboarding.3.titre')}</h1>
          <p className={styles.sousTitre}>
            {t('onboarding.3.sous', { n: String(catalogue.data.length) })}
          </p>
          <button type="button" className={styles.principal} onClick={onCatalogue}>
            {t('onboarding.3.catalogue')}
          </button>
          <button type="button" className={styles.secondaire} onClick={onImport}>
            {t('onboarding.3.import')}
          </button>
          <button type="button" className={styles.secondaire} onClick={onDemo}>
            {t('onboarding.3.demo')}
          </button>
          <button type="button" className={styles.plusTard} onClick={onTerminer}>
            {t('onboarding.3.plusTard')}
          </button>
        </section>
      ) : null}

      <div className={styles.bas}>
        <div
          className={styles.pastilles}
          role="img"
          aria-label={t('onboarding.etape', { n: String(etape + 1), total: String(ETAPES) })}
        >
          {Array.from({ length: ETAPES }, (_, i) => (
            <span key={i} className={i === etape ? styles.pastilleActive : styles.pastille} />
          ))}
        </div>
        <button type="button" className={styles.cta} onClick={suivant}>
          {t(derniere ? 'onboarding.terminer' : 'onboarding.suivant')}
        </button>
      </div>
    </div>
  );
}

/** Marque de l'app : les quatre tuiles du favicon et des icônes PWA. */
function Logo() {
  return (
    <svg className={styles.logo} viewBox="0 0 100 100" aria-hidden="true">
      <rect width="100" height="100" rx="20" fill="#17130d" />
      <rect x="17" y="17" width="30" height="30" rx="7.2" fill="#f6f2ea" />
      <rect x="53" y="17" width="30" height="30" rx="7.2" fill="#dfd6c3" />
      <rect x="17" y="53" width="30" height="30" rx="7.2" fill="#ece5d8" />
      <rect x="53" y="53" width="30" height="30" rx="7.2" fill="#1e7d3a" />
    </svg>
  );
}

function Point({
  icone,
  children,
}: {
  icone: 'calendrier' | 'navFinances' | 'cloche';
  children: ReactNode;
}) {
  return (
    <li className={styles.point}>
      <span className={styles.pointIcone} aria-hidden="true">
        <Icone nom={icone} taille={17} epaisseur={2.4} />
      </span>
      <span className={styles.pointTexte}>{children}</span>
    </li>
  );
}
