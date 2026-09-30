export interface Place {
  id: string;
  name: string;
  shortName: string;
  kind: 'Community hub' | 'Landmark' | 'Meetup venue';
  district: string;
  address: string;
  coordinates: [number, number];
  coordinateStatus: string;
  color: string;
  aliases: string[];
  description: string;
  source: string;
  room: boolean;
  experience?: 'indoor' | 'outdoor';
  defaultLandmarkId?: string;
  pronunciation?: string;
}

export const places: Place[] = [
  {
    id: 'studio-ix', name: 'Studio IX', shortName: 'Studio IX', kind: 'Community hub', district: 'IX ART PARK',
    address: '969 2nd St SE, Charlottesville, VA', coordinates: [-78.4824, 38.0247],
    coordinateStatus: 'Approximate venue pin; awaiting address-level verification.', color: '#b6f36a',
    aliases: ['studio icks', 'studio ix', 'studio x', 'studio nine', 'studio 9', 'ix', 'ai explorers', 'cvaiex', 'AI Design Bake-Off'], room: true,
    pronunciation: 'Studio icks',
    description: 'A coworking space, a gathering place, and a launchpad for local ideas. Studio IX supports Cville AI Explorers and hosted our September 2026 AI Design Bake-Off.',
    source: 'https://www.meetup.com/cville-tech/events/316395613/',
  },
  {
    id: 'uva-data-science', name: 'UVA School of Data Science', shortName: 'UVA Data Science', kind: 'Meetup venue', district: 'IVY ROAD / UNIVERSITY OF VIRGINIA',
    address: '1919 Ivy Road, Charlottesville, VA 22903', coordinates: [-78.5076448, 38.0407562],
    coordinateStatus: 'Building-center pin from OpenStreetMap way 1291005629; address confirmed by UVA’s beCamp listing. Model is an artistic interpretation.', color: '#b9a0ff',
    aliases: ['uva', 'university', 'data science', 'school of data science', 'uva sds', 'sds', 'be camp', 'becamp', 'beCamp 2026'], room: true,
    description: 'A school without walls, and a meeting place for Charlottesville’s tech community. UVA’s School of Data Science hosts beCamp’s 20th-anniversary pitch night and unconference sessions in October 2026.',
    source: 'https://datascience.virginia.edu/events/becamp-charlottesvilles-tech-unconference/oct-02',
  },
  {
    id: 'downtown-mall', name: 'Downtown Mall', shortName: 'Downtown Mall', kind: 'Landmark', district: 'DOWNTOWN',
    address: 'East Main Street, Charlottesville, VA', coordinates: [-78.4807, 38.0302],
    coordinateStatus: 'Approximate central point along the pedestrian mall.', color: '#75d9ef',
    aliases: ['downtown', 'mall', 'main street'], room: true, experience: 'outdoor',
    description: 'The pedestrian heart of Charlottesville. Step outside onto a tree-lined, brick-paved walk, discover local businesses, and explore the stories along Main Street.',
    source: 'https://en.wikipedia.org/wiki/Downtown_Mall',
  },
  {
    id: 'kardinal-hall', name: 'Kardinal Hall', shortName: 'Kardinal Hall', kind: 'Meetup venue', district: 'PRESTON AVENUE',
    address: '722 Preston Ave #103, Charlottesville, VA', coordinates: [-78.4872, 38.0367],
    coordinateStatus: 'Approximate venue pin; awaiting address-level verification.', color: '#f4bd7d',
    aliases: ['cardinal hall', 'first wednesdays', 'first wednesday', 'kardinal'], room: true,
    description: 'A gathering place for First Wednesdays: informal conversations among local technologists and technology-interested people. The group’s public page lists upcoming meetings here.',
    source: 'https://www.meetup.com/cville-tech/events/316325419/',
  },
  {
    id: 'ting-pavilion', name: 'Ting Pavilion', shortName: 'Ting Pavilion', kind: 'Landmark', district: 'DOWNTOWN MALL / EAST END',
    address: '700 East Main Street, Charlottesville, VA 22902', coordinates: [-78.4765881, 38.0292216],
    coordinateStatus: 'Venue-center pin from OpenStreetMap way 253276163; pavilion model is an original artistic interpretation.', color: '#d4e1b8',
    aliases: ['pavilion', 'ting', 'fridays after five', 'fridays after 5'], room: true, experience: 'outdoor', defaultLandmarkId: 'ting-pavilion',
    description: 'The outdoor stage at the eastern end of the Downtown Mall. Discover its white canopy, community chalk wall, and source-linked stories of notable past performers.',
    source: 'https://www.tingpavilion.com/',
  },
];

