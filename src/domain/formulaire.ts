/**
 * Formulaire de création / édition en saisie libre (EF-01, EF-02) : état des
 * champs sous forme de chaînes (tel que saisi), validation, conversion vers
 * et depuis `Abonnement`. Aucun React ici : tout est testable.
 */

import { calculerProchaineEcheance, estDateISO } from './dates';
import { creerAbonnement, type ContexteFabrique } from './fabriques';
import type {
  Abonnement,
  CanalAchat,
  Categorie,
  DateISO,
  ModeResiliation,
  Periodicite,
  PeriodiciteRecurrente,
  UnitePeriode,
} from './types';

export type TypePeriodicite = Periodicite['type'];
export const PRESETS_PERIODE = [
  'mensuelle',
  'annuelle',
  'hebdomadaire',
  'trimestrielle',
  'perso',
] as const;
export type PresetPeriode = (typeof PRESETS_PERIODE)[number];
export const PRESETS_ALERTE = [1, 2, 3, 7, 14] as const;

export interface EtatFormulaire {
  /** service du catalogue lié (EF-02) ; null en saisie libre */
  serviceId: string | null;
  /** formule du catalogue choisie (v1.11) */
  formuleId: string | null;
  nom: string;
  prix: string;
  categorie: Categorie;
  typePeriodicite: TypePeriodicite;
  preset: PresetPeriode;
  persoIntervalle: string;
  persoUnite: UnitePeriode;
  dateDebut: string;
  echeanceManuelle: string;
  plafond: string;
  essai: boolean;
  essaiFin: string;
  essaiPrix: string;
  engagement: boolean;
  engagementMois: string;
  engagementPreavis: string;
  /** partage (EF-44) : le prix saisi est le prix plein, seule la part payée est demandée */
  partage: boolean;
  partagePart: string;
  montantEstime: boolean;
  regularisationDate: string;
  prixFutur: boolean;
  prixFuturDate: string;
  prixFuturMontant: string;
  moyenPaiementId: string | null;
  canalAchat: CanalAchat;
  modeResiliation: ModeResiliation;
  contactResiliation: string;
  referenceClient: string;
  urlGestion: string;
  /** null = défaut global (EF-30) */
  alerteJoursAvant: number | null;
  tags: string;
  notes: string;
}

export type ChampFormulaire = keyof EtatFormulaire;

export type CodeErreur =
  'requis' | 'nombre' | 'entier' | 'date' | 'dateAvantDebut' | 'partSuperieure' | 'url';

export type Erreurs = Partial<Record<ChampFormulaire, CodeErreur>>;

/* ---------------------------------------------------------------------------
 * Analyse des saisies
 * ------------------------------------------------------------------------- */

/** « 9,99 », « 9.99 », « 1 234,50 € » → 9.99 / 1234.5 ; null si vide ou invalide. */
export function parserMontant(texte: string): number | null {
  const nettoye = texte.replace(/[\s€$£]/g, '').replace(',', '.');
  if (nettoye === '') return null;
  if (!/^-?\d+(\.\d+)?$/.test(nettoye)) return null;
  return Number(nettoye);
}

export function parserEntier(texte: string): number | null {
  const nettoye = texte.trim();
  if (!/^\d+$/.test(nettoye)) return null;
  return Number(nettoye);
}

/** « perso, Foyer , pro » → ['perso', 'Foyer', 'pro'] sans doublons ni vides. */
export function parserTags(texte: string): string[] {
  const vus = new Set<string>();
  const tags: string[] = [];
  for (const brut of texte.split(',')) {
    const tag = brut.trim();
    const cle = tag.toLowerCase();
    if (tag && !vus.has(cle)) {
      vus.add(cle);
      tags.push(tag);
    }
  }
  return tags;
}

