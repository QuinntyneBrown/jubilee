import { LISTING_ID, SPACE_LISTING, stubAdmin } from '../fixtures/admin';
import { daniel } from '../fixtures/staff';
import { expect, test } from '../fixtures/jb-test';
import { AdminListingPage } from '../pages/admin-listing.page';
import { AdminListingsPage } from '../pages/admin-listings.page';
import { TakeDownListingDialog } from '../pages/take-down-listing.dialog';

// Journey 12, keep listings honest (ADR 0057): nobody verifies a listing before it goes live; the
// Jubilee team looks through what was published and takes down a listing that misrepresents a
// business.

const LISTING = `/listings/${LISTING_ID}`;
const REASON =
  'The web address in the listing’s name leads to a different company’s store, so members could not tell who they were buying from.';

test.describe('keep listings honest: access and the listings (L2-098, L2-099)', () => {
  test('L2-098 AC1, L2-188 AC4: a staff member without the moderator role is told so and the listings are never asked for', async ({
    page,
    jb,
  }) => {
    const listings = new AdminListingsPage(page);
    await listings.setWidth(1280);
    const fake = await stubAdmin(page, {}, daniel);
    await jb.gotoAdmin('/listings');

    await expect(listings.statusHeading).toHaveText('Nothing here for your role');
    await expect(listings.statusText).toHaveText(
      'These screens are for the Jubilee team. Ask a Jubilee administrator to add the moderator role to your staff account.',
    );
    await expect(listings.navLink('Listings')).toHaveCount(0);
    await expect(listings.staffRole).toHaveText('Administrator');
    expect(fake.listRequests).toEqual([]);
  });

  test('L2-098 AC3: the admin bar names Listings, Reports and Featured; only Reports carries a count', async ({
    page,
    jb,
  }) => {
    const listings = new AdminListingsPage(page);
    await listings.setWidth(1280);
    await stubAdmin(page);
    await jb.gotoAdmin('/listings');

    await expect(listings.staffNav.getByRole('link')).toHaveText([
      'Listings',
      'Reports 3',
      'Featured',
    ]);
    await expect(listings.navLink('Listings')).toHaveAttribute('aria-current', 'page');
    await expect(listings.badgeIn(listings.navLink('Listings'))).toHaveCount(0);
    await expect(listings.staffRole).toHaveText('Moderator');
  });

  test('L2-188 AC6: on a phone the staff navigation stays, in a row under the lockup', async ({
    page,
    jb,
  }) => {
    const listings = new AdminListingsPage(page);
    await listings.setWidth(360);
    await stubAdmin(page);
    await jb.gotoAdmin('/listings');

    await expect(listings.navLink('Listings')).toHaveAttribute('aria-current', 'page');
    await expect(listings.navLink('Reports')).toBeVisible();
    await expect(listings.staffName).toBeHidden();
    await expect(listings.signOut).toBeVisible();
    expect(await listings.overflowsHorizontally()).toBe(false);
  });

  test('L2-099 AC1, AC2: the listings are counted and listed newest first with their status', async ({
    page,
    jb,
  }) => {
    const listings = new AdminListingsPage(page);
    await listings.setWidth(1280);
    await stubAdmin(page);
    await jb.gotoAdmin('/listings');

    await expect(listings.heading).toHaveText('Listings');
    await expect(listings.subtitle).toHaveText('6 listings · 4 published in the last 7 days');
    await expect(listings.columns).toHaveText([
      'Business',
      'Category',
      'Owner',
      'Published',
      'Status',
    ]);
    await expect(listings.rows).toHaveCount(6);
    await expect(listings.rows.first()).toContainText('Luzandre.com');
    await expect(listings.row('Luzandre.com')).toContainText('Flagged');
    await expect(listings.cells('Luzandre.com').nth(1)).toHaveText('Shops');
    await expect(listings.cells('Luzandre.com').nth(2)).toHaveText('Naomi Laurent');
    await expect(listings.cells('Luzandre.com').nth(4)).toHaveText('Live');
    await expect(listings.cells('Flower Creations').nth(4)).toHaveText('Paused');
    await expect(listings.cells('Moore’s Cleaning Service').nth(4)).toHaveText('On hold');
    await expect(listings.row('Okafor & Sons Furniture')).not.toContainText('Flagged');
  });

  test('L2-099 AC3: a search by name asks for it and keeps the matching listings', async ({
    page,
    jb,
  }) => {
    const listings = new AdminListingsPage(page);
    await listings.setWidth(1280);
    const fake = await stubAdmin(page);
    await jb.gotoAdmin('/listings');
    await expect(listings.rows).toHaveCount(6);

    await listings.searchFor('okafor');

    await expect(listings.rows).toHaveCount(1);
    await expect(listings.businessLink('Okafor & Sons Furniture')).toBeVisible();
    expect(fake.listRequests.at(-1)).toBe('?q=okafor');
  });

  test('L2-099 AC3: a search that matches nothing says so and can be cleared', async ({
    page,
    jb,
  }) => {
    const listings = new AdminListingsPage(page);
    await listings.setWidth(1280);
    await stubAdmin(page);
    await jb.gotoAdmin('/listings');

    await listings.searchFor('Grace Bakery');

    await expect(listings.empty).toContainText('No listing matches “Grace Bakery”.');
    await listings.clearSearch.click();
    await expect(listings.rows).toHaveCount(6);
    await expect(listings.search).toHaveValue('');
  });

  test('L2-099 AC4: with no published listing the page says so', async ({ page, jb }) => {
    const listings = new AdminListingsPage(page);
    await listings.setWidth(1280);
    await stubAdmin(page, { listings: 'empty' });
    await jb.gotoAdmin('/listings');

    await expect(listings.empty).toContainText('No listings yet');
    await expect(listings.empty).toContainText(
      'A listing appears here as soon as its owner publishes it.',
    );
    await expect(listings.refresh).toBeVisible();
  });

  test('L2-099 AC5: listings that cannot load quote JB-ADM-503 and can be retried', async ({
    page,
    jb,
  }) => {
    const listings = new AdminListingsPage(page);
    await listings.setWidth(1280);
    const fake = await stubAdmin(page, { listings: 'fails' });
    await jb.gotoAdmin('/listings');

    await expect(listings.empty).toContainText('We couldn’t load the listings');
    await expect(listings.reference).toHaveText('JB-ADM-503');
    fake.listings = 'ok';
    await listings.tryAgain.click();
    await expect(listings.rows).toHaveCount(6);
  });

  test('L2-099: a row opens that listing', async ({ page, jb }) => {
    const listings = new AdminListingsPage(page);
    await listings.setWidth(1280);
    await stubAdmin(page);
    await jb.gotoAdmin('/listings');

    await listings.businessLink('Luzandre.com').click();

    await expect(page).toHaveURL(new RegExp(`${LISTING}$`));
    await expect(new AdminListingPage(page).heading).toHaveText('Luzandre.com');
  });
});

