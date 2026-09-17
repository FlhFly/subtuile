import { useState } from 'react';
import {
  enregistrerMoyenPaiement,
  restaurerMoyenPaiement,
  supprimerMoyenPaiement,
} from '../../data/services/moyensPaiement';
import { aujourdhui, etatExpirationCarte, type EtatExpiration } from '../../domain/dates';
import {
  formaterSaisieExpiration,
  formulaireDepuisMoyenPaiement,
  formulaireMoyenPaiementVide,
  moyenPaiementDepuisFormulaire,
  porteCarte,
  usageParMoyen,
  validerMoyenPaiement,
  type ErreursMoyenPaiement,
  type FormulaireMoyenPaiement,
} from '../../domain/moyenPaiement';
import { DEEP_LINKS } from '../../domain/resiliation';
import { TYPES_MOYEN_PAIEMENT, type MoyenPaiement } from '../../domain/types';
import { Champ } from '../components/Champ';
import { Chips } from '../components/Chips';
import { EnTete } from '../components/EnTete';
import { Icone } from '../components/Icone';
import { useI18n } from '../contexts/I18nContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { useStorage } from '../contexts/StorageContext';
import { useToast } from '../contexts/ToastContext';
import { useAbonnements } from '../hooks/useAbonnements';
import { useMoyensPaiement } from '../hooks/useMoyensPaiement';
import styles from './MoyensPaiement.module.css';

interface Props {
  onRetour: () => void;
}

/**
 * Écran Moyens de paiement (§7.6, §3.3) : cartes avec badge d'expiration
 * (EF-30, M-1), usage par les abonnements, édition en place, ajout,
 * suppression annulable par toast, deep link PayPal (§5.3).
 */
export function MoyensPaiement({ onRetour }: Props) {
  const { t, tn } = useI18n();
  const { preferences } = usePreferences();
  const storage = useStorage();
  const toast = useToast();
  const moyens = [...useMoyensPaiement().values()];
  const { abonnements } = useAbonnements();
  const [edition, setEdition] = useState<string | 'nouveau' | null>(null);
  const jour = aujourdhui();
  const usage = usageParMoyen(abonnements);

  const supprimer = async (m: MoyenPaiement) => {
    await supprimerMoyenPaiement(storage, m.id);
    setEdition(null);
    toast.afficherAvecAction(t('toast.paiementSupprime'), {
      libelle: t('toast.annuler'),
      executer: async () => {
        await restaurerMoyenPaiement(storage, m.id);
        toast.afficher(t('toast.actionAnnulee'));
      },
    });
  };

  const enregistrer = async (etat: FormulaireMoyenPaiement, existant?: MoyenPaiement) => {
    await enregistrerMoyenPaiement(storage, moyenPaiementDepuisFormulaire(etat, existant));
    setEdition(null);
    toast.afficher(t(existant ? 'toast.paiementEnregistre' : 'toast.paiementCree'));
  };

  return (
    <div className={styles.ecran}>
      <EnTete
        titre={t('paiements.titre')}
        sousTitre={tn('paiements.nombre', moyens.length)}
        retour={{ icone: 'retour', libelle: t('nav.retour'), onClick: onRetour }}
      />

      {moyens.length === 0 && edition !== 'nouveau' ? (
        <p className={styles.vide}>{t('paiements.vide')}</p>
      ) : null}

      <ul className={styles.liste}>
        {moyens.map((m) => {
          const expiration = etatExpirationCarte(
            m.dateExpiration,
            jour,
            preferences.alertes.carteMois,
          );
          const n = usage.get(m.id) ?? 0;
          const details = [
            m.quatreDerniers ? t('paiements.detail.quatre', { n: m.quatreDerniers }) : null,
            m.dateExpiration ? t('paiements.detail.expire', { date: m.dateExpiration }) : null,
          ].filter(Boolean);
          return (
            <li key={m.id} className={styles.carte}>
              <div className={styles.carteEntete}>
                <span className={styles.type}>
                  <span className={styles.pastille} style={{ background: m.couleur }} />
                  {t(`paiement.${m.type}`)}
                </span>
                <BadgeExpiration etat={expiration} />
              </div>
              <div className={styles.carteCorps}>
                <div className={styles.textes}>
                  <span className={styles.libelle}>{m.libelle}</span>
                  {details.length > 0 ? (
                    <span className={styles.detail}>{details.join(' · ')}</span>
                  ) : null}
                </div>
                {edition !== m.id ? (
                  <button
                    type="button"
                    className={styles.modifier}
                    onClick={() => setEdition(m.id)}
                    aria-label={`${t('paiements.modifier')} — ${m.libelle}`}
                  >
                    {t('paiements.modifier')}
                  </button>
                ) : null}
              </div>
              <span className={styles.usage}>
                {n === 0 ? t('paiements.usage.aucun') : tn('accueil.nombre', n)}
              </span>
              {m.type === 'paypal' ? (
                <a
                  className={styles.lien}
                  href={DEEP_LINKS.paypal}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('paiements.paypal')}
                  <Icone nom="externe" taille={13} />
                </a>
              ) : null}
              {edition === m.id ? (
                <FormulaireMoyen
                  initial={formulaireDepuisMoyenPaiement(m)}
                  onAnnuler={() => setEdition(null)}
                  onEnregistrer={(etat) => enregistrer(etat, m)}
                  onSupprimer={() => supprimer(m)}
                />
              ) : null}
            </li>
          );
        })}
      </ul>

      {edition === 'nouveau' ? (
        <div className={styles.carte}>
          <span className={styles.nouveauTitre}>{t('paiements.nouveau')}</span>
          <FormulaireMoyen
            initial={formulaireMoyenPaiementVide()}
            onAnnuler={() => setEdition(null)}
            onEnregistrer={(etat) => enregistrer(etat)}
          />
        </div>
      ) : (
        <button type="button" className={styles.ajouter} onClick={() => setEdition('nouveau')}>
          <Icone nom="plus" taille={16} />
          {t('paiements.ajouter')}
        </button>
      )}

      <p className={styles.note}>{t('paiements.note')}</p>
    </div>
  );
}

