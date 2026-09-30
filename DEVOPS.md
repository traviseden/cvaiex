# Deploy cvaiex to Cloudflare

## Live deployment

- **Site:** <https://cvaiex.bfrtrcvxfg.workers.dev/>
- **Worker name:** `cvaiex`
- **Repository:** <https://github.com/traviseden/cvaiex>
- **Deployed version:** `bbe52129-8fc8-4aad-9e49-91f602ae55f4`
- **CLI:** local, pinned `cf 1.0.0-beta.7`
- **Hosting:** assets-only Cloudflare Worker. No server bundle or bindings.
- **Production canonical hostname:** `https://www.cvaiex.org`

The deployment URL is live. HTTP checks confirmed the homepage, mall pages, JSON catalogs, robots file, sitemap, and custom 404 response. The `cvaiex.org` DNS zone was not present in the authenticated Cloudflare account, so the custom hostname has not been switched to this Worker. Follow the domain steps below when the zone is available.

## What caused the original dry-run error

The new CLI’s automatic Astro setup installed `@astrojs/cloudflare` and generated a legacy Wrangler server configuration. Astro built static pages under `dist/client`, but `cf` expected `.cloudflare/output/v0/config.json`. That Build Output Specification directory was never produced.

The project now uses plain Astro static output plus an explicit build integration:

1. `astro.config.mjs` keeps `output: 'static'`, without a server adapter.
2. `cloudflare.config.ts` defines the assets-only Worker **`cvaiex`** and its HTML/404 routing.
3. `scripts/cloudflare-static-output.mjs` runs on `astro:build:done`.
4. Cloudflare’s pinned build-output utilities copy **only `dist/`** into the Build Output Specification tree, write its configuration, and validate it.
5. `cf deploy --prebuilt` uploads that validated artifact.

The adapter’s generated Images/KV/session bindings are gone. TypeScript checking was also repaired: setup had changed `tsconfig.json` to include only a missing generated Worker declaration, which silently excluded the application files.

Both `npm run deploy:dry-run` and the original **`npx cf deploy --dry-run`** command have been verified successfully with this integration. The latter delegates to `npx astro build`, which now emits the required build output too.

## 1. Install and verify

Use **Node 24**. From the project root:

```sh
npm ci
npm test
npm run deploy:dry-run
```

The expected end of the dry run reports the `cvaiex` assets directory, **no bindings**, and **Dry run complete**.

The npm scripts use the locally pinned CLI, so a different globally installed beta does not change the release toolchain. Inspect it with:

```sh
npx --no-install cf --version
```

## 2. Build output and configuration

The build produces:

```text
dist/                                      # ordinary Astro static site
.cloudflare/output/v0/config.json           # Cloudflare root build context
.cloudflare/output/v0/workers/default/
  worker.config.json                       # cvaiex, assets-only routing
  assets/                                  # copy of dist/
```

There is no Worker JavaScript bundle. `dist/`, `.cloudflare/`, and `.wrangler/` are generated and ignored by Git.

The configuration uses Cloudflare’s camelCase routing settings:

```ts
worker: {
  name: 'cvaiex',
  compatibilityDate: '2026-09-30',
  workersDev: true,
  assets: {
    htmlHandling: 'auto-trailing-slash',
    notFoundHandling: '404-page',
  },
}
```

In this beta, `worker.assets` does not take a directory field; the build integration supplies the assets. `src/pages/404.astro` builds `404.html`. A single-page-app fallback is inappropriate for these real HTML content pages and JSON files.

`wrangler.jsonc` is an assets-only fallback configuration for the same Worker name and `dist/`. It has no `main` server entrypoint or bindings.

## 3. Authenticate

```sh
npx --no-install cf auth login
npx --no-install cf auth whoami
```

For multiple accounts, select the intended account using a shell environment variable:

```sh
export CLOUDFLARE_ACCOUNT_ID="YOUR_ACCOUNT_ID"
```

For CI, supply `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` through the CI secret store. Worker publishing requires Workers Scripts: Edit; automated domains/DNS changes require the corresponding permissions. Credentials belong outside the repository and static assets.

## 4. Publish a release

```sh
npm test
npm run deploy
```

`npm run deploy` runs the validated Astro build, then **`cf deploy --prebuilt`**. To inspect without publishing:

```sh
npm run deploy:dry-run
```

When a build has already passed and you specifically want to deploy that artifact:

```sh
npx --no-install cf deploy --prebuilt
```

Use `npm run deploy` for normal releases so the uploaded artifact always reflects the current source. Direct `cf deploy` also invokes the Astro build integration, but bypasses the extra catalog/type checks in the npm build script.

