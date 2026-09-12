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
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
  },
});
