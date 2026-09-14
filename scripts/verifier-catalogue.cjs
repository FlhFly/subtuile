#!/usr/bin/env node
/**
 * Vérification du catalogue (C16) : contrôles de structure, puis test de
 * réponse de chaque adresse (page de gestion, liens profonds http). Écrit le
 * rapport dans docs/catalogue-verification.md et résume dans la console.
 *
 *   node scripts/verifier-catalogue.cjs            # structure + réseau
 *   node scripts/verifier-catalogue.cjs --sans-reseau
 *
 * Aucune dépendance : fetch natif de Node ≥ 18. Les sites protégés contre les
 * robots répondent souvent 403 : le rapport le signale sans conclure.
 */
const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const catalogue = require(path.join(RACINE, 'src/data/refdata/catalogue.json'));
const SANS_RESEAU = process.argv.includes('--sans-reseau');
const CATEGORIES = [
  'streaming',
  'musique',
  'ia',
  'cloud',
  'productivite',
  'sport',
  'presse',
  'gaming',
  'securite',
  'vie_courante',
  'autre',
];
const CANAUX = ['direct', 'app_store', 'google_play'];
const MODES = ['lien', 'espace_client', 'telephone', 'courrier_recommande'];
const DEVISES = ['EUR', 'USD', 'GBP', 'CHF'];
const DELAI_MS = 12000;
const PARALLELE = 6;
const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';

/* ----- Structure ----- */
const memePeriodicite = (a, b) =>
  a.type === b.type &&
  (a.type !== 'recurrente' || (a.unite === b.unite && a.intervalle === b.intervalle));

function controlerStructure(services) {
  const problemes = [];
  const ids = new Set();
  const idsFormules = new Set();
  for (const s of services) {
    const p = (message) => problemes.push({ id: s.id, message });
    if (ids.has(s.id)) p('identifiant en double');
    ids.add(s.id);
    if (!CATEGORIES.includes(s.categorie)) p(`catégorie inconnue « ${s.categorie} »`);
    if (!/^#[0-9a-f]{6}$/i.test(s.couleur)) p(`couleur invalide « ${s.couleur} »`);
    if (!s.logo || s.logo.type !== 'initiales' || !s.logo.valeur || s.logo.valeur.length > 2) {
      p('logo : initiales attendues (1 à 2 caractères)');
    }
    const mode = s.modeResiliation || 'lien';
    if (!MODES.includes(mode)) p(`mode de résiliation inconnu « ${mode} »`);
    if (mode === 'lien' && !s.urlGestion && !Object.keys(s.deepLinks || {}).length) {
      p('mode « lien » sans adresse de gestion ni lien profond');
    }
    if ((mode === 'telephone' || mode === 'courrier_recommande') && !s.contactResiliation) {
      p(`mode « ${mode} » sans contact`);
    }
    if (!Array.isArray(s.periodicitesConnues) || s.periodicitesConnues.length === 0) {
      p('aucune périodicité connue');
    }
    for (const f of s.formules || []) {
      if (idsFormules.has(f.id)) p(`formule « ${f.id} » en double`);
      idsFormules.add(f.id);
      if (!(f.prix > 0)) p(`formule « ${f.id} » : prix non positif`);
      if (!CANAUX.includes(f.canal)) p(`formule « ${f.id} » : canal inconnu « ${f.canal} »`);
      if (f.devise !== undefined && !DEVISES.includes(f.devise)) {
        p(`formule « ${f.id} » : devise inconnue « ${f.devise} »`);
      }
      if (!(s.periodicitesConnues || []).some((q) => memePeriodicite(q, f.periodicite))) {
        p(`formule « ${f.id} » : périodicité absente des périodicités connues`);
      }
    }
    for (const [canal, lien] of Object.entries(s.deepLinks || {})) {
      if (!CANAUX.includes(canal)) p(`lien profond : canal inconnu « ${canal} »`);
      if (typeof lien !== 'string' || lien === '') p(`lien profond « ${canal} » vide`);
    }
  }
  return problemes;
}

/* ----- Réseau ----- */
async function tester(url) {
  const depart = Date.now();
  try {
    const reponse = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9',
      },
      signal: AbortSignal.timeout(DELAI_MS),
    });
    const duree = Date.now() - depart;
    const hoteDemande = new URL(url).hostname.replace(/^www\./, '');
    const hoteFinal = new URL(reponse.url || url).hostname.replace(/^www\./, '');
    const domaineChange =
      hoteDemande !== hoteFinal &&
      !hoteFinal.endsWith(`.${hoteDemande}`) &&
      !hoteDemande.endsWith(`.${hoteFinal}`);
    let verdict;
    if (reponse.ok) verdict = domaineChange ? `OK, redirigé vers ${hoteFinal}` : 'OK';
    else if (reponse.status === 403 || reponse.status === 429)
      verdict = `HTTP ${reponse.status} (anti-robot probable)`;
    else verdict = `HTTP ${reponse.status}`;
    return { verdict, statut: reponse.status, final: reponse.url, duree, ok: reponse.ok };
  } catch (e) {
    const cause =
      e && e.name === 'TimeoutError'
        ? 'délai dépassé'
        : (e && e.cause && e.cause.code) || (e && e.message) || 'erreur';
    return {
      verdict: `injoignable (${cause})`,
      statut: 0,
      final: url,
      duree: Date.now() - depart,
      ok: false,
    };
  }
}

