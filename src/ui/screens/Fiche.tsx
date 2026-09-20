import { useState, type CSSProperties, type ReactNode } from 'react';
import { changerStatut, supprimerAbonnement } from '../../data/services/abonnements';
import {
  anciennete,
  aujourdhui,
  comparerDates,
  dateLimiteResiliation,
  estDateISO,
  finEngagement,
  joursAvant,
  montantMensuel,
  prixEffectif,
} from '../../domain/dates';
import {
  actionResiliation,
  cleEtapes,
  estTelephone,
  lienTelephone,
  NOMBRE_ETAPES,
  statutApresResiliation,
} from '../../domain/resiliation';
import { enregistrerAbonnement } from '../../data/services/abonnements';
import { parserMontant } from '../../domain/formulaire';
import {
  appliquerChangementPrix,
  estHausseAnnoncee,
  formulairePrixVide,
  validerChangementPrix,
  type ErreursPrix,
  type FormulaireChangementPrix,
} from '../../domain/prix';
import { Champ } from '../components/Champ';
import { ChampDate } from '../components/ChampDate';
import { SYMBOLES } from '../../domain/devises';
import type { Devise } from '../../domain/types';
import { useConversion } from '../hooks/useConversion';
import { evenementsAVenir } from '../../domain/echeancier';
import { nomFichierIcs } from '../../domain/ics';
import { usePreferences } from '../contexts/PreferencesContext';
import { icsDepuisEvenements } from '../rappelsIcs';
import { telechargerFichier } from '../telechargement';
import { couleurCompteur, modeleTuile } from '../../domain/tuile';
import { trouverFormule } from '../../data/refdata/RefDataProvider';
import type { Abonnement, DateISO, MoyenPaiement, Service, Statut } from '../../domain/types';
import { libelleDuree } from '../../i18n';
import { Icone } from '../components/Icone';
import { useI18n, type I18n } from '../contexts/I18nContext';
import { useStorage } from '../contexts/StorageContext';
import { useToast } from '../contexts/ToastContext';
import { useAbonnements } from '../hooks/useAbonnements';
import { useCatalogue } from '../hooks/useCatalogue';
import { useMoyensPaiement } from '../hooks/useMoyensPaiement';
import { libelleCompteur, libelleStatut } from '../libelles';
import { journalPaiements } from '../../domain/rapport';
import { CHOIX_USAGE, coutUsage } from '../../domain/usage';
import styles from './Fiche.module.css';

/** Paiements affichés avant « Tout voir ». */
const JOURNAL_MAX = 6;

interface Props {
  id: string;
  onRetour: () => void;
  onModifier: (id: string) => void;
  /** EF-07 : ouvre la création pré-remplie avec une copie */
  onDupliquer: (id: string) => void;
}

/**
 * Fiche abonnement (EF-13, §7.2) : toutes les informations, ancienneté
 * (EF-18), actions de statut (EF-06), archivage, suppression définitive avec
 * confirmation (EF-01), désabonnement rapide routé par canal et mode de
 * résiliation avec proposition de statut (EF-20 à EF-22).
 */
