import { LISTING_ID, esther, stubAdmin } from '../fixtures/admin';
import { expect, test } from '../fixtures/jb-test';
import { AdminVerificationPage } from '../pages/admin-verification.page';
import { AdminVerificationsPage } from '../pages/admin-verifications.page';
import { ApproveListingDialog } from '../pages/approve-listing.dialog';
import { DeclineListingDialog } from '../pages/decline-listing.dialog';
import { ForbiddenPage } from '../pages/forbidden.page';
import { RequestChangesDialog } from '../pages/request-changes.dialog';

const REVIEW = `/admin/verifications/${LISTING_ID}`;

test.describe('verify a listing: access and the queue (L2-098, L2-099)', () => {
  test('L2-098 AC1: a member who is not on the team is shown the forbidden page and the queue is never asked for', async ({
    page,
    jb,
  }) => {
    const forbidden = new ForbiddenPage(page);
    await forbidden.setWidth(1280);
    const fake = await stubAdmin(page, {}, { ...esther, isVerifier: false });
    await jb.goto('/admin/verifications');

    await expect(forbidden.heading).toHaveText('You don’t have access to this page');
    await expect(forbidden.text).toContainText('the Jubilee verification team');
    await expect(forbidden.backToBrowse).toBeVisible();
    await expect(forbidden.askForAccess).toBeVisible();
    await expect(forbidden.topBarLink(/Verifications/)).toHaveCount(0);
    expect(fake.queueRequests).toEqual([]);
  });

  test('L2-098 AC3: the top bar of the team counts the listings ready to review', async ({
    page,
    jb,
  }) => {
    const queue = new AdminVerificationsPage(page);
    await queue.setWidth(1280);
    await stubAdmin(page);
    await jb.goto('/admin/verifications');

    const link = queue.topBarLink(/^Verifications/);
    await expect(link).toHaveAttribute('aria-current', 'page');
    await expect(queue.badgeIn(link)).toHaveAccessibleName('2 waiting');
  });

  test('L2-098 AC3: on a phone the tab bar has a Verify entry', async ({ page, jb }) => {
    const queue = new AdminVerificationsPage(page);
    await queue.setWidth(360);
    await stubAdmin(page);
    await jb.goto('/admin/verifications');

    await expect(queue.tab('Verify')).toHaveAttribute('aria-current', 'page');
  });

  test('L2-099 AC1: the queue says how many listings wait and how long the oldest has', async ({
    page,
    jb,
  }) => {
    const queue = new AdminVerificationsPage(page);
    await queue.setWidth(1280);
    await stubAdmin(page);
    await jb.goto('/admin/verifications');

    await expect(queue.heading).toHaveText('Verification queue');
    await expect(queue.subtitle).toHaveText(
      '4 listings · 2 ready to review · oldest waiting 4 days',
    );
    await expect(queue.filter(/Ready to review/)).toHaveAttribute('aria-selected', 'true');
    await expect(queue.filter(/Waiting on reference/)).toContainText('1');
    await expect(queue.filter(/Needs a decision/)).toContainText('1');
    await expect(queue.filter(/Changes requested/)).toContainText('0');
  });

  test('L2-099 AC2: each row names the business, owner and church reference, with the reference in words', async ({
    page,
    jb,
  }) => {
    const queue = new AdminVerificationsPage(page);
    await queue.setWidth(1280);
    await stubAdmin(page);
    await jb.goto('/admin/verifications');

    await expect(queue.rows).toHaveCount(2);
    await expect(queue.row('Luzandre.com')).toContainText('Shops');
    await expect(queue.row('Luzandre.com')).toContainText('Naomi Laurent');
    await expect(queue.row('Luzandre.com')).toContainText('Confirmed');
    await expect(queue.row('Luzandre.com')).toContainText('9:40 a.m.');
    await expect(queue.row('Park Insurance Brokers')).toContainText('Financial & insurance');
  });

  test('L2-099 AC3: choosing another stage asks for that stage', async ({ page, jb }) => {
    const queue = new AdminVerificationsPage(page);
    await queue.setWidth(1280);
    const fake = await stubAdmin(page);
    await jb.goto('/admin/verifications');
    await expect(queue.rows).toHaveCount(2);

    await queue.filter(/Needs a decision/).click();

    await expect(queue.filter(/Needs a decision/)).toHaveAttribute('aria-selected', 'true');
    await expect(queue.rows).toHaveCount(1);
    await expect(queue.row('Okafor & Sons Furniture')).toContainText('Can’t vouch');
    expect(fake.queueRequests.at(-1)).toContain('stage=needs-a-decision');
  });

  test('L2-099 AC3: a stage with no listings says so and offers the ready ones', async ({
    page,
    jb,
  }) => {
    const queue = new AdminVerificationsPage(page);
    await queue.setWidth(1280);
    await stubAdmin(page);
    await jb.goto('/admin/verifications');

    await queue.filter(/Changes requested/).click();

    await expect(queue.empty).toContainText('Nothing here right now');
    await queue.empty.getByRole('button', { name: 'Show ready to review' }).click();
    await expect(queue.rows).toHaveCount(2);
  });

  test('L2-099 AC4: an empty queue says it is clear', async ({ page, jb }) => {
    const queue = new AdminVerificationsPage(page);
    await queue.setWidth(1280);
    await stubAdmin(page, { queue: 'empty' });
    await jb.goto('/admin/verifications');

    await expect(queue.subtitle).toHaveText('Nothing waiting');
    await expect(queue.empty).toContainText('The queue is clear');
  });

  test('L2-099 AC6: a queue that cannot load quotes JB-ADM-503 and can be retried', async ({
    page,
    jb,
  }) => {
    const queue = new AdminVerificationsPage(page);
    await queue.setWidth(1280);
    const fake = await stubAdmin(page, { queue: 'fails' });
    await jb.goto('/admin/verifications');

    await expect(queue.alert).toContainText('We couldn’t load the queue');
    await expect(queue.reference).toHaveText('JB-ADM-503');
    fake.queue = 'ok';
    await queue.tryAgain.click();
    await expect(queue.rows).toHaveCount(2);
  });

  test('L2-099: a row opens the review of that listing', async ({ page, jb }) => {
    const queue = new AdminVerificationsPage(page);
    await queue.setWidth(1280);
    await stubAdmin(page);
    await jb.goto('/admin/verifications');

    await queue.businessLink('Luzandre.com').click();

    await expect(page).toHaveURL(new RegExp(`${REVIEW}$`));
    await expect(new AdminVerificationPage(page).heading).toHaveText('Luzandre.com');
  });
});

