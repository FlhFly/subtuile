import { describe, expect, it } from 'vitest';
import { DATE_REFERENCE_DEMO, IDS_DEMO, jeuDemo } from '../src/data/fixtures/demo';
import {
  abonnementDepuisFormulaire,
  estUrlValide,
  formulaireDepuisAbonnement,
  formulaireVide,
  normaliserUrl,
  parserEntier,
  parserMontant,
  parserTags,
  periodiciteDepuisFormulaire,
  presetDepuisPeriodicite,
  validerFormulaire,
  type EtatFormulaire,
} from '../src/domain/formulaire';
import { PERIODICITES } from '../src/domain/types';

const JOUR = '2026-09-09';
const jeu = jeuDemo();
const par = (id: string) => jeu.abonnements.find((a) => a.id === id)!;

function etat(partiel: Partial<EtatFormulaire> = {}): EtatFormulaire {
  return { ...formulaireVide(JOUR), nom: 'Test', prix: '9,99', ...partiel };
}

describe('analyse des saisies', () => {
  it('montants : virgule ou point, espaces et symboles ignorés', () => {
    expect(parserMontant('9,99')).toBe(9.99);
    expect(parserMontant('9.99')).toBe(9.99);
    expect(parserMontant('1 234,50 €')).toBe(1234.5);
    expect(parserMontant('0')).toBe(0);
    expect(parserMontant('')).toBeNull();
    expect(parserMontant('abc')).toBeNull();
    expect(parserMontant('9,99,9')).toBeNull();
  });

  it('entiers et tags', () => {
    expect(parserEntier('28')).toBe(28);
    expect(parserEntier(' 12 ')).toBe(12);
    expect(parserEntier('1.5')).toBeNull();
    expect(parserEntier('')).toBeNull();
    expect(parserTags('perso, Foyer , pro,, PERSO')).toEqual(['perso', 'Foyer', 'pro']);
    expect(parserTags('')).toEqual([]);
  });

  it('adresses : schéma ajouté, validation', () => {
    expect(normaliserUrl('')).toBeNull();
    expect(normaliserUrl('netflix.com/cancelplan')).toBe('https://netflix.com/cancelplan');
    expect(normaliserUrl('https://a.b')).toBe('https://a.b');
    expect(normaliserUrl('itms-apps://apps.apple.com/account/subscriptions')).toBe(
      'itms-apps://apps.apple.com/account/subscriptions',
    );
    expect(estUrlValide('https://www.strava.com/account')).toBe(true);
    expect(estUrlValide('itms-apps://apps.apple.com/account/subscriptions')).toBe(true);
    expect(estUrlValide('https://')).toBe(false);
    expect(estUrlValide('javascript:alert(1)')).toBe(false);
  });
});

describe('périodicité ↔ formulaire', () => {
  it('presets et personnalisée', () => {
    expect(periodiciteDepuisFormulaire(etat({ preset: 'mensuelle' }))).toEqual(
      PERIODICITES.mensuelle,
    );
    expect(periodiciteDepuisFormulaire(etat({ preset: 'trimestrielle' }))).toEqual(
      PERIODICITES.trimestrielle,
    );
    expect(
      periodiciteDepuisFormulaire(
        etat({ preset: 'perso', persoIntervalle: '28', persoUnite: 'jour' }),
      ),
    ).toEqual(PERIODICITES.vingtHuitJours);
    expect(periodiciteDepuisFormulaire(etat({ preset: 'perso', persoIntervalle: '0' }))).toBeNull();
    expect(periodiciteDepuisFormulaire(etat({ typePeriodicite: 'a_vie' }))).toEqual({
      type: 'a_vie',
    });
    expect(
      periodiciteDepuisFormulaire(etat({ typePeriodicite: 'a_l_usage', plafond: '15' })),
    ).toEqual({
      type: 'a_l_usage',
      plafond: 15,
    });
    expect(
      periodiciteDepuisFormulaire(etat({ typePeriodicite: 'a_l_usage', plafond: '' })),
    ).toEqual({
      type: 'a_l_usage',
      plafond: null,
    });
  });

  it('retour vers le formulaire', () => {
    expect(presetDepuisPeriodicite(PERIODICITES.annuelle)).toMatchObject({
      typePeriodicite: 'recurrente',
      preset: 'annuelle',
    });
    expect(presetDepuisPeriodicite(PERIODICITES.vingtHuitJours)).toMatchObject({
      preset: 'perso',
      persoIntervalle: '28',
      persoUnite: 'jour',
    });
    expect(
      presetDepuisPeriodicite({ type: 'recurrente', unite: 'mois', intervalle: 2 }),
    ).toMatchObject({
      preset: 'perso',
      persoIntervalle: '2',
      persoUnite: 'mois',
    });
    expect(presetDepuisPeriodicite({ type: 'a_l_usage', plafond: 15 })).toMatchObject({
      typePeriodicite: 'a_l_usage',
      plafond: '15',
    });
  });
});

