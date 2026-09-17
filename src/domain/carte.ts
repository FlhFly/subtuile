/**
 * Garde contre la saisie d'un numéro de carte complet (revue RGPD du
 * 2026-09-16, CdC §3.3) : l'app ne doit jamais contenir un numéro de carte,
 * seuls les 4 derniers chiffres sont prévus. Détection locale par longueur
 * (13 à 19 chiffres) et clé de Luhn ; espaces, tirets et points tolérés
 * entre les chiffres.
 */

const SEPARATEURS = /[ .-]/g;
/** 13 à 19 chiffres, avec au plus un séparateur entre deux chiffres. */
const SUITE_DE_CHIFFRES = /\d(?:[ .-]?\d){12,18}/g;

/** Clé de Luhn sur une suite de 13 à 19 chiffres. */
export function luhnValide(chiffres: string): boolean {
  if (!/^\d{13,19}$/.test(chiffres)) return false;
  let somme = 0;
  let doubler = false;
  for (let i = chiffres.length - 1; i >= 0; i -= 1) {
    let n = Number(chiffres[i]);
    if (doubler) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    somme += n;
    doubler = !doubler;
  }
  return somme % 10 === 0;
}

/** Suites de chiffres du texte qui ressemblent à un numéro de carte. */
export function numerosDeCarte(texte: string): string[] {
  return (texte.match(SUITE_DE_CHIFFRES) ?? []).filter((s) =>
    luhnValide(s.replace(SEPARATEURS, '')),
  );
}

export function contientNumeroDeCarte(texte: string): boolean {
  return numerosDeCarte(texte).length > 0;
}

/** Remplace chaque numéro détecté par « ···· » suivi de ses 4 derniers chiffres. */
export function masquerNumerosDeCarte(texte: string): string {
  return texte.replace(SUITE_DE_CHIFFRES, (s) => {
    const chiffres = s.replace(SEPARATEURS, '');
    return luhnValide(chiffres) ? `···· ${chiffres.slice(-4)}` : s;
  });
}

/** Valeur importée → 4 derniers chiffres seulement (chiffres extraits), sinon null. */
export function quatreDerniersDepuis(valeur: unknown): string | null {
  if (typeof valeur !== 'string') return null;
  const chiffres = valeur.replace(/\D/g, '');
  return chiffres.length >= 4 ? chiffres.slice(-4) : null;
}