Record the URL and version ID printed by each deployment. Cloudflare switches the static asset set as a release; a storefront refresh in the browser fetches the deployed JSON, not local edits.

Wrangler fallback:

```sh
npm run deploy:wrangler
```

The pinned Wrangler deploys `dist/` using `wrangler.jsonc`. It publishes the same assets-only Worker, not a second server application.

## 5. Local and deployed checks

```sh
npm run dev
```

Or build and serve the actual static files:

```sh
npm run build
npm run preview
```

Browser checks can target local development or a deployed URL:

```sh
npx playwright install chromium
npx playwright test
PLAYWRIGHT_BASE_URL="https://cvaiex.bfrtrcvxfg.workers.dev" npx playwright test --workers=1
```

Software-rendered WebGL tests are resource intensive; a single worker is useful when testing over the network. They are separate from the release build.

For release smoke checks, verify `/`, `/mall/`, an individual business page, `/data/city.json`, `/data/sky.json`, `/data/storefronts.json`, `/robots.txt`, `/llms.txt`, `/sitemap-index.xml`, and a missing route. Missing routes should return HTTP 404; JSON routes must return JSON, not an HTML fallback. Also try the tour, indoor walking, and the pavilion on desktop and phone.

Static headers in `public/_headers` give hashed `/_astro/` assets immutable caching and JSON catalogs revalidation. Images and content are included locally; normal builds do not call GIS, YouTube, Wikimedia, or star-catalog services. Run data-import commands deliberately when updating snapshots.

## 6. Custom hostname

To attach `www.cvaiex.org`:

1. Make the domain’s Cloudflare zone available in the account that owns this Worker, or deploy under the account that owns the zone.
2. In **Workers & Pages → cvaiex → Settings → Domains & Routes**, add `www.cvaiex.org` as a custom domain.
3. Complete the DNS/certificate setup and verify HTTPS after the domain is active.
4. Preserve unrelated DNS records, including mail/MX records, when switching the previous site.
5. Configure the apex `cvaiex.org` to redirect to canonical `www.cvaiex.org`, preserving path and query string, if desired.

The current canonical URL already points at `www.cvaiex.org`. The Workers preview URL can retain that production canonical. If you permanently change the canonical hostname, update `astro.config.mjs`, `public/robots.txt`, `public/llms.txt`, and hard-coded production URLs in the exporters/templates before rebuilding.

## 7. Updates, CI, and rollback

For storefront updates, follow `STOREFRONTS.md`: update the JSON with the next revision, publish it using `storefronts:replace`, then test/build/deploy. Include the source snapshots, local photographs, lockfile, and source code in the checkout. The `references/` video frames are development-only and are not uploaded or committed.

For CI, use Node 24, `npm ci`, the account/token secrets, `npm test`, and `npm run deploy`. The build-output utilities and CLI are pinned because their beta interfaces can change. No runtime SQLite, D1, Images, or KV service is needed.

To roll back, open the Worker’s **Deployments/Versions** dashboard and deploy a known-good earlier version. Keep release version IDs in your release notes. For the first verified release, that ID is `bbe52129-8fc8-4aad-9e49-91f602ae55f4`.

## 8. Legacy Pages, if needed

In the checked `cf` beta, **`cf pages deploy` is a compatibility stub**, despite its advertised directory argument. To publish a separate legacy Pages Direct Upload project, use Wrangler’s Pages uploader:

```sh
npx --no-install cf pages create --name cvaiex --production-branch main
npx wrangler pages deploy dist --project-name cvaiex --branch main
```

That is a different hosting route from the live Worker. Its custom domain must be associated with the Pages project before relying on a CNAME. Direct Upload projects can use external CI uploads; switching to Git-integrated Pages requires a new project according to Cloudflare’s current documentation.

## 9. Folder rename

You can move/rename this checkout from `cvaie` to `cvaiex`. Configuration and scripts resolve paths relative to the project, so the next build regenerates portable output. The package name, Worker name, and GitHub repository name are all **`cvaiex`**. Generated output from the old folder is disposable.

## References

- CLI launch: <https://blog.cloudflare.com/cloudflare-cf-cli-launch/>
- CLI source: <https://github.com/cloudflare/cf>
- Workers static assets: <https://developers.cloudflare.com/workers/static-assets/>
- Pages Direct Upload: <https://developers.cloudflare.com/pages/get-started/direct-upload/>
- Pages custom domains: <https://developers.cloudflare.com/pages/configuration/custom-domains/>

For command discovery, use anonymous searches such as `cf cli search "list worker deployments"`, then inspect the returned command’s help/schema. Keep account IDs, credentials, and domains out of discovery queries.
