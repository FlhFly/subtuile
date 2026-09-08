import { describe, expect, it } from 'vitest';
import App from '../src/App';

/**
 * Test de fumée de l'outillage (étape 1 du lot 1).
 * Les tests du moteur de dates (tests/dates.test.ts) arrivent à l'étape 2.
 */
describe('socle', () => {
  it('expose le composant racine', () => {
    expect(typeof App).toBe('function');
  });
});
