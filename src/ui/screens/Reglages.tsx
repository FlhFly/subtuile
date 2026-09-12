import { useState, type ReactNode } from 'react';
import { chargerJeuDemo } from '../../data/fixtures/demo';
import {
  FORMATS_DATE,
  LANGUES,
  THEMES,
  type DefautsAlerte,
  type FormatDate,
  type Langue,
  type Theme,
} from '../../domain/types';
import { EnTete } from '../components/EnTete';
import { Icone, type NomIcone } from '../components/Icone';
import { Segmente } from '../components/Segmente';
import { useI18n } from '../contexts/I18nContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { useStorage } from '../contexts/StorageContext';
import { useCatalogue } from '../hooks/useCatalogue';
import { useMoyensPaiement } from '../hooks/useMoyensPaiement';
import styles from './Reglages.module.css';

interface Props {
  onRetour: () => void;
  onOuvrirPaiements: () => void;
  onOuvrirCatalogue: () => void;
}

const VERSION_APP = __APP_VERSION__;
const URL_DEPOT = 'https://github.com/FlhFly/subtuile';

/** Choix proposés pour les défauts d'alerte (EF-30), en jours puis en mois. */
const CHOIX_ECHEANCE = [1, 2, 3, 7, 14] as const;
const CHOIX_ESSAI = [1, 2, 3, 7] as const;
const CHOIX_PREAVIS = [7, 14, 30] as const;
const CHOIX_CARTE = [1, 2, 3] as const;

/**
 * Réglages (§7.7) : apparence (EF-17), défauts d'alerte (EF-30), langue
 * (EF-17b), moyens de paiement, catalogue, jeu de démo (§5.5),
 * confidentialité, à propos. Export / import arrivent au lot 4.
 */
export function Reglages({ onRetour, onOuvrirPaiements, onOuvrirCatalogue }: Props) {
  const { t, tn, date, changerLangue, langue } = useI18n();
  const nombreMoyens = useMoyensPaiement().size;
  const { catalogue } = useCatalogue();
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
  const optionsFormatDate = FORMATS_DATE.map((f) => ({ valeur: f, libelle: t(`formatDate.${f}`) }));
  const modifierAlertes = (partiel: Partial<DefautsAlerte>) =>
    modifier({ alertes: { ...preferences.alertes, ...partiel } });
  const jours = (n: number) => t('reglages.alertes.jours', { n });
  const mois = (n: number) => t('reglages.alertes.mois', { n });

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

      <Section icone="cloche" titre={t('reglages.alertes')}>
        <Ligne libelle={t('reglages.alertes.renouvellement')}>
          <Selecteur
            libelle={t('reglages.alertes.renouvellement')}
            choix={CHOIX_ECHEANCE}
            valeur={preferences.alertes.echeanceJours}
            format={jours}
            onChange={(echeanceJours) => modifierAlertes({ echeanceJours })}
          />
        </Ligne>
        <Ligne libelle={t('reglages.alertes.essai')}>
          <Selecteur
            libelle={t('reglages.alertes.essai')}
            choix={CHOIX_ESSAI}
            valeur={preferences.alertes.essaiJours}
            format={jours}
            onChange={(essaiJours) => modifierAlertes({ essaiJours })}
          />
        </Ligne>
        <Ligne libelle={t('reglages.alertes.preavis')}>
          <Selecteur
            libelle={t('reglages.alertes.preavis')}
            choix={CHOIX_PREAVIS}
            valeur={preferences.alertes.preavisJours}
            format={jours}
            onChange={(preavisJours) => modifierAlertes({ preavisJours })}
          />
        </Ligne>
        <Ligne libelle={t('reglages.alertes.carte')}>
          <Selecteur
            libelle={t('reglages.alertes.carte')}
            choix={CHOIX_CARTE}
            valeur={preferences.alertes.carteMois}
            format={mois}
            onChange={(carteMois) => modifierAlertes({ carteMois })}
          />
        </Ligne>
        <p className={styles.blocTexte}>{t('reglages.alertes.note')}</p>
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
        <Ligne libelle={t('reglages.formatDate')}>
          <Segmente<FormatDate>
            nom={t('reglages.formatDate')}
            options={optionsFormatDate}
            valeur={preferences.formatDate}
            onChange={(formatDate) => modifier({ formatDate })}
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

      <Section icone="tuile" titre={t('catalogue.titre')}>
        <div className={styles.bloc}>
          <p className={styles.blocTitre}>{tn('catalogue.nombre', catalogue.data.length)}</p>
          <p className={styles.blocTexte}>
            {t('catalogue.fraicheur', {
              n: catalogue.version,
              d: date(catalogue.publieLe, 'long'),
            })}
            {' — '}
            {t('catalogue.reglages.texte')}
          </p>
          <button type="button" className={styles.boutonSecondaire} onClick={onOuvrirCatalogue}>
            {t('catalogue.titre')}
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

/** Sélecteur d'un entier parmi des choix fixes ; une valeur hors liste reste proposée. */
function Selecteur({
  libelle,
  choix,
  valeur,
  format,
  onChange,
}: {
  libelle: string;
  choix: readonly number[];
  valeur: number;
  format: (n: number) => string;
  onChange: (n: number) => void;
}) {
  const options = choix.includes(valeur) ? choix : [...choix, valeur].sort((a, b) => a - b);
  return (
    <select
      className={styles.select}
      aria-label={libelle}
      value={valeur}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      {options.map((n) => (
        <option key={n} value={n}>
          {format(n)}
        </option>
      ))}
    </select>
  );
}
