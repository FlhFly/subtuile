/**
 * Iconographie : une seule famille linéaire SVG (maquette v3+), tracés
 * monochromes en `currentColor`. Aucun asset de marque.
 */

const TRACES = {
  reglages:
    'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7.4-2.1.9.7-1.6 2.8-1.1-.4a6.9 6.9 0 0 1-1.9 1.1l-.2 1.2h-3.2l-.2-1.2a6.9 6.9 0 0 1-1.9-1.1l-1.1.4-1.6-2.8.9-.7a6.9 6.9 0 0 1 0-2.2l-.9-.7 1.6-2.8 1.1.4a6.9 6.9 0 0 1 1.9-1.1l.2-1.2h3.2l.2 1.2a6.9 6.9 0 0 1 1.9 1.1l1.1-.4 1.6 2.8-.9.7a6.9 6.9 0 0 1 0 2.2Z',
  retour: 'M15 5l-7 7 7 7',
  plus: 'M12 5v14M5 12h14',
  soleil:
    'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-13v2m0 14v2M4.2 4.2l1.4 1.4m12.8 12.8 1.4 1.4M3 12h2m14 0h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  lune: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z',
  ecran: 'M4 5h16v11H4zM9 20h6M12 16v4',
  base: 'M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3Zm-8 3v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  cadenas: 'M6 11h12v9H6zM9 11V8a3 3 0 0 1 6 0v3',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-9v5m0-8v.5',
  tuile: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  liste: 'M4 6h16M4 12h16M4 18h16',
  recherche: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Zm5-1.5 5 5',
  fermer: 'M6 6l12 12M18 6 6 18',
  coche: 'm5 12.5 5 5L19 7',
  chevron: 'm6 9 6 6 6-6',
  externe: 'M7 17 17 7M9 7h8v8',
  telephone:
    'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z',
  courrier: 'M3 6h18v12H3zM3 7l9 6 9-6',
  carte: 'M3 6h18v12H3zM3 10h18M7 15h4',
  cloche: 'M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15L6 16ZM10 19a2.2 2.2 0 0 0 4 0',
  chevronDroit: 'm9 5.5 6.5 6.5L9 18.5',
} as const;

export type NomIcone = keyof typeof TRACES;

interface Props {
  nom: NomIcone;
  taille?: number;
  /** icône décorative par défaut ; fournir un libellé pour la rendre lisible */
  titre?: string;
}

export function Icone({ nom, taille = 20, titre }: Props) {
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={titre ? undefined : true}
      role={titre ? 'img' : undefined}
    >
      {titre ? <title>{titre}</title> : null}
      <path d={TRACES[nom]} />
    </svg>
  );
}
