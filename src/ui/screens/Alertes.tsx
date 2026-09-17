import type { Alerte, NiveauAlerte } from '../../domain/alertes';
import { EnTete } from '../components/EnTete';
import { Icone } from '../components/Icone';
import { useAlertes } from '../contexts/AlertesContext';
import { useI18n } from '../contexts/I18nContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { useToast } from '../contexts/ToastContext';
import { useMoyensPaiement } from '../hooks/useMoyensPaiement';
import { libellesAlerte } from '../libellesAlertes';
import styles from './Alertes.module.css';

interface Props {
  onRetour: () => void;
  /** ouvre la fiche concernée, ou les moyens de paiement pour une carte */
  onOuvrir: (alerte: Alerte) => void;
}

const CLASSE_NIVEAU: Record<NiveauAlerte, string> = {
  urg: styles.niveauUrg!,
  warn: styles.niveauWarn!,
  trial: styles.niveauTrial!,
};

/**
 * Centre d'alertes (EF-31, §5.4) : liste des alertes du jour, « tout marquer
 * lu », ouverture d'une alerte qui la marque lue, état vide « tout est calme »,
 * rappel du fonctionnement sans push.
 */
export function Alertes({ onRetour, onOuvrir }: Props) {
  const i18n = useI18n();
  const { t } = i18n;
  const { alertes, nonLues, marquerToutesLues, marquerLue } = useAlertes();
  const { preferences } = usePreferences();
  const moyens = useMoyensPaiement();
  const toast = useToast();

  const toutLu = () => {
    marquerToutesLues();
    toast.afficher(t('alertes.toutLu.fait'));
  };

  return (
    <div className={styles.ecran}>
      <EnTete
        titre={t('alertes.titre')}
        retour={{ icone: 'retour', libelle: t('nav.retour'), onClick: onRetour }}
        complement={
          nonLues > 0 ? (
            <button type="button" className={styles.toutLu} onClick={toutLu}>
              {t('alertes.toutLu')}
            </button>
          ) : null
        }
      />

      {alertes.length > 0 ? (
        <ul className={styles.liste}>
          {alertes.map((a) => {
            const moyen =
              a.type === 'echeance' && a.moyenPaiementId
                ? moyens.get(a.moyenPaiementId)?.libelle
                : undefined;
            const l = libellesAlerte(i18n, a, moyen);
            return (
              <li key={a.cle}>
                <button
                  type="button"
                  className={a.lue ? styles.ligneLue : styles.ligne}
                  onClick={() => {
                    marquerLue(a);
                    onOuvrir(a);
                  }}
                >
                  <span className={`${styles.pastille} ${CLASSE_NIVEAU[a.niveau]}`}>
                    {l.pastille}
                  </span>
                  <span className={styles.textes}>
                    <span className={styles.titre}>{l.titre}</span>
                    <span className={styles.sous}>{l.sousTitre}</span>
                  </span>
                  <span className={styles.chevron}>
                    <Icone nom="chevronDroit" taille={14} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <section className={styles.vide}>
          <span className={styles.videIcone} aria-hidden="true">
            <Icone nom="coche" taille={24} />
          </span>
          <h2 className={styles.videTitre}>{t('alertes.vide.titre')}</h2>
          <p className={styles.videTexte}>{t('alertes.vide.texte')}</p>
        </section>
      )}

      <p className={styles.note}>
        {t('alertes.note', {
          e: preferences.alertes.echeanceJours,
          s: preferences.alertes.essaiJours,
          p: preferences.alertes.preavisJours,
          c: preferences.alertes.carteMois,
        })}
      </p>
    </div>
  );
}