test.describe('verify a listing: the review (L2-100)', () => {
  test('AC1: the review shows the owner, the church reference answer and the checklist', async ({
    page,
    jb,
  }) => {
    const review = new AdminVerificationPage(page);
    await review.setWidth(1280);
    await stubAdmin(page);
    await jb.goto(REVIEW);

    await expect(review.heading).toHaveText('Luzandre.com');
    await expect(review.subtitle).toContainText('Shops');
    await expect(review.subtitle).toContainText('Ready to review');
    await expect(review.owner).toContainText('Naomi Laurent');
    await expect(review.owner).toContainText('naomi@luzandre.example · confirmed');
    await expect(review.churchReference).toContainText('Grace Toronto Church');
    await expect(review.churchReference).toContainText('Daniel Okoro, Lead pastor');
    await expect(review.churchReference).toContainText('Knows them and can vouch');
    await expect(review.churchReference).toContainText(
      '“Naomi has served on our hospitality team for six years.”',
    );
    await expect(review.churchReference).toContainText('Private. Never shown to the owner');
    await expect(review.checks).toHaveCount(5);
    await expect(review.preview).toContainText('Pending verification');
    await expect(review.breadcrumb).toContainText('Verification queue');
  });

  test('AC3: ticking and unticking a check saves the checklist', async ({ page, jb }) => {
    const review = new AdminVerificationPage(page);
    await review.setWidth(1280);
    const fake = await stubAdmin(page);
    await jb.goto(REVIEW);

    await review.check(/Tagline and description/).uncheck();

    await expect(review.check(/Tagline and description/)).not.toBeChecked();
    expect(fake.checklists.at(-1)?.ticked).toEqual([
      'owner-name',
      'reference',
      'photos',
      'category',
    ]);
  });

  test('AC5: a listing that cannot be decided on yet says why and cannot be approved', async ({
    page,
    jb,
  }) => {
    const review = new AdminVerificationPage(page);
    await review.setWidth(1280);
    await stubAdmin(page, { cannotDecideBecause: 'Waiting for the church reference.' });
    await jb.goto(REVIEW);

    await expect(review.notices).toContainText('Waiting for the church reference.');
    await expect(review.approve).toBeDisabled();
  });

  test('AC6: a review that cannot load quotes JB-ADM-502 and can be retried', async ({
    page,
    jb,
  }) => {
    const review = new AdminVerificationPage(page);
    await review.setWidth(1280);
    const fake = await stubAdmin(page, { review: 'fails' });
    await jb.goto(REVIEW);

    await expect(review.alert).toContainText('We couldn’t load this listing');
    await expect(review.reference).toHaveText('JB-ADM-502');
    fake.review = 'ok';
    await review.tryAgain.click();
    await expect(review.heading).toHaveText('Luzandre.com');
  });

  test('L2-098 AC5: a verifier cannot decide on their own listing', async ({ page, jb }) => {
    const review = new AdminVerificationPage(page);
    await review.setWidth(1280);
    await stubAdmin(page, { isOwnListing: true });
    await jb.goto(REVIEW);

    await expect(review.notices).toContainText('This is your own listing');
    await expect(review.approve).toHaveCount(0);
    await expect(review.requestChanges).toHaveCount(0);
  });
});

