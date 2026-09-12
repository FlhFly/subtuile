/**
 * Export ICS (EF-32, §5.4) : rappels vers le calendrier de l'appareil, en
 * remplacement fiable des notifications qu'une PWA ne peut pas planifier.
 * Événements « journée entière » au format RFC 5545, avec une alarme
 * d'affichage quelques jours avant. Module pur, sans accès au navigateur.
 */

import type { DateISO, Horodatage } from './types';

export interface RappelIcs {
  /** identifiant stable (repris tel quel dans UID) */
  uid: string;
  date: DateISO;
  titre: string;
  description: string;
  /** jours avant la date pour l'alarme ; null = pas d'alarme */
  alarmeJours: number | null;
}

export interface OptionsIcs {
  /** instant de génération (DTSTAMP) */
  horodatage: Horodatage;
  /** texte de l'alarme (« Rappel Subtuile ») */
  libelleAlarme: string;
}

const PRODID = '-//Subtuile//Subtuile//FR';
const DOMAINE_UID = 'subtuile';

/** Échappe une valeur de texte (RFC 5545 §3.3.11) : \ ; , et retours à la ligne. */
export function echapperTexteIcs(texte: string): string {
  return texte
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Plie les lignes de plus de 75 octets (RFC 5545 §3.1), continuation par un espace. */
export function plierLigneIcs(ligne: string): string[] {
  const encodeur = new TextEncoder();
  const morceaux: string[] = [];
  let courant = '';
  let octets = 0;
  for (const caractere of ligne) {
    const taille = encodeur.encode(caractere).length;
    const limite = morceaux.length === 0 ? 75 : 74;
    if (octets + taille > limite) {
      morceaux.push(courant);
      courant = caractere;
      octets = taille;
    } else {
      courant += caractere;
      octets += taille;
    }
  }
  morceaux.push(courant);
  return morceaux.map((m, i) => (i === 0 ? m : ` ${m}`));
}

function dateIcs(date: DateISO): string {
  return date.replace(/-/g, '');
}

function lendemain(date: DateISO): DateISO {
  const [a, m, j] = date.split('-').map(Number) as [number, number, number];
  const d = new Date(Date.UTC(a, m - 1, j + 1));
  return d.toISOString().slice(0, 10);
}

function horodatageIcs(instant: Horodatage): string {
  return new Date(instant)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

function declencheur(alarmeJours: number): string {
  return alarmeJours > 0 ? `-P${alarmeJours}D` : 'PT9H';
}

/** Fichier ICS complet (lignes terminées par CRLF), un VEVENT par rappel. */
export function genererIcs(rappels: readonly RappelIcs[], options: OptionsIcs): string {
  const lignes: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  const dtstamp = horodatageIcs(options.horodatage);
  for (const r of rappels) {
    lignes.push(
      'BEGIN:VEVENT',
      `UID:${r.uid}@${DOMAINE_UID}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${dateIcs(r.date)}`,
      `DTEND;VALUE=DATE:${dateIcs(lendemain(r.date))}`,
      `SUMMARY:${echapperTexteIcs(r.titre)}`,
    );
    if (r.description !== '') lignes.push(`DESCRIPTION:${echapperTexteIcs(r.description)}`);
    if (r.alarmeJours !== null) {
      lignes.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${echapperTexteIcs(options.libelleAlarme)}`,
        `TRIGGER;VALUE=DURATION:${declencheur(r.alarmeJours)}`,
        'END:VALARM',
      );
    }
    lignes.push('END:VEVENT');
  }
  lignes.push('END:VCALENDAR');
  return `${lignes.flatMap(plierLigneIcs).join('\r\n')}\r\n`;
}

/** Nom de fichier sûr : « Netflix (foyer) » → « netflix-foyer.ics ». */
export function nomFichierIcs(base: string): string {
  const slug = base
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug === '' ? 'rappel' : slug}.ics`;
}
