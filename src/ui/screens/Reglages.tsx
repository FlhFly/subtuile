import { useState, type ReactNode } from 'react';
import { chargerJeuDemo } from '../../data/fixtures/demo';
import { exporterJson, nomFichierExport } from '../../data/importExport';
import { aujourdhui } from '../../domain/dates';
import { evenementsAVenir } from '../../domain/echeancier';
import { nomFichierIcs } from '../../domain/ics';
import {
  FORMATS_DATE,
  LANGUES,
  THEMES,
  type DefautsAlerte,
  type FormatDate,
  type Langue,
} from '../../domain/types';
import { Icone } from '../components/Icone';
import { SYMBOLES } from '../../domain/devises';
import { DEVISES, type Devise } from '../../domain/types';
import { useTaux } from '../hooks/useTaux';
import { useI18n } from '../contexts/I18nContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { useStorage } from '../contexts/StorageContext';
import { useToast } from '../contexts/ToastContext';
import { useAbonnements } from '../hooks/useAbonnements';
import { useCatalogue } from '../hooks/useCatalogue';
import { useInstallation } from '../hooks/useInstallation';
import { useMoyensPaiement } from '../hooks/useMoyensPaiement';
import { icsDepuisEvenements } from '../rappelsIcs';
import { telechargerFichier } from '../telechargement';
import styles from './Reglages.module.css';

interface Props {
  onOuvrirPaiements: () => void;
  onOuvrirCatalogue: () => void;
  onOuvrirImport: () => void;
}

const VERSION_APP = __APP_VERSION__;
const URL_DEPOT = 'https://github.com/FlhFly/subtuile';

/** Choix proposés pour les défauts d'alerte (EF-30), en jours puis en mois. */
const CHOIX_ECHEANCE = [1, 2, 3, 7, 14] as const;
const CHOIX_ESSAI = [1, 2, 3, 7] as const;
const CHOIX_PREAVIS = [7, 14, 30] as const;
const CHOIX_CARTE = [1, 2, 3] as const;

type Depliant = 'devise' | 'langue' | 'formatDate' | null;

/**
 * Réglages (§7.7, écran 7 de la maquette) : apparence (EF-17), défauts
 * d'alerte (EF-30), général (langue EF-17b, format de date, moyens de
 * paiement, catalogue), automatisation (§7.9, EF-32), données (jeu de démo,
 * confidentialité), à propos (dépôt public, installation de la PWA §5.2).
 * « Revoir l'introduction » arrive avec l'onboarding ; « Soutenir le projet »
 * dès qu'un lien de don existe (§4.7 : rien de factice).
 */
