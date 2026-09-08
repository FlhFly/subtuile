import { describe, expect, it } from 'vitest';
import {
  ajouterPeriodes,
  ancrageCycle,
  appliquerPrixFutur,
  aujourdhui,
  calculerProchaineEcheance,
  comparerDates,
  dateLimiteResiliation,
  echeanceDepassee,
  estDateISO,
  finEngagement,
  indiceOccurrenceSuivante,
  joursAvant,
  joursEntre,
  montantAnnuel,
  montantMensuel,
  niveauCompteur,
  occurrenceSuivante,
  occurrencesEntre,
  parseDateISO,
  prixEffectif,
  prixEnVigueur,
  toDateISO,
  urgenceAbonnement,
  type AbonnementUrgence,
} from '../src/domain/dates';
import { PERIODICITES, type PeriodiciteRecurrente, type Statut } from '../src/domain/types';

const rec = (unite: PeriodiciteRecurrente['unite'], intervalle: number): PeriodiciteRecurrente => ({
  type: 'recurrente',
  unite,
  intervalle,
});
const MENSUEL = rec('mois', 1);
const TRIMESTRIEL = rec('mois', 3);
const ANNUEL = rec('an', 1);
const HEBDO = rec('semaine', 1);
const J28 = rec('jour', 28);

const ACTIF: Statut = { type: 'actif' };

function abo(partiel: Partial<AbonnementUrgence> = {}): AbonnementUrgence {
  return {
    dateDebut: '2026-01-15',
    periodicite: MENSUEL,
    echeanceManuelle: null,
    essai: null,
    engagement: null,
    statut: ACTIF,
    ...partiel,
  };
}

/* ------------------------------------------------------------------------ */

describe('dates civiles locales', () => {
  it('valide le format et la cohérence calendaire', () => {
    expect(estDateISO('2026-02-28')).toBe(true);
    expect(estDateISO('2028-02-29')).toBe(true); // bissextile
    expect(estDateISO('2026-02-29')).toBe(false);
    expect(estDateISO('2026-04-31')).toBe(false);
    expect(estDateISO('2026-13-01')).toBe(false);
    expect(estDateISO('2026-1-5')).toBe(false);
    expect(estDateISO('2026-01-05T00:00:00Z')).toBe(false);
    expect(estDateISO(null)).toBe(false);
  });

  it('parse en date locale à minuit, sans décalage UTC', () => {
    const d = parseDateISO('2026-01-31');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 0, 31]);
    expect(d.getHours()).toBe(0);
    expect(toDateISO(d)).toBe('2026-01-31');
  });

  it('refuse une date invalide', () => {
    expect(() => parseDateISO('2026-02-30')).toThrow(RangeError);
  });

  it('formate depuis les composantes locales même tard le soir', () => {
    // 31/12 à 23h30 locale : toISOString() donnerait le 01/01 dans certains fuseaux
    expect(toDateISO(new Date(2026, 11, 31, 23, 30))).toBe('2026-12-31');
    expect(aujourdhui(new Date(2026, 8, 8, 23, 59))).toBe('2026-09-08');
  });

  it('compare chronologiquement', () => {
    expect(comparerDates('2026-01-01', '2026-01-02')).toBeLessThan(0);
    expect(comparerDates('2026-01-02', '2026-01-02')).toBe(0);
    expect(comparerDates('2027-01-01', '2026-12-31')).toBeGreaterThan(0);
  });

  it('compte les jours civils, y compris à travers un changement d’heure', () => {
    expect(joursEntre('2026-09-08', '2026-09-11')).toBe(3);
    expect(joursEntre('2026-09-11', '2026-09-08')).toBe(-3);
    // passage à l'heure d'été en Europe : 29/03/2026
    expect(joursEntre('2026-03-28', '2026-03-30')).toBe(2);
    // passage à l'heure d'hiver : 25/10/2026
    expect(joursEntre('2026-10-24', '2026-10-26')).toBe(2);
  });

  it('J-X : 0 aujourd’hui, négatif si dépassée', () => {
    expect(joursAvant('2026-09-08', '2026-09-08')).toBe(0);
    expect(joursAvant('2026-09-15', '2026-09-08')).toBe(7);
    expect(joursAvant('2026-09-01', '2026-09-08')).toBe(-7);
  });
});

/* ------------------------------------------------------------------------ */