describe('validation', () => {
  it('formulaire minimal valide', () => {
    expect(validerFormulaire(etat())).toEqual({});
  });

  it('nom et prix requis, dates et nombres contrôlés', () => {
    expect(validerFormulaire(etat({ nom: '  ' })).nom).toBe('requis');
    expect(validerFormulaire(etat({ prix: '' })).prix).toBe('requis');
    expect(validerFormulaire(etat({ prix: 'abc' })).prix).toBe('nombre');
    expect(validerFormulaire(etat({ prix: '-1' })).prix).toBe('nombre');
    expect(validerFormulaire(etat({ dateDebut: '2026-02-30' })).dateDebut).toBe('date');
    expect(validerFormulaire(etat({ dateDebut: '' })).dateDebut).toBe('requis');
    expect(validerFormulaire(etat({ preset: 'perso', persoIntervalle: 'x' })).persoIntervalle).toBe(
      'entier',
    );
    expect(validerFormulaire(etat({ typePeriodicite: 'a_l_usage', prix: '' }))).toEqual({});
    expect(validerFormulaire(etat({ typePeriodicite: 'a_l_usage', plafond: 'x' })).plafond).toBe(
      'nombre',
    );
  });

  it('options avancées', () => {
    expect(validerFormulaire(etat({ essai: true, essaiFin: '', essaiPrix: '' }))).toMatchObject({
      essaiFin: 'requis',
      essaiPrix: 'requis',
    });
    expect(
      validerFormulaire(
        etat({ dateDebut: '2026-09-01', essai: true, essaiFin: '2026-08-01', essaiPrix: '5' }),
      ).essaiFin,
    ).toBe('dateAvantDebut');
    expect(validerFormulaire(etat({ engagement: true, engagementMois: '0' })).engagementMois).toBe(
      'entier',
    );
    expect(
      validerFormulaire(etat({ prix: '10', partage: true, partagePart: '12' })).partagePart,
    ).toBe('partSuperieure');
    expect(
      validerFormulaire(etat({ montantEstime: true, regularisationDate: 'x' })).regularisationDate,
    ).toBe('date');
    expect(
      validerFormulaire(etat({ prixFutur: true, prixFuturDate: '', prixFuturMontant: '' })),
    ).toMatchObject({
      prixFuturDate: 'requis',
      prixFuturMontant: 'requis',
    });
    // EF-74 : un rappel a une date et un texte, ou rien
    expect(validerFormulaire(etat({ rappelTexte: 'renégocier' }))).toMatchObject({
      rappelDate: 'requis',
    });
    expect(validerFormulaire(etat({ rappelDate: '2027-01-15' }))).toMatchObject({
      rappelTexte: 'requis',
    });
    expect(validerFormulaire(etat({ rappelDate: 'x', rappelTexte: 'renégocier' })).rappelDate).toBe(
      'date',
    );
    expect(
      validerFormulaire(etat({ rappelDate: '2027-01-15', rappelTexte: 'renégocier' })),
    ).toEqual({});
    expect(validerFormulaire(etat({ urlGestion: 'https://' })).urlGestion).toBe('url');
    expect(validerFormulaire(etat({ urlGestion: 'strava.com/account' }))).toEqual({});
    expect(validerFormulaire(etat({ echeanceManuelle: '2020-01-01' })).echeanceManuelle).toBe(
      'dateAvantDebut',
    );
  });
});

