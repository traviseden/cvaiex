const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const colorPattern = /^#[0-9a-f]{6}$/i;
const url = value => { try { return new URL(value).protocol === 'https:'; } catch { return false; } };
const text = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 3000;
const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value) && Number.isFinite(Date.parse(value));

export function validateStorefrontCatalog(catalog) {
  const errors = [];
  const check = (condition, message) => { if (!condition) errors.push(message); };
  if (!catalog || typeof catalog !== 'object') return ['Catalog must be an object'];
  check(catalog.schemaVersion === 1, 'schemaVersion must be 1');
  check(Number.isInteger(catalog.revision) && catalog.revision > 0, 'revision must be a positive integer');
  check(date(catalog.updatedAt), 'updatedAt must be an ISO date');
  check(catalog.district?.id === 'downtown-mall', 'district.id must be downtown-mall');
  check(text(catalog.district?.name) && text(catalog.district?.description) && text(catalog.district?.layoutNote), 'District needs name, description, and layoutNote');
  check(Number.isFinite(catalog.district?.length) && catalog.district.length >= 40 && catalog.district.length <= 2000, 'District length must be 40–2000 meters');
  for (const key of ['businesses', 'slots', 'media']) check(Array.isArray(catalog[key]), `${key} must be an array`);
  if (errors.length) return errors;
  const ids = {};
  for (const key of ['businesses', 'slots', 'media']) {
    ids[key] = new Set();
    for (const item of catalog[key]) {
      check(item && typeof item.id === 'string' && idPattern.test(item.id), `${key} item needs a stable lowercase slug ID`);
      if (!item) continue;
      check(!ids[key].has(item.id), `Duplicate ${key} ID: ${item.id}`); ids[key].add(item.id);
    }
  }
  for (const business of catalog.businesses.filter(Boolean)) {
    for (const field of ['name', 'category', 'address', 'description']) check(text(business[field]), `${business.id}.${field} must be plain text`);
    check(url(business.website), `${business.id}.website must be an HTTPS URL`);
    check(['listed', 'closed', 'unknown'].includes(business.operatingStatus), `${business.id}.operatingStatus is invalid`);
    check(date(business.verifiedAt), `${business.id}.verifiedAt must be an ISO date`);
    check(Array.isArray(business.sources) && business.sources.length > 0 && business.sources.every(url), `${business.id}.sources needs HTTPS source URLs`);
    check(Array.isArray(business.aliases) && business.aliases.every(text), `${business.id}.aliases must be plain text strings`);
    check(business.photoId === null || ids.media.has(business.photoId), `${business.id}.photoId refers to missing media`);
  }
  for (const image of catalog.media.filter(Boolean)) {
    check(typeof image.src === 'string' && /^\/media\/mall\/[a-z0-9-]+\.(jpg|png|webp)$/.test(image.src), `${image.id}.src must be a local mall image path`);
    for (const field of ['alt', 'creator', 'license', 'changes']) check(text(image[field]), `${image.id}.${field} is required`);
    check(url(image.source) && url(image.licenseUrl), `${image.id} needs HTTPS source and license URLs`);
    check(date(image.capturedAt), `${image.id}.capturedAt must be an ISO date`);
  }
  for (const slot of catalog.slots.filter(Boolean)) {
    check(text(slot.address), `${slot.id}.address is required`);
    check(['north', 'south'].includes(slot.side), `${slot.id}.side must be north or south`);
    check(Number.isFinite(slot.along) && slot.along >= 0 && slot.along <= catalog.district.length, `${slot.id}.along is outside the district`);
    check(Number.isFinite(slot.width) && slot.width >= 4 && slot.width <= 50 && Number.isFinite(slot.height) && slot.height >= 3 && slot.height <= 40, `${slot.id} has invalid dimensions`);
    check(slot.businessId === null || ids.businesses.has(slot.businessId), `${slot.id}.businessId refers to a missing business`);
    for (const color of ['brick', 'trim', 'accent']) check(colorPattern.test(slot.appearance?.[color]), `${slot.id}.appearance.${color} must be a six-digit hex color`);
    check(typeof slot.appearance?.awning === 'boolean', `${slot.id}.appearance.awning must be a boolean`);
    check(slot.appearance?.facadeImageId == null || ids.media.has(slot.appearance.facadeImageId), `${slot.id}.appearance.facadeImageId refers to missing media`);
  }
  for (const side of ['north', 'south']) {
    const sorted = catalog.slots.filter(s => s?.side === side).sort((a, b) => a.along - b.along);
    for (let i = 1; i < sorted.length; i++) check(sorted[i].along - sorted[i - 1].along >= (sorted[i].width + sorted[i - 1].width) / 2 + 1, `Overlapping storefront slots: ${sorted[i - 1].id}, ${sorted[i].id}`);
  }
  check(Array.isArray(catalog.district.sources) && catalog.district.sources.every(url), 'District sources must be HTTPS URLs');
  check(Array.isArray(catalog.district.facts) && catalog.district.facts.every(f => text(f.title) && text(f.text) && url(f.source)), 'District facts need title, text, and source');
  const street = catalog.district.streetscape;
  if (street) {
    check(Number.isFinite(street.width) && street.width >= 24 && street.width <= 80, 'Street width must be 24–80 meters');
    check(Number.isFinite(street.treeOffset) && street.treeOffset >= 0 && street.treeOffset <= street.width / 4, 'Trees must be within the central planting zone');
    check(Number.isFinite(street.treeSpacing) && street.treeSpacing >= 12 && street.treeSpacing <= 60, 'Tree spacing must be 12–60 meters');
    check(Number.isFinite(street.walkLane) && street.walkLane > street.treeOffset + 3 && street.walkLane < street.width / 2 - 2, 'Walking lane must be outside the trees and inside the storefronts');
  }
  if (catalog.landmarks !== undefined) {
    check(Array.isArray(catalog.landmarks), 'landmarks must be an array');
    const landmarkIds = new Set();
    for (const landmark of Array.isArray(catalog.landmarks) ? catalog.landmarks : []) {
      check(landmark && typeof landmark.id === 'string' && idPattern.test(landmark.id) && !landmarkIds.has(landmark.id), 'Landmarks need unique slug IDs');
      if (!landmark) continue;
      landmarkIds.add(landmark.id);
      check(['pavilion', 'chalkboard'].includes(landmark.kind) && text(landmark.name) && text(landmark.description) && url(landmark.source), `${landmark.id} needs a supported kind, name, description, and source`);
      check(Number.isFinite(landmark.along) && landmark.along >= 0 && landmark.along <= catalog.district.length + 80 && Number.isFinite(landmark.x) && Math.abs(landmark.x) < (street?.width ?? 36) / 2, `${landmark.id} is outside the scene bounds`);
    }
  }
  if (catalog.chalkboard) check(text(catalog.chalkboard.heading) && text(catalog.chalkboard.cheer) && text(catalog.chalkboard.artNote) && Array.isArray(catalog.chalkboard.lines) && catalog.chalkboard.lines.every(text) && catalog.chalkboard.editable === false, 'Chalkboard needs static original text/art metadata');
  if (catalog.musicVenues !== undefined) {
    check(Array.isArray(catalog.musicVenues), 'musicVenues must be an array');
    const musicIds = new Set();
    for (const venue of Array.isArray(catalog.musicVenues) ? catalog.musicVenues : []) {
      check(venue && typeof venue.id === 'string' && idPattern.test(venue.id) && !musicIds.has(venue.id), 'Music venues need unique slug IDs');
      if (!venue) continue;
      musicIds.add(venue.id);
      check(ids.businesses.has(venue.id) || (Array.isArray(catalog.landmarks) ? catalog.landmarks : []).some(l => l?.id === venue.id), `${venue.id} music history refers to a missing venue`);
      check(text(venue.title) && url(venue.source) && date(venue.verifiedAt), `${venue.id} music history needs title, source, and checked date`);
      check(Array.isArray(venue.performers) && venue.performers.every(p => p && text(p.name) && date(p.date) && url(p.source) && Date.parse(p.date) <= Date.parse(venue.verifiedAt)), `${venue.id} past performers need names, sources, and dates no later than the checked date`);
    }
  }
  return errors;
}

export function assertStorefrontCatalog(catalog) {
  const errors = validateStorefrontCatalog(catalog);
  if (errors.length) throw new Error(`Invalid storefront catalog:\n${errors.join('\n')}`);
  return catalog;
}

export function occupiedStorefronts(catalog) {
  const businesses = new Map(catalog.businesses.map(b => [b.id, b]));
  return catalog.slots.map(slot => ({ slot, business: businesses.get(slot.businessId) ?? null })).filter(entry => entry.business?.operatingStatus !== 'closed');
}
