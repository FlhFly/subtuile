import { useState, type ReactNode } from 'react';
import { chargerJeuDemo } from '../../data/fixtures/demo';
import { ADRESSE_CONTACT } from '../../data/contact';
import { nouveautesNonVues } from '../../data/notesDeVersion';
import { decrireAppareil, lienRetour, type TypeRetour } from '../../domain/retours';
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
} from '../../domain/types';
import { Drapeau } from '../components/Drapeau';
import { Icone } from '../components/Icone';
import { Interrupteur } from '../components/Interrupteur';
import { SYMBOLES } from '../../domain/devises';
import { DEVISES, type Devise } from '../../domain/types';
import { useTaux } from '../hooks/useTaux';
import { useI18n } from '../contexts/I18nContext';
import { useMiseAJour } from '../contexts/MiseAJourContext';
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
  /** rejoue l'onboarding (C7) */
  onRevoirIntro: () => void;
  /** écran Nouveautés (notes de version) */
  onOuvrirNouveautes: () => void;
}

const VERSION_APP = __APP_VERSION__;
const URL_DEPOT = 'https://github.com/FlhFly/subtuile';
/** Page de don (Ko-fi) : ouverte dans un nouvel onglet, aucune ressource externe chargée dans l'app */
const URL_DON = 'https://ko-fi.com/M1G426XAKZ';
/** Retours utilisateurs (bugs, idées) par e-mail ; mise à null, la rangée disparaît (§4.7). */
const ADRESSE_RETOURS: string | null = ADRESSE_CONTACT;

/** Choix proposés pour les défauts d'alerte (EF-30), en jours puis en mois. */
const CHOIX_ECHEANCE = [1, 2, 3, 7, 14] as const;
const CHOIX_ESSAI = [1, 2, 3, 7] as const;
const CHOIX_PREAVIS = [7, 14, 30] as const;
const CHOIX_CARTE = [1, 2, 3] as const;

type Depliant =
  'devise' | 'langue' | 'formatDate' | 'echeance' | 'essai' | 'preavis' | 'carte' | null;

/**
 * Réglages (§7.7, écran 7 de la maquette) : apparence (EF-17), défauts
 * d'alerte (EF-30), général (langue EF-17b, format de date, moyens de
 * paiement, catalogue), automatisation (§7.9, EF-32), données (jeu de démo,
 * confidentialité), à propos (dépôt public, installation de la PWA §5.2).
 * « Revoir l'introduction » rejoue l'onboarding (C7) ; « Soutenir le projet »
 * ouvre la page de don Ko-fi.
 */
