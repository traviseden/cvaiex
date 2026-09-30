import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { project, searchPlaces } from '../src/lib/navigation.mjs';

const places = [
  { name: 'Studio IX', aliases: ['studio icks', 'studio nine', 'studio 9', 'ai explorers'] },
  { name: 'UVA School of Data Science', aliases: ['uva', 'data science', 'becamp'] },
  { name: 'Downtown Mall', aliases: ['downtown'] },
];
test('destination commands resolve aliases without treating unknown destinations as matches', () => {
  assert.equal(searchPlaces('Please take me to Studio Nine', places)[0].name, 'Studio IX');
  assert.equal(searchPlaces('fly to UVA', places)[0].name, 'UVA School of Data Science');
  assert.equal(searchPlaces('Take me to Studio Icks', places)[0].name, 'Studio IX');
  assert.equal(searchPlaces('AI explorers', places)[0].name, 'Studio IX');
  assert.deepEqual(searchPlaces('Monticello', places), []);
});
test('local coordinates preserve meter scale and north/east orientation', () => {
  assert.deepEqual(project([-78.489, 38.030]), [0, -0]);
  const [east, north] = project([-78.488, 38.031]);
  assert.ok(east > 87 && east < 89);
  assert.ok(north < -111 && north > -112);
});
test('city snapshot has valid geometry, explicit estimated heights, and consistent record counts', async () => {
  const city = JSON.parse(await readFile(new URL('../public/data/city.json', import.meta.url), 'utf8'));
  assert.equal(city.buildings.length, city.metadata.polygons);
  assert.equal(city.metadata.sourcedHeights + city.metadata.estimatedHeights, city.metadata.buildings);
  assert.equal(city.roads.length, city.metadata.roadSegments);
  for (const building of city.buildings) {
    assert.ok(building.h > 0 && building.h < 153);
    assert.equal(typeof building.estimated, 'boolean');
    assert.ok(building.rings.length > 0);
    for (const ring of building.rings) {
      assert.ok(ring.length >= 4);
      assert.deepEqual(ring[0], ring.at(-1));
      assert.ok(ring.every(point => point.length === 2 && point.every(Number.isFinite)));
    }
  }
});
