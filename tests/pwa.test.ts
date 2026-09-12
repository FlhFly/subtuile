import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { plateformeInstallation } from '../src/pwa/installation';
import { MANIFESTE } from '../src/pwa/manifest';

const SIGNATURE_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Largeur et hauteur lues dans l'en-tête IHDR d'un PNG. */
function taillePng(fichier: string): [number, number] {
  const octets = readFileSync(fichier);
  expect([...octets.subarray(0, 8)]).toEqual(SIGNATURE_PNG);
  const vue = new DataView(octets.buffer, octets.byteOffset, octets.byteLength);
  return [vue.getUint32(16), vue.getUint32(20)];
}

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36';

describe('PWA (§5.2, EF-51)', () => {
  it('manifeste : nom, affichage autonome, icônes 192 / 512 / maskable, chemins relatifs', () => {
    expect(MANIFESTE.name).toBe('Subtuile');
    expect(MANIFESTE.display).toBe('standalone');
    expect(MANIFESTE.theme_color).toBe('#f6f2ea');
    expect(MANIFESTE.icons.map((i) => [i.sizes, 'purpose' in i ? i.purpose : 'any'])).toEqual([
      ['192x192', 'any'],
      ['512x512', 'any'],
      ['512x512', 'maskable'],
    ]);
    for (const icone of MANIFESTE.icons) expect(icone.src.startsWith('/')).toBe(false);
  });

  it('les icônes déclarées existent dans public/ à la bonne taille (scripts/generer-icones.cjs)', () => {
    for (const icone of MANIFESTE.icons) {
      const attendu = Number(icone.sizes.split('x')[0]);
      expect(taillePng(`public/${icone.src}`)).toEqual([attendu, attendu]);
    }
    expect(taillePng('public/icons/apple-touch-icon-180.png')).toEqual([180, 180]);
    expect(existsSync('public/favicon.svg')).toBe(true);
  });

  it('index.html référence le favicon, l’icône iOS et la couleur de thème', () => {
    const html = readFileSync('index.html', 'utf8');
    expect(html).toContain('href="favicon.svg"');
    expect(html).toContain('icons/apple-touch-icon-180.png');
    expect(html).toContain('name="theme-color"');
  });

  it('plateformeInstallation : autonome, iPhone, iPad (Mac tactile), navigateur', () => {
    expect(plateformeInstallation(IPHONE, false)).toBe('ios');
    expect(plateformeInstallation(MAC, false, 5)).toBe('ios'); // iPadOS se présente en Mac
    expect(plateformeInstallation(MAC, false, 0)).toBe('navigateur');
    expect(plateformeInstallation(ANDROID, false)).toBe('navigateur');
    expect(plateformeInstallation(IPHONE, true)).toBe('installee');
    expect(plateformeInstallation(ANDROID, true)).toBe('installee');
  });
});
