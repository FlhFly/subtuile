import { describe, expect, it } from 'vitest';
import { ALERTES_DEFAUT } from '../src/data/preferences';
import { calculerAlertes, type Alerte } from '../src/domain/alertes';
import { creerAbonnement, creerMoyenPaiement } from '../src/domain/fabriques';
import { PERIODICITES, type Langue } from '../src/domain/types';
import {
  formaterDate,
  formaterMontant,
  libelleCompteur,
  libellePeriodicite,
  traduire,
  traduireNombre,
} from '../src/i18n';
import type { I18n } from '../src/ui/contexts/I18nContext';
import { libellesAlerte } from '../src/ui/libellesAlertes';

const JOUR = '2026-09-11';

/** I18n sans React, pour vérifier les libellés rendus par l'écran. */
function i18n(langue: Langue): I18n {
  return {
    langue,
    t: (cle, params) => traduire(langue, cle, params),
    tn: (cle, n, params) => traduireNombre(langue, cle, n, params),
    montant: (v, devise) => formaterMontant(langue, v, devise),
    date: (d, style) => formaterDate(langue, d, style),
    compteur: (jours) => libelleCompteur(langue, jours),
    periodicite: (p, plafond) => libellePeriodicite(langue, p, plafond),
    changerLangue: () => undefined,
  };
}
const fr = i18n('fr');
const en = i18n('en');
/** Intl insère des espaces fines insécables : on compare sur des espaces simples. */
const plat = (s: string) => s.replace(/\s/g, ' ');

function alerte<T extends Alerte['type']>(type: T): Extract<Alerte, { type: T }> {
  const cb = creerMoyenPaiement({ type: 'cb', libelle: 'CB perso', dateExpiration: '2026-10' });
  const abos = [
    creerAbonnement(
      {
        nom: 'Strava',
        prix: 79.99,
        periodicite: PERIODICITES.annuelle,
        dateDebut: '2023-09-13',
        moyenPaiementId: cb.id,
      },
      { jour: JOUR },
    ),
    creerAbonnement(
      {
        nom: 'Disney+',
        prix: 11.99,
        periodicite: PERIODICITES.mensuelle,
        dateDebut: '2026-09-01',
        essai: { dateFin: '2026-09-13', prixApres: 11.99 },
      },
      { jour: JOUR },
    ),
    creerAbonnement(
      {
        nom: 'Basic-Fit',
        prix: 24.99,
        periodicite: PERIODICITES.mensuelle,
        dateDebut: '2025-10-20',
        engagement: { dureeMois: 12, preavisJours: 30 },
      },
      { jour: JOUR },
    ),
    creerAbonnement(
      {
        nom: 'EDF',
        prix: 64,
        periodicite: PERIODICITES.mensuelle,
        dateDebut: '2024-03-01',
        montantEstime: true,
        regularisation: { date: '2026-10-08' },
      },
      { jour: JOUR },
    ),
    creerAbonnement(
      {
        nom: 'Netflix',
        prix: 13.49,
        periodicite: PERIODICITES.mensuelle,
        dateDebut: '2021-03-06',
        prixFutur: { date: '2026-10-06', montant: 14.99 },
      },
      { jour: JOUR },
    ),
  ];
  const liste = calculerAlertes({
    abonnements: abos,
    moyensPaiement: [cb],
    defauts: ALERTES_DEFAUT,
    jour: JOUR,
  });
  return liste.find((a) => a.type === type) as Extract<Alerte, { type: T }>;
}

describe('libellés du centre d’alertes (EF-31)', () => {
  it('renouvellement : J-X, titre au pluriel, montant, date et moyen de paiement', () => {
    const l = libellesAlerte(fr, alerte('echeance'), 'CB perso');
    expect(l.pastille).toBe('J-2');
    expect(l.titre).toBe('Strava se renouvelle dans 2 jours');
    expect(plat(l.sousTitre)).toBe('79,99 € le 13 sept. 2026 · CB perso');
    const e = libellesAlerte(en, alerte('echeance'));
    expect(e.pastille).toBe('D-2');
    expect(e.titre).toBe('Strava renews in 2 days');
    expect(plat(e.sousTitre)).toMatch(/^€79\.99 on 13 Sept? 2026$/);
    const unJour = { ...alerte('echeance'), jours: 1 };
    expect(libellesAlerte(fr, unJour).titre).toBe('Strava se renouvelle dans 1 jour');
    expect(libellesAlerte(fr, { ...unJour, jours: 0 }).titre).toBe(
      'Strava se renouvelle aujourd’hui',
    );
    expect(libellesAlerte(fr, { ...unJour, jours: -2 }).titre).toBe(
      'Strava : renouvellement du 13/09/2026 dépassé',
    );
  });

  it('fin d’essai et préavis (violet)', () => {
    const essai = libellesAlerte(fr, alerte('essai'));
    expect(essai.pastille).toBe('J-2');
    expect(essai.titre).toBe('Fin d’essai Disney+ le 13 sept. 2026');
    expect(plat(essai.sousTitre)).toBe('Puis 11,99 € / mois — décider avant la fin de l’essai');
    const preavis = libellesAlerte(fr, alerte('preavis'));
    expect(preavis.pastille).toBe('J-9');
    expect(preavis.titre).toBe('Préavis Basic-Fit avant le 20 sept. 2026');
    expect(preavis.sousTitre).toBe('Dernier jour pour résilier sans reconduction (préavis 30 j)');
    expect(libellesAlerte(en, alerte('preavis')).titre).toBe(
      'Basic-Fit notice deadline: 20 Sept 2026',
    );
  });

  it('carte : M-1 puis « Exp. », mois en toutes lettres, nombre d’abonnements', () => {
    const carte = alerte('carte');
    const l = libellesAlerte(fr, carte);
    expect(l.pastille).toBe('M-1');
    expect(l.titre).toBe('CB perso expire en octobre 2026');
    expect(l.sousTitre).toBe('1 abonnement utilise cette carte — mettre à jour');
    const expiree = libellesAlerte(fr, {
      ...carte,
      expiree: true,
      moisRestants: -1,
      nbAbonnements: 3,
    });
    expect(expiree.pastille).toBe('Exp.');
    expect(expiree.titre).toBe('CB perso a expiré (octobre 2026)');
    expect(expiree.sousTitre).toBe('3 abonnements utilisent cette carte — mettre à jour');
    expect(libellesAlerte(en, carte).titre).toBe('CB perso expires in October 2026');
  });

  it('régularisation et hausse annoncée (orange)', () => {
    const reg = libellesAlerte(fr, alerte('regularisation'));
    expect(reg.pastille).toBe('J-27');
    expect(reg.titre).toBe('Régularisation annuelle EDF le 8 oct. 2026');
    expect(plat(reg.sousTitre)).toBe('Mensualités lissées ~64,00 € — le solde réel peut différer');
    const hausse = alerte('prix_futur');
    const l = libellesAlerte(fr, hausse);
    expect(plat(l.pastille)).toBe('+11 %');
    expect(l.titre).toBe('Hausse annoncée Netflix au 6 oct. 2026');
    expect(plat(l.sousTitre)).toBe('13,49 € → 14,99 € — appliquée automatiquement à cette date');
    expect(plat(libellesAlerte(en, hausse).pastille)).toBe('+11%');
    const baisse = { ...hausse, nouveauPrix: 9.99, variationPourCent: -26 };
    expect(plat(libellesAlerte(fr, baisse).pastille)).toBe('-26 %');
    expect(libellesAlerte(fr, baisse).titre).toBe('Baisse annoncée Netflix au 6 oct. 2026');
  });
});