describe('ajouterPeriodes — règle des mois courts (EF-03)', () => {
  it('mensuel ancré le 31 : borne au dernier jour sans dériver', () => {
    expect(ajouterPeriodes('2026-01-31', MENSUEL, 0)).toBe('2026-01-31');
    expect(ajouterPeriodes('2026-01-31', MENSUEL, 1)).toBe('2026-02-28');
    expect(ajouterPeriodes('2026-01-31', MENSUEL, 2)).toBe('2026-03-31');
    expect(ajouterPeriodes('2026-01-31', MENSUEL, 3)).toBe('2026-04-30');
    expect(ajouterPeriodes('2026-01-31', MENSUEL, 12)).toBe('2027-01-31');
    expect(ajouterPeriodes('2026-01-31', MENSUEL, 13)).toBe('2027-02-28');
  });

  it('mensuel ancré le 31 janvier d’une année bissextile → 29 février', () => {
    expect(ajouterPeriodes('2028-01-31', MENSUEL, 1)).toBe('2028-02-29');
    expect(ajouterPeriodes('2028-01-30', MENSUEL, 1)).toBe('2028-02-29');
    expect(ajouterPeriodes('2028-01-29', MENSUEL, 1)).toBe('2028-02-29');
    expect(ajouterPeriodes('2028-01-28', MENSUEL, 1)).toBe('2028-02-28');
  });

  it('mensuel ancré le 30 : 30 partout sauf février', () => {
    expect(ajouterPeriodes('2026-01-30', MENSUEL, 1)).toBe('2026-02-28');
    expect(ajouterPeriodes('2026-01-30', MENSUEL, 2)).toBe('2026-03-30');
    expect(ajouterPeriodes('2026-01-30', MENSUEL, 3)).toBe('2026-04-30');
  });

  it('mensuel ancré sur un jour ≤ 28 : jamais borné', () => {
    expect(ajouterPeriodes('2026-01-15', MENSUEL, 1)).toBe('2026-02-15');
    expect(ajouterPeriodes('2026-01-15', MENSUEL, 25)).toBe('2028-02-15');
  });

  it('trimestriel : 30/11 → 28/02 → 30/05 → 30/08', () => {
    expect(ajouterPeriodes('2025-11-30', TRIMESTRIEL, 1)).toBe('2026-02-28');
    expect(ajouterPeriodes('2025-11-30', TRIMESTRIEL, 2)).toBe('2026-05-30');
    expect(ajouterPeriodes('2025-11-30', TRIMESTRIEL, 3)).toBe('2026-08-30');
    expect(ajouterPeriodes('2025-11-30', TRIMESTRIEL, 4)).toBe('2026-11-30');
  });

  it('semestriel et bimestriel (périodicités personnalisées en mois)', () => {
    expect(ajouterPeriodes('2026-08-31', PERIODICITES.semestrielle, 1)).toBe('2027-02-28');
    expect(ajouterPeriodes('2026-08-31', rec('mois', 2), 1)).toBe('2026-10-31');
    expect(ajouterPeriodes('2026-08-31', rec('mois', 2), 3)).toBe('2027-02-28');
  });

  it('annuel : 29 février → 28 février puis 29 février quatre ans plus tard', () => {
    expect(ajouterPeriodes('2028-02-29', ANNUEL, 1)).toBe('2029-02-28');
    expect(ajouterPeriodes('2028-02-29', ANNUEL, 4)).toBe('2032-02-29');
    expect(ajouterPeriodes('2026-09-08', ANNUEL, 3)).toBe('2029-09-08');
    expect(ajouterPeriodes('2026-09-08', rec('an', 2), 1)).toBe('2028-09-08');
  });

  it('hebdomadaire et bihebdomadaire : décalage exact en jours', () => {
    expect(ajouterPeriodes('2026-09-08', HEBDO, 1)).toBe('2026-09-15');
    expect(ajouterPeriodes('2026-09-08', HEBDO, 4)).toBe('2026-10-06');
    expect(ajouterPeriodes('2026-09-08', rec('semaine', 2), 1)).toBe('2026-09-22');
  });

  it('28 jours : 13 échéances par an, à travers les mois courts et les changements d’heure', () => {
    expect(ajouterPeriodes('2026-01-05', J28, 1)).toBe('2026-02-02');
    expect(ajouterPeriodes('2026-01-05', J28, 2)).toBe('2026-03-02');
    expect(ajouterPeriodes('2026-01-05', J28, 3)).toBe('2026-03-30');
    expect(ajouterPeriodes('2026-01-05', J28, 13)).toBe('2027-01-04');
  });

  it('périodicité personnalisée en jours (10 j)', () => {
    expect(ajouterPeriodes('2026-12-25', rec('jour', 10), 1)).toBe('2027-01-04');
  });

  it('refuse un intervalle ou un indice invalide', () => {
    expect(() => ajouterPeriodes('2026-01-01', rec('mois', 0), 1)).toThrow(RangeError);
    expect(() => ajouterPeriodes('2026-01-01', rec('mois', 1.5), 1)).toThrow(RangeError);
    expect(() => ajouterPeriodes('2026-01-01', MENSUEL, -1)).toThrow(RangeError);
  });
});

