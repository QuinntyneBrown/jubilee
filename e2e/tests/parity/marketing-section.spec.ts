import type { Locator } from '@playwright/test';
import { parity, type ParityCase } from '../../fixtures/parity';
import { MarketingHomePage } from '../../pages/marketing-home.page';

// jb-marketing-heading in each size the marketing site uses, and jb-marketing-section in each
// tone. A region taller than the viewport would be captured with the navigation bar over it, so
// the headings are compared on their own at both widths, and a whole section at 1280 px, where
// it fits the viewport.
const on = (
  name: string,
  region: (screen: MarketingHomePage) => Locator,
  widths?: ParityCase['widths'],
): ParityCase<MarketingHomePage> => ({
  name,
  route: 'marketing-home',
  screen: (page) => new MarketingHomePage(page),
  region,
  ...(widths ? { widths } : {}),
});

parity('marketing-section', {
  cases: [
    on('heading-display', (screen) => screen.openingHeading),
    on('heading-film', (screen) => screen.filmHeading),
    on('heading-lead', (screen) => screen.whyHeading),
    on('heading-measure', (screen) => screen.howHeading),
    on('heading-aside', (screen) => screen.insideHeading),
    on('heading-ink', (screen) => screen.forBusinessesHeading),
    on('section-split', (screen) => screen.why, [1280]),
    on('section-surface', (screen) => screen.how, [1280]),
    on('section-ink', (screen) => screen.forBusinesses, [1280]),
    on('section-closing', (screen) => screen.closing),
  ],
  reference: {
    absent: 'The captured Magic Patterns frames are of the app; none shows the marketing site.',
    nearestFrame: 'home-1280.png',
  },
});
