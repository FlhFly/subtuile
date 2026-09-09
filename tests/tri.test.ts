import { describe, expect, it } from 'vitest';
import { DATE_REFERENCE_DEMO, IDS_DEMO, jeuDemo } from '../src/data/fixtures/demo';
import { cleEcheance, nonArchives, trierAbonnements } from '../src/domain/tri';

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

  it('ne mute pas la liste d’origine', () => {
    const original = [...jeu.abonnements];
    trierAbonnements(jeu.abonnements, 'nom', DATE_REFERENCE_DEMO);
    expect(jeu.abonnements).toEqual(original);
  });
});
