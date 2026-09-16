import { useMemo, useState } from 'react';
import { ADRESSE_CONTACT } from '../../data/contact';
import { decrireAppareil, lienRetour } from '../../domain/retours';
import {
  enregistrerServicePersonnalise,
  migrerVersOfficiel,
  restaurerServicePersonnalise,
  supprimerServicePersonnalise,
} from '../../data/services/servicesPersonnalises';
import { correspondancesOfficielles, type Correspondance } from '../../domain/migrationServices';
import {
  appStoreSeulement,
  grouperAvecMesServices,
  rechercherServices,
} from '../../domain/catalogue';
import {
  couleurPourNom,
  creerServicePersonnalise,
  estServicePersonnalise,
  formulaireServiceVide,
  validerServicePersonnalise,
  type ErreursService,
  type FormulaireServicePersonnalise,
} from '../../domain/servicePersonnalise';
import { initialesDuNom } from '../../domain/tuile';
import { CATEGORIES, type Service } from '../../domain/types';
import { Champ } from '../components/Champ';
import { Chips } from '../components/Chips';
import { EnTete } from '../components/EnTete';
import { Icone } from '../components/Icone';
import { useI18n } from '../contexts/I18nContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { useStorage } from '../contexts/StorageContext';
import { useToast } from '../contexts/ToastContext';
import { useCatalogue } from '../hooks/useCatalogue';
import styles from './Catalogue.module.css';

const VERSION_APP = __APP_VERSION__;

interface Props {
  onRetour: () => void;
  /** « Utiliser » : ouvre la création pré-remplie avec ce service (EF-02) */
  onUtiliser: (service: Service) => void;
}

/**
 * Écran Catalogue (§7.8) : fraîcheur des données de référence (§5.6),
 * recherche, « Proposer un service » (EF-09) et groupe « Mes services » en
 * tête, puis les services préchargés par catégorie.
 */
