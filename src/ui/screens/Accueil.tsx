import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { enregistrerOrdre } from '../../data/services/abonnements';
import { aujourdhui } from '../../domain/dates';
import { totaux } from '../../domain/finances';
import { appliquerOrdre, deplacer, ordonnerSelon } from '../../domain/ordre';
import {
  appliquerCriteres,
  compterParStatut,
  CRITERES_DEFAUT,
  filtresActifs,
  nonArchives,
  tagsDisponibles,
  trierAbonnements,
  type CriteresAccueil,
} from '../../domain/tri';
import { modeleTuile } from '../../domain/tuile';
import type { Categorie } from '../../domain/types';
import { BarreTriFiltres } from '../components/BarreTriFiltres';
import { Icone } from '../components/Icone';
import { Tuile } from '../components/Tuile';
import { useAlertes } from '../contexts/AlertesContext';
import { useI18n } from '../contexts/I18nContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { useStorage } from '../contexts/StorageContext';
import { useToast } from '../contexts/ToastContext';
import { useAbonnements } from '../hooks/useAbonnements';
import { useCatalogue } from '../hooks/useCatalogue';
import { useConversion } from '../hooks/useConversion';
import { useMoyensPaiement } from '../hooks/useMoyensPaiement';
import styles from './Accueil.module.css';

interface Props {
  /** ouverture de la fiche (EF-13) */
  onOuvrirAbonnement: (id: string) => void;
  /** création (EF-01) */
  onAjouter: () => void;
  /** centre d'alertes (EF-31) */
  onOuvrirAlertes: () => void;
}

type Filtres = Omit<CriteresAccueil, 'tri'>;
const FILTRES_DEFAUT: Filtres = {
  statut: CRITERES_DEFAUT.statut,
  categorie: CRITERES_DEFAUT.categorie,
  moyenPaiementId: CRITERES_DEFAUT.moyenPaiementId,
  tag: CRITERES_DEFAUT.tag,
  recherche: CRITERES_DEFAUT.recherche,
};

/** Déplacement au clavier (EF-14) : gauche / droite d'une case, haut / bas d'une rangée. */
const PAS_CLAVIER: Record<string, (colonnes: number) => number> = {
  ArrowLeft: () => -1,
  ArrowRight: () => 1,
  ArrowUp: (colonnes) => -colonnes,
  ArrowDown: (colonnes) => colonnes,
};

/** Défilement automatique pendant le glisser (EF-14) : bande de 90 px en haut et au-dessus de la barre basse. */
const BORD_DEFILEMENT = 90;
const HAUTEUR_BARRE = 86;
const PAS_DEFILEMENT = 10;
function directionDefilement(y: number): -1 | 0 | 1 {
  if (y < BORD_DEFILEMENT) return -1;
  if (y > window.innerHeight - HAUTEUR_BARRE - BORD_DEFILEMENT) return 1;
  return 0;
}

/** Indice de la tuile sous un point de l'écran (attribut `data-index` du `<li>`). */
function indexSous(x: number, y: number): number | null {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-index]');
  const index = el?.dataset.index;
  return index === undefined ? null : Number(index);
}

/**
 * Accueil (§7.1) : total mensuel normalisé en tête, cloche du centre
 * d'alertes avec badge (EF-31), barre de tri / filtres / recherche (EF-12,
 * EF-15), bascule grille / liste (EF-12b), tuiles avec compteur et code
 * couleur (EF-10, EF-11), mode réorganisation des tuiles (EF-14). Le tri est
 * persisté dans les préférences ; les filtres et la recherche valent pour la
 * session.
 */
