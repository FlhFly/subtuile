import { useMemo, useState } from 'react';
import { aujourdhui } from '../../domain/dates';
import {
  casesCalendrier,
  decalerMois,
  evenementsAVenir,
  evenementsDuMois,
  grouperParMois,
  moisDe,
  type Apparence,
  type Evenement,
} from '../../domain/echeancier';
import { couleurTuile, logoTuile } from '../../domain/tuile';
import { Icone } from '../components/Icone';
import { useI18n, type I18n } from '../contexts/I18nContext';
import { useAbonnements } from '../hooks/useAbonnements';
import { useCatalogue } from '../hooks/useCatalogue';
import styles from './Echeancier.module.css';

interface Props {
  /** ouverture de la fiche (EF-13) */
  onOuvrir: (id: string) => void;
}

type Vue = 'liste' | 'calendrier';

/**
 * Échéancier (EF-16, §7.4) : prochaines échéances, fins d'essai et préavis en
 * liste chronologique groupée par mois, ou en calendrier mensuel avec les
 * occurrences du mois affiché. Touchez une ligne pour ouvrir la fiche.
 */
export function Echeancier({ onOuvrir }: Props) {
  const i18n = useI18n();
  const { t } = i18n;
  const { abonnements, chargement } = useAbonnements();
  const { parId: services } = useCatalogue();
  const jour = aujourdhui();
  const [vue, setVue] = useState<Vue>('liste');
  const [mois, setMois] = useState(() => moisDe(jour));
  const [jourChoisi, setJourChoisi] = useState<string | null>(null);

  const apparence = useMemo<Apparence>(
    () => (abo) => {
      const service = abo.serviceId ? services.get(abo.serviceId) : undefined;
      return { couleur: couleurTuile(abo, service), initiales: logoTuile(abo, service) };
    },
    [services],
  );
  const aVenir = useMemo(
    () => evenementsAVenir(abonnements, jour, apparence),
    [abonnements, jour, apparence],
  );
  const groupes = useMemo(() => grouperParMois(aVenir), [aVenir]);
  const duMois = useMemo(
    () => evenementsDuMois(abonnements, mois, jour, apparence),
    [abonnements, mois, jour, apparence],
  );
  const cases = useMemo(() => casesCalendrier(mois, duMois, jour), [mois, duMois, jour]);
  const lignesCalendrier = jourChoisi ? duMois.filter((e) => e.date === jourChoisi) : duMois;
  const joursSemaine = t('echeancier.jours').split(',');

  const changerMois = (n: number) => {
    setMois((m) => decalerMois(m, n));
    setJourChoisi(null);
  };
  const choisirJour = (date: string) => setJourChoisi((j) => (j === date ? null : date));

  return (
    <div className={styles.ecran}>
      <header className={styles.entete}>
        <div className={styles.titres}>
          <h1 className={styles.titre}>{t('echeancier.titre')}</h1>
          <p className={styles.sous}>{t('echeancier.sous')}</p>
        </div>
        <div className={styles.bascule} role="radiogroup" aria-label={t('echeancier.vue')}>
          <button
            type="button"
            role="radio"
            aria-checked={vue === 'liste'}
            aria-label={t('echeancier.vue.liste')}
            className={vue === 'liste' ? styles.basculeActif : styles.basculeBouton}
            onClick={() => setVue('liste')}
          >
            <Icone nom="liste" taille={13} epaisseur={2.6} />
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={vue === 'calendrier'}
            aria-label={t('echeancier.vue.calendrier')}
            className={vue === 'calendrier' ? styles.basculeActif : styles.basculeBouton}
            onClick={() => setVue('calendrier')}
          >
            <Icone nom="calendrier" taille={13} epaisseur={2.6} />
          </button>
        </div>
      </header>

      {chargement ? null : vue === 'calendrier' ? (
        <>
          <section className={styles.calendrier} aria-label={t('echeancier.vue.calendrier')}>
            <div className={styles.moisBarre}>
              <button
                type="button"
                className={styles.moisBouton}
                onClick={() => changerMois(-1)}
                aria-label={t('echeancier.mois.precedent')}
              >
                <Icone nom="chevronGauche" taille={14} epaisseur={2.6} />
              </button>
              <span className={styles.moisTitre}>{i18n.date(`${mois}-01`, 'mois')}</span>
              <button
                type="button"
                className={styles.moisBouton}
                onClick={() => changerMois(1)}
                aria-label={t('echeancier.mois.suivant')}
              >
                <Icone nom="chevronDroit" taille={14} epaisseur={2.6} />
              </button>
            </div>
            <div className={styles.grille}>
              {joursSemaine.map((j, i) => (
                <span key={`${j}-${i}`} className={styles.jourSemaine}>
                  {j}
                </span>
              ))}
              {cases.map((c, i) =>
                c.date === null ? (
                  <span key={`vide-${i}`} className={styles.caseVide} />
                ) : (
                  <button
                    key={c.date}
                    type="button"
                    className={[
                      styles.case,
                      c.aujourdhui ? styles.caseAujourdhui : '',
                      c.date === jourChoisi ? styles.caseChoisie : '',
                      c.evenements.length > 0 ? styles.caseAvecEvenements : '',
                    ].join(' ')}
                    onClick={() => choisirJour(c.date!)}
                    aria-pressed={c.date === jourChoisi}
                    aria-label={i18n.date(c.date)}
                  >
                    <span className={styles.caseNumero}>{c.numero}</span>
                    <span className={styles.pastilles}>
                      {c.evenements.slice(0, 3).map((e) => (
                        <span
                          key={e.cle}
                          className={styles.pastille}
                          style={{ background: e.couleur }}
                        />
                      ))}
                      {c.evenements.length > 3 ? (
                        <span className={styles.pastillePlus}>+{c.evenements.length - 3}</span>
                      ) : null}
                    </span>
                  </button>
                ),
              )}
            </div>
            <p className={styles.legende}>{t('echeancier.legende')}</p>
          </section>
          {lignesCalendrier.length > 0 ? (
            <ul className={styles.lignes}>
              {lignesCalendrier.map((e) => (
                <LigneEcheance key={e.cle} e={e} i18n={i18n} onOuvrir={onOuvrir} />
              ))}
            </ul>
          ) : (
            <p className={styles.moisVide}>
              {t(jourChoisi ? 'echeancier.jourVide' : 'echeancier.moisVide')}
            </p>
          )}
        </>
      ) : groupes.length > 0 ? (
        groupes.map((g) => (
          <section key={g.mois} className={styles.groupe}>
            <h2 className={styles.groupeTitre}>{i18n.date(`${g.mois}-01`, 'mois')}</h2>
            <ul className={styles.lignes}>
              {g.evenements.map((e) => (
                <LigneEcheance key={e.cle} e={e} i18n={i18n} onOuvrir={onOuvrir} />
              ))}
            </ul>
          </section>
        ))
      ) : (
        <section className={styles.vide}>
          <h2 className={styles.videTitre}>{t('echeancier.vide.titre')}</h2>
          <p className={styles.videTexte}>{t('echeancier.vide.texte')}</p>
        </section>
      )}

      {!chargement && aVenir.length > 0 ? (
        <p className={styles.note}>{t('echeancier.note')}</p>
      ) : null}
    </div>
  );
}

