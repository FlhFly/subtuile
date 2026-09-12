import type { ManifestOptions } from 'vite-plugin-pwa';

/**
 * Manifeste de l'application (§5.2) : partagé entre vite.config.ts
 * (vite-plugin-pwa l'écrit dans dist/manifest.webmanifest) et les tests.
 * Chemins relatifs pour rester valables quel que soit le chemin de base du
 * déploiement ; `start_url` et `scope` sont posés par le plugin d'après `base`.
 */
export const MANIFESTE = {
  name: 'Subtuile',
  short_name: 'Subtuile',
  description: 'Suivi d’abonnements et de contrats récurrents, 100 % local et hors ligne.',
  lang: 'fr',
  display: 'standalone',
  background_color: '#f6f2ea',
  theme_color: '#f6f2ea',
  categories: ['finance', 'productivity', 'utilities'],
  icons: [
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    {
      src: 'icons/icon-maskable-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
} satisfies Partial<ManifestOptions>;
