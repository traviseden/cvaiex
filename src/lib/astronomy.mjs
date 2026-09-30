const radians = Math.PI / 180;
const degrees = 180 / Math.PI;
const wrap = value => ((value % 360) + 360) % 360;

export function julianDate(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

// Mean sidereal time (Meeus), east-positive longitude. UTC approximates UT1;
// the sub-second UT1 difference is immaterial for this visual sky.
export function localSiderealDegrees(date, longitude) {
  const days = julianDate(date) - 2451545;
  const t = days / 36525;
  return wrap(280.46061837 + 360.98564736629 * days + .000387933 * t * t - t * t * t / 38710000 + longitude);
}

// IAU 1976 precession from the catalog's J2000 mean equator to date.
// Nutation, refraction, aberration, and proper motion are intentionally omitted.
export function precessJ2000(raDegrees, decDegrees, date) {
  const t = (julianDate(date) - 2451545) / 36525;
  const zeta = (2306.2181 * t + .30188 * t * t + .017998 * t * t * t) / 3600 * radians;
  const z = (2306.2181 * t + 1.09468 * t * t + .018203 * t * t * t) / 3600 * radians;
  const theta = (2004.3109 * t - .42665 * t * t - .041833 * t * t * t) / 3600 * radians;
  const ra = raDegrees * radians, dec = decDegrees * radians;
  const a = Math.cos(dec) * Math.sin(ra + zeta);
  const b = Math.cos(theta) * Math.cos(dec) * Math.cos(ra + zeta) - Math.sin(theta) * Math.sin(dec);
  const c = Math.sin(theta) * Math.cos(dec) * Math.cos(ra + zeta) + Math.cos(theta) * Math.sin(dec);
  return [wrap((Math.atan2(a, b) + z) * degrees), Math.asin(Math.max(-1, Math.min(1, c))) * degrees];
}

export function equatorialVector(raDegrees, decDegrees) {
  const ra = raDegrees * radians, dec = decDegrees * radians;
  return [Math.cos(dec) * Math.cos(ra), Math.sin(dec), Math.cos(dec) * Math.sin(ra)];
}

// Rows of the transform into Three.js world axes: X east, Y up, Z south.
export function localSkyMatrix(date, latitude, longitude) {
  const lst = localSiderealDegrees(date, longitude) * radians, lat = latitude * radians;
  const s = Math.sin(lst), c = Math.cos(lst), sp = Math.sin(lat), cp = Math.cos(lat);
  return [-s, 0, c, cp * c, sp, cp * s, sp * c, -cp, sp * s];
}

export function horizontalVector(raDegrees, decDegrees, date, latitude, longitude) {
  const v = equatorialVector(raDegrees, decDegrees), m = localSkyMatrix(date, latitude, longitude);
  return [0, 1, 2].map(row => m[row * 3] * v[0] + m[row * 3 + 1] * v[1] + m[row * 3 + 2] * v[2]);
}
