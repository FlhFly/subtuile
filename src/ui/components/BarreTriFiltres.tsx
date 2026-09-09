import { useState } from 'react';
import {
  CRITERES_DEFAUT,
  FILTRES_STATUT,
  TOUS,
  TOUTES,
  filtresActifs,
  type CriteresAccueil,
  type FiltreStatut,
} from '../../domain/tri';
import {
  CATEGORIES,
  type Categorie,
  type MoyenPaiement,
  type TriAccueil,
} from '../../domain/types';
import { useI18n } from '../contexts/I18nContext';
import { BasculeAffichage } from './BasculeAffichage';
import { Icone } from './Icone';
import type { ModeAffichage } from '../../domain/types';
import styles from './BarreTriFiltres.module.css';

/** Tris proposés en V1 ; « ordre personnalisé » arrive avec le drag & drop (EF-14, lot 4). */
const TRIS_V1: readonly TriAccueil[] = ['echeance', 'prix', 'nom', 'categorie'];

type Panneau = 'tri' | 'statut' | 'categorie' | 'paiement' | 'tag';

interface Option {
  cle: string;
  libelle: string;
  sous?: string | undefined;
  pastille?: string | undefined;
  actif: boolean;
  choisir: () => void;
}

interface Props {
  criteres: CriteresAccueil;
  onChange: (partiel: Partial<CriteresAccueil>) => void;
  compteursStatut: Record<FiltreStatut, number>;
  compteursCategorie: Partial<Record<Categorie, number>>;
  moyensPaiement: { moyen: MoyenPaiement; nombre: number }[];
  tags: { tag: string; nombre: number }[];
  affichage: ModeAffichage;
  onAffichage: (mode: ModeAffichage) => void;
}

/**
 * Barre de tri / filtres de l'accueil (EF-12, EF-15), reprise de la maquette :
 * bouton recherche, chips ouvrant un panneau d'options, bascule grille / liste.
 */
