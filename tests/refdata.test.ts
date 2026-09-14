import { describe, expect, it } from 'vitest';
import {
  CATALOGUE_EMBARQUE,
  ErreurRefData,
  refDataEmbarque,
  TAUX_EMBARQUES,
  trouverFormule,
  trouverService,
  validerCatalogue,
  validerTaux,
} from '../src/data/refdata/RefDataProvider';
import { CATEGORIES, DEVISES_AFFICHAGE } from '../src/domain/types';

describe('catalogue embarqué (§3.4, §5.6)', () => {
  it('respecte le contrat { version, publieLe, data }', () => {
    expect(Number.isInteger(CATALOGUE_EMBARQUE.version)).toBe(true);
    expect(CATALOGUE_EMBARQUE.version).toBeGreaterThanOrEqual(1);
    expect(CATALOGUE_EMBARQUE.publieLe).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Array.isArray(CATALOGUE_EMBARQUE.data)).toBe(true);
  });

  it('contient le catalogue complet de la maquette v6 (annexe A) : 79 services, 10 catégories', () => {
    expect(CATALOGUE_EMBARQUE.version).toBe(7);
    expect(CATALOGUE_EMBARQUE.data).toHaveLength(79);
    const ids = CATALOGUE_EMBARQUE.data.map((s) => s.id);
    const attendus = [
      // lot 1
      'strava',
      'netflix',
      'prime',
      'claude',
      'chatgpt',
      'disney',
      'canal',
      'spotify',
      'dropbox',
      'icloud',
      'edf',
      'engie',
      // annexe A
      'hbomax',
      'appletv',
      'youtube',
      'dazn',
      'deezer',
      'audible',
      'gemini',
      'mistral',
      'googleone',
      'ms365',
      'adobe',
      'onepass',
      'basicfit',
      'zwift',
      'lemonde',
      'mediapart',
      'psplus',
      'gamepass',
      'nordvpn',
      'proton',
      // vie courante
      'uberone',
      'babbel',
      'totalenergies',
      'veolia',
      'maif',
    ];
    for (const attendu of attendus) expect(ids, attendu).toContain(attendu);
    const parCategorie = new Map<string, number>();
    for (const s of CATALOGUE_EMBARQUE.data) {
      parCategorie.set(s.categorie, (parCategorie.get(s.categorie) ?? 0) + 1);
    }
    expect(parCategorie.size).toBe(10);
    expect(parCategorie.get('vie_courante')).toBe(14);
    expect(parCategorie.get('streaming')).toBe(13);
  });

  it('services App Store seulement : deep link, pas d’adresse de gestion (EF-21)', () => {
    for (const id of [
      'appletv',
      'applemusic',
      'applefit',
      'arcade',
      'duolingo',
      'petitbambou',
      'icloud',
    ]) {
      const s = trouverService(CATALOGUE_EMBARQUE, id)!;
      expect(s.urlGestion, id).toBeNull();
      expect(s.deepLinks.app_store, id).toBe('itms-apps://apps.apple.com/account/subscriptions');
    }
  });

  it('12 services populaires, mis en avant dans la sélection du formulaire (maquette)', () => {
    const populaires = CATALOGUE_EMBARQUE.data.filter((s) => s.populaire).map((s) => s.id);
    expect(populaires).toEqual([
      'netflix',
      'prime',
      'disney',
      'canal',
      'youtube',
      'spotify',
      'deezer',
      'claude',
      'chatgpt',
      'icloud',
      'dropbox',
      'strava',
    ]);
  });

  it('vie courante française : mode de résiliation pré-renseigné et montant estimé (EF-21b, EF-04b)', () => {
    const attendus: Record<string, [string, boolean]> = {
      edf: ['telephone', true],
      engie: ['telephone', true],
      totalenergies: ['espace_client', true],
      veolia: ['espace_client', true],
      maif: ['courrier_recommande', false],
    };
    for (const [id, [mode, estime]] of Object.entries(attendus)) {
      const s = trouverService(CATALOGUE_EMBARQUE, id)!;
      expect(s.modeResiliation, id).toBe(mode);
      expect(s.montantEstime, id).toBe(estime);
      expect(s.contactResiliation, id).not.toBeNull();
    }
    // les services « → rubrique » sans page de résiliation directe passent par l'espace client
    expect(trouverService(CATALOGUE_EMBARQUE, 'lequipe')?.modeResiliation).toBe('espace_client');
    expect(trouverService(CATALOGUE_EMBARQUE, 'lequipe')?.urlGestion).toBe('https://lequipe.fr');
  });

  it('adresses de gestion absolues (https) quand elles existent', () => {
    for (const s of CATALOGUE_EMBARQUE.data) {
      if (s.urlGestion !== null) expect(s.urlGestion, s.id).toMatch(/^https:\/\//);
    }
  });

  it('ids de services et de formules uniques (contrat de stabilité)', () => {
    const ids = CATALOGUE_EMBARQUE.data.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    const formules = CATALOGUE_EMBARQUE.data.flatMap((s) => s.formules.map((f) => f.id));
    expect(new Set(formules).size).toBe(formules.length);
    for (const s of CATALOGUE_EMBARQUE.data) {
      for (const f of s.formules) expect(f.id.startsWith(`${s.id}_`)).toBe(true);
    }
  });

  it('chaque service a une catégorie connue, un logo initiales (V1) et une couleur hex', () => {
    for (const s of CATALOGUE_EMBARQUE.data) {
      expect(CATEGORIES).toContain(s.categorie);
      expect(s.logo.type).toBe('initiales');
      expect(s.logo.valeur.length).toBeGreaterThan(0);
      expect(s.couleur).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('illustre EF-02 : YouTube Premium est moins cher en direct que via l’App Store', () => {
    const youtube = trouverService(CATALOGUE_EMBARQUE, 'youtube');
    expect(youtube).toBeDefined();
    const direct = trouverFormule(youtube!, 'youtube_mensuel');
    const store = trouverFormule(youtube!, 'youtube_mensuel_app_store');
    expect(direct?.canal).toBe('direct');
    expect(store?.canal).toBe('app_store');
    expect(direct!.prix).toBeLessThan(store!.prix);
  });

  it('vie courante : résiliation par téléphone et montant estimé', () => {
    const edf = trouverService(CATALOGUE_EMBARQUE, 'edf');
    expect(edf?.modeResiliation).toBe('telephone');
    expect(edf?.contactResiliation).toContain('09 69');
    expect(edf?.montantEstime).toBe(true);
    expect(edf?.formules).toEqual([]);
  });

  it('App Store : iCloud+ sans URL de gestion mais avec le deep link (EF-21)', () => {
    const icloud = trouverService(CATALOGUE_EMBARQUE, 'icloud');
    expect(icloud?.urlGestion).toBeNull();
    expect(icloud?.deepLinks.app_store).toBe('itms-apps://apps.apple.com/account/subscriptions');
  });

  it('aides de consultation', () => {
    expect(trouverService(CATALOGUE_EMBARQUE, null)).toBeUndefined();
    expect(trouverService(CATALOGUE_EMBARQUE, 'inconnu')).toBeUndefined();
    const netflix = trouverService(CATALOGUE_EMBARQUE, 'netflix')!;
    expect(trouverFormule(netflix, null)).toBeUndefined();
    expect(trouverFormule(netflix, 'netflix_standard')?.prix).toBe(14.99);
  });
});

describe('taux embarqués (EF-45)', () => {
  it('base EUR, taux positifs pour chaque devise d’affichage', () => {
    expect(TAUX_EMBARQUES.data.base).toBe('EUR');
    expect(TAUX_EMBARQUES.data.taux.EUR).toBe(1);
    for (const d of DEVISES_AFFICHAGE) expect(TAUX_EMBARQUES.data.taux[d]).toBeGreaterThan(0);
    expect(TAUX_EMBARQUES.publieLe).toBe('2026-08-24');
  });
});

describe('RefDataProvider embarqué', () => {
  it('charge le catalogue et les taux sans réseau', async () => {
    await expect(refDataEmbarque.catalogue.charger()).resolves.toBe(CATALOGUE_EMBARQUE);
    await expect(refDataEmbarque.taux.charger()).resolves.toBe(TAUX_EMBARQUES);
  });
});

describe('validation des données de référence', () => {
  const service = (id: string, extra: Record<string, unknown> = {}) => ({
    id,
    nom: id,
    categorie: 'autre',
    couleur: '#000000',
    logo: { type: 'initiales', valeur: 'X' },
    formules: [],
    ...extra,
  });

  it('accepte un catalogue minimal et pose les défauts', () => {
    const c = validerCatalogue({ version: 1, publieLe: '2026-01-01', data: [service('a')] });
    expect(c.data[0]).toMatchObject({
      urlGestion: null,
      deepLinks: {},
      periodicitesConnues: [],
      modeResiliation: 'lien',
      contactResiliation: null,
      montantEstime: false,
      populaire: false,
    });
  });

  it('rejette version, date, catégorie ou doublons invalides', () => {
    expect(() => validerCatalogue({ version: 0, publieLe: '2026-01-01', data: [] })).toThrow(
      ErreurRefData,
    );
    expect(() => validerCatalogue({ version: 1, publieLe: '2026-02-30', data: [] })).toThrow(
      ErreurRefData,
    );
    expect(() =>
      validerCatalogue({
        version: 1,
        publieLe: '2026-01-01',
        data: [service('a', { categorie: 'films' })],
      }),
    ).toThrow(/categorie/);
    expect(() =>
      validerCatalogue({ version: 1, publieLe: '2026-01-01', data: [service('a'), service('a')] }),
    ).toThrow(/double/);
    expect(() =>
      validerCatalogue({
        version: 1,
        publieLe: '2026-01-01',
        data: [
          service('a', {
            formules: [
              {
                id: 'f',
                nom: 'F',
                prix: 1,
                periodicite: { type: 'recurrente', unite: 'mois', intervalle: 0 },
                canal: 'direct',
              },
            ],
          }),
        ],
      }),
    ).toThrow(/intervalle/);
  });

  it('rejette des taux sans base EUR ou avec EUR ≠ 1', () => {
    const ok = {
      version: 1,
      publieLe: '2026-01-01',
      data: { base: 'EUR', taux: { EUR: 1, USD: 1.1, GBP: 0.9, CHF: 0.95 } },
    };
    expect(validerTaux(ok).data.taux.USD).toBe(1.1);
    expect(() => validerTaux({ ...ok, data: { ...ok.data, base: 'USD' } })).toThrow(ErreurRefData);
    expect(() =>
      validerTaux({ ...ok, data: { base: 'EUR', taux: { ...ok.data.taux, EUR: 2 } } }),
    ).toThrow(/EUR/);
    expect(() => validerTaux({ ...ok, data: { base: 'EUR', taux: { EUR: 1, USD: 1.1 } } })).toThrow(
      /GBP/,
    );
  });
});
