// Acceptance Test
// Traces to: L2-295
// Description: a moderator opens a non-profit in the admin application and reads its two
// addresses and its own words; an address is a link only when it passes the rule, and carries
// nothing of Jubilee with it.

import { expect, test } from '../fixtures/jb-test';
import { LISTING_ID, NONPROFIT_LISTING, stubAdmin } from '../fixtures/admin';
import { AdminListingPage } from '../pages/admin-listing.page';

// Against a stand-in for the admin endpoints (ADR 0009).

const LISTING = `/listings/${LISTING_ID}`;

test.describe('a non-profit in the admin application (L2-295)', () => {
  test('AC2: the moderator reads the addresses and the non-profit’s words beside the preview', async ({
    page,
    jb,
  }) => {
    // Given a published non-profit
    const listing = new AdminListingPage(page);
    await listing.setWidth(1280);
    await stubAdmin(page, { fields: NONPROFIT_LISTING });

    // When a moderator opens it
    await jb.gotoAdmin(LISTING);

    // Then the page says what it is and who leads it
    await expect(listing.heading).toHaveText('Hope House Toronto');
    await expect(listing.subtitle).toContainText('Non-profits · published');
    await expect(listing.takeDown).toBeVisible();
    await expect(listing.ownerRow('Name')).toHaveText('Grace Adeyemi');
    // and the panel "The non-profit" shows its addresses and its own words
    await expect(listing.nonprofit.getByRole('heading')).toHaveText('The non-profit');
    await expect(listing.nonprofitRow('Website')).toContainText('https://hopehouse.example');
    await expect(listing.nonprofitRow('Page for giving')).toContainText(
      'https://hopehouse.example/give',
    );
    await expect(listing.nonprofitRow('Its mission')).toContainText('Hope House is a home');
    await expect(listing.nonprofitRow('Who it serves')).toHaveText(
      'Men aged 18 and over moving out of Toronto’s shelters.',
    );
    await expect(listing.nonprofitRow('Where in Toronto it works')).toHaveText(
      'Moss Park and Regent Park',
    );
    await expect(listing.nonprofit).toContainText(
      'Jubilee never opens or checks these addresses. Follow them yourself to see what the listing describes.',
    );
    // and each address is a link that leaves Jubilee in a new tab, with no referrer
    await expect(listing.nonprofitLinks).toHaveCount(2);
    for (const link of await listing.nonprofitLinks.all()) {
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer nofollow');
      await expect(link).toContainText('(opens in a new tab)');
    }
    // and the preview is the card members see
    await expect(listing.previewHeading).toHaveText('How members see it');
    await expect(listing.preview).toContainText(
      'Meals, beds and friendship for men leaving the shelter system.',
    );
    await expect(listing.previewTag).toHaveText('Non-profit');
    await expect(listing.previewPerks).toHaveText(['Volunteers welcome']);
  });

  test('AC2: an address that fails the rule is shown as text and never as a link', async ({
    page,
    jb,
  }) => {
    // Given a non-profit whose stored page for giving is not an https address
    const listing = new AdminListingPage(page);
    await stubAdmin(page, {
      fields: {
        ...NONPROFIT_LISTING,
        nonprofit: {
          ...NONPROFIT_LISTING.nonprofit,
          giveAddress: 'javascript:alert(1)',
          giveUrl: null,
        },
      },
    });

    // When a moderator opens it
    await jb.gotoAdmin(LISTING);

    // Then the address is there to read and only the website can be followed
    await expect(listing.nonprofitRow('Page for giving')).toHaveText('javascript:alert(1)');
    await expect(listing.nonprofitLinks).toHaveCount(1);
    await expect(listing.nonprofitLinks).toHaveAttribute('href', 'https://hopehouse.example');
  });

  test('AC2: a non-profit with no page for giving has no row for it, as on its page', async ({ page, jb }) => {
    const listing = new AdminListingPage(page);
    await stubAdmin(page, {
      fields: {
        ...NONPROFIT_LISTING,
        nonprofit: { ...NONPROFIT_LISTING.nonprofit, giveAddress: '', giveUrl: null },
      },
    });

    await jb.gotoAdmin(LISTING);

    await expect(listing.nonprofitRow('Page for giving')).toHaveCount(0);
    await expect(listing.nonprofitRow('Website')).toContainText('https://hopehouse.example');
    await expect(listing.nonprofitLinks).toHaveCount(1);
  });

  test('AC2: a business has no non-profit panel', async ({ page, jb }) => {
    const listing = new AdminListingPage(page);
    await stubAdmin(page);

    await jb.gotoAdmin(LISTING);

    await expect(listing.heading).toHaveText('Luzandre.com');
    await expect(listing.nonprofit).toHaveCount(0);
  });
});
