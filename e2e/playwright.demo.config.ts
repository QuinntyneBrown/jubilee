import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

/**
 * Records the narrated demo videos of docs/videos (docs/videos/README.md). Not a test run: it is
 * started by `node tools/video-demo/build.mjs docs/videos/NN-topic`, one `demo.spec.ts` at a time,
 * against the app answered from the recorded API (ADR 0009). It sets neither JB_SWEEPS nor
 * JB_BASELINE.
 */
export default defineConfig({
  testDir: '../docs/videos',
  testMatch: '**/demo.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 15 * 60_000,
  reporter: 'list',
  outputDir: '../.cache/video-demo/test-results',
  use: { trace: 'off' },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // The screencast is drawn in device pixels: 1280x720 at 1.5 gives 1920x1080 frames.
        launchOptions: { args: ['--force-device-scale-factor=1.5'] },
      },
    },
  ],
  webServer: base.webServer,
});
