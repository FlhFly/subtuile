/**
 * Recette du lot 4 (CdC §6) : « Totaux vérifiés à la main sur le jeu de démo ;
 * app installée et fonctionnelle hors ligne ». Rejoue le parcours hors
 * navigateur : jeu de démo chargé dans le stockage, totaux et répartitions
 * recalculés à la main abonnement par abonnement, conversion de devise, export
 * JSON relu puis réimporté dans un second stockage (fusion et remplacement),
 * ordre personnalisé persisté. La partie « hors ligne » est vérifiée par la
 * configuration du service worker (précache complet) et le manifeste ; le
 * reste (installation, coupure réseau) est vérifié à l'écran par FlhFly avant
 * le tag.
 */

import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chargerJeuDemo, DATE_REFERENCE_DEMO, IDS_DEMO } from '../src/data/fixtures/demo';
import { exporterJson, lireExportJson } from '../src/data/importExport';
import { preferencesDefaut } from '../src/data/preferences';
import { TAUX_EMBARQUES } from '../src/data/refdata/RefDataProvider';
import { chargerAbonnementsAJour, enregistrerOrdre } from '../src/data/services/abonnements';
import { creerDexieProvider, type DexieProvider } from '../src/data/storage/dexieProvider';
import { convertisseurVers } from '../src/domain/devises';
import {
  abonnementsPayants,
  previsionnel,
  repartitionParCategorie,
  totaux,
} from '../src/domain/finances';
import { trierAbonnements } from '../src/domain/tri';
import type { Abonnement } from '../src/domain/types';
import { MANIFESTE } from '../src/pwa/manifest';

const JOUR = DATE_REFERENCE_DEMO; // 2026-08-16
/** mois moyen (365,25 / 12), même convention que le moteur de dates */
const JOURS_PAR_MOIS = 30.4375;
const ids = IDS_DEMO.abonnements;

/* Coût mensuel normalisé de chaque abonnement payant du jeu de démo, à la main */
const MENSUEL_A_LA_MAIN = {
  strava: 79.99 / 12, // annuel
  netflix: 6.75, // part payée d'un abonnement partagé à 13,49
  prime: 69.9 / 12, // annuel
  claude: 21.6,
  chatgpt: 23,
  basicFit: 24.99,
  lycamobile: (9.99 * JOURS_PAR_MOIS) / 28, // toutes les 4 semaines
  edf: 64, // montant estimé
};
const TOTAL_A_LA_MAIN = Object.values(MENSUEL_A_LA_MAIN).reduce((s, v) => s + v, 0);

let storage: DexieProvider;
let abos: Abonnement[];
const nonArchives = (liste: Abonnement[]) => liste.filter((a) => a.statut.type !== 'archive');

beforeAll(async () => {
  storage = creerDexieProvider('subtuile-recette-lot4');
  await chargerJeuDemo(storage, JOUR);
  abos = await chargerAbonnementsAJour(storage, JOUR);
});

afterAll(async () => {
  await storage.supprimerBase();
});

