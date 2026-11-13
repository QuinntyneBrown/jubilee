// Acceptance Test
// Traces to: L2-257
// Description: a moderator opens a software platform in the admin application and reads its web
// address and its founder's words; the address is a link that carries nothing of Jubilee with it.

import { expect, test } from '../fixtures/jb-test';
import { LISTING_ID, PLATFORM_LISTING, stubAdmin } from '../fixtures/admin';
import { AdminListingPage } from '../pages/admin-listing.page';

// Against a stand-in for the admin endpoints (ADR 0009).

const LISTING = `/listings/${LISTING_ID}`;

test.describe('a software platform in the admin application (L2-257)', () => {
  test('L2-257 AC2: the moderator reads the address and the founder’s words beside the preview', async ({
    page,
    jb,
  }) => {
    // Given a published platform
    const listing = new AdminListingPage(page);
    await listing.setWidth(1280);
    await stubAdmin(page, { fields: PLATFORM_LISTING });

    // When a moderator opens it
    await jb.gotoAdmin(LISTING);

    // Then the page says what it is and who owns it
    await expect(listing.heading).toHaveText('Lanternread');
    await expect(listing.subtitle).toContainText('Software platforms · published');
    await expect(listing.subtitle).toContainText('Live');
    await expect(listing.takeDown).toBeVisible();
    await expect(listing.ownerRow('Name')).toHaveText('Abigail Thornton');
    // and the platform's own panel shows the address and the founder's words
    await expect(listing.platformRow('Web address')).toContainText('https://lanternread.example');
    await expect(listing.platformRow('What it does')).toContainText('Families log the books');
    await expect(listing.platformRow('Who it is for')).toContainText('Families with children');
    await expect(listing.platformRow('Pricing')).toHaveText(
      'Free for families. Schools pay per classroom.',
    );
    await expect(listing.platform).toContainText(
      'Jubilee never opens or checks this address. Follow it yourself to see what the listing describes.',
    );
    // and the address is a link that leaves Jubilee in a new tab, with no referrer
    await expect(listing.platformLink).toHaveAttribute('href', 'https://lanternread.example');
    await expect(listing.platformLink).toHaveAttribute('target', '_blank');
    await expect(listing.platformLink).toHaveAttribute('rel', 'noopener noreferrer nofollow');
    await expect(listing.platformLink).toContainText('(opens in a new tab)');
    // and the preview is the card members see
    await expect(listing.previewHeading).toHaveText('How members see it');
    await expect(listing.preview).toContainText('A reading log families keep together');
    await expect(listing.previewTag).toHaveText('Software');
    await expect(listing.previewPerks).toHaveText(['Free for families']);
  });

  test('L2-257 AC2: an address that fails the rule is shown as text and never as a link', async ({
    page,
    jb,
  }) => {
    // Given a platform whose stored address is not an https address
    const listing = new AdminListingPage(page);
    await stubAdmin(page, {
      fields: {
        ...PLATFORM_LISTING,
        platform: { ...PLATFORM_LISTING.platform, address: 'javascript:alert(1)', website: null },
      },
    });

    // When a moderator opens it
    await jb.gotoAdmin(LISTING);

    // Then the address is there to read and there is nothing to follow
    await expect(listing.platformRow('Web address')).toHaveText('javascript:alert(1)');
    await expect(listing.platformLink).toHaveCount(0);
  });

  test('L2-257 AC2: a business has no platform panel', async ({ page, jb }) => {
    const listing = new AdminListingPage(page);
    await stubAdmin(page);

    await jb.gotoAdmin(LISTING);

    await expect(listing.heading).toHaveText('Luzandre.com');
    await expect(listing.platform).toHaveCount(0);
  });
});
