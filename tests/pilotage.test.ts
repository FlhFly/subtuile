import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ALERTES_DEFAUT } from '../src/data/preferences';
import { enregistrerParametres, lireParametres } from '../src/data/services/pilotage';
import { creerDexieProvider, type DexieProvider } from '../src/data/storage/dexieProvider';
import { calculerAlertes, cleAlerte, nombreNonLues } from '../src/domain/alertes';
import { convertisseurVers } from '../src/domain/devises';
import { creerAbonnement } from '../src/domain/fabriques';
import {
  budgetConverti,
  dateCleBudget,
  etatBudget,
  ID_PILOTAGE,
  parametresPilotageDefaut,
} from '../src/domain/pilotage';
import { PERIODICITES, SCHEMA_VERSION } from '../src/domain/types';

const JOUR = '2026-09-18';

describe('budget mensuel (EF-70, lot 5) — domaine', () => {
  it('état : marge restante ou dépassement, ratio pour la jauge', () => {
    const sous = etatBudget(120, 150);
    expect(sous).toMatchObject({ budget: 150, total: 120, ecart: -30, depasse: false });
    expect(sous.ratio).toBeCloseTo(0.8);
    const sur = etatBudget(180.5, 150);
    expect(sur).toMatchObject({ ecart: 30.5, depasse: true });
    expect(sur.ratio).toBeCloseTo(1.2033, 3);
    expect(etatBudget(150.004, 150).depasse).toBe(false); // arrondi au centime
    expect(etatBudget(10, 0).ratio).toBe(0);
  });

  it('budget converti dans la devise d’affichage, clé d’alerte mensuelle', () => {
    const convertir = convertisseurVers('EUR', {
      base: 'EUR',
      taux: { EUR: 1, USD: 1.1, GBP: 0.85, CHF: 0.95 },
    });
    expect(budgetConverti(parametresPilotageDefaut(), convertir)).toBeNull();
    expect(budgetConverti({ budgetMensuel: { montant: 100, devise: 'EUR' } }, convertir)).toBe(100);
    expect(budgetConverti({ budgetMensuel: { montant: 110, devise: 'USD' } }, convertir)).toBe(
      convertir(110, 'USD'),
    );
    expect(convertir(110, 'USD')).not.toBe(110);
    expect(dateCleBudget('2026-09-18')).toBe('2026-09-01');
  });

  it('alerte « budget dépassé » : une par mois, marquée lue elle se tait, rien sous le plafond', () => {
    const base = { abonnements: [], moyensPaiement: [], defauts: ALERTES_DEFAUT, jour: JOUR };
    expect(
      calculerAlertes({ ...base, budget: { total: 120, budget: 150, devise: 'EUR' } }),
    ).toEqual([]);
    expect(calculerAlertes({ ...base, budget: null })).toEqual([]);
    const [alerte] = calculerAlertes({
      ...base,
      budget: { total: 180, budget: 150, devise: 'EUR' },
    });
    expect(alerte).toMatchObject({
      type: 'budget',
      niveau: 'warn',
      cle: cleAlerte('budget', 'global', '2026-09-01'),
      budget: 150,
      total: 180,
      depassement: 30,
      devise: 'EUR',
      lue: false,
    });
    const lues = calculerAlertes({
      ...base,
      budget: { total: 180, budget: 150, devise: 'EUR' },
      lues: [alerte!.cle],
    });
    expect(nombreNonLues(lues)).toBe(0);
  });
});

describe('paramètres de pilotage — stockage et sauvegarde (schéma 2)', () => {
  let storage: DexieProvider;
  beforeEach(() => {
    storage = creerDexieProvider(`subtuile-test-pilotage-${Date.now()}-${Math.random()}`);
  });
  afterEach(async () => {
    await storage.supprimerBase();
  });

  it('valeurs par défaut sans enregistrement, mise à jour partielle, relecture', async () => {
    expect(await lireParametres(storage)).toEqual(parametresPilotageDefaut());
    const p = await enregistrerParametres(storage, {
      budgetMensuel: { montant: 150, devise: 'EUR' },
    });
    expect(p.id).toBe(ID_PILOTAGE);
    expect(p.updatedAt).not.toBe('');
    expect((await lireParametres(storage)).budgetMensuel).toEqual({ montant: 150, devise: 'EUR' });
    await enregistrerParametres(storage, { budgetMensuel: null });
    expect((await lireParametres(storage)).budgetMensuel).toBeNull();
  });

  it('export en schéma 2 avec les paramètres ; import de remplacement les restaure ; schéma 1 accepté', async () => {
    await enregistrerParametres(storage, { budgetMensuel: { montant: 200, devise: 'CHF' } });
    const exp = await storage.exporter();
    expect(exp.schemaVersion).toBe(SCHEMA_VERSION);
    expect(SCHEMA_VERSION).toBe(2);
    expect(exp.parametres?.budgetMensuel).toEqual({ montant: 200, devise: 'CHF' });

    await enregistrerParametres(storage, { budgetMensuel: null });
    await storage.importer(exp, 'remplacement');
    expect((await lireParametres(storage)).budgetMensuel).toEqual({ montant: 200, devise: 'CHF' });

    // fichier du schéma 1 : pas de paramètres, ceux en place sont conservés en fusion
    const abo = creerAbonnement(
      { nom: 'Netflix', prix: 13.49, periodicite: PERIODICITES.mensuelle, dateDebut: '2026-01-01' },
      { jour: JOUR },
    );
    await storage.importer(
      {
        app: 'subtuile',
        schemaVersion: 1,
        exporteLe: '2026-09-01T00:00:00.000Z',
        abonnements: [abo],
        moyensPaiement: [],
        servicesPersonnalises: [],
      },
      'fusion',
    );
    expect((await lireParametres(storage)).budgetMensuel).toEqual({ montant: 200, devise: 'CHF' });
    expect((await storage.abonnements.lister()).map((a) => a.nom)).toEqual(['Netflix']);
    await storage.effacerTout();
    expect(await lireParametres(storage)).toEqual(parametresPilotageDefaut());
  });
});
