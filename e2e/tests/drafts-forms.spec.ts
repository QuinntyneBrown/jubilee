import type { Page } from '@playwright/test';
import { stubBooking } from '../fixtures/booking';
import { stubFeedback } from '../fixtures/feedback';
import { naomi, stubIncoming } from '../fixtures/incoming-requests';
import { expect, test, type Jb } from '../fixtures/jb-test';
import { stubMyBusiness } from '../fixtures/my-business';
import { stubOrder } from '../fixtures/order';
import { stubProfile } from '../fixtures/profile';
import { stubQuote } from '../fixtures/quote';
import {
  PASSWORD,
  joannaSession,
  refuseAsExpired,
  stubSession,
  type FakeSession,
} from '../fixtures/session';
import { stubSpaceRequest } from '../fixtures/space-request';
import { AccountPage } from '../pages/account.page';
import { BusinessPage } from '../pages/business.page';
import { DeclineRequestDialog } from '../pages/decline-request.dialog';
import { EditListingPage } from '../pages/edit-listing.page';
import { FeedbackPage } from '../pages/feedback.page';
import { IncomingRequestsPage } from '../pages/incoming-requests.page';
import { BookMeetingDialog, RequestItemDialog, RequestQuoteDialog } from '../pages/messages.page';
import { RequestSpaceDialog } from '../pages/request-space.dialog';
import { SessionExpiredPage, SignInPage } from '../pages/sign-in.page';
import { Toasts } from '../pages/toasts';

// Every form a member writes in keeps its draft (L2-116 AC1, AC3; L2-010 AC4): the session ends
// as the form is sent, and after signing in again the member is on the same page with what they
// typed. The API is answered by Playwright mocking (ADR 0009).

const KEPT = 'We kept what you typed';
const naomiSession = { ...naomi, email: 'naomi.laurent@example.com', emailStatus: 'confirmed' };

/** The session ends; `send` is the call that learns of it. Then the member signs in again. */
async function endSessionAndSignInAgain(
  page: Page,
  session: FakeSession,
  refused: string | RegExp,
  send: () => Promise<void>,
  returnUrl: string,
): Promise<void> {
  const expired = new SessionExpiredPage(page);
  session.expire();
  await refuseAsExpired(page, refused);
  await send();
  await expect.poll(() => expired.dataPage()).toBe('session-expired');
  await expect(expired.signIn).toHaveAttribute(
    'href',
    `/sign-in?returnUrl=${encodeURIComponent(returnUrl)}`,
  );
  await page.unroute(refused);
  await expired.signIn.click();
  await new SignInPage(page).signInWith(String(session.member['email']), PASSWORD);
  await expect(new Toasts(page).withTitle(KEPT)).toBeVisible();
}

