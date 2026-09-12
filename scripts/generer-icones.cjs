#!/usr/bin/env node
/**
 * Génère les icônes PWA de Subtuile (public/icons/) sans dépendance : PNG
 * encodés à la main (zlib de Node), formes rastérisées avec suréchantillonnage.
 * Motif : quatre tuiles arrondies (couleurs des tokens) sur fond encre.
 *
 *   node scripts/generer-icones.cjs
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/* Couleurs des tokens (src/ui/theme/tokens.css) */
const INK = [23, 19, 13];
const BG = [246, 242, 234];
const SAND = [236, 229, 216];
const SAND2 = [223, 214, 195];
const OK = [30, 125, 58];

/** Rectangle arrondi en coordonnées unitaires (0..1). */
const rect = (x, y, w, h, r, couleur) => ({ x, y, w, h, r, couleur });

/** Quatre tuiles centrées : `marge` de bord, `taille` de tuile, `ecart` entre tuiles. */
function tuiles(marge, taille, ecart) {
  const r = taille * 0.24;
  const x2 = marge + taille + ecart;
  return [
    rect(marge, marge, taille, taille, r, BG),
    rect(x2, marge, taille, taille, r, SAND2),
    rect(marge, x2, taille, taille, r, SAND),
    rect(x2, x2, taille, taille, r, OK),
  ];
}

const VARIANTES = {
  /* icône classique : coins arrondis sur fond transparent */
  'icon-192.png': { taille: 192, formes: [rect(0, 0, 1, 1, 0.2, INK), ...tuiles(0.17, 0.3, 0.06)] },
  'icon-512.png': { taille: 512, formes: [rect(0, 0, 1, 1, 0.2, INK), ...tuiles(0.17, 0.3, 0.06)] },
  /* maskable : plein cadre, motif dans la zone sûre (cercle central de 80 %) */
  'icon-maskable-512.png': {
    taille: 512,
    formes: [rect(0, 0, 1, 1, 0, INK), ...tuiles(0.25, 0.23, 0.04)],
  },
  /* iOS arrondit lui-même : carré opaque */
  'apple-touch-icon-180.png': {
    taille: 180,
    formes: [rect(0, 0, 1, 1, 0, INK), ...tuiles(0.17, 0.3, 0.06)],
  },
};

/** Distance signée à un rectangle arrondi (négative à l'intérieur). */
function distance(forme, px, py) {
  const cx = forme.x + forme.w / 2;
  const cy = forme.y + forme.h / 2;
  const qx = Math.abs(px - cx) - (forme.w / 2 - forme.r);
  const qy = Math.abs(py - cy) - (forme.h / 2 - forme.r);
  const ex = Math.max(qx, 0);
  const ey = Math.max(qy, 0);
  return Math.hypot(ex, ey) + Math.min(Math.max(qx, qy), 0) - forme.r;
}

const SOUS_ECHANTILLONS = 4;

/** Rastérise les formes (la dernière au-dessus) en RGBA 8 bits. */
function rasteriser(taille, formes) {
  const pixels = Buffer.alloc(taille * taille * 4);
  const n = SOUS_ECHANTILLONS;
  for (let y = 0; y < taille; y++) {
    for (let x = 0; x < taille; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < n; sy++) {
        for (let sx = 0; sx < n; sx++) {
          const px = (x + (sx + 0.5) / n) / taille;
          const py = (y + (sy + 0.5) / n) / taille;
          for (let i = formes.length - 1; i >= 0; i--) {
            if (distance(formes[i], px, py) <= 0) {
              const [cr, cg, cb] = formes[i].couleur;
              r += cr;
              g += cg;
              b += cb;
              a += 255;
              break;
            }
          }
        }
      }
      const echantillons = n * n;
      const o = (y * taille + x) * 4;
      const couverts = a / 255;
      /* couleur moyenne des seuls échantillons couverts, alpha = couverture */
      pixels[o] = couverts ? Math.round(r / couverts) : 0;
      pixels[o + 1] = couverts ? Math.round(g / couverts) : 0;
      pixels[o + 2] = couverts ? Math.round(b / couverts) : 0;
      pixels[o + 3] = Math.round(a / echantillons);
    }
  }
  return pixels;
}

/* ----- encodage PNG ----- */
const TABLE_CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});

function crc32(buffer) {
  let c = -1;
  for (const octet of buffer) c = TABLE_CRC[(c ^ octet) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function bloc(type, donnees) {
  const longueur = Buffer.alloc(4);
  longueur.writeUInt32BE(donnees.length);
  const corps = Buffer.concat([Buffer.from(type, 'ascii'), donnees]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corps));
  return Buffer.concat([longueur, corps, crc]);
}

function encoderPng(taille, pixels) {
  const ligne = taille * 4;
  const brut = Buffer.alloc((ligne + 1) * taille);
  for (let y = 0; y < taille; y++) {
    brut[y * (ligne + 1)] = 0; // filtre « None »
    pixels.copy(brut, y * (ligne + 1) + 1, y * ligne, (y + 1) * ligne);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(taille, 0);
  ihdr.writeUInt32BE(taille, 4);
  ihdr[8] = 8; // profondeur
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloc('IHDR', ihdr),
    bloc('IDAT', zlib.deflateSync(brut, { level: 9 })),
    bloc('IEND', Buffer.alloc(0)),
  ]);
}

const dossier = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(dossier, { recursive: true });
for (const [nom, { taille, formes }] of Object.entries(VARIANTES)) {
  const fichier = path.join(dossier, nom);
  fs.writeFileSync(fichier, encoderPng(taille, rasteriser(taille, formes)));
  console.log('écrit', path.relative(process.cwd(), fichier));
}
