import { defineConfig } from '@playwright/test';
const deployedURL = process.env.PLAYWRIGHT_BASE_URL;
export default defineConfig({
  timeout: 90000,
  testDir: './tests/browser',
  use: { baseURL: deployedURL ?? 'http://localhost:4321', viewport: { width: 1440, height: 1000 }, launchOptions: { args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } },
  webServer: deployedURL ? undefined : { command: 'npm run dev -- --ignore-lock', url: 'http://localhost:4321', reuseExistingServer: true, timeout: 60000 },
});
