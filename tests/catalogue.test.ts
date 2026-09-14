import { describe, expect, it } from 'vitest';
import {
  CATALOGUE_EMBARQUE,
  trouverFormule,
  trouverService,
} from '../src/data/refdata/RefDataProvider';
import {
  appliquerFormule,
  appStoreSeulement,
  canalParDefaut,
  comparaisonCanaux,
  detacherDuCatalogue,
  grouperParCategorie,
  preRemplirDepuisService,
  rechercherServices,
  servicesPourSelection,
  suggestionsCatalogue,
  SUGGESTIONS_MAX,
} from '../src/domain/catalogue';
import {
  abonnementDepuisFormulaire,
  formulaireVide,
  validerFormulaire,
} from '../src/domain/formulaire';

const services = CATALOGUE_EMBARQUE.data;
const service = (id: string) => trouverService(CATALOGUE_EMBARQUE, id)!;
const JOUR = '2026-09-11';

describe('recherche et suggestions (EF-02b)', () => {
  it('recherche tolérante sur le nom et l’identifiant', () => {
    expect(rechercherServices(services, 'NETF').map((s) => s.id)).toEqual(['netflix']);
    expect(rechercherServices(services, 'équipe').map((s) => s.id)).toEqual(['lequipe']);
    expect(rechercherServices(services, 'apple').length).toBeGreaterThanOrEqual(4);
    expect(rechercherServices(services, '')).toHaveLength(services.length);
    expect(rechercherServices(services, 'zzz')).toEqual([]);
  });

  it('sélection du formulaire : les 12 populaires sans recherche, sinon le résultat de la recherche', () => {
    const defaut = servicesPourSelection(services, '');
    expect(defaut).toHaveLength(12);
    expect(defaut.every((s) => s.populaire)).toBe(true);
    expect(servicesPourSelection(services, '   ')).toHaveLength(12);
    expect(servicesPourSelection(services, 'nord').map((s) => s.id)).toEqual(['nordvpn']);
    expect(servicesPourSelection(services, 'zzz')).toEqual([]);
  });

  it('au plus 3 suggestions, dès 2 caractères', () => {
    expect(suggestionsCatalogue(services, 'a')).toEqual([]);
    expect(suggestionsCatalogue(services, 'ap').length).toBe(SUGGESTIONS_MAX);
    expect(suggestionsCatalogue(services, 'spot').map((s) => s.id)).toEqual(['spotify']);
    expect(suggestionsCatalogue(services, '  ')).toEqual([]);
  });
});

describe('pré-remplissage depuis le catalogue (EF-02)', () => {
  it('service direct avec formules : première formule, périodicité, adresse, catégorie', () => {
    const f = preRemplirDepuisService(formulaireVide(JOUR), service('netflix'));
    expect(f).toMatchObject({
      serviceId: 'netflix',
      formuleId: 'netflix_standard_pub',
      nom: 'Netflix',
      categorie: 'streaming',
      prix: '7,99',
      urlGestion: 'https://www.netflix.com/cancelplan',
      canalAchat: 'direct',
      modeResiliation: 'lien',
      typePeriodicite: 'recurrente',
      preset: 'mensuelle',
      montantEstime: false,
    });
    expect(validerFormulaire(f)).toEqual({});
  });

  it('service App Store seulement : canal App Store, sans adresse', () => {
    const appletv = service('appletv');
    expect(appStoreSeulement(appletv)).toBe(true);
    expect(canalParDefaut(appletv)).toBe('app_store');
    const f = preRemplirDepuisService(formulaireVide(JOUR), appletv);
    expect(f.canalAchat).toBe('app_store');
    expect(f.urlGestion).toBe('');
    expect(f.prix).toBe('9,99'); // formule App Store du catalogue v5
    expect(f.preset).toBe('mensuelle');
  });

  it('vie courante : mode de résiliation, contact et montant estimé pré-renseignés', () => {
    const f = preRemplirDepuisService(formulaireVide(JOUR), service('edf'));
    expect(f).toMatchObject({
      modeResiliation: 'telephone',
      contactResiliation: '09 69 32 15 15 (EDF particuliers)',
      montantEstime: true,
      categorie: 'vie_courante',
      formuleId: null,
    });
  });

  it('formule annuelle : périodicité et canal suivent la formule', () => {
    const strava = service('strava');
    const f = preRemplirDepuisService(
      formulaireVide(JOUR),
      strava,
      trouverFormule(strava, 'strava_annuel'),
    );
    expect(f.preset).toBe('annuelle');
    expect(f.prix).toBe('59,99');
    const mensuel = appliquerFormule(f, trouverFormule(strava, 'strava_mensuel')!);
    expect(mensuel).toMatchObject({
      preset: 'mensuelle',
      prix: '9,99',
      formuleId: 'strava_mensuel',
    });
  });

  it('conserve les champs libres déjà saisis et se détache proprement', () => {
    const saisi = {
      ...formulaireVide(JOUR),
      notes: 'ma note',
      tags: 'perso',
      moyenPaiementId: 'mp',
    };
    const f = preRemplirDepuisService(saisi, service('spotify'));
    expect(f.notes).toBe('ma note');
    expect(f.tags).toBe('perso');
    expect(f.moyenPaiementId).toBe('mp');
    const libre = detacherDuCatalogue(f);
    expect(libre.serviceId).toBeNull();
    expect(libre.formuleId).toBeNull();
    expect(libre.nom).toBe('Spotify'); // la saisie reste
    const abo = abonnementDepuisFormulaire(libre, { jour: JOUR });
    expect(abo.serviceId).toBeNull();
    expect(abo.formuleId).toBeNull();
  });

  it('l’abonnement créé porte serviceId et formuleId', () => {
    const f = preRemplirDepuisService(formulaireVide(JOUR), service('chatgpt'));
    const abo = abonnementDepuisFormulaire(f, { jour: JOUR });
    expect(abo.serviceId).toBe('chatgpt');
    expect(abo.formuleId).toBe('chatgpt_plus_direct');
    expect(abo.prix).toBe(23);
  });
});