export interface CommunityEvent {
  id: string; sourceId: string; title: string; fullTitle: string; series: string;
  startDate: string; endDate: string; displayDate: string; displayTime: string; placeId: string;
  source: string; additionalSources?: string[]; description: string; hosts: string[];
  hostLinks?: { name: string; url: string }[];
  schedule: string[]; verification: string; detailHeading: string; details: string[];
  organizerName: string; organizerUrl: string; registration?: string; sourceNote?: string;
  sponsors?: { name: string; url: string; tier: string }[];
}

export const events: CommunityEvent[] = [{
  id: 'ai-explorers-17', sourceId: '316395613', title: 'AI Design Bake-Off',
  fullTitle: 'Cville AI Explorers (CvAIEx) — Meeting #17', series: 'Cville AI Explorers',
  startDate: '2026-09-29T18:00:00-04:00', endDate: '2026-09-29T20:00:00-04:00',
  displayDate: 'September 29, 2026', placeId: 'studio-ix',
  displayTime: '6:00–8:00 PM EDT', organizerName: 'Cville AI Explorers', organizerUrl: 'https://www.cvaiex.org/',
  source: 'https://www.meetup.com/cville-tech/events/316395613/',
  description: 'A hands-on experiment with AI-based front-end design tools. Small teams each picked a tool, spent about 45 minutes redesigning cvaiex.org, then reconvened to demo the results and share lessons learned. Everyone was welcome, with no coding or design background required.',
  hosts: ['Owen Zanzal', 'Mike Powers'],
  hostLinks: [{ name: 'Owen Zanzal', url: 'https://www.linkedin.com/in/owenzanzal/' }, { name: 'Mike Powers', url: 'https://www.linkedin.com/in/michael-powers-4262033/' }],
  detailHeading: 'The experiment',
  details: ['The common use case for every team was to redesign the Charlottesville AI Explorers website, cvaiex.org. Existing content was provided in Markdown. The focus was on look, feel, and user experience, with content improvements welcome too.', 'Participants could drive a tool, contribute ideas, or simply watch a team work. Each team had a lead to guide the workflow, and hands-on participants were asked to bring a laptop.'],
  schedule: ['5:30 PM — Setup begins', '5:45 PM — Optional book club track', '6:00 PM — Doors open', '6:30 PM — Opening and hackathon', '7:15 PM — Demos and lessons learned'],
  verification: 'Verified against the public individual Meetup event page on September 30, 2026.',
}, {
  id: 'becamp-2026', sourceId: '316216625', title: 'beCamp 2026',
  fullTitle: 'beCamp 2026 — 20th Anniversary Unconference', series: 'beCamp',
  startDate: '2026-10-02T16:30:00-04:00', endDate: '2026-10-03T16:00:00-04:00',
  displayDate: 'October 2–3, 2026', displayTime: 'Friday 4:30–8:30 PM · Saturday 9:00 AM–4:00 PM EDT',
  placeId: 'uva-data-science', organizerName: 'beCamp', organizerUrl: 'https://be.camp',
  source: 'https://www.meetup.com/cville-tech/events/316216625/',
  additionalSources: ['https://www.meetup.com/cville-tech/events/316216642/', 'https://datascience.virginia.edu/events/becamp-charlottesvilles-tech-unconference/oct-02'],
  description: 'Twenty years of showing up with ideas. Charlottesville’s free tech unconference is planned by the people who attend: pitch topics Friday, vote together, and build Saturday’s agenda. Talks, conversations, demos, and lightning sessions bring the local community together at UVA’s School of Data Science.',
  hosts: ['Owen Zanzal (Meetup host)', 'The beCamp community'],
  detailHeading: 'The people make the program',
  details: ['There are no pre-selected speakers or sessions. Bring a topic you want to present, a question you want to explore, or simply come hear what others have in mind. You don’t need to be an expert to suggest a discussion. Attendees pitch and vote Friday; volunteers turn those choices into Saturday’s schedule.', 'Friday begins with appetizers, drinks, and reconnection at The Poplar Restaurant, then moves to UVA’s School of Data Science for Pitch Night. Saturday offers presentations, discussions, demos, lightning talks, and time to meet people and exchange ideas.', 'beCamp is free to attend, including food and drinks, thanks to sponsors and community members. Registration must be completed at be.camp, rather than only through Meetup.', 'Supporters can help cover event needs including food and drink. The original listing links to the GitHub call for needs and invites interested organizations and people to contact the host.'],
  registration: 'https://be.camp/register/',
  schedule: ['Friday, October 2 · 4:30–5:30 PM — Reception at The Poplar Restaurant', 'Friday, October 2 · 5:30–8:30 PM — Pitch Night at UVA School of Data Science', 'Saturday, October 3 · 9:00 AM–4:00 PM — Community-selected sessions at UVA School of Data Science'],
  verification: 'Verified against both public Meetup session pages and UVA’s event listing on September 30, 2026.',
  sourceNote: 'This exhibit combines the two beCamp session listings. Friday’s opening reception is at The Poplar Restaurant. Saturday’s description and UVA listing end at 4:00 PM; Meetup’s Saturday header shows 4:30 PM. The times here follow UVA’s listing and the event descriptions. Consult be.camp for final event details.',
  sponsors: [
    { name: 'Scale', url: 'https://www.scale.agency/', tier: 'Premier sponsor' },
    { name: 'UVA School of Data Science', url: 'https://datascience.virginia.edu/', tier: 'Premier sponsor' },
    { name: 'John Feminella', url: 'https://jxf.me/', tier: 'Premier sponsor' },
    { name: 'Carson Sweet', url: 'https://www.carsonsweet.com/', tier: 'Premier sponsor' },
    { name: 'GA-Intelligence', url: 'https://www.ga-intelligence.com/', tier: 'Premier sponsor' },
    { name: 'Hardshell AI', url: 'https://hardshell.ai/', tier: 'Premier sponsor' },
    { name: 'The Poplar Restaurant', url: 'https://www.virginiaguesthouse.com/dining/poplar/', tier: 'Sponsor' },
    { name: 'SpiffWorks', url: 'https://spiff.works/', tier: 'Sponsor' },
    { name: 'Standard Agents', url: 'https://standardagentbuilder.com/', tier: 'Sponsor' },
    { name: 'Cville AI Explorers', url: 'https://cvilleaiexplorers.github.io/', tier: 'Sponsor' },
    { name: 'Fraccel', url: 'https://www.fraccel.com/', tier: 'Sponsor' },
    { name: 'Control Alt Recycle', url: 'https://www.controlaltrecycle.com/', tier: 'Sponsor' },
  ],
}, {
  id: 'first-wednesdays-2026-10', sourceId: '316325419', title: 'First Wednesdays',
  fullTitle: 'First Wednesdays — October 2026', series: 'First Wednesdays',
  startDate: '2026-10-07T19:30:00-04:00', endDate: '2026-10-07T21:30:00-04:00',
  displayDate: 'October 7, 2026', displayTime: '7:30–9:30 PM EDT', placeId: 'kardinal-hall',
  source: 'https://www.meetup.com/cville-tech/events/316325419/',
  organizerName: 'Charlottesville Technologists', organizerUrl: 'https://www.meetup.com/cville-tech/',
  description: 'An informal gathering of Charlottesville technologists and technology-interested people at Kardinal Hall. No speakers, presentations, or slide decks—just people working on things and talking about technology, business, and whatever they’re curious about. Everyone is welcome, regardless of profession.',
  hosts: ['Paul B. (Meetup host)'], detailHeading: 'No slides. Just conversation.',
  details: ['First Wednesdays meets on the first Wednesday of each month at 7:30 PM at Kardinal Hall. Come meet people, share what you’re working on, or follow a conversation somewhere unexpected.', 'The host posts meetup status updates in Cville Slack’s #first-wednesday channel and in the Discord. The public listing describes a recurring monthly series through December 1, 2027; this exhibit represents the October 7, 2026 instance.'],
  schedule: ['7:30 PM — Informal gathering at Kardinal Hall', '9:30 PM — Scheduled end in the Meetup listing'],
  verification: 'Verified against the public Meetup event page on September 30, 2026.',
}];