/* ------------------------------------------------------------------------ */

describe('occurrenceSuivante / occurrencesEntre', () => {
  it('renvoie l’ancrage si la cible est antérieure ou égale', () => {
    expect(occurrenceSuivante('2026-09-15', MENSUEL, '2026-09-01')).toBe('2026-09-15');
    expect(occurrenceSuivante('2026-09-15', MENSUEL, '2026-09-15')).toBe('2026-09-15');
    expect(indiceOccurrenceSuivante('2026-09-15', MENSUEL, '2026-09-15')).toBe(0);
  });

  it('trouve la première occurrence ≥ cible', () => {
    expect(occurrenceSuivante('2026-01-15', MENSUEL, '2026-09-16')).toBe('2026-10-15');
    expect(occurrenceSuivante('2026-01-15', MENSUEL, '2026-10-15')).toBe('2026-10-15');
    expect(indiceOccurrenceSuivante('2026-01-15', MENSUEL, '2026-10-15')).toBe(9);
  });

  it('mensuel ancré le 31 : la cible en février tombe sur le 28, puis retour au 31', () => {
    expect(occurrenceSuivante('2026-01-31', MENSUEL, '2026-02-01')).toBe('2026-02-28');
    expect(occurrenceSuivante('2026-01-31', MENSUEL, '2026-02-28')).toBe('2026-02-28');
    expect(occurrenceSuivante('2026-01-31', MENSUEL, '2026-03-01')).toBe('2026-03-31');
  });

  it('reste juste sur de longues durées (ancrage vieux de 20 ans)', () => {
    expect(occurrenceSuivante('2006-03-31', MENSUEL, '2026-09-08')).toBe('2026-09-30');
    expect(occurrenceSuivante('2006-03-31', ANNUEL, '2026-09-08')).toBe('2027-03-31');
    // 7466 jours écoulés = 266 × 28 + 18 → occurrence précédente le 21/08, suivante le 18/09
    expect(occurrenceSuivante('2006-03-31', J28, '2026-09-08')).toBe('2026-09-18');
    expect(occurrenceSuivante('2006-03-31', HEBDO, '2026-09-08')).toBe('2026-09-11');
    expect(occurrenceSuivante('2006-03-31', TRIMESTRIEL, '2026-09-08')).toBe('2026-09-30');
  });

  it('liste les occurrences d’un intervalle, bornes incluses', () => {
    expect(occurrencesEntre('2026-01-31', MENSUEL, '2026-02-01', '2026-05-31')).toEqual([
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
      '2026-05-31',
    ]);
    expect(occurrencesEntre('2026-01-15', ANNUEL, '2026-01-01', '2028-12-31')).toEqual([
      '2026-01-15',
      '2027-01-15',
      '2028-01-15',
    ]);
    expect(occurrencesEntre('2026-09-01', J28, '2026-09-01', '2026-10-31')).toEqual([
      '2026-09-01',
      '2026-09-29',
      '2026-10-27',
    ]);
  });

  it('gère les intervalles vides ou antérieurs à l’ancrage', () => {
    expect(occurrencesEntre('2026-09-15', MENSUEL, '2026-01-01', '2026-09-14')).toEqual([]);
    expect(occurrencesEntre('2026-09-15', MENSUEL, '2026-10-01', '2026-09-01')).toEqual([]);
    expect(occurrencesEntre('2026-09-15', MENSUEL, '2026-01-01', '2026-09-15')).toEqual([
      '2026-09-15',
    ]);
  });
});

/* ------------------------------------------------------------------------ */

