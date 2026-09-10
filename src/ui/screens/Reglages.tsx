import { useState, type ReactNode } from 'react';
import { chargerJeuDemo } from '../../data/fixtures/demo';
import { LANGUES, THEMES, type Langue, type Theme } from '../../domain/types';
import { EnTete } from '../components/EnTete';
import { Icone, type NomIcone } from '../components/Icone';
import { Segmente } from '../components/Segmente';
import { useI18n } from '../contexts/I18nContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { useStorage } from '../contexts/StorageContext';
import { useMoyensPaiement } from '../hooks/useMoyensPaiement';
import styles from './Reglages.module.css';

interface Props {
  onRetour: () => void;
  onOuvrirPaiements: () => void;
}

const VERSION_APP = __APP_VERSION__;
const URL_DEPOT = 'https://github.com/FlhFly/subtuile';

/**
 * Réglages — version minimale du lot 1 (§7.7) : apparence (EF-17), langue
 * (EF-17b), jeu de démo (§5.5), confidentialité, à propos. Défauts d'alerte,
 * export / import et catalogue arrivent aux lots 3 et 4.
 */
export function Reglages({ onRetour, onOuvrirPaiements }: Props) {
  const { t, tn, changerLangue, langue } = useI18n();
  const nombreMoyens = useMoyensPaiement().size;
  const { preferences, modifier } = usePreferences();
  const storage = useStorage();
  const [demoChargee, setDemoChargee] = useState(false);
  const [chargementDemo, setChargementDemo] = useState(false);

  const chargerDemo = async () => {
    setChargementDemo(true);
    try {
      await chargerJeuDemo(storage);
      setDemoChargee(true);
    } finally {
      setChargementDemo(false);
    }
  };

  const optionsTheme = THEMES.map((th) => ({ valeur: th, libelle: t(`theme.${th}`) }));
  const optionsLangue = LANGUES.map((l) => ({ valeur: l, libelle: t(`langue.${l}`) }));

  return (
    <div className={styles.ecran}>
      <EnTete
        titre={t('reglages.titre')}
        retour={{ icone: 'retour', libelle: t('nav.retour'), onClick: onRetour }}
      />

      <Section icone="soleil" titre={t('reglages.apparence')}>
        <Ligne libelle={t('reglages.theme')}>
          <Segmente<Theme>
            nom={t('reglages.theme')}
            options={optionsTheme}
            valeur={preferences.theme}
            onChange={(theme) => modifier({ theme })}
          />
        </Ligne>
      </Section>

      <Section icone="ecran" titre={t('reglages.general')}>
        <Ligne libelle={t('reglages.langue')}>
          <Segmente<Langue>
            nom={t('reglages.langue')}
            options={optionsLangue}
            valeur={langue}
            onChange={changerLangue}
          />
        </Ligne>
      </Section>

      <Section icone="carte" titre={t('paiements.titre')}>
        <div className={styles.bloc}>
          <p className={styles.blocTitre}>{tn('paiements.nombre', nombreMoyens)}</p>
          <p className={styles.blocTexte}>{t('paiements.reglages.texte')}</p>
          <button type="button" className={styles.boutonSecondaire} onClick={onOuvrirPaiements}>
            {t('paiements.titre')}
          </button>
        </div>
      </Section>

      <Section icone="base" titre={t('reglages.donnees')}>
        <div className={styles.bloc}>
          <p className={styles.blocTitre}>{t('reglages.demo.titre')}</p>
          <p className={styles.blocTexte}>{t('reglages.demo.texte')}</p>
          <button
            type="button"
            className={styles.boutonSecondaire}
            onClick={() => void chargerDemo()}
            disabled={chargementDemo}
          >
            {t('reglages.demo.bouton')}
          </button>
          {demoChargee ? (
            <p className={styles.confirmation} role="status">
              {t('reglages.demo.charge')}
            </p>
          ) : null}
        </div>
      </Section>

      <Section icone="cadenas" titre={t('reglages.confidentialite')}>
        <p className={styles.blocTexte}>{t('reglages.confidentialite.texte')}</p>
      </Section>

      <Section icone="info" titre={t('reglages.apropos')}>
        <p className={styles.blocTexte}>{t('reglages.apropos.texte', { version: VERSION_APP })}</p>
        <a className={styles.lien} href={URL_DEPOT} target="_blank" rel="noreferrer">
          {t('reglages.apropos.depot')}
        </a>
      </Section>
    </div>
  );
}

function Section({
  icone,
  titre,
  children,
}: {
  icone: NomIcone;
  titre: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitre}>
        <Icone nom={icone} taille={16} />
        {titre}
      </h2>
      <div className={styles.carte}>{children}</div>
    </section>
  );
}

function Ligne({ libelle, children }: { libelle: string; children: ReactNode }) {
  return (
    <div className={styles.ligne}>
      <span className={styles.ligneLibelle}>{libelle}</span>
      {children}
    </div>
  );
}
