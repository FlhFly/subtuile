/**
 * Types minimaux de `node:fs` pour les tests qui lisent des fichiers du dépôt
 * (icônes PWA, index.html) : évite d'ajouter @types/node au projet.
 */
declare module 'node:fs' {
  export function readFileSync(chemin: string): Uint8Array;
  export function readFileSync(chemin: string, encodage: 'utf8'): string;
  export function existsSync(chemin: string): boolean;
}
