import { describe, expect, it } from 'vitest';
import { decrireAppareil, lienRetour } from '../src/domain/retours';

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const IPAD_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36';
const WINDOWS_EDGE =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36 Edg/128.0';

describe('retours utilisateurs par e-mail', () => {
  it('lien mailto avec sujet et corps encodés (accents, retours à la ligne, esperluette)', () => {
    const lien = lienRetour('retours@example.org', '[Subtuile 1.0.5] Bug : ', 'Étape 1 & 2\n—\nfr');
    expect(lien.startsWith('mailto:retours@example.org?subject=')).toBe(true);
    const url = new URL(lien);
    expect(url.searchParams.get('subject')).toBe('[Subtuile 1.0.5] Bug : ');
    expect(url.searchParams.get('body')).toBe('Étape 1 & 2\n—\nfr');
    expect(lien).not.toContain('\n');
  });

  it('décrit appareil et navigateur en clair', () => {
    expect(decrireAppareil(IPHONE)).toBe('iPhone · Safari');
    expect(decrireAppareil(IPAD_MAC, 5)).toBe('iPad · Safari');
    expect(decrireAppareil(IPAD_MAC, 0)).toBe('Mac · Safari');
    expect(decrireAppareil(ANDROID)).toBe('Android · Chrome');
    expect(decrireAppareil(WINDOWS_EDGE)).toBe('Windows · Edge');
    expect(decrireAppareil('Inconnu/1.0')).toBe('Autre · navigateur inconnu');
  });
});
