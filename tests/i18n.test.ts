import { describe, expect, it } from 'vitest';
import { PERIODICITES } from '../src/domain/types';
import {
  detecterLangue,
  DICTIONNAIRES,
  estLangue,
  formaterDate,
  formaterMontant,
  libelleCompteur,
  libelleDuree,
  libellePeriodicite,
  masquerMontant,
  traduire,
  traduireNombre,
} from '../src/i18n';
import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';

describe('dictionnaires fr / en (EF-17b)', () => {
  it('ont exactement les mêmes clés', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort());
  });

  it('aucune valeur vide, mêmes paramètres {x} dans les deux langues', () => {
    for (const cle of Object.keys(fr) as (keyof typeof fr)[]) {
      expect(fr[cle].trim(), cle).not.toBe('');
      expect(en[cle].trim(), cle).not.toBe('');
      const params = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
      expect(params(en[cle]), cle).toEqual(params(fr[cle]));
    }
  });

  it('couvre toutes les valeurs des énumérations du modèle', () => {
    const cles = Object.keys(fr);
    const attendus = [
      ...[
        'streaming',
        'sport',
        'musique',
        'ia',
        'cloud',
        'productivite',
        'presse',
        'gaming',
        'securite',
        'vie_courante',
        'autre',
      ].map((c) => `categorie.${c}`),
      ...['actif', 'en_pause', 'resilie_actif_jusquau', 'archive'].map((s) => `statut.${s}`),
      ...['direct', 'app_store', 'google_play'].map((c) => `canal.${c}`),
      ...['lien', 'telephone', 'courrier_recommande', 'espace_client'].map(
        (m) => `resiliation.${m}`,
      ),
      ...['cb', 'paypal', 'apple_pay', 'sepa', 'autre'].map((p) => `paiement.${p}`),
      ...['clair', 'sombre', 'systeme'].map((t) => `theme.${t}`),
      ...['grille', 'liste'].map((a) => `affichage.${a}`),
      ...['echeance', 'prix', 'nom', 'categorie', 'personnalise'].map((t) => `tri.${t}`),
    ];
    for (const cle of attendus) expect(cles, cle).toContain(cle);
    expect(DICTIONNAIRES.fr).toBe(fr);
    expect(DICTIONNAIRES.en).toBe(en);
  });
});

describe('traduire', () => {
  it('interpole les paramètres et laisse les inconnus visibles', () => {
    expect(traduire('fr', 'compteur.jours', { n: 3 })).toBe('J-3');
    expect(traduire('en', 'compteur.jours', { n: 3 })).toBe('D-3');
    expect(traduire('fr', 'reglages.apropos.version', { version: '0.1.0' })).toContain('0.1.0');
    expect(traduire('fr', 'compteur.jours')).toBe('J-{n}');
  });

  it('singulier / pluriel', () => {
    expect(traduireNombre('fr', 'accueil.nombre', 1)).toBe('1 abonnement');
    expect(traduireNombre('fr', 'accueil.nombre', 0)).toBe('0 abonnements');
    expect(traduireNombre('en', 'accueil.nombre', 13)).toBe('13 subscriptions');
  });
});

describe('détection de langue', () => {
  it('fr pour les navigateurs francophones, en sinon', () => {
    expect(detecterLangue('fr-FR')).toBe('fr');
    expect(detecterLangue('fr')).toBe('fr');
    expect(detecterLangue('en-US')).toBe('en');
    expect(detecterLangue('de-DE')).toBe('en');
    expect(detecterLangue(undefined)).toBe('en');
    expect(estLangue('fr')).toBe(true);
    expect(estLangue('es')).toBe(false);
  });
});

