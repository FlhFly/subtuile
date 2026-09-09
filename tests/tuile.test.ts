import { describe, expect, it } from 'vitest';
import { DATE_REFERENCE_DEMO, IDS_DEMO, jeuDemo } from '../src/data/fixtures/demo';
import { CATALOGUE_EMBARQUE, trouverService } from '../src/data/refdata/RefDataProvider';
import {
  COULEUR_TUILE_DEFAUT,
  compteurTuile,
  couleurCompteur,
  couleurTuile,
  initialesDuNom,
  logoTuile,
  modeleTuile,
  sousTitreTuile,
  varianteTuile,
} from '../src/domain/tuile';
import type { Abonnement } from '../src/domain/types';

const jeu = jeuDemo();
const ids = IDS_DEMO.abonnements;
const par = (id: string): Abonnement => jeu.abonnements.find((a) => a.id === id)!;
const mp = (id: string | null) => jeu.moyensPaiement.find((m) => m.id === id);
const service = (id: string | null) => trouverService(CATALOGUE_EMBARQUE, id);
const modele = (id: string) => {
  const a = par(id);
  return modeleTuile(a, DATE_REFERENCE_DEMO, mp(a.moyenPaiementId), service(a.serviceId));
};

describe('initiales et logo à repli (§3.4)', () => {
  it('initiales du nom', () => {
    expect(initialesDuNom('Netflix')).toBe('Ne');
    expect(initialesDuNom('Amazon Prime')).toBe('AP');
    expect(initialesDuNom('Basic-Fit')).toBe('BF');
    expect(initialesDuNom('X')).toBe('X');
    expect(initialesDuNom('   ')).toBe('?');
  });

  it('logo : abonnement, puis service, puis initiales du nom ; types non rendus ignorés', () => {
    const netflix = service('netflix')!;
    expect(logoTuile({ nom: 'Netflix', logo: null }, netflix)).toBe('N');
    expect(logoTuile({ nom: 'Netflix', logo: { type: 'initiales', valeur: 'NF' } }, netflix)).toBe(
      'NF',
    );
    expect(logoTuile({ nom: 'Netflix', logo: { type: 'icone', valeur: 'netflix' } }, netflix)).toBe(
      'N',
    );
    expect(logoTuile({ nom: 'Mon service', logo: { type: 'upload', valeur: 'data:…' } })).toBe(
      'MS',
    );
    expect(logoTuile({ nom: 'Mon service', logo: { type: 'initiales', valeur: '  ' } })).toBe('MS');
  });

  it('couleur : abonnement, puis service, puis défaut', () => {
    const netflix = service('netflix')!;
    expect(couleurTuile({ couleur: null }, netflix)).toBe('#b1060f');
    expect(couleurTuile({ couleur: '#123456' }, netflix)).toBe('#123456');
    expect(couleurTuile({ couleur: null })).toBe(COULEUR_TUILE_DEFAUT);
  });
});