describe('recette lot 4 — totaux du jeu de démo vérifiés à la main', () => {
  it('total mensuel normalisé : somme explicite des huit abonnements payants (163,69 €)', () => {
    const t = totaux(abos, JOUR);
    expect(TOTAL_A_LA_MAIN).toBeCloseTo(163.69, 2);
    expect(t.mensuel).toBeCloseTo(TOTAL_A_LA_MAIN, 6);
    expect(t.annuel).toBeCloseTo(TOTAL_A_LA_MAIN * 12, 6);
    expect(t.nbPayants).toBe(8);
    expect(t.estime).toBe(true); // EDF est un montant estimé
    // exclus : Disney+ (essai en cours), Canal+ (résilié), Spotify (pause), Dropbox (archivé),
    // Claude API (à l'usage)
    const payants = new Set(abonnementsPayants(abos, JOUR).map((a) => a.id));
    for (const id of [ids.disney, ids.canal, ids.spotify, ids.dropbox, ids.claudeApi]) {
      expect(payants.has(id)).toBe(false);
    }
  });

  it('répartition par catégorie : vie courante, IA, sport, streaming, à la main', () => {
    const m = MENSUEL_A_LA_MAIN;
    const attendu = {
      vie_courante: m.edf + m.lycamobile,
      ia: m.claude + m.chatgpt,
      sport: m.basicFit + m.strava,
      streaming: m.netflix + m.prime,
    };
    const cats = repartitionParCategorie(abos, JOUR);
    expect(cats.map((c) => c.categorie)).toEqual(['vie_courante', 'ia', 'sport', 'streaming']);
    for (const c of cats) {
      expect(c.mensuel).toBeCloseTo(attendu[c.categorie as keyof typeof attendu], 6);
      expect(c.part).toBeCloseTo(c.mensuel / TOTAL_A_LA_MAIN, 6);
    }
    expect(cats.reduce((s, c) => s + c.part, 0)).toBeCloseTo(1, 6);
  });

  it('prévisionnel : août 2026 avec le renouvellement annuel Strava, septembre avec Prime', () => {
    const p = previsionnel(abos, JOUR);
    // août : Strava 79,99 + Netflix 6,75 + Claude Pro 21,60 + ChatGPT 23 + Disney+ 11,99 (fin
    // d'essai) + Basic-Fit 24,99 + Lycamobile 9,99 + EDF 64
    const aout = 79.99 + 6.75 + 21.6 + 23 + 11.99 + 24.99 + 9.99 + 64;
    expect(p.mois[0]).toMatchObject({ mois: '2026-08' });
    expect(p.mois[0]?.montant).toBeCloseTo(aout, 6);
    // septembre : Netflix, Prime 69,90, Claude Pro, ChatGPT, Disney+, Basic-Fit, Lycamobile × 2, EDF
    const septembre = 6.75 + 69.9 + 21.6 + 23 + 11.99 + 24.99 + 9.99 * 2 + 64;
    expect(p.mois[1]).toMatchObject({ mois: '2026-09', nb: 9 });
    expect(p.mois[1]?.montant).toBeCloseTo(septembre, 6);
    expect(p.mois).toHaveLength(12);
  });

  it('devise d’affichage en dollars : chaque montant converti au taux indicatif', () => {
    const taux = TAUX_EMBARQUES.data;
    const t = totaux(abos, JOUR, convertisseurVers('USD', taux));
    expect(t.mensuel).toBeCloseTo(TOTAL_A_LA_MAIN * taux.taux.USD, 6);
  });
});

describe('recette lot 4 — données : export relu, réimporté, ordre personnalisé', () => {
  it('export JSON → aperçu → import fusion puis remplacement dans un second stockage', async () => {
    const texte = await exporterJson(storage);
    const apercu = lireExportJson(texte, JOUR);
    expect(apercu.nbAbonnements).toBe(13);
    expect(apercu.nbMoyensPaiement).toBe(4);
    const second = creerDexieProvider('subtuile-recette-lot4-import');
    try {
      const fusion = await second.importer(apercu.donnees, 'fusion');
      expect(fusion.abonnements).toBe(13);
      const relus = await chargerAbonnementsAJour(second, JOUR);
      expect(totaux(relus, JOUR).mensuel).toBeCloseTo(TOTAL_A_LA_MAIN, 6);
      const remplacement = await second.importer(apercu.donnees, 'remplacement');
      expect(remplacement.abonnements).toBe(13);
      expect(await second.abonnements.lister()).toHaveLength(13);
    } finally {
      await second.supprimerBase();
    }
  });

  it('ordre personnalisé enregistré puis relu depuis le stockage', async () => {
    const parEcheance = trierAbonnements(nonArchives(abos), 'echeance', JOUR).map((a) => a.id);
    const inverse = [...parEcheance].reverse();
    await enregistrerOrdre(storage, abos, inverse, JOUR);
    const relus = await chargerAbonnementsAJour(storage, JOUR);
    expect(trierAbonnements(nonArchives(relus), 'personnalise', JOUR).map((a) => a.id)).toEqual(
      inverse,
    );
  });
});

describe('recette lot 4 — installable et hors ligne (§5.2), première ouverture', () => {
  it('service worker : précache complet du bundle, repli sur index.html ; manifeste autonome', () => {
    const config = readFileSync('vite.config.ts', 'utf8');
    expect(config).toContain('VitePWA(');
    expect(config).toContain("globPatterns: ['**/*.{js,css,html,svg,png,woff2}']");
    expect(config).toContain("navigateFallback: 'index.html'");
    expect(MANIFESTE.display).toBe('standalone');
    expect(MANIFESTE.icons).toHaveLength(3);
  });

  it('onboarding proposé à la première ouverture', () => {
    expect(preferencesDefaut('fr').onboardingVu).toBe(false);
  });
});
