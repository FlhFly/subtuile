/**
 * Doublons à la création (C3) : un abonnement non archivé portant le même
 * service du catalogue, ou le même nom (accents et casse ignorés), est
 * signalé avant l'enregistrement. Fonction pure ; l'écran décide d'avertir.
 */

import { normaliserTexte } from './tri';
import type { Abonnement } from './types';

export interface CandidatDoublon {
  serviceId: string | null;
  nom: string;
}

export function doublonsPotentiels(
  abonnements: readonly Abonnement[],
  candidat: CandidatDoublon,
  excluId?: string,
): Abonnement[] {
  const nom = normaliserTexte(candidat.nom);
  return abonnements.filter(
    (a) =>
      a.id !== excluId &&
      a.deletedAt === null &&
      a.statut.type !== 'archive' &&
      ((candidat.serviceId !== null && a.serviceId === candidat.serviceId) ||
        (nom !== '' && normaliserTexte(a.nom) === nom)),
  );
}
