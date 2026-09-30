# cvaiex — Cville AI Explorers

**Live:** https://cvaiex.bfrtrcvxfg.workers.dev/ · **Source:** https://github.com/traviseden/cvaiex

A static Astro + TypeScript + Three.js prototype for Cville AI Explorers. Real Charlottesville building footprints, a cosmic sky, destination travel, first-person flight, walkable Studio IX, UVA Data Science, and Kardinal Hall community rooms, and an outdoor Downtown Mall streetscape.

## Run

Requires Node 22.12+ (Node 24 recommended).

```sh
npm install
npm run dev
```

Open http://localhost:4321. Build with `npm run build`; preview with `npm run preview`. The build also emits validated Cloudflare assets-only output under `.cloudflare/output/v0`. Use `npm run deploy:dry-run` to verify and `npm run deploy` to publish with the locally pinned `cf` CLI. See `DEVOPS.md` for the verified workflow and custom-domain setup. The checkout can be renamed to `cvaiex` without changing configuration paths.

## Checks

```sh
npm test
npm run build
npx playwright install chromium
npx playwright test
```

## Content & data

- `src/data/content.ts`: source-linked places, community content, and verified events. Add archive records here as additional history becomes available.
- `src/data/regions.mjs`: shared geographic origin, bounds, snapshot URL, and future region inventory.
- `scripts/import-city.mjs`: paginated GIS import, bounded snapshot, meter-based projection, and height fallback tracking.
- `public/data/city.json`: committed static geometry snapshot; visitors do not need GIS API access.
- `npm run data:refresh`: refresh the snapshot from City of Charlottesville services. Internet access is needed only for refresh.
- `npm run sky:refresh`: import a revision-pinned bright-star catalog and constellation outlines, with provenance and license notice.
- `src/lib/astronomy.mjs` / `src/lib/sky.ts`: J2000 precession and live local sidereal rotation. This is a subtle background Easter egg; no labels, sky controls, clock readout, or changed landing copy.
- `/data/`: attribution, current coverage, and visualization choices.
- `/data/content.json`, `/content.md`, `/llms.txt`: machine-readable content.
- `public/data/storefronts.json`: independently replaceable business, physical slot, appearance, and image records. See `STOREFRONTS.md` for the bot update interface.
- `npm run storefronts:validate`: validates the catalog and local images. This runs before every build.
- `npm run mall:photos`: downloads the four attributed Commons photographs referenced by the catalog. Images are already included locally, so normal builds do not need network access.
- `/mall/`: crawlable business directory and per-image credits. Each business has a static page and a link directly to its storefront in the 3D walk.
- `DEVOPS.md`: live deployment, Cloudflare instructions verified with `cf 1.0.0-beta.7`, the static Build Output Specification integration, and the Pages upload limitation.
- `public/data/community-tour.json`: the guided community circuit, camera offsets, stop notes, and leg durations.
- `npm run reference:walkthrough`: optional development-only extraction using installed `yt-dlp` and `ffmpeg`. The 15-minute source produced 180 low-resolution frames at roughly five-second intervals, including a 4:00–4:30 chalk-wall contact sheet, under ignored `references/downtown-mall/`. The source has no uploaded/automatic caption transcript. These video frames are not deployed.

Buildings and roads: © City of Charlottesville, CC BY 4.0. See `/data/` for source metadata and modifications. Fonts are requested from Google Fonts with system fallbacks. Voice is an optional browser speech-recognition feature, may use the browser provider’s service, and always has typed fallback. No API key or application backend is required.

## Prototype scope

Five destination pins; three verified event exhibits; three walkable artistic rooms; one outdoor mall walk with seven source-linked businesses, central trees, side walking lanes, a tensile-canopy pavilion, a static community chalk wall, and four dated photographs. Local walking has eye-height movement, boundary/furniture collision, mouse-look, separate touch move/look pads, and clickable/proximity exhibits. **WASD moves/strafe; arrow keys look left/right/up/down.** The pavilion and Jefferson have curated source-verified performer histories, not rankings or complete archives. City-scale flight collision and real terrain remain future work. The mall is compressed and illustrative, not a complete or surveyed reconstruction. The full Meetup archive is pending source material. Studio IX is pronounced “Studio icks”; alternative inputs remain accepted.

The **Take the tour** action visits Studio IX → Downtown Mall → Ting Pavilion → Kardinal Hall → UVA Data Science. It pauses at every stop with optional entry, retains that stop on return from a venue, supports previous/next/end and mid-flight pause, and uses instant stop changes under reduced motion. `/?tour=community` starts the circuit; `/?place=ting-pavilion&walk=1` opens the outdoor pavilion visit.

## Feedback checkpoint 4

1. Do arrow-key looking and independent WASD movement feel right?
2. Are the wider lanes, central trees, pavilion, and chalk wall closer to the real mall?
3. Does the community circuit have comfortable camera motion, pacing, and stop choices?
4. Which additional venue histories, façade references, or future chalkboard interactions should come next?

See `PLAN.md` for the iteration roadmap and archive handoff format.
