import { useMemo, useState } from 'react';
import { SEPARATEURS_CSV } from '../../domain/csv';
import { aujourdhui } from '../../domain/dates';
import {
  abonnementsDepuisReleve,
  COLONNES_RELEVE,
  detecterRecurrences,
  lireReleve,
  type ColonneReleve,
  type OptionsReleve,
} from '../../domain/releve';
import { parserDateSaisie } from '../../i18n';
import { Chips } from '../components/Chips';
import { Interrupteur } from '../components/Interrupteur';
import { useI18n } from '../contexts/I18nContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { useStorage } from '../contexts/StorageContext';
import { useToast } from '../contexts/ToastContext';
import { useAbonnements } from '../hooks/useAbonnements';
import { useCatalogue } from '../hooks/useCatalogue';
import { useConversion } from '../hooks/useConversion';
import styles from './Import.module.css';

interface Props {
  nomFichier: string;
  /** contenu du relevé, gardé en mémoire le temps de l'écran seulement */
  texte: string;
  onAutreFichier: () => void;
  onTermine: () => void;
}

/**
 * Import de relevé bancaire (EF-73, écran « Relevé bancaire » de la maquette) :
 * détection locale des paiements récurrents, « déjà suivi » ou « nouveau »,
 * ajout groupé des nouveaux. Le relevé est lu sur l'appareil et n'est jamais
 * conservé : seuls les abonnements choisis sont enregistrés.
 */
