import { describe, expect, it } from 'vitest';
import { CATALOGUE_EMBARQUE } from '../src/data/refdata/RefDataProvider';
import {
  fusionnerCatalogue,
  grouperAvecMesServices,
  preRemplirDepuisService,
  servicesPourSelection,
} from '../src/domain/catalogue';
import { formulaireVide } from '../src/domain/formulaire';
import {
  couleurPourNom,
  creerServicePersonnalise,
  estServicePersonnalise,
  formulaireServiceVide,
  nomDejaPris,
  PALETTE_PERSONNALISEE,
  PREFIXE_ID_PERSONNALISE,
  validerServicePersonnalise,
} from '../src/domain/servicePersonnalise';

const embarques = CATALOGUE_EMBARQUE.data;

describe('proposer un service (EF-09)', () => {
  it('couleur déterministe dans la palette, insensible à la casse et aux accents', () => {
    const c = couleurPourNom('Ma salle de sport');
    expect(PALETTE_PERSONNALISEE).toContain(c);
    expect(couleurPourNom('MA SALLE DE SPORT')).toBe(c);
    expect(couleurPourNom('ma salle de sport ')).toBe(c);
    expect(couleurPourNom('Élec')).toBe(couleurPourNom('elec'));
  });

  it('validation : nom requis, nom déjà présent, adresse', () => {
    expect(validerServicePersonnalise(formulaireServiceVide(), embarques).nom).toBe('requis');
    expect(
      validerServicePersonnalise({ ...formulaireServiceVide(), nom: 'netflix' }, embarques).nom,
    ).toBe('existe');
    expect(nomDejaPris('NETFLIX', embarques)).toBe(true);
    expect(nomDejaPris('', embarques)).toBe(false);
    expect(
      validerServicePersonnalise(
        { ...formulaireServiceVide(), nom: 'Ma salle', urlGestion: 'https://' },
        embarques,
      ).urlGestion,
    ).toBe('url');
    expect(
      validerServicePersonnalise(
        { nom: 'Ma salle', categorie: 'sport', urlGestion: 'masalle.fr/compte' },
        embarques,
      ),
    ).toEqual({});
  });

  it('création : id préfixé, initiales et couleur générées, entrée populaire et vivante', () => {
    const s = creerServicePersonnalise(
      { nom: ' Ma salle de sport ', categorie: 'sport', urlGestion: 'masalle.fr/compte' },
      '2026-09-11T10:00:00.000Z',
    );
    expect(s.id.startsWith(PREFIXE_ID_PERSONNALISE)).toBe(true);
    expect(estServicePersonnalise(s)).toBe(true);
    expect(estServicePersonnalise({ id: 'netflix' })).toBe(false);
    expect(s).toMatchObject({
      nom: 'Ma salle de sport',
      categorie: 'sport',
      logo: { type: 'initiales', valeur: 'MS' },
      couleur: couleurPourNom('Ma salle de sport'),
      urlGestion: 'https://masalle.fr/compte',
      deepLinks: {},
      formules: [],
      modeResiliation: 'lien',
      contactResiliation: null,
      montantEstime: false,
      populaire: true,
      updatedAt: '2026-09-11T10:00:00.000Z',
      deletedAt: null,
    });
    expect(s.periodicitesConnues).toEqual([{ type: 'recurrente', unite: 'mois', intervalle: 1 }]);
    const sansUrl = creerServicePersonnalise({ nom: 'X', categorie: 'autre', urlGestion: '' });
    expect(sansUrl.urlGestion).toBeNull();
  });

  it('fusion avec le catalogue embarqué : mes services en tête, tombstones exclus', () => {
    const vivant = creerServicePersonnalise({
      nom: 'Ma salle',
      categorie: 'sport',
      urlGestion: '',
    });
    const supprime = {
      ...creerServicePersonnalise({ nom: 'Ancien', categorie: 'autre', urlGestion: '' }),
      deletedAt: '2026-09-11T10:00:00.000Z',
    };
    const fusion = fusionnerCatalogue(CATALOGUE_EMBARQUE, [vivant, supprime]);
    expect(fusion.version).toBe(CATALOGUE_EMBARQUE.version);
    expect(fusion.data).toHaveLength(embarques.length + 1);
    expect(fusion.data[0]?.id).toBe(vivant.id);
    expect(fusionnerCatalogue(CATALOGUE_EMBARQUE, [])).toBe(CATALOGUE_EMBARQUE);
    expect(fusionnerCatalogue(CATALOGUE_EMBARQUE, [supprime])).toBe(CATALOGUE_EMBARQUE);

    // utilisable comme une entrée du catalogue : sélection par défaut et pré-remplissage
    expect(servicesPourSelection(fusion.data, '').map((s) => s.id)).toContain(vivant.id);
    const f = preRemplirDepuisService(formulaireVide('2026-09-11'), vivant);
    expect(f).toMatchObject({
      serviceId: vivant.id,
      nom: 'Ma salle',
      categorie: 'sport',
      preset: 'mensuelle',
    });
  });

  it('regroupement de l’écran Catalogue : « Mes services » puis les catégories', () => {
    const perso = creerServicePersonnalise({ nom: 'Ma salle', categorie: 'sport', urlGestion: '' });
    const groupes = grouperAvecMesServices([perso, ...embarques]);
    expect(groupes.mesServices.map((s) => s.id)).toEqual([perso.id]);
    expect(groupes.parCategorie.reduce((n, g) => n + g.services.length, 0)).toBe(embarques.length);
    expect(grouperAvecMesServices(embarques).mesServices).toEqual([]);
  });
});