/** Composant LigneEcheance (maquette) : jour + semaine, logo, nom + type, montant + puce. */
function LigneEcheance({
  e,
  i18n,
  onOuvrir,
}: {
  e: Evenement;
  i18n: I18n;
  onOuvrir: (id: string) => void;
}) {
  const { t, montant, date, compteur, periodicite } = i18n;
  const prix = (v: number) =>
    e.montantEstime ? t('montant.estime', { montant: montant(v) }) : montant(v);
  let sous: string;
  let somme: string;
  let puce: string;
  switch (e.type) {
    case 'renouvellement':
      sous = t('echeancier.ev.renouvellement', { periodicite: periodicite(e.periodicite) });
      somme = e.montant !== null ? prix(e.montant) : t('commun.vide');
      puce = compteur(e.jours);
      break;
    case 'fin_essai':
      sous = t('echeancier.ev.fin_essai', {
        montant: e.montant !== null ? montant(e.montant) : t('commun.vide'),
        periodicite: periodicite(e.periodicite),
      });
      somme = montant(0);
      puce = t('echeancier.puce.essai', { compteur: compteur(e.jours) });
      break;
    case 'preavis':
      sous = t('echeancier.ev.preavis', { n: e.preavisJours ?? 0 });
      somme = t('commun.vide');
      puce = t('echeancier.puce.preavis', { compteur: compteur(e.jours) });
      break;
    case 'fin_resilie':
      sous = t('echeancier.ev.fin_resilie');
      somme = t('commun.vide');
      puce = date(e.date);
      break;
  }
  const classePuce = styles[`puce_${e.niveau}`] ?? '';
  return (
    <li>
      <button type="button" className={styles.ligne} onClick={() => onOuvrir(e.abonnementId)}>
        <span className={styles.jour}>
          <span className={styles.jourNumero}>{Number(e.date.slice(8, 10))}</span>
          <span className={styles.jourSemaineCourt}>{date(e.date, 'semaine')}</span>
        </span>
        <span className={styles.logo} style={{ background: e.couleur }}>
          {e.initiales}
        </span>
        <span className={styles.textes}>
          <span className={styles.nom}>{e.nom}</span>
          <span className={styles.type}>{sous}</span>
        </span>
        <span className={styles.droite}>
          <span className={styles.montant}>{somme}</span>
          <span className={`${styles.puce} ${classePuce}`}>{puce}</span>
        </span>
      </button>
    </li>
  );
}
