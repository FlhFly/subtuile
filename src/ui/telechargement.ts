/** Téléchargement réel d'un fichier généré localement (ICS, plus tard JSON / CSV). */

export function telechargerFichier(nom: string, contenu: string, type: string): void {
  const blob = new Blob([contenu], { type });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nom;
  lien.rel = 'noopener';
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  // laisser au navigateur le temps de démarrer le téléchargement avant de libérer l'URL
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
