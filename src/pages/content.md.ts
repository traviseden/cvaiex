import { community, places, events, archiveStatus } from '../data/content';
import { storefrontCatalog } from '../data/storefronts';

export function GET() {
  const sections = [
    `# ${community.name}\n\n${community.tagline}`,
    `## About\n\n${community.goals.map(g => `- ${g}`).join('\n')}`,
    `## Mission\n\n${community.mission}`,
    `## Activities\n\n${community.activities.map(g => `- ${g}`).join('\n')}`,
    `## Get involved\n\n${community.involvement.map(g => `- ${g}`).join('\n')}\n\nWhether you're actively building AI applications or eager to learn how, there's a place for you in our community. We emphasize practical skills and implementation while maintaining an inclusive environment for learning.`,
    `## Contact\n\nOperates under [Charlottesville Technologists](${community.meetup}). Contact organizers in [#cvilleaiexplorers](${community.slack}) on [Cville Slack](https://cville.slack.com).`,
    `## Sponsor\n\n[Studio IX](https://www.studioix.co/) is a coworking space in downtown Charlottesville designed for freelancers, entrepreneurs, and remote workers. Open workspaces, dedicated desks, private offices, weekly events, high-speed internet, soundproof phone booths, conference rooms, and premium coffee. Staffed weekdays; members have 24/7 access. Tours: COWORK@studioix.co / 434.260.3803. Pronounced “Studio icks.”`,
    `## Code of conduct\n\nWe follow the [Cville Slack Code of Conduct](${community.conduct}).`,
    `## Places\n\n${places.map(p => `### ${p.name}\n\n${p.description}\n\nAddress: ${p.address}\n\n${p.coordinateStatus}\n\n[Source](${p.source}) · [Place page](https://www.cvaiex.org/places/${p.id}/)`).join('\n\n')}`,
    `## Event archive\n\n${archiveStatus}`,
    ...events.map(e => [
      `### ${e.fullTitle}: ${e.title}`,
      `${e.displayDate} / ${e.displayTime}\n\n${e.startDate} – ${e.endDate}`,
      e.description,
      `#### ${e.detailHeading}\n\n${e.details.join('\n\n')}`,
      `Hosts: ${e.hosts.join(', ')}`,
      e.schedule.map(s => `- ${s}`).join('\n'),
      e.registration ? `Registration required: [be.camp](${e.registration}). Free, including food and drinks.` : '',
      e.sponsors ? `Sponsors:\n${e.sponsors.map(s => `- [${s.name}](${s.url}) — ${s.tier}`).join('\n')}` : '',
      e.sourceNote ?? '', e.verification,
      `[Original event](${e.source}) · [Event page](https://www.cvaiex.org/events/${e.id}/)`,
      ...(e.additionalSources ?? []).map(s => `[Additional source](${s})`),
    ].filter(Boolean).join('\n\n')),
    `## Geographic data\n\nCity of Charlottesville Existing Structure Area and Road Centerlines, CC BY 4.0. Building heights converted from feet; missing heights estimated at 7 meters. Flat ground and approximate destination pins. UVA School of Data Science’s pin is derived from OpenStreetMap way 1291005629 (© OpenStreetMap contributors, ODbL). Room and landmark assets are artistic interpretations. [Full credits](https://www.cvaiex.org/data/).`,
    `## Downtown Mall\n\n${storefrontCatalog.district.description}\n\n${storefrontCatalog.district.layoutNote}\n\n[Directory and photo credits](https://www.cvaiex.org/mall/) · [JSON catalog](https://www.cvaiex.org/data/storefronts.json)`,
    ...storefrontCatalog.businesses.map(b => `### ${b.name}\n\n${b.category} / ${b.address}\n\n${b.description}\n\nSource-checked ${b.verifiedAt}; status ${b.operatingStatus}. [Official website](${b.website}) · [Business page](https://www.cvaiex.org/mall/${b.id}/)\n\n${b.sources.map(s => `[Source](${s})`).join(' · ')}`),
    ...storefrontCatalog.musicVenues?.map(v => `## ${v.id}: ${v.title}\n\nA curated selection, not a ranking or complete archive. Source-checked ${v.verifiedAt}.\n\n${v.performers.map(p => `- ${p.name} — ${p.date} — [Source](${p.source})${p.note ? ` (${p.note})` : ''}`).join('\n')}`) ?? [],
    `## Community chalk wall\n\n${storefrontCatalog.chalkboard?.heading}\n\n${storefrontCatalog.chalkboard?.lines.join('\n\n')}\n\n${storefrontCatalog.chalkboard?.cheer}\n\nOriginal, static community chalk art. [Walkthrough reference](https://www.youtube.com/watch?v=aJVOkmzvzcw&t=240s).`,
  ];
  return new Response(`${sections.join('\n\n')}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
