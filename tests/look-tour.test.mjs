import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { lookWithKeys } from '../src/lib/look-controls.mjs';
import { mallLayout } from '../src/lib/mall-layout.mjs';
import { createTourState } from '../src/lib/tour-state.mjs';
import { validateStorefrontCatalog } from '../src/lib/storefront-catalog.mjs';
import { places } from '../src/data/content.ts';

test('arrow keys turn the gaze; WASD does not change yaw or pitch', () => {
  assert.deepEqual(lookWithKeys(0, 0, new Set(['KeyW', 'KeyA']), 1), { yaw: 0, pitch: 0 });
  const left = lookWithKeys(0, 0, new Set(['ArrowLeft', 'ArrowUp']), 1);
  assert.ok(left.yaw > 0 && left.pitch > 0);
  const right = lookWithKeys(0, 0, new Set(['ArrowRight', 'ArrowDown']), 1);
  assert.ok(right.yaw < 0 && right.pitch < 0);
  assert.deepEqual(lookWithKeys(0, 0, new Set(['ArrowLeft', 'ArrowRight']), 1), { yaw: 0, pitch: 0 });
  assert.ok(lookWithKeys(0, 1, new Set(['ArrowUp']), 20).pitch <= 1.3);
});

test('the mall keeps trees central, walking lanes outside them, and the pavilion within the walk', async () => {
  const catalog = JSON.parse(await readFile(new URL('../public/data/storefronts.json', import.meta.url), 'utf8'));
  const layout = mallLayout(catalog);
  assert.ok(layout.width >= 36);
  assert.ok(layout.walkLane > layout.treeOffset + 3 && layout.walkLane < layout.halfWidth - 2);
  assert.ok(catalog.landmarks.some(l => l.kind === 'pavilion' && l.along < layout.end));
  assert.ok(catalog.landmarks.some(l => l.kind === 'chalkboard'));
  assert.deepEqual(validateStorefrontCatalog(catalog), []);
  const invalid = structuredClone(catalog); invalid.musicVenues[0].performers[0].date = '2099-01-01';
  assert.match(validateStorefrontCatalog(invalid).join('\n'), /past performers/);
});

test('tour pauses do not advance stops and entry is available only after arrival', () => {
  const tour = createTourState(5); tour.go(0);
  assert.equal(tour.canEnter, false); tour.pause();
  assert.equal(tour.state.phase, 'held'); tour.arrive();
  assert.equal(tour.state.phase, 'held'); assert.equal(tour.state.index, 0);
  tour.resume(); tour.arrive();
  assert.equal(tour.canEnter, true); assert.equal(tour.state.phase, 'stop');
  tour.go(1); assert.equal(tour.canEnter, false); tour.arrive();
  assert.equal(tour.state.index, 1); tour.end(); assert.equal(tour.active, false);
  assert.throws(() => tour.go(5), /out of range/);
});

test('the community circuit references available places and valid camera legs', async () => {
  const tour = JSON.parse(await readFile(new URL('../public/data/community-tour.json', import.meta.url), 'utf8'));
  assert.deepEqual(tour.stops.map(s => s.placeId), ['studio-ix', 'downtown-mall', 'ting-pavilion', 'kardinal-hall', 'uva-data-science']);
  for (const stop of tour.stops) {
    assert.ok(places.some(place => place.id === stop.placeId && place.room));
    assert.ok(stop.cameraOffset.length === 3 && stop.cameraOffset.every(Number.isFinite));
    assert.ok(stop.durationMs >= 1000);
  }
});