export function Catalogue({ onRetour, onUtiliser }: Props) {
  const { t, tn, date, langue } = useI18n();
  const storage = useStorage();
  const toast = useToast();
  const { preferences, modifier } = usePreferences();
  const { catalogue, personnalises } = useCatalogue();
  const [recherche, setRecherche] = useState('');
  const [propositionOuverte, setPropositionOuverte] = useState(false);

  const groupes = useMemo(
    () => grouperAvecMesServices(rechercherServices(catalogue.data, recherche)),
    [catalogue.data, recherche],
  );
  const vide = groupes.mesServices.length === 0 && groupes.parCategorie.length === 0;

  const supprimer = async (s: Service) => {
    await supprimerServicePersonnalise(storage, s.id);
    toast.afficherAvecAction(t('toast.serviceSupprime'), {
      libelle: t('toast.annuler'),
      executer: async () => {
        await restaurerServicePersonnalise(storage, s.id);
        toast.afficher(t('toast.actionAnnulee'));
      },
    });
  };

  /** E-mail pré-rempli vers l'auteur pour proposer le service au catalogue commun (rien n'est envoyé par l'app). */
  const lienProposition = (s: Service) =>
    lienRetour(
      ADRESSE_CONTACT,
      t('retours.sujet.service', { version: VERSION_APP, nom: s.nom }),
      t('retours.corps.service', {
        nom: s.nom,
        categorie: t(`categorie.${s.categorie}`),
        url: s.urlGestion ?? '—',
        version: VERSION_APP,
        appareil: decrireAppareil(window.navigator.userAgent, window.navigator.maxTouchPoints),
        langue,
      }),
    );

  /* EF-09 : entrées maison qui ont désormais un homonyme officiel ; proposition, jamais de bascule silencieuse */
  const embarques = useMemo(
    () => catalogue.data.filter((s) => !estServicePersonnalise(s)),
    [catalogue.data],
  );
  const correspondances = useMemo(
    () => correspondancesOfficielles(personnalises, embarques, preferences.migrationsRefusees),
    [personnalises, embarques, preferences.migrationsRefusees],
  );
  const migrer = async (c: Correspondance) => {
    const bilan = await migrerVersOfficiel(storage, c);
    const message =
      bilan.nbAbonnements === 0
        ? t('toast.migration.aucun', { nom: c.officiel.nom })
        : tn('toast.migration', bilan.nbAbonnements, { nom: c.officiel.nom });
    toast.afficherAvecAction(message, {
      libelle: t('toast.annuler'),
      executer: async () => {
        await bilan.annuler();
        toast.afficher(t('toast.actionAnnulee'));
      },
    });
  };
  const refuserMigration = (c: Correspondance) =>
    modifier({ migrationsRefusees: [...preferences.migrationsRefusees, c.personnalise.id] });

  const proposer = async (etat: FormulaireServicePersonnalise) => {
    const service = creerServicePersonnalise(etat);
    await enregistrerServicePersonnalise(storage, service);
    setPropositionOuverte(false);
    toast.afficherAvecAction(t('toast.serviceAjoute'), {
      libelle: t('toast.serviceEnvoyer'),
      executer: () => window.location.assign(lienProposition(service)),
    });
  };

  const ligne = (s: Service, personnalise: boolean) => (
    <li key={s.id} className={styles.ligne}>
      <span className={styles.logo} style={{ background: s.couleur }}>
        {s.logo.valeur}
      </span>
      <span className={styles.textes}>
        <span className={styles.nom}>
          {s.nom}
          {appStoreSeulement(s) ? (
            <span className={styles.badge}>{t('canal.app_store')}</span>
          ) : null}
        </span>
        <span className={styles.detail}>
          {s.urlGestion ?? s.contactResiliation ?? t(`categorie.${s.categorie}`)}
        </span>
      </span>
      {personnalise ? (
        <a
          className={styles.envoyer}
          href={lienProposition(s)}
          aria-label={`${t('catalogue.mesServices.envoyer')} — ${s.nom}`}
          title={t('catalogue.mesServices.envoyer')}
        >
          <Icone nom="courrier" taille={14} />
        </a>
      ) : null}
      {personnalise ? (
        <button
          type="button"
          className={styles.supprimer}
          onClick={() => void supprimer(s)}
          aria-label={`${t('catalogue.supprimer')} — ${s.nom}`}
        >
          <Icone nom="fermer" taille={14} />
        </button>
      ) : null}
      <button type="button" className={styles.utiliser} onClick={() => onUtiliser(s)}>
        {t('catalogue.utiliser')}
      </button>
    </li>
  );

  return (
    <div className={styles.ecran}>
      <EnTete
        titre={t('catalogue.titre')}
        sousTitre={tn('catalogue.nombre', catalogue.data.length)}
        retour={{ icone: 'retour', libelle: t('nav.retour'), onClick: onRetour }}
      />
      <p className={styles.fraicheur}>
        {t('catalogue.fraicheur', { n: catalogue.version, d: date(catalogue.publieLe, 'long') })}
      </p>

      <div className={styles.recherche}>
        <Icone nom="recherche" taille={15} />
        <input
          type="search"
          className={styles.rechercheEntree}
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder={t('catalogue.recherche.ph', { n: catalogue.data.length })}
          aria-label={t('catalogue.titre')}
        />
      </div>

      {propositionOuverte ? (
        <FormulaireProposition
          existants={catalogue.data}
          onAnnuler={() => setPropositionOuverte(false)}
          onProposer={proposer}
        />
      ) : (
        <button
          type="button"
          className={styles.proposer}
          onClick={() => setPropositionOuverte(true)}
        >
          <Icone nom="plus" taille={16} />
          {t('catalogue.proposer')}
        </button>
      )}

      {groupes.mesServices.length > 0 ? (
        <section className={styles.groupe}>
          <h2 className={styles.groupeTitre}>
            {t('catalogue.mesServices')} · {groupes.mesServices.length}
          </h2>
          <p className={styles.groupeTexte}>{t('catalogue.mesServices.texte')}</p>
          {correspondances.map((c) => (
            <div key={c.personnalise.id} className={styles.migration} role="status">
              <span className={styles.migrationTitre}>
                {t('catalogue.migration.titre', { nom: c.officiel.nom })}
              </span>
              <span className={styles.migrationTexte}>{t('catalogue.migration.texte')}</span>
              <div className={styles.propositionActions}>
                <button
                  type="button"
                  className={styles.boutonPrincipal}
                  onClick={() => void migrer(c)}
                >
                  {t('catalogue.migration.accepter')}
                </button>
                <button
                  type="button"
                  className={styles.boutonSecondaire}
                  onClick={() => refuserMigration(c)}
                >
                  {t('catalogue.migration.refuser')}
                </button>
              </div>
            </div>
          ))}
          <ul className={styles.liste}>{groupes.mesServices.map((s) => ligne(s, true))}</ul>
        </section>
      ) : null}

      {vide ? <p className={styles.vide}>{t('catalogue.vide')}</p> : null}

      {groupes.parCategorie.map((g) => (
        <section key={g.categorie} className={styles.groupe}>
          <h2 className={styles.groupeTitre}>
            {t(`categorie.${g.categorie}`)} · {g.services.length}
          </h2>
          <ul className={styles.liste}>{g.services.map((s) => ligne(s, false))}</ul>
        </section>
      ))}

      <p className={styles.note}>{t('catalogue.note')}</p>
    </div>
  );
}

