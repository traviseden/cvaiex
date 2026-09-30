import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

import { cloudflareStaticOutput } from './scripts/cloudflare-static-output.mjs';

export default defineConfig({
  site: 'https://www.cvaiex.org',
  output: 'static',
  integrations: [sitemap(), cloudflareStaticOutput()],
  devToolbar: { enabled: false },
});