test.describe('verify a listing: approve (L2-101)', () => {
  test('AC1, AC2: approving publishes the listing with the Verified mark and says the owner was e-mailed', async ({
    page,
    jb,
  }) => {
    const review = new AdminVerificationPage(page);
    const dialog = new ApproveListingDialog(page);
    await review.setWidth(1280);
    const fake = await stubAdmin(page);
    await jb.goto(REVIEW);

    await review.approve.click();
    await expect(dialog.title).toHaveText('Approve and publish Luzandre.com?');
    await expect(dialog.description).toContainText('goes live in Shops straight away');
    await expect(dialog.warning).toHaveCount(0);
    await expect(dialog.notYet).toBeFocused();
    await dialog.approve.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(review.notices.first()).toContainText('Approved and live');
    await expect(review.notices.first()).toContainText('Naomi has been e-mailed');
    await expect(review.preview).toContainText('Verified');
    await expect(review.approve).toHaveCount(0);
    expect(fake.approvals).toEqual([{ id: LISTING_ID, note: null }]);
  });

  test('AC3: approving with a check unticked needs a note', async ({ page, jb }) => {
    const review = new AdminVerificationPage(page);
    const dialog = new ApproveListingDialog(page);
    await review.setWidth(1280);
    const fake = await stubAdmin(page, { ticked: ['owner-name', 'reference', 'category'] });
    await jb.goto(REVIEW);

    await review.approve.click();
    await expect(dialog.warning).toContainText('2 checklist items are not ticked');
    await dialog.approve.click();

    await expect(dialog.noteError).toHaveText('Say why you are approving with items unticked.');
    await expect(dialog.note).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.note).toBeFocused();
    expect(fake.approvals).toEqual([]);

    await dialog.note.fill('Photos to follow; the owner is well known to us.');
    await dialog.approve.click();

    await expect(dialog.root).toHaveCount(0);
    expect(fake.approvals).toEqual([
      { id: LISTING_ID, note: 'Photos to follow; the owner is well known to us.' },
    ]);
  });

  test('a failed approval says the listing is still in the queue and can be tried again', async ({
    page,
    jb,
  }) => {
    const review = new AdminVerificationPage(page);
    const dialog = new ApproveListingDialog(page);
    await review.setWidth(1280);
    const fake = await stubAdmin(page, { decision: 'fails' });
    await jb.goto(REVIEW);

    await review.approve.click();
    await dialog.approve.click();

    await expect(dialog.alert).toContainText('We couldn’t publish it');
    await expect(dialog.alert).toContainText('The listing is still in the queue');
    fake.decision = 'ok';
    await dialog.tryAgain.click();
    await expect(dialog.root).toHaveCount(0);
    expect(fake.approvals).toHaveLength(1);
  });

  test('Not yet closes the dialog and changes nothing', async ({ page, jb }) => {
    const review = new AdminVerificationPage(page);
    const dialog = new ApproveListingDialog(page);
    await review.setWidth(1280);
    const fake = await stubAdmin(page);
    await jb.goto(REVIEW);

    await review.approve.click();
    await dialog.notYet.click();

    await expect(dialog.root).toHaveCount(0);
    expect(fake.approvals).toEqual([]);
  });
});

