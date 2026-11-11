import { test as base, expect, type Page } from '@playwright/test';
import { joanna, mockNow, type NavigationSummary } from './cast';
import { routes, type RouteKey, type ScreenRoute, type Who } from './routes';
import { installMockApi, saveShard } from './mock-api';
import { applyStub } from './stubs';

export const BASELINE = process.env['JB_BASELINE'] === '1';
export type Theme = 'light' | 'dark';

export interface OpenOptions {
  theme?: Theme;
  /** Overrides who is signed in for this visit (app only). */
  who?: Who;
  /** Overrides the navigation summary a member gets (app only). */
  navigation?: Partial<NavigationSummary>;
  /** The time the device clock shows (app only); the mocks' "today", 9:00 a.m., by default. */
  now?: Date;
}

/** Opens screens by route key against the app, or against the mocks when JB_BASELINE=1. */
export class Jb {
  constructor(private readonly page: Page) {}

  async open(key: RouteKey, options: OpenOptions = {}): Promise<void> {
    const route: ScreenRoute = routes[key];
    if (BASELINE) {
      const theme = options.theme ?? 'light';
      await this.page.goto(`${route.mock}?chrome=0&theme=${theme}`);
      return;
    }
    await this.signInAs(options.who ?? route.who, options.navigation);
    if (route.stub) await applyStub(this.page, route.stub);
    if ('via' in route && route.via) {
      await this.goto(route.via, options.theme, options.now);
      await this.page.locator(`main a[href="${route.app}"]`).first().click();
      return;
    }
    await this.goto(route.app, options.theme, options.now);
  }

  /** Opens an app path as it is, answered from the recording unless stubs were installed first. */
  async goto(path: string, theme: Theme = 'light', now: Date = mockNow): Promise<void> {
    await this.page.clock.setFixedTime(now);
    await this.page.addInitScript((value) => {
      localStorage.setItem('jubilee-theme', value);
    }, theme);
    await this.page.goto(path);
    // The app renders after it has resolved the session; wait for its shell.
    await this.page.locator('main#main').waitFor({ state: 'attached' });
  }

  /**
   * Signing in arrives with a later journey, so a member session is supplied at the
   * network edge: the app sees exactly what the session and navigation endpoints return.
   */
  async signInAs(who: Who, navigation: OpenOptions['navigation'] = {}): Promise<void> {
    if (who === 'visitor') return;
    await this.page.route('**/api/session', (r) => r.fulfill({ json: joanna.session }));
    await this.page.route('**/api/me/navigation', (r) =>
      r.fulfill({ json: { ...joanna.navigation, ...navigation } }),
    );
  }
}

export const test = base.extend<{ jb: Jb }, { apiRecording: void }>({
  // ADR 0009: no test reaches the API. Every /api request of the page is answered from the
  // recording, and one without a recorded answer fails the test.
  page: async ({ page }, use) => {
    const unanswered: string[] = [];
    // A write that gets no answer is not retried for a minute in a test (L2-121); a spec that needs the waits sets them.
    await page.addInitScript(() => {
      (globalThis as { __jbTimings?: object }).__jbTimings = { retryWindow: 0 };
    });
    if (!BASELINE) await installMockApi(page, unanswered);
    await use(page);
    expect(unanswered, 'API requests without a recorded answer (ADR 0009)').toEqual([]);
  },
  jb: async ({ page }, use) => {
    await use(new Jb(page));
  },
  // While recording, each worker keeps what the real API answered.
  apiRecording: [
    async ({}, use, workerInfo) => {
      await use();
      saveShard(workerInfo.workerIndex);
    },
    { scope: 'worker', auto: true },
  ],
});

export { expect };

/** The five widths every responsive criterion runs at (L2-163). */
export const widths = [360, 576, 768, 992, 1280] as const;
export const themes: Theme[] = ['light', 'dark'];
