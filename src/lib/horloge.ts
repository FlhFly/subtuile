import type { Horodatage } from '../domain/types';

/** Instant courant en ISO 8601 (updatedAt, deletedAt, exporteLe). Injectable pour les tests. */
export function maintenant(date: Date = new Date()): Horodatage {
  return date.toISOString();
}