/** Formulaire « Proposer un service » (EF-09) : nom, catégorie, adresse ; couleur et initiales générées. */
function FormulaireProposition({
  existants,
  onAnnuler,
  onProposer,
}: {
  existants: readonly Service[];
  onAnnuler: () => void;
  onProposer: (etat: FormulaireServicePersonnalise) => Promise<void>;
}) {
  const { t } = useI18n();
  const [etat, setEtat] = useState<FormulaireServicePersonnalise>(formulaireServiceVide);
  const [erreurs, setErreurs] = useState<ErreursService>({});
  const maj = <C extends keyof FormulaireServicePersonnalise>(
    champ: C,
    valeur: FormulaireServicePersonnalise[C],
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
  const erreur = (champ: keyof FormulaireServicePersonnalise) => {
    const code = erreurs[champ];
    return code ? t(`erreur.${code}`) : undefined;
  };
  const soumettre = async () => {
    const e = validerServicePersonnalise(etat, existants);
    setErreurs(e);
    if (Object.keys(e).length > 0) return;
    await onProposer(etat);
  };
  const optionsCategorie = CATEGORIES.map((c) => ({ valeur: c, libelle: t(`categorie.${c}`) }));
  const apercuNom = etat.nom.trim();

  return (
    <form
      className={styles.proposition}
      onSubmit={(e) => {
        e.preventDefault();
        void soumettre();
      }}
      noValidate
    >
      <span className={styles.groupeTitre}>{t('catalogue.proposer.titre')}</span>
      <div className={styles.propositionNom}>
        <span
          className={styles.logo}
          style={{ background: apercuNom ? couleurPourNom(apercuNom) : 'var(--sand2)' }}
          aria-hidden="true"
        >
          {apercuNom ? initialesDuNom(apercuNom) : '?'}
        </span>
        <div className={styles.propositionChamp}>
          <Champ libelle={t('catalogue.proposer.nom')} erreur={erreur('nom')}>
            {(a) => (
              <input
                {...a}
                type="text"
                value={etat.nom}
                onChange={(e) => maj('nom', e.target.value)}
                placeholder={t('catalogue.proposer.nom.ph')}
                autoComplete="off"
                autoFocus
              />
            )}
          </Champ>
        </div>
      </div>
      <div className={styles.propositionBloc}>
        <span className={styles.groupeTitre}>{t('catalogue.proposer.categorie')}</span>
        <Chips
          nom={t('catalogue.proposer.categorie')}
          options={optionsCategorie}
          valeur={etat.categorie}
          onChange={(v) => maj('categorie', v)}
        />
      </div>
      <Champ libelle={t('catalogue.proposer.url')} erreur={erreur('urlGestion')}>
        {(a) => (
          <input
            {...a}
            type="url"
            inputMode="url"
            value={etat.urlGestion}
            onChange={(e) => maj('urlGestion', e.target.value)}
            placeholder={t('catalogue.proposer.url.ph')}
          />
        )}
      </Champ>
      <p className={styles.note}>{t('catalogue.proposer.note')}</p>
      <div className={styles.propositionActions}>
        <button type="submit" className={styles.boutonPrincipal}>
          {t('catalogue.proposer.ajouter')}
        </button>
        <button type="button" className={styles.boutonSecondaire} onClick={onAnnuler}>
          {t('commun.annuler')}
        </button>
      </div>
    </form>
  );
}
