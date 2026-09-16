import { useRef, useState, type ChangeEvent } from 'react';
import { ErreurImport, lireExportJson, type ApercuImport } from '../../data/importExport';
import {
  abonnementsDepuisCsv,
  analyserCsv,
  COLONNES_CSV,
  SEPARATEURS_CSV,
  type AnalyseCsv,
  type Colonne,
  type OptionsCsv,
} from '../../domain/csv';
import { aujourdhui } from '../../domain/dates';
import { parserDateSaisie } from '../../i18n';
import { Chips } from '../components/Chips';
import { EnTete } from '../components/EnTete';
import { Icone } from '../components/Icone';
import { Interrupteur } from '../components/Interrupteur';
import { useI18n } from '../contexts/I18nContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { useStorage } from '../contexts/StorageContext';
import { useToast } from '../contexts/ToastContext';
import { useAbonnements } from '../hooks/useAbonnements';
import { useConversion } from '../hooks/useConversion';
import { useMoyensPaiement } from '../hooks/useMoyensPaiement';
import styles from './Import.module.css';

interface Props {
  onRetour: () => void;
  /** après un import réussi */
  onTermine: () => void;
}

type Etat =
  | { etape: 'choix' }
  | { etape: 'json'; nomFichier: string; apercu: ApercuImport; confirmation: boolean }
  | {
      etape: 'csv';
      nomFichier: string;
      texte: string;
      /** réglages choisis à la main (vide : tout est détecté) */
      options: OptionsCsv;
      analyse: AnalyseCsv;
      /** panneau des colonnes : null = ouvert seulement si des lignes sont ignorées */
      colonnesOuvertes: boolean | null;
    }
  | { etape: 'erreur'; nomFichier: string; code: ErreurImport['code'] | 'lecture'; detail: string };

const APERCU_MAX = 5;
type EtatCsv = Extract<Etat, { etape: 'csv' }>;

/** Libellé court d'une colonne : en-tête du fichier, sinon « Colonne n ». */
function libelleColonne(
  entete: string | undefined,
  enTete: boolean,
  n: number,
  t: (cle: 'import.csv.colonne.numero', p: { n: number }) => string,
): string {
  const brut = enTete ? (entete ?? '').trim() : '';
  if (brut === '') return t('import.csv.colonne.numero', { n });
  return brut.length > 18 ? `${brut.slice(0, 17)}…` : brut;
}

/**
 * Import de données (EF-50, EF-52, écran « Import de données » de la maquette) :
 * sauvegarde JSON (fusion ou remplacement, avec confirmation) ou tableur CSV
 * (aperçu des lignes reconnues, lignes ignorées expliquées). Le fichier est lu
 * sur l'appareil, rien n'est envoyé. L'import de relevé bancaire arrive au lot 5.
 */
