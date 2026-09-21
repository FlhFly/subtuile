import { describe, expect, it } from 'vitest';
import { CATALOGUE_EMBARQUE, trouverService } from '../src/data/refdata/RefDataProvider';
import { creerAbonnement } from '../src/domain/fabriques';
import {
  doublonsParCategorie,
  suggestionAnnuel,
  suggestionCanal,
  suggestionsEconomies,
} from '../src/domain/suggestions';
import { PERIODICITES, type Abonnement, type Service } from '../src/domain/types';

const JOUR = '2026-09-20';
const abo = (champs: Partial<Abonnement> & { nom: string }): Abonnement =>
  creerAbonnement(
    { prix: 10, periodicite: PERIODICITES.mensuelle, dateDebut: '2026-01-10', ...champs },
    { jour: JOUR },
  );

describe('doublons potentiels par catégorie (reste de C3, EF-71)', () => {
  it('au moins deux payants dans une catégorie de loisirs ; candidat = le moins utilisé, sinon le moins cher', () => {
    const liste = [
      abo({ nom: 'Netflix', prix: 14, categorie: 'streaming', usageParSemaine: 7 }),
      abo({ nom: 'Disney+', prix: 10, categorie: 'streaming', usageParSemaine: 0 }),
      abo({ nom: 'Canal+', prix: 25, categorie: 'streaming' }),
      abo({ nom: 'Spotify', prix: 11, categorie: 'musique' }),
      abo({ nom: 'Deezer', prix: 12, categorie: 'musique' }),
      abo({ nom: 'EDF', prix: 80, categorie: 'vie_courante' }),
      abo({ nom: 'Engie', prix: 60, categorie: 'vie_courante' }),
      abo({ nom: 'Seul', prix: 5, categorie: 'cloud' }),
    ];
    const d = doublonsParCategorie(liste, JOUR);
    expect(d.map((x) => x.categorie)).toEqual(['musique', 'streaming']);
    const streaming = d.find((x) => x.categorie === 'streaming')!;
    expect(streaming.abonnements.map((a) => a.nom)).toEqual(['Canal+', 'Netflix', 'Disney+']);
    expect(streaming.candidat).toMatchObject({ nom: 'Disney+', mensuel: 10 });
    expect(streaming.selonUsage).toBe(true);
    const musique = d.find((x) => x.categorie === 'musique')!;
    expect(musique.candidat.nom).toBe('Spotify');
    expect(musique.selonUsage).toBe(false);
  });
});

describe('suggestions d’économies via le catalogue (EF-72)', () => {
  const zwift = trouverService(CATALOGUE_EMBARQUE, 'zwift')!;
  const youtube = trouverService(CATALOGUE_EMBARQUE, 'youtube')!;

  it('passer en annuel : même offre, même canal, moins cher que douze mensualités payées', () => {
    const mensuel = abo({
      nom: 'Zwift',
      prix: 19.99,
      serviceId: 'zwift',
      formuleId: 'zwift_mensuel',
    });
    const s = suggestionAnnuel(mensuel, zwift)!;
    expect(s.formule.id).toBe('zwift_annuel');
    expect(s.economieAnnuelle).toBe(39.89);
    // déjà annuel, saisie libre ou prix négocié plus bas que l'annuel : rien
    expect(suggestionAnnuel({ ...mensuel, periodicite: PERIODICITES.annuelle }, zwift)).toBeNull();
    expect(suggestionAnnuel({ ...mensuel, formuleId: null }, zwift)).toBeNull();
    expect(suggestionAnnuel({ ...mensuel, prix: 15 }, zwift)).toBeNull();
    expect(suggestionAnnuel(mensuel, undefined)).toBeNull();
  });

  it('canal moins cher : même offre en direct face au store', () => {
    const store = youtube.formules.find((f) => f.canal !== 'direct')!;
    const viaStore = abo({
      nom: 'YouTube Premium',
      prix: store.prix,
      serviceId: 'youtube',
      formuleId: store.id,
      canalAchat: store.canal,
    });
    const s = suggestionCanal(viaStore, youtube)!;
    expect(s.direct.canal).toBe('direct');
    expect(s.ecart).toBeGreaterThan(0);
    expect(suggestionCanal({ ...viaStore, canalAchat: 'direct' }, youtube)).toBeNull();
  });

  it('liste chiffrée à l’année, la plus forte économie d’abord', () => {
    const store = youtube.formules.find((f) => f.canal !== 'direct')!;
    const services = new Map<string, Service>([
      ['zwift', zwift],
      ['youtube', youtube],
    ]);
    const liste = suggestionsEconomies(
      [
        abo({ nom: 'Zwift', prix: 19.99, serviceId: 'zwift', formuleId: 'zwift_mensuel' }),
        abo({
          nom: 'YouTube Premium',
          prix: store.prix,
          serviceId: 'youtube',
          formuleId: store.id,
          canalAchat: store.canal,
        }),
        abo({ nom: 'Libre', prix: 5 }),
      ],
      services,
      JOUR,
    );
    expect(liste.map((s) => s.type).sort()).toEqual(['annuel', 'canal']);
    expect(liste[0]!.economieAnnuelle).toBeGreaterThanOrEqual(liste[1]!.economieAnnuelle);
  });
});
