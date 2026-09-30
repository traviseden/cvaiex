import { cityRegion } from '../data/regions.mjs';
export const origin = cityRegion.origin;
export function project([lon, lat]) {
  return [(lon - origin[0]) * 111320 * Math.cos(origin[1] * Math.PI / 180), -(lat - origin[1]) * 111320];
}
export function normalize(value) {
  return value.toLowerCase().normalize('NFKD').replace(/[’']/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
export function searchPlaces(input, places) {
  const query = normalize(input).replace(/^(please )?(take me to|fly to|go to|find|show me|show|visit|navigate to)\s+/, '').replace(/^the\s+/, '');
  if (!query) return places;
  return places.map(place => {
    const names = [place.name, ...place.aliases].map(normalize);
    const score = names.some(n => n === query || n.replace(/^the\s+/, '') === query) ? 100 : names.some(n => n.includes(query)) ? 70 : query.split(' ').filter(word => names.some(n => n.includes(word))).length / query.split(' ').length * 40;
    return { place, score };
  }).filter(item => item.score >= 30).sort((a, b) => b.score - a.score).map(item => item.place);
}
