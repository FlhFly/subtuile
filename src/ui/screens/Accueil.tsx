import { useMemo } from 'react';
import { aujourdhui, montantAnnuel, montantMensuel, prixEffectif } from '../../domain/dates';
import { nonArchives, trierAbonnements } from '../../domain/tri';
import { modeleTuile } from '../../domain/tuile';
import { BasculeAffichage } from '../components/BasculeAffichage';
import { Icone } from '../components/Icone';
import { Tuile } from '../components/Tuile';
import { useI18n } from '../contexts/I18nContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { useAbonnements } from '../hooks/useAbonnements';
import { useCatalogue } from '../hooks/useCatalogue';
import { useMoyensPaiement } from '../hooks/useMoyensPaiement';
import styles from './Accueil.module.css';

interface Props {
  onOuvrirReglages: () => void;
  /** ouverture de la fiche (EF-13) — branchée à l'étape 6 */
  onOuvrirAbonnement?: (id: string) => void;
}

/**
 * Accueil (§7.1) : total mensuel normalisé en tête, bascule grille / liste
 * (EF-12b), tuiles avec compteur et code couleur (EF-10, EF-11), tri par
 * échéance. Tri et filtres explicites arrivent à l'étape 7.
 */
export function Accueil({ onOuvrirReglages, onOuvrirAbonnement }: Props) {
  const { t, tn, montant } = useI18n();
  const { preferences, modifier } = usePreferences();
  const { abonnements, chargement } = useAbonnements();
  const moyensPaiement = useMoyensPaiement();
  const { parId: services } = useCatalogue();
  const jour = aujourdhui();

  const visibles = useMemo(
    () => trierAbonnements(nonArchives(abonnements), 'echeance', jour),
    [abonnements, jour],
  );
  const actifs = visibles.filter((a) => a.statut.type === 'actif');
  const totalMensuel = actifs.reduce(
    (s, a) => s + montantMensuel(prixEffectif(a), a.periodicite),
    0,
  );
  const totalAnnuel = actifs.reduce((s, a) => s + montantAnnuel(prixEffectif(a), a.periodicite), 0);
  const estime = actifs.some((a) => a.montantEstime);
  const marquer = (valeur: number) =>
    estime ? t('montant.estime', { montant: montant(valeur) }) : montant(valeur);

  const tuiles = useMemo(
    () =>
      visibles.map((a) =>
        modeleTuile(
          a,
          jour,
          a.moyenPaiementId ? moyensPaiement.get(a.moyenPaiementId) : undefined,
          a.serviceId ? services.get(a.serviceId) : undefined,
        ),
      ),
    [visibles, jour, moyensPaiement, services],
  );

  const ouvrir = onOuvrirAbonnement ?? (() => undefined);

  return (
    <div className={styles.ecran}>
      <header className={styles.entete}>
        <div className={styles.total}>
          <span className={styles.legende}>
            {t('accueil.totalMensuel')}
            {chargement ? '' : ` · ${tn('accueil.actifs', actifs.length)}`}
          </span>
          <span className={styles.montant}>{chargement ? '…' : marquer(totalMensuel)}</span>
          <span className={styles.legende}>
            {chargement
              ? t('commun.chargement')
              : t('accueil.parAn', { montant: marquer(totalAnnuel) })}
          </span>
        </div>
        <button
          type="button"
          className={styles.boutonRond}
          onClick={onOuvrirReglages}
          aria-label={t('nav.reglages')}
        >
          <Icone nom="reglages" />
        </button>
      </header>

      <div className={styles.barre}>
        <span className={styles.compte}>
          {chargement ? '' : tn('accueil.nombre', visibles.length)}
        </span>
        <BasculeAffichage
          valeur={preferences.affichage}
          onChange={(affichage) => modifier({ affichage })}
        />
      </div>

      {!chargement && visibles.length === 0 ? (
        <section className={styles.vide}>
          <span className={styles.videIcone} aria-hidden="true">
            +
          </span>
          <h2 className={styles.videTitre}>{t('accueil.vide.titre')}</h2>
          <p className={styles.videTexte}>{t('accueil.vide.texte')}</p>
          <p className={styles.videTexte}>{t('accueil.vide.demo')}</p>
        </section>
      ) : null}

      {!chargement && visibles.length > 0 ? (
        <ul
          className={preferences.affichage === 'grille' ? styles.grille : styles.liste}
          aria-label={t('accueil.titre')}
        >
          {tuiles.map((m) => (
            <li key={m.id} className={styles.item}>
              <Tuile modele={m} mode={preferences.affichage} onOuvrir={ouvrir} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
