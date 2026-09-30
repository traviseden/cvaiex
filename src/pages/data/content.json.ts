import { community, places, events, archiveStatus } from '../../data/content';
import { cityRegion, futureRegions } from '../../data/regions.mjs';
import { storefrontCatalog } from '../../data/storefronts';
export function GET() {
  return new Response(JSON.stringify({ community, places, events, archiveStatus, region: cityRegion, futureRegions, storefronts: storefrontCatalog, contentSources: ['https://www.cvaiex.org/', 'https://www.meetup.com/cville-tech/'], version: 1 }, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