describe('mode discret (EF-75)', () => {
  it('masque le nombre et garde la devise dans les deux langues', () => {
    // l'espace avant la devise est l'espace fine insécable d'Intl : comparé par motif
    expect(masquerMontant(formaterMontant('fr', 12.99, 'EUR'))).toMatch(/^\*{4}\s€$/);
    expect(masquerMontant(formaterMontant('fr', 1234.5, 'EUR'))).toMatch(/^\*{4}\s€$/);
    expect(masquerMontant(formaterMontant('en', 12.99, 'EUR'))).toBe('€****');
    // « US$ » en anglais britannique : seul le nombre est remplacé
    expect(masquerMontant(formaterMontant('en', 1234.5, 'USD'))).toMatch(/^US?\$\*{4}$/);
    expect(masquerMontant(formaterMontant('fr', 0, 'CHF'))).toMatch(/^\*{4}\sCHF$/);
    expect(masquerMontant('~12,99 €')).toBe('~**** €');
  });
});

describe('formats localisés', () => {
  it('montants', () => {
    expect(formaterMontant('fr', 9.99)).toBe('9,99 €');
    expect(formaterMontant('en', 9.99)).toBe('€9.99');
    expect(formaterMontant('fr', 1234.5)).toBe('1 234,50 €');
    expect(formaterMontant('en', 20, 'USD')).toBe('US$20.00');
  });

  it('dates civiles, sans décalage de fuseau', () => {
    expect(formaterDate('fr', '2026-09-15')).toBe('15/09/2026');
    expect(formaterDate('en', '2026-09-15')).toBe('15/09/2026');
    expect(formaterDate('fr', '2026-09-01', 'long')).toBe('1 septembre 2026');
    expect(formaterDate('en', '2026-09-01', 'long')).toBe('1 September 2026');
    expect(formaterDate('fr', '2026-01-01', 'court')).toBe('01/01/2026');
  });

  it('durées « abonné depuis » (EF-18)', () => {
    expect(libelleDuree('fr', { annees: 3, mois: 0, jours: 0 })).toBe('3 ans');
    expect(libelleDuree('fr', { annees: 1, mois: 1, jours: 0 })).toBe('1 an et 1 mois');
    expect(libelleDuree('en', { annees: 2, mois: 11, jours: 0 })).toBe('2 years and 11 months');
    expect(libelleDuree('fr', { annees: 0, mois: 5, jours: 0 })).toBe('5 mois');
    expect(libelleDuree('fr', { annees: 0, mois: 0, jours: 12 })).toBe('12 j');
    expect(libelleDuree('en', { annees: 0, mois: 0, jours: 0 })).toBe('today');
  });

  it('compteur J-X / D-X', () => {
    expect(libelleCompteur('fr', 7)).toBe('J-7');
    expect(libelleCompteur('en', 7)).toBe('D-7');
    expect(libelleCompteur('fr', 0)).toBe('Aujourd’hui');
    expect(libelleCompteur('en', 0)).toBe('Today');
    expect(libelleCompteur('fr', -2)).toBe('J+2');
  });

  it('périodicités', () => {
    expect(libellePeriodicite('fr', PERIODICITES.mensuelle)).toBe('/ mois');
    expect(libellePeriodicite('en', PERIODICITES.annuelle)).toBe('/ year');
    expect(libellePeriodicite('fr', PERIODICITES.trimestrielle)).toBe('/ trimestre');
    expect(libellePeriodicite('fr', PERIODICITES.semestrielle)).toBe('/ semestre');
    expect(libellePeriodicite('fr', PERIODICITES.hebdomadaire)).toBe('/ semaine');
    expect(libellePeriodicite('fr', PERIODICITES.vingtHuitJours)).toBe('tous les 28 jours');
    expect(libellePeriodicite('en', PERIODICITES.vingtHuitJours)).toBe('every 28 days');
    expect(libellePeriodicite('fr', { type: 'recurrente', unite: 'mois', intervalle: 2 })).toBe(
      'tous les 2 mois',
    );
    expect(libellePeriodicite('fr', PERIODICITES.aVie)).toBe('à vie');
    expect(libellePeriodicite('fr', PERIODICITES.aLUsage)).toBe('à l’usage');
    expect(libellePeriodicite('fr', { type: 'a_l_usage', plafond: 15 }, '15,00 €')).toBe(
      'à l’usage · plafond ~15,00 €',
    );
    expect(libellePeriodicite('fr', { type: 'a_l_usage', plafond: 15 })).toBe('à l’usage');
  });
});
