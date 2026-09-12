import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  ErreurImport,
  exporterJson,
  lireExportJson,
  nomFichierExport,
} from '../src/data/importExport';
import { creerDexieProvider, type DexieProvider } from '../src/data/storage/dexieProvider';
import {
  abonnementsDepuisCsv,
  analyserCsv,
  decouperLigne,
  detecterSeparateur,
  periodiciteDepuisTexte,
  reconnaitreEnTete,
} from '../src/domain/csv';
import { creerAbonnement, creerMoyenPaiement } from '../src/domain/fabriques';
import { PERIODICITES, SCHEMA_VERSION } from '../src/domain/types';
import { parserDateSaisie } from '../src/i18n';

const JOUR = '2026-09-12';

describe('export / import JSON (EF-50)', () => {
  let storage: DexieProvider;
  beforeAll(() => {
    storage = creerDexieProvider('subtuile-import-export');
  });
  afterAll(async () => {
    await storage.supprimerBase();
  });

  it('aller-retour : export lisible, relu et réimporté à l’identique', async () => {
    const a = creerAbonnement(
      {
        nom: 'Netflix',
        prix: 13.49,
        periodicite: PERIODICITES.mensuelle,
        dateDebut: '2026-01-15',
        devise: 'USD',
      },
      { jour: JOUR },
    );
    const m = creerMoyenPaiement({ type: 'cb', libelle: 'CB', dateExpiration: '2027-01' });
    await storage.abonnements.enregistrer(a);
    await storage.moyensPaiement.enregistrer(m);
    const texte = await exporterJson(storage);
    expect(texte.startsWith('{\n')).toBe(true);
    const apercu = lireExportJson(texte, JOUR);
    expect(apercu).toMatchObject({
      nbAbonnements: 1,
      nbMoyensPaiement: 1,
      nbServicesPersonnalises: 0,
    });
    expect(apercu.exporteLe).toMatch(/^\d{4}-/);
    expect(apercu.donnees.abonnements[0]).toMatchObject({
      id: a.id,
      nom: 'Netflix',
      devise: 'USD',
    });
    expect(apercu.donnees.moyensPaiement[0]).toMatchObject({ id: m.id, dateExpiration: '2027-01' });

    await storage.effacerTout();
    const bilan = await storage.importer(apercu.donnees, 'remplacement');
    expect(bilan).toEqual({ abonnements: 1, moyensPaiement: 1, servicesPersonnalises: 0 });
    expect((await storage.abonnements.lire(a.id))?.updatedAt).toBe(
      apercu.donnees.abonnements[0]?.updatedAt,
    );
    expect(nomFichierExport(JOUR)).toBe('subtuile-sauvegarde-2026-09-12.json');
  });

  it('lecture tolérante : champs optionnels absents complétés, tombstones conservés, devise inconnue → EUR', () => {
    const apercu = lireExportJson(
      JSON.stringify({
        app: 'subtuile',
        schemaVersion: 1,
        abonnements: [
          {
            id: 'x1',
            nom: 'Minimal',
            prix: 5,
            periodicite: { type: 'recurrente', unite: 'mois', intervalle: 1 },
            dateDebut: '2026-01-14',
          },
          {
            id: 'x2',
            nom: 'Supprimé',
            prix: 5,
            periodicite: { type: 'a_vie' },
            dateDebut: '2026-01-14',
            deletedAt: '2026-09-01T00:00:00.000Z',
            devise: 'XXX',
            statut: { type: 'bizarre' },
          },
        ],
      }),
      JOUR,
    );
    expect(apercu.nbAbonnements).toBe(1);
    expect(apercu.nbMoyensPaiement).toBe(0);
    expect(apercu.exporteLe).toBeNull();
    const [minimal, supprime] = apercu.donnees.abonnements;
    expect(minimal).toMatchObject({
      id: 'x1',
      statut: { type: 'actif' },
      devise: 'EUR',
      tags: [],
      historiquePrix: [{ date: '2026-01-14', prix: 5 }],
      prochaineEcheance: '2026-09-14',
    });
    expect(minimal?.updatedAt).toMatch(/^\d{4}-/);
    expect(supprime).toMatchObject({
      deletedAt: '2026-09-01T00:00:00.000Z',
      devise: 'EUR',
      statut: { type: 'actif' },
    });
  });

  it('refus : JSON illisible, fichier étranger, schéma trop récent, structure invalide', () => {
    const code = (texte: string) => {
      try {
        lireExportJson(texte, JOUR);
        return null;
      } catch (e) {
        return e instanceof ErreurImport ? e.code : 'autre';
      }
    };
    expect(code('{oops')).toBe('json');
    expect(code('[]')).toBe('structure');
    expect(code('{"app":"autre"}')).toBe('etranger');
    expect(code(`{"app":"subtuile","schemaVersion":${SCHEMA_VERSION + 1}}`)).toBe('schema');
    expect(code('{"app":"subtuile"}')).toBe('schema');
    expect(code('{"app":"subtuile","schemaVersion":1,"abonnements":{}}')).toBe('structure');
    expect(code('{"app":"subtuile","schemaVersion":1,"abonnements":[{"id":"a"}]}')).toBe(
      'structure',
    );
    expect(
      code(
        '{"app":"subtuile","schemaVersion":1,"moyensPaiement":[{"id":"m","type":"chèque","libelle":"x"}]}',
      ),
    ).toBe('structure');
    expect(code('{"app":"subtuile","schemaVersion":1}')).toBeNull();
  });
});

