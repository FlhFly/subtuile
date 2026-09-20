import { useMemo } from 'react';
import { aujourdhui } from '../../domain/dates';
import { contientAutreDevise } from '../../domain/devises';
import {
  depensesPassees,
  previsionnel,
  repartitionParCategorie,
  repartitionParMoyenPaiement,
  totaux,
  type SerieMensuelle,
} from '../../domain/finances';
import { vueFoyer } from '../../domain/foyer';
import { evolutionMensuelle, rapport12Mois } from '../../domain/rapport';
import { doublonsParCategorie, suggestionsEconomies } from '../../domain/suggestions';
import type { Devise } from '../../domain/types';
import { useI18n, type I18n } from '../contexts/I18nContext';
import { barres, COULEURS_CATEGORIE, degradeDonut } from '../graphiques';
import { useAbonnements } from '../hooks/useAbonnements';
import { useCatalogue } from '../hooks/useCatalogue';
import { useConversion } from '../hooks/useConversion';
import { useMoyensPaiement } from '../hooks/useMoyensPaiement';
import { Budget } from './Budget';
import { Objectif } from './Objectif';
import styles from './Finances.module.css';

interface Props {
  onOuvrirPaiements: () => void;
  /** ouvre la fiche d'un abonnement cité par une suggestion (lot 5) */
  onOuvrirAbonnement: (id: string) => void;
}

/** Couleur d'un moyen de paiement absent (« sans moyen de paiement »). */
const COULEUR_SANS_MOYEN = 'var(--dash)';

/**
 * Finances (§7.5, écran 5 de la maquette) : totaux normalisés (EF-40, EF-44)
 * convertis dans la devise d'affichage (EF-45), répartition par catégorie en
 * donut (EF-41), prévisionnel 12 mois à montants réels (EF-42), dépenses
 * passées 12 mois (EF-43), répartition par moyen de paiement (EF-41), budget
 * mensuel et objectif d'économie (EF-70), évolution 24 mois et rapport 12 mois
 * vue « Foyer & partage » (EF-44b), suggestions d'économies et doublons par
 * catégorie (EF-72, EF-71) — lot 5.
 */