test.describe('verify a listing: request changes (L2-102)', () => {
  test('AC2: the message and at least one area are required', async ({ page, jb }) => {
    const review = new AdminVerificationPage(page);
    const dialog = new RequestChangesDialog(page);
    await review.setWidth(1280);
    const fake = await stubAdmin(page);
    await jb.goto(REVIEW);

    await review.requestChanges.click();
    await expect(dialog.title).toHaveText('Ask Naomi for changes');
    await expect(dialog.areas).toHaveCount(4);
    await dialog.send.click();

    await expect(dialog.errors.nth(0)).toHaveText('Choose at least one thing to change.');
    await expect(dialog.errors.nth(1)).toHaveText('Tell the owner exactly what to change.');
    await expect(dialog.message).toHaveAttribute('aria-invalid', 'true');
    expect(fake.changeRequests).toEqual([]);
  });

  test('AC1, AC3: the areas and the message are sent and the listing waits on the owner', async ({
    page,
    jb,
  }) => {
    const review = new AdminVerificationPage(page);
    const dialog = new RequestChangesDialog(page);
    await review.setWidth(1280);
    const fake = await stubAdmin(page);
    await jb.goto(REVIEW);

    await review.requestChanges.click();
    await dialog.area('Tagline or description').check();
    await dialog.area('Photos').check();
    await dialog.message.fill('Add two photos and shorten the tagline.');
    await dialog.send.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(review.notices.first()).toContainText('has been e-mailed');
    await expect(review.subtitle).toContainText('Changes requested');
    await expect(review.notices.first()).toContainText('Changes requested');
    expect(fake.changeRequests).toEqual([
      {
        id: LISTING_ID,
        areas: ['tagline', 'photos'],
        message: 'Add two photos and shorten the tagline.',
      },
    ]);
  });

  test('a failed request keeps what was typed', async ({ page, jb }) => {
    const review = new AdminVerificationPage(page);
    const dialog = new RequestChangesDialog(page);
    await review.setWidth(1280);
    await stubAdmin(page, { decision: 'fails' });
    await jb.goto(REVIEW);

    await review.requestChanges.click();
    await dialog.area('Photos').check();
    await dialog.message.fill('Add a photo.');
    await dialog.send.click();

    await expect(dialog.alert).toContainText('We couldn’t send the request');
    await expect(dialog.message).toHaveValue('Add a photo.');
    await expect(dialog.area('Photos')).toBeChecked();
  });
});

test.describe('verify a listing: decline (L2-104)', () => {
  test('AC1: a listing that needs a decision can be declined with a reason', async ({
    page,
    jb,
  }) => {
    const review = new AdminVerificationPage(page);
    const dialog = new DeclineListingDialog(page);
    await review.setWidth(1280);
    const fake = await stubAdmin(page, { stage: 'needs-a-decision' });
    await jb.goto(REVIEW);

    await review.decline.click();
    await expect(dialog.title).toHaveText('Decline Luzandre.com?');
    await dialog.decline.click();
    await expect(dialog.error).toHaveText('Tell the owner why the listing was declined.');
    await expect(dialog.reason).toBeFocused();
    expect(fake.declines).toEqual([]);

    await dialog.reason.fill('Your church reference could not vouch for you.');
    await dialog.decline.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(review.subtitle).toContainText('Declined');
    expect(fake.declines).toEqual([
      { id: LISTING_ID, reason: 'Your church reference could not vouch for you.' },
    ]);
  });

  test('a listing that is ready to review cannot be declined', async ({ page, jb }) => {
    const review = new AdminVerificationPage(page);
    await review.setWidth(1280);
    await stubAdmin(page);
    await jb.goto(REVIEW);

    await expect(review.decline).toHaveCount(0);
  });
});
