import type { Alerte, NiveauAlerte } from '../../domain/alertes';
import { EnTete } from '../components/EnTete';
import { Icone } from '../components/Icone';
import { useAlertes } from '../contexts/AlertesContext';
import { enregistrerAbonnement } from '../../data/services/abonnements';
import { aujourdhui } from '../../domain/dates';
import { annulerConfirmation, confirmerPaiement, montantEcheance } from '../../domain/paiements';
import { useI18n } from '../contexts/I18nContext';
import { useStorage } from '../contexts/StorageContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { useToast } from '../contexts/ToastContext';
import { useAbonnements } from '../hooks/useAbonnements';
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
  const storage = useStorage();
  const { abonnements } = useAbonnements();

  /* EF-76 : « Payé » confirme l'échéance de l'alerte, qui disparaît ; annulable depuis le toast */
  const marquerPaye = async (a: Extract<Alerte, { type: 'echeance' }>) => {
    const abo = abonnements.find((x) => x.id === a.abonnementId);
    if (!abo) return;
    const jour = aujourdhui();
    marquerLue(a);
    await enregistrerAbonnement(
      storage,
      confirmerPaiement(abo, a.date, montantEcheance(abo, a.date, jour), jour),
      jour,
    );
    toast.afficherAvecAction(t('toast.paiementConfirme', { date: i18n.date(a.date) }), {
      libelle: t('toast.annuler'),
      executer: async () => {
        const courant = await storage.abonnements.lire(abo.id);
        if (courant)
          await enregistrerAbonnement(storage, annulerConfirmation(courant, a.date), jour);
      },
    });
  };

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
              <li key={a.cle} className={styles.item}>
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
                {a.type === 'echeance' ? (
                  <button
                    type="button"
                    className={styles.payer}
                    onClick={() => void marquerPaye(a)}
                    aria-label={t('alertes.payer.aria', { nom: a.nom, date: i18n.date(a.date) })}
                  >
                    <Icone nom="coche" taille={14} />
                    {t('alertes.payer')}
                  </button>
                ) : null}
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
