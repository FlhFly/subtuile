/** Identifiants uuid v4 (§3.5), sans dépendance : API native du navigateur et de Node. */

const HEX = '0123456789abcdef';

function uuidDeRepli(): string {
  // Repli si crypto.randomUUID est absent (anciens WebView) : v4 sur getRandomValues.
  const octets = new Uint8Array(16);
  crypto.getRandomValues(octets);
  octets[6] = ((octets[6] ?? 0) & 0x0f) | 0x40;
  octets[8] = ((octets[8] ?? 0) & 0x3f) | 0x80;
  let s = '';
  octets.forEach((o, i) => {
    if (i === 4 || i === 6 || i === 8 || i === 10) s += '-';
    s += HEX[o >> 4] ?? '0';
    s += HEX[o & 0x0f] ?? '0';
  });
  return s;
}

export function nouvelId(): string {
  return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : uuidDeRepli();
}