describe('calculerProchaineEcheance (EF-03)', () => {
  it('avant le début : la date de début elle-même', () => {
    expect(calculerProchaineEcheance(abo(), '2026-01-01')).toBe('2026-01-15');
  });

  it('le jour même : J-0, pas encore passée', () => {
    expect(calculerProchaineEcheance(abo(), '2026-01-15')).toBe('2026-01-15');
    expect(calculerProchaineEcheance(abo(), '2026-03-15')).toBe('2026-03-15');
  });

  it('après un passage d’échéance : la suivante', () => {
    expect(calculerProchaineEcheance(abo(), '2026-01-16')).toBe('2026-02-15');
    expect(calculerProchaineEcheance(abo(), '2026-09-08')).toBe('2026-09-15');
    expect(calculerProchaineEcheance(abo(), '2026-09-16')).toBe('2026-10-15');
  });

  it('toutes les périodicités', () => {
    const j = '2026-09-08';
    expect(calculerProchaineEcheance(abo({ periodicite: TRIMESTRIEL }), j)).toBe('2026-10-15');
    expect(calculerProchaineEcheance(abo({ periodicite: ANNUEL }), j)).toBe('2027-01-15');
    expect(calculerProchaineEcheance(abo({ periodicite: HEBDO, dateDebut: '2026-09-02' }), j)).toBe(
      '2026-09-09',
    );
    expect(calculerProchaineEcheance(abo({ periodicite: J28, dateDebut: '2026-08-20' }), j)).toBe(
      '2026-09-17',
    );
    expect(calculerProchaineEcheance(abo({ periodicite: rec('mois', 2) }), j)).toBe('2026-09-15');
  });

  it('mois courts : abonnement du 31 vu depuis mars', () => {
    expect(calculerProchaineEcheance(abo({ dateDebut: '2026-01-31' }), '2026-03-01')).toBe(
      '2026-03-31',
    );
    expect(calculerProchaineEcheance(abo({ dateDebut: '2026-01-31' }), '2026-02-10')).toBe(
      '2026-02-28',
    );
  });

  it('à vie et à l’usage : aucune échéance', () => {
    expect(
      calculerProchaineEcheance(abo({ periodicite: PERIODICITES.aVie }), '2026-09-08'),
    ).toBeNull();
    expect(
      calculerProchaineEcheance(
        abo({ periodicite: { type: 'a_l_usage', plafond: 20 } }),
        '2026-09-08',
      ),
    ).toBeNull();
  });

  it('statuts sans renouvellement attendu : null', () => {
    const j = '2026-09-08';
    expect(calculerProchaineEcheance(abo({ statut: { type: 'archive' } }), j)).toBeNull();
    expect(
      calculerProchaineEcheance(abo({ statut: { type: 'en_pause', repriseLe: null } }), j),
    ).toBeNull();
    expect(
      calculerProchaineEcheance(
        abo({ statut: { type: 'resilie_actif_jusquau', jusquau: '2026-12-31' } }),
        j,
      ),
    ).toBeNull();
  });

  it('surcharge manuelle à venir : renvoyée telle quelle', () => {
    expect(calculerProchaineEcheance(abo({ echeanceManuelle: '2026-09-20' }), '2026-09-08')).toBe(
      '2026-09-20',
    );
  });

  it('surcharge manuelle passée : nouvel ancrage du cycle', () => {
    // le cycle suit désormais le 20 du mois, plus le 15
    expect(calculerProchaineEcheance(abo({ echeanceManuelle: '2026-08-20' }), '2026-09-08')).toBe(
      '2026-09-20',
    );
    expect(calculerProchaineEcheance(abo({ echeanceManuelle: '2026-08-20' }), '2026-09-21')).toBe(
      '2026-10-20',
    );
  });

  it('essai gratuit : le cycle payant démarre à la fin d’essai', () => {
    const a = abo({
      dateDebut: '2026-09-01',
      essai: { dateFin: '2026-09-15', prixApres: 9.99 },
    });
    expect(ancrageCycle(a)).toBe('2026-09-15');
    expect(calculerProchaineEcheance(a, '2026-09-08')).toBe('2026-09-15');
    expect(calculerProchaineEcheance(a, '2026-09-16')).toBe('2026-10-15');
  });

  it('la surcharge manuelle prime sur la fin d’essai', () => {
    const a = abo({
      dateDebut: '2026-09-01',
      essai: { dateFin: '2026-09-15', prixApres: 9.99 },
      echeanceManuelle: '2026-09-18',
    });
    expect(ancrageCycle(a)).toBe('2026-09-18');
  });

  it('echeanceDepassee signale un recalcul nécessaire', () => {
    expect(echeanceDepassee('2026-09-07', '2026-09-08')).toBe(true);
    expect(echeanceDepassee('2026-09-08', '2026-09-08')).toBe(false);
    expect(echeanceDepassee('2026-09-09', '2026-09-08')).toBe(false);
    expect(echeanceDepassee(null, '2026-09-08')).toBe(false);
  });
});

