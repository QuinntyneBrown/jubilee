import { LISTING_ID, SPACE_LISTING, stubAdmin } from '../fixtures/admin';
import { LISTING_ROWS, stubAdminTables } from '../fixtures/admin-tables';
import { miriam } from '../fixtures/staff';
import { expect, test } from '../fixtures/jb-test';
import { AdminListingPage } from '../pages/admin-listing.page';
import { AdminRecordsPage } from '../pages/admin-records.page';
import { TakeDownListingDialog } from '../pages/take-down-listing.dialog';

// Journey 12, keep listings honest (ADR 0057): nobody verifies a listing before it goes live; the
// Jubilee team looks through what was published and takes down a listing that misrepresents a
// business.

const LISTING = `/listings/${LISTING_ID}`;
const REASON =
  'The web address in the listing’s name leads to a different company’s store, so members could not tell who they were buying from.';

test.describe('keep listings honest: the Listings table (L2-099)', () => {
  test('AC1: the table says what it holds and shows its columns, newest first', async ({
    page,
    jb,
  }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1280);
    const fake = await stubAdminTables(page, miriam);
    await jb.gotoAdmin('/listings');

    await expect(records.heading).toHaveText('Listings');
    await expect(records.lead).toHaveText(
      'Every shop, service and space on Jubilee. Unpublishing hides it from Browse immediately.',
    );
    await expect(records.columnHeaders).toHaveText([
      '',
      'ID',
      'Name',
      'Kind',
      'Status',
      'Owner',
      'Category',
      'Neighbourhood',
      'Actions',
    ]);
    await expect(records.bodyRows.first()).toContainText('Luzandre.com');
    // No sort is asked for, so the database's order applies: newest first.
    expect(fake.rowRequests).toEqual(['/listings']);
  });

  test('AC5: listings that cannot load say so with JB-ADM-503, and Try again reads them again', async ({
    page,
    jb,
  }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1280);
    const fake = await stubAdminTables(page, miriam, { answer: 'fails' });
    await jb.gotoAdmin('/listings');

    await expect(records.error).toContainText('We couldn’t load listings');
    await expect(records.error).toContainText('JB-ADM-503');
    fake.answer = 'ok';
    await records.retry().click();
    await expect(records.bodyRows).toHaveCount(2);
  });

  test('a listing’s name opens that listing', async ({ page, jb }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1280);
    await stubAdminTables(page, miriam);
    await stubAdmin(page);
    await jb.gotoAdmin('/listings');

    await records.row('Luzandre.com').getByRole('link', { name: 'Luzandre.com' }).click();

    await expect(page).toHaveURL(new RegExp(`/listings/${LISTING_ROWS[0].id}$`));
  });
});

test.describe('keep listings honest: one listing (L2-100)', () => {
  test('L2-013 AC8: the owner panel gives the owner’s pronouns, so the team words what it writes about them', async ({
    page,
    jb,
  }) => {
    const listing = new AdminListingPage(page);
    await stubAdmin(page);
    await jb.gotoAdmin(LISTING);

    await expect(listing.ownerRow('Name')).toHaveText('Naomi Laurent');
    await expect(listing.ownerRow('Pronouns')).toHaveText('she/her');
  });

  test('L2-013 AC8: an owner who set no pronouns has no pronouns row', async ({ page, jb }) => {
    const listing = new AdminListingPage(page);
    await stubAdmin(page, { ownerPronouns: null });
    await jb.gotoAdmin(LISTING);

    await expect(listing.ownerRow('Name')).toHaveText('Naomi Laurent');
    await expect(listing.ownerRow('Pronouns')).toHaveCount(0);
  });

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