export function Reglages({
  onOuvrirPaiements,
  onOuvrirCatalogue,
  onOuvrirImport,
  onRevoirIntro,
  onOuvrirNouveautes,
}: Props) {
  const i18n = useI18n();
  const { t, tn, date, changerLangue, langue } = i18n;
  const taux = useTaux();
  const toast = useToast();
  const installation = useInstallation();
  const miseAJour = useMiseAJour();
  const { abonnements } = useAbonnements();
  const nombreMoyens = useMoyensPaiement().size;
  const { catalogue } = useCatalogue();
  const { preferences, modifier } = usePreferences();
  const storage = useStorage();
  const [chargementDemo, setChargementDemo] = useState(false);
  const [depliant, setDepliant] = useState<Depliant>(null);
  const [confirmationEffacer, setConfirmationEffacer] = useState(false);
  const [retoursOuvert, setRetoursOuvert] = useState(false);
  /** message pré-rempli : sujet typé, corps avec version, appareil et langue ; rien d'autre */
  const lienRetours = (type: TypeRetour) =>
    lienRetour(
      ADRESSE_RETOURS ?? '',
      t(`retours.sujet.${type}`, { version: VERSION_APP }),
      t('retours.corps', {
        version: VERSION_APP,
        appareil: decrireAppareil(window.navigator.userAgent, window.navigator.maxTouchPoints),
        langue,
      }),
    );

  /** EF-50 : sauvegarde JSON complète, téléchargée. */
  const exporter = async () => {
    const jour = aujourdhui();
    telechargerFichier(nomFichierExport(jour), await exporterJson(storage), 'application/json');
    modifier({ derniereSauvegarde: jour });
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
          <RangeeChoix
            libelle={t('reglages.alertes.renouvellement')}
            choix={CHOIX_ECHEANCE}
            valeur={preferences.alertes.echeanceJours}
            format={jours}
            ouvert={depliant === 'echeance'}
            onBasculer={() => basculer('echeance')}
            onChange={(echeanceJours) => {
              modifierAlertes({ echeanceJours });
              setDepliant(null);
            }}
          />
          <RangeeChoix
            libelle={t('reglages.alertes.essai')}
            choix={CHOIX_ESSAI}
            valeur={preferences.alertes.essaiJours}
            format={jours}
            ouvert={depliant === 'essai'}
            onBasculer={() => basculer('essai')}
            onChange={(essaiJours) => {
              modifierAlertes({ essaiJours });
              setDepliant(null);
            }}
          />
          <RangeeChoix
            libelle={t('reglages.alertes.preavis')}
            choix={CHOIX_PREAVIS}
            valeur={preferences.alertes.preavisJours}
            format={jours}
            ouvert={depliant === 'preavis'}
            onBasculer={() => basculer('preavis')}
            onChange={(preavisJours) => {
              modifierAlertes({ preavisJours });
              setDepliant(null);
            }}
          />
          <RangeeChoix
            libelle={t('reglages.alertes.carte')}
            choix={CHOIX_CARTE}
            valeur={preferences.alertes.carteMois}
            format={mois}
            ouvert={depliant === 'carte'}
            onBasculer={() => basculer('carte')}
            onChange={(carteMois) => {
              modifierAlertes({ carteMois });
              setDepliant(null);
            }}
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
          <RangeeLien libelle={t('reglages.intro')} onClick={onRevoirIntro} />
          <RangeeLien
            libelle={t('catalogue.titre')}
            valeur={tn('catalogue.nombre', catalogue.data.length)}
            onClick={onOuvrirCatalogue}
          />
          <div className={styles.rangeeInterrupteur}>
            <Interrupteur
              libelle={t('reglages.catalogue.proposer')}
              sousLibelle={t('reglages.catalogue.proposer.sous')}
              actif={preferences.proposerAuCatalogue}
              onChange={(actif) => modifier({ proposerAuCatalogue: actif })}
            />
          </div>
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
              <span className={styles.sous}>
                {preferences.derniereSauvegarde
                  ? t('reglages.exporter.derniere', {
                      date: date(preferences.derniereSauvegarde, 'long'),
                    })
                  : t('reglages.exporter.sous')}
              </span>
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

      {retoursOuvert ? (
        <div className={styles.voile} role="presentation" onClick={() => setRetoursOuvert(false)}>
          <div
            className={styles.dialogue}
            role="dialog"
            aria-modal="true"
            aria-labelledby="retours-titre"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="retours-titre" className={styles.dialogueTitre}>
              {t('reglages.retours.titre')}
            </h2>
            <p className={styles.sous}>{t('reglages.retours.texte')}</p>
            <div className={styles.dialogueActionsColonne}>
              <a className={styles.dialoguePrincipal} href={lienRetours('bug')}>
                {t('reglages.retours.bug')}
              </a>
              <a className={styles.dialogueSecondaire} href={lienRetours('idee')}>
                {t('reglages.retours.idee')}
              </a>
              <button
                type="button"
                className={styles.dialogueLien}
                onClick={() => setRetoursOuvert(false)}
              >
                {t('commun.annuler')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
          {miseAJour.disponible ? (
            <button
              type="button"
              className={styles.rangeeBouton}
              onClick={() => void miseAJour.appliquer()}
            >
              <span className={styles.textes}>
                <span className={styles.libelle}>{t('reglages.apropos.maj')}</span>
                <span className={styles.sous}>{t('reglages.apropos.maj.sous')}</span>
              </span>
              <span className={styles.valeur}>
                <span className={styles.nouveau}>{t('reglages.apropos.nouveau')}</span>
                <Icone nom="chevronDroit" taille={13} epaisseur={3.2} />
              </span>
            </button>
          ) : null}
          <button type="button" className={styles.rangeeBouton} onClick={onOuvrirNouveautes}>
            <span className={styles.textes}>
              <span className={styles.libelle}>{t('reglages.apropos.nouveautes')}</span>
              <span className={styles.sous}>
                {t('reglages.apropos.nouveautes.sous', { version: VERSION_APP })}
              </span>
            </span>
            <span className={styles.valeur}>
              {nouveautesNonVues(preferences.versionVue, VERSION_APP) ? (
                <span className={styles.nouveau}>{t('reglages.apropos.nouveau')}</span>
              ) : null}
              <Icone nom="chevronDroit" taille={13} epaisseur={3.2} />
            </span>
          </button>
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
          {ADRESSE_RETOURS !== null ? (
            <button
              type="button"
              className={styles.rangeeBouton}
              onClick={() => setRetoursOuvert(true)}
            >
              <span className={styles.textes}>
                <span className={styles.libelle}>{t('reglages.retours')}</span>
                <span className={styles.sous}>{t('reglages.retours.sous')}</span>
              </span>
              <span className={styles.valeur}>
                <Icone nom="chevronDroit" taille={13} epaisseur={3.2} />
              </span>
            </button>
          ) : null}
          <a className={styles.rangeeBouton} href={URL_DON} target="_blank" rel="noreferrer">
            <span className={styles.textes}>
              <span className={styles.libelle}>{t('reglages.apropos.don')}</span>
              <span className={styles.sous}>{t('reglages.apropos.don.sous')}</span>
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

/**
 * Rangée des défauts d'alerte, dépliée en options comme Devise ou Langue (un
 * sélecteur natif s'affichait plus gros que le reste sur iPhone) ; une valeur
 * hors liste reste proposée.
 */
function RangeeChoix({
  libelle,
  choix,
  valeur,
  format,
  ouvert,
  onBasculer,
  onChange,
}: {
  libelle: string;
  choix: readonly number[];
  valeur: number;
  format: (n: number) => string;
  ouvert: boolean;
  onBasculer: () => void;
  onChange: (n: number) => void;
}) {
  const options = choix.includes(valeur) ? choix : [...choix, valeur].sort((a, b) => a - b);
  return (
    <RangeeDepliante
      libelle={libelle}
      valeur={format(valeur)}
      ouvert={ouvert}
      onBasculer={onBasculer}
    >
      {options.map((n) => (
        <Option
          key={n}
          libelle={format(n)}
          actif={n === valeur}
          icone={null}
          onChoisir={() => onChange(n)}
        />
      ))}
    </RangeeDepliante>
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

/** Rangée qui ouvre un autre écran, valeur (compte) facultative et chevron à droite. */
function RangeeLien({
  libelle,
  valeur,
  onClick,
}: {
  libelle: string;
  valeur?: string;
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