describe('conversion vers Abonnement', () => {
  it('création : entité complète, historique initial, échéance calculée', () => {
    const abo = abonnementDepuisFormulaire(
      etat({
        nom: '  Lycamobile ',
        prix: '9,99',
        categorie: 'vie_courante',
        preset: 'perso',
        persoIntervalle: '28',
        persoUnite: 'jour',
        dateDebut: '2026-08-05',
        canalAchat: 'direct',
        modeResiliation: 'espace_client',
        contactResiliation: ' mon compte ',
        referenceClient: '',
        urlGestion: 'lycamobile.fr',
        tags: 'perso, mobile',
        notes: ' note ',
        alerteJoursAvant: 7,
      }),
      { jour: JOUR },
    );
    expect(abo.nom).toBe('Lycamobile');
    expect(abo.prix).toBe(9.99);
    expect(abo.periodicite).toEqual(PERIODICITES.vingtHuitJours);
    expect(abo.prochaineEcheance).toBe('2026-09-30'); // 05/08 + 2 × 28 j
    expect(abo.historiquePrix).toEqual([{ date: '2026-08-05', prix: 9.99 }]);
    expect(abo.contactResiliation).toBe('mon compte');
    expect(abo.referenceClient).toBeNull();
    expect(abo.urlGestion).toBe('https://lycamobile.fr');
    expect(abo.tags).toEqual(['perso', 'mobile']);
    expect(abo.notes).toBe('note');
    expect(abo.alerteJoursAvant).toBe(7);
    expect(abo.statut).toEqual({ type: 'actif' });
    expect(abo.deletedAt).toBeNull();
  });

  it('rappel libre à date (EF-74) : aller-retour formulaire ↔ abonnement', () => {
    const abo = abonnementDepuisFormulaire(
      etat({ rappelDate: '2027-01-15', rappelTexte: ' renégocier la box ' }),
      { jour: JOUR },
    );
    expect(abo.rappel).toEqual({ date: '2027-01-15', texte: 'renégocier la box' });
    expect(formulaireDepuisAbonnement(abo, JOUR)).toMatchObject({
      rappelDate: '2027-01-15',
      rappelTexte: 'renégocier la box',
    });
    expect(abonnementDepuisFormulaire(etat(), { jour: JOUR }).rappel).toBeNull();
  });

  it('création avec essai, engagement, partage, montant estimé, hausse, à l’usage', () => {
    const abo = abonnementDepuisFormulaire(
      etat({
        dateDebut: '2026-09-01',
        essai: true,
        essaiFin: '2026-09-15',
        essaiPrix: '11,99',
        engagement: true,
        engagementMois: '12',
        engagementPreavis: '30',
        partage: true,
        partagePart: '6,75',
        montantEstime: true,
        regularisationDate: '2027-03-01',
        prixFutur: true,
        prixFuturDate: '2026-12-01',
        prixFuturMontant: '14,99',
      }),
      { jour: JOUR },
    );
    expect(abo.essai).toEqual({ dateFin: '2026-09-15', prixApres: 11.99 });
    expect(abo.engagement).toEqual({ dureeMois: 12, preavisJours: 30 });
    expect(abo.partage).toEqual({ prixTotal: 9.99, partPayee: 6.75 }); // prix plein = champ Prix
    expect(abo.montantEstime).toBe(true);
    expect(abo.regularisation).toEqual({ date: '2027-03-01' });
    expect(abo.prixFutur).toEqual({ date: '2026-12-01', montant: 14.99 });
    expect(abo.prochaineEcheance).toBe('2026-09-15'); // fin d'essai

    const usage = abonnementDepuisFormulaire(
      etat({ typePeriodicite: 'a_l_usage', plafond: '15', prix: '' }),
      { jour: JOUR },
    );
    expect(usage.periodicite).toEqual({ type: 'a_l_usage', plafond: 15 });
    expect(usage.prix).toBe(0);
    expect(usage.prochaineEcheance).toBeNull();
    expect(usage.historiquePrix).toEqual([]);
  });

  it('aller-retour sur le jeu de démo : formulaire → abonnement identique', () => {
    for (const original of jeu.abonnements) {
      const f = formulaireDepuisAbonnement(original, DATE_REFERENCE_DEMO);
      expect(validerFormulaire(f), original.nom).toEqual({});
      const retour = abonnementDepuisFormulaire(f, { jour: DATE_REFERENCE_DEMO }, original);
      expect({ ...retour, updatedAt: '' }, original.nom).toEqual({ ...original, updatedAt: '' });
    }
  });

  it('modification : id et statut conservés, hausse versée dans l’historique', () => {
    const netflix = par(IDS_DEMO.abonnements.netflix);
    const f = formulaireDepuisAbonnement(netflix, JOUR);
    const maj = abonnementDepuisFormulaire({ ...f, prix: '15,49' }, { jour: JOUR }, netflix);
    expect(maj.id).toBe(netflix.id);
    expect(maj.statut).toEqual(netflix.statut);
    expect(maj.prix).toBe(15.49);
    expect(maj.historiquePrix.at(-1)).toEqual({ date: JOUR, prix: 15.49 });
    expect(maj.historiquePrix).toHaveLength(netflix.historiquePrix.length + 1);

    const sansChangement = abonnementDepuisFormulaire(f, { jour: JOUR }, netflix);
    expect(sansChangement.historiquePrix).toEqual(netflix.historiquePrix);
  });

  it('modification : passage de « à l’usage » à récurrent crée l’historique', () => {
    const api = par(IDS_DEMO.abonnements.claudeApi);
    const f = formulaireDepuisAbonnement(api, JOUR);
    const maj = abonnementDepuisFormulaire(
      { ...f, typePeriodicite: 'recurrente', preset: 'mensuelle', prix: '20' },
      { jour: JOUR },
      api,
    );
    expect(maj.periodicite).toEqual(PERIODICITES.mensuelle);
    expect(maj.historiquePrix).toEqual([{ date: api.dateDebut, prix: 20 }]);
    expect(maj.prochaineEcheance).not.toBeNull();
  });
});
