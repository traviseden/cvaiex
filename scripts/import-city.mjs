import { mkdir, writeFile, rename } from 'node:fs/promises';
import { cityRegion } from '../src/data/regions.mjs';
import { project as projectMeters } from '../src/lib/navigation.mjs';

// A bounded, versioned snapshot: no GIS requests are made by visitors.
const service = 'https://gisweb.charlottesville.org/cvgisweb/rest/services/OpenData_1/MapServer';
const { bounds, origin } = cityRegion;
const round = n => Math.round(n * 100) / 100;
const project = coordinates => projectMeters(coordinates).map(round);

async function query(layer, fields) {
  const features = [];
  for (let offset = 0; ; offset += 1000) {
    const params = new URLSearchParams({
      where: '1=1', geometry: bounds.join(','), geometryType: 'esriGeometryEnvelope',
      inSR: '4326', spatialRel: 'esriSpatialRelIntersects', outSR: '4326',
      outFields: fields, f: 'geojson', resultOffset: String(offset), resultRecordCount: '1000',
      orderByFields: 'OBJECTID', geometryPrecision: '6',
    });
    const response = await fetch(`${service}/${layer}/query?${params}`, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`GIS request failed: ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.features)) throw new Error(JSON.stringify(data));
    features.push(...data.features);
    if (data.features.length < 1000) break;
  }
  return features;
}

const [buildings, roads] = await Promise.all([
  query(59, 'OBJECTID,BIN,HeightFt'),
  query(29, 'OBJECTID'),
]);
let sourcedHeights = 0;
const structures = buildings.flatMap(feature => {
  const polygons = feature.geometry?.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry?.type === 'MultiPolygon' ? feature.geometry.coordinates : [];
  const validHeight = Number.isFinite(feature.properties.HeightFt) && feature.properties.HeightFt > 0 && feature.properties.HeightFt < 500;
  if (validHeight) sourcedHeights++;
  return polygons.map(rings => ({
    id: feature.properties.BIN ?? feature.properties.OBJECTID,
    h: round(validHeight ? feature.properties.HeightFt * 0.3048 : 7),
    estimated: !validHeight,
    rings: rings.map(ring => ring.map(project)),
  }));
});
const lines = roads.flatMap(feature => {
  const geometry = feature.geometry;
  const paths = geometry?.type === 'LineString' ? [geometry.coordinates] : geometry?.type === 'MultiLineString' ? geometry.coordinates : [];
  return paths.map(path => path.map(project));
});
const metadata = {
  retrievedAt: new Date().toISOString(), bounds, origin,
  buildings: buildings.length, polygons: structures.length, sourcedHeights,
  estimatedHeights: buildings.length - sourcedHeights, roadSegments: lines.length,
  sources: [
    { name: 'City of Charlottesville — Existing Structure Area', url: `${service}/59`, license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', item: '431d3b5cde454e9f9c65725cc2f44c97' },
    { name: 'City of Charlottesville — Road Centerlines', url: `${service}/29`, license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', item: '5ea50546852444a890dc55c9d68104f8', attribution: 'City of Charlottesville Open Data Portal' },
  ],
};
await mkdir(new URL('../public/data/', import.meta.url), { recursive: true });
// Write atomically so a failed refresh never replaces the working snapshot.
const file = new URL('../public/data/city.json', import.meta.url);
await writeFile(`${file.pathname}.tmp`, JSON.stringify({ metadata, buildings: structures, roads: lines }));
await rename(`${file.pathname}.tmp`, file);
await writeFile(new URL('../public/data/city-metadata.json', import.meta.url), JSON.stringify(metadata, null, 2));
console.log(`Imported ${structures.length} building polygons (${sourcedHeights} sourced heights), ${lines.length} road segments.`);
