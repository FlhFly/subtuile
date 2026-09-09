import { afterEach, describe, expect, it } from 'vitest';
import { chargerJeuDemo, DATE_REFERENCE_DEMO, IDS_DEMO, jeuDemo } from '../src/data/fixtures/demo';
import {
  CATALOGUE_EMBARQUE,
  trouverFormule,
  trouverService,
} from '../src/data/refdata/RefDataProvider';
import { creerDexieProvider, type DexieProvider } from '../src/data/storage/dexieProvider';
import {
  aujourdhui,
  dateLimiteResiliation,
  decalerJours,
  urgenceAbonnement,
} from '../src/domain/dates';

const ids = IDS_DEMO.abonnements;

describe('jeu de démo de la maquette v6 (§5.5)', () => {
  const jeu = jeuDemo();
  const par = (id: string) => jeu.abonnements.find((a) => a.id === id)!;

  it('13 abonnements variés et 4 moyens de paiement', () => {
    expect(jeu.abonnements).toHaveLength(13);
    expect(jeu.moyensPaiement).toHaveLength(4);
    const types = new Set(jeu.moyensPaiement.map((m) => m.type));
    expect(types).toEqual(new Set(['cb', 'paypal', 'apple_pay', 'sepa']));
  });

  it('cohérence référentielle : moyens de paiement, services et formules existent', () => {
    const mpIds = new Set(jeu.moyensPaiement.map((m) => m.id));
    for (const a of jeu.abonnements) {
      expect(a.moyenPaiementId && mpIds.has(a.moyenPaiementId)).toBe(true);
      if (a.serviceId !== null) {
        const service = trouverService(CATALOGUE_EMBARQUE, a.serviceId);
        expect(service, a.nom).toBeDefined();
        if (a.formuleId !== null)
          expect(trouverFormule(service!, a.formuleId), a.nom).toBeDefined();
      } else {
        // saisie libre : couleur et logo portés par l'abonnement
        expect(a.couleur, a.nom).not.toBeNull();
        expect(a.logo?.type, a.nom).toBe('initiales');
      }
    }
  });

  it('échéances à la date de référence, conformes à la maquette', () => {
    expect(par(ids.strava).prochaineEcheance).toBe('2026-08-18');
    expect(par(ids.netflix).prochaineEcheance).toBe('2026-09-06');
    expect(par(ids.prime).prochaineEcheance).toBe('2026-09-30');
    expect(par(ids.claude).prochaineEcheance).toBe('2026-08-28');
    expect(par(ids.chatgpt).prochaineEcheance).toBe('2026-08-24');
    expect(par(ids.disney).prochaineEcheance).toBe('2026-08-21'); // fin d'essai
    expect(par(ids.basicFit).prochaineEcheance).toBe('2026-08-25');
    expect(par(ids.lycamobile).prochaineEcheance).toBe('2026-09-02');
    expect(par(ids.edf).prochaineEcheance).toBe('2026-09-01');
    // sans renouvellement attendu
    expect(par(ids.canal).prochaineEcheance).toBeNull();
    expect(par(ids.spotify).prochaineEcheance).toBeNull();
    expect(par(ids.dropbox).prochaineEcheance).toBeNull();
    expect(par(ids.claudeApi).prochaineEcheance).toBeNull();
  });

  it('cas particuliers de la maquette', () => {
    expect(par(ids.netflix).partage).toEqual({ prixTotal: 13.49, partPayee: 6.75 });
    expect(par(ids.netflix).prixFutur).toEqual({ date: '2026-10-06', montant: 14.99 });
    expect(par(ids.chatgpt).canalAchat).toBe('app_store');
    expect(par(ids.basicFit).serviceId).toBeNull();
    expect(dateLimiteResiliation(par(ids.basicFit), DATE_REFERENCE_DEMO)).toBe('2026-08-26');
    expect(par(ids.canal).statut).toEqual({ type: 'resilie_actif_jusquau', jusquau: '2026-09-30' });
    expect(par(ids.spotify).statut.type).toBe('en_pause');
    expect(par(ids.dropbox).statut.type).toBe('archive');
    expect(par(ids.lycamobile).periodicite).toEqual({
      type: 'recurrente',
      unite: 'jour',
      intervalle: 28,
    });
    expect(par(ids.claudeApi).periodicite).toEqual({ type: 'a_l_usage', plafond: 15 });
    expect(par(ids.edf).montantEstime).toBe(true);
    expect(par(ids.edf).regularisation).toEqual({ date: '2026-09-12' });
    expect(par(ids.edf).modeResiliation).toBe('telephone');
    expect(par(ids.edf).referenceClient).toBe('014 522 887');
    expect(
      jeu.moyensPaiement.find((m) => m.id === IDS_DEMO.moyensPaiement.cb)?.dateExpiration,
    ).toBe('2026-09');
  });

  it('codes couleur attendus sur les tuiles (EF-11)', () => {
    const u = (id: string) => urgenceAbonnement(par(id), DATE_REFERENCE_DEMO);
    expect(u(ids.strava)).toMatchObject({ niveau: 'urg', jours: 2 });
    expect(u(ids.disney)).toMatchObject({ niveau: 'trial', motif: 'essai', jours: 5 });
    expect(u(ids.basicFit)).toMatchObject({ niveau: 'trial', motif: 'preavis', jours: 10 });
    expect(u(ids.chatgpt)).toMatchObject({ niveau: 'warn', jours: 8 });
    expect(u(ids.netflix)).toMatchObject({ niveau: 'ok', jours: 21 });
    expect(u(ids.canal)).toBeNull();
    expect(u(ids.claudeApi)).toBeNull();
  });

  it('décalé à une autre date, le jeu garde les mêmes compteurs', () => {
    const decale = jeuDemo('2026-09-09');
    const p = (id: string) => decale.abonnements.find((a) => a.id === id)!;
    expect(p(ids.strava).prochaineEcheance).toBe('2026-09-11'); // J-2
    expect(p(ids.disney).essai?.dateFin).toBe('2026-09-14'); // J-5
    expect(urgenceAbonnement(p(ids.basicFit), '2026-09-09')).toMatchObject({
      motif: 'preavis',
      jours: 10,
    });
    expect(decale.moyensPaiement[0]?.dateExpiration).toBe('2026-09');
  });
});

