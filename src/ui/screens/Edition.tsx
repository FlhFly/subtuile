import { useMemo, useState, type ReactNode } from 'react';
import { enregistrerAbonnement } from '../../data/services/abonnements';
import { ALERTES_DEFAUT } from '../../data/preferences';
import { trouverFormule } from '../../data/refdata/RefDataProvider';
import {
  appliquerFormule,
  appStoreSeulement,
  comparaisonCanaux,
  detacherDuCatalogue,
  preRemplirDepuisService,
  servicesPourSelection,
  suggestionsCatalogue,
} from '../../domain/catalogue';
import { aujourdhui, calculerProchaineEcheance } from '../../domain/dates';
import {
  abonnementDepuisFormulaire,
  compterOptionsAvancees,
  formulaireDepuisAbonnement,
  formulairePourDuplication,
  formulaireVide,
  periodiciteDepuisFormulaire,
  PRESETS_ALERTE,
  PRESETS_PERIODE,
  validerFormulaire,
  type EtatFormulaire,
  type Erreurs,
} from '../../domain/formulaire';
import {
  CANAUX_ACHAT,
  CATEGORIES,
  MODES_RESILIATION,
  UNITES_PERIODE,
  type Abonnement,
  type Service,
} from '../../domain/types';
import { Champ } from '../components/Champ';
import { Chips } from '../components/Chips';
import { Icone } from '../components/Icone';
import { Interrupteur } from '../components/Interrupteur';
import { useI18n } from '../contexts/I18nContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { useStorage } from '../contexts/StorageContext';
import { useToast } from '../contexts/ToastContext';
import { useCatalogue } from '../hooks/useCatalogue';
import { useMoyensPaiement } from '../hooks/useMoyensPaiement';
import styles from './Edition.module.css';

interface Props {
  /** abonnement à modifier ; absent = création */
  existant?: Abonnement | undefined;
  /** service du catalogue à pré-remplir (création depuis l'écran Catalogue) */
  serviceInitial?: Service | undefined;
  /** abonnement à dupliquer (EF-07) : création pré-remplie avec une copie */
  modele?: Abonnement | undefined;
  onFermer: () => void;
  onEnregistre: (id: string) => void;
}

type Mode = 'catalogue' | 'libre';

/**
 * Création / édition (EF-01, EF-02, EF-02b, §7.3) : mode catalogue
 * (sélection d'un service, formules, canal, mention « moins cher en direct »)
 * ou saisie libre (avec suggestions du catalogue). Périodicités complètes ;
 * options avancées : essai, engagement, partage, vie courante, hausse
 * annoncée, paiement, canal, mode de résiliation, référence, adresse,
 * alerte, tags, notes.
 */