export function Finances({ onOuvrirPaiements, onOuvrirAbonnement }: Props) {
  const i18n = useI18n();
  const { t, tn, date } = i18n;
  const { abonnements, chargement } = useAbonnements();
  const moyens = useMoyensPaiement();
  const { catalogue, parId: services } = useCatalogue();
  const { devise, taux, convertir } = useConversion();
  const jour = aujourdhui();
  const montant = (v: number) => i18n.montant(v, devise);

  const total = useMemo(() => totaux(abonnements, jour, convertir), [abonnements, jour, convertir]);
  const categories = useMemo(
    () => repartitionParCategorie(abonnements, jour, convertir),
    [abonnements, jour, convertir],
  );
  const parMoyen = useMemo(
    () => repartitionParMoyenPaiement(abonnements, jour, convertir),
    [abonnements, jour, convertir],
  );
  const prevision = useMemo(
    () => previsionnel(abonnements, jour, { convertir }),
    [abonnements, jour, convertir],
  );
  const passe = useMemo(
    () => depensesPassees(abonnements, jour, { convertir }),
    [abonnements, jour, convertir],
  );

  const evolution = useMemo(
    () => evolutionMensuelle(abonnements, jour, { convertir }),
    [abonnements, jour, convertir],
  );
  const foyer = useMemo(
    () => vueFoyer(abonnements, jour, convertir),
    [abonnements, jour, convertir],
  );
  const doublons = useMemo(
    () => doublonsParCategorie(abonnements, jour, convertir),
    [abonnements, jour, convertir],
  );
  const economies = useMemo(
    () => suggestionsEconomies(abonnements, services, jour, convertir),
    [abonnements, services, jour, convertir],
  );
  const rapport = useMemo(
    () => rapport12Mois(abonnements, jour, { convertir }),
    [abonnements, jour, convertir],
  );

  const marquer = (v: number, estime: boolean) =>
    estime ? t('montant.estime', { montant: montant(v) }) : montant(v);
  const vide = total.nbPayants === 0 && passe.total === 0;
  const converti = contientAutreDevise(abonnements, devise);

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
      {converti ? (
        <p className={styles.noteTotaux}>
          {t('finances.converti', { devise, d: date(taux.publieLe, 'long') })}
        </p>
      ) : null}
      {total.estime ? <p className={styles.noteTotaux}>{t('finances.estime.note')}</p> : null}

      <Budget totalMensuel={total.mensuel} />
      <Objectif totalMensuel={total.mensuel} />

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

          <section className={styles.carte} aria-label={t('finances.previsionnel')}>
            <div className={styles.carteEnTete}>
              <h2 className={styles.carteTitre}>{t('finances.previsionnel')}</h2>
              <span className={styles.carteComplement}>
                {t('finances.moyenne', { montant: montant(prevision.moyenne) })}
              </span>
            </div>
            <Barres i18n={i18n} devise={devise} serie={prevision} variante="avenir" />
            <p className={styles.note}>{t('finances.previsionnel.note')}</p>
          </section>

          <section className={styles.carte} aria-label={t('finances.passe')}>
            <div className={styles.carteEnTete}>
              <h2 className={styles.carteTitre}>{t('finances.passe')}</h2>
              <span className={styles.carteComplement}>
                {t('finances.passe.total', { montant: montant(passe.total) })}
              </span>
            </div>
            {passe.total > 0 ? (
              <>
                <Barres i18n={i18n} devise={devise} serie={passe} variante="passe" />
                <p className={styles.note}>{t('finances.passe.note')}</p>
              </>
            ) : (
              <div className={styles.passeVide}>
                <span className={styles.passeVideTitre}>{t('finances.passe.vide.titre')}</span>
                <span className={styles.passeVideTexte}>{t('finances.passe.vide.texte')}</span>
              </div>
            )}
          </section>

          <section className={styles.carte} aria-label={t('finances.evolution')}>
            <div className={styles.carteEnTete}>
              <h2 className={styles.carteTitre}>{t('finances.evolution')}</h2>
              <span className={styles.carteComplement}>
                {t('finances.evolution.variation', {
                  montant: `${evolution.variation > 0 ? '+' : ''}${montant(evolution.variation)}`,
                })}
              </span>
            </div>
            <Barres i18n={i18n} devise={devise} serie={evolution.serie} variante="passe" dense />
            <p className={styles.note}>{t('finances.evolution.note')}</p>
          </section>

          <section className={styles.carte} aria-label={t('finances.rapport')}>
            <div className={styles.carteEnTete}>
              <h2 className={styles.carteTitre}>{t('finances.rapport')}</h2>
              <span className={styles.carteComplement}>
                {t('finances.moyenne', { montant: montant(rapport.moyenne) })}
              </span>
            </div>
            <div className={styles.rapportTotal}>
              <span className={styles.rapportLegende}>{t('finances.rapport.total')}</span>
              <span className={styles.rapportMontant}>
                {marquer(rapport.total, rapport.estime)}
              </span>
            </div>
            <div className={styles.rapportBloc}>
              <span className={styles.rapportTitre}>
                {tn('finances.rapport.hausses', rapport.hausses.length)}
              </span>
              {rapport.hausses.slice(0, 5).map((h) => (
                <span key={`${h.abonnementId}-${h.date}`} className={styles.rapportLigne}>
                  {t('finances.rapport.hausse', {
                    nom: h.nom,
                    date: date(h.date, 'moyen'),
                    avant: i18n.montant(h.avant, h.devise),
                    apres: i18n.montant(h.apres, h.devise),
                  })}
                </span>
              ))}
            </div>
            <div className={styles.rapportBloc}>
              <span className={styles.rapportTitre}>
                {t('finances.rapport.mouvements', {
                  a: rapport.ajoutes.length,
                  r: rapport.arretes.length,
                })}
              </span>
              {rapport.ajoutes.length > 0 ? (
                <span className={styles.rapportLigne}>
                  {t('finances.rapport.ajoutes', { noms: rapport.ajoutes.join(', ') })}
                </span>
              ) : null}
              {rapport.arretes.length > 0 ? (
                <span className={styles.rapportLigne}>
                  {t('finances.rapport.arretes', { noms: rapport.arretes.join(', ') })}
                </span>
              ) : null}
            </div>
          </section>

          {economies.length > 0 ? (
            <section className={styles.carte} aria-label={t('finances.economies')}>
              <h2 className={styles.carteTitre}>{t('finances.economies')}</h2>
              <ul className={styles.suggestions}>
                {economies.map((s) => (
                  <li key={`${s.abonnementId}-${s.type}`}>
                    <button
                      type="button"
                      className={styles.suggestion}
                      onClick={() => onOuvrirAbonnement(s.abonnementId)}
                    >
                      <span className={styles.suggestionTexte}>
                        {t(`finances.economies.${s.type}`, { nom: s.nom })}
                      </span>
                      <span className={styles.suggestionGain}>
                        {t('finances.economies.gain', { montant: montant(s.economieAnnuelle) })}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className={styles.note}>
                {t('finances.economies.note', { d: date(catalogue.publieLe, 'long') })}
              </p>
            </section>
          ) : null}

          <section className={styles.carte} aria-label={t('finances.doublons')}>
            <h2 className={styles.carteTitre}>{t('finances.doublons')}</h2>
            {doublons.length === 0 ? (
              <p className={styles.note}>{t('finances.doublons.aucun')}</p>
            ) : (
              <ul className={styles.suggestions}>
                {doublons.map((d) => (
                  <li key={d.categorie}>
                    <button
                      type="button"
                      className={styles.suggestion}
                      onClick={() => onOuvrirAbonnement(d.candidat.id)}
                    >
                      <span className={styles.suggestionTexte}>
                        {t('finances.doublons.ligne', {
                          n: d.abonnements.length,
                          categorie: t(`categorie.${d.categorie}`),
                        })}
                        <span className={styles.suggestionDetail}>
                          {d.abonnements.map((a) => a.nom).join(', ')}
                        </span>
                      </span>
                      <span className={styles.suggestionGain}>
                        {t(
                          d.selonUsage
                            ? 'finances.doublons.moinsUtilise'
                            : 'finances.doublons.moinsCher',
                          { nom: d.candidat.nom, montant: montant(d.candidat.mensuel) },
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {foyer.partages.length > 0 ? (
            <section className={styles.carte} aria-label={t('finances.foyer')}>
              <div className={styles.carteEnTete}>
                <h2 className={styles.carteTitre}>{t('finances.foyer')}</h2>
                <span className={styles.carteComplement}>
                  {t('finances.foyer.resume', { montant: montant(foyer.priseEnCharge) })}
                </span>
              </div>
              <div className={styles.foyerTotaux}>
                <div className={styles.foyerTotal}>
                  <span className={styles.rapportLegende}>{t('finances.foyer.total')}</span>
                  <span className={styles.foyerMontant}>{montant(foyer.totalFoyer)}</span>
                </div>
                <div className={styles.foyerTotal}>
                  <span className={styles.rapportLegende}>{t('finances.foyer.personnel')}</span>
                  <span className={styles.foyerMontant}>{montant(foyer.totalPersonnel)}</span>
                </div>
              </div>
              <ul className={styles.moyens}>
                {foyer.partages.map((p) => (
                  <li key={p.abonnementId} className={styles.moyen}>
                    <div className={styles.moyenLigne}>
                      <span className={styles.moyenNom}>{p.nom}</span>
                      <span className={styles.moyenMontant}>
                        {t('finances.foyer.part', {
                          part: montant(p.part),
                          plein: montant(p.plein),
                        })}
                      </span>
                    </div>
                    <div className={styles.jauge}>
                      <div
                        className={styles.jaugeValeur}
                        style={{
                          width: `${p.plein > 0 ? Math.round((p.part / p.plein) * 100) : 0}%`,
                          background: 'var(--ink)',
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <p className={styles.note}>{t('finances.foyer.note')}</p>
            </section>
          ) : null}

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

/** Composant GraphPrevisionnel / GraphDepensesPassees (maquette) : 12 barres, initiale du mois. */
function Barres({
  i18n,
  devise,
  serie,
  variante,
  dense = false,
}: {
  i18n: I18n;
  devise: Devise;
  serie: SerieMensuelle;
  variante: 'avenir' | 'passe';
  /** 24 mois : barres serrées, sans étiquette de valeur, initiale un mois sur deux */
  dense?: boolean;
}) {
  const { date } = i18n;
  const b = barres(serie.mois.map((m) => m.montant));
  return (
    <div className={dense ? styles.barresDenses : styles.barres}>
      {serie.mois.map((m, i) => {
        const barre = b[i]!;
        return (
          <div key={m.mois} className={styles.colonne}>
            <span className={styles.barreEtiquette}>
              {barre.etiquette && !dense ? Math.round(m.montant) : ''}
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
              title={`${date(`${m.mois}-01`, 'mois')} · ${i18n.montant(m.montant, devise)}`}
            />
            <span className={styles.barreMois}>
              {dense && i % 2 === 1
                ? ''
                : date(`${m.mois}-01`, 'moisCourt').charAt(0).toUpperCase()}
            </span>
          </div>
        );
      })}
    </div>
  );
}