describe('variante, compteur et sous-titre sur le jeu de démo (EF-10, EF-11)', () => {
  it('variantes de fond selon le statut', () => {
    expect(varianteTuile(par(ids.strava))).toBe('coloree');
    expect(varianteTuile(par(ids.spotify))).toBe('pause');
    expect(varianteTuile(par(ids.canal))).toBe('neutre');
    expect(varianteTuile(par(ids.dropbox))).toBe('neutre');
  });

  it('compteur : échéance, essai, préavis, statuts, à vie, à l’usage', () => {
    const c = (id: string) => compteurTuile(par(id), DATE_REFERENCE_DEMO);
    expect(c(ids.strava)).toEqual({
      type: 'echeance',
      niveau: 'urg',
      jours: 2,
      date: '2026-08-18',
    });
    expect(c(ids.chatgpt)).toEqual({
      type: 'echeance',
      niveau: 'warn',
      jours: 8,
      date: '2026-08-24',
    });
    expect(c(ids.netflix)).toEqual({
      type: 'echeance',
      niveau: 'ok',
      jours: 21,
      date: '2026-09-06',
    });
    expect(c(ids.disney)).toEqual({ type: 'essai', jours: 5, date: '2026-08-21' });
    expect(c(ids.basicFit)).toEqual({ type: 'preavis', jours: 10, date: '2026-08-26' });
    expect(c(ids.spotify)).toEqual({ type: 'pause', repriseLe: null });
    expect(c(ids.canal)).toEqual({ type: 'resilie', jusquau: '2026-09-30' });
    expect(c(ids.dropbox)).toEqual({ type: 'archive' });
    expect(c(ids.claudeApi)).toEqual({ type: 'a_l_usage' });
    expect(
      compteurTuile(
        { ...par(ids.strava), periodicite: { type: 'a_vie' }, prochaineEcheance: null },
        DATE_REFERENCE_DEMO,
      ),
    ).toEqual({ type: 'a_vie' });
  });

  it('l’essai prime sur le préavis, le préavis lointain n’apparaît pas', () => {
    const avecEssai = { ...par(ids.basicFit), essai: { dateFin: '2026-08-20', prixApres: 24.99 } };
    expect(compteurTuile(avecEssai, DATE_REFERENCE_DEMO).type).toBe('essai');
    expect(compteurTuile(par(ids.canal), DATE_REFERENCE_DEMO).type).toBe('resilie');
    const preavisLoin = { ...par(ids.basicFit), engagement: { dureeMois: 12, preavisJours: 0 } };
    expect(compteurTuile(preavisLoin, DATE_REFERENCE_DEMO).type).toBe('echeance');
  });

  it('couleur du chip', () => {
    expect(couleurCompteur({ type: 'echeance', niveau: 'ok', jours: 20, date: '2026-09-05' })).toBe(
      'ok',
    );
    expect(couleurCompteur({ type: 'echeance', niveau: 'urg', jours: 1, date: '2026-08-17' })).toBe(
      'urg',
    );
    expect(couleurCompteur({ type: 'essai', jours: 5, date: '2026-08-21' })).toBe('trial');
    expect(couleurCompteur({ type: 'preavis', jours: 10, date: '2026-08-26' })).toBe('trial');
    expect(couleurCompteur({ type: 'pause', repriseLe: null })).toBe('neutre');
    expect(couleurCompteur({ type: 'a_vie' })).toBe('neutre');
  });

  it('sous-titre : usage, essai, partage, prix (estimé ou non)', () => {
    const s = (id: string) => sousTitreTuile(par(id), DATE_REFERENCE_DEMO);
    expect(s(ids.claudeApi)).toEqual({ type: 'usage', plafond: 15 });
    expect(s(ids.disney)).toMatchObject({ type: 'essai', prixApres: 11.99 });
    expect(s(ids.netflix)).toMatchObject({ type: 'partage', partPayee: 6.75 });
    expect(s(ids.edf)).toMatchObject({ type: 'prix', prix: 64, estime: true });
    expect(s(ids.strava)).toMatchObject({ type: 'prix', prix: 79.99, estime: false });
  });

  it('modèle complet d’une tuile colorée et d’une tuile en saisie libre', () => {
    const strava = modele(ids.strava);
    expect(strava).toMatchObject({
      nom: 'Strava',
      initiales: 'St',
      couleur: '#fc5200',
      variante: 'coloree',
      essai: false,
      archive: false,
      partage: false,
      canal: 'direct',
      paiement: { type: 'cb', couleur: '#2f5fd0' },
    });
    const basicFit = modele(ids.basicFit);
    expect(basicFit.initiales).toBe('BF');
    expect(basicFit.couleur).toBe('#e07800');
    expect(basicFit.paiement?.type).toBe('sepa');
    const chatgpt = modele(ids.chatgpt);
    expect(chatgpt.canal).toBe('app_store');
    expect(chatgpt.paiement?.type).toBe('apple_pay');
    expect(modele(ids.netflix).partage).toBe(true);
    expect(modele(ids.disney).essai).toBe(true);
    expect(modele(ids.dropbox).archive).toBe(true);
  });

  it('sans moyen de paiement ni service : pas de pastille, initiales du nom, couleur par défaut', () => {
    const a = { ...par(ids.basicFit), couleur: null, logo: null, moyenPaiementId: null };
    const m = modeleTuile(a, DATE_REFERENCE_DEMO);
    expect(m.paiement).toBeNull();
    expect(m.initiales).toBe('BF');
    expect(m.couleur).toBe(COULEUR_TUILE_DEFAUT);
  });
});
