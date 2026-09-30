import { defineConfig } from 'cf/config';

export default defineConfig({
  worker: {
    name: 'cvaiex',
    compatibilityDate: '2026-09-30',
    workersDev: true,
    assets: {
      htmlHandling: 'auto-trailing-slash',
      notFoundHandling: '404-page',
    },
  },
});