describe('comparaison des canaux (EF-02, « souvent moins cher en direct »)', () => {
  it('YouTube Premium : la formule App Store a un équivalent direct moins cher', () => {
    const youtube = service('youtube');
    const store = trouverFormule(youtube, 'youtube_mensuel_app_store')!;
    const comparaison = comparaisonCanaux(youtube, store);
    expect(comparaison).toMatchObject({
      direct: trouverFormule(youtube, 'youtube_mensuel'),
      store,
    });
    expect(comparaison?.ecart).toBeCloseTo(4, 6);
    // sans formule choisie : première paire trouvée
    expect(comparaisonCanaux(youtube)?.ecart).toBeCloseTo(4, 6);
    // formule directe choisie : rien à signaler
    expect(comparaisonCanaux(youtube, trouverFormule(youtube, 'youtube_mensuel'))).toBeUndefined();
  });

  it('la même offre en direct est préférée à une formule moins chère d’un autre palier', () => {
    const chatgpt = service('chatgpt');
    // Plus — App Store (23 €) contre Plus — direct (23 €) : rien à signaler, Go (8 €) n'est pas un équivalent
    expect(
      comparaisonCanaux(chatgpt, trouverFormule(chatgpt, 'chatgpt_plus_app_store')),
    ).toBeUndefined();
    const youtube = service('youtube');
    // Individuel — App Store contre Individuel, pas contre Premium Lite
    expect(
      comparaisonCanaux(youtube, trouverFormule(youtube, 'youtube_mensuel_app_store'))?.direct.id,
    ).toBe('youtube_mensuel');
  });

  it('services sans double canal ou sans formule : rien', () => {
    expect(comparaisonCanaux(service('netflix'))).toBeUndefined();
    expect(comparaisonCanaux(service('icloud'))).toBeUndefined(); // App Store seulement
    expect(comparaisonCanaux(service('edf'))).toBeUndefined();
  });
});

describe('regroupement par catégorie (§7.8)', () => {
  it('suit l’ordre du modèle et omet les catégories vides', () => {
    const groupes = grouperParCategorie(services);
    expect(groupes.map((g) => g.categorie)).toEqual([
      'streaming',
      'sport',
      'musique',
      'ia',
      'cloud',
      'productivite',
      'presse',
      'gaming',
      'securite',
      'vie_courante',
    ]);
    expect(groupes.reduce((n, g) => n + g.services.length, 0)).toBe(services.length);
    expect(grouperParCategorie(rechercherServices(services, 'netflix'))).toEqual([
      { categorie: 'streaming', services: [service('netflix')] },
    ]);
  });
});
