/** Libellés du centre d'alertes (EF-31) : pastille, titre et sous-titre d'une alerte du domaine. */

import type { Alerte } from '../domain/alertes';
import type { I18n } from './contexts/I18nContext';

export interface LibellesAlerte {
  pastille: string;
  titre: string;
  sousTitre: string;
}

export function libellesAlerte(i18n: I18n, a: Alerte, moyenLibelle?: string): LibellesAlerte {
  const { t, tn, montant, date, compteur, periodicite } = i18n;
  switch (a.type) {
    case 'echeance': {
      const prix = a.montantEstime
        ? t('montant.estime', { montant: montant(a.prix, a.devise) })
        : montant(a.prix, a.devise);
      const titre =
        a.jours > 0
          ? tn('alertes.echeance.titre', a.jours, { nom: a.nom })
          : a.jours === 0
            ? t('alertes.echeance.aujourdhui', { nom: a.nom })
            : t('alertes.echeance.depasse', { nom: a.nom, date: date(a.date) });
      const sous = t('alertes.echeance.sous', { montant: prix, date: date(a.date, 'moyen') });
      return {
        pastille: compteur(a.jours),
        titre,
        sousTitre: moyenLibelle ? `${sous} · ${moyenLibelle}` : sous,
      };
    }
    case 'essai':
      return {
        pastille: compteur(a.jours),
        titre: t('alertes.essai.titre', { nom: a.nom, date: date(a.date, 'moyen') }),
        sousTitre: t('alertes.essai.sous', {
          montant: montant(a.prixApres, a.devise),
          periodicite: periodicite(a.periodicite),
        }),
      };
    case 'preavis':
      return {
        pastille: compteur(a.jours),
        titre: t('alertes.preavis.titre', { nom: a.nom, date: date(a.date, 'moyen') }),
        sousTitre: t('alertes.preavis.sous', { n: a.preavisJours }),
      };
    case 'rappel':
      return {
        pastille: t('alertes.rappel.pastille'),
        titre: t('alertes.rappel.titre', { nom: a.nom, texte: a.texte }),
        sousTitre:
          a.jours === 0
            ? t('alertes.rappel.aujourdhui')
            : tn('alertes.rappel.depuis', -a.jours, { date: date(a.date, 'moyen') }),
      };
    case 'budget':
      return {
        pastille: t('alertes.budget.pastille'),
        titre: t('alertes.budget.titre', { montant: montant(a.depassement, a.devise) }),
        sousTitre: t('alertes.budget.sous', { budget: montant(a.budget, a.devise) }),
      };
    case 'sauvegarde':
      return {
        pastille: t('alertes.sauvegarde.pastille'),
        titre:
          a.joursDepuis === null
            ? t('alertes.sauvegarde.titre.jamais')
            : t('alertes.sauvegarde.titre', { n: a.joursDepuis }),
        sousTitre: t('alertes.sauvegarde.sous'),
      };
    case 'carte': {
      const mois = date(a.date, 'mois');
      return {
        pastille: a.expiree
          ? t('alertes.carte.pastille.expiree')
          : t('alertes.carte.pastille', { n: Math.max(0, a.moisRestants) }),
        titre: a.expiree
          ? t('alertes.carte.titre.expiree', { libelle: a.libelle, mois })
          : t('alertes.carte.titre', { libelle: a.libelle, mois }),
        sousTitre: tn('alertes.carte.sous', a.nbAbonnements),
      };
    }
    case 'regularisation': {
      const prix = a.montantEstime
        ? t('montant.estime', { montant: montant(a.prix, a.devise) })
        : montant(a.prix, a.devise);
      return {
        pastille: compteur(a.jours),
        titre: t('alertes.regularisation.titre', { nom: a.nom, date: date(a.date, 'moyen') }),
        sousTitre: t('alertes.regularisation.sous', { montant: prix }),
      };
    }
    case 'prix_futur': {
      const signe = a.variationPourCent > 0 ? '+' : '';
      return {
        pastille: t('alertes.prixFutur.pastille', { n: `${signe}${a.variationPourCent}` }),
        titre: t(
          a.variationPourCent < 0 ? 'alertes.prixFutur.titre.baisse' : 'alertes.prixFutur.titre',
          {
            nom: a.nom,
            date: date(a.date, 'moyen'),
          },
        ),
        sousTitre: t('alertes.prixFutur.sous', {
          avant: montant(a.prix, a.devise),
          apres: montant(a.nouveauPrix, a.devise),
        }),
      };
    }
  }
}