export function BarreTriFiltres({
  criteres,
  onChange,
  compteursStatut,
  compteursCategorie,
  moyensPaiement,
  tags,
  affichage,
  onAffichage,
}: Props) {
  const { t, tn } = useI18n();
  const [panneau, setPanneau] = useState<Panneau | null>(null);
  const [rechercheOuverte, setRechercheOuverte] = useState(criteres.recherche !== '');

  const basculer = (p: Panneau) => setPanneau((courant) => (courant === p ? null : p));
  const choisir = (partiel: Partial<CriteresAccueil>) => {
    onChange(partiel);
    setPanneau(null);
  };
  const nombre = (n: number) => tn('accueil.nombre', n);

  const options: Record<Panneau, { titre: string; options: Option[]; vide?: string }> = {
    tri: {
      titre: t('filtre.tri.titre'),
      options: TRIS_V1.map((tri) => ({
        cle: tri,
        libelle: t(`tri.${tri}`),
        sous: t(`tri.desc.${tri as Exclude<TriAccueil, 'personnalise'>}`),
        actif: criteres.tri === tri,
        choisir: () => choisir({ tri }),
      })),
    },
    statut: {
      titre: t('filtre.statut.titre'),
      options: FILTRES_STATUT.map((s) => ({
        cle: s,
        libelle: t(`filtre.statut.${s}`),
        sous: nombre(compteursStatut[s]),
        actif: criteres.statut === s,
        choisir: () => choisir({ statut: s }),
      })),
    },
    categorie: {
      titre: t('filtre.categorie.titre'),
      options: [
        {
          cle: TOUTES,
          libelle: t('filtre.categorie.toutes'),
          actif: criteres.categorie === TOUTES,
          choisir: () => choisir({ categorie: TOUTES }),
        },
        ...CATEGORIES.filter((c) => (compteursCategorie[c] ?? 0) > 0).map((c) => ({
          cle: c,
          libelle: t(`categorie.${c}`),
          sous: nombre(compteursCategorie[c] ?? 0),
          actif: criteres.categorie === c,
          choisir: () => choisir({ categorie: c }),
        })),
      ],
    },
    paiement: {
      titre: t('filtre.paiement.titre'),
      vide: moyensPaiement.length === 0 ? t('filtre.paiement.aucun') : undefined,
      options: [
        {
          cle: TOUS,
          libelle: t('filtre.paiement.tous'),
          actif: criteres.moyenPaiementId === TOUS,
          choisir: () => choisir({ moyenPaiementId: TOUS }),
        },
        ...moyensPaiement.map(({ moyen, nombre: n }) => ({
          cle: moyen.id,
          libelle: moyen.libelle,
          sous: nombre(n),
          pastille: moyen.couleur,
          actif: criteres.moyenPaiementId === moyen.id,
          choisir: () => choisir({ moyenPaiementId: moyen.id }),
        })),
      ],
    },
    tag: {
      titre: t('filtre.tag.titre'),
      vide: tags.length === 0 ? t('filtre.tag.aucun') : undefined,
      options: [
        {
          cle: TOUS,
          libelle: t('filtre.tag.tous'),
          actif: criteres.tag === TOUS,
          choisir: () => choisir({ tag: TOUS }),
        },
        ...tags.map(({ tag, nombre: n }) => ({
          cle: tag,
          libelle: tag,
          sous: nombre(n),
          actif: criteres.tag === tag,
          choisir: () => choisir({ tag }),
        })),
      ],
    },
  };

  const libelleChip = (p: Panneau): string => {
    switch (p) {
      case 'tri':
        return criteres.tri === CRITERES_DEFAUT.tri ? t('filtre.tri') : t(`tri.${criteres.tri}`);
      case 'statut':
        return criteres.statut === TOUS
          ? t('filtre.statut')
          : t(`filtre.statut.${criteres.statut}`);
      case 'categorie':
        return criteres.categorie === TOUTES
          ? t('filtre.categorie')
          : t(`categorie.${criteres.categorie}`);
      case 'paiement':
        return criteres.moyenPaiementId === TOUS
          ? t('filtre.paiement')
          : (moyensPaiement.find((m) => m.moyen.id === criteres.moyenPaiementId)?.moyen.libelle ??
              t('filtre.paiement'));
      case 'tag':
        return criteres.tag === TOUS ? t('filtre.tag') : criteres.tag;
    }
  };
  const chipActif = (p: Panneau): boolean => {
    if (panneau === p) return true;
    switch (p) {
      case 'tri':
        return criteres.tri !== CRITERES_DEFAUT.tri;
      case 'statut':
        return criteres.statut !== TOUS;
      case 'categorie':
        return criteres.categorie !== TOUTES;
      case 'paiement':
        return criteres.moyenPaiementId !== TOUS;
      case 'tag':
        return criteres.tag !== TOUS;
    }
  };

  const panneaux: Panneau[] = ['tri', 'statut', 'categorie', 'paiement', 'tag'];
  const ouvert = panneau ? options[panneau] : null;

  return (
    <div className={styles.barre}>
      <div className={styles.chips}>
        <button
          type="button"
          className={rechercheOuverte || criteres.recherche ? styles.rondActif : styles.rond}
          aria-label={t('recherche.ouvrir')}
          aria-pressed={rechercheOuverte}
          onClick={() => {
            setRechercheOuverte((o) => !o);
            if (rechercheOuverte) onChange({ recherche: '' });
          }}
        >
          <Icone nom="recherche" taille={15} />
        </button>
        {panneaux.map((p) => (
          <button
            key={p}
            type="button"
            className={chipActif(p) ? styles.chipActif : styles.chip}
            aria-expanded={panneau === p}
            onClick={() => basculer(p)}
          >
            {libelleChip(p)}
            <Icone nom="chevron" taille={12} />
          </button>
        ))}
        <div className={styles.bascule}>
          <BasculeAffichage valeur={affichage} onChange={onAffichage} />
        </div>
      </div>

      {rechercheOuverte ? (
        <div className={styles.recherche}>
          <Icone nom="recherche" taille={15} />
          <input
            type="search"
            className={styles.rechercheEntree}
            value={criteres.recherche}
            onChange={(e) => onChange({ recherche: e.target.value })}
            placeholder={t('recherche.ph')}
            aria-label={t('recherche.ouvrir')}
            autoFocus
          />
          <button
            type="button"
            className={styles.rechercheEffacer}
            aria-label={t('recherche.effacer')}
            onClick={() => {
              onChange({ recherche: '' });
              setRechercheOuverte(false);
            }}
          >
            <Icone nom="fermer" taille={14} />
          </button>
        </div>
      ) : null}

      {ouvert ? (
        <div className={styles.panneau} role="listbox" aria-label={ouvert.titre}>
          <span className={styles.panneauTitre}>{ouvert.titre}</span>
          {ouvert.vide ? <span className={styles.panneauVide}>{ouvert.vide}</span> : null}
          {ouvert.options.map((o) => (
            <button
              key={o.cle}
              type="button"
              role="option"
              aria-selected={o.actif}
              className={o.actif ? styles.optionActive : styles.option}
              onClick={o.choisir}
            >
              <span className={styles.optionTextes}>
                {o.pastille ? (
                  <span className={styles.pastille} style={{ background: o.pastille }} />
                ) : null}
                <span className={styles.optionLibelle}>{o.libelle}</span>
                {o.sous ? <span className={styles.optionSous}>{o.sous}</span> : null}
              </span>
              {o.actif ? (
                <span className={styles.coche}>
                  <Icone nom="coche" taille={12} />
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      {filtresActifs(criteres) ? (
        <button
          type="button"
          className={styles.reinitialiser}
          onClick={() => {
            onChange({ ...CRITERES_DEFAUT, tri: criteres.tri });
            setRechercheOuverte(false);
          }}
        >
          {t('filtre.reinitialiser')}
        </button>
      ) : null}
    </div>
  );
}
