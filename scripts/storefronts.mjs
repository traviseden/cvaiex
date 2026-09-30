import { readFile, writeFile, rename, access, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertStorefrontCatalog } from '../src/lib/storefront-catalog.mjs';

const destination = process.env.STOREFRONT_CATALOG_PATH ? pathToFileURL(resolve(process.env.STOREFRONT_CATALOG_PATH)) : new URL('../public/data/storefronts.json', import.meta.url);
const publicRoot = fileURLToPath(new URL('../public/', import.meta.url));
const [command = 'validate', incomingPath, flag, expectedRevision] = process.argv.slice(2);
const current = assertStorefrontCatalog(JSON.parse(await readFile(destination, 'utf8')));
async function checkAssets(catalog) {
  for (const image of catalog.media) await access(resolve(publicRoot, image.src.slice(1)));
}
if (command === 'validate') {
  await checkAssets(current);
  console.log(`Catalog revision ${current.revision}: ${current.businesses.length} businesses, ${current.slots.length} slots, ${current.media.length} local photos. Valid.`);
} else if (command === 'replace') {
  if (!incomingPath || flag !== '--expected-revision' || Number(expectedRevision) !== current.revision) throw new Error('Usage: npm run storefronts:replace -- /path/to/catalog.json --expected-revision CURRENT_REVISION');
  const incoming = assertStorefrontCatalog(JSON.parse(await readFile(resolve(incomingPath), 'utf8')));
  if (incoming.revision !== current.revision + 1) throw new Error('Incoming revision must be the current revision plus one');
  await checkAssets(incoming);
  const lock = `${fileURLToPath(destination)}.lock`;
  try { await mkdir(lock); } catch (error) { if (error.code === 'EEXIST') throw new Error('Another storefront replacement is in progress'); throw error; }
  const temp = `${fileURLToPath(destination)}.tmp-${process.pid}`;
  try {
    // Hold the lock during the compare-and-replace to avoid lost bot updates.
    const latest = JSON.parse(await readFile(destination, 'utf8'));
    if (latest.revision !== current.revision) throw new Error('Catalog changed during validation; retry with the latest revision');
    await writeFile(temp, `${JSON.stringify(incoming, null, 2)}\n`);
    await rename(temp, destination);
  } finally { await rm(temp, { force: true }); await rm(lock, { recursive: true, force: true }); }
  console.log(`Published catalog revision ${incoming.revision}. Rebuild the static site to refresh directory pages.`);
} else throw new Error('Unknown command. Use validate or replace.');