export const rooms = [
  { placeId: 'studio-ix', eyebrow: 'A ROOM FULL OF POSSIBILITIES', heading: ['Big ideas.', 'Good company.'], intro: 'Welcome to our cosmic interpretation of Studio IX. Pull up a chair. Let’s make something.', category: 'FROM THE COMMUNITY ARCHIVE · MEETING #17', eventId: 'ai-explorers-17', note: 'More history will land here as the archive grows.', sign: 'STUDIO IX', subtitle: 'BUILD SOMETHING TOGETHER' },
  { placeId: 'uva-data-science', eyebrow: 'A SCHOOL WITHOUT WALLS', heading: ['Your ideas.', 'Our agenda.'], intro: 'Welcome to our cosmic Data Science forum. This is beCamp: the conference built by the people who show up.', category: 'THE COMMUNITY CONSTELLATION · 20 YEARS OF BECAMP', eventId: 'becamp-2026', note: 'Pitch. Vote. Explore. Registration takes place at be.camp.', sign: 'UVA DATA SCIENCE', subtitle: 'A SCHOOL WITHOUT WALLS' },
  { placeId: 'kardinal-hall', eyebrow: 'A SEAT AT THE TABLE', heading: ['No slides.', 'Good conversations.'], intro: 'Welcome to our stylized Kardinal Hall gathering space. Bring a question, an idea, or simply yourself.', category: 'THE COMMUNITY CONSTELLATION · FIRST WEDNESDAYS', eventId: 'first-wednesdays-2026-10', note: 'A casual gathering for anyone interested in technology. Follow the source listing for meetup updates.', sign: 'KARDINAL HALL', subtitle: 'A SEAT AT THE TABLE' },
];

