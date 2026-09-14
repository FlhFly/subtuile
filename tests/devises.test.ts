import { describe, expect, it } from 'vitest';
import { TAUX_EMBARQUES } from '../src/data/refdata/RefDataProvider';
import { calculerAlertes } from '../src/domain/alertes';
import { ALERTES_DEFAUT } from '../src/data/preferences';
import { appliquerFormule, preRemplirDepuisService, prixFormule } from '../src/domain/catalogue';
import { CATALOGUE_EMBARQUE } from '../src/data/refdata/RefDataProvider';
import {
  contientAutreDevise,
  convertir,
  convertisseurVers,
  sansConversion,
  SYMBOLES,
} from '../src/domain/devises';
import { evenementsAVenir } from '../src/domain/echeancier';
import { creerAbonnement } from '../src/domain/fabriques';
import { previsionnel, repartitionParCategorie, totaux } from '../src/domain/finances';
import {
  abonnementDepuisFormulaire,
  formulaireDepuisAbonnement,
  formulaireVide,
  validerFormulaire,
} from '../src/domain/formulaire';
import { modeleTuile } from '../src/domain/tuile';
import { DEVISES, PERIODICITES, type Abonnement, type Devise } from '../src/domain/types';

const JOUR = '2026-09-12';
const taux = TAUX_EMBARQUES.data;

function abo(champs: Partial<Abonnement> & { nom: string }): Abonnement {
  return creerAbonnement(
    { prix: 10, periodicite: PERIODICITES.mensuelle, dateDebut: '2026-01-14', ...champs },
    { jour: JOUR },
  );
}

describe('devises (EF-45, EF-45b)', () => {
  it('conversion aux taux indicatifs, base EUR, identité sur la même devise', () => {
    expect(taux.base).toBe('EUR');
    expect(convertir(100, 'EUR', 'USD', taux)).toBeCloseTo(108.7, 6);
    expect(convertir(108.7, 'USD', 'EUR', taux)).toBeCloseTo(100, 6);
    expect(convertir(100, 'GBP', 'CHF', taux)).toBeCloseTo((100 / 0.855) * 0.943, 6);
    expect(convertir(42, 'CHF', 'CHF', taux)).toBe(42);
    const versEur = convertisseurVers('EUR', taux);
    expect(versEur(10.87, 'USD')).toBeCloseTo(10, 6);
    expect(sansConversion(7, 'USD')).toBe(7);
    for (const d of DEVISES) expect(SYMBOLES[d]).toBeTruthy();
  });

  it('les totaux convertissent chaque abonnement depuis sa devise', () => {
    const liste = [
      abo({ nom: 'Euro' }),
      abo({ nom: 'Dollar', prix: 10.87, devise: 'USD' }),
      abo({ nom: 'Livre', prix: 8.55, devise: 'GBP', categorie: 'ia' }),
    ];
    expect(totaux(liste, JOUR).mensuel).toBeCloseTo(29.42, 6); // sans conversion : somme brute
    const t = totaux(liste, JOUR, convertisseurVers('EUR', taux));
    expect(t.mensuel).toBeCloseTo(30, 6);
    expect(totaux(liste, JOUR, convertisseurVers('USD', taux)).mensuel).toBeCloseTo(32.61, 6);
    const cats = repartitionParCategorie(liste, JOUR, convertisseurVers('EUR', taux));
    expect(cats.map((c) => [c.categorie, Math.round(c.mensuel)])).toEqual([
      ['autre', 20],
      ['ia', 10],
    ]);
    const p = previsionnel([liste[1]!], JOUR, { convertir: convertisseurVers('EUR', taux) });
    expect(p.mois[0]?.montant).toBeCloseTo(10, 6);
    expect(contientAutreDevise(liste, 'EUR')).toBe(true);
    expect(contientAutreDevise([liste[0]!], 'EUR')).toBe(false);
    expect(contientAutreDevise([{ ...liste[1]!, statut: { type: 'archive' } }], 'EUR')).toBe(false);
  });

  it('formulaire : devise par défaut, aller-retour, catalogue en euros', () => {
    expect(formulaireVide(JOUR).devise).toBe('EUR');
    const f = { ...formulaireVide(JOUR, 'USD'), nom: 'Claude Pro', prix: '20' };
    expect(f.devise).toBe('USD');
    expect(validerFormulaire(f)).toEqual({});
    const a = abonnementDepuisFormulaire(f, { jour: JOUR });
    expect(a.devise).toBe('USD');
    expect(formulaireDepuisAbonnement(a, JOUR).devise).toBe('USD');
    // un service du catalogue porte des tarifs en euros
    const netflix = CATALOGUE_EMBARQUE.data.find((s) => s.id === 'netflix')!;
    expect(preRemplirDepuisService(formulaireVide(JOUR, 'USD'), netflix).devise).toBe('EUR');
    const formule = netflix.formules[0]!;
    expect(appliquerFormule(f, formule).devise).toBe('EUR');
    // un service sans formule garde la devise saisie
    const sansFormule = { ...netflix, formules: [] };
    expect(preRemplirDepuisService(formulaireVide(JOUR, 'CHF'), sansFormule).devise).toBe('CHF');
    // avec une devise cible (réglage), le tarif est converti et la devise du réglage reste sélectionnée
    const cible = {
      devise: 'USD' as const,
      convertir: (m: number, de: Devise) => convertir(m, de, 'USD', taux),
    };
    const enDollars = preRemplirDepuisService(
      formulaireVide(JOUR, 'USD'),
      netflix,
      undefined,
      cible,
    );
    expect(enDollars.devise).toBe('USD');
    expect(enDollars.prix).toBe(
      String(Math.round(formule.prix * 1.087 * 100) / 100).replace('.', ','),
    );
    expect(appliquerFormule(f, formule, cible)).toMatchObject({
      devise: 'USD',
      prix: enDollars.prix,
    });
    expect(appliquerFormule(f, formule, { devise: 'EUR', convertir: (m) => m })).toMatchObject({
      devise: 'EUR',
      prix: String(formule.prix).replace('.', ','),
    });
  });

  it('une formule facturée en dollars garde ses dollars, ou se convertit depuis le dollar', () => {
    const formuleUsd = {
      id: 'x',
      nom: 'X',
      prix: 10,
      periodicite: PERIODICITES.mensuelle,
      canal: 'direct' as const,
      devise: 'USD' as const,
    };
    expect(prixFormule(formuleUsd)).toEqual({ prix: '10', devise: 'USD' });
    const enEuros = prixFormule(formuleUsd, {
      devise: 'EUR',
      convertir: (m, de) => convertir(m, de, 'EUR', taux),
    });
    expect(enEuros.devise).toBe('EUR');
    expect(Number(enEuros.prix.replace(',', '.'))).toBeCloseTo(10 / taux.taux.USD, 2);
  });

  it('la devise suit l’abonnement sur la tuile, dans les alertes et l’échéancier', () => {
    const dollar = abo({ nom: 'Dollar', prix: 20, devise: 'USD' });
    expect(modeleTuile(dollar, JOUR).devise).toBe('USD');
    const alerte = calculerAlertes({
      abonnements: [dollar],
      moyensPaiement: [],
      defauts: ALERTES_DEFAUT,
      jour: JOUR,
    })[0];
    expect(alerte).toMatchObject({ type: 'echeance', devise: 'USD', prix: 20 });
    expect(evenementsAVenir([dollar], JOUR)[0]).toMatchObject({ devise: 'USD', montant: 20 });
  });
});