describe('chargement dans le stockage', () => {
  let storage: DexieProvider;
  afterEach(async () => {
    await storage.supprimerBase();
  });

  it('sans date explicite, charge la démo décalée au jour courant (compteurs vivants)', async () => {
    storage = creerDexieProvider('subtuile-test-demo-jour');
    await chargerJeuDemo(storage);
    const strava = await storage.abonnements.lire(ids.strava);
    const disney = await storage.abonnements.lire(ids.disney);
    const jour = aujourdhui();
    expect(strava?.prochaineEcheance).toBe(decalerJours(jour, 2));
    expect(disney?.essai?.dateFin).toBe(decalerJours(jour, 5));
    expect(urgenceAbonnement(strava!, jour)).toMatchObject({ niveau: 'urg', jours: 2 });
  });

  it('charge la démo et reste idempotent au rechargement', async () => {
    storage = creerDexieProvider('subtuile-test-demo');
    await chargerJeuDemo(storage, DATE_REFERENCE_DEMO);
    expect(await storage.abonnements.lister()).toHaveLength(13);
    expect(await storage.moyensPaiement.lister()).toHaveLength(4);
    await chargerJeuDemo(storage, '2026-09-09');
    const abos = await storage.abonnements.lister();
    expect(abos).toHaveLength(13);
    expect(abos.find((a) => a.id === ids.strava)?.prochaineEcheance).toBe('2026-09-11');
  });
});
