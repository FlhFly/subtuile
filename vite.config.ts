/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { version } from './package.json';
import { MANIFESTE } from './src/pwa/manifest';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    /* PWA (§5.2) : manifeste + service worker précachant tout le bundle (hors ligne intégral).
       Le chemin de base du déploiement vient de la ligne de commande (vite build --base=…). */
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: MANIFESTE,
      /* les icônes sont déjà prises par globPatterns : pas de doublon dans le précache */
      includeManifestIcons: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  build: {
    rollupOptions: {
      output: {
        /* Découpage (v1.0.25) : les bibliothèques et les données qui changent rarement ont leur
           propre fichier, mis en cache indépendamment du code de l'app ; une mise à jour de
           l'app ne fait donc plus retélécharger React, Dexie, date-fns, le catalogue ni les
           dictionnaires. workbox-window reste chargé à la demande par le service worker. */
        manualChunks(id: string) {
          const chemin = id.replace(/\\/g, '/');
          if (chemin.includes('/node_modules/')) {
            if (/\/node_modules\/(react|react-dom|scheduler)\//.test(chemin)) return 'react';
            if (chemin.includes('/node_modules/dexie/')) return 'dexie';
            if (chemin.includes('/node_modules/date-fns/')) return 'date-fns';
            return undefined;
          }
          if (chemin.endsWith('/src/data/refdata/catalogue.json')) return 'catalogue';
          if (/\/src\/i18n\/(fr|en)\.ts$/.test(chemin)) return 'i18n';
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
  },
});
