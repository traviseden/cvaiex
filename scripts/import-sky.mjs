import { mkdir, writeFile } from 'node:fs/promises';

const repository = 'ofrohn/d3-celestial';
const response = await fetch(`https://api.github.com/repos/${repository}/commits/master`);
if (!response.ok) throw new Error(`Could not pin sky data revision: ${response.status}`);
const { sha } = await response.json();
const base = `https://raw.githubusercontent.com/${repository}/${sha}/`;
async function download(path, json = true) {
  const result = await fetch(`${base}${path}`);
  if (!result.ok) throw new Error(`Sky source failed: ${path} (${result.status})`);
  return json ? result.json() : result.text();
}
const [catalog, outlines, license] = await Promise.all([
  download('data/stars.6.json'), download('data/constellations.lines.json'), download('LICENSE', false),
]);
const stars = catalog.features.map(feature => {
  const [ra, dec] = feature.geometry.coordinates;
  const magnitude = Number(feature.properties.mag);
  const bv = Number.parseFloat(feature.properties.bv);
  if (![ra, dec, magnitude].every(Number.isFinite)) throw new Error('Invalid catalog star');
  return [feature.id, ra, dec, magnitude, Number.isFinite(bv) ? bv : 0.65];
});
const constellations = outlines.features.map(feature => ({ id: feature.id, paths: feature.geometry.coordinates }));
const metadata = {
  retrievedAt: new Date().toISOString(), revision: sha, epoch: 'J2000.0',
  stars: stars.length, constellations: new Set(constellations.map(c => c.id)).size,
  columns: ['Hipparcos ID', 'right ascension degrees', 'declination degrees', 'apparent magnitude', 'B-V color index'],
  source: `https://github.com/${repository}/tree/${sha}/data`,
  starsCredit: 'XHIP: An Extended Hipparcos Compilation, Anderson & Francis (2012), VizieR V/137D; GeoJSON conversion by Olaf Frohn.',
  constellationsCredit: 'IAU constellation resources and line modifications by Olaf Frohn, distributed in d3-celestial.',
  repositoryLicense: 'BSD-3-Clause', licenseFile: '/data/sky-LICENSE.txt',
  modifications: 'Compact tuples, normalized numeric attributes; no star coordinates changed in the snapshot. Browser applies precession and local sidereal rotation.',
};
await mkdir(new URL('../public/data/', import.meta.url), { recursive: true });
await writeFile(new URL('../public/data/sky.json', import.meta.url), JSON.stringify({ metadata, stars, constellations }));
await writeFile(new URL('../public/data/sky-metadata.json', import.meta.url), JSON.stringify(metadata, null, 2));
await writeFile(new URL('../public/data/sky-LICENSE.txt', import.meta.url), license);
console.log(`Imported ${stars.length} catalog stars and ${metadata.constellations} constellations at ${sha}.`);
