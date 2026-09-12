import { describe, expect, it } from 'vitest';
import { enregistrerOrdre } from '../src/data/services/abonnements';
import { creerDexieProvider } from '../src/data/storage/dexieProvider';
import { creerAbonnement } from '../src/domain/fabriques';
import { appliquerOrdre, deplacer, ordonnerSelon } from '../src/domain/ordre';
import { trierAbonnements } from '../src/domain/tri';
import { PERIODICITES, type Abonnement } from '../src/domain/types';

const JOUR = '2026-09-12';

function abo(id: string, dateDebut: string, champs: Partial<Abonnement> = {}): Abonnement {
  return creerAbonnement(
    { id, nom: id, prix: 10, periodicite: PERIODICITES.mensuelle, dateDebut, ...champs },
    { jour: JOUR },
  );
}

/* Par échéance : a (J-8), c (J-16), b (J-23), d archivé (sans échéance) */
const a = abo('a', '2026-01-20');
const b = abo('b', '2026-01-05');
const c = abo('c', '2026-01-28');
const d = abo('d', '2026-01-01', { statut: { type: 'archive' } });
const ids = (liste: readonly Abonnement[]) => liste.map((x) => x.id);
const positions = (liste: readonly Abonnement[]) =>
  [...liste].sort((x, y) => x.id.localeCompare(y.id)).map((x) => [x.id, x.ordre]);

describe('ordre personnalisé (EF-14)', () => {
  it('deplacer : copie avec l’élément déplacé, indices hors bornes ignorés', () => {
    const liste = ['a', 'b', 'c', 'd'];
    expect(deplacer(liste, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(deplacer(liste, 3, 0)).toEqual(['d', 'a', 'b', 'c']);
    expect(deplacer(liste, 1, 1)).toEqual(liste);
    expect(deplacer(liste, 5, 0)).toEqual(liste);
    expect(deplacer(liste, 0, -1)).toEqual(liste);
    expect(liste).toEqual(['a', 'b', 'c', 'd']);
  });

  it('ordonnerSelon : suit la suite d’identifiants, les absents ferment la marche', () => {
    const liste = [a, b, c, d];
    expect(ids(ordonnerSelon(liste, ['c', 'a']))).toEqual(['c', 'a', 'b', 'd']);
    expect(ids(ordonnerSelon(liste, []))).toEqual(['a', 'b', 'c', 'd']);
    expect(ids(ordonnerSelon(liste, ['zz', 'd', 'b']))).toEqual(['d', 'b', 'a', 'c']);
  });

  it('sans ordre enregistré, le tri personnalisé retombe sur l’échéance', () => {
    expect(ids(trierAbonnements([a, b, c, d], 'personnalise', JOUR))).toEqual(['a', 'c', 'b', 'd']);
  });

  it('appliquerOrdre : premier classement, les tuiles visibles prennent les places 0..n', () => {
    const resultat = appliquerOrdre([a, b, c, d], ['c', 'a', 'b'], JOUR);
    expect(positions(resultat)).toEqual([
      ['a', 1],
      ['b', 2],
      ['c', 0],
      ['d', 3],
    ]);
    expect(ids(trierAbonnements(resultat, 'personnalise', JOUR))).toEqual(['c', 'a', 'b', 'd']);
    // la liste garde l'ordre reçu ; tout a changé (ordre null → position)
    expect(ids(resultat)).toEqual(['a', 'b', 'c', 'd']);
    expect(resultat.every((x, i) => x !== [a, b, c, d][i])).toBe(true);
  });

  it('appliquerOrdre : une liste filtrée ne déplace que les tuiles visibles', () => {
    const classe = appliquerOrdre([a, b, c, d], ['c', 'a', 'b'], JOUR); // c0 a1 b2 d3
    const resultat = appliquerOrdre(classe, ['b', 'c'], JOUR); // a et d masqués
    expect(positions(resultat)).toEqual([
      ['a', 1],
      ['b', 0],
      ['c', 2],
      ['d', 3],
    ]);
    expect(resultat[0]).toBe(classe[0]); // a inchangé : même référence
    expect(resultat[3]).toBe(classe[3]); // d inchangé
    expect(ids(trierAbonnements(resultat, 'personnalise', JOUR))).toEqual(['b', 'a', 'c', 'd']);
  });

  it('appliquerOrdre : identifiants inconnus ou en double ignorés ; sans changement, mêmes références', () => {
    const classe = appliquerOrdre([a, b, c, d], ['c', 'a', 'b'], JOUR);
    const resultat = appliquerOrdre(classe, ['zz', 'c', 'a', 'a', 'b'], JOUR);
    expect(resultat.every((x, i) => x === classe[i])).toBe(true);
  });

  it('un abonnement jamais classé se place en fin de liste puis reçoit une position', () => {
    const classe = appliquerOrdre([a, b, c], ['c', 'a', 'b'], JOUR);
    const e = abo('e', '2026-01-10');
    expect(ids(trierAbonnements([...classe, e], 'personnalise', JOUR))).toEqual([
      'c',
      'a',
      'b',
      'e',
    ]);
    const resultat = appliquerOrdre([...classe, e], ['e', 'c', 'a', 'b'], JOUR);
    expect(positions(resultat)).toEqual([
      ['a', 2],
      ['b', 3],
      ['c', 1],
      ['e', 0],
    ]);
  });

  it('enregistrerOrdre persiste les positions modifiées et rien d’autre', async () => {
    const storage = creerDexieProvider(`subtuile-test-ordre-${Date.now()}-${Math.random()}`);
    try {
      await storage.abonnements.enregistrerPlusieurs([a, b, c]);
      const liste = await storage.abonnements.lister();
      const aJour = await enregistrerOrdre(storage, liste, ['c', 'a', 'b'], JOUR);
      expect(positions(aJour)).toEqual([
        ['a', 1],
        ['b', 2],
        ['c', 0],
      ]);
      const relu = await storage.abonnements.lister();
      expect(ids(trierAbonnements(relu, 'personnalise', JOUR))).toEqual(['c', 'a', 'b']);
      // même ordre redemandé : aucune réécriture (références et updatedAt inchangés)
      const encore = await enregistrerOrdre(storage, relu, ['c', 'a', 'b'], JOUR);
      expect(encore.every((x, i) => x === relu[i])).toBe(true);
      const relu2 = await storage.abonnements.lister();
      expect(positions(relu2)).toEqual(positions(relu));
      expect(relu2.map((x) => x.updatedAt)).toEqual(relu.map((x) => x.updatedAt));
    } finally {
      await storage.supprimerBase();
    }
  });
});