function BadgeExpiration({ etat }: { etat: EtatExpiration }) {
  const { t } = useI18n();
  if (etat === 'bientot')
    return <span className={styles.badgeWarn}>{t('paiements.expire.bientot')}</span>;
  if (etat === 'expiree')
    return <span className={styles.badgeUrg}>{t('paiements.expire.expiree')}</span>;
  return null;
}

/**
 * Formulaire d'un moyen de paiement (type, libellé, carte : 4 derniers chiffres et
 * expiration). `imbrique` : rendu dans un autre formulaire (création depuis la fiche
 * d'abonnement), sans balise <form> ni bouton de soumission.
 */
export function FormulaireMoyen({
  initial,
  onAnnuler,
  onEnregistrer,
  onSupprimer,
  imbrique = false,
}: {
  initial: FormulaireMoyenPaiement;
  onAnnuler: () => void;
  onEnregistrer: (etat: FormulaireMoyenPaiement) => Promise<void>;
  onSupprimer?: () => Promise<void>;
  imbrique?: boolean;
}) {
  const { t } = useI18n();
  const [etat, setEtat] = useState(initial);
  const [erreurs, setErreurs] = useState<ErreursMoyenPaiement>({});
  const maj = <C extends keyof FormulaireMoyenPaiement>(
    champ: C,
    valeur: FormulaireMoyenPaiement[C],
  ) => {
    setEtat((e) => ({ ...e, [champ]: valeur }));
    if (erreurs[champ]) {
      setErreurs((er) => {
        const reste = { ...er };
        delete reste[champ];
        return reste;
      });
    }
  };
  const erreur = (champ: keyof FormulaireMoyenPaiement) => {
    const code = erreurs[champ];
    return code ? t(`erreur.${code}`) : undefined;
  };
  const soumettre = async () => {
    const e = validerMoyenPaiement(etat);
    setErreurs(e);
    if (Object.keys(e).length > 0) return;
    await onEnregistrer(etat);
  };
  const optionsType = TYPES_MOYEN_PAIEMENT.map((type) => ({
    valeur: type,
    libelle: t(`paiement.${type}`),
  }));

  const contenu = (
    <>
      <Chips
        nom={t('paiements.type')}
        options={optionsType}
        valeur={etat.type}
        onChange={(v) => maj('type', v)}
      />
      <Champ libelle={t('paiements.libelle')} erreur={erreur('libelle')}>
        {(a) => (
          <input
            {...a}
            type="text"
            value={etat.libelle}
            onChange={(e) => maj('libelle', e.target.value)}
            placeholder={t('paiements.libelle.ph')}
            autoComplete="off"
          />
        )}
      </Champ>
      {porteCarte(etat.type) ? (
        <div className={styles.rangee}>
          <Champ libelle={t('paiements.quatre')} erreur={erreur('quatreDerniers')}>
            {(a) => (
              <input
                {...a}
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={etat.quatreDerniers}
                onChange={(e) => maj('quatreDerniers', e.target.value)}
                placeholder={t('paiements.quatre.ph')}
                autoComplete="off"
              />
            )}
          </Champ>
          <Champ libelle={t('paiements.expiration')} erreur={erreur('dateExpiration')}>
            {(a) => (
              <input
                {...a}
                type="text"
                inputMode="numeric"
                value={etat.dateExpiration}
                onChange={(e) => maj('dateExpiration', formaterSaisieExpiration(e.target.value))}
                maxLength={7}
                placeholder={t('paiements.expiration.ph')}
                autoComplete="off"
              />
            )}
          </Champ>
        </div>
      ) : null}
      <div className={styles.actions}>
        <button
          type={imbrique ? 'button' : 'submit'}
          className={styles.boutonPrincipal}
          onClick={imbrique ? () => void soumettre() : undefined}
        >
          {t('commun.enregistrer')}
        </button>
        <button type="button" className={styles.boutonSecondaire} onClick={onAnnuler}>
          {t('commun.annuler')}
        </button>
        {onSupprimer ? (
          <button type="button" className={styles.boutonDanger} onClick={() => void onSupprimer()}>
            {t('paiements.supprimer')}
          </button>
        ) : null}
      </div>
    </>
  );
  if (imbrique) return <div className={styles.formulaire}>{contenu}</div>;
  return (
    <form
      className={styles.formulaire}
      onSubmit={(e) => {
        e.preventDefault();
        void soumettre();
      }}
      noValidate
    >
      {contenu}
    </form>
  );
}
