import { describe, expect, it } from 'vitest';
import { DATE_REFERENCE_DEMO, IDS_DEMO, jeuDemo } from '../src/data/fixtures/demo';
import {
  appliquerCriteres,
  cleEcheance,
  compterParStatut,
  CRITERES_DEFAUT,
  filtrerParStatut,
  filtresActifs,
  nonArchives,
  normaliserTexte,
  rechercher,
  tagsDisponibles,
  trierAbonnements,
} from '../src/domain/tri';

const jeu = jeuDemo();
const ids = IDS_DEMO.abonnements;
const noms = (liste: { id: string }[]) => liste.map((a) => a.id);

describe('tri de l’accueil (EF-12)', () => {
  it('clé d’échéance : essai, échéance, sinon infini', () => {
    const par = (id: string) => jeu.abonnements.find((a) => a.id === id)!;
    expect(cleEcheance(par(ids.strava), DATE_REFERENCE_DEMO)).toBe(2);
    expect(cleEcheance(par(ids.disney), DATE_REFERENCE_DEMO)).toBe(5); // fin d'essai
    expect(cleEcheance(par(ids.spotify), DATE_REFERENCE_DEMO)).toBe(Number.POSITIVE_INFINITY);
    expect(cleEcheance(par(ids.claudeApi), DATE_REFERENCE_DEMO)).toBe(Number.POSITIVE_INFINITY);
  });

  it('nonArchives exclut les archivés', () => {
    const visibles = nonArchives(jeu.abonnements);
    expect(visibles).toHaveLength(12);
    expect(noms(visibles)).not.toContain(ids.dropbox);
  });

  it('par échéance : la plus proche d’abord, sans échéance en dernier (nom pour départager)', () => {
    const tries = trierAbonnements(nonArchives(jeu.abonnements), 'echeance', DATE_REFERENCE_DEMO);
    expect(noms(tries)).toEqual([
      ids.strava, // J-2
      ids.disney, // essai J-5
      ids.chatgpt, // J-8
      ids.basicFit, // J-9
      ids.claude, // J-12
      ids.edf, // J-16
      ids.lycamobile, // J-17
      ids.netflix, // J-21
      ids.prime, // J-45
      ids.canal, // sans échéance : Canal+, Claude API, Spotify (ordre alphabétique)
      ids.claudeApi,
      ids.spotify,
    ]);
  });

  it('par prix : coût mensuel normalisé décroissant', () => {
    const tries = trierAbonnements(nonArchives(jeu.abonnements), 'prix', DATE_REFERENCE_DEMO);
    expect(noms(tries).slice(0, 3)).toEqual([ids.edf, ids.basicFit, ids.chatgpt]); // 64, 24.99, 23
    expect(noms(tries).at(-1)).toBe(ids.claudeApi); // 0 (à l'usage)
  });

  it('par nom et par catégorie', () => {
    const parNom = trierAbonnements(jeu.abonnements, 'nom', DATE_REFERENCE_DEMO);
    expect(parNom.map((a) => a.nom).slice(0, 3)).toEqual(['Amazon Prime', 'Basic-Fit', 'Canal+']);
    const parCat = trierAbonnements(jeu.abonnements, 'categorie', DATE_REFERENCE_DEMO);
    expect(parCat[0]?.categorie).toBe('cloud');
    expect(parCat.at(-1)?.categorie).toBe('vie_courante');
  });

  it('personnalisé : ordre explicite d’abord, puis échéance', () => {
    const avecOrdre = jeu.abonnements.map((a) =>
      a.id === ids.prime ? { ...a, ordre: 0 } : a.id === ids.spotify ? { ...a, ordre: 1 } : a,
    );
    const tries = trierAbonnements(avecOrdre, 'personnalise', DATE_REFERENCE_DEMO);
    expect(noms(tries).slice(0, 3)).toEqual([ids.prime, ids.spotify, ids.strava]);
  });

  it('filtre par statut et compte par statut (EF-12, EF-06)', () => {
    const c = compterParStatut(jeu.abonnements);
    expect(c).toEqual({ tous: 12, actifs: 10, en_pause: 1, resilies: 1, archives: 1 });
    expect(filtrerParStatut(jeu.abonnements, 'tous')).toHaveLength(12);
    expect(noms(filtrerParStatut(jeu.abonnements, 'en_pause'))).toEqual([ids.spotify]);
    expect(noms(filtrerParStatut(jeu.abonnements, 'resilies'))).toEqual([ids.canal]);
    expect(noms(filtrerParStatut(jeu.abonnements, 'archives'))).toEqual([ids.dropbox]);
    expect(filtrerParStatut(jeu.abonnements, 'actifs')).toHaveLength(10);
  });

  it('tags disponibles, sans doublons ni sensibilité à la casse', () => {
    expect(tagsDisponibles(jeu.abonnements)).toEqual([
      'foyer',
      'maison',
      'perso',
      'pro',
      'remboursable',
    ]);
    const avecDoublon = [
      ...jeu.abonnements,
      { ...jeu.abonnements[0]!, id: 'x', tags: ['PERSO', 'Été'] },
    ];
    expect(tagsDisponibles(avecDoublon)).toEqual([
      'Été',
      'foyer',
      'maison',
      'perso',
      'pro',
      'remboursable',
    ]);
  });

  it('recherche tolérante aux accents et à la casse, sur nom, tags, référence et notes (EF-15)', () => {
    expect(normaliserTexte('  Élec TRIQUE ')).toBe('elec trique');
    expect(noms(rechercher(jeu.abonnements, 'net'))).toEqual([ids.netflix]);
    expect(noms(rechercher(jeu.abonnements, 'ELEC'))).toEqual([ids.edf]); // « EDF Élec »
    expect(noms(rechercher(jeu.abonnements, 'remboursable'))).toEqual([ids.claudeApi]); // tag
    expect(noms(rechercher(jeu.abonnements, '014 522'))).toEqual([ids.edf]); // référence client
    expect(noms(rechercher(jeu.abonnements, 'lissées'))).toEqual([ids.edf]); // notes
    expect(rechercher(jeu.abonnements, 'zzz')).toEqual([]);
    expect(rechercher(jeu.abonnements, '   ')).toHaveLength(13);
  });

  it('compose statut, catégorie, paiement, tag, recherche et tri', () => {
    const base = { ...CRITERES_DEFAUT };
    expect(filtresActifs(base)).toBe(false);
    expect(filtresActifs({ ...base, tri: 'nom' })).toBe(false);
    expect(filtresActifs({ ...base, recherche: 'a' })).toBe(true);

    const streaming = appliquerCriteres(
      jeu.abonnements,
      { ...base, categorie: 'streaming' },
      DATE_REFERENCE_DEMO,
    );
    expect(noms(streaming)).toEqual([ids.disney, ids.netflix, ids.prime, ids.canal]); // Canal+ résilié en dernier

    const sepa = appliquerCriteres(
      jeu.abonnements,
      { ...base, moyenPaiementId: IDS_DEMO.moyensPaiement.sepa },
      DATE_REFERENCE_DEMO,
    );
    expect(noms(sepa)).toEqual([ids.basicFit, ids.edf, ids.lycamobile, ids.canal]);

    const pro = appliquerCriteres(jeu.abonnements, { ...base, tag: 'PRO' }, DATE_REFERENCE_DEMO);
    expect(noms(pro)).toEqual([ids.chatgpt, ids.claudeApi]);

    const archives = appliquerCriteres(
      jeu.abonnements,
      { ...base, statut: 'archives', tri: 'nom' },
      DATE_REFERENCE_DEMO,
    );
    expect(noms(archives)).toEqual([ids.dropbox]);

    const combine = appliquerCriteres(
      jeu.abonnements,
      { ...base, categorie: 'ia', recherche: 'claude', tri: 'prix' },
      DATE_REFERENCE_DEMO,
    );
    expect(noms(combine)).toEqual([ids.claude, ids.claudeApi]);
  });

  it('ne mute pas la liste d’origine', () => {
    const original = [...jeu.abonnements];
    trierAbonnements(jeu.abonnements, 'nom', DATE_REFERENCE_DEMO);
    expect(jeu.abonnements).toEqual(original);
  });
});
