import type { Page } from '@playwright/test';
import { parity } from '../../fixtures/parity';
import type { RouteKey } from '../../fixtures/routes';
import { LaunchFormScreen, MarketingHomePage } from '../../pages/marketing-home.page';

// jb-launch-form: the panel of a form of the launching-soon page, at rest and in each state the
// mocks draw. In the app a state is reached by sending the form against its route's stub.
const on = (
  name: string,
  route: RouteKey,
  which: 'notify' | 'business',
  filled: boolean,
  noticed = false,
) => ({
  name,
  route,
  screen: (page: Page) => new LaunchFormScreen(page, which, filled, noticed),
  region: (screen: LaunchFormScreen) => screen.part.form,
});
const atRest = (name: string, which: 'notify' | 'business') => ({
  name,
  route: 'marketing-home' as RouteKey,
  screen: (page: Page) => new MarketingHomePage(page),
  region: (screen: MarketingHomePage) =>
    (which === 'notify' ? screen.notifyForm : screen.businessForm).form,
});

parity('launch-form', {
  cases: [
    atRest('notify-default', 'notify'),
    on('notify-invalid', 'marketing-home.notify-invalid', 'notify', false),
    on('notify-busy', 'marketing-home.notify-busy', 'notify', true),
    on('notify-retrying', 'marketing-home.notify-retrying', 'notify', true, true),
    on('notify-rate-limited', 'marketing-home.notify-rate-limited', 'notify', true),
    atRest('business-default', 'business'),
    // Taller than a phone's viewport with its seven messages: at 360 px the sticky top bar would be
    // captured over it, so it is compared at 1280 px, where it fits.
    {
      ...on('business-invalid', 'marketing-home.business-invalid', 'business', false),
      widths: [1280] as const,
    },
    on('business-busy', 'marketing-home.business-busy', 'business', true),
    on('business-retrying', 'marketing-home.business-retrying', 'business', true, true),
    on('business-challenge-failed', 'marketing-home.business-challenge-failed', 'business', true),
  ],
  reference: {
    absent:
      'The Magic Patterns design has no launching-soon frame (ADR 0044); the mocks are the source.',
    nearestFrame: 'list-your-business-1280.png',
  },
});
