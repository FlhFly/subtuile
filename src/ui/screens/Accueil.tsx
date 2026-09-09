import { montantMensuel, prixEffectif } from '../../domain/dates';
import { EnTete } from '../components/EnTete';
import { useI18n } from '../contexts/I18nContext';
import { useAbonnements } from '../hooks/useAbonnements';
import styles from './Accueil.module.css';

interface Props {
  onOuvrirReglages: () => void;
}

/**
 * Accueil — squelette de l'étape 4 : en-tête avec total mensuel normalisé,
 * état vide, liste provisoire. La grille de tuiles (EF-10) arrive à l'étape 5.
 */
export function Accueil({ onOuvrirReglages }: Props) {
  const { t, tn, montant, periodicite } = useI18n();
  const { abonnements, chargement } = useAbonnements();

  const actifs = abonnements.filter((a) => a.statut.type !== 'archive');
  const totalMensuel = actifs.reduce(
    (s, a) => s + montantMensuel(prixEffectif(a), a.periodicite),
    0,
  );
  const estime = actifs.some((a) => a.montantEstime);
  const totalAffiche = estime
    ? t('montant.estime', { montant: montant(totalMensuel) })
    : montant(totalMensuel);

  return (
    <div className={styles.ecran}>
      <EnTete
        titre={t('accueil.titre')}
        sousTitre={
          chargement
            ? t('commun.chargement')
            : `${tn('accueil.nombre', actifs.length)} · ${t('accueil.totalMensuel')} ${totalAffiche}`
        }
        actions={[{ icone: 'reglages', libelle: t('nav.reglages'), onClick: onOuvrirReglages }]}
      />

      {!chargement && actifs.length === 0 ? (
        <section className={styles.vide}>
          <h2 className={styles.videTitre}>{t('accueil.vide.titre')}</h2>
          <p className={styles.videTexte}>{t('accueil.vide.texte')}</p>
          <p className={styles.videTexte}>{t('accueil.vide.demo')}</p>
        </section>
      ) : null}

      {!chargement && actifs.length > 0 ? (
        <ul className={styles.liste} aria-label={t('accueil.titre')}>
          {actifs.map((a) => (
            <li key={a.id} className={styles.ligne}>
              <span className={styles.nom}>{a.nom}</span>
              <span className={styles.detail}>
                {montant(prixEffectif(a))} {periodicite(a.periodicite)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
