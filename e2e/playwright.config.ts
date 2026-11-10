import { defineConfig, devices } from '@playwright/test';

/**
 * One suite, two targets (AGENTS.md):
 * - default: the Angular app on :4200. It never reaches the API: every /api request is answered
 *   from fixtures/api/responses.json by Playwright API mocking (ADR 0009). JB_RECORD_API=1
 *   (`npm run record-api`) instead lets the API started by eng/Start-E2eApi.ps1 answer, and
 *   records its answers;
 * - JB_BASELINE=1: the static design reference in docs/mocks, served on :4300, used to render
 *   the visual baselines the app is then compared with.
 */
const baseline = process.env['JB_BASELINE'] === '1';
const ci = !!process.env['CI'];
const recording = process.env['JB_RECORD_API'] === '1';

const mocksServer = {
  command: 'npx http-server ../docs -p 4300 -c-1 --silent',
  url: 'http://localhost:4300/mocks/index.html',
  reuseExistingServer: !ci,
};

const apiServer = {
  command: 'pwsh ../eng/Start-E2eApi.ps1',
  url: 'http://localhost:5080/api/health',
  reuseExistingServer: true,
  timeout: 240_000,
};

const appServers = [
  {
    command: 'npm start --prefix ../frontend -- --port 4200',
    url: 'http://localhost:4200',
    reuseExistingServer: !ci,
    timeout: 240_000,
  },
];

export default defineConfig({
  testDir: './tests',
  // Baseline runs only render the mocks; behaviour specs need the app.
  testMatch: baseline ? 'visual/**/*.spec.ts' : '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  reporter: ci ? [['list'], ['html', { open: 'never' }]] : 'list',
  snapshotPathTemplate: '{testDir}/../__baselines__/{arg}{ext}',
  expect: {
    // ADR 0005: the threshold of L2-163. Mock and app are rendered by the same browser on the
    // same machine, so only sub-pixel text differences are tolerated.
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled', caret: 'hide' },
  },
  use: {
    baseURL: baseline ? 'http://localhost:4300/mocks/' : 'http://localhost:4200',
    locale: 'en-CA',
    timezoneId: 'America/Toronto',
    trace: 'off',
  },
  // Chromium only (AGENTS.md).
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: baseline ? [mocksServer] : recording ? [apiServer, ...appServers] : appServers,
  globalTeardown: recording ? './fixtures/record-api-teardown.ts' : undefined,
});
