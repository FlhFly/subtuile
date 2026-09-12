import type { CSSProperties } from 'react';
import { couleurCompteur, type ModeleTuile, type SousTitre } from '../../domain/tuile';
import type { Devise, ModeAffichage } from '../../domain/types';
import { useI18n, type I18n } from '../contexts/I18nContext';
import { libelleCompteur } from '../libelles';
import styles from './Tuile.module.css';

interface Props {
  modele: ModeleTuile;
  mode: ModeAffichage;
  onOuvrir: (id: string) => void;
  /** EF-14 : mode réorganisation, la tuile se déplace au lieu de s'ouvrir */
  reorganisation?: boolean;
}

/**
 * Tuile d'abonnement (EF-10, EF-11) en mode grille ou ligne (EF-12b) :
 * logo en initiales, nom, badge « partagé », badge canal, sous-titre prix,
 * pastille du moyen de paiement, chip compteur coloré. En mode réorganisation
 * (EF-14), la tuile tremble et se laisse glisser au lieu de s'ouvrir.
 */
export function Tuile({ modele, mode, onOuvrir, reorganisation = false }: Props) {
  const i18n = useI18n();
  const { t } = i18n;
  const grille = mode === 'grille';
  const classes = [
    grille ? styles.tuile : styles.ligne,
    styles[modele.variante],
    modele.essai ? styles.essai : '',
    modele.archive ? styles.archive : '',
    reorganisation ? styles.reorg : '',
  ]
    .filter(Boolean)
    .join(' ');
  const style = { '--tuile-couleur': modele.couleur } as CSSProperties;
  const chip = `${styles.chip} ${styles[`chip_${couleurCompteur(modele.compteur)}`] ?? ''}`;

  const logo = (
    <span className={styles.logo} aria-hidden="true">
      {modele.initiales}
    </span>
  );
  const paiement = modele.paiement ? (
    <span className={styles.paiement}>
      <span className={styles.pastille} style={{ background: modele.paiement.couleur }} />
      {t(`paiement.court.${modele.paiement.type}`)}
    </span>
  ) : null;
  const nom = (
    <span className={styles.nom}>
      {modele.nom}
      {modele.partage ? <span className={styles.badge}>{t('tuile.partage')}</span> : null}
      {modele.canal !== 'direct' ? (
        <span className={styles.badge}>{t(`canal.${modele.canal}`)}</span>
      ) : null}
    </span>
  );
  const sous = (
    <span className={styles.sous}>{libelleSousTitre(i18n, modele.sousTitre, modele.devise)}</span>
  );
  const compteur = <span className={chip}>{libelleCompteur(i18n, modele.compteur)}</span>;

  return (
    <button
      type="button"
      className={classes}
      style={style}
      onClick={reorganisation ? undefined : () => onOuvrir(modele.id)}
      aria-label={t(reorganisation ? 'accueil.reorg.deplacer' : 'accueil.ouvrir', {
        nom: modele.nom,
      })}
    >
      {grille ? (
        <>
          <span className={styles.rangee}>
            {logo}
            {paiement}
          </span>
          <span className={styles.corps}>
            {nom}
            {sous}
          </span>
          {compteur}
        </>
      ) : (
        <>
          {logo}
          <span className={styles.corps}>
            {nom}
            <span className={styles.sousLigne}>
              {sous}
              {paiement}
            </span>
          </span>
          {compteur}
        </>
      )}
    </button>
  );
}

function libelleSousTitre(i18n: I18n, s: SousTitre, devise: Devise): string {
  const { t, periodicite } = i18n;
  const montant = (v: number) => i18n.montant(v, devise);
  switch (s.type) {
    case 'usage':
      return s.plafond === null
        ? t('tuile.sous.usage')
        : t('tuile.sous.usagePlafond', { montant: montant(s.plafond) });
    case 'essai':
      return t('tuile.sous.essai', {
        montant: montant(s.prixApres),
        periodicite: periodicite(s.periodicite),
      });
    case 'partage':
      return t('tuile.sous.partage', {
        montant: montant(s.partPayee),
        periodicite: periodicite(s.periodicite),
      });
    case 'prix': {
      const m = s.estime ? t('montant.estime', { montant: montant(s.prix) }) : montant(s.prix);
      return `${m} ${periodicite(s.periodicite)}`;
    }
  }
}