export function ImportReleve({ nomFichier, texte, onAutreFichier, onTermine }: Props) {
  const i18n = useI18n();
  const { t, tn, date } = i18n;
  const { preferences } = usePreferences();
  const { devise } = useConversion();
  const storage = useStorage();
  const toast = useToast();
  const { abonnements } = useAbonnements();
  const { catalogue, personnalises } = useCatalogue();
  const jour = aujourdhui();
  const [options, setOptions] = useState<OptionsReleve>({});
  const [colonnesOuvertes, setColonnesOuvertes] = useState<boolean | null>(null);
  const [ecartes, setEcartes] = useState<ReadonlySet<string>>(new Set());
  const [occupe, setOccupe] = useState(false);

  const services = useMemo(
    () => [...catalogue.data, ...personnalises.filter((s) => s.deletedAt === null)],
    [catalogue, personnalises],
  );
  const lecture = useMemo(
    () => lireReleve(texte, preferences.formatDate, parserDateSaisie, options),
    [texte, preferences.formatDate, options],
  );
  const paiements = useMemo(
    () => detecterRecurrences(lecture.operations, abonnements, services, jour),
    [lecture, abonnements, services, jour],
  );
  const nouveaux = paiements.filter((p) => p.dejaSuivi === null);
  const choisis = nouveaux.filter((p) => !ecartes.has(p.cle));
  const panneauOuvert = colonnesOuvertes ?? lecture.operations.length === 0;

  const regler = (suivantes: OptionsReleve) => {
    setOptions(suivantes);
    setColonnesOuvertes(true);
    setEcartes(new Set());
  };
  const basculer = (cle: string) => {
    const suivant = new Set(ecartes);
    if (suivant.has(cle)) suivant.delete(cle);
    else suivant.add(cle);
    setEcartes(suivant);
  };
  const optionsColonne = () => {
    const nb = Math.max(lecture.premiereLigne.length, 1);
    return Array.from({ length: nb }, (_, i) => {
      const brut = lecture.enTete ? (lecture.premiereLigne[i] ?? '').trim() : '';
      const libelle =
        brut === ''
          ? t('import.csv.colonne.numero', { n: i + 1 })
          : brut.length > 18
            ? `${brut.slice(0, 17)}…`
            : brut;
      return { valeur: i, libelle };
    });
  };
  const choisirColonne = (colonne: ColonneReleve, index: number) =>
    regler({
      ...options,
      enTete: lecture.enTete,
      colonnes: { ...lecture.colonnes, [colonne]: index },
    });

  const ajouter = async () => {
    setOccupe(true);
    try {
      const crees = abonnementsDepuisReleve(choisis, services, jour, devise);
      await storage.abonnements.enregistrerPlusieurs(crees);
      toast.afficher(tn('toast.importeReleve', crees.length));
      onTermine();
    } finally {
      setOccupe(false);
    }
  };

  return (
    <section className={styles.carte}>
      <span className={styles.fichier}>{nomFichier}</span>
      {panneauOuvert ? (
        <div className={styles.colonnes}>
          <span className={styles.colonnesTitre}>{t('import.csv.colonnes')}</span>
          <span className={styles.resumeSous}>{t('import.releve.colonnes.aide')}</span>
          <div className={styles.colonne}>
            <span className={styles.colonneLibelle}>{t('import.csv.separateur')}</span>
            <Chips
              nom={t('import.csv.separateur')}
              options={SEPARATEURS_CSV.map((s) => ({
                valeur: s,
                libelle: s === '\t' ? t('import.csv.tabulation') : `« ${s} »`,
              }))}
              valeur={lecture.separateur}
              onChange={(separateur) => regler({ separateur })}
            />
          </div>
          <Interrupteur
            libelle={t('import.csv.enTete')}
            actif={lecture.enTete}
            onChange={(enTete) => regler({ ...options, enTete })}
          />
          {COLONNES_RELEVE.map((colonne) => (
            <div key={colonne} className={styles.colonne}>
              <span className={styles.colonneLibelle}>{t(`import.releve.colonne.${colonne}`)}</span>
              <Chips
                nom={t(`import.releve.colonne.${colonne}`)}
                options={optionsColonne()}
                valeur={lecture.colonnes[colonne]}
                onChange={(index) => choisirColonne(colonne, index)}
              />
            </div>
          ))}
        </div>
      ) : null}

      <span className={styles.resumeSous}>
        {t('import.releve.info', { o: lecture.operations.length, r: paiements.length })}
      </span>

      {paiements.length > 0 ? (
        <ul className={styles.releveListe}>
          {paiements.map((p) => {
            const suivi = p.dejaSuivi !== null;
            const coche = !suivi && !ecartes.has(p.cle);
            return (
              <li key={p.cle}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={coche}
                  disabled={suivi}
                  className={styles.releveLigne}
                  onClick={() => basculer(p.cle)}
                >
                  <span className={coche ? styles.releveCaseCochee : styles.releveCase} />
                  <span className={styles.releveTextes}>
                    <span className={styles.releveNom}>{p.nom}</span>
                    <span className={styles.releveSous}>
                      {t('import.releve.detail', {
                        n: p.nbPaiements,
                        date: date(p.dernierPaiement),
                      })}
                    </span>
                    <span className={styles.releveLibelle}>{p.libelle}</span>
                  </span>
                  <span className={styles.releveDroite}>
                    <span className={styles.releveMontant}>
                      {i18n.montant(p.montant, devise)} {i18n.periodicite(p.periodicite)}
                    </span>
                    <span className={suivi ? styles.etiquetteSuivi : styles.etiquetteNouveau}>
                      {suivi ? t('import.releve.dejaSuivi') : t('import.releve.nouveau')}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <span className={styles.resumeSous}>{t('import.releve.aucun')}</span>
      )}

      {paiements.length > 0 && nouveaux.length === 0 ? (
        <span className={styles.releveRien}>{t('import.releve.rien')}</span>
      ) : null}
      {nouveaux.length > 0 ? (
        <>
          <button
            type="button"
            className={styles.boutonPrincipal}
            disabled={occupe || choisis.length === 0}
            onClick={() => void ajouter()}
          >
            {tn('import.releve.ajouter', choisis.length)}
          </button>
          <span className={styles.aide}>{t('import.releve.aide')}</span>
        </>
      ) : null}

      <button
        type="button"
        className={styles.lienDiscret}
        onClick={() => setColonnesOuvertes(!panneauOuvert)}
      >
        {panneauOuvert ? t('import.csv.colonnes.fermer') : t('import.csv.colonnes.modifier')}
      </button>
      <button type="button" className={styles.lienDiscret} onClick={onAutreFichier}>
        {t('import.autre')}
      </button>
    </section>
  );
}