/* ------------------------------------------------------------------------ */

describe('engagement et préavis (EF-05)', () => {
  const engage = abo({ dateDebut: '2026-01-15', engagement: { dureeMois: 12, preavisJours: 30 } });

  it('fin d’engagement et date limite de la première période', () => {
    expect(finEngagement(engage, '2026-09-08')).toBe('2027-01-15');
    expect(dateLimiteResiliation(engage, '2026-09-08')).toBe('2026-12-16');
  });

  it('le jour du début, la fin est celle de la première période (pas le début lui-même)', () => {
    expect(finEngagement(engage, '2026-01-15')).toBe('2027-01-15');
  });

  it('reconduction tacite : après la fin, période suivante', () => {
    expect(finEngagement(engage, '2027-01-16')).toBe('2028-01-15');
    expect(dateLimiteResiliation(engage, '2027-01-16')).toBe('2027-12-16');
  });

  it('limite passée mais période en cours : la limite renvoyée est celle de la période suivante', () => {
    expect(finEngagement(engage, '2026-12-20')).toBe('2027-01-15');
    expect(dateLimiteResiliation(engage, '2026-12-20')).toBe('2027-12-16');
  });

  it('le jour de la limite : J-0', () => {
    expect(dateLimiteResiliation(engage, '2026-12-16')).toBe('2026-12-16');
  });

  it('mois courts sur la fin d’engagement (6 mois depuis le 31/08)', () => {
    const a = abo({ dateDebut: '2026-08-31', engagement: { dureeMois: 6, preavisJours: 0 } });
    expect(finEngagement(a, '2026-09-08')).toBe('2027-02-28');
    expect(dateLimiteResiliation(a, '2026-09-08')).toBe('2027-02-28');
  });

  it('sans engagement : null', () => {
    expect(finEngagement(abo(), '2026-09-08')).toBeNull();
    expect(dateLimiteResiliation(abo(), '2026-09-08')).toBeNull();
  });
});

/* ------------------------------------------------------------------------ */

describe('compteur J-X et code couleur (EF-11)', () => {
  it('seuils : vert > 14, orange ≤ 14, rouge ≤ 3', () => {
    expect(niveauCompteur(30)).toBe('ok');
    expect(niveauCompteur(15)).toBe('ok');
    expect(niveauCompteur(14)).toBe('warn');
    expect(niveauCompteur(4)).toBe('warn');
    expect(niveauCompteur(3)).toBe('urg');
    expect(niveauCompteur(0)).toBe('urg');
    expect(niveauCompteur(-2)).toBe('urg');
  });

  it('échéance simple', () => {
    // prochaine échéance le 15/09 vue du 08/09 → J-7 orange
    expect(urgenceAbonnement(abo(), '2026-09-08')).toEqual({
      niveau: 'warn',
      jours: 7,
      motif: 'echeance',
      date: '2026-09-15',
    });
    expect(urgenceAbonnement(abo(), '2026-08-20')?.niveau).toBe('ok');
    expect(urgenceAbonnement(abo(), '2026-09-13')?.niveau).toBe('urg');
    expect(urgenceAbonnement(abo(), '2026-09-15')).toMatchObject({ niveau: 'urg', jours: 0 });
  });

  it('fin d’essai imminente : violet, prioritaire sur le compteur', () => {
    const a = abo({ dateDebut: '2026-09-01', essai: { dateFin: '2026-09-15', prixApres: 9.99 } });
    expect(urgenceAbonnement(a, '2026-09-08')).toEqual({
      niveau: 'trial',
      jours: 7,
      motif: 'essai',
      date: '2026-09-15',
    });
  });

  it('fin d’essai lointaine : compteur normal', () => {
    const a = abo({ dateDebut: '2026-09-01', essai: { dateFin: '2026-12-01', prixApres: 9.99 } });
    expect(urgenceAbonnement(a, '2026-09-08')).toMatchObject({ niveau: 'ok', motif: 'echeance' });
  });

  it('essai terminé : le cycle payant reprend la main', () => {
    const a = abo({ dateDebut: '2026-09-01', essai: { dateFin: '2026-09-15', prixApres: 9.99 } });
    expect(urgenceAbonnement(a, '2026-09-20')).toMatchObject({
      niveau: 'ok',
      motif: 'echeance',
      date: '2026-10-15',
    });
  });

  it('date limite de préavis imminente : violet', () => {
    const a = abo({ dateDebut: '2026-01-15', engagement: { dureeMois: 12, preavisJours: 30 } });
    expect(urgenceAbonnement(a, '2026-12-10')).toEqual({
      niveau: 'trial',
      jours: 6,
      motif: 'preavis',
      date: '2026-12-16',
    });
    expect(urgenceAbonnement(a, '2026-09-08')).toMatchObject({ motif: 'echeance' });
  });

  it('rien à afficher : à vie, archivé, en pause', () => {
    expect(urgenceAbonnement(abo({ periodicite: PERIODICITES.aVie }), '2026-09-08')).toBeNull();
    expect(urgenceAbonnement(abo({ statut: { type: 'archive' } }), '2026-09-08')).toBeNull();
    // un essai en cours sur un abonnement en pause ne colore pas la tuile
    expect(
      urgenceAbonnement(
        abo({
          statut: { type: 'en_pause', repriseLe: null },
          essai: { dateFin: '2026-09-10', prixApres: 5 },
        }),
        '2026-09-08',
      ),
    ).toBeNull();
  });
});

