/**
 * État « lu » des alertes (EF-31) : liste de clés stables, en localStorage
 * comme les préférences d'interface (§3.5). Les alertes elles-mêmes sont
 * recalculées à chaque ouverture (src/domain/alertes.ts) ; rien d'autre n'est
 * persisté.
 */

import type { StockageCleValeur } from './preferences';

export const CLE_ALERTES_LUES = 'subtuile.alertesLues';

export function lireAlertesLues(stockage: StockageCleValeur): string[] {
  try {
    const texte = stockage.getItem(CLE_ALERTES_LUES);
    const brut: unknown = texte === null ? [] : JSON.parse(texte);
    return Array.isArray(brut) ? brut.filter((c): c is string => typeof c === 'string') : [];
  } catch {
    return [];
  }
}

export function ecrireAlertesLues(stockage: StockageCleValeur, cles: readonly string[]): void {
  try {
    stockage.setItem(CLE_ALERTES_LUES, JSON.stringify(cles));
  } catch {
    // stockage indisponible : l'état reste en mémoire pour la session
  }
}
