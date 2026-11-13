import { expect, test } from '../fixtures/jb-test';
import {
  INSTALLED_APP_URL,
  deviceOffline,
  waitForAppShell,
  waitForSnapshot,
} from '../fixtures/offline';
import { BrowsePage } from '../pages/browse.page';
import { ConnectionBannerRegion } from '../pages/connection-banner';

// The installed app (L2-119 AC3, L2-120 AC5, ADR 0068): the production build with its service
// worker, served on its own port. The worker leaves /api to the network, so the page is answered
// by Playwright mocking as in every other spec (ADR 0009).

test.describe('the installed app (L2-119 AC3)', () => {
  // The worker installs the app shell in the background before the device can go offline.
  test.describe.configure({ timeout: 120_000 });

  test('Jubilee opens with no connection and shows the directory saved last', async ({
    page,
    jb,
  }) => {
    const browse = new BrowsePage(page);
    const banner = new ConnectionBannerRegion(page);
    await browse.setWidth(1280);
    await jb.goto(`${INSTALLED_APP_URL}/`);
    await expect(browse.featuredCards.first()).toBeVisible();
    await waitForSnapshot(page, 'browse-home');
    await waitForAppShell(page);

    await deviceOffline(page);
    await page.reload();

    await expect(browse.featuredCards.first()).toBeVisible();
    await expect(banner.root).toContainText(/Showing the directory saved at \d+:\d\d [ap]\.m\./);
  });
});
