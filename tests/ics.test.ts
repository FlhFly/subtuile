import { describe, expect, it } from 'vitest';
import { echapperTexteIcs, genererIcs, nomFichierIcs, plierLigneIcs } from '../src/domain/ics';

const OPTIONS = { horodatage: '2026-09-12T08:30:15.123Z', libelleAlarme: 'Rappel Subtuile' };

describe('export ICS (EF-32)', () => {
  it('fichier complet : en-tête, événement journée entière, alarme J-3, fin CRLF', () => {
    const ics = genererIcs(
      [
        {
          uid: 'renouvellement:abo-1:2026-09-14',
          date: '2026-09-14',
          titre: 'Netflix — renouvellement',
          description: '13,49 € / mois',
          alarmeJours: 3,
        },
      ],
      OPTIONS,
    );
    const lignes = ics.split('\r\n');
    expect(ics.endsWith('\r\n')).toBe(true);
    expect(ics).not.toMatch(/[^\r]\n/);
    expect(lignes.slice(0, 5)).toEqual([
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Subtuile//Subtuile//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ]);
    expect(lignes).toContain('BEGIN:VEVENT');
    expect(lignes).toContain('UID:renouvellement:abo-1:2026-09-14@subtuile');
    expect(lignes).toContain('DTSTAMP:20260912T083015Z');
    expect(lignes).toContain('DTSTART;VALUE=DATE:20260914');
    expect(lignes).toContain('DTEND;VALUE=DATE:20260915');
    expect(lignes).toContain('SUMMARY:Netflix — renouvellement');
    expect(lignes).toContain('DESCRIPTION:13\\,49 € / mois');
    expect(lignes).toContain('BEGIN:VALARM');
    expect(lignes).toContain('ACTION:DISPLAY');
    expect(lignes).toContain('DESCRIPTION:Rappel Subtuile');
    expect(lignes).toContain('TRIGGER;VALUE=DURATION:-P3D');
    expect(lignes.at(-2)).toBe('END:VCALENDAR');
  });

  it('plusieurs rappels, alarme le jour même à 9 h, sans alarme, sans description, fin de mois', () => {
    const ics = genererIcs(
      [
        {
          uid: 'a',
          date: '2026-09-30',
          titre: 'Fin de mois',
          description: '',
          alarmeJours: 0,
        },
        { uid: 'b', date: '2026-12-31', titre: 'Fin d’année', description: 'x', alarmeJours: null },
      ],
      OPTIONS,
    );
    const lignes = ics.split('\r\n');
    expect(lignes.filter((l) => l === 'BEGIN:VEVENT')).toHaveLength(2);
    expect(lignes).toContain('DTEND;VALUE=DATE:20261001');
    expect(lignes).toContain('DTEND;VALUE=DATE:20270101');
    expect(lignes).toContain('TRIGGER;VALUE=DURATION:PT9H');
    expect(lignes.filter((l) => l === 'BEGIN:VALARM')).toHaveLength(1);
    expect(lignes.filter((l) => l.startsWith('DESCRIPTION:'))).toHaveLength(2); // alarme + « x »
  });

  it('échappement et pliage des lignes longues (75 octets, continuation par un espace)', () => {
    expect(echapperTexteIcs('a;b,c\\d\nfin')).toBe('a\\;b\\,c\\\\d\\nfin');
    const longue = `SUMMARY:${'é'.repeat(60)}`;
    const morceaux = plierLigneIcs(longue);
    expect(morceaux.length).toBeGreaterThan(1);
    expect(morceaux.slice(1).every((m) => m.startsWith(' '))).toBe(true);
    const encodeur = new TextEncoder();
    expect(morceaux.every((m) => encodeur.encode(m).length <= 75)).toBe(true);
    expect(morceaux.map((m, i) => (i === 0 ? m : m.slice(1))).join('')).toBe(longue);
    expect(plierLigneIcs('court')).toEqual(['court']);
    const ics = genererIcs(
      [
        {
          uid: 'u',
          date: '2026-09-14',
          titre: 'T'.repeat(120),
          description: '',
          alarmeJours: null,
        },
      ],
      OPTIONS,
    );
    expect(ics.split('\r\n').every((l) => encodeur.encode(l).length <= 75)).toBe(true);
  });

  it('nom de fichier sûr', () => {
    expect(nomFichierIcs('Netflix')).toBe('netflix.ics');
    expect(nomFichierIcs('EDF Élec (foyer)')).toBe('edf-elec-foyer.ics');
    expect(nomFichierIcs('  ')).toBe('rappel.ics');
    expect(nomFichierIcs('Subtuile — échéances')).toBe('subtuile-echeances.ics');
  });
});