export function Accueil({ onOuvrirAbonnement, onAjouter, onOuvrirAlertes }: Props) {
  const { t, tn, montant } = useI18n();
  const { preferences, modifier } = usePreferences();
  const { abonnements, chargement } = useAbonnements();
  const { devise, convertir } = useConversion();
  const moyensPaiement = useMoyensPaiement();
  const { parId: services } = useCatalogue();
  const { nonLues } = useAlertes();
  const storage = useStorage();
  const toast = useToast();
  const [filtres, setFiltres] = useState<Filtres>(FILTRES_DEFAUT);
  /** EF-14 : mode réorganisation ; null = inactif, sinon l'ordre courant des tuiles visibles */
  const [reorg, setReorg] = useState<string[] | null>(null);
  const [enDeplacement, setEnDeplacement] = useState<string | null>(null);
  const glisse = useRef<string | null>(null);
  const pointeur = useRef<{ x: number; y: number } | null>(null);
  const animation = useRef<number | null>(null);
  const idsCourants = useRef<string[]>([]);
  const jour = aujourdhui();

  const tri = preferences.tri;
  const criteres = useMemo<CriteresAccueil>(() => ({ ...filtres, tri }), [filtres, tri]);

  const visibles = useMemo(
    () => appliquerCriteres(abonnements, criteres, jour),
    [abonnements, criteres, jour],
  );

  /**
   * Choisir « Ordre personnalisé » ouvre le mode réorganisation (maquette) :
   * filtres et recherche remis à zéro pour voir toute la liste. Au premier
   * passage, l'ordre de départ est celui affiché à cet instant.
   */
  const entrerReorganisation = () => {
    const idsAffiches = visibles.map((a) => a.id);
    const premiereFois = abonnements.every((a) => a.ordre === null);
    const depart = premiereFois ? appliquerOrdre(abonnements, idsAffiches, jour) : abonnements;
    if (premiereFois) void enregistrerOrdre(storage, abonnements, idsAffiches, jour);
    modifier({ tri: 'personnalise' });
    setFiltres(FILTRES_DEFAUT);
    setReorg(trierAbonnements(nonArchives(depart), 'personnalise', jour).map((a) => a.id));
  };

  const changerCriteres = (partiel: Partial<CriteresAccueil>) => {
    const { tri: nouveauTri, ...reste } = partiel;
    if (nouveauTri === 'personnalise' && Object.keys(reste).length === 0) {
      entrerReorganisation();
      return;
    }
    if (nouveauTri !== undefined) {
      modifier({ tri: nouveauTri });
      if (nouveauTri !== 'personnalise') setReorg(null);
    }
    if (Object.keys(reste).length > 0) setFiltres((f) => ({ ...f, ...reste }));
  };

  /* En mode réorganisation, l'ordre local prime le temps que l'enregistrement revienne du stockage */
  const affiches = useMemo(
    () => (reorg ? ordonnerSelon(visibles, reorg) : visibles),
    [visibles, reorg],
  );
  const idsAffiches = affiches.map((a) => a.id);
  useEffect(() => {
    idsCourants.current = idsAffiches;
  });

  const persisterOrdre = (ids: string[]) => {
    setReorg(ids);
    void enregistrerOrdre(storage, abonnements, ids, jour);
  };
  const debuterGlisse = (e: PointerEvent<HTMLUListElement>) => {
    if (!reorg || e.button !== 0) return;
    const index = indexSous(e.clientX, e.clientY);
    const id = index === null ? undefined : idsAffiches[index];
    if (id === undefined) return;
    glisse.current = id;
    setEnDeplacement(id);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  /* Près d'un bord, la page défile toute seule et la tuile suit le doigt (boucle d'animation) */
  const defiler = () => {
    const p = pointeur.current;
    const id = glisse.current;
    const direction = p && id !== null ? directionDefilement(p.y) : 0;
    if (!p || id === null || direction === 0) {
      animation.current = null;
      return;
    }
    window.scrollBy(0, direction * PAS_DEFILEMENT);
    const ids = idsCourants.current;
    const cible = indexSous(p.x, p.y);
    const de = ids.indexOf(id);
    if (cible !== null && de >= 0 && cible !== de) setReorg(deplacer(ids, de, cible));
    animation.current = requestAnimationFrame(defiler);
  };
  const poursuivreGlisse = (e: PointerEvent<HTMLUListElement>) => {
    const id = glisse.current;
    if (id === null) return;
    pointeur.current = { x: e.clientX, y: e.clientY };
    if (animation.current === null && directionDefilement(e.clientY) !== 0) {
      animation.current = requestAnimationFrame(defiler);
    }
    const cible = indexSous(e.clientX, e.clientY);
    const de = idsAffiches.indexOf(id);
    if (cible === null || de < 0 || cible === de) return;
    setReorg(deplacer(idsAffiches, de, cible));
  };
  const finirGlisse = (e: PointerEvent<HTMLUListElement>) => {
    if (glisse.current === null) return;
    glisse.current = null;
    pointeur.current = null;
    if (animation.current !== null) cancelAnimationFrame(animation.current);
    animation.current = null;
    setEnDeplacement(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    persisterOrdre(idsAffiches);
  };
  const deplacerAuClavier = (e: KeyboardEvent<HTMLUListElement>) => {
    const pas = PAS_CLAVIER[e.key];
    const index = (e.target as HTMLElement).closest<HTMLElement>('[data-index]')?.dataset.index;
    if (!reorg || pas === undefined || index === undefined) return;
    const de = Number(index);
    const vers = de + pas(preferences.affichage === 'grille' ? 2 : 1);
    if (vers < 0 || vers >= idsAffiches.length) return;
    e.preventDefault();
    persisterOrdre(deplacer(idsAffiches, de, vers));
  };
  const terminerReorganisation = () => {
    setReorg(null);
    toast.afficher(t('toast.ordreEnregistre'));
  };

  /* Totaux des abonnements payants, mêmes règles que l'écran Finances (EF-40), indépendamment des filtres */
  const actifs = abonnements.filter((a) => a.statut.type === 'actif');
  const total = totaux(abonnements, jour, convertir);
  const totalMensuel = total.mensuel;
  const totalAnnuel = total.annuel;
  const estime = total.estime;
  const marquer = (valeur: number) =>
    estime ? t('montant.estime', { montant: montant(valeur, devise) }) : montant(valeur, devise);

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
      affiches.map((a) =>
        modeleTuile(
          a,
          jour,
          a.moyenPaiementId ? moyensPaiement.get(a.moyenPaiementId) : undefined,
          a.serviceId ? services.get(a.serviceId) : undefined,
        ),
      ),
    [affiches, jour, moyensPaiement, services],
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
          <button
            type="button"
            className={styles.montantBouton}
            aria-pressed={preferences.montantsMasques}
            aria-label={t(
              preferences.montantsMasques
                ? 'accueil.montants.afficher'
                : 'accueil.montants.masquer',
            )}
            onClick={() => modifier({ montantsMasques: !preferences.montantsMasques })}
          >
            <span className={styles.montant}>{chargement ? '…' : marquer(totalMensuel)}</span>
            {preferences.montantsMasques ? (
              <span className={styles.oeil} aria-hidden="true">
                <Icone nom="oeilBarre" taille={18} epaisseur={2.2} />
              </span>
            ) : null}
          </button>
          <span className={styles.legende}>
            {chargement
              ? t('commun.chargement')
              : t('accueil.parAn', { montant: marquer(totalAnnuel) })}
          </span>
        </div>
        <button
          type="button"
          className={styles.cloche}
          onClick={onOuvrirAlertes}
          aria-label={nonLues > 0 ? tn('alertes.nonLues', nonLues) : t('alertes.titre')}
        >
          <Icone nom="cloche" />
          {nonLues > 0 ? (
            <span className={styles.badge} aria-hidden="true">
              {nonLues}
            </span>
          ) : null}
        </button>
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

      {reorg ? (
        <div className={styles.reorg} role="status">
          <span className={styles.reorgAide}>{t('accueil.reorg.aide')}</span>
          <button type="button" className={styles.reorgTerminer} onClick={terminerReorganisation}>
            {t('accueil.reorg.terminer')}
          </button>
        </div>
      ) : null}

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
          onPointerDown={debuterGlisse}
          onPointerMove={poursuivreGlisse}
          onPointerUp={finirGlisse}
          onPointerCancel={finirGlisse}
          onKeyDown={deplacerAuClavier}
        >
          {tuiles.map((m, i) => (
            <li
              key={m.id}
              data-index={i}
              className={
                enDeplacement === m.id ? `${styles.item} ${styles.itemEnCours}` : styles.item
              }
            >
              <Tuile
                modele={m}
                mode={preferences.affichage}
                onOuvrir={onOuvrirAbonnement}
                reorganisation={reorg !== null}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