export function Edition({ existant, serviceInitial, modele, onFermer, onEnregistre }: Props) {
  const { t, tn, date, montant } = useI18n();
  const { preferences } = usePreferences();
  const storage = useStorage();
  const toast = useToast();
  const moyensPaiement = useMoyensPaiement();
  const { catalogue, parId: services } = useCatalogue();
  const jour = aujourdhui();

  const [etat, setEtat] = useState<EtatFormulaire>(() => {
    if (existant) return formulaireDepuisAbonnement(existant, jour);
    if (modele) return formulairePourDuplication(modele, jour, t('edition.copie'));
    const vide = formulaireVide(jour);
    return serviceInitial ? preRemplirDepuisService(vide, serviceInitial) : vide;
  });
  /** L'onglet reflète l'origine de l'entrée : liée au catalogue ou saisie libre. */
  const origine = existant ?? modele;
  const [mode, setMode] = useState<Mode>(origine?.serviceId === null ? 'libre' : 'catalogue');
  /** grille de sélection visible (création, onglet Catalogue, avant choix ou après « Changer ») */
  const [pickerOuvert, setPickerOuvert] = useState(!origine && !serviceInitial);
  const [recherche, setRecherche] = useState('');
  const [suggestionsIgnorees, setSuggestionsIgnorees] = useState(false);
  const [erreurs, setErreurs] = useState<Erreurs>({});
  /** repliées par défaut, même en modification : le bouton Enregistrer reste à portée (retour FlhFly) */
  const [plusOuvert, setPlusOuvert] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);

  const service = etat.serviceId ? services.get(etat.serviceId) : undefined;
  const formule = service ? trouverFormule(service, etat.formuleId) : undefined;
  const optionsRenseignees = compterOptionsAvancees(etat);
  const comparaison = service ? comparaisonCanaux(service, formule) : undefined;
  const suggestions =
    service || suggestionsIgnorees ? [] : suggestionsCatalogue(catalogue.data, etat.nom);
  const selection = useMemo(
    () => servicesPourSelection(catalogue.data, recherche),
    [catalogue.data, recherche],
  );

  const maj = <C extends keyof EtatFormulaire>(champ: C, valeur: EtatFormulaire[C]) => {
    setEtat((e) => ({ ...e, [champ]: valeur }));
    if (erreurs[champ]) {
      setErreurs((er) => {
        const reste = { ...er };
        delete reste[champ];
        return reste;
      });
    }
  };

  const choisirService = (s: Service) => {
    setEtat((e) => preRemplirDepuisService(e, s));
    setErreurs({});
    setMode('catalogue');
    setPickerOuvert(false);
    setRecherche('');
  };
  const detacher = () => setEtat((e) => detacherDuCatalogue(e));
  /** Changement d'onglet : « Saisie libre » détache sans perdre la saisie, « Catalogue » rouvre la grille. */
  const changerMode = (m: Mode) => {
    setMode(m);
    if (m === 'libre') detacher();
    else setPickerOuvert(!service);
  };

  const apercuEcheance = useMemo(() => {
    const p = periodiciteDepuisFormulaire(etat);
    if (!p || p.type !== 'recurrente') return null;
    try {
      return calculerProchaineEcheance(
        {
          dateDebut: etat.dateDebut,
          periodicite: p,
          echeanceManuelle: etat.echeanceManuelle || null,
          essai: etat.essai && etat.essaiFin ? { dateFin: etat.essaiFin, prixApres: 0 } : null,
          statut: existant?.statut ?? { type: 'actif' },
        },
        jour,
      );
    } catch {
      return null;
    }
  }, [etat, existant, jour]);

  const erreur = (champ: keyof EtatFormulaire) => {
    const code = erreurs[champ];
    return code ? t(`erreur.${code}`) : undefined;
  };

  const enregistrer = async () => {
    const e = validerFormulaire(etat);
    setErreurs(e);
    if (Object.keys(e).length > 0) return;
    setEnregistrement(true);
    try {
      const abo = abonnementDepuisFormulaire(etat, { jour }, existant);
      const enregistre = await enregistrerAbonnement(storage, abo, jour);
      toast.afficher(t(existant ? 'toast.enregistre' : 'toast.cree'));
      onEnregistre(enregistre.id);
    } finally {
      setEnregistrement(false);
    }
  };

  const optionsCategorie = CATEGORIES.map((c) => ({ valeur: c, libelle: t(`categorie.${c}`) }));
  const optionsType = (['recurrente', 'a_vie', 'a_l_usage'] as const).map((v) => ({
    valeur: v,
    libelle: t(`edition.type.${v}`),
  }));
  const optionsPreset = PRESETS_PERIODE.map((p) => ({
    valeur: p,
    libelle: t(`edition.preset.${p}`),
  }));
  const optionsUnite = UNITES_PERIODE.map((u) => ({ valeur: u, libelle: t(`edition.unite.${u}`) }));
  const optionsPaiement = [
    { valeur: '', libelle: t('edition.paiement.aucun') },
    ...[...moyensPaiement.values()].map((m) => ({
      valeur: m.id,
      libelle: m.libelle,
      couleur: m.couleur,
    })),
  ];
  const optionsCanal = CANAUX_ACHAT.map((c) => ({ valeur: c, libelle: t(`canal.${c}`) }));
  const optionsResiliation = MODES_RESILIATION.map((m) => ({
    valeur: m,
    libelle: t(`resiliation.${m}`),
  }));
  const defautAlerte = preferences.alertes.echeanceJours || ALERTES_DEFAUT.echeanceJours;
  const optionsAlerte = [
    { valeur: -1, libelle: t('edition.alerte.defaut', { n: defautAlerte }) },
    ...PRESETS_ALERTE.map((n) => ({ valeur: n, libelle: t('edition.alerte.jours', { n }) })),
  ];
  const optionsMode = [
    { valeur: 'catalogue' as const, libelle: t('edition.mode.catalogue') },
    { valeur: 'libre' as const, libelle: t('edition.mode.libre') },
  ];
  const optionsFormules = (service?.formules ?? []).map((f) => ({
    valeur: f.id,
    libelle: `${f.nom} · ${montant(f.prix)}`,
  }));

  const recurrent = etat.typePeriodicite === 'recurrente';
  const usage = etat.typePeriodicite === 'a_l_usage';

  return (
    <form
      className={styles.ecran}
      onSubmit={(e) => {
        e.preventDefault();
        void enregistrer();
      }}
      noValidate
    >
      <div className={styles.entete}>
        <button
          type="button"
          className={styles.fermer}
          onClick={onFermer}
          aria-label={t('commun.fermer')}
        >
          <Icone nom="retour" />
        </button>
        <h1 className={styles.titre}>
          {existant ? t('edition.modifier', { nom: existant.nom }) : t('edition.nouveau')}
        </h1>
      </div>

      {!existant ? (
        <div className={styles.modes} role="radiogroup" aria-label={t('edition.mode.catalogue')}>
          {optionsMode.map((o) => (
            <button
              key={o.valeur}
              type="button"
              role="radio"
              aria-checked={mode === o.valeur}
              className={mode === o.valeur ? styles.modeActif : styles.mode}
              onClick={() => changerMode(o.valeur)}
            >
              {o.libelle}
            </button>
          ))}
        </div>
      ) : null}

      {mode === 'catalogue' && !existant && (pickerOuvert || !service) ? (
        <div className={styles.picker}>
          <input
            type="search"
            className={styles.rechercheSable}
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder={t('catalogue.recherche.ph', { n: catalogue.data.length })}
            aria-label={t('catalogue.titre')}
            autoFocus
          />
          {selection.length === 0 ? (
            <p className={styles.aide}>{t('catalogue.vide')}</p>
          ) : (
            <ul className={styles.grilleServices}>
              {selection.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className={styles.service}
                    onClick={() => choisirService(s)}
                  >
                    <span className={styles.serviceLogo} style={{ background: s.couleur }}>
                      {s.logo.valeur}
                    </span>
                    <span className={styles.serviceNom}>{s.nom}</span>
                    <span className={styles.serviceBadgeLigne}>
                      {appStoreSeulement(s) ? t('canal.app_store') : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className={styles.aideCentree}>
            {t('edition.catalogue.aide', { n: catalogue.data.length })}
          </p>
        </div>
      ) : (
        <>
          {service ? (
            <div className={styles.lie}>
              <span className={styles.serviceLogo} style={{ background: service.couleur }}>
                {service.logo.valeur}
              </span>
              <span className={styles.lieTextes}>
                <span className={styles.lieTitre}>{t('edition.catalogue.lie')}</span>
                <span className={styles.lieNom}>{service.nom}</span>
              </span>
              {existant ? (
                <button type="button" className={styles.lienDiscret} onClick={detacher}>
                  {t('edition.catalogue.detacher')}
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.lienDiscret}
                  onClick={() => setPickerOuvert(true)}
                >
                  {t('edition.catalogue.changer')}
                </button>
              )}
            </div>
          ) : null}

          <Champ libelle={t('edition.nom')} erreur={erreur('nom')}>
            {(a) => (
              <input
                {...a}
                type="text"
                value={etat.nom}
                onChange={(e) => maj('nom', e.target.value)}
                placeholder={t('edition.nom.ph')}
                autoComplete="off"
              />
            )}
          </Champ>

          {suggestions.length > 0 ? (
            <div className={styles.suggestions}>
              <span className={styles.suggestionsTitre}>{t('edition.suggestion.titre')}</span>
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={styles.suggestion}
                  onClick={() => choisirService(s)}
                >
                  <span className={styles.serviceLogo} style={{ background: s.couleur }}>
                    {s.logo.valeur}
                  </span>
                  <span className={styles.suggestionTextes}>
                    <span className={styles.serviceNom}>
                      {s.nom}
                      {appStoreSeulement(s) ? (
                        <span className={styles.serviceBadge}>{t('canal.app_store')}</span>
                      ) : null}
                    </span>
                    <span className={styles.aide}>{t(`categorie.${s.categorie}`)}</span>
                  </span>
                  <span className={styles.suggestionAction}>
                    {t('edition.suggestion.preRemplir')}
                  </span>
                </button>
              ))}
              <button
                type="button"
                className={styles.lienDiscret}
                onClick={() => setSuggestionsIgnorees(true)}
              >
                {t('edition.suggestion.ignorer')}
              </button>
            </div>
          ) : null}

          {!usage ? (
            <Champ libelle={t('edition.prix')} erreur={erreur('prix')}>
              {(a) => (
                <input
                  {...a}
                  type="text"
                  inputMode="decimal"
                  value={etat.prix}
                  onChange={(e) => maj('prix', e.target.value)}
                  placeholder={t('edition.prix.ph')}
                />
              )}
            </Champ>
          ) : null}

          {service && optionsFormules.length > 0 ? (
            <Bloc
              titre={`${t('edition.formules')} — ${t('edition.formules.fraicheur', { d: date(catalogue.publieLe) })}`}
            >
              <Chips
                nom={t('edition.formules')}
                options={optionsFormules}
                valeur={etat.formuleId ?? ''}
                onChange={(id) => {
                  const f = trouverFormule(service, id);
                  if (f) setEtat((e) => appliquerFormule(e, f));
                }}
              />
              {comparaison ? (
                <p className={styles.noteDirect}>
                  {t('edition.direct.note', {
                    direct: montant(comparaison.direct.prix),
                    store: montant(comparaison.store.prix),
                    canal: t(`canal.${comparaison.store.canal}`),
                  })}
                </p>
              ) : null}
            </Bloc>
          ) : null}

          <Bloc titre={t('edition.categorie')}>
            <Chips
              nom={t('edition.categorie')}
              options={optionsCategorie}
              valeur={etat.categorie}
              onChange={(v) => maj('categorie', v)}
            />
          </Bloc>

          <Bloc titre={t('edition.type')}>
            <Chips
              nom={t('edition.type')}
              options={optionsType}
              valeur={etat.typePeriodicite}
              onChange={(v) => maj('typePeriodicite', v)}
            />
          </Bloc>

          {recurrent ? (
            <>
              <Chips
                nom={t('edition.type')}
                options={optionsPreset}
                valeur={etat.preset}
                onChange={(v) => maj('preset', v)}
              />
              {etat.preset === 'perso' ? (
                <div className={styles.perso}>
                  <div className={styles.rangee}>
                    <Champ libelle={t('edition.perso.tousLes')} erreur={erreur('persoIntervalle')}>
                      {(a) => (
                        <input
                          {...a}
                          type="text"
                          inputMode="numeric"
                          value={etat.persoIntervalle}
                          onChange={(e) => maj('persoIntervalle', e.target.value)}
                        />
                      )}
                    </Champ>
                    <Bloc titre={t('edition.perso.unite')}>
                      <Chips
                        nom={t('edition.perso.unite')}
                        options={optionsUnite}
                        valeur={etat.persoUnite}
                        onChange={(v) => maj('persoUnite', v)}
                      />
                    </Bloc>
                  </div>
                  <p className={styles.aide}>{t('edition.perso.aide')}</p>
                </div>
              ) : null}
              <div className={styles.rangee}>
                <Champ libelle={t('edition.dateDebut')} erreur={erreur('dateDebut')}>
                  {(a) => (
                    <input
                      {...a}
                      type="date"
                      value={etat.dateDebut}
                      onChange={(e) => maj('dateDebut', e.target.value)}
                    />
                  )}
                </Champ>
                <Bloc titre={t('edition.echeance.apercu')}>
                  <div className={styles.apercu}>
                    {apercuEcheance ? date(apercuEcheance, 'long') : '—'}
                  </div>
                </Bloc>
              </div>
              <p className={styles.aide}>{t('edition.echeance.aide')}</p>
              <Champ libelle={t('edition.echeanceManuelle')} erreur={erreur('echeanceManuelle')}>
                {(a) => (
                  <input
                    {...a}
                    type="date"
                    value={etat.echeanceManuelle}
                    onChange={(e) => maj('echeanceManuelle', e.target.value)}
                  />
                )}
              </Champ>
            </>
          ) : null}

          {usage ? (
            <Champ
              libelle={t('edition.plafond')}
              erreur={erreur('plafond')}
              aide={t('edition.plafond.aide')}
            >
              {(a) => (
                <input
                  {...a}
                  type="text"
                  inputMode="decimal"
                  value={etat.plafond}
                  onChange={(e) => maj('plafond', e.target.value)}
                  placeholder={t('edition.prix.ph')}
                />
              )}
            </Champ>
          ) : null}

          {!recurrent && !usage ? (
            <Champ libelle={t('edition.dateDebut')} erreur={erreur('dateDebut')}>
              {(a) => (
                <input
                  {...a}
                  type="date"
                  value={etat.dateDebut}
                  onChange={(e) => maj('dateDebut', e.target.value)}
                />
              )}
            </Champ>
          ) : null}

          <button
            type="button"
            className={styles.depliant}
            onClick={() => setPlusOuvert((o) => !o)}
            aria-expanded={plusOuvert}
          >
            <span className={styles.depliantTextes}>
              <span className={styles.depliantTitre}>
                {t(plusOuvert ? 'edition.plus.fermer' : 'edition.plus.ouvrir')}
              </span>
              {!plusOuvert ? (
                <span className={styles.aide}>
                  {optionsRenseignees > 0
                    ? tn('edition.plus.renseignees', optionsRenseignees)
                    : t('edition.plus.sous')}
                </span>
              ) : null}
            </span>
            <Icone nom="plus" />
          </button>

          {plusOuvert ? (
            <div className={styles.options}>
              <div className={styles.carte}>
                <Interrupteur
                  libelle={t('edition.essai')}
                  actif={etat.essai}
                  onChange={(v) => maj('essai', v)}
                />
                {etat.essai ? (
                  <div className={styles.rangee}>
                    <Champ libelle={t('edition.essai.fin')} erreur={erreur('essaiFin')}>
                      {(a) => (
                        <input
                          {...a}
                          type="date"
                          value={etat.essaiFin}
                          onChange={(e) => maj('essaiFin', e.target.value)}
                        />
                      )}
                    </Champ>
                    <Champ libelle={t('edition.essai.prix')} erreur={erreur('essaiPrix')}>
                      {(a) => (
                        <input
                          {...a}
                          type="text"
                          inputMode="decimal"
                          value={etat.essaiPrix}
                          onChange={(e) => maj('essaiPrix', e.target.value)}
                          placeholder={t('edition.prix.ph')}
                        />
                      )}
                    </Champ>
                  </div>
                ) : null}

                <Interrupteur
                  libelle={t('edition.engagement')}
                  actif={etat.engagement}
                  onChange={(v) => maj('engagement', v)}
                />
                {etat.engagement ? (
                  <div className={styles.rangee}>
                    <Champ libelle={t('edition.engagement.mois')} erreur={erreur('engagementMois')}>
                      {(a) => (
                        <input
                          {...a}
                          type="text"
                          inputMode="numeric"
                          value={etat.engagementMois}
                          onChange={(e) => maj('engagementMois', e.target.value)}
                        />
                      )}
                    </Champ>
                    <Champ
                      libelle={t('edition.engagement.preavis')}
                      erreur={erreur('engagementPreavis')}
                    >
                      {(a) => (
                        <input
                          {...a}
                          type="text"
                          inputMode="numeric"
                          value={etat.engagementPreavis}
                          onChange={(e) => maj('engagementPreavis', e.target.value)}
                        />
                      )}
                    </Champ>
                  </div>
                ) : null}

                <Interrupteur
                  libelle={t('edition.partage')}
                  actif={etat.partage}
                  onChange={(v) => maj('partage', v)}
                />
                {etat.partage ? (
                  <Champ
                    libelle={t('edition.partage.part')}
                    erreur={erreur('partagePart')}
                    aide={t('edition.partage.aide')}
                  >
                    {(a) => (
                      <input
                        {...a}
                        type="text"
                        inputMode="decimal"
                        value={etat.partagePart}
                        onChange={(e) => maj('partagePart', e.target.value)}
                        placeholder={t('edition.prix.ph')}
                      />
                    )}
                  </Champ>
                ) : null}

                <Interrupteur
                  libelle={t('edition.estime')}
                  sousLibelle={t('edition.estime.sous')}
                  actif={etat.montantEstime}
                  onChange={(v) => maj('montantEstime', v)}
                />
                {etat.montantEstime ? (
                  <Champ
                    libelle={t('edition.regularisation')}
                    erreur={erreur('regularisationDate')}
                  >
                    {(a) => (
                      <input
                        {...a}
                        type="date"
                        value={etat.regularisationDate}
                        onChange={(e) => maj('regularisationDate', e.target.value)}
                      />
                    )}
                  </Champ>
                ) : null}

                <Interrupteur
                  libelle={t('edition.prixFutur')}
                  sousLibelle={t('edition.prixFutur.sous')}
                  actif={etat.prixFutur}
                  onChange={(v) => maj('prixFutur', v)}
                />
                {etat.prixFutur ? (
                  <div className={styles.rangee}>
                    <Champ libelle={t('edition.prixFutur.date')} erreur={erreur('prixFuturDate')}>
                      {(a) => (
                        <input
                          {...a}
                          type="date"
                          value={etat.prixFuturDate}
                          onChange={(e) => maj('prixFuturDate', e.target.value)}
                        />
                      )}
                    </Champ>
                    <Champ
                      libelle={t('edition.prixFutur.montant')}
                      erreur={erreur('prixFuturMontant')}
                    >
                      {(a) => (
                        <input
                          {...a}
                          type="text"
                          inputMode="decimal"
                          value={etat.prixFuturMontant}
                          onChange={(e) => maj('prixFuturMontant', e.target.value)}
                          placeholder={t('edition.prix.ph')}
                        />
                      )}
                    </Champ>
                  </div>
                ) : null}
              </div>

              <Bloc titre={t('edition.paiement')}>
                <Chips
                  nom={t('edition.paiement')}
                  options={optionsPaiement}
                  valeur={etat.moyenPaiementId ?? ''}
                  onChange={(v) => maj('moyenPaiementId', v === '' ? null : v)}
                />
              </Bloc>

              <Bloc titre={t('edition.canal')} aide={t('edition.canal.aide')}>
                <Chips
                  nom={t('edition.canal')}
                  options={optionsCanal}
                  valeur={etat.canalAchat}
                  onChange={(v) => maj('canalAchat', v)}
                />
              </Bloc>

              <Bloc titre={t('edition.resiliation')} aide={t('edition.resiliation.aide')}>
                <Chips
                  nom={t('edition.resiliation')}
                  options={optionsResiliation}
                  valeur={etat.modeResiliation}
                  onChange={(v) => maj('modeResiliation', v)}
                />
                {etat.modeResiliation !== 'lien' ? (
                  <input
                    type="text"
                    className={styles.entree}
                    value={etat.contactResiliation}
                    onChange={(e) => maj('contactResiliation', e.target.value)}
                    placeholder={t('edition.resiliation.contact.ph')}
                    aria-label={t('edition.resiliation')}
                  />
                ) : null}
              </Bloc>

              <Champ libelle={t('edition.ref')}>
                {(a) => (
                  <input
                    {...a}
                    type="text"
                    value={etat.referenceClient}
                    onChange={(e) => maj('referenceClient', e.target.value)}
                    placeholder={t('edition.ref.ph')}
                  />
                )}
              </Champ>

              <Champ libelle={t('edition.url')} erreur={erreur('urlGestion')}>
                {(a) => (
                  <input
                    {...a}
                    type="url"
                    inputMode="url"
                    value={etat.urlGestion}
                    onChange={(e) => maj('urlGestion', e.target.value)}
                    placeholder={t('edition.url.ph')}
                  />
                )}
              </Champ>

              <Bloc titre={t('edition.alerte')}>
                <Chips
                  nom={t('edition.alerte')}
                  options={optionsAlerte}
                  valeur={etat.alerteJoursAvant ?? -1}
                  onChange={(v) => maj('alerteJoursAvant', v === -1 ? null : v)}
                />
              </Bloc>

              <Champ libelle={t('edition.tags')}>
                {(a) => (
                  <input
                    {...a}
                    type="text"
                    value={etat.tags}
                    onChange={(e) => maj('tags', e.target.value)}
                    placeholder={t('edition.tags.ph')}
                  />
                )}
              </Champ>

              <Champ libelle={t('edition.notes')}>
                {(a) => (
                  <textarea
                    {...a}
                    value={etat.notes}
                    onChange={(e) => maj('notes', e.target.value)}
                    placeholder={t('edition.notes.ph')}
                  />
                )}
              </Champ>
            </div>
          ) : null}

          {Object.keys(erreurs).length > 0 ? (
            <p className={styles.erreurGlobale} role="alert">
              {t('edition.erreurs')}
            </p>
          ) : null}

          <button type="submit" className={styles.enregistrer} disabled={enregistrement}>
            {t('edition.enregistrer')}
          </button>
        </>
      )}
    </form>
  );
}

function Bloc({ titre, aide, children }: { titre: string; aide?: string; children: ReactNode }) {
  return (
    <div className={styles.bloc}>
      <span className={styles.blocTitre}>{titre}</span>
      {children}
      {aide ? <p className={styles.aide}>{aide}</p> : null}
    </div>
  );
}
