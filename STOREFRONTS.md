# JSON storefront update contract

The source of truth is `public/data/storefronts.json`. The browser reads this file for the outdoor Downtown Mall scene. Astro reads the same file for crawlable directory pages. No database or application server is required.

## Independent records

- **`slots`** are stable physical scene locations. Keep an ID such as `main-404-east` when a tenant changes. `along`, `side`, `width`, and `height` control the illustrative scene geometry.
- **`businesses`** hold the tenant’s name, category, address, description, website, aliases, source URLs, checked date, and status.
- **`slot.businessId`** assigns a tenant. Set it to another business ID to replace the sign/data, or `null` for an unoccupied storefront. A `closed` business is retained as a record but isn’t presented as an active tenant in the walking scene.
- **`media`** holds local image paths and per-image source, creator, date, license, license URL, and modification credit.
- **`business.photoId`** selects a photograph for the storefront’s display panel and discovery card. It can be `null`.
- **`slot.appearance`** supplies brick, trim, accent colors, and an awning switch. Optional `facadeImageId` selects a full façade image from the media table, replacing the procedural front visually. The sign and interactions continue to use the assigned business record.
- **`district.streetscape`** controls width, center-tree spacing/offset, and a side walking lane. Validation keeps the walking lane outside the planting zone and inside the façades.
- **`landmarks`** supplies the pavilion and chalk-wall locations, descriptions, and sources. The pavilion extends the walking area beyond the retail corridor.
- **`chalkboard`** holds original static community text and art metadata. `editable` is `false` until a live drawing layer is implemented.
- **`musicVenues`** contains curated artist/date/source records for the pavilion and Jefferson. Performance dates must not be later than the source-check date. The lists are highlights, not a fame ranking or complete archive.

`public/data/storefronts.schema.json` is the machine-readable schema. `src/lib/storefront-catalog.mjs` additionally checks duplicate IDs, references, dimensions, supported paths/URLs, and overlapping slots. Text is rendered as text, not executable HTML.

The current scene is a compressed, artistic walk, not a surveyed reconstruction. Do not treat the `along` and `side` values as geographic coordinates. The initial seven stops are a curated selection, not the complete downtown business inventory. Photos are dated source images, not live views.

## Bot update workflow

1. Read the latest catalog and its `revision`.
2. Update or add business records using stable IDs and source-linked facts. Keep a closed business’s record if its historical page should remain available.
3. Change a slot’s `businessId` when replacing its tenant. Update appearance/photo references as needed.
4. Add local images under `public/media/mall/`, with complete media attribution records. `npm run mall:photos` can fetch records that include a Wikimedia Commons `fileTitle`; it checks the published license before downloading.
5. Increase `revision` by exactly one and set `updatedAt` to the update’s ISO datetime.
6. Write the proposed full catalog to a separate file, then publish it:

```sh
npm run storefronts:replace -- "/path/to/proposed-catalog.json" --expected-revision 2
npm run build
```

The replacement command validates records and local assets, obtains a file lock, checks the expected revision again, and atomically renames the new JSON into place. Invalid data and stale revisions do not replace the working file. A second concurrent writer must retry against the new revision. If a process is terminated while holding the lock, remove `public/data/storefronts.json.lock` after confirming that process is no longer running.

The command does not commit or deploy. Deploy the rebuilt `dist/` using the site’s normal hosting process. Rebuilding updates the HTML pages, search data bundled into the client, sitemap, and machine-readable content together.
Use the revision read from the current file; `2` above is the current example, not a permanent value. See `DEVOPS.md` for Cloudflare publishing.

## Preview changes

While inside the Downtown Mall, **Refresh storefronts** reloads the JSON and rebuilds signs, appearance, directory entries, photo references, and interactions without leaving the walk. An invalid or unavailable catalog keeps the current scene. Static directory pages reflect the last build.

```sh
npm run storefronts:validate
```

Deep links: `/?place=downtown-mall&walk=1&business=new-dominion-bookshop`.
Landmark links: `/?place=downtown-mall&walk=1&landmark=ting-pavilion` or `landmark=chalk-wall`.

## Future SQLite boundary

The IDs and references already separate physical slots, occupants, and media. A future SQLite build step can store these as tables and export the same versioned JSON shape. The renderer and static templates can continue consuming that shape without a database dependency in the browser.