export const community = {
  name: 'Cville AI Explorers', tagline: 'Building with AI in Charlottesville, Virginia',
  meetup: 'https://www.meetup.com/cville-tech/',
  slack: 'https://cville.slack.com/archives/C08DTL1TS1K',
  conduct: 'https://github.com/cville/conduct',
  mission: 'Our mission is to foster a community where people can develop AI building skills through hands-on projects, technical sharing, and collaborative learning, and discover practical ways to integrate AI tools into their work and daily lives. While our focus is on active building and implementation, we welcome anyone interested in learning these skills.',
  goals: ['Build practical AI applications and tools', 'Share technical knowledge and implementation experiences', 'Learn about and explore emerging AI technologies', 'Discover ways to enhance productivity and creativity', 'Support each other in creating AI-powered solutions'],
  activities: ['Exploring modern AI platforms and workflow tools', 'Technical demos and talks from AI builders', 'Technical book discussions and learning circles', 'Collaborative building sessions and group projects'],
  involvement: ['Attend our meetups', 'Share your AI experiences', 'Collaborate with other members', 'Present your projects or findings', 'Learn from peers'],
};

export const archiveStatus = 'Three source-verified exhibits: AI Explorers Meeting #17, beCamp 2026 (combining its Friday and Saturday listings), and the October 2026 First Wednesdays gathering. The full Charlottesville Technologists archive is pending additional source material; no complete historical coverage is claimed.';
