import { useMemo } from 'react';
import { aujourdhui } from '../../domain/dates';
import {
  depensesPassees,
  previsionnel,
  repartitionParCategorie,
  repartitionParMoyenPaiement,
  totaux,
  type SerieMensuelle,
} from '../../domain/finances';
import { useI18n, type I18n } from '../contexts/I18nContext';
import { barres, COULEURS_CATEGORIE, degradeDonut } from '../graphiques';
import { useAbonnements } from '../hooks/useAbonnements';
import { useMoyensPaiement } from '../hooks/useMoyensPaiement';
import styles from './Finances.module.css';

interface Props {
  onOuvrirPaiements: () => void;
}

/** Couleur d'un moyen de paiement absent (« sans moyen de paiement »). */
const COULEUR_SANS_MOYEN = 'var(--dash)';

/**
 * Finances (§7.5, écran 5 de la maquette) : totaux normalisés (EF-40, EF-44),
 * répartition par catégorie en donut (EF-41), prévisionnel 12 mois à montants
 * réels (EF-42), dépenses passées 12 mois (EF-43), répartition par moyen de
 * paiement (EF-41). Budget, objectif, doublons, foyer et évolution 24 mois
 * arrivent au lot 5.
 */
export function Finances({ onOuvrirPaiements }: Props) {
  const i18n = useI18n();
  const { t, tn, montant } = i18n;
  const { abonnements, chargement } = useAbonnements();
  const moyens = useMoyensPaiement();
  const jour = aujourdhui();

  const total = useMemo(() => totaux(abonnements, jour), [abonnements, jour]);
  const categories = useMemo(() => repartitionParCategorie(abonnements, jour), [abonnements, jour]);
  const parMoyen = useMemo(
    () => repartitionParMoyenPaiement(abonnements, jour),
    [abonnements, jour],
  );
  const prevision = useMemo(() => previsionnel(abonnements, jour), [abonnements, jour]);
  const passe = useMemo(() => depensesPassees(abonnements, jour), [abonnements, jour]);

  const marquer = (v: number, estime: boolean) =>
    estime ? t('montant.estime', { montant: montant(v) }) : montant(v);
  const vide = total.nbPayants === 0 && passe.total === 0;

  if (chargement) return <div className={styles.ecran} />;

  return (
    <div className={styles.ecran}>
      <header className={styles.entete}>
        <h1 className={styles.titre}>{t('finances.titre')}</h1>
        <p className={styles.sous}>
          {vide ? t('finances.vide') : tn('finances.payants', total.nbPayants)}
        </p>
      </header>

      <div className={styles.totaux}>
        <div className={styles.totalPrincipal}>
          <span className={styles.totalLegende}>{t('finances.mensuel')}</span>
          <span className={styles.totalMontant}>{marquer(total.mensuel, total.estime)}</span>
        </div>
        <div className={styles.totalSecondaire}>
          <span className={styles.totalLegende}>{t('finances.annuel')}</span>
          <span className={styles.totalMontant}>{marquer(total.annuel, total.estime)}</span>
        </div>
      </div>
      {total.estime ? <p className={styles.noteTotaux}>{t('finances.estime.note')}</p> : null}

      {vide ? (
        <section className={styles.rien}>
          <h2 className={styles.rienTitre}>{t('finances.rien.titre')}</h2>
          <p className={styles.rienTexte}>{t('finances.rien.texte')}</p>
        </section>
      ) : (
        <>
          <section className={styles.carte} aria-label={t('finances.repartition')}>
            <h2 className={styles.carteTitre}>{t('finances.repartition')}</h2>
            <div className={styles.donutLigne}>
              <div className={styles.donut}>
                <div
                  className={styles.donutAnneau}
                  style={{
                    background: degradeDonut(
                      categories.map((c) => ({
                        part: c.part,
                        couleur: COULEURS_CATEGORIE[c.categorie],
                      })),
                    ),
                  }}
                />
                <div className={styles.donutCentre}>
                  <span className={styles.donutNombre}>{categories.length}</span>
                  <span className={styles.donutLegende}>
                    {tn('finances.categories', categories.length)}
                  </span>
                </div>
              </div>
              <ul className={styles.legende}>
                {categories.map((c) => (
                  <li key={c.categorie} className={styles.legendeLigne}>
                    <span
                      className={styles.pastille}
                      style={{ background: COULEURS_CATEGORIE[c.categorie] }}
                    />
                    <span className={styles.legendeNom}>{t(`categorie.${c.categorie}`)}</span>
                    <span className={styles.legendeMontant}>{montant(c.mensuel)}</span>
                    <span className={styles.legendePart}>{Math.round(c.part * 100)} %</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <Histogramme
            i18n={i18n}
            titre={t('finances.previsionnel')}
            complement={t('finances.moyenne', { montant: montant(prevision.moyenne) })}
            serie={prevision}
            note={t('finances.previsionnel.note')}
            variante="avenir"
          />

          <section className={styles.carte} aria-label={t('finances.passe')}>
            <div className={styles.carteEnTete}>
              <h2 className={styles.carteTitre}>{t('finances.passe')}</h2>
              <span className={styles.carteComplement}>
                {t('finances.passe.total', { montant: montant(passe.total) })}
              </span>
            </div>
            {passe.total > 0 ? (
              <>
                <Barres i18n={i18n} serie={passe} variante="passe" />
                <p className={styles.note}>{t('finances.passe.note')}</p>
              </>
            ) : (
              <div className={styles.passeVide}>
                <span className={styles.passeVideTitre}>{t('finances.passe.vide.titre')}</span>
                <span className={styles.passeVideTexte}>{t('finances.passe.vide.texte')}</span>
              </div>
            )}
          </section>

          <section className={styles.carte} aria-label={t('finances.paiement')}>
            <div className={styles.carteEnTete}>
              <h2 className={styles.carteTitre}>{t('finances.paiement')}</h2>
              <button type="button" className={styles.boutonPetit} onClick={onOuvrirPaiements}>
                {t('finances.paiement.gerer')}
              </button>
            </div>
            <ul className={styles.moyens}>
              {parMoyen.map((p) => {
                const m = p.moyenPaiementId ? moyens.get(p.moyenPaiementId) : undefined;
                const couleur = m?.couleur ?? COULEUR_SANS_MOYEN;
                return (
                  <li key={p.moyenPaiementId ?? 'aucun'} className={styles.moyen}>
                    <div className={styles.moyenLigne}>
                      <span className={styles.moyenNom}>
                        <span className={styles.point} style={{ background: couleur }} />
                        {m?.libelle ?? t('finances.paiement.sans')}
                      </span>
                      <span className={styles.moyenMontant}>{montant(p.mensuel)}</span>
                    </div>
                    <div className={styles.jauge}>
                      <div
                        className={styles.jaugeValeur}
                        style={{ width: `${Math.round(p.part * 100)}%`, background: couleur }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className={styles.note}>{t('finances.paiement.note')}</p>
          </section>
        </>
      )}
    </div>
  );
}

function Histogramme({
  i18n,
  titre,
  complement,
  serie,
  note,
  variante,
}: {
  i18n: I18n;
  titre: string;
  complement: string;
  serie: SerieMensuelle;
  note: string;
  variante: 'avenir' | 'passe';
}) {
  return (
    <section className={styles.carte} aria-label={titre}>
      <div className={styles.carteEnTete}>
        <h2 className={styles.carteTitre}>{titre}</h2>
        <span className={styles.carteComplement}>{complement}</span>
      </div>
      <Barres i18n={i18n} serie={serie} variante={variante} />
      <p className={styles.note}>{note}</p>
    </section>
  );
}

/** Composant GraphPrevisionnel / GraphDepensesPassees (maquette) : 12 barres, initiale du mois. */
function Barres({
  i18n,
  serie,
  variante,
}: {
  i18n: I18n;
  serie: SerieMensuelle;
  variante: 'avenir' | 'passe';
}) {
  const { date } = i18n;
  const b = barres(serie.mois.map((m) => m.montant));
  return (
    <div className={styles.barres}>
      {serie.mois.map((m, i) => {
        const barre = b[i]!;
        return (
          <div key={m.mois} className={styles.colonne}>
            <span className={styles.barreEtiquette}>
              {barre.etiquette ? Math.round(m.montant) : ''}
            </span>
            <div
              className={[
                styles.barre,
                barre.max
                  ? styles.barreMax
                  : variante === 'avenir'
                    ? styles.barreAvenir
                    : styles.barrePasse,
              ].join(' ')}
              style={{ height: `${barre.hauteur}px` }}
              title={`${date(`${m.mois}-01`, 'mois')} · ${i18n.montant(m.montant)}`}
            />
            <span className={styles.barreMois}>
              {date(`${m.mois}-01`, 'moisCourt').charAt(0).toUpperCase()}
            </span>
          </div>
        );
      })}
    </div>
  );
}
