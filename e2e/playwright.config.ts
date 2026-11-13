import { defineConfig, devices } from '@playwright/test';

/**
 * One suite, two targets (AGENTS.md):
 * - default: the Angular app on :4200, the marketing site on :4201 and the admin application on
 *   :4202. It never reaches the API: every /api request is answered
 *   from fixtures/api/responses.json by Playwright API mocking (ADR 0009). JB_RECORD_API=1
 *   (`npm run record-api`) instead lets the API started by eng/Start-E2eApi.ps1 answer, and
 *   records its answers;
 * - JB_BASELINE=1: the static design reference in docs/mocks, served on :4300, used to render
 *   the visual baselines the app is then compared with.
 *
 * - JB_PARITY (`npm run parity`, ADR 0035): the component parity specs of tests/parity/ and
 *   nothing else. `mocks` renders their baselines from docs/mocks and from the Magic Patterns
 *   reference images; `app` compares the app with them.
 *
 * ADR 0010: only the behaviour specs run. The sweeps (visual parity, responsive fit, automated
 * accessibility) are kept and maintained but run only when the repository owner runs
 * `npm run sweeps` by hand, which sets JB_SWEEPS=1.
 */
const parity = process.env['JB_PARITY'] as 'mocks' | 'app' | undefined;
// The mocks are the target: the sweeps' baseline render, or the parity specs' one.
const mocks = process.env['JB_BASELINE'] === '1' || parity === 'mocks';
const baseline = process.env['JB_BASELINE'] === '1';
const ci = !!process.env['CI'];
const recording = process.env['JB_RECORD_API'] === '1';
const sweeps = process.env['JB_SWEEPS'] === '1' || baseline;
const sweepSpecs = ['visual/**/*.spec.ts', 'responsive.spec.ts', 'accessibility.spec.ts'];
const paritySpecs = 'parity/**/*.spec.ts';

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
  {
    // The marketing site (ADR 0013), a second application of the same workspace.
    command: 'npm run start:marketing --prefix ../frontend',
    url: 'http://localhost:4201',
    reuseExistingServer: !ci,
    timeout: 240_000,
  },
  {
    // The admin application (ADR 0040), the third application; its /api is answered like the app's.
    command: 'npm run start:admin --prefix ../frontend',
    url: 'http://localhost:4202',
    reuseExistingServer: !ci,
    timeout: 240_000,
  },
];

// The production build of the app, with its service worker (ADR 0068), served by the host's own
// server as on Azure. Only the service worker spec opens it; every other spec uses `ng serve`.
const installedAppServer = {
  command: 'npm run build:app --prefix ../frontend && node ../eng/azure/server.js',
  url: 'http://localhost:4203',
  env: { PORT: '4203', STATIC_ROOT: '../frontend/dist/jubilee/browser' },
  reuseExistingServer: !ci,
  timeout: 400_000,
};

export default defineConfig({
  testDir: './tests',
  // Baseline runs only render the mocks; behaviour specs need the app.
  testMatch: parity ? paritySpecs : baseline ? 'visual/**/*.spec.ts' : '**/*.spec.ts',
  // The parity specs run under `npm run parity` only, the sweeps under `npm run sweeps` only.
  testIgnore: parity ? [] : sweeps ? [paritySpecs] : [paritySpecs, ...sweepSpecs],
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
    baseURL: mocks ? 'http://localhost:4300/mocks/' : 'http://localhost:4200',
    locale: 'en-CA',
    timezoneId: 'America/Toronto',
    trace: 'off',
  },
  // Chromium only (AGENTS.md).
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Parity compares pixels: without this flag Chromium draws text with coloured (LCD)
        // edges on some layers and grey edges on others, so the same text can differ between
        // the mock and the app by how the page happens to be layered.
        ...(parity ? { launchOptions: { args: ['--disable-lcd-text'] } } : {}),
      },
    },
  ],
  webServer: mocks
    ? [mocksServer]
    : recording
      ? [apiServer, ...appServers, installedAppServer]
      : parity
        ? appServers
        : [...appServers, installedAppServer],
  globalTeardown: recording ? './fixtures/record-api-teardown.ts' : undefined,
});