test.describe('keep listings honest: one listing (L2-100)', () => {
  test('AC1 to AC3: the listing shows where it stands, its owner, its flags and how members see it, and names no church', async ({
    page,
    jb,
  }) => {
    const listing = new AdminListingPage(page);
    await listing.setWidth(1280);
    await stubAdmin(page);
    await jb.gotoAdmin(LISTING);

    await expect(listing.breadcrumb).toContainText('Listings');
    await expect(listing.heading).toHaveText('Luzandre.com');
    await expect(listing.subtitle).toContainText('Shops · published');
    await expect(listing.subtitle).toContainText('Live');
    await expect(listing.takeDown).toBeEnabled();
    await expect(listing.ownerRow('Name')).toHaveText('Naomi Laurent');
    await expect(listing.ownerRow('E-mail')).toHaveText('naomi@luzandre.example · confirmed');
    // L2-079 AC3: the owner's other listings and drafts, each with its stage
    await expect(listing.ownerRow('Other listings')).toHaveText('Laurent Photography · Draft');
    await expect(listing.flags).toContainText(
      'The name or tagline contains a web address, e-mail address, phone number or discount code. Check that it belongs to this business.',
    );
    await expect(listing.previewHeading).toHaveText('How members see it');
    await expect(listing.preview).toContainText('Luzandre.com');
    await expect(listing.preview).not.toContainText(/Verified|Pending|Not published/);
    await expect(listing.main).not.toContainText(/church|checklist|approve/i);
  });

  test('AC4: a listing that cannot load quotes JB-ADM-502 and leads back to the listings', async ({
    page,
    jb,
  }) => {
    const listing = new AdminListingPage(page);
    await listing.setWidth(1280);
    await stubAdmin(page, { listing: 'fails' });
    await jb.gotoAdmin(LISTING);

    await expect(listing.reference).toHaveText('JB-ADM-502');
    await expect(listing.backToListings).toHaveAttribute('href', '/listings');
  });

  test('AC5: a listing taken down says when, by whom and why, and cannot be taken down again', async ({
    page,
    jb,
  }) => {
    const listing = new AdminListingPage(page);
    await listing.setWidth(1280);
    await stubAdmin(page, {
      takenDown: { at: '2026-11-10T14:05:00-05:00', byName: 'Esther Mensah', reason: REASON },
    });
    await jb.gotoAdmin(LISTING);

    await expect(listing.subtitle).toContainText('Taken down');
    await expect(listing.takedown).toContainText('Taken down Tue 10 Nov by Esther Mensah.');
    await expect(listing.takedown).toContainText(REASON);
    await expect(listing.takeDown).toHaveCount(0);
  });

  test('L2-098 AC5: a moderator cannot take down their own listing', async ({ page, jb }) => {
    const listing = new AdminListingPage(page);
    await listing.setWidth(1280);
    await stubAdmin(page, { isOwnListing: true });
    await jb.gotoAdmin(LISTING);

    await expect(listing.main).toContainText('This is your own listing');
    await expect(listing.takeDown).toHaveCount(0);
  });

  test('L2-200 AC3: a published space shows its terms and details and never its exact address', async ({
    page,
    jb,
  }) => {
    const listing = new AdminListingPage(page);
    await listing.setWidth(1280);
    await stubAdmin(page, { fields: SPACE_LISTING });
    await jb.gotoAdmin(LISTING);

    await expect(listing.heading).toHaveText('Bright basement apartment in the Annex');
    await expect(listing.spaceRow('Term')).toHaveText('Long term');
    await expect(listing.spaceRow('Rent')).toHaveText('$1,850 per month');
    await expect(listing.spaceRow('Neighbourhood')).toHaveText('The Annex');
    await expect(listing.ownerRow('Other listings')).toHaveText('None');
    await expect(listing.space).toContainText('The exact address is never shown here');
    await expect(listing.previewHeading).toHaveText('How renters see it');
    await expect(listing.spacePreview).toBeVisible();
  });
});