test.describe('every form keeps its draft when the session ends (L2-116)', () => {
  test.beforeEach(async ({ page }) => {
    await new BusinessPage(page).setWidth(1280);
  });

  test('a booking: the day, the time and the note are back', async ({ page, jb }) => {
    const dialog = new BookMeetingDialog(page);
    const session = await stubSession(page, { signedIn: true });
    await stubBooking(page);
    await jb.goto('/b/legacy-financial/book');
    await dialog.day.fill('2026-11-12');
    await dialog.time('10:00 a.m.').click();
    await dialog.note.fill('RRSPs and a giving plan.');

    await endSessionAndSignInAgain(
      page,
      session,
      '**/api/requests/bookings',
      () => dialog.send.click(),
      '/b/legacy-financial/book',
    );

    await expect(dialog.day).toHaveValue('2026-11-12');
    await expect(dialog.time('10:00 a.m.').getByRole('radio')).toBeChecked();
    await expect(dialog.note).toHaveValue('RRSPs and a giving plan.');
  });

  test('a quote request: what is needed and the budget are back', async ({ page, jb }) => {
    const dialog = new RequestQuoteDialog(page);
    const session = await stubSession(page, { signedIn: true });
    await stubQuote(page);
    await jb.goto('/b/luzandre/quote');
    await dialog.what.fill('Forty tees for our youth retreat, two colours.');
    await dialog.budget.fill('900');

    await endSessionAndSignInAgain(
      page,
      session,
      '**/api/requests/quotes',
      () => dialog.send.click(),
      '/b/luzandre/quote',
    );

    await expect(dialog.what).toHaveValue('Forty tees for our youth retreat, two colours.');
    await expect(dialog.budget).toHaveValue('900');
  });

  test('an order request: the way to get it, the address it reveals and the note are back', async ({
    page,
    jb,
  }) => {
    const dialog = new RequestItemDialog(page);
    const address = '/b/luzandre/p/faith-heavyweight-tee-charcoal/request?option=M&quantity=1';
    const session = await stubSession(page, { signedIn: true });
    await stubOrder(page);
    await jb.goto(address);
    await dialog.method('Ship to me').click();
    await dialog.address.fill('48 Woodmount Ave, East York, ON M4C 3X9');
    await dialog.note.fill('Please leave it with the neighbour at 50.');

    await endSessionAndSignInAgain(
      page,
      session,
      '**/api/requests/orders',
      () => dialog.send.click(),
      address,
    );

    await expect(dialog.method('Ship to me').getByRole('radio')).toBeChecked();
    await expect(dialog.address).toHaveValue('48 Woodmount Ave, East York, ON M4C 3X9');
    await expect(dialog.note).toHaveValue('Please leave it with the neighbour at 50.');
  });

  test('a space request: the dates and the note are back', async ({ page, jb }) => {
    const dialog = new RequestSpaceDialog(page);
    const session = await stubSession(page, { signedIn: true });
    await stubSpaceRequest(page);
    await jb.goto('/b/roncesvalles-guest-suite/request');
    await dialog.checkIn.fill('2026-12-11');
    await dialog.checkOut.fill('2026-12-13');
    await dialog.note.fill('Two adults, no pets.');

    await endSessionAndSignInAgain(
      page,
      session,
      '**/api/requests/spaces',
      () => dialog.send.click(),
      '/b/roncesvalles-guest-suite/request',
    );

    await expect(dialog.checkIn).toHaveValue('2026-12-11');
    await expect(dialog.checkOut).toHaveValue('2026-12-13');
    await expect(dialog.note).toHaveValue('Two adults, no pets.');
  });

  test('a bug report: where it happened and both descriptions are back', async ({ page, jb }) => {
    const feedback = new FeedbackPage(page);
    const session = await stubSession(page, { signedIn: true });
    await stubFeedback(page);
    await jb.goto('/feedback/bug');
    await feedback.where.selectOption({ label: 'Requests' });
    await feedback.happened.fill('The button said Sending for a minute.');
    await feedback.expected.fill('A confirmation.');
    await feedback.often('Every time').click();

    await endSessionAndSignInAgain(
      page,
      session,
      /\/api\/feedback\/bug-reports$/,
      () => feedback.submit.click(),
      '/feedback/bug',
    );

    await expect(feedback.where.locator('option:checked')).toHaveText('Requests');
    await expect(feedback.happened).toHaveValue('The button said Sending for a minute.');
    await expect(feedback.expected).toHaveValue('A confirmation.');
  });

  test('the profile: a changed phone number is back and can still be saved', async ({
    page,
    jb,
  }) => {
    const account = new AccountPage(page);
    const session = await stubSession(page, { signedIn: true });
    const profile = await stubProfile(page);
    await jb.goto('/account');
    await account.phone.fill('647-555-0199');

    await endSessionAndSignInAgain(
      page,
      session,
      '**/api/account/profile',
      () => account.save.click(),
      '/account',
    );

    await expect(account.phone).toHaveValue('647-555-0199');
    await stubProfile(page);
    expect(profile.profiles).toHaveLength(0);
    await expect(account.save).toBeEnabled();
    await expect(account.discard).toBeEnabled();
  });

  test('a listing being edited: the changed line is back', async ({ page, jb }) => {
    const editor = new EditListingPage(page);
    await stubMyBusiness(page);
    const session = await stubSession(page, { signedIn: true, member: naomiSession });
    await jb.goto('/my-business/listing');
    await editor.tagline.fill('Christian apparel, printed in Leslieville');

    await endSessionAndSignInAgain(
      page,
      session,
      /\/api\/my-business\/listing$/,
      () => editor.save.click(),
      '/my-business/listing',
    );

    await expect(editor.tagline).toHaveValue('Christian apparel, printed in Leslieville');
  });
});

test.describe('a form without an address of its own keeps its draft for the same request (L2-116)', () => {
  /** Opens Naomi's requests with a decline message typed for Ruth, ends the session and signs in again. */
  async function declineInterrupted(page: Page, jb: Jb): Promise<void> {
    const requests = new IncomingRequestsPage(page);
    const dialog = new DeclineRequestDialog(page);
    const expired = new SessionExpiredPage(page);
    await requests.setWidth(1280);
    await stubIncoming(page);
    const session = await stubSession(page, { signedIn: true, member: naomiSession });
    await jb.goto('/my-business/requests');
    await requests.declineButton('Ruth Mensah').click();
    await dialog.message.fill('We’re out of the gold glaze until December. So sorry, Ruth.');

    session.expire();
    const refused = /\/api\/my-business\/requests\/[^/]+\/decline$/;
    await refuseAsExpired(page, refused);
    await dialog.decline.click();
    await expect.poll(() => expired.dataPage()).toBe('session-expired');
    await page.unroute(refused);
    await stubIncoming(page);
    await stubSession(page, { member: naomiSession });
    await expired.signIn.click();
    await new SignInPage(page).signInWith(naomiSession.email, PASSWORD);
    await expect(requests.declineButton('Ruth Mensah')).toBeVisible();
  }

  test('the decline message is back when the owner opens the same request again', async ({
    page,
    jb,
  }) => {
    const requests = new IncomingRequestsPage(page);
    const dialog = new DeclineRequestDialog(page);
    await declineInterrupted(page, jb);
    await expect(new Toasts(page).withTitle(KEPT)).toHaveCount(0);

    await requests.declineButton('Ruth Mensah').click();

    await expect(dialog.message).toHaveValue(
      'We’re out of the gold glaze until December. So sorry, Ruth.',
    );
    await expect(new Toasts(page).withTitle(KEPT)).toBeVisible();
  });

  test('the decline message written for one customer is not put into another customer’s', async ({
    page,
    jb,
  }) => {
    const requests = new IncomingRequestsPage(page);
    const dialog = new DeclineRequestDialog(page);
    await declineInterrupted(page, jb);

    await requests.declineButton('Samuel Park').click();

    await expect(dialog.title).toContainText('Samuel');
    await expect(dialog.message).toHaveValue('');
    await expect(new Toasts(page).withTitle(KEPT)).toHaveCount(0);
  });
});
