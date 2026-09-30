import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { julianDate, localSiderealDegrees, precessJ2000, horizontalVector } from '../src/lib/astronomy.mjs';

const j2000 = new Date('2000-01-01T12:00:00Z');
const close = (actual, expected, tolerance = 1e-7) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} should be near ${expected}`);
test('J2000 and Greenwich sidereal reference agree with the Meeus epoch', () => {
  close(julianDate(j2000), 2451545);
  close(localSiderealDegrees(j2000, 0), 280.46061837);
  close(localSiderealDegrees(j2000, -78.489), 201.97161837);
});
test('the celestial sky rotates at sidereal rather than solar rate', () => {
  const nextDay = new Date(j2000.getTime() + 86400000);
  const delta = (localSiderealDegrees(nextDay, 0) - localSiderealDegrees(j2000, 0) + 360) % 360;
  close(delta, .98564736629, 1e-6);
  const siderealDay = new Date(j2000.getTime() + 86164091);
  close(localSiderealDegrees(siderealDay, 0), localSiderealDegrees(j2000, 0), .001);
});
test('world axes put the meridian overhead, rising stars east, and the pole north', () => {
  const latitude = 38.03, longitude = -78.489;
  const meridian = localSiderealDegrees(j2000, longitude);
  const zenith = horizontalVector(meridian, latitude, j2000, latitude, longitude);
  close(zenith[0], 0); close(zenith[1], 1); close(zenith[2], 0);
  const east = horizontalVector(meridian + 90, 0, j2000, latitude, longitude);
  close(east[0], 1); close(east[1], 0); close(east[2], 0);
  const pole = horizontalVector(0, 90, j2000, latitude, longitude);
  close(pole[0], 0); close(pole[1], Math.sin(latitude * Math.PI / 180));
  assert.ok(pole[2] < 0, 'north is negative world Z');
});
test('precession preserves J2000 positions and matches a published Meeus worked example', () => {
  const [ra, dec] = precessJ2000(123.45, -42, j2000);
  close(ra, 123.45); close(dec, -42);
  // Theta Persei example (without the example's proper-motion correction).
  const [futureRA, futureDec] = precessJ2000(41.0499416667, 49.2284666667, new Date('2028-11-13T04:33:36Z'));
  assert.ok(futureRA > 41.54 && futureRA < 41.56);
  assert.ok(futureDec > 49.34 && futureDec < 49.36);
});
test('snapshot includes catalog stars and all 88 distinct constellation outlines', async () => {
  const sky = JSON.parse(await readFile(new URL('../public/data/sky.json', import.meta.url), 'utf8'));
  assert.equal(sky.stars.length, sky.metadata.stars);
  assert.equal(new Set(sky.constellations.map(c => c.id)).size, 88);
  assert.ok(sky.stars.length > 5000);
  for (const star of sky.stars) {
    assert.equal(star.length, 5); assert.ok(star.every(Number.isFinite));
    assert.ok(Math.abs(star[1]) <= 180 && Math.abs(star[2]) <= 90);
  }
});
