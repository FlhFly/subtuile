import { useState } from 'react';
import { aujourdhui, estDateISO } from '../../domain/dates';
import { parserMontant } from '../../domain/formulaire';
import { etatObjectif, objectifConverti } from '../../domain/pilotage';
import { ChampDate } from '../components/ChampDate';
import { useI18n } from '../contexts/I18nContext';
import { useConversion } from '../hooks/useConversion';
import { useParametres } from '../hooks/useParametres';
import styles from './Budget.module.css';

interface Props {
  /** total mensuel normalisé, dans la devise d'affichage */
  totalMensuel: number;
}

/**
 * Objectif d'économie (EF-70, composant ObjectifEconomie de la maquette) :
 * « passer sous X / mois d'ici [date] », progression, « encore Z à réduire »
 * ou « objectif atteint — Y sous la cible ».
 */
export function Objectif({ totalMensuel }: Props) {
  const i18n = useI18n();
  const { t, date } = i18n;
  const { devise, convertir } = useConversion();
  const { parametres, chargement, enregistrer } = useParametres();
  const [edition, setEdition] = useState(false);
  const [saisieCible, setSaisieCible] = useState('');
  const [saisieDate, setSaisieDate] = useState('');
  const [erreurs, setErreurs] = useState<{ cible?: boolean; date?: boolean }>({});
  const jour = aujourdhui();

  const objectif = objectifConverti(parametres, convertir);
  const etat = objectif === null ? null : etatObjectif(totalMensuel, objectif, jour);
  const montant = (v: number) => i18n.montant(v, devise);

  const ouvrir = () => {
    setSaisieCible(
      objectif === null ? '' : String(Math.round(objectif.cible * 100) / 100).replace('.', ','),
    );
    setSaisieDate(objectif?.date ?? '');
    setErreurs({});
    setEdition(true);
  };
  const valider = async () => {
    const cible = parserMontant(saisieCible);
    const e = {
      cible: cible === null || cible <= 0,
      date: !estDateISO(saisieDate),
    };
    if (e.cible || e.date) {
      setErreurs(e);
      return;
    }
    await enregistrer({ objectif: { cible: cible!, devise, date: saisieDate } });
    setEdition(false);
  };
  const retirer = async () => {
    await enregistrer({ objectif: null });
    setEdition(false);
  };

  if (chargement) return null;
  const pourcent = etat === null ? 0 : Math.round(Math.min(etat.progression, 1) * 100);

  return (
    <section className={styles.carte} aria-label={t('finances.objectif')}>
      <div className={styles.enTete}>
        <h2 className={styles.titre}>{t('finances.objectif')}</h2>
        {!edition ? (
          <button type="button" className={styles.boutonPetit} onClick={ouvrir}>
            {objectif === null ? t('finances.objectif.definir') : t('commun.modifier')}
          </button>
        ) : null}
      </div>

      {edition ? (
        <div className={styles.edition}>
          <label className={styles.libelle} htmlFor="objectif-cible">
            {t('finances.objectif.cible', { devise })}
          </label>
          <input
            id="objectif-cible"
            className={erreurs.cible ? styles.champErreur : styles.champ}
            type="text"
            inputMode="decimal"
            value={saisieCible}
            onChange={(e) => {
              setSaisieCible(e.target.value);
              setErreurs((c) => ({ ...c, cible: false }));
            }}
            placeholder={t('finances.objectif.ph')}
            aria-invalid={Boolean(erreurs.cible)}
          />
          {erreurs.cible ? <span className={styles.erreur}>{t('erreur.nombre')}</span> : null}
          <ChampDate
            libelle={t('finances.objectif.date')}
            erreur={erreurs.date ? t('erreur.date') : undefined}
            valeur={saisieDate}
            onChange={(v) => {
              setSaisieDate(v);
              setErreurs((c) => ({ ...c, date: false }));
            }}
          />
          <div className={styles.actions}>
            <button type="button" className={styles.boutonPrincipal} onClick={() => void valider()}>
              {t('commun.enregistrer')}
            </button>
            <button
              type="button"
              className={styles.boutonSecondaire}
              onClick={() => setEdition(false)}
            >
              {t('commun.annuler')}
            </button>
            {objectif !== null ? (
              <button type="button" className={styles.boutonDiscret} onClick={() => void retirer()}>
                {t('finances.objectif.retirer')}
              </button>
            ) : null}
          </div>
        </div>
      ) : etat === null ? (
        <p className={styles.aide}>{t('finances.objectif.aide')}</p>
      ) : (
        <>
          <p className={styles.aide}>
            {t('finances.objectif.sous', {
              montant: montant(etat.cible),
              date: date(etat.date, 'long'),
            })}
          </p>
          <div
            className={styles.jauge}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pourcent}
          >
            <div
              className={etat.atteint ? styles.jaugeValeur : styles.jaugeEnCours}
              style={{ width: `${pourcent}%` }}
            />
          </div>
          <span
            className={
              etat.atteint ? styles.atteint : etat.datePassee ? styles.depasse : styles.reste
            }
          >
            {etat.atteint
              ? t('finances.objectif.atteint', { montant: montant(-etat.ecart) })
              : etat.datePassee
                ? t('finances.objectif.datePassee', { montant: montant(etat.ecart) })
                : t('finances.objectif.reste', { montant: montant(etat.ecart) })}
          </span>
        </>
      )}
    </section>
  );
}
