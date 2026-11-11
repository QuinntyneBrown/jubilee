import { expect, test } from '../fixtures/jb-test';
import { MarketingHomePage } from '../pages/marketing-home.page';

// The marketing site (L1-026, ADR 0013): a static page, so no recorded API answers are involved.

test.describe('marketing home page (L2-183)', () => {
  test('AC1: the page shows its sections in order, from the top bar to the footer', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    // Given anyone, when they open the marketing site
    await jb.open('marketing-home');
    // Then the top bar
    await expect(home.lockup).toHaveText('jubilee');
    await expect(home.sectionLinks).toHaveText([
      'Why Jubilee',
      'How it works',
      'Inside the app',
      'For businesses',
    ]);
    await expect(home.openJubilee).toBeVisible();
    // And the opening
    await expect(home.heading).toHaveText('Toronto’s Christian businesses, in one place.');
    await expect(home.lead).toHaveText(
      'Jubilee is where Toronto’s Christian community finds shops, advisors and trades it can trust. Every business is vouched for by a church, so you can shop, hire and recommend with confidence.',
    );
    await expect(home.startBrowsing).toBeVisible();
    await expect(home.watchTheFilm).toBeVisible();
    await expect(home.note).toHaveText('Free for members · Every business church-verified');
    // And every section heading, in order (AC7: each reads as one sentence)
    await expect(home.headings).toHaveText([
      'See Jubilee in action.',
      'Trust, built in.',
      'From need to handshake.',
      'Shops and services, side by side.',
      'Run a Christian-owned business? Be found.',
      'Your community is open for business.',
    ]);
    // And the footer
    await expect(home.footer).toContainText('Toronto’s Christian marketplace · jubilee.to');
    await expect.poll(() => home.dataPage()).toBe('marketing-home');
  });
});