/** Ajoute https:// si aucun schéma ; null si vide. */
export function normaliserUrl(texte: string): string | null {
  const t = texte.trim();
  if (t === '') return null;
  return /^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`;
}

export function estUrlValide(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' || u.protocol === 'itms-apps:';
  } catch {
    return false;
  }
}

/* ---------------------------------------------------------------------------
 * Périodicité ↔ formulaire
 * ------------------------------------------------------------------------- */

const PRESET_VERS_PERIODICITE: Record<Exclude<PresetPeriode, 'perso'>, PeriodiciteRecurrente> = {
  mensuelle: { type: 'recurrente', unite: 'mois', intervalle: 1 },
  annuelle: { type: 'recurrente', unite: 'an', intervalle: 1 },
  hebdomadaire: { type: 'recurrente', unite: 'semaine', intervalle: 1 },
  trimestrielle: { type: 'recurrente', unite: 'mois', intervalle: 3 },
};

export function periodiciteDepuisFormulaire(
  etat: Pick<
    EtatFormulaire,
    'typePeriodicite' | 'preset' | 'persoIntervalle' | 'persoUnite' | 'plafond'
  >,
): Periodicite | null {
  switch (etat.typePeriodicite) {
    case 'a_vie':
      return { type: 'a_vie' };
    case 'a_l_usage': {
      const plafond = etat.plafond.trim() === '' ? null : parserMontant(etat.plafond);
      if (etat.plafond.trim() !== '' && (plafond === null || plafond < 0)) return null;
      return { type: 'a_l_usage', plafond };
    }
    case 'recurrente': {
      if (etat.preset !== 'perso') return PRESET_VERS_PERIODICITE[etat.preset];
      const intervalle = parserEntier(etat.persoIntervalle);
      if (intervalle === null || intervalle < 1) return null;
      return { type: 'recurrente', unite: etat.persoUnite, intervalle };
    }
  }
}

export function presetDepuisPeriodicite(
  p: Periodicite,
): Pick<
  EtatFormulaire,
  'typePeriodicite' | 'preset' | 'persoIntervalle' | 'persoUnite' | 'plafond'
> {
  if (p.type === 'a_vie') {
    return {
      typePeriodicite: 'a_vie',
      preset: 'mensuelle',
      persoIntervalle: '1',
      persoUnite: 'mois',
      plafond: '',
    };
  }
  if (p.type === 'a_l_usage') {
    return {
      typePeriodicite: 'a_l_usage',
      preset: 'mensuelle',
      persoIntervalle: '1',
      persoUnite: 'mois',
      plafond: p.plafond === null ? '' : String(p.plafond),
    };
  }
  for (const [preset, ref] of Object.entries(PRESET_VERS_PERIODICITE) as [
    Exclude<PresetPeriode, 'perso'>,
    PeriodiciteRecurrente,
  ][]) {
    if (ref.unite === p.unite && ref.intervalle === p.intervalle) {
      return {
        typePeriodicite: 'recurrente',
        preset,
        persoIntervalle: String(p.intervalle),
        persoUnite: p.unite,
        plafond: '',
      };
    }
  }
  return {
    typePeriodicite: 'recurrente',
    preset: 'perso',
    persoIntervalle: String(p.intervalle),
    persoUnite: p.unite,
    plafond: '',
  };
}

/* ---------------------------------------------------------------------------
 * État initial
 * ------------------------------------------------------------------------- */

export function formulaireVide(jour: DateISO): EtatFormulaire {
  return {
    serviceId: null,
    formuleId: null,
    nom: '',
    prix: '',
    categorie: 'autre',
    typePeriodicite: 'recurrente',
    preset: 'mensuelle',
    persoIntervalle: '1',
    persoUnite: 'mois',
    dateDebut: jour,
    echeanceManuelle: '',
    plafond: '',
    essai: false,
    essaiFin: '',
    essaiPrix: '',
    engagement: false,
    engagementMois: '12',
    engagementPreavis: '30',
    partage: false,
    partagePart: '',
    montantEstime: false,
    regularisationDate: '',
    prixFutur: false,
    prixFuturDate: '',
    prixFuturMontant: '',
    moyenPaiementId: null,
    canalAchat: 'direct',
    modeResiliation: 'lien',
    contactResiliation: '',
    referenceClient: '',
    urlGestion: '',
    alerteJoursAvant: null,
    tags: '',
    notes: '',
  };
}

const nombreVersTexte = (n: number | null | undefined): string =>
  n === null || n === undefined ? '' : String(n);

/**
 * EF-07 : formulaire de création pré-rempli depuis un abonnement existant.
 * Le nom reçoit le suffixe (« (copie) »), le cycle repart d'aujourd'hui, la
 * référence client n'est pas recopiée ; un essai ou une hausse déjà passés
 * sont abandonnés.
 */
export function formulairePourDuplication(
  abo: Abonnement,
  jour: DateISO,
  suffixe: string,
): EtatFormulaire {
  const f = formulaireDepuisAbonnement(abo, jour);
  const essaiPasse = f.essai && f.essaiFin !== '' && f.essaiFin < jour;
  const haussePassee = f.prixFutur && f.prixFuturDate !== '' && f.prixFuturDate < jour;
  return {
    ...f,
    nom: `${abo.nom} ${suffixe}`.trim(),
    dateDebut: jour,
    echeanceManuelle: '',
    referenceClient: '',
    ...(essaiPasse ? { essai: false, essaiFin: '', essaiPrix: '' } : {}),
    ...(haussePassee ? { prixFutur: false, prixFuturDate: '', prixFuturMontant: '' } : {}),
  };
}

/**
 * Nombre d'options avancées renseignées (essai, engagement, partage, vie
 * courante, hausse, paiement, canal, résiliation, référence, adresse, alerte,
 * tags, notes) : affiché sur le dépliant replié pour signaler ce qu'il cache.
 */
export function compterOptionsAvancees(etat: EtatFormulaire): number {
  const renseignees = [
    etat.essai,
    etat.engagement,
    etat.partage,
    etat.montantEstime || etat.regularisationDate.trim() !== '',
    etat.prixFutur,
    etat.moyenPaiementId !== null,
    etat.canalAchat !== 'direct',
    etat.modeResiliation !== 'lien',
    etat.referenceClient.trim() !== '',
    etat.urlGestion.trim() !== '',
    etat.alerteJoursAvant !== null,
    etat.tags.trim() !== '',
    etat.notes.trim() !== '',
  ];
  return renseignees.filter(Boolean).length;
}

const CHAMPS_MONTANT: ReadonlySet<ChampFormulaire> = new Set([
  'prix',
  'plafond',
  'essaiPrix',
  'partagePart',
  'prixFuturMontant',
]);

/**
 * Champs réellement modifiés entre deux états du formulaire (garde contre la
 * perte de saisie) : espaces de bord ignorés, montants comparés par valeur
 * (« 13,49 » = « 13.49 »).
 */
export function differencesFormulaire(
  avant: EtatFormulaire,
  apres: EtatFormulaire,
): ChampFormulaire[] {
  return (Object.keys(apres) as ChampFormulaire[]).filter((champ) => {
    const a = avant[champ];
    const b = apres[champ];
    if (typeof a === 'string' && typeof b === 'string') {
      if (CHAMPS_MONTANT.has(champ)) {
        const pa = parserMontant(a);
        const pb = parserMontant(b);
        if (pa !== null && pb !== null) return pa !== pb;
      }
      return a.trim() !== b.trim();
    }
    return a !== b;
  });
}

export function formulaireDepuisAbonnement(abo: Abonnement, jour: DateISO): EtatFormulaire {
  return {
    ...formulaireVide(jour),
    serviceId: abo.serviceId,
    formuleId: abo.formuleId,
    nom: abo.nom,
    prix: nombreVersTexte(abo.prix),
    categorie: abo.categorie,
    ...presetDepuisPeriodicite(abo.periodicite),
    dateDebut: abo.dateDebut,
    echeanceManuelle: abo.echeanceManuelle ?? '',
    essai: abo.essai !== null,
    essaiFin: abo.essai?.dateFin ?? '',
    essaiPrix: nombreVersTexte(abo.essai?.prixApres),
    engagement: abo.engagement !== null,
    engagementMois: abo.engagement ? String(abo.engagement.dureeMois) : '12',
    engagementPreavis: abo.engagement ? String(abo.engagement.preavisJours) : '30',
    partage: abo.partage !== null,
    partagePart: nombreVersTexte(abo.partage?.partPayee),
    montantEstime: abo.montantEstime,
    regularisationDate: abo.regularisation?.date ?? '',
    prixFutur: abo.prixFutur !== null,
    prixFuturDate: abo.prixFutur?.date ?? '',
    prixFuturMontant: nombreVersTexte(abo.prixFutur?.montant),
    moyenPaiementId: abo.moyenPaiementId,
    canalAchat: abo.canalAchat,
    modeResiliation: abo.modeResiliation,
    contactResiliation: abo.contactResiliation ?? '',
    referenceClient: abo.referenceClient ?? '',
    urlGestion: abo.urlGestion ?? '',
    alerteJoursAvant: abo.alerteJoursAvant,
    tags: abo.tags.join(', '),
    notes: abo.notes,
  };
}

/* ---------------------------------------------------------------------------
 * Validation
 * ------------------------------------------------------------------------- */

function verifierMontant(
  erreurs: Erreurs,
  champ: ChampFormulaire,
  texte: string,
  requis: boolean,
): number | null {
  if (texte.trim() === '') {
    if (requis) erreurs[champ] = 'requis';
    return null;
  }
  const n = parserMontant(texte);
  if (n === null || n < 0) {
    erreurs[champ] = 'nombre';
    return null;
  }
  return n;
}

function verifierEntier(
  erreurs: Erreurs,
  champ: ChampFormulaire,
  texte: string,
  minimum: number,
): number | null {
  const n = parserEntier(texte);
  if (n === null || n < minimum) {
    erreurs[champ] = 'entier';
    return null;
  }
  return n;
}

function verifierDate(
  erreurs: Erreurs,
  champ: ChampFormulaire,
  texte: string,
  requis: boolean,
  apres?: string,
): DateISO | null {
  if (texte.trim() === '') {
    if (requis) erreurs[champ] = 'requis';
    return null;
  }
  if (!estDateISO(texte)) {
    erreurs[champ] = 'date';
    return null;
  }
  if (apres !== undefined && estDateISO(apres) && texte < apres) {
    erreurs[champ] = 'dateAvantDebut';
    return null;
  }
  return texte;
}

export function validerFormulaire(etat: EtatFormulaire): Erreurs {
  const erreurs: Erreurs = {};
  if (etat.nom.trim() === '') erreurs.nom = 'requis';
  verifierMontant(erreurs, 'prix', etat.prix, etat.typePeriodicite !== 'a_l_usage');
  verifierDate(erreurs, 'dateDebut', etat.dateDebut, true);
  verifierDate(erreurs, 'echeanceManuelle', etat.echeanceManuelle, false, etat.dateDebut);

  if (etat.typePeriodicite === 'recurrente' && etat.preset === 'perso') {
    verifierEntier(erreurs, 'persoIntervalle', etat.persoIntervalle, 1);
  }
  if (etat.typePeriodicite === 'a_l_usage')
    verifierMontant(erreurs, 'plafond', etat.plafond, false);

  if (etat.essai) {
    verifierDate(erreurs, 'essaiFin', etat.essaiFin, true, etat.dateDebut);
    verifierMontant(erreurs, 'essaiPrix', etat.essaiPrix, true);
  }
  if (etat.engagement) {
    verifierEntier(erreurs, 'engagementMois', etat.engagementMois, 1);
    verifierEntier(erreurs, 'engagementPreavis', etat.engagementPreavis, 0);
  }
  if (etat.partage) {
    const part = verifierMontant(erreurs, 'partagePart', etat.partagePart, true);
    const plein = parserMontant(etat.prix);
    if (part !== null && plein !== null && part > plein) erreurs.partagePart = 'partSuperieure';
  }
  if (etat.montantEstime)
    verifierDate(erreurs, 'regularisationDate', etat.regularisationDate, false);
  if (etat.prixFutur) {
    verifierDate(erreurs, 'prixFuturDate', etat.prixFuturDate, true);
    verifierMontant(erreurs, 'prixFuturMontant', etat.prixFuturMontant, true);
  }
  const url = normaliserUrl(etat.urlGestion);
  if (url !== null && !estUrlValide(url)) erreurs.urlGestion = 'url';
  return erreurs;
}

/* ---------------------------------------------------------------------------
 * Conversion vers Abonnement
 * ------------------------------------------------------------------------- */

const vide = (s: string): string | null => (s.trim() === '' ? null : s.trim());

/**
 * Construit l'abonnement à partir d'un formulaire VALIDE. Sans `existant`,
 * crée une entité complète ; sinon met à jour l'existant en conservant id,
 * statut, dates techniques, et complète l'historique des prix si le prix
 * change (EF-08 : chronologie des prix en vigueur).
 */
export function abonnementDepuisFormulaire(
  etat: EtatFormulaire,
  ctx: Required<Pick<ContexteFabrique, 'jour'>> & ContexteFabrique,
  existant?: Abonnement,
): Abonnement {
  const periodicite = periodiciteDepuisFormulaire(etat);
  if (periodicite === null) throw new Error('Formulaire invalide : périodicité');
  const prix = parserMontant(etat.prix) ?? 0;
  const plafondUsage = periodicite.type === 'a_l_usage';

  const champs = {
    serviceId: etat.serviceId,
    formuleId: etat.serviceId ? etat.formuleId : null,
    nom: etat.nom.trim(),
    prix: plafondUsage ? 0 : prix,
    categorie: etat.categorie,
    periodicite,
    dateDebut: etat.dateDebut,
    echeanceManuelle: vide(etat.echeanceManuelle),
    essai:
      etat.essai && estDateISO(etat.essaiFin)
        ? { dateFin: etat.essaiFin, prixApres: parserMontant(etat.essaiPrix) ?? 0 }
        : null,
    engagement: etat.engagement
      ? {
          dureeMois: parserEntier(etat.engagementMois) ?? 1,
          preavisJours: parserEntier(etat.engagementPreavis) ?? 0,
        }
      : null,
    partage: etat.partage
      ? {
          prixTotal: plafondUsage ? 0 : prix,
          partPayee: parserMontant(etat.partagePart) ?? 0,
        }
      : null,
    montantEstime: etat.montantEstime,
    regularisation:
      etat.montantEstime && estDateISO(etat.regularisationDate)
        ? { date: etat.regularisationDate }
        : null,
    prixFutur:
      etat.prixFutur && estDateISO(etat.prixFuturDate)
        ? { date: etat.prixFuturDate, montant: parserMontant(etat.prixFuturMontant) ?? 0 }
        : null,
    moyenPaiementId: etat.moyenPaiementId,
    canalAchat: etat.canalAchat,
    modeResiliation: etat.modeResiliation,
    contactResiliation: vide(etat.contactResiliation),
    referenceClient: vide(etat.referenceClient),
    urlGestion: normaliserUrl(etat.urlGestion),
    alerteJoursAvant: etat.alerteJoursAvant,
    tags: parserTags(etat.tags),
    notes: etat.notes.trim(),
  };

  if (!existant) return creerAbonnement(champs, ctx);

  let historiquePrix = existant.historiquePrix;
  const dernier = historiquePrix.at(-1);
  if (periodicite.type === 'recurrente') {
    if (historiquePrix.length === 0) {
      historiquePrix = [{ date: existant.dateDebut, prix: champs.prix }];
    } else if (dernier && dernier.prix !== champs.prix) {
      historiquePrix = [...historiquePrix, { date: ctx.jour, prix: champs.prix }];
    }
  }
  const maj: Abonnement = { ...existant, ...champs, historiquePrix };
  return { ...maj, prochaineEcheance: calculerProchaineEcheance(maj, ctx.jour) };
}