export function Fiche({ id, onRetour, onModifier, onDupliquer }: Props) {
  const i18n = useI18n();
  const { t, tn, montant, date, periodicite: libPeriodicite } = i18n;
  const storage = useStorage();
  const toast = useToast();
  const { abonnements, chargement } = useAbonnements();
  const moyensPaiement = useMoyensPaiement();
  const { parId: services } = useCatalogue();
  const [confirmation, setConfirmation] = useState(false);
  /* EF-06 : pause avec reprise automatique à une date facultative */
  const [pauseDialogue, setPauseDialogue] = useState(false);
  const [repriseLe, setRepriseLe] = useState('');
  const [prixOuvert, setPrixOuvert] = useState(false);
  const [journalComplet, setJournalComplet] = useState(false);
  const { preferences } = usePreferences();
  const { devise: deviseAffichage, convertir } = useConversion();
  const jour = aujourdhui();

  const abo = abonnements.find((a) => a.id === id);

  if (chargement) return <div className={styles.ecran} />;
  if (!abo) {
    return (
      <div className={styles.ecran}>
        <EnTeteFiche onRetour={onRetour} />
        <p className={styles.introuvable}>{t('fiche.introuvable')}</p>
      </div>
    );
  }

  const mp = abo.moyenPaiementId ? moyensPaiement.get(abo.moyenPaiementId) : undefined;
  const journal = journalPaiements(abo, jour);
  /* EF-71 : usage déclaré (utilisations par semaine) ; un second appui sur le choix actif l'efface */
  const usage = coutUsage(abo);
  const declarerUsage = async (n: number) => {
    await enregistrerAbonnement(
      storage,
      { ...abo, usageParSemaine: abo.usageParSemaine === n ? null : n },
      jour,
    );
  };
  const service = abo.serviceId ? services.get(abo.serviceId) : undefined;
  const modele = modeleTuile(abo, jour, mp, service);
  const formule = service ? trouverFormule(service, abo.formuleId) : undefined;
  const statut = abo.statut;
  const enPause = statut.type === 'en_pause';
  const archive = statut.type === 'archive';
  const styleTuile = { '--tuile-couleur': modele.couleur } as CSSProperties;
  const duree = libelleDuree(i18n.langue, anciennete(abo.dateDebut, jour));
  const mensuel = montantMensuel(prixEffectif(abo), abo.periodicite);

  /** Annulation par toast (EF-01b) : retour au statut précédent. */
  const annulation = (precedent: Statut) => ({
    libelle: t('toast.annuler'),
    executer: async () => {
      await changerStatut(storage, id, precedent, aujourdhui());
      toast.afficher(t('toast.actionAnnulee'));
    },
  });
  const reprendre = async () => {
    const precedent = statut;
    await changerStatut(storage, id, { type: 'actif' }, jour);
    toast.afficherAvecAction(t('toast.repris'), annulation(precedent));
  };
  const erreurReprise =
    repriseLe === ''
      ? undefined
      : !estDateISO(repriseLe)
        ? t('erreur.date')
        : comparerDates(repriseLe, jour) <= 0
          ? t('erreur.dateFuture')
          : undefined;
  const mettreEnPause = async () => {
    if (erreurReprise) return;
    const precedent = statut;
    await changerStatut(
      storage,
      id,
      { type: 'en_pause', repriseLe: repriseLe === '' ? null : repriseLe },
      jour,
    );
    setPauseDialogue(false);
    setRepriseLe('');
    toast.afficherAvecAction(t('toast.pause'), annulation(precedent));
  };
  const basculerArchive = async () => {
    const precedent = statut;
    await changerStatut(storage, id, archive ? { type: 'actif' } : { type: 'archive' }, jour);
    toast.afficherAvecAction(
      t(archive ? 'toast.desarchive' : 'toast.archive'),
      annulation(precedent),
    );
  };
  const supprimer = async () => {
    await supprimerAbonnement(storage, id);
    onRetour();
    toast.afficherAvecAction(t('toast.supprime'), {
      libelle: t('toast.annuler'),
      executer: async () => {
        await storage.abonnements.restaurer(id);
        toast.afficher(t('toast.actionAnnulee'));
      },
    });
  };
  /** EF-08 : nouveau prix à une date (passée : historique ; future : hausse annoncée), annulable. */
  const changerPrix = async (nouveauMontant: number, dateEffet: string) => {
    const precedent = abo;
    await enregistrerAbonnement(
      storage,
      appliquerChangementPrix(abo, nouveauMontant, dateEffet, jour),
      jour,
    );
    setPrixOuvert(false);
    toast.afficherAvecAction(
      t(estHausseAnnoncee(dateEffet, jour) ? 'toast.hausseProgrammee' : 'toast.prixModifie'),
      {
        libelle: t('toast.annuler'),
        executer: async () => {
          await enregistrerAbonnement(storage, precedent, aujourdhui());
          toast.afficher(t('toast.actionAnnulee'));
        },
      },
    );
  };
  /** EF-32 : rappels calendrier de cet abonnement (renouvellement, essai, préavis, fin) en .ics. */
  const rappelsIcs = evenementsAVenir([abo], jour, () => ({
    couleur: modele.couleur,
    initiales: modele.initiales,
  }));
  const exporterIcs = () => {
    const ics = icsDepuisEvenements(
      i18n,
      rappelsIcs,
      preferences.alertes,
      new Map([[abo.id, abo]]),
    );
    telechargerFichier(nomFichierIcs(`${abo.nom} ${t('ics.suffixe')}`), ics, 'text/calendar');
    toast.afficher(t('toast.icsTelecharge'));
  };
  const copierReference = async () => {
    if (!abo.referenceClient) return;
    try {
      await navigator.clipboard.writeText(abo.referenceClient);
      toast.afficher(t('toast.refCopiee'));
    } catch {
      // presse-papiers indisponible : pas de retour
    }
  };

  const chipClasse = `${styles.chip} ${styles[`chip_${couleurCompteur(modele.compteur)}`] ?? ''}`;

  return (
    <div className={styles.ecran}>
      <div className={`${styles.entete} ${styles[modele.variante] ?? ''}`} style={styleTuile}>
        <div className={styles.enteteBarre}>
          <button
            type="button"
            className={styles.retour}
            onClick={onRetour}
            aria-label={t('nav.retour')}
          >
            <Icone nom="retour" />
          </button>
          <div className={styles.badges}>
            {abo.canalAchat !== 'direct' ? (
              <span className={styles.badge}>{t(`canal.${abo.canalAchat}`)}</span>
            ) : null}
            <span className={styles.badge}>{libelleStatut(i18n, abo)}</span>
          </div>
        </div>
        <span className={styles.surTitre}>
          {modele.initiales} · {t(`categorie.${abo.categorie}`)}
        </span>
        <h1 className={styles.nom}>{abo.nom}</h1>
        <span className={styles.prixLigne}>{lignePrix(i18n, abo)}</span>
        <span className={chipClasse}>{libelleCompteur(i18n, modele.compteur)}</span>
      </div>

      <div className={styles.corps}>
        {statut.type === 'actif' ? (
          <BlocResiliation
            abo={abo}
            service={service}
            jour={jour}
            onMarquer={async () => {
              const precedent = statut;
              await changerStatut(storage, id, statutApresResiliation(abo, jour), jour);
              toast.afficherAvecAction(t('toast.resilie'), annulation(precedent));
            }}
          />
        ) : null}

        {abo.essai && comparerDates(abo.essai.dateFin, jour) >= 0 ? (
          <Encart titre={t('fiche.essai.titre')} classe="trial">
            {t('fiche.essai.texte', {
              date: date(abo.essai.dateFin),
              compteur: i18n.compteur(joursAvant(abo.essai.dateFin, jour)),
              montant: montant(abo.essai.prixApres),
              periodicite: libPeriodicite(abo.periodicite),
            })}
          </Encart>
        ) : null}

        {abo.engagement && statut.type === 'actif' ? (
          <EncartEngagement abo={abo} i18n={i18n} jour={jour} />
        ) : null}

        {abo.prixFutur ? (
          <Encart titre={t('fiche.prixFutur.titre')} classe="warn">
            {t('fiche.prixFutur.texte', {
              montant: montant(abo.prixFutur.montant),
              date: date(abo.prixFutur.date),
              compteur: i18n.compteur(joursAvant(abo.prixFutur.date, jour)),
            })}
          </Encart>
        ) : null}

        {abo.regularisation ? (
          <Encart titre={t('fiche.regularisation.titre')} classe="warn">
            {t('fiche.regularisation.texte', {
              date: date(abo.regularisation.date),
              compteur: i18n.compteur(joursAvant(abo.regularisation.date, jour)),
            })}
          </Encart>
        ) : null}

        {statut.type === 'en_pause' ? (
          <Encart classe="neutre">
            {t('fiche.pause.texte')}
            {statut.repriseLe
              ? ` ${t('fiche.pause.reprise', { date: date(statut.repriseLe) })}`
              : ''}
          </Encart>
        ) : null}
        {statut.type === 'resilie_actif_jusquau' ? (
          <Encart classe="neutre">
            {t('fiche.resilie.texte', { date: date(statut.jusquau) })}
          </Encart>
        ) : null}
        {archive ? <Encart classe="neutre">{t('fiche.archive.texte')}</Encart> : null}

        <dl className={styles.details}>
          {abo.referenceClient ? (
            <Detail libelle={t('fiche.ref')}>
              <button
                type="button"
                className={styles.copier}
                onClick={() => void copierReference()}
              >
                {abo.referenceClient}
              </button>
            </Detail>
          ) : null}
          {abo.rappel ? (
            <Detail libelle={t('fiche.rappel')}>
              {t('fiche.rappel.valeur', {
                date: i18n.date(abo.rappel.date, 'moyen'),
                texte: abo.rappel.texte,
              })}
            </Detail>
          ) : null}
          <Detail libelle={t('fiche.echeance')}>
            {abo.prochaineEcheance
              ? date(abo.prochaineEcheance, 'long')
              : t('fiche.echeance.aucune')}
          </Detail>
          <Detail libelle={t('fiche.periodicite')}>{libPeriodicite(abo.periodicite)}</Detail>
          {abo.engagement ? (
            <Detail libelle={t('fiche.engagement.detail')}>
              {t('fiche.engagement.detail.texte', {
                mois: abo.engagement.dureeMois,
                jours: abo.engagement.preavisJours,
              })}
            </Detail>
          ) : null}
          {formule || abo.formule ? (
            <Detail libelle={t('fiche.formule')}>{formule ? formule.nom : abo.formule}</Detail>
          ) : null}
          {abo.periodicite.type === 'a_l_usage' && abo.periodicite.plafond !== null ? (
            <Detail libelle={t('fiche.plafond')}>
              {t('montant.parMois', { montant: montant(abo.periodicite.plafond) })}
            </Detail>
          ) : null}
          <Detail libelle={t('fiche.mensuel')}>
            {abo.devise === deviseAffichage
              ? montant(mensuel, abo.devise)
              : t('fiche.mensuel.converti', {
                  montant: montant(mensuel, abo.devise),
                  converti: montant(convertir(mensuel, abo.devise), deviseAffichage),
                })}
          </Detail>
          <Detail libelle={t('fiche.depuis')}>
            {t('fiche.depuis.texte', { date: date(abo.dateDebut, 'long'), duree })}
          </Detail>
          <Detail libelle={t('fiche.canal')}>{t(`canal.${abo.canalAchat}`)}</Detail>
          <Detail libelle={t('fiche.paiement')}>{libelleMoyenPaiement(i18n, mp)}</Detail>
          {abo.modeResiliation !== 'lien' ? (
            <Detail libelle={t('fiche.resiliation')}>
              {t(`resiliation.${abo.modeResiliation}`)}
            </Detail>
          ) : null}
        </dl>

        {abo.partage ? (
          <Encart classe="neutre">
            {t('fiche.partage.texte', {
              part: montant(abo.partage.partPayee, abo.devise),
              total: montant(abo.partage.prixTotal, abo.devise),
            })}
          </Encart>
        ) : null}

        {abo.tags.length > 0 ? (
          <section className={styles.section}>
            <h2 className={styles.sectionTitre}>{t('fiche.tags')}</h2>
            <div className={styles.tags}>
              {abo.tags.map((tag) => (
                <span key={tag} className={styles.tag}>
                  {tag}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {abo.periodicite.type === 'recurrente' || abo.historiquePrix.length > 0 ? (
          <section className={styles.section}>
            <div className={styles.sectionEnTete}>
              <h2 className={styles.sectionTitre}>{t('fiche.historique')}</h2>
              {abo.periodicite.type === 'recurrente' && !prixOuvert ? (
                <button
                  type="button"
                  className={styles.lienDiscret}
                  onClick={() => setPrixOuvert(true)}
                >
                  {t('fiche.prix.modifier')}
                </button>
              ) : null}
            </div>
            {prixOuvert ? (
              <FormulairePrix
                jour={jour}
                devise={abo.devise}
                onEnregistrer={changerPrix}
                onAnnuler={() => setPrixOuvert(false)}
              />
            ) : null}
            <ul className={styles.historique}>
              {abo.historiquePrix.map((h, i) => {
                const precedent = abo.historiquePrix[i - 1];
                const delta = precedent ? h.prix - precedent.prix : 0;
                return (
                  <li key={`${h.date}-${i}`} className={styles.historiqueLigne}>
                    <span>{date(h.date)}</span>
                    <span className={styles.historiquePrix}>
                      {delta !== 0 ? (
                        <span className={delta > 0 ? styles.hausse : styles.baisse}>
                          {delta > 0 ? '+' : ''}
                          {montant(delta, abo.devise)}
                        </span>
                      ) : null}
                      {montant(h.prix, abo.devise)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {abo.periodicite.type === 'recurrente' && !archive ? (
          <section className={styles.section}>
            <div className={styles.usageEnTete}>
              <h2 className={styles.sectionTitre}>{t('fiche.usage')}</h2>
              <span className={styles.usageQuestion}>{t('fiche.usage.question')}</span>
            </div>
            <div
              className={styles.usageChoix}
              role="radiogroup"
              aria-label={t('fiche.usage.question')}
            >
              {CHOIX_USAGE.map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={abo.usageParSemaine === n}
                  className={abo.usageParSemaine === n ? styles.usageActif : styles.usageBouton}
                  onClick={() => void declarerUsage(n)}
                >
                  {n === 0 ? t('fiche.usage.jamais') : t('fiche.usage.fois', { n })}
                </button>
              ))}
            </div>
            <span className={usage?.nonUtilise ? styles.usageAlerte : styles.usageTexte}>
              {usage === null
                ? t('fiche.usage.aide')
                : usage.nonUtilise
                  ? t('fiche.usage.zero', { montant: montant(usage.mensuel, abo.devise) })
                  : t('fiche.usage.cout', {
                      montant: montant(usage.parUtilisation ?? 0, abo.devise),
                    })}
            </span>
          </section>
        ) : null}

        {journal.paiements.length > 0 ? (
          <section className={styles.section}>
            <h2 className={styles.sectionTitre}>{t('fiche.paiements')}</h2>
            <div className={styles.cumul}>
              <span className={styles.cumulLegende}>
                {t('fiche.paiements.cumul', { date: date(abo.dateDebut, 'moyen') })}
              </span>
              <span className={styles.cumulMontant}>
                {journal.estime
                  ? t('montant.estime', { montant: montant(journal.cumul, abo.devise) })
                  : montant(journal.cumul, abo.devise)}
              </span>
            </div>
            <ul className={styles.historique}>
              {(journalComplet ? journal.paiements : journal.paiements.slice(0, JOURNAL_MAX)).map(
                (p) => (
                  <li key={p.date} className={styles.historiqueLigne}>
                    <span>{date(p.date, 'moyen')}</span>
                    <span>{montant(p.montant, abo.devise)}</span>
                  </li>
                ),
              )}
            </ul>
            {journal.paiements.length > JOURNAL_MAX ? (
              <button
                type="button"
                className={styles.lienJournal}
                onClick={() => setJournalComplet((v) => !v)}
              >
                {journalComplet
                  ? t('fiche.paiements.reduire')
                  : tn('fiche.paiements.tout', journal.paiements.length)}
              </button>
            ) : null}
          </section>
        ) : null}

        {abo.notes ? (
          <section className={styles.section}>
            <h2 className={styles.sectionTitre}>{t('fiche.notes')}</h2>
            <p className={styles.notes}>{abo.notes}</p>
          </section>
        ) : null}

        <div className={styles.actions}>
          <button type="button" className={styles.boutonPrincipal} onClick={() => onModifier(id)}>
            {t('fiche.modifier')}
          </button>
          <div className={styles.actionsRangee}>
            {!archive ? (
              <button
                type="button"
                className={styles.boutonSecondaire}
                onClick={() => {
                  if (enPause) void reprendre();
                  else setPauseDialogue(true);
                }}
              >
                {t(enPause ? 'fiche.reprendre' : 'fiche.pause')}
              </button>
            ) : null}
            <button
              type="button"
              className={styles.boutonSecondaire}
              onClick={() => void basculerArchive()}
            >
              {t(archive ? 'fiche.desarchiver' : 'fiche.archiver')}
            </button>
            <button
              type="button"
              className={styles.boutonSecondaire}
              onClick={() => onDupliquer(id)}
            >
              {t('fiche.dupliquer')}
            </button>
          </div>
          {rappelsIcs.length > 0 ? (
            <button type="button" className={styles.lienIcs} onClick={exporterIcs}>
              <Icone nom="calendrier" taille={16} />
              {t('fiche.ics')}
            </button>
          ) : null}
        </div>

        <section className={styles.danger}>
          <h2 className={styles.dangerTitre}>{t('fiche.danger')}</h2>
          <p className={styles.note}>{t('fiche.danger.texte')}</p>
          <button
            type="button"
            className={styles.boutonDanger}
            onClick={() => setConfirmation(true)}
          >
            {t('fiche.supprimer')}
          </button>
        </section>
      </div>

      {pauseDialogue ? (
        <div className={styles.voile} role="presentation" onClick={() => setPauseDialogue(false)}>
          <div
            className={styles.dialogue}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pause-titre"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="pause-titre" className={styles.dialogueTitre}>
              {t('fiche.pause.titre', { nom: abo.nom })}
            </h2>
            <ChampDate
              libelle={t('fiche.pause.repriseLe')}
              aide={t('fiche.pause.aide')}
              erreur={erreurReprise}
              valeur={repriseLe}
              onChange={setRepriseLe}
            />
            <div className={styles.dialogueActions}>
              <button
                type="button"
                className={styles.boutonSecondaire}
                onClick={() => setPauseDialogue(false)}
              >
                {t('commun.annuler')}
              </button>
              <button
                type="button"
                className={styles.boutonPrincipal}
                disabled={erreurReprise !== undefined}
                onClick={() => void mettreEnPause()}
              >
                {t('fiche.pause')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmation ? (
        <div className={styles.voile} role="presentation" onClick={() => setConfirmation(false)}>
          <div
            className={styles.dialogue}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="suppr-titre"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="suppr-titre" className={styles.dialogueTitre}>
              {t('fiche.supprimer.question', { nom: abo.nom })}
            </h2>
            <p className={styles.note}>{t('fiche.supprimer.texte')}</p>
            <div className={styles.dialogueActions}>
              <button
                type="button"
                className={styles.boutonSecondaire}
                onClick={() => setConfirmation(false)}
              >
                {t('commun.annuler')}
              </button>
              <button
                type="button"
                className={styles.boutonDanger}
                onClick={() => void supprimer()}
              >
                {t('commun.supprimer')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------------------- */

/**
 * Bouton « Gérer / Résilier » routé par canal et mode (EF-20, EF-21, EF-21b),
 * puis bannière EF-22 : étapes de la démarche à cocher et proposition de
 * passer en « résilié — actif jusqu'au ».
 */
function BlocResiliation({
  abo,
  service,
  jour,
  onMarquer,
}: {
  abo: Abonnement;
  service: Service | undefined;
  jour: DateISO;
  onMarquer: () => Promise<void>;
}) {
  const { t, date } = useI18n();
  const [banniere, setBanniere] = useState(false);
  const [coches, setCoches] = useState<Set<number>>(() => new Set());
  const action = actionResiliation(abo, service);
  const etapes = cleEtapes(abo);
  const jusquau = statutApresResiliation(abo, jour);
  const ouvrirBanniere = () => setBanniere(true);

  let bouton: ReactNode;
  let note: string;
  switch (action.type) {
    case 'lien':
      bouton = (
        <a
          className={styles.boutonPrincipal}
          href={action.url}
          target="_blank"
          rel="noreferrer"
          onClick={ouvrirBanniere}
        >
          {t('fiche.gerer')}
          <Icone nom="externe" taille={14} />
        </a>
      );
      note =
        action.source === 'service'
          ? t('resiliation.note.service', { c: action.url })
          : t(`resiliation.note.${action.source}`);
      break;
    case 'telephone':
      bouton = estTelephone(action.contact) ? (
        <a
          className={styles.boutonPrincipal}
          href={lienTelephone(action.contact)}
          onClick={ouvrirBanniere}
        >
          {t('resiliation.bouton.telephone')}
          <Icone nom="telephone" taille={14} />
        </a>
      ) : (
        <button type="button" className={styles.boutonPrincipal} onClick={ouvrirBanniere}>
          {t('resiliation.bouton.telephone')}
          <Icone nom="telephone" taille={14} />
        </button>
      );
      note = action.contact
        ? t('resiliation.note.telephone', { c: action.contact })
        : t('resiliation.note.contactAbsent');
      break;
    case 'courrier_recommande':
      bouton = (
        <button type="button" className={styles.boutonPrincipal} onClick={ouvrirBanniere}>
          {t('resiliation.bouton.courrier_recommande')}
          <Icone nom="courrier" taille={14} />
        </button>
      );
      note = action.contact
        ? t('resiliation.note.courrier_recommande', { c: action.contact })
        : t('resiliation.note.contactAbsent');
      break;
    case 'espace_client':
      bouton = action.url ? (
        <a
          className={styles.boutonPrincipal}
          href={action.url}
          target="_blank"
          rel="noreferrer"
          onClick={ouvrirBanniere}
        >
          {t('resiliation.bouton.espace_client')}
          <Icone nom="externe" taille={14} />
        </a>
      ) : (
        <button type="button" className={styles.boutonPrincipal} onClick={ouvrirBanniere}>
          {t('resiliation.bouton.espace_client')}
        </button>
      );
      note = action.contact
        ? t('resiliation.note.espace_client', { c: action.contact })
        : t('resiliation.note.contactAbsent');
      break;
    case 'aucune':
      bouton = <span className={styles.boutonDesactive}>{t('fiche.gerer')}</span>;
      note = t('fiche.gerer.absent');
      break;
  }

  const basculer = (i: number) =>
    setCoches((c) => {
      const suivant = new Set(c);
      if (suivant.has(i)) suivant.delete(i);
      else suivant.add(i);
      return suivant;
    });

  return (
    <div className={styles.bloc}>
      {bouton}
      <span className={styles.note}>{note}</span>
      {!banniere && action.type !== 'aucune' ? (
        <button type="button" className={styles.lienDiscret} onClick={ouvrirBanniere}>
          {t('resiliation.marquer')}
        </button>
      ) : null}
      {banniere ? (
        <div className={styles.banniere}>
          <span className={styles.banniereTexte}>
            {t('resiliation.banniere', { date: date(jusquau.jusquau) })}
          </span>
          <div className={styles.etapes}>
            <span className={styles.etapesTitre}>{t('resiliation.etapes.titre')}</span>
            {Array.from({ length: NOMBRE_ETAPES }, (_, i) => i + 1).map((n) => {
              const coche = coches.has(n);
              return (
                <button
                  key={n}
                  type="button"
                  role="checkbox"
                  aria-checked={coche}
                  className={coche ? styles.etapeCochee : styles.etape}
                  onClick={() => basculer(n)}
                >
                  <span className={styles.etapeCase}>
                    {coche ? <Icone nom="coche" taille={11} /> : null}
                  </span>
                  <span>
                    {t(`resiliation.etapes.${etapes}.${n as 1 | 2 | 3 | 4}`, { nom: abo.nom })}
                  </span>
                </button>
              );
            })}
          </div>
          <div className={styles.banniereActions}>
            <button type="button" className={styles.boutonViolet} onClick={() => void onMarquer()}>
              {t('resiliation.oui')}
            </button>
            <button
              type="button"
              className={styles.boutonSecondaire}
              onClick={() => setBanniere(false)}
            >
              {t('resiliation.plusTard')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EnTeteFiche({ onRetour }: { onRetour: () => void }) {
  const { t } = useI18n();
  return (
    <div className={styles.enteteBarre}>
      <button
        type="button"
        className={styles.retour}
        onClick={onRetour}
        aria-label={t('nav.retour')}
      >
        <Icone nom="retour" />
      </button>
    </div>
  );
}

function Encart({
  titre,
  classe,
  children,
}: {
  titre?: string;
  classe: 'trial' | 'warn' | 'neutre';
  children: ReactNode;
}) {
  return (
    <div className={`${styles.encart} ${styles[`encart_${classe}`] ?? ''}`}>
      {titre ? <span className={styles.encartTitre}>{titre}</span> : null}
      <span className={styles.encartTexte}>{children}</span>
    </div>
  );
}

function EncartEngagement({ abo, i18n, jour }: { abo: Abonnement; i18n: I18n; jour: string }) {
  const fin = finEngagement(abo, jour);
  const limite = dateLimiteResiliation(abo, jour);
  if (!fin || !limite) return null;
  return (
    <Encart titre={i18n.t('fiche.engagement.titre')} classe="trial">
      {i18n.t('fiche.engagement.texte', {
        fin: i18n.date(fin),
        limite: i18n.date(limite),
        compteur: i18n.compteur(joursAvant(limite, jour)),
      })}
    </Encart>
  );
}

/** EF-08 : nouveau prix et date d'effet ; la validation est celle du domaine. */
function FormulairePrix({
  jour,
  devise,
  onEnregistrer,
  onAnnuler,
}: {
  jour: string;
  devise: Devise;
  onEnregistrer: (montant: number, dateEffet: string) => Promise<void>;
  onAnnuler: () => void;
}) {
  const { t } = useI18n();
  const [etat, setEtat] = useState<FormulaireChangementPrix>(() => formulairePrixVide(jour));
  const [erreurs, setErreurs] = useState<ErreursPrix>({});
  const erreur = (champ: keyof FormulaireChangementPrix) => {
    const code = erreurs[champ];
    return code ? t(`erreur.${code}`) : undefined;
  };
  const soumettre = async () => {
    const e = validerChangementPrix(etat);
    setErreurs(e);
    if (Object.keys(e).length > 0) return;
    await onEnregistrer(parserMontant(etat.montant) ?? 0, etat.dateEffet);
  };
  return (
    <form
      className={styles.prixForm}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void soumettre();
      }}
    >
      <div className={styles.prixChamps}>
        <Champ
          libelle={t('fiche.prix.montant', { d: SYMBOLES[devise] })}
          erreur={erreur('montant')}
        >
          {(a) => (
            <input
              {...a}
              type="text"
              inputMode="decimal"
              value={etat.montant}
              onChange={(e) => setEtat((s) => ({ ...s, montant: e.target.value }))}
              placeholder={t('fiche.prix.montant.ph')}
              autoFocus
            />
          )}
        </Champ>
        <ChampDate
          libelle={t('fiche.prix.date')}
          erreur={erreur('dateEffet')}
          valeur={etat.dateEffet}
          onChange={(v) => setEtat((s) => ({ ...s, dateEffet: v }))}
        />
      </div>
      <p className={styles.note}>{t('fiche.prix.aide')}</p>
      <div className={styles.prixActions}>
        <button type="submit" className={styles.boutonPetitPrincipal}>
          {t('commun.enregistrer')}
        </button>
        <button type="button" className={styles.boutonPetit} onClick={onAnnuler}>
          {t('commun.annuler')}
        </button>
      </div>
    </form>
  );
}

function Detail({ libelle, children }: { libelle: string; children: React.ReactNode }) {
  return (
    <div className={styles.detail}>
      <dt className={styles.detailLibelle}>{libelle}</dt>
      <dd className={styles.detailValeur}>{children}</dd>
    </div>
  );
}

function lignePrix(i18n: I18n, abo: Abonnement): string {
  const p = abo.periodicite;
  if (p.type === 'a_l_usage') {
    return p.plafond === null
      ? i18n.t('tuile.sous.usage')
      : i18n.t('tuile.sous.usagePlafond', { montant: i18n.montant(p.plafond, abo.devise) });
  }
  const prix = abo.montantEstime
    ? i18n.t('montant.estime', { montant: i18n.montant(abo.prix, abo.devise) })
    : i18n.montant(abo.prix, abo.devise);
  return `${prix} ${i18n.periodicite(p)}`;
}

function libelleMoyenPaiement(i18n: I18n, mp: MoyenPaiement | undefined): string {
  if (!mp) return i18n.t('fiche.paiement.aucun');
  return mp.quatreDerniers ? `${mp.libelle} ···· ${mp.quatreDerniers}` : mp.libelle;
}