async function testerTous(cibles) {
  const resultats = new Map();
  let index = 0;
  async function ouvrier() {
    while (index < cibles.length) {
      const url = cibles[index++];
      resultats.set(url, await tester(url));
      process.stdout.write('.');
    }
  }
  await Promise.all(Array.from({ length: PARALLELE }, ouvrier));
  process.stdout.write('\n');
  return resultats;
}

/* ----- Rapport ----- */
const echapper = (t) => String(t ?? '').replace(/\|/g, '\\|');

async function main() {
  const services = catalogue.data;
  const problemes = controlerStructure(services);
  const cibles = [];
  for (const s of services) {
    if (s.urlGestion && /^https?:/.test(s.urlGestion)) cibles.push(s.urlGestion);
    for (const lien of Object.values(s.deepLinks || {})) {
      if (/^https?:/.test(lien) && !cibles.includes(lien)) cibles.push(lien);
    }
  }
  const resultats = SANS_RESEAU ? new Map() : await testerTous(cibles);

  const aujourdhui = new Date().toISOString().slice(0, 10);
  const nbFormules = services.reduce((n, s) => n + (s.formules || []).length, 0);
  const sansFormule = services.filter((s) => !(s.formules || []).length).length;
  const verifies = services.filter((s) => s.verifieLe).length;
  const lignesOk = [...resultats.values()].filter((r) => r.ok).length;

  const lignes = [];
  lignes.push('# Vérification du catalogue');
  lignes.push('');
  lignes.push(
    `Rapport généré le ${aujourdhui} par \`scripts/verifier-catalogue.cjs\` — catalogue v${catalogue.version}, tarifs indicatifs au ${catalogue.publieLe}.`,
  );
  lignes.push('');
  lignes.push('## Résumé');
  lignes.push('');
  lignes.push(
    `- ${services.length} services, ${nbFormules} formules ; ${sansFormule} services sans formule ; ${verifies} services revus manuellement (\`verifieLe\`).`,
  );
  lignes.push(
    `- Structure : ${problemes.length === 0 ? 'aucun problème' : `${problemes.length} problème(s)`}.`,
  );
  lignes.push(
    SANS_RESEAU
      ? '- Réseau : non testé (`--sans-reseau`).'
      : `- Réseau : ${cibles.length} adresses testées, ${lignesOk} répondent 2xx ; les 403 / 429 viennent le plus souvent d'une protection anti-robot et se vérifient à la main.`,
  );
  lignes.push('');
  if (problemes.length > 0) {
    lignes.push('## Problèmes de structure');
    lignes.push('');
    for (const p of problemes) lignes.push(`- \`${p.id}\` : ${p.message}`);
    lignes.push('');
  }
  lignes.push('## Services');
  lignes.push('');
  lignes.push('| Service | Catégorie | Formules | Adresse de gestion | Réponse | Vérifié le |');
  lignes.push('|---|---|---|---|---|---|');
  for (const s of services) {
    const r = s.urlGestion ? resultats.get(s.urlGestion) : undefined;
    const reponse = !s.urlGestion
      ? s.modeResiliation && s.modeResiliation !== 'lien'
        ? `— (${s.modeResiliation})`
        : '— (lien profond)'
      : r
        ? r.verdict
        : 'non testé';
    lignes.push(
      `| ${echapper(s.nom)}${s.populaire ? ' ★' : ''} (\`${s.id}\`) | ${s.categorie} | ${(s.formules || []).length} | ${s.urlGestion ? `<${s.urlGestion}>` : '—'} | ${echapper(reponse)} | ${s.verifieLe || '—'} |`,
    );
  }
  const liensProfonds = [...resultats.entries()].filter(
    ([url]) => !services.some((s) => s.urlGestion === url),
  );
  if (liensProfonds.length > 0) {
    lignes.push('');
    lignes.push('## Liens profonds (magasins)');
    lignes.push('');
    for (const [url, r] of liensProfonds) lignes.push(`- <${url}> : ${r.verdict}`);
  }
  lignes.push('');
  const rapport = lignes.join('\n');
  const sortie = path.join(RACINE, 'docs', 'catalogue-verification.md');
  fs.writeFileSync(sortie, rapport);

  console.log(
    `\nServices : ${services.length} · formules : ${nbFormules} · sans formule : ${sansFormule}`,
  );
  console.log(`Structure : ${problemes.length} problème(s)`);
  for (const p of problemes) console.log(`  - ${p.id} : ${p.message}`);
  if (!SANS_RESEAU) {
    const parVerdict = {};
    for (const r of resultats.values()) {
      const cle = r.ok ? 'OK' : r.verdict.replace(/ \(.*$/, '');
      parVerdict[cle] = (parVerdict[cle] || 0) + 1;
    }
    console.log('Réseau :', JSON.stringify(parVerdict));
    for (const [url, r] of resultats) if (!r.ok) console.log(`  - ${url} : ${r.verdict}`);
  }
  console.log(`Rapport : ${path.relative(process.cwd(), sortie)}`);
  process.exitCode = problemes.length > 0 ? 1 : 0;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 2;
});
