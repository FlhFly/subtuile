import { describe, expect, it } from 'vitest';
import { DATE_REFERENCE_DEMO, IDS_DEMO, jeuDemo } from '../src/data/fixtures/demo';
import { CATALOGUE_EMBARQUE, trouverService } from '../src/data/refdata/RefDataProvider';
import {
  actionResiliation,
  cleEtapes,
  DEEP_LINKS,
  estTelephone,
  estUrl,
  lienTelephone,
  statutApresResiliation,
} from '../src/domain/resiliation';

const jeu = jeuDemo();
const ids = IDS_DEMO.abonnements;
const par = (id: string) => jeu.abonnements.find((a) => a.id === id)!;
const service = (id: string | null) => trouverService(CATALOGUE_EMBARQUE, id);

describe('routage « Gérer / Résilier » (EF-20, EF-21, EF-21b, §5.3)', () => {
  it('App Store et Google Play : le store, jamais le site du service', () => {
    const chatgpt = par(ids.chatgpt); // canal app_store
    expect(actionResiliation(chatgpt, service('chatgpt'))).toEqual({
      type: 'lien',
      url: DEEP_LINKS.app_store,
      source: 'app_store',
    });
    expect(actionResiliation({ ...chatgpt, canalAchat: 'google_play' })).toEqual({
      type: 'lien',
      url: DEEP_LINKS.google_play,
      source: 'google_play',
    });
    // même avec une adresse de gestion et un mode hors ligne, le canal prime
    expect(
      actionResiliation({
        ...chatgpt,
        urlGestion: 'https://chatgpt.com',
        modeResiliation: 'telephone',
        contactResiliation: '01 23 45 67 89',
      }).type,
    ).toBe('lien');
  });

  it('direct + lien : l’adresse de l’abonnement, sinon celle du service, sinon rien', () => {
    expect(actionResiliation(par(ids.netflix), service('netflix'))).toEqual({
      type: 'lien',
      url: 'https://www.netflix.com/cancelplan',
      source: 'service',
    });
    expect(
      actionResiliation({ ...par(ids.netflix), urlGestion: null }, service('netflix')),
    ).toMatchObject({
      type: 'lien',
      url: service('netflix')!.urlGestion,
    });
    expect(actionResiliation({ ...par(ids.basicFit), urlGestion: null })).toEqual({
      type: 'aucune',
    });
  });

  it('modes hors ligne (EF-21b) : téléphone, courrier, espace client', () => {
    expect(actionResiliation(par(ids.edf), service('edf'))).toEqual({
      type: 'telephone',
      contact: '09 69 32 15 15 (EDF particuliers)',
    });
    expect(
      actionResiliation({
        ...par(ids.edf),
        modeResiliation: 'courrier_recommande',
        contactResiliation: 'EDF — TSA 20012',
      }),
    ).toEqual({ type: 'courrier_recommande', contact: 'EDF — TSA 20012' });
    // espace client : le contact sert d'adresse s'il en est une, sinon l'adresse de gestion
    expect(actionResiliation(par(ids.canal), service('canal'))).toEqual({
      type: 'espace_client',
      url: 'https://espaceclient.canalplus.com',
      contact: 'https://espaceclient.canalplus.com',
    });
    expect(
      actionResiliation({ ...par(ids.canal), contactResiliation: 'Rubrique « Mon abonnement »' }),
    ).toEqual({
      type: 'espace_client',
      url: 'https://espaceclient.canalplus.com',
      contact: 'Rubrique « Mon abonnement »',
    });
    expect(actionResiliation({ ...par(ids.edf), contactResiliation: '  ' })).toEqual({
      type: 'telephone',
      contact: null,
    });
  });

  it('jeu d’étapes de la démarche (EF-22)', () => {
    expect(cleEtapes(par(ids.chatgpt))).toBe('app_store');
    expect(cleEtapes({ canalAchat: 'google_play', modeResiliation: 'lien' })).toBe('google_play');
    expect(cleEtapes(par(ids.netflix))).toBe('direct');
    expect(cleEtapes(par(ids.edf))).toBe('telephone');
    expect(cleEtapes(par(ids.canal))).toBe('espace_client');
    expect(cleEtapes({ canalAchat: 'direct', modeResiliation: 'courrier_recommande' })).toBe(
      'courrier_recommande',
    );
  });

  it('statut proposé après résiliation : actif jusqu’à la prochaine échéance (EF-22)', () => {
    expect(statutApresResiliation(par(ids.netflix), DATE_REFERENCE_DEMO)).toEqual({
      type: 'resilie_actif_jusquau',
      jusquau: '2026-09-06',
    });
    expect(statutApresResiliation(par(ids.claudeApi), DATE_REFERENCE_DEMO)).toEqual({
      type: 'resilie_actif_jusquau',
      jusquau: DATE_REFERENCE_DEMO,
    });
  });

  it('détection d’adresses et de numéros de téléphone', () => {
    expect(estUrl('https://a.b/c')).toBe(true);
    expect(estUrl('itms-apps://x')).toBe(false);
    expect(estUrl(null)).toBe(false);
    expect(estTelephone('09 69 32 15 15 (EDF particuliers)')).toBe(true);
    expect(estTelephone('+33 9 69 32 15 15')).toBe(true);
    expect(estTelephone('EDF — TSA 20012')).toBe(false);
    expect(estTelephone(null)).toBe(false);
    expect(lienTelephone('09 69 32 15 15 (EDF particuliers)')).toBe('tel:0969321515');
    expect(lienTelephone('+33 9 69 32 15 15')).toBe('tel:+33969321515');
  });
});
