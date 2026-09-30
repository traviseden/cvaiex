import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join, resolve } from 'node:path';
import { validateStorefrontCatalog, occupiedStorefronts } from '../src/lib/storefront-catalog.mjs';
import { moveWalker } from '../src/lib/walk-motion.mjs';

const catalog = JSON.parse(await readFile(new URL('../public/data/storefronts.json', import.meta.url), 'utf8'));
test('a tenant can be replaced without changing its physical storefront slot', () => {
  const changed = structuredClone(catalog);
  changed.businesses.push({ ...changed.businesses[0], id: 'a-new-coffee-shop', name: 'A New Coffee Shop' });
  changed.slots[0].businessId = 'a-new-coffee-shop';
  assert.deepEqual(validateStorefrontCatalog(changed), []);
  const entry = occupiedStorefronts(changed).find(entry => entry.slot.id === catalog.slots[0].id);
  assert.equal(entry.business.name, 'A New Coffee Shop');
  assert.equal(entry.slot.along, catalog.slots[0].along);
  assert.equal(entry.slot.width, catalog.slots[0].width);
});
test('invalid references, executable URLs, duplicate IDs, and overlapping slots are rejected', () => {
  const invalid = structuredClone(catalog);
  invalid.slots[0].businessId = 'missing';
  invalid.businesses[0].website = 'javascript:alert(1)';
  invalid.businesses.push(invalid.businesses[1]);
  invalid.slots[0].along = invalid.slots[3].along;
  const errors = validateStorefrontCatalog(invalid).join('\n');
  assert.match(errors, /missing business/); assert.match(errors, /HTTPS/); assert.match(errors, /Duplicate/); assert.match(errors, /Overlapping/);
});
test('vacant and closed storefronts do not advertise an active tenant', () => {
  const changed = structuredClone(catalog);
  changed.slots[0].businessId = null;
  changed.businesses[1].operatingStatus = 'closed';
  assert.deepEqual(validateStorefrontCatalog(changed), []);
  assert.equal(occupiedStorefronts(changed).find(entry => entry.slot.id === changed.slots[0].id).business, null);
  assert.ok(!occupiedStorefronts(changed).some(entry => entry.business?.id === changed.businesses[1].id));
});
test('walking cannot tunnel through obstacles or leave the boundary, and slides along walls', () => {
  const bounds = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };
  const wall = [{ minX: -4, maxX: 4, minZ: -1, maxZ: 1 }];
  const stopped = moveWalker({ x: 0, z: 5 }, { x: 0, z: -20 }, bounds, wall);
  assert.ok(stopped.z >= 1.35);
  const slid = moveWalker({ x: 0, z: 1.4 }, { x: 3, z: -3 }, bounds, wall);
  assert.ok(slid.x > 2.5 && slid.z >= 1.35);
  const edge = moveWalker({ x: 0, z: 5 }, { x: 30, z: 30 }, bounds, []);
  assert.ok(edge.x <= 9.65 && edge.z <= 9.65);
});
test('bot replacement is atomic and rejects stale revisions without changing the catalog', async () => {
  await mkdir('test-results', { recursive: true });
  const folder = await mkdtemp(join(resolve('test-results'), 'catalog-'));
  const destination = join(folder, 'storefronts.json'), incoming = join(folder, 'incoming.json');
  const run = promisify(execFile);
  try {
    await writeFile(destination, JSON.stringify(catalog));
    const changed = structuredClone(catalog); changed.revision++; changed.businesses[0].name = 'Updated Coffee Sign';
    await writeFile(incoming, JSON.stringify(changed));
    const env = { ...process.env, STOREFRONT_CATALOG_PATH: destination };
    await run(process.execPath, ['scripts/storefronts.mjs', 'replace', incoming, '--expected-revision', String(catalog.revision)], { env });
    assert.equal(JSON.parse(await readFile(destination, 'utf8')).businesses[0].name, 'Updated Coffee Sign');
    await assert.rejects(run(process.execPath, ['scripts/storefronts.mjs', 'replace', incoming, '--expected-revision', String(catalog.revision)], { env }));
    assert.equal(JSON.parse(await readFile(destination, 'utf8')).revision, changed.revision);
  } finally { await rm(folder, { recursive: true, force: true }); }
});
