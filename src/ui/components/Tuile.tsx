import type { CSSProperties } from 'react';
import {
  couleurCompteur,
  type Compteur,
  type ModeleTuile,
  type SousTitre,
} from '../../domain/tuile';
import type { ModeAffichage } from '../../domain/types';
import { useI18n, type I18n } from '../contexts/I18nContext';
import styles from './Tuile.module.css';

interface Props {
  modele: ModeleTuile;
  mode: ModeAffichage;
  onOuvrir: (id: string) => void;
}

/**
 * Tuile d'abonnement (EF-10, EF-11) en mode grille ou ligne (EF-12b) :
 * logo en initiales, nom, badge « partagé », badge canal, sous-titre prix,
 * pastille du moyen de paiement, chip compteur coloré.
 */
export function Tuile({ modele, mode, onOuvrir }: Props) {
  const i18n = useI18n();
  const { t } = i18n;
  const grille = mode === 'grille';
  const classes = [
    grille ? styles.tuile : styles.ligne,
    styles[modele.variante],
    modele.essai ? styles.essai : '',
    modele.archive ? styles.archive : '',
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
  const sous = <span className={styles.sous}>{libelleSousTitre(i18n, modele.sousTitre)}</span>;
  const compteur = <span className={chip}>{libelleCompteur(i18n, modele.compteur)}</span>;

  return (
    <button
      type="button"
      className={classes}
      style={style}
      onClick={() => onOuvrir(modele.id)}
      aria-label={t('accueil.ouvrir', { nom: modele.nom })}
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

function libelleSousTitre(i18n: I18n, s: SousTitre): string {
  const { t, montant, periodicite } = i18n;
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

function libelleCompteur(i18n: I18n, c: Compteur): string {
  const { t, date } = i18n;
  switch (c.type) {
    case 'echeance':
      if (c.jours === 0) return t('compteur.echeance.aujourdhui', { date: date(c.date) });
      if (c.jours < 0) return t('compteur.echeance.depasse', { n: -c.jours, date: date(c.date) });
      return t('compteur.echeance', { n: c.jours, date: date(c.date) });
    case 'essai':
      return t('compteur.essai', { n: c.jours });
    case 'preavis':
      return t('compteur.preavis', { n: c.jours });
    case 'pause':
      return c.repriseLe
        ? t('compteur.pause.jusquau', { date: date(c.repriseLe) })
        : t('compteur.pause');
    case 'resilie':
      return t('compteur.resilie', { date: date(c.jusquau) });
    case 'archive':
      return t('compteur.archive');
    case 'a_vie':
      return t('compteur.aVie');
    case 'a_l_usage':
      return t('compteur.aLUsage');
  }
}