/* ------------------------------------------------------------------------ */

describe('normalisation des montants (EF-40)', () => {
  it('mensuel, trimestriel, semestriel, annuel', () => {
    expect(montantMensuel(9.99, MENSUEL)).toBeCloseTo(9.99, 10);
    expect(montantMensuel(30, TRIMESTRIEL)).toBeCloseTo(10, 10);
    expect(montantMensuel(60, PERIODICITES.semestrielle)).toBeCloseTo(10, 10);
    expect(montantMensuel(120, ANNUEL)).toBeCloseTo(10, 10);
    expect(montantMensuel(240, rec('an', 2))).toBeCloseTo(10, 10);
    expect(montantAnnuel(9.99, MENSUEL)).toBeCloseTo(119.88, 10);
    expect(montantAnnuel(120, ANNUEL)).toBeCloseTo(120, 10);
  });

  it('hebdomadaire et 28 jours (sur 365,25 jours)', () => {
    expect(montantMensuel(5, HEBDO)).toBeCloseTo(21.74, 2);
    expect(montantAnnuel(5, HEBDO)).toBeCloseTo(260.89, 2);
    expect(montantMensuel(10, J28)).toBeCloseTo(10.87, 2);
    expect(montantAnnuel(10, J28)).toBeCloseTo(130.45, 2);
    expect(montantMensuel(1, rec('jour', 1))).toBeCloseTo(30.4375, 4);
  });

  it('à vie et à l’usage : 0', () => {
    expect(montantMensuel(199, PERIODICITES.aVie)).toBe(0);
    expect(montantMensuel(20, PERIODICITES.aLUsage)).toBe(0);
  });

  it('part payée d’un abonnement partagé (EF-44)', () => {
    expect(prixEffectif({ prix: 17.99, partage: null })).toBe(17.99);
    expect(prixEffectif({ prix: 17.99, partage: { prixTotal: 17.99, partPayee: 6 } })).toBe(6);
  });
});

/* ------------------------------------------------------------------------ */

describe('prix futur programmé (EF-08b)', () => {
  const base = {
    prix: 9.99,
    prixFutur: { date: '2026-10-01', montant: 12.99 },
    historiquePrix: [{ date: '2025-01-01', prix: 9.99 }],
  };

  it('prix en vigueur avant / à / après la date', () => {
    expect(prixEnVigueur(base, '2026-09-30')).toBe(9.99);
    expect(prixEnVigueur(base, '2026-10-01')).toBe(12.99);
    expect(prixEnVigueur({ prix: 9.99, prixFutur: null }, '2026-10-01')).toBe(9.99);
  });

  it('application : nouveau prix, historique complété, prixFutur effacé, objet non muté', () => {
    expect(appliquerPrixFutur(base, '2026-09-30')).toBe(base);
    const applique = appliquerPrixFutur(base, '2026-10-01');
    expect(applique).toEqual({
      prix: 12.99,
      prixFutur: null,
      historiquePrix: [
        { date: '2025-01-01', prix: 9.99 },
        { date: '2026-10-01', prix: 12.99 },
      ],
    });
    expect(base.prix).toBe(9.99);
    expect(base.historiquePrix).toHaveLength(1);
  });
});