export function Reglages({ onOuvrirPaiements, onOuvrirCatalogue, onOuvrirImport }: Props) {
  const i18n = useI18n();
  const { t, tn, date, changerLangue, langue } = i18n;
  const taux = useTaux();
  const toast = useToast();
  const installation = useInstallation();
  const { abonnements } = useAbonnements();
  const nombreMoyens = useMoyensPaiement().size;
  const { catalogue } = useCatalogue();
  const { preferences, modifier } = usePreferences();
  const storage = useStorage();
  const [chargementDemo, setChargementDemo] = useState(false);
  const [depliant, setDepliant] = useState<Depliant>(null);
  const [confirmationEffacer, setConfirmationEffacer] = useState(false);

  /** EF-50 : sauvegarde JSON complète, téléchargée. */
  const exporter = async () => {
    const jour = aujourdhui();
    telechargerFichier(nomFichierExport(jour), await exporterJson(storage), 'application/json');
    toast.afficher(t('toast.exporte'));
  };

  /** Réglages › Données : efface toutes les données métier (abonnements, moyens, services). */
  const effacerTout = async () => {
    await storage.effacerTout();
    setConfirmationEffacer(false);
    toast.afficher(t('toast.donneesEffacees'));
  };

  const basculer = (d: Exclude<Depliant, null>) => setDepliant((c) => (c === d ? null : d));
  const modifierAlertes = (partiel: Partial<DefautsAlerte>) =>
    modifier({ alertes: { ...preferences.alertes, ...partiel } });
  const jours = (n: number) => t('reglages.alertes.jours', { n });
  const mois = (n: number) => t('reglages.alertes.mois', { n });

  const chargerDemo = async () => {
    setChargementDemo(true);
    try {
      await chargerJeuDemo(storage);
      toast.afficher(t('reglages.demo.charge'));
    } finally {
      setChargementDemo(false);
    }
  };

  /** EF-32 : toutes les prochaines échéances, fins d'essai et préavis en un fichier .ics. */
  const evenements = evenementsAVenir(abonnements, aujourdhui());
  const exporterIcs = () => {
    const ics = icsDepuisEvenements(
      i18n,
      evenements,
      preferences.alertes,
      new Map(abonnements.map((a) => [a.id, a])),
    );
    telechargerFichier(nomFichierIcs(t('ics.fichier.tout')), ics, 'text/calendar');
    toast.afficher(t('toast.icsTelecharge'));
  };

  return (
    <div className={styles.ecran}>
      <h1 className={styles.titre}>{t('reglages.titre')}</h1>

      <Section titre={t('reglages.apparence')}>
        <div className={styles.pilules} role="radiogroup" aria-label={t('reglages.theme')}>
          {THEMES.map((th) => (
            <button
              key={th}
              type="button"
              role="radio"
              aria-checked={preferences.theme === th}
              className={preferences.theme === th ? styles.piluleActive : styles.pilule}
              onClick={() => modifier({ theme: th })}
            >
              {t(`theme.${th}`)}
            </button>
          ))}
        </div>
      </Section>

      <Section titre={t('reglages.alertes')}>
        <Carte>
          <RangeeSelect
            libelle={t('reglages.alertes.renouvellement')}
            choix={CHOIX_ECHEANCE}
            valeur={preferences.alertes.echeanceJours}
            format={jours}
            onChange={(echeanceJours) => modifierAlertes({ echeanceJours })}
          />
          <RangeeSelect
            libelle={t('reglages.alertes.essai')}
            choix={CHOIX_ESSAI}
            valeur={preferences.alertes.essaiJours}
            format={jours}
            onChange={(essaiJours) => modifierAlertes({ essaiJours })}
          />
          <RangeeSelect
            libelle={t('reglages.alertes.preavis')}
            choix={CHOIX_PREAVIS}
            valeur={preferences.alertes.preavisJours}
            format={jours}
            onChange={(preavisJours) => modifierAlertes({ preavisJours })}
          />
          <RangeeSelect
            libelle={t('reglages.alertes.carte')}
            choix={CHOIX_CARTE}
            valeur={preferences.alertes.carteMois}
            format={mois}
            onChange={(carteMois) => modifierAlertes({ carteMois })}
          />
        </Carte>
        <p className={styles.note}>{t('reglages.alertes.note')}</p>
      </Section>

      <Section titre={t('reglages.general')}>
        <Carte>
          <RangeeDepliante
            libelle={t('reglages.devise')}
            valeur={preferences.deviseAffichage}
            ouvert={depliant === 'devise'}
            onBasculer={() => basculer('devise')}
            note={t('reglages.devise.note', { d: date(taux.publieLe, 'long') })}
          >
            {DEVISES.map((d: Devise) => (
              <Option
                key={d}
                libelle={`${t(`devise.${d}`)} (${d})`}
                actif={preferences.deviseAffichage === d}
                icone={<span className={styles.monogramme}>{SYMBOLES[d]}</span>}
                onChoisir={() => modifier({ deviseAffichage: d })}
              />
            ))}
          </RangeeDepliante>
          <RangeeDepliante
            libelle={t('reglages.langue')}
            valeur={t(`langue.${langue}`)}
            ouvert={depliant === 'langue'}
            onBasculer={() => basculer('langue')}
            note={t('reglages.langue.note')}
          >
            {LANGUES.map((l) => (
              <Option
                key={l}
                libelle={t(`langue.${l}`)}
                actif={langue === l}
                icone={<Drapeau langue={l} />}
                onChoisir={() => changerLangue(l)}
              />
            ))}
          </RangeeDepliante>
          <RangeeDepliante
            libelle={t('reglages.formatDate')}
            valeur={t(`formatDate.${preferences.formatDate}`)}
            ouvert={depliant === 'formatDate'}
            onBasculer={() => basculer('formatDate')}
          >
            {FORMATS_DATE.map((f: FormatDate) => (
              <Option
                key={f}
                libelle={t(`formatDate.${f}`)}
                actif={preferences.formatDate === f}
                icone={<span className={styles.monogramme}>{t(`formatDate.exemple.${f}`)}</span>}
                onChoisir={() => modifier({ formatDate: f })}
              />
            ))}
          </RangeeDepliante>
          <RangeeLien
            libelle={t('paiements.titre')}
            valeur={String(nombreMoyens)}
            onClick={onOuvrirPaiements}
          />
          <RangeeLien
            libelle={t('catalogue.titre')}
            valeur={tn('catalogue.nombre', catalogue.data.length)}
            onClick={onOuvrirCatalogue}
          />
        </Carte>
      </Section>

      <Section titre={t('reglages.automatisation')}>
        <Carte>
          <div className={styles.rangeeAuto}>
            <span className={styles.textes}>
              <span className={styles.libelle}>{t('reglages.automatisation.avance')}</span>
              <span className={styles.sous}>{t('reglages.automatisation.avance.sous')}</span>
            </span>
            <span className={styles.pastilleOk}>{t('reglages.automatisation.avance.etat')}</span>
          </div>
          <button
            type="button"
            className={styles.rangeeAutoBouton}
            onClick={exporterIcs}
            disabled={evenements.length === 0}
          >
            <span className={styles.textes}>
              <span className={styles.libelle}>{t('reglages.automatisation.ics')}</span>
              <span className={styles.sous}>{t('reglages.automatisation.ics.sous')}</span>
            </span>
            <span className={styles.valeur}>
              <Icone nom="chevronDroit" taille={13} epaisseur={3.2} />
            </span>
          </button>
        </Carte>
        <p className={styles.note}>{t('reglages.automatisation.note')}</p>
      </Section>

      <Section titre={t('reglages.donnees')}>
        <Carte>
          <button type="button" className={styles.rangeeBouton} onClick={() => void exporter()}>
            <span className={styles.textes}>
              <span className={styles.libelle}>{t('reglages.exporter')}</span>
              <span className={styles.sous}>{t('reglages.exporter.sous')}</span>
            </span>
            <span className={styles.valeur}>
              <Icone nom="chevronDroit" taille={13} epaisseur={3.2} />
            </span>
          </button>
          <button type="button" className={styles.rangeeBouton} onClick={onOuvrirImport}>
            <span className={styles.textes}>
              <span className={styles.libelle}>{t('reglages.importer')}</span>
              <span className={styles.sous}>{t('reglages.importer.sous')}</span>
            </span>
            <span className={styles.valeur}>
              <Icone nom="chevronDroit" taille={13} epaisseur={3.2} />
            </span>
          </button>
          <button
            type="button"
            className={styles.rangeeBouton}
            onClick={() => void chargerDemo()}
            disabled={chargementDemo}
          >
            <span className={styles.textes}>
              <span className={styles.libelle}>{t('reglages.demo.titre')}</span>
              <span className={styles.sous}>{t('reglages.demo.texte')}</span>
            </span>
            <span className={styles.valeur}>
              <Icone nom="chevronDroit" taille={13} epaisseur={3.2} />
            </span>
          </button>
          <div className={styles.rangeeTexte}>
            <span className={styles.libelle}>{t('reglages.confidentialite')}</span>
            <span className={styles.sous}>{t('reglages.confidentialite.texte')}</span>
          </div>
          <button
            type="button"
            className={`${styles.rangeeBouton} ${styles.rangeeDanger}`}
            onClick={() => setConfirmationEffacer(true)}
          >
            <span className={styles.textes}>
              <span className={styles.libelle}>{t('reglages.effacer')}</span>
              <span className={styles.sous}>{t('reglages.effacer.sous')}</span>
            </span>
            <span className={styles.valeur}>
              <Icone nom="chevronDroit" taille={13} epaisseur={3.2} />
            </span>
          </button>
        </Carte>
      </Section>

      {confirmationEffacer ? (
        <div
          className={styles.voile}
          role="presentation"
          onClick={() => setConfirmationEffacer(false)}
        >
          <div
            className={styles.dialogue}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="effacer-titre"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="effacer-titre" className={styles.dialogueTitre}>
              {t('reglages.effacer.question')}
            </h2>
            <p className={styles.sous}>{t('reglages.effacer.texte')}</p>
            <div className={styles.dialogueActions}>
              <button
                type="button"
                className={styles.dialogueSecondaire}
                onClick={() => setConfirmationEffacer(false)}
              >
                {t('commun.annuler')}
              </button>
              <button
                type="button"
                className={styles.dialogueDanger}
                onClick={() => void effacerTout()}
              >
                {t('reglages.effacer.confirmer')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <Section titre={t('reglages.apropos')}>
        <Carte>
          {installation.installable ? (
            <button
              type="button"
              className={styles.rangeeBouton}
              onClick={() => void installation.installer()}
            >
              <span className={styles.textes}>
                <span className={styles.libelle}>{t('reglages.apropos.installer')}</span>
                <span className={styles.sous}>{t('reglages.apropos.installer.sous')}</span>
              </span>
              <span className={styles.valeur}>
                <Icone nom="chevronDroit" taille={13} epaisseur={3.2} />
              </span>
            </button>
          ) : null}
          {installation.etat === 'ios' ? (
            <div className={styles.rangeeTexte}>
              <span className={styles.libelle}>{t('reglages.apropos.ios')}</span>
              <span className={styles.sous}>{t('reglages.apropos.ios.sous')}</span>
            </div>
          ) : null}
          {installation.etat === 'installee' ? (
            <div className={styles.rangeeTexte}>
              <span className={styles.libelle}>{t('reglages.apropos.installee')}</span>
              <span className={styles.sous}>{t('reglages.apropos.installee.sous')}</span>
            </div>
          ) : null}
          <a className={styles.rangeeBouton} href={URL_DEPOT} target="_blank" rel="noreferrer">
            <span className={styles.textes}>
              <span className={styles.libelle}>{t('reglages.apropos.os')}</span>
              <span className={styles.sous}>{t('reglages.apropos.os.sous')}</span>
            </span>
            <span className={styles.valeur}>
              <Icone nom="externe" taille={13} epaisseur={3} />
            </span>
          </a>
        </Carte>
      </Section>

      <p className={styles.pied}>{t('reglages.apropos.version', { version: VERSION_APP })}</p>
    </div>
  );
}

function Section({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitre}>{titre}</h2>
      {children}
    </section>
  );
}

function Carte({ children }: { children: ReactNode }) {
  return <div className={styles.carte}>{children}</div>;
}

/** Rangée « libellé + sélecteur » des défauts d'alerte ; une valeur hors liste reste proposée. */
function RangeeSelect({
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
    <div className={styles.rangeeCompacte}>
      <span className={styles.libelle}>{libelle}</span>
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
    </div>
  );
}

/** Rangée qui ouvre une liste d'options (langue, format de date), valeur courante à droite. */
function RangeeDepliante({
  libelle,
  valeur,
  ouvert,
  onBasculer,
  note,
  children,
}: {
  libelle: string;
  valeur: string;
  ouvert: boolean;
  onBasculer: () => void;
  note?: string;
  children: ReactNode;
}) {
  return (
    <>
      <button
        type="button"
        className={styles.rangeeBouton}
        onClick={onBasculer}
        aria-expanded={ouvert}
      >
        <span className={styles.libelle}>{libelle}</span>
        <span className={styles.valeur}>
          {valeur}
          <Icone nom="chevron" taille={13} epaisseur={3.2} />
        </span>
      </button>
      {ouvert ? (
        <div className={styles.options} role="radiogroup" aria-label={libelle}>
          {children}
          {note ? <span className={styles.optionsNote}>{note}</span> : null}
        </div>
      ) : null}
    </>
  );
}

function Option({
  libelle,
  actif,
  icone,
  onChoisir,
}: {
  libelle: string;
  actif: boolean;
  icone: ReactNode;
  onChoisir: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={actif}
      className={actif ? styles.optionActive : styles.option}
      onClick={onChoisir}
    >
      <span className={styles.optionGauche}>
        {icone}
        <span className={styles.optionLibelle}>{libelle}</span>
      </span>
      {actif ? (
        <span className={styles.coche}>
          <Icone nom="coche" taille={12} epaisseur={3.6} />
        </span>
      ) : null}
    </button>
  );
}

/** Rangée qui ouvre un autre écran, valeur (compte) et chevron à droite. */
function RangeeLien({
  libelle,
  valeur,
  onClick,
}: {
  libelle: string;
  valeur: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={styles.rangeeBouton} onClick={onClick}>
      <span className={styles.libelle}>{libelle}</span>
      <span className={styles.valeur}>
        {valeur}
        <Icone nom="chevronDroit" taille={13} epaisseur={3.2} />
      </span>
    </button>
  );
}

/** Drapeaux de la maquette (formes simples, aucun asset externe). */
function Drapeau({ langue }: { langue: Langue }) {
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