describe('import CSV (EF-52)', () => {
  const parser = parserDateSaisie;

  it('séparateur détecté, guillemets, en-tête fr / en ou ordre des colonnes', () => {
    expect(detecterSeparateur('nom;prix;périodicité;échéance')).toBe(';');
    expect(detecterSeparateur('name,price,cycle,next')).toBe(',');
    expect(detecterSeparateur('nom\tprix')).toBe('\t');
    expect(decouperLigne('"Le Monde, édition";11,99;mois', ';')).toEqual([
      'Le Monde, édition',
      '11,99',
      'mois',
    ]);
    expect(decouperLigne('"Dit ""oui""",1', ',')).toEqual(['Dit "oui"', '1']);
    expect(reconnaitreEnTete(['Nom', 'Prix', 'Périodicité', 'Échéance'])).toEqual({
      nom: 0,
      prix: 1,
      periodicite: 2,
      echeance: 3,
    });
    expect(reconnaitreEnTete(['Next', 'Name', 'Price'])).toEqual({
      nom: 1,
      prix: 2,
      periodicite: -1,
      echeance: 0,
    });
    expect(reconnaitreEnTete(['Le Monde', '11,99', 'mois', '04/09/2026'])).toBeNull();
    expect(periodiciteDepuisTexte('mois')).toEqual(PERIODICITES.mensuelle);
    expect(periodiciteDepuisTexte('Yearly')).toEqual(PERIODICITES.annuelle);
    expect(periodiciteDepuisTexte('28 jours')).toEqual(PERIODICITES.vingtHuitJours);
    expect(periodiciteDepuisTexte('')).toEqual(PERIODICITES.mensuelle);
    expect(periodiciteDepuisTexte('lunaire')).toBeNull();
  });

  it('analyse : lignes reconnues et rejetées avec leur raison', () => {
    const texte = [
      'nom;prix;périodicité;échéance',
      'Le Monde;11,99;mois;04/10/2026',
      'NordVPN;3,89;mois;12/10/2026',
      'Xbox Game Pass;14,99;;',
      ';5;mois;',
      'Sans prix;abc;mois;',
      'Cycle inconnu;5;lunaire;',
      'Date illisible;5;mois;hier',
      'trop court',
    ].join('\n');
    const a = analyserCsv(texte, 'jma', parser);
    expect(a.separateur).toBe(';');
    expect(a.enTete).toBe(true);
    expect(
      a.reconnues.map((l) => [
        l.nom,
        l.prix,
        l.periodicite.type === 'recurrente'
          ? l.periodicite.unite + l.periodicite.intervalle
          : l.periodicite.type,
        l.echeance,
      ]),
    ).toEqual([
      ['Le Monde', '11,99', 'mois1', '2026-10-04'],
      ['NordVPN', '3,89', 'mois1', '2026-10-12'],
      ['Xbox Game Pass', '14,99', 'mois1', null],
    ]);
    expect(a.rejetees.map((r) => [r.numero, r.raison])).toEqual([
      [4, 'nom'],
      [5, 'prix'],
      [6, 'periodicite'],
      [7, 'echeance'],
      [8, 'colonnes'],
    ]);
    // sans en-tête : ordre nom, prix, périodicité, échéance ; date américaine tentée en second
    const b = analyserCsv(
      'Spotify,10.99,monthly,2026-10-05\nStrava,79.99,yearly,10/15/2026',
      'jma',
      parser,
    );
    expect(b.enTete).toBe(false);
    expect(
      b.reconnues.map((l) => [
        l.nom,
        l.prix,
        l.periodicite.type === 'recurrente'
          ? l.periodicite.unite + l.periodicite.intervalle
          : l.periodicite.type,
        l.echeance,
      ]),
    ).toEqual([
      ['Spotify', '10,99', 'mois1', '2026-10-05'],
      ['Strava', '79,99', 'an1', '2026-10-15'],
    ]);
  });

  it('abonnements créés : échéance future en surcharge, passée comme date de début, devise du réglage', () => {
    const a = analyserCsv(
      'nom;prix;périodicité;échéance\nLe Monde;11,99;mois;04/10/2026\nAncien;5;an;01/01/2026\nSans date;3;mois;',
      'jma',
      parser,
    );
    const abos = abonnementsDepuisCsv(a.reconnues, JOUR, 'CHF');
    expect(
      abos.map((x) => [
        x.nom,
        x.prix,
        x.devise,
        x.dateDebut,
        x.echeanceManuelle,
        x.prochaineEcheance,
      ]),
    ).toEqual([
      ['Le Monde', 11.99, 'CHF', JOUR, '2026-10-04', '2026-10-04'],
      ['Ancien', 5, 'CHF', '2026-01-01', null, '2027-01-01'],
      ['Sans date', 3, 'CHF', JOUR, null, JOUR],
    ]);
    expect(abos[0]?.periodicite).toEqual(PERIODICITES.mensuelle);
    expect(abos[1]?.periodicite).toEqual(PERIODICITES.annuelle);
  });
});
