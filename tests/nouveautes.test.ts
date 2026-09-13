import { describe, expect, it } from 'vitest';
import { version } from '../package.json';
import { NOTES_DE_VERSION, nouveautesNonVues } from '../src/data/notesDeVersion';
import { LANGUES } from '../src/domain/types';

describe('notes de version (Nouveautés)', () => {
  it('la première entrée est la version installée ; versions uniques, dates ISO décroissantes', () => {
    expect(NOTES_DE_VERSION[0]?.version).toBe(version);
    expect(new Set(NOTES_DE_VERSION.map((n) => n.version)).size).toBe(NOTES_DE_VERSION.length);
    const dates = NOTES_DE_VERSION.map((n) => n.date);
    for (const d of dates) expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it('chaque version a ses notes dans les deux langues, concises et lisibles', () => {
    for (const n of NOTES_DE_VERSION) {
      for (const langue of LANGUES) {
        const notes = n.notes[langue];
        expect(notes.length).toBeGreaterThan(0);
        expect(notes.length).toBeLessThanOrEqual(10);
        for (const texte of notes) expect(texte.length).toBeLessThanOrEqual(160);
      }
    }
  });

  it('nouveautés non vues tant que la version installée n’a pas été consultée', () => {
    expect(nouveautesNonVues(null, '1.0.1')).toBe(true);
    expect(nouveautesNonVues('1.0.0', '1.0.1')).toBe(true);
    expect(nouveautesNonVues('1.0.1', '1.0.1')).toBe(false);
  });
});
