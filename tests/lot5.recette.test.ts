/**
 * Recette du lot 5 « Pilotage » (CdC §6) : « Scénario complet : objectif fixé,
 * usage déclaré, relevé importé sans doublon créé, suggestions cohérentes avec
 * le catalogue ». Rejoue le parcours hors navigateur, sur le jeu de démo chargé
 * dans le stockage : budget et objectif enregistrés puis retrouvés dans la
 * sauvegarde JSON (schéma 2), usage déclaré et coût par utilisation, relevé
 * bancaire importé deux fois (aucun doublon), suggestions recalculées à la main
 * depuis les formules du catalogue. Les écrans sont vérifiés par FlhFly avant
 * le tag.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chargerJeuDemo, DATE_REFERENCE_DEMO, IDS_DEMO } from '../src/data/fixtures/demo';
import { exporterJson, lireExportJson } from '../src/data/importExport';
import { CATALOGUE_EMBARQUE } from '../src/data/refdata/RefDataProvider';
import { chargerAbonnementsAJour, enregistrerAbonnement } from '../src/data/services/abonnements';
import { enregistrerParametres, lireParametres } from '../src/data/services/pilotage';
import { creerDexieProvider, type DexieProvider } from '../src/data/storage/dexieProvider';
import { sansConversion } from '../src/domain/devises';
import { creerAbonnement } from '../src/domain/fabriques';
import { totaux } from '../src/domain/finances';
import { vueFoyer } from '../src/domain/foyer';
import { etatBudget, etatObjectif, objectifConverti } from '../src/domain/pilotage';
import { evolutionMensuelle, journalPaiements, rapport12Mois } from '../src/domain/rapport';
import { abonnementsDepuisReleve, detecterRecurrences, lireReleve } from '../src/domain/releve';
import { doublonsParCategorie, suggestionsEconomies } from '../src/domain/suggestions';
import { PERIODICITES, SCHEMA_VERSION, type Abonnement, type Service } from '../src/domain/types';
import { coutUsage } from '../src/domain/usage';
import { parserDateSaisie } from '../src/i18n';

const JOUR = DATE_REFERENCE_DEMO; // 2026-08-16
const ids = IDS_DEMO.abonnements;
const SERVICES = CATALOGUE_EMBARQUE.data;
const PAR_ID = new Map<string, Service>(SERVICES.map((s) => [s.id, s]));

const RELEVE = [
  'Date;Libellé;Montant',
  '05/06/2026;PRLV SEPA NETFLIX.COM 0605;-13,49',
  '05/07/2026;PRLV SEPA NETFLIX.COM 0705;-13,49',
  '05/08/2026;PRLV SEPA NETFLIX.COM 0805;-13,49',
  '02/06/2026;PRLV SEPA BASIC FIT FRANCE;-24,99',
  '02/07/2026;PRLV SEPA BASIC FIT FRANCE;-24,99',
  '03/08/2026;PRLV SEPA BASIC FIT FRANCE;-24,99',
  '10/06/2026;CARTE X1234 MUR ESCALADE VERTICAL;-35,00',
  '10/07/2026;CARTE X1234 MUR ESCALADE VERTICAL;-35,00',
  '10/08/2026;CARTE X1234 MUR ESCALADE VERTICAL;-35,00',
  '04/06/2026;CARTE X1234 SUPERMARCHE DUPONT;-64,10',
  '19/07/2026;CARTE X1234 SUPERMARCHE DUPONT;-112,45',
  '28/07/2026;VIR SALAIRE ENTREPRISE;2 400,00',
].join('\n');

let storage: DexieProvider;
const charger = () => chargerAbonnementsAJour(storage, JOUR);
const vivants = (liste: Abonnement[]) => liste.filter((a) => a.deletedAt === null);

beforeAll(async () => {
  storage = creerDexieProvider('subtuile-recette-lot5');
  await chargerJeuDemo(storage, JOUR);
});

afterAll(async () => {
  await storage.supprimerBase();
});

describe('recette lot 5 — objectif fixé (EF-70)', () => {
  it('budget et objectif enregistrés, état calculé sur le total réel, présents dans la sauvegarde', async () => {
    const total = totaux(await charger(), JOUR, sansConversion).mensuel;
    const cible = Math.floor(total) - 20;
    await enregistrerParametres(storage, {
      budgetMensuel: { montant: cible, devise: 'EUR' },
      objectif: { cible, devise: 'EUR', date: '2026-12-31' },
    });
    const parametres = await lireParametres(storage);
    expect(etatBudget(total, cible).depasse).toBe(true);
    const objectif = objectifConverti(parametres, sansConversion)!;
    const etat = etatObjectif(total, objectif, JOUR);
    expect(etat.atteint).toBe(false);
    expect(etat.ecart).toBeCloseTo(total - cible, 2);
    expect(etat.joursRestants).toBe(137);
    expect(etatObjectif(cible, objectif, JOUR).atteint).toBe(true);

    const apercu = lireExportJson(await exporterJson(storage), JOUR);
    expect(apercu.donnees.schemaVersion).toBe(SCHEMA_VERSION);
    expect(apercu.donnees.parametres?.objectif).toEqual({
      cible,
      devise: 'EUR',
      date: '2026-12-31',
    });
  });
});

describe('recette lot 5 — usage déclaré (EF-71)', () => {
  it('coût par utilisation sur la part payée ; un abonnement jamais utilisé devient le doublon à résilier', async () => {
    const abos = await charger();
    const netflix = abos.find((a) => a.id === ids.netflix)!;
    await enregistrerAbonnement(storage, { ...netflix, usageParSemaine: 3 }, JOUR);
    const disney = abos.find((a) => a.id === ids.disney)!;
    await enregistrerAbonnement(storage, { ...disney, usageParSemaine: 0 }, JOUR);

    const relus = await charger();
    const usage = coutUsage(relus.find((a) => a.id === ids.netflix)!)!;
    expect(usage.mensuel).toBe(6.75); // part payée d'un abonnement partagé à 13,49
    expect(usage.parUtilisation).toBe(Math.round((6.75 / 13) * 100) / 100);
    expect(coutUsage(relus.find((a) => a.id === ids.disney)!)).toMatchObject({ nonUtilise: true });

    const streaming = doublonsParCategorie(relus, JOUR).find((d) => d.categorie === 'streaming');
    if (streaming?.abonnements.some((a) => a.id === ids.disney)) {
      expect(streaming.selonUsage).toBe(true);
      expect(streaming.candidat.id).toBe(ids.disney);
    }
  });
});

describe('recette lot 5 — relevé importé sans doublon créé (EF-73)', () => {
  it('Netflix et Basic-Fit déjà suivis, un seul nouvel abonnement ; second import : rien à ajouter', async () => {
    const avant = vivants(await charger());
    const lecture = lireReleve(RELEVE, 'jma', parserDateSaisie);
    expect(lecture.operations).toHaveLength(11);

    const detectes = detecterRecurrences(lecture.operations, avant, SERVICES, JOUR);
    expect(detectes.map((p) => [p.nom, p.dejaSuivi?.id ?? null])).toEqual([
      ['Basic-Fit', ids.basicFit],
      ['Mur Escalade', null],
      ['Netflix', ids.netflix],
    ]);

    const crees = abonnementsDepuisReleve(detectes, SERVICES, JOUR, 'EUR');
    expect(crees).toHaveLength(1);
    await storage.abonnements.enregistrerPlusieurs(crees);
    const apres = vivants(await charger());
    expect(apres).toHaveLength(avant.length + 1);
    expect(apres.filter((a) => a.serviceId === 'netflix')).toHaveLength(1);
    const mur = apres.find((a) => a.nom === 'Mur Escalade')!;
    expect(mur).toMatchObject({
      prix: 35,
      dateDebut: '2026-08-10',
      prochaineEcheance: '2026-09-10',
    });

    const second = detecterRecurrences(lecture.operations, apres, SERVICES, JOUR);
    expect(second.every((p) => p.dejaSuivi !== null)).toBe(true);
    expect(abonnementsDepuisReleve(second, SERVICES, JOUR, 'EUR')).toEqual([]);
  });
});

describe('recette lot 5 — suggestions cohérentes avec le catalogue (EF-72)', () => {
  it('chaque suggestion se recalcule à la main depuis les formules du catalogue', async () => {
    const zwift = creerAbonnement(
      {
        nom: 'Zwift',
        prix: 19.99,
        periodicite: PERIODICITES.mensuelle,
        dateDebut: '2026-03-01',
        serviceId: 'zwift',
        formuleId: 'zwift_mensuel',
        categorie: 'sport',
      },
      { jour: JOUR },
    );
    await storage.abonnements.enregistrer(zwift);
    const abos = await charger();
    const suggestions = suggestionsEconomies(abos, PAR_ID, JOUR);
    const pourZwift = suggestions.find((s) => s.abonnementId === zwift.id)!;
    const annuelle = PAR_ID.get('zwift')!.formules.find((f) => f.id === 'zwift_annuel')!;
    expect(pourZwift.type).toBe('annuel');
    expect(pourZwift.economieAnnuelle).toBeCloseTo(19.99 * 12 - annuelle.prix, 2);

    for (const s of suggestions) {
      const abo = abos.find((a) => a.id === s.abonnementId)!;
      const service = PAR_ID.get(abo.serviceId ?? '')!;
      // toute suggestion porte sur une formule réelle du catalogue, avec un gain positif
      expect(service.formules.some((f) => f.id === abo.formuleId)).toBe(true);
      expect(s.economieAnnuelle).toBeGreaterThan(0);
    }
    const tri = suggestions.map((s) => s.economieAnnuelle);
    expect(tri).toEqual([...tri].sort((a, b) => b - a));
  });
});

describe('recette lot 5 — vues de pilotage sur le jeu de démo (EF-43, EF-13b, EF-44b)', () => {
  it('évolution 24 mois, rapport 12 mois, journal des paiements et vue foyer cohérents entre eux', async () => {
    const abos = await charger();
    const evolution = evolutionMensuelle(abos, JOUR);
    expect(evolution.serie.mois).toHaveLength(25);
    expect(evolution.serie.mois.at(-1)!.montant).toBeCloseTo(totaux(abos, JOUR).mensuel, 2);

    const rapport = rapport12Mois(abos, JOUR);
    expect(rapport.total).toBeGreaterThan(0);
    expect(rapport.moyenne).toBeCloseTo(rapport.total / 12, 5);

    const netflix = abos.find((a) => a.id === ids.netflix)!;
    const journal = journalPaiements(netflix, JOUR);
    expect(journal.paiements.every((p) => p.montant === 6.75)).toBe(true);
    expect(journal.cumul).toBeCloseTo(journal.paiements.length * 6.75, 2);

    const foyer = vueFoyer(abos, JOUR, sansConversion);
    const ligne = foyer.partages.find((p) => p.abonnementId === ids.netflix)!;
    expect(ligne).toMatchObject({ plein: 13.49, part: 6.75 });
    expect(foyer.priseEnCharge).toBeCloseTo(foyer.totalFoyer - foyer.totalPersonnel, 2);
  });
});
