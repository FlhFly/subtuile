import { useState } from 'react';
import { parserMontant } from '../../domain/formulaire';
import { budgetConverti, etatBudget } from '../../domain/pilotage';
import { useI18n } from '../contexts/I18nContext';
import { useConversion } from '../hooks/useConversion';
import { useParametres } from '../hooks/useParametres';
import styles from './Budget.module.css';

interface Props {
  /** total mensuel normalisé, dans la devise d'affichage */
  totalMensuel: number;
}

/**
 * Budget mensuel global (EF-70, ex-C4, composant « Budget mensuel · Global »
 * de la maquette) : plafond choisi dans la devise d'affichage, jauge, marge
 * restante ou dépassement ; l'alerte de dépassement vit dans le centre
 * d'alertes.
 */
export function Budget({ totalMensuel }: Props) {
  const i18n = useI18n();
  const { t } = i18n;
  const { devise, convertir } = useConversion();
  const { parametres, chargement, enregistrer } = useParametres();
  const [edition, setEdition] = useState(false);
  const [saisie, setSaisie] = useState('');
  const [erreur, setErreur] = useState(false);

  const budget = budgetConverti(parametres, convertir);
  const etat = budget === null ? null : etatBudget(totalMensuel, budget);
  const montant = (v: number) => i18n.montant(v, devise);

  const ouvrir = () => {
    setSaisie(budget === null ? '' : String(Math.round(budget * 100) / 100).replace('.', ','));
    setErreur(false);
    setEdition(true);
  };
  const valider = async () => {
    const v = parserMontant(saisie);
    if (v === null || v <= 0) {
      setErreur(true);
      return;
    }
    await enregistrer({ budgetMensuel: { montant: v, devise } });
    setEdition(false);
  };
  const retirer = async () => {
    await enregistrer({ budgetMensuel: null });
    setEdition(false);
  };

  if (chargement) return null;
  const pourcent = etat === null ? 0 : Math.round(Math.min(etat.ratio, 1) * 100);

  return (
    <section className={styles.carte} aria-label={t('finances.budget')}>
      <div className={styles.enTete}>
        <h2 className={styles.titre}>{t('finances.budget')}</h2>
        {!edition ? (
          <button type="button" className={styles.boutonPetit} onClick={ouvrir}>
            {budget === null ? t('finances.budget.definir') : t('commun.modifier')}
          </button>
        ) : null}
      </div>

      {edition ? (
        <div className={styles.edition}>
          <label className={styles.libelle} htmlFor="budget-mensuel">
            {t('finances.budget.champ', { devise })}
          </label>
          <input
            id="budget-mensuel"
            className={erreur ? styles.champErreur : styles.champ}
            type="text"
            inputMode="decimal"
            value={saisie}
            onChange={(e) => {
              setSaisie(e.target.value);
              setErreur(false);
            }}
            placeholder={t('finances.budget.ph')}
            aria-invalid={erreur}
          />
          {erreur ? <span className={styles.erreur}>{t('erreur.nombre')}</span> : null}
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
            {budget !== null ? (
              <button type="button" className={styles.boutonDiscret} onClick={() => void retirer()}>
                {t('finances.budget.retirer')}
              </button>
            ) : null}
          </div>
        </div>
      ) : etat === null ? (
        <p className={styles.aide}>{t('finances.budget.aide')}</p>
      ) : (
        <>
          <div className={styles.ligne}>
            <span className={styles.global}>{t('finances.budget.global')}</span>
            <span className={styles.montant}>{montant(etat.budget)}</span>
          </div>
          <div
            className={styles.jauge}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pourcent}
          >
            <div
              className={etat.depasse ? styles.jaugeDepassee : styles.jaugeValeur}
              style={{ width: `${pourcent}%` }}
            />
          </div>
          <span className={etat.depasse ? styles.depasse : styles.reste}>
            {etat.depasse
              ? t('finances.budget.depasse', { montant: montant(etat.ecart) })
              : t('finances.budget.reste', { montant: montant(-etat.ecart) })}
          </span>
        </>
      )}
    </section>
  );
}