test.describe('keep listings honest: take down a listing (L2-101)', () => {
  test('AC1: the dialog says what happens and asks for the reason', async ({ page, jb }) => {
    const listing = new AdminListingPage(page);
    const dialog = new TakeDownListingDialog(page);
    await listing.setWidth(1280);
    await stubAdmin(page);
    await jb.gotoAdmin(LISTING);

    await listing.takeDown.click();

    await expect(dialog.title).toHaveText('Take down Luzandre.com?');
    await expect(dialog.description).toHaveText(
      'It leaves Jubilee straight away and Naomi is e-mailed your reason. Use this when a listing misrepresents a business.',
    );
    await expect(dialog.reason).toHaveAttribute('maxlength', '1000');
    await expect(dialog.hint).toHaveText(
      'Sent to Naomi by e-mail. Be kind and specific. 1,000 characters at most.',
    );
    await expect(dialog.keep).toBeVisible();
  });

  test('AC2: an empty reason is refused and nothing is sent', async ({ page, jb }) => {
    const listing = new AdminListingPage(page);
    const dialog = new TakeDownListingDialog(page);
    await listing.setWidth(1280);
    const fake = await stubAdmin(page);
    await jb.gotoAdmin(LISTING);
    await listing.takeDown.click();

    await dialog.takeDown.click();

    await expect(dialog.error).toHaveText('Tell the owner why it was taken down.');
    await expect(dialog.reason).toBeFocused();
    expect(fake.takedowns).toEqual([]);
  });

  test('AC3: taking the listing down sends the reason and says the owner was e-mailed', async ({
    page,
    jb,
  }) => {
    const listing = new AdminListingPage(page);
    const dialog = new TakeDownListingDialog(page);
    await listing.setWidth(1280);
    const fake = await stubAdmin(page);
    await jb.gotoAdmin(LISTING);
    await listing.takeDown.click();

    await dialog.reason.fill(REASON);
    await dialog.takeDown.click();

    await expect(dialog.root).toHaveCount(0);
    expect(fake.takedowns).toEqual([{ id: LISTING_ID, reason: REASON }]);
    await expect(listing.takedown).toContainText('Taken down');
    await expect(listing.takedown).toContainText(
      'You took down Luzandre.com today at 2:05 p.m. Naomi has been e-mailed your reason.',
    );
    await expect(listing.subtitle).toContainText('Taken down');
    await expect(listing.takeDown).toHaveCount(0);
  });

  test('AC4: a failed takedown says the listing is still live and keeps the reason', async ({
    page,
    jb,
  }) => {
    const listing = new AdminListingPage(page);
    const dialog = new TakeDownListingDialog(page);
    await listing.setWidth(1280);
    const fake = await stubAdmin(page, { takeDown: 'fails' });
    await jb.gotoAdmin(LISTING);
    await listing.takeDown.click();
    await dialog.reason.fill(REASON);

    await dialog.takeDown.click();

    await expect(dialog.alert).toContainText('We couldn’t take it down.');
    await expect(dialog.alert).toContainText('The listing is still live. Try again.');
    await expect(dialog.reason).toHaveValue(REASON);
    fake.takeDown = 'ok';
    await dialog.takeDown.click();
    await expect(dialog.root).toHaveCount(0);
  });

  test('Keep it closes the dialog and changes nothing', async ({ page, jb }) => {
    const listing = new AdminListingPage(page);
    const dialog = new TakeDownListingDialog(page);
    await listing.setWidth(1280);
    const fake = await stubAdmin(page);
    await jb.gotoAdmin(LISTING);
    await listing.takeDown.click();

    await dialog.keep.click();

    await expect(dialog.root).toHaveCount(0);
    expect(fake.takedowns).toEqual([]);
    await expect(listing.takeDown).toBeVisible();
  });
});
