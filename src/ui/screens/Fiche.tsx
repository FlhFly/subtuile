import { useState, type CSSProperties, type ReactNode } from 'react';
import { changerStatut, supprimerAbonnement } from '../../data/services/abonnements';
import {
  anciennete,
  aujourdhui,
  comparerDates,
  dateLimiteResiliation,
  finEngagement,
  joursAvant,
  montantMensuel,
  prixEffectif,
} from '../../domain/dates';
import { couleurCompteur, modeleTuile } from '../../domain/tuile';
import { trouverFormule } from '../../data/refdata/RefDataProvider';
import type { Abonnement, MoyenPaiement } from '../../domain/types';
import { libelleDuree } from '../../i18n';
import { Icone } from '../components/Icone';
import { useI18n, type I18n } from '../contexts/I18nContext';
import { useStorage } from '../contexts/StorageContext';
import { useToast } from '../contexts/ToastContext';
import { useAbonnements } from '../hooks/useAbonnements';
import { useCatalogue } from '../hooks/useCatalogue';
import { useMoyensPaiement } from '../hooks/useMoyensPaiement';
import { libelleCompteur, libelleStatut } from '../libelles';
import styles from './Fiche.module.css';

interface Props {
  id: string;
  onRetour: () => void;
  onModifier: (id: string) => void;
}

/**
 * Fiche abonnement (EF-13, §7.2) : toutes les informations, ancienneté
 * (EF-18), actions de statut (EF-06), archivage, suppression définitive avec
 * confirmation (EF-01). Le routage « Gérer / Résilier » par canal arrive au
 * lot 2 : en V1 le bouton ouvre l'adresse de gestion renseignée.
 */
export function Fiche({ id, onRetour, onModifier }: Props) {
  const i18n = useI18n();
  const { t, montant, date, periodicite: libPeriodicite } = i18n;
  const storage = useStorage();
  const toast = useToast();
  const { abonnements, chargement } = useAbonnements();
  const moyensPaiement = useMoyensPaiement();
  const { parId: services } = useCatalogue();
  const [confirmation, setConfirmation] = useState(false);
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
  const service = abo.serviceId ? services.get(abo.serviceId) : undefined;
  const modele = modeleTuile(abo, jour, mp, service);
  const formule = service ? trouverFormule(service, abo.formuleId) : undefined;
  const statut = abo.statut;
  const enPause = statut.type === 'en_pause';
  const archive = statut.type === 'archive';
  const styleTuile = { '--tuile-couleur': modele.couleur } as CSSProperties;
  const duree = libelleDuree(i18n.langue, anciennete(abo.dateDebut, jour));

  const basculerPause = async () => {
    await changerStatut(
      storage,
      id,
      enPause ? { type: 'actif' } : { type: 'en_pause', repriseLe: null },
      jour,
    );
    toast.afficher(t(enPause ? 'toast.repris' : 'toast.pause'));
  };
  const basculerArchive = async () => {
    await changerStatut(storage, id, archive ? { type: 'actif' } : { type: 'archive' }, jour);
    toast.afficher(t(archive ? 'toast.desarchive' : 'toast.archive'));
  };
  const supprimer = async () => {
    await supprimerAbonnement(storage, id);
    toast.afficher(t('toast.supprime'));
    onRetour();
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
          <div className={styles.bloc}>
            {abo.urlGestion ? (
              <a
                className={styles.boutonPrincipal}
                href={abo.urlGestion}
                target="_blank"
                rel="noreferrer"
              >
                {t('fiche.gerer')}
                <Icone nom="plus" taille={14} />
              </a>
            ) : (
              <span className={styles.boutonDesactive}>{t('fiche.gerer')}</span>
            )}
            <span className={styles.note}>
              {abo.urlGestion
                ? t('fiche.gerer.ouvre', { url: abo.urlGestion })
                : t('fiche.gerer.absent')}
            </span>
            {abo.modeResiliation !== 'lien' && abo.contactResiliation ? (
              <span className={styles.note}>
                {t('fiche.gerer.contact', {
                  mode: t(`resiliation.${abo.modeResiliation}`).toLowerCase(),
                  contact: abo.contactResiliation,
                })}
              </span>
            ) : null}
          </div>
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
          <Detail libelle={t('fiche.echeance')}>
            {abo.prochaineEcheance
              ? date(abo.prochaineEcheance, 'long')
              : t('fiche.echeance.aucune')}
          </Detail>
          <Detail libelle={t('fiche.periodicite')}>{libPeriodicite(abo.periodicite)}</Detail>
          {formule ? <Detail libelle={t('fiche.formule')}>{formule.nom}</Detail> : null}
          {abo.periodicite.type === 'a_l_usage' && abo.periodicite.plafond !== null ? (
            <Detail libelle={t('fiche.plafond')}>
              {t('montant.parMois', { montant: montant(abo.periodicite.plafond) })}
            </Detail>
          ) : null}
          <Detail libelle={t('fiche.mensuel')}>
            {montant(montantMensuel(prixEffectif(abo), abo.periodicite))}
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
              part: montant(abo.partage.partPayee),
              total: montant(abo.partage.prixTotal),
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

        {abo.historiquePrix.length > 0 ? (
          <section className={styles.section}>
            <h2 className={styles.sectionTitre}>{t('fiche.historique')}</h2>
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
                          {montant(delta)}
                        </span>
                      ) : null}
                      {montant(h.prix)}
                    </span>
                  </li>
                );
              })}
            </ul>
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
                onClick={() => void basculerPause()}
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
          </div>
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
      : i18n.t('tuile.sous.usagePlafond', { montant: i18n.montant(p.plafond) });
  }
  const prix = abo.montantEstime
    ? i18n.t('montant.estime', { montant: i18n.montant(abo.prix) })
    : i18n.montant(abo.prix);
  return `${prix} ${i18n.periodicite(p)}`;
}

function libelleMoyenPaiement(i18n: I18n, mp: MoyenPaiement | undefined): string {
  if (!mp) return i18n.t('fiche.paiement.aucun');
  return mp.quatreDerniers ? `${mp.libelle} ···· ${mp.quatreDerniers}` : mp.libelle;
}
