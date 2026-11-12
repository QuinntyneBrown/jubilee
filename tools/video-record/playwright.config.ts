import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * Captures the screenshots of a journey demo film (docs/videos/README.md, "How a journey demo is
 * built"). It is not a test run and not a sweep: it only opens the running Angular app and saves
 * pictures of it. The film folder's `shots.ts` says which states to open, with the fixtures and page
 * objects of `e2e/`, so every `/api` request is answered as in the behaviour specs (ADR 0009).
 *
 *   JB_VIDEO_DIR=docs/videos/NN-topic NODE_PATH=e2e/node_modules \
 *     e2e/node_modules/.bin/playwright test -c tools/video-record/playwright.config.ts
 */
const folder = process.env['JB_VIDEO_DIR'];
if (!folder) throw new Error('Set JB_VIDEO_DIR to the film folder, for example docs/videos/03-topic.');
const root = path.resolve(__dirname, '..', '..');

export default defineConfig({
  testDir: path.resolve(root, folder),
  testMatch: 'shots.ts',
  outputDir: path.resolve(root, 'e2e', 'test-results', 'video-record'),
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4200',
    locale: 'en-CA',
    timezoneId: 'America/Toronto',
    trace: 'off',
  },
  // Chromium only (AGENTS.md).
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: `npm start --prefix "${path.resolve(root, 'frontend')}" -- --port 4200`,
      url: 'http://localhost:4200',
      reuseExistingServer: true,
      timeout: 240_000,
    },
  ],
});
