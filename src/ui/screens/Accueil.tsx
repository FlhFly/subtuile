import { useMemo, useState } from 'react';
import { aujourdhui, montantAnnuel, montantMensuel, prixEffectif } from '../../domain/dates';
import {
  appliquerCriteres,
  compterParStatut,
  CRITERES_DEFAUT,
  filtresActifs,
  nonArchives,
  tagsDisponibles,
  type CriteresAccueil,
} from '../../domain/tri';
import { modeleTuile } from '../../domain/tuile';
import type { Categorie } from '../../domain/types';
import { BarreTriFiltres } from '../components/BarreTriFiltres';
import { Tuile } from '../components/Tuile';
import { useI18n } from '../contexts/I18nContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { useAbonnements } from '../hooks/useAbonnements';
import { useCatalogue } from '../hooks/useCatalogue';
import { useMoyensPaiement } from '../hooks/useMoyensPaiement';
import styles from './Accueil.module.css';

interface Props {
  /** ouverture de la fiche (EF-13) */
  onOuvrirAbonnement: (id: string) => void;
  /** création (EF-01) */
  onAjouter: () => void;
}

type Filtres = Omit<CriteresAccueil, 'tri'>;
const FILTRES_DEFAUT: Filtres = {
  statut: CRITERES_DEFAUT.statut,
  categorie: CRITERES_DEFAUT.categorie,
  moyenPaiementId: CRITERES_DEFAUT.moyenPaiementId,
  tag: CRITERES_DEFAUT.tag,
  recherche: CRITERES_DEFAUT.recherche,
};

/**
 * Accueil (§7.1) : total mensuel normalisé en tête, barre de tri / filtres /
 * recherche (EF-12, EF-15), bascule grille / liste (EF-12b), tuiles avec
 * compteur et code couleur (EF-10, EF-11). Le tri est persisté dans les
 * préférences ; les filtres et la recherche valent pour la session.
 */
export function Accueil({ onOuvrirAbonnement, onAjouter }: Props) {
  const { t, tn, montant } = useI18n();
  const { preferences, modifier } = usePreferences();
  const { abonnements, chargement } = useAbonnements();
  const moyensPaiement = useMoyensPaiement();
  const { parId: services } = useCatalogue();
  const [filtres, setFiltres] = useState<Filtres>(FILTRES_DEFAUT);
  const jour = aujourdhui();

  const tri = preferences.tri;
  const criteres = useMemo<CriteresAccueil>(() => ({ ...filtres, tri }), [filtres, tri]);
  const changerCriteres = (partiel: Partial<CriteresAccueil>) => {
    const { tri: nouveauTri, ...reste } = partiel;
    if (nouveauTri !== undefined) modifier({ tri: nouveauTri });
    if (Object.keys(reste).length > 0) setFiltres((f) => ({ ...f, ...reste }));
  };

  const visibles = useMemo(
    () => appliquerCriteres(abonnements, criteres, jour),
    [abonnements, criteres, jour],
  );

  /* Totaux sur tous les abonnements actifs, indépendamment des filtres */
  const actifs = abonnements.filter((a) => a.statut.type === 'actif');
  const totalMensuel = actifs.reduce(
    (s, a) => s + montantMensuel(prixEffectif(a), a.periodicite),
    0,
  );
  const totalAnnuel = actifs.reduce((s, a) => s + montantAnnuel(prixEffectif(a), a.periodicite), 0);
  const estime = actifs.some((a) => a.montantEstime);
  const marquer = (valeur: number) =>
    estime ? t('montant.estime', { montant: montant(valeur) }) : montant(valeur);

  const compteursStatut = useMemo(() => compterParStatut(abonnements), [abonnements]);
  const compteursCategorie = useMemo(() => {
    const c: Partial<Record<Categorie, number>> = {};
    for (const a of nonArchives(abonnements)) c[a.categorie] = (c[a.categorie] ?? 0) + 1;
    return c;
  }, [abonnements]);
  const moyensAvecNombre = useMemo(
    () =>
      [...moyensPaiement.values()].map((moyen) => ({
        moyen,
        nombre: nonArchives(abonnements).filter((a) => a.moyenPaiementId === moyen.id).length,
      })),
    [moyensPaiement, abonnements],
  );
  const tagsAvecNombre = useMemo(
    () =>
      tagsDisponibles(nonArchives(abonnements)).map((tag) => ({
        tag,
        nombre: nonArchives(abonnements).filter((a) =>
          a.tags.some((x) => x.toLowerCase() === tag.toLowerCase()),
        ).length,
      })),
    [abonnements],
  );

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

  const aucunAbonnement = nonArchives(abonnements).length === 0 && !filtresActifs(criteres);
  const recherche = criteres.recherche.trim() !== '';

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
      </header>

      <BarreTriFiltres
        criteres={criteres}
        onChange={changerCriteres}
        compteursStatut={compteursStatut}
        compteursCategorie={compteursCategorie}
        moyensPaiement={moyensAvecNombre}
        tags={tagsAvecNombre}
        affichage={preferences.affichage}
        onAffichage={(affichage) => modifier({ affichage })}
      />

      {!chargement && visibles.length > 0 ? (
        <span className={styles.compte}>{tn('accueil.nombre', visibles.length)}</span>
      ) : null}

      {!chargement && aucunAbonnement ? (
        <section className={styles.vide}>
          <span className={styles.videIcone} aria-hidden="true">
            +
          </span>
          <h2 className={styles.videTitre}>{t('accueil.vide.titre')}</h2>
          <p className={styles.videTexte}>{t('accueil.vide.texte')}</p>
          <p className={styles.videTexte}>{t('accueil.vide.demo')}</p>
          <button type="button" className={styles.cta} onClick={onAjouter}>
            {t('nav.ajouter')}
          </button>
        </section>
      ) : null}

      {!chargement && !aucunAbonnement && visibles.length === 0 ? (
        <section className={styles.vide}>
          <h2 className={styles.videTitre}>
            {t(recherche ? 'accueil.vide.recherche.titre' : 'accueil.vide.filtres.titre')}
          </h2>
          <p className={styles.videTexte}>
            {t(recherche ? 'accueil.vide.recherche.texte' : 'accueil.vide.filtres.texte')}
          </p>
        </section>
      ) : null}

      {!chargement && visibles.length > 0 ? (
        <ul
          className={preferences.affichage === 'grille' ? styles.grille : styles.liste}
          aria-label={t('accueil.titre')}
        >
          {tuiles.map((m) => (
            <li key={m.id} className={styles.item}>
              <Tuile modele={m} mode={preferences.affichage} onOuvrir={onOuvrirAbonnement} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
