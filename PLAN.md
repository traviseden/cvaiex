# Iteration roadmap

## Direction

Cosmic city grounded in real Charlottesville geography. First-person flight and animated destination travel. Stylized immersive community rooms. All Charlottesville Technologists history eventually, with AI Explorers prominent. Static deployment. Albemarle, Monticello, and the mountains are future region packs.

## Current feedback artifact

- Cosmic arrival interface, real city geometry, searchable destination pins.
- Studio IX, Downtown Mall, Kardinal Hall, and UVA School of Data Science. The Rotunda is deferred.
- Orbit/zoom, first-person flight, reduced-motion mode, optional voice input.
- Studio IX room with the verified September 29, 2026 Meeting #17 exhibit.
- UVA Data Science forum with beCamp 2026’s two-session, source-verified exhibit, schedule, sponsors, and registration link.
- A live, geographically oriented star catalog with subtle constellation lines, no labels or new controls/copy. Keep it an Easter egg in the original map-first layout.
- Viewport-only homepage and larger typography, especially EXPLORERS in the logo. Green remains approved for now; palette decisions await the group.
- Studio IX pronounced “Studio icks”; alternative inputs remain accepted without renaming the venue.
- Indoor walking, looking, collision, and interactive exhibits at Studio IX, UVA Data Science, and Kardinal Hall.
- Outdoor Downtown Mall walk with brick paving, trees, café furniture, seven source-linked businesses, and four attributed photographs.
- JSON storefront registry with stable physical slots, independent occupants, replaceable façade/photo references, validated bot publishing, and in-view refresh. SQLite can export the same shape later.
- WASD translation and independent arrow-key looking in walking and free flight, plus separate touch pads.
- Wider mall with central trees and side footways, an eastern pavilion canopy, and original static chalk art: AI Explorers, verified pavilion artists, and “Go Hoos!” with generic orange/blue collegiate sketches.
- Source-verified pavilion and Jefferson performer highlights. Video geometry reference extracted to 180 private, low-resolution frames; no captions were available from the source.
- Guided Studio IX → Mall → Pavilion → Kardinal Hall → UVA Data Science circuit. Pause and offer entry at each stop; retain the stop on venue return; support reduced motion.
- Cloudflare publishing guide in `DEVOPS.md`, including the installed new CLI’s actual beta behavior.
- Real static community/place/event pages and machine-readable exports.

## Next stages

1. Identity approved. Review street-level movement, interactive exhibit cues, and the mall’s streetscape.
2. Validate pins, audit UVA coverage, and select initial landmarks and launch boundary.
3. Review the completed guided circuit; next refine minimap, portal proximity activation, and city-scale collision.
4. Integrate historical venue/event inventory and series filters once sources arrive.
5. Add terrain and preprocess/chunk larger 3D assets as performance measurements justify.
6. Polish accessibility, browser support, social cards, deployment, and ongoing content refresh.
7. Expand via manifest-driven region packs after the Charlottesville iteration lands.

Each stage ends in a preview and feedback round. Visual changes should be evaluated in a real playable scene before broad asset production.

## Archive handoff

Ask organizers for an available export or a complete event URL list plus saved event descriptions. Useful fields:

```json
{
  "sourceId": "meetup-event-id",
  "sourceUrl": "https://www.meetup.com/cville-tech/events/.../",
  "title": "Event title",
  "startDate": "ISO date with timezone offset",
  "endDate": "ISO date with timezone offset",
  "venueName": "Venue name at event time",
  "address": "Address at event time",
  "description": "Full public event description",
  "series": "AI Explorers / First Wednesdays / beCamp / other",
  "hosts": [],
  "media": []
}
```

No attendee list is needed. Preserve the source URL and original event ID for deduplication. Handle renamed/moved venues by event-time address rather than merging by name alone. Online and outside-region events should still have archive pages. Imported descriptions should be sanitized if HTML is introduced. Validate dates rather than trusting Meetup’s past/upcoming classification.

## Acceptance before launch

- Verified source links, honest archive coverage, and validated destination pins.
- Search, travel, room, return, and direct links work with keyboard and touch.
- Readable pages with JavaScript disabled and on devices without WebGL.
- Microphone denied/unavailable states use typed fallback.
- Snapshot licenses and modifications are shown; estimated geometry is tracked.
- Performance is measured on representative hardware; no FPS target is claimed until measured.