export function Import({ onRetour, onTermine }: Props) {
  const i18n = useI18n();
  const { t, tn, date } = i18n;
  const { preferences } = usePreferences();
  const { devise } = useConversion();
  const storage = useStorage();
  const toast = useToast();
  const { abonnements } = useAbonnements();
  const moyens = useMoyensPaiement();
  const jour = aujourdhui();
  const [etat, setEtat] = useState<Etat>({ etape: 'choix' });
  const [occupe, setOccupe] = useState(false);
  const entreeJson = useRef<HTMLInputElement>(null);
  const entreeCsv = useRef<HTMLInputElement>(null);

  const lireFichier = async (fichier: File, type: 'json' | 'csv') => {
    let texte: string;
    try {
      texte = await fichier.text();
    } catch {
      setEtat({ etape: 'erreur', nomFichier: fichier.name, code: 'lecture', detail: '' });
      return;
    }
    if (type === 'json') {
      try {
        const apercu = lireExportJson(texte, jour);
        setEtat({ etape: 'json', nomFichier: fichier.name, apercu, confirmation: false });
      } catch (e) {
        const code = e instanceof ErreurImport ? e.code : 'lecture';
        const detail = e instanceof Error ? e.message : '';
        setEtat({ etape: 'erreur', nomFichier: fichier.name, code, detail });
      }
    } else {
      const analyse = analyserCsv(texte, preferences.formatDate, parserDateSaisie);
      setEtat({
        etape: 'csv',
        nomFichier: fichier.name,
        texte,
        options: {},
        analyse,
        colonnesOuvertes: null,
      });
    }
  };
  const surChoix = (type: 'json' | 'csv') => (e: ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0];
    e.target.value = '';
    if (fichier) void lireFichier(fichier, type);
  };

  const importerJson = async (apercu: ApercuImport, mode: 'fusion' | 'remplacement') => {
    setOccupe(true);
    try {
      const bilan = await storage.importer(apercu.donnees, mode);
      toast.afficher(t('toast.importe', { a: bilan.abonnements, m: bilan.moyensPaiement }));
      onTermine();
    } finally {
      setOccupe(false);
    }
  };
  const importerCsv = async (analyse: AnalyseCsv) => {
    setOccupe(true);
    try {
      const nouveaux = abonnementsDepuisCsv(analyse.reconnues, jour, devise);
      await storage.abonnements.enregistrerPlusieurs(nouveaux);
      toast.afficher(tn('toast.importeCsv', nouveaux.length));
      onTermine();
    } finally {
      setOccupe(false);
    }
  };

  /** Réanalyse le fichier avec les réglages choisis à la main (v1.27). */
  const reglerCsv = (courant: EtatCsv, options: OptionsCsv) => {
    const analyse = analyserCsv(courant.texte, preferences.formatDate, parserDateSaisie, options);
    setEtat({ ...courant, options, analyse, colonnesOuvertes: true });
  };
  const optionsColonne = (courant: EtatCsv, colonne: Colonne) => {
    const { premiereLigne, enTete } = courant.analyse;
    const nb = Math.max(premiereLigne.length, 1);
    const options = Array.from({ length: nb }, (_, i) => ({
      valeur: i,
      libelle: libelleColonne(premiereLigne[i], enTete, i + 1, t),
    }));
    return colonne === 'nom' || colonne === 'prix'
      ? options
      : [...options, { valeur: -1, libelle: t('import.csv.colonne.aucune') }];
  };
  const panneauOuvert = (courant: EtatCsv) =>
    courant.colonnesOuvertes ??
    (courant.analyse.reconnues.length === 0 || courant.analyse.rejetees.length > 0);

  const retourChoix = () => setEtat({ etape: 'choix' });
  const separateurLisible = (s: AnalyseCsv['separateur']) =>
    s === '\t' ? t('import.csv.tabulation') : s;
  const nbActifs = abonnements.filter((a) => a.statut.type !== 'archive').length;

  return (
    <div className={styles.ecran}>
      <EnTete
        titre={t('import.titre')}
        retour={{ icone: 'retour', libelle: t('nav.retour'), onClick: onRetour }}
      />
      <input
        ref={entreeJson}
        type="file"
        accept=".json,application/json"
        className={styles.entreeFichier}
        onChange={surChoix('json')}
        aria-hidden="true"
        tabIndex={-1}
      />
      <input
        ref={entreeCsv}
        type="file"
        accept=".csv,text/csv,text/plain"
        className={styles.entreeFichier}
        onChange={surChoix('csv')}
        aria-hidden="true"
        tabIndex={-1}
      />

      {etat.etape === 'choix' ? (
        <>
          <p className={styles.sous}>{t('import.choix')}</p>
          <button
            type="button"
            className={styles.choix}
            onClick={() => entreeJson.current?.click()}
          >
            <span className={`${styles.badge} ${styles.badgeJson}`}>JSON</span>
            <span className={styles.choixTextes}>
              <span className={styles.choixTitre}>{t('import.json.titre')}</span>
              <span className={styles.choixSous}>{t('import.json.sous')}</span>
            </span>
            <Icone nom="chevronDroit" taille={14} epaisseur={3.2} />
          </button>
          <button type="button" className={styles.choix} onClick={() => entreeCsv.current?.click()}>
            <span className={`${styles.badge} ${styles.badgeCsv}`}>CSV</span>
            <span className={styles.choixTextes}>
              <span className={styles.choixTitre}>{t('import.csv.titre')}</span>
              <span className={styles.choixSous}>{t('import.csv.sous')}</span>
            </span>
            <Icone nom="chevronDroit" taille={14} epaisseur={3.2} />
          </button>
        </>
      ) : null}

      {etat.etape === 'json' ? (
        <section className={styles.carte}>
          <span className={styles.fichier}>{etat.nomFichier}</span>
          <div className={styles.resume}>
            <span className={styles.resumeTitre}>
              {t('import.detecte', {
                a: etat.apercu.nbAbonnements,
                m: etat.apercu.nbMoyensPaiement,
              })}
              {etat.apercu.nbServicesPersonnalises > 0
                ? ` · ${t('import.detecte.services', { s: etat.apercu.nbServicesPersonnalises })}`
                : ''}
            </span>
            <span className={styles.resumeSous}>
              {etat.apercu.exporteLe
                ? t('import.exportDu', { date: date(etat.apercu.exporteLe.slice(0, 10), 'long') })
                : t('import.exportSansDate')}
            </span>
          </div>
          {etat.confirmation ? (
            <div className={styles.confirmation}>
              <span className={styles.confirmationTitre}>{t('import.confirmation.titre')}</span>
              <span className={styles.confirmationTexte}>
                {t('import.confirmation.texte', { a: nbActifs, m: moyens.size })}
              </span>
              <div className={styles.confirmationActions}>
                <button
                  type="button"
                  className={styles.boutonSecondaire}
                  onClick={() => setEtat({ ...etat, confirmation: false })}
                >
                  {t('commun.annuler')}
                </button>
                <button
                  type="button"
                  className={styles.boutonDanger}
                  disabled={occupe}
                  onClick={() => void importerJson(etat.apercu, 'remplacement')}
                >
                  {t('import.confirmation.bouton')}
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.boutonPrincipal}
                disabled={occupe}
                onClick={() => void importerJson(etat.apercu, 'fusion')}
              >
                {t('import.fusion')}
              </button>
              <span className={styles.aide}>{t('import.fusion.sous')}</span>
              <button
                type="button"
                className={styles.boutonRemplacer}
                disabled={occupe}
                onClick={() => setEtat({ ...etat, confirmation: true })}
              >
                {t('import.remplacer')}
              </button>
              <span className={styles.aide}>{t('import.remplacer.sous')}</span>
            </div>
          )}
          <button type="button" className={styles.lienDiscret} onClick={retourChoix}>
            {t('import.autre')}
          </button>
        </section>
      ) : null}

      {etat.etape === 'csv' ? (
        <section className={styles.carte}>
          <span className={styles.fichier}>{etat.nomFichier}</span>
          {panneauOuvert(etat) ? (
            <div className={styles.colonnes}>
              <span className={styles.colonnesTitre}>{t('import.csv.colonnes')}</span>
              <span className={styles.resumeSous}>{t('import.csv.colonnes.aide')}</span>
              <div className={styles.colonne}>
                <span className={styles.colonneLibelle}>{t('import.csv.separateur')}</span>
                <Chips
                  nom={t('import.csv.separateur')}
                  options={SEPARATEURS_CSV.map((s) => ({
                    valeur: s,
                    libelle: s === '\t' ? t('import.csv.tabulation') : `« ${s} »`,
                  }))}
                  valeur={etat.analyse.separateur}
                  onChange={(separateur) => reglerCsv(etat, { separateur })}
                />
              </div>
              <Interrupteur
                libelle={t('import.csv.enTete')}
                actif={etat.analyse.enTete}
                onChange={(enTete) => reglerCsv(etat, { ...etat.options, enTete })}
              />
              {COLONNES_CSV.map((colonne) => (
                <div key={colonne} className={styles.colonne}>
                  <span className={styles.colonneLibelle}>
                    {t(`import.csv.colonne.${colonne}`)}
                  </span>
                  <Chips
                    nom={t(`import.csv.colonne.${colonne}`)}
                    options={optionsColonne(etat, colonne)}
                    valeur={etat.analyse.colonnes[colonne]}
                    onChange={(index) =>
                      reglerCsv(etat, {
                        ...etat.options,
                        enTete: etat.analyse.enTete,
                        colonnes: { ...etat.analyse.colonnes, [colonne]: index },
                      })
                    }
                  />
                </div>
              ))}
            </div>
          ) : null}
          {etat.analyse.reconnues.length > 0 ? (
            <>
              <span className={styles.resumeSous}>
                {t('import.csv.info', {
                  n: etat.analyse.reconnues.length,
                  s: separateurLisible(etat.analyse.separateur),
                })}
              </span>
              <div className={styles.table}>
                <div className={`${styles.rangee} ${styles.rangeeEnTete}`}>
                  <span>{t('import.csv.colonne.nom')}</span>
                  <span>{t('import.csv.colonne.prix')}</span>
                  <span>{t('import.csv.colonne.periodicite')}</span>
                  <span>{t('import.csv.colonne.echeance')}</span>
                </div>
                {etat.analyse.reconnues.slice(0, APERCU_MAX).map((l) => (
                  <div key={l.numero} className={styles.rangee}>
                    <span className={styles.cellule}>{l.nom}</span>
                    <span>{l.prix}</span>
                    <span className={styles.cellule}>{i18n.periodicite(l.periodicite)}</span>
                    <span>{l.echeance ? date(l.echeance) : t('commun.vide')}</span>
                  </div>
                ))}
                {etat.analyse.reconnues.length > APERCU_MAX ? (
                  <div className={styles.rangeePlus}>
                    {t('import.csv.plus', { n: etat.analyse.reconnues.length - APERCU_MAX })}
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <span className={styles.resumeSous}>{t('import.csv.aucune')}</span>
          )}
          {etat.analyse.rejetees.length > 0 ? (
            <div className={styles.rejetees}>
              <span className={styles.rejeteesTitre}>
                {tn('import.csv.rejetees', etat.analyse.rejetees.length)}
              </span>
              {etat.analyse.rejetees.slice(0, 3).map((r) => (
                <span key={r.numero} className={styles.rejetee}>
                  {r.numero} · {t(`import.csv.raison.${r.raison}`)} · {r.contenu}
                </span>
              ))}
            </div>
          ) : null}
          {etat.analyse.reconnues.length > 0 ? (
            <button
              type="button"
              className={styles.boutonPrincipal}
              disabled={occupe}
              onClick={() => void importerCsv(etat.analyse)}
            >
              {tn('import.csv.importer', etat.analyse.reconnues.length)}
            </button>
          ) : null}
          <button
            type="button"
            className={styles.lienDiscret}
            onClick={() => setEtat({ ...etat, colonnesOuvertes: !panneauOuvert(etat) })}
          >
            {panneauOuvert(etat)
              ? t('import.csv.colonnes.fermer')
              : t('import.csv.colonnes.modifier')}
          </button>
          <button type="button" className={styles.lienDiscret} onClick={retourChoix}>
            {t('import.autre')}
          </button>
        </section>
      ) : null}

      {etat.etape === 'erreur' ? (
        <section className={styles.carte}>
          <span className={styles.fichier}>{etat.nomFichier}</span>
          <span className={styles.erreur}>
            {etat.code === 'structure'
              ? t('import.erreur.structure', { detail: etat.detail })
              : t(`import.erreur.${etat.code}`)}
          </span>
          <button type="button" className={styles.lienDiscret} onClick={retourChoix}>
            {t('import.autre')}
          </button>
        </section>
      ) : null}

      <p className={styles.note}>{t('import.note')}</p>
    </div>
  );
}
