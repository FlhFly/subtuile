import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CONFIDENTIALITE_MAJ,
  HEBERGEUR,
  sectionsConfidentialite,
} from '../src/data/confidentialite';
import { ADRESSE_CONTACT } from '../src/data/contact';
import { LANGUES } from '../src/domain/types';

describe('page Confidentialité et mentions légales (§7, revue RGPD)', () => {
  it('même structure dans les deux langues : huit sections, paragraphes lisibles, liens sortants en https', () => {
    const fr = sectionsConfidentialite('fr');
    const en = sectionsConfidentialite('en');
    expect(fr).toHaveLength(8);
    expect(en).toHaveLength(8);
    for (const langue of LANGUES) {
      for (const s of sectionsConfidentialite(langue)) {
        expect(s.titre.trim()).not.toBe('');
        expect(s.paragraphes.length).toBeGreaterThan(0);
        for (const p of s.paragraphes) {
          expect(p.trim()).not.toBe('');
          expect(p.length).toBeLessThanOrEqual(400);
        }
        for (const l of s.liens ?? []) expect(l.url).toMatch(/^https:\/\//);
      }
    }
    expect(fr.map((s) => s.liens?.length ?? 0)).toEqual(en.map((s) => s.liens?.length ?? 0));
  });

  it('nomme le contact, l’hébergeur, la purge à 30 jours et les exports en clair', () => {
    for (const langue of LANGUES) {
      const texte = sectionsConfidentialite(langue)
        .flatMap((s) => [s.titre, ...s.paragraphes])
        .join('\n');
      expect(texte).toContain(ADRESSE_CONTACT);
      expect(texte).toContain(HEBERGEUR);
      expect(texte).toContain('30');
      expect(texte).toMatch(/AGPL-3\.0/);
    }
    expect(CONFIDENTIALITE_MAJ).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('PRIVACY.md reflète la page : contact, hébergeur, même date de révision', () => {
    const md = readFileSync('PRIVACY.md', 'utf8');
    expect(md).toContain(ADRESSE_CONTACT);
    expect(md).toContain('GitHub Pages');
    expect(md).toContain(CONFIDENTIALITE_MAJ);
  });
});
