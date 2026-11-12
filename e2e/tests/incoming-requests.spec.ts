import { expect, test } from '../fixtures/jb-test';
import { DAVID, RUTH, SAMUEL, stubIncoming } from '../fixtures/incoming-requests';
import { ConfirmRequestDialog } from '../pages/confirm-request.dialog';
import { DeclineRequestDialog } from '../pages/decline-request.dialog';
import { ForbiddenPage } from '../pages/forbidden.page';
import { IncomingRequestsPage } from '../pages/incoming-requests.page';
import { Toasts } from '../pages/toasts';

const PATH = '/my-business/requests';

test.describe('respond to customer requests: the list (L2-051)', () => {
  test('L2-051 AC1: the page says how many are new and offers the four tabs with their counts', async ({
    page,
    jb,
  }) => {
    const requests = new IncomingRequestsPage(page);
    await requests.setWidth(1280);
    await stubIncoming(page);
    await jb.goto(PATH);

    await expect(requests.heading).toHaveText('Luzandre.com');
    await expect(requests.subtitle).toHaveText(
      '3 new · reply within a day to keep your “replies fast” badge',
    );
    await expect(requests.statusTab(/^New/)).toHaveAttribute('aria-selected', 'true');
    await expect(requests.statusTab(/^New/)).toContainText('3');
    await expect(requests.statusTab(/^Confirmed/)).toContainText('0');
    await expect(requests.statusTab(/^Declined/)).toContainText('0');
    await expect(requests.statusTab(/^All/)).toContainText('3');
  });

  test('L2-051 AC2: each new request shows the initials, title, who and when, the note, Decline and Confirm', async ({
    page,
    jb,
  }) => {
    const requests = new IncomingRequestsPage(page);
    await requests.setWidth(1280);
    await stubIncoming(page);
    await jb.goto(PATH);

    await expect(requests.rows).toHaveCount(3);
    const samuel = requests.row('Samuel Park');
    await expect(samuel).toContainText('SP');
    await expect(samuel).toContainText('Custom church team tee × 24');
    await expect(samuel).toContainText('Order · Samuel Park ·');
    await expect(samuel).toContainText('For Agincourt Community Church youth retreat');
    await expect(requests.declineButton('Samuel Park')).toBeVisible();
    await expect(requests.confirmButton('Samuel Park')).toBeVisible();
    await expect(requests.row('David Chen')).toContainText('Quote · David Chen ·');
  });

  test('L2-051 AC3: with no requests at all the page invites the owner to share the listing', async ({
    page,
    jb,
  }) => {
    const requests = new IncomingRequestsPage(page);
    await requests.setWidth(1280);
    await stubIncoming(page, { list: 'empty' });
    await jb.goto(PATH);

    await expect(requests.empty).toContainText('No requests yet');
    await expect(requests.empty).toContainText(
      'When a member orders a product, books a service or asks for a quote, it lands here for you to confirm or decline.',
    );
    await expect(requests.shareListing).toHaveAttribute('href', '/b/luzandre-com');
  });

  test('L2-051 AC4: an empty Declined tab says declined requests are kept for 90 days and goes back to New', async ({
    page,
    jb,
  }) => {
    const requests = new IncomingRequestsPage(page);
    await requests.setWidth(1280);
    await stubIncoming(page);
    await jb.goto(PATH);

    await requests.statusTab(/^Declined/).click();

    await expect(requests.statusTab(/^Declined/)).toHaveAttribute('aria-selected', 'true');
    await expect(requests.empty).toContainText('You haven’t declined any requests');
    await expect(requests.empty).toContainText('Declined requests are kept here for 90 days.');
    await requests.empty.getByRole('button', { name: 'Show new requests' }).click();
    await expect(requests.rows).toHaveCount(3);
  });

  test('L2-051 AC5, L2-070 AC1: a request that arrives over the event stream appears at the top at once, with one toast', async ({
    page,
    jb,
  }) => {
    const requests = new IncomingRequestsPage(page);
    const toasts = new Toasts(page);
    await requests.setWidth(1280);
    const fake = await stubIncoming(page);
    await jb.goto(PATH);
    await expect(requests.rows).toHaveCount(3);

    fake.arrive();

    // Well inside the five seconds a timer would take: the stream told the page.
    await expect(requests.rows).toHaveCount(4, { timeout: 2_500 });
    await expect(requests.rows.first()).toContainText('Grace Adeyemi');
    await expect(requests.statusTab(/^New/)).toContainText('4');
    const toast = toasts.withTitle('New booking request');
    await expect(toast).toHaveCount(1);
    await expect(toast).toContainText('Grace Adeyemi asked for Consultation.');
    await expect(toasts.all).toHaveCount(1);
  });

  test('L2-051 AC5: a request the customer cancels leaves the open page without the owner asking', async ({
    page,
    jb,
  }) => {
    const requests = new IncomingRequestsPage(page);
    await requests.setWidth(1280);
    const fake = await stubIncoming(page);
    await jb.goto(PATH);
    await expect(requests.rows).toHaveCount(3);

    fake.cancel(RUTH);

    await expect(requests.row('Ruth Mensah')).toHaveCount(0, { timeout: 2_500 });
    await expect(requests.statusTab(/^New/)).toContainText('2');
  });

  test('L2-051 AC7: while the event stream is connected the page does not ask on a timer', async ({
    page,
    jb,
  }) => {
    const requests = new IncomingRequestsPage(page);
    await requests.setWidth(1280);
    const fake = await stubIncoming(page);
    await jb.goto(PATH);
    await expect(requests.rows).toHaveCount(3);
    const asked = fake.listRequests.length;

    // Longer than the five seconds between two questions of the fallback.
    await requests.idle(6_500);

    expect(fake.listRequests.length).toBe(asked);
  });

  test('L2-051 AC7: when the event stream cannot connect the page asks every five seconds, so a new request still appears', async ({
    page,
    jb,
  }) => {
    const requests = new IncomingRequestsPage(page);
    const toasts = new Toasts(page);
    await requests.setWidth(1280);
    const fake = await stubIncoming(page, { stream: 'down' });
    await jb.goto(PATH);
    await expect(requests.rows).toHaveCount(3);
    // The page has read its counts; from here only the timer can tell it of a new request.
    await requests.idle(1_000);
    const asked = fake.listRequests.length;

    fake.arrive();
    await requests.idle(1_000);
    expect(fake.listRequests.length).toBe(asked);

    await expect(requests.rows).toHaveCount(4, { timeout: 10_000 });
    await expect(toasts.withTitle('New booking request')).toContainText(
      'Grace Adeyemi asked for Consultation.',
    );
  });

  test('L2-051 AC6: an answer of 403 shows the forbidden page', async ({ page, jb }) => {
    const forbidden = new ForbiddenPage(page);
    await forbidden.setWidth(1280);
    await stubIncoming(page, { list: 'forbidden' });
    await jb.goto(PATH);

    await expect(forbidden.heading).toHaveText('You don’t have access to this page');
  });

  test('L2-118: when the list cannot load, the page quotes its reference and tries again', async ({
    page,
    jb,
  }) => {
    const requests = new IncomingRequestsPage(page);
    await requests.setWidth(1280);
    const fake = await stubIncoming(page, { list: 'fails' });
    await jb.goto(PATH);

    await expect(requests.alert).toContainText('We couldn’t load your requests');
    await expect(requests.reference).toHaveText('JB-REQ-503');
    fake.list = 'ok';
    await requests.tryAgain.click();
    await expect(requests.rows).toHaveCount(3);
  });
});

test.describe('respond to customer requests: confirm (L2-052)', () => {
  test('L2-052 AC1: Confirm opens a dialog that lists the order and keeps "Not yet" as the first choice', async ({
    page,
    jb,
  }) => {
    const requests = new IncomingRequestsPage(page);
    const dialog = new ConfirmRequestDialog(page);
    await requests.setWidth(1280);
    await stubIncoming(page);
    await jb.goto(PATH);

    await requests.confirmButton('Samuel Park').click();

    await expect(dialog.title).toHaveText('Confirm Samuel’s order?');
    await expect(dialog.details).toContainText('Samuel Park');
    await expect(dialog.details).toContainText('Custom church team tee × 24');
    await expect(dialog.details).toContainText('$528.00 + tax');
    await expect(dialog.notYet).toBeFocused();
    await dialog.notYet.click();
    await expect(dialog.root).toHaveCount(0);
  });

  test('L2-052 AC2, AC3: confirming tells the customer, offers Undo for a few seconds, and Undo makes the request new again', async ({
    page,
    jb,
  }) => {
    const requests = new IncomingRequestsPage(page);
    const dialog = new ConfirmRequestDialog(page);
    const toasts = new Toasts(page);
    await requests.setWidth(1280);
    const fake = await stubIncoming(page);
    await jb.goto(PATH);

    await requests.confirmButton('Samuel Park').click();
    await dialog.confirm.click();

    const toast = toasts.withTitle('Order confirmed');
    await expect(toast).toContainText(
      'Samuel has been told. Message them about payment and pickup.',
    );
    expect(fake.confirms).toEqual([SAMUEL]);
    await expect(requests.row('Samuel Park')).toHaveCount(0);
    await expect(requests.statusTab(/^Confirmed/)).toContainText('1');

    await toasts.action(toast, 'Undo').click();

    await expect(toasts.withTitle('Confirmation undone')).toBeVisible();
    expect(fake.undos).toEqual([SAMUEL]);
    await expect(requests.row('Samuel Park')).toBeVisible();
    await expect(requests.statusTab(/^Confirmed/)).toContainText('0');
  });

  test('L2-052 AC5: a failed confirmation says the request is still new and tries again', async ({
    page,
    jb,
  }) => {
    const requests = new IncomingRequestsPage(page);
    const dialog = new ConfirmRequestDialog(page);
    await requests.setWidth(1280);
    const fake = await stubIncoming(page, { confirm: 'fails' });
    await jb.goto(PATH);

    await requests.confirmButton('Samuel Park').click();
    await dialog.confirm.click();

    await expect(dialog.alert).toContainText('We couldn’t confirm it');
    await expect(dialog.alert).toContainText('The request is still new.');
    fake.confirm = 'ok';
    await dialog.tryAgain.click();
    await expect(dialog.root).toHaveCount(0);
    expect(fake.confirms).toEqual([SAMUEL]);
  });
});

test.describe('respond to customer requests: the dialog was closed before the answer came (L2-052 AC5, AC7)', () => {
  test('L2-052 AC5: a confirmation that fails after the dialog was closed is said in a danger toast, and "Try again" confirms it', async ({
    page,
    jb,
  }) => {
    const requests = new IncomingRequestsPage(page);
    const dialog = new ConfirmRequestDialog(page);
    const toasts = new Toasts(page);
    await requests.setWidth(1280);
    const fake = await stubIncoming(page, { confirm: 'fails', confirmDelayMs: 600 });
    await jb.goto(PATH);

    await requests.confirmButton('Samuel Park').click();
    await dialog.confirm.click();
    await dialog.escape();
    await expect(dialog.root).toHaveCount(0);

    const failed = toasts.danger('Couldn’t confirm the order');
    await expect(failed).toContainText('Samuel’s request is still new. Try again.');
    await expect(failed).toHaveRole('alert');
    await expect(requests.row('Samuel Park')).toBeVisible();
    expect(fake.confirms).toEqual([]);

    fake.confirm = 'ok';
    fake.confirmDelayMs = 0;
    await toasts.action(failed, 'Try again').click();

    await expect(failed).toHaveCount(0);
    const confirmed = toasts.withTitle('Order confirmed');
    await expect(confirmed).toContainText('Samuel has been told.');
    await expect(toasts.action(confirmed, 'Undo')).toBeVisible();
    expect(fake.confirms).toEqual([SAMUEL]);
    await expect(requests.row('Samuel Park')).toHaveCount(0);
  });

  test('L2-052 AC5: "Try again" that fails again says so again, by the keyboard alone', async ({
    page,
    jb,
  }) => {
    const requests = new IncomingRequestsPage(page);
    const dialog = new ConfirmRequestDialog(page);
    const toasts = new Toasts(page);
    await requests.setWidth(1280);
    const fake = await stubIncoming(page, { confirm: 'fails', confirmDelayMs: 600 });
    await jb.goto(PATH);

    await requests.confirmButton('Samuel Park').click();
    await dialog.confirm.click();
    await dialog.escape();
    const failed = toasts.danger('Couldn’t confirm the order');
    await expect(failed).toBeVisible();
    fake.confirmDelayMs = 0;

    await toasts.action(failed, 'Try again').focus();
    await page.keyboard.press('Enter');

    await expect(failed).toHaveCount(1);
    await expect(failed).toContainText('Samuel’s request is still new. Try again.');
    expect(fake.confirms).toEqual([]);
  });

  test('L2-052 AC7: a confirmation that succeeds after the dialog was closed still shows its toast with Undo', async ({
    page,
    jb,
  }) => {
    const requests = new IncomingRequestsPage(page);
    const dialog = new ConfirmRequestDialog(page);
    const toasts = new Toasts(page);
    await requests.setWidth(1280);
    const fake = await stubIncoming(page, { confirmDelayMs: 600 });
    await jb.goto(PATH);

    await requests.confirmButton('Samuel Park').click();
    await dialog.confirm.click();
    await dialog.escape();
    await expect(dialog.root).toHaveCount(0);

    const confirmed = toasts.withTitle('Order confirmed');
    await expect(confirmed).toContainText('Samuel has been told.');
    await expect(requests.row('Samuel Park')).toHaveCount(0);
    await toasts.action(confirmed, 'Undo').click();
    await expect(toasts.withTitle('Confirmation undone')).toBeVisible();
    expect(fake.undos).toEqual([SAMUEL]);
  });

  test('L2-052 AC6: a request the customer cancelled is said in a toast when the dialog was already closed', async ({
    page,
    jb,
  }) => {
    const requests = new IncomingRequestsPage(page);
    const dialog = new ConfirmRequestDialog(page);
    const toasts = new Toasts(page);
    await requests.setWidth(1280);
    await stubIncoming(page, { confirm: 'cancelled', confirmDelayMs: 600 });
    await jb.goto(PATH);

    await requests.confirmButton('Samuel Park').click();
    await dialog.confirm.click();
    await dialog.escape();

    const failed = toasts.danger('Couldn’t confirm the order');
    await expect(failed).toContainText('Samuel Park cancelled this request.');
    await expect(toasts.action(failed, 'Try again')).toHaveCount(0);
    await expect(requests.row('Samuel Park')).toHaveCount(0);
  });
});

test.describe('respond to customer requests: a cancelled request (L2-052 AC6)', () => {
  test('L2-052 AC6: when the customer cancelled a moment earlier the owner is told and nothing is confirmed', async ({
    page,
    jb,
  }) => {
    const requests = new IncomingRequestsPage(page);
    const dialog = new ConfirmRequestDialog(page);
    const fake = await stubIncoming(page, { confirm: 'cancelled' });
    await requests.setWidth(1280);
    await jb.goto(PATH);

    await requests.confirmButton('Samuel Park').click();
    await dialog.confirm.click();

    await expect(dialog.alert).toContainText('Samuel Park cancelled this request.');
    await expect(dialog.alert).toContainText('Nothing was confirmed.');
    await expect(dialog.confirm).toBeDisabled();
    expect(fake.confirms).toEqual([]);
    await dialog.notYet.click();
    await expect(requests.row('Samuel Park')).toHaveCount(0);
  });
});

test.describe('respond to customer requests: decline (L2-053)', () => {
  test('L2-053 AC1: the dialog names the customer and offers the four reasons', async ({
    page,
    jb,
  }) => {
    const requests = new IncomingRequestsPage(page);
    const dialog = new DeclineRequestDialog(page);
    await requests.setWidth(1280);
    await stubIncoming(page);
    await jb.goto(PATH);

    await requests.declineButton('Ruth Mensah').click();

    await expect(dialog.title).toHaveText('Decline Ruth’s order?');
    await expect(dialog.root).toContainText(
      'A kind, clear reason keeps the door open. Ruth can reply in Messages.',
    );
    await expect(dialog.reason.locator('option')).toHaveText([
      'Can’t meet the date',
      'Out of stock',
      'Outside what I offer',
      'Something else',
    ]);
    await expect(dialog.root).toContainText('Shown to the customer with your decline.');
  });

  test('L2-053 AC2: an empty message is refused with a hint and nothing is sent', async ({
    page,
    jb,
  }) => {
    const requests = new IncomingRequestsPage(page);
    const dialog = new DeclineRequestDialog(page);
    await requests.setWidth(1280);
    const fake = await stubIncoming(page);
    await jb.goto(PATH);

    await requests.declineButton('Ruth Mensah').click();
    await dialog.decline.click();

    await expect(dialog.error).toHaveText(
      'Write a short note so Ruth knows why and what to do next.',
    );
    await expect(dialog.message).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.message).toBeFocused();
    expect(fake.declines).toEqual([]);
  });

  test('L2-053 AC3: a valid decline sends the reason and the note and removes the request from New', async ({
    page,
    jb,
  }) => {
    const requests = new IncomingRequestsPage(page);
    const dialog = new DeclineRequestDialog(page);
    const toasts = new Toasts(page);
    await requests.setWidth(1280);
    const fake = await stubIncoming(page);
    await jb.goto(PATH);

    await requests.declineButton('Ruth Mensah').click();
    await dialog.reason.selectOption({ label: 'Out of stock' });
    await dialog.message.fill('I am sorry, Ruth. The mugs sold out this week.');
    await dialog.decline.click();

    await expect(dialog.root).toHaveCount(0);
    expect(fake.declines).toEqual([
      {
        id: RUTH,
        reason: 'out-of-stock',
        message: 'I am sorry, Ruth. The mugs sold out this week.',
      },
    ]);
    await expect(toasts.withTitle('Order declined')).toBeVisible();
    await expect(requests.row('Ruth Mensah')).toHaveCount(0);
    await expect(requests.statusTab(/^Declined/)).toContainText('1');
  });

  test('L2-053 AC4: a failed decline keeps the note and says the request is still new', async ({
    page,
    jb,
  }) => {
    const requests = new IncomingRequestsPage(page);
    const dialog = new DeclineRequestDialog(page);
    await requests.setWidth(1280);
    const fake = await stubIncoming(page, { decline: 'fails' });
    await jb.goto(PATH);

    await requests.declineButton('David Chen').click();
    await dialog.message.fill('Thank you, David. We cannot take that many this month.');
    await dialog.decline.click();

    await expect(dialog.alert).toContainText('We couldn’t send your decline');
    await expect(dialog.alert).toContainText('The request is still new and your note is kept.');
    await expect(dialog.message).toHaveValue(
      'Thank you, David. We cannot take that many this month.',
    );
    fake.decline = 'ok';
    await dialog.decline.click();
    await expect(dialog.root).toHaveCount(0);
    expect(fake.declines.map((d) => d.id)).toEqual([DAVID]);
  });

  test('L2-053 AC6: a request the customer cancelled is not declined: the dialog closes, the list reloads and a toast says why', async ({
    page,
    jb,
  }) => {
    const requests = new IncomingRequestsPage(page);
    const dialog = new DeclineRequestDialog(page);
    const toasts = new Toasts(page);
    await requests.setWidth(1280);
    const fake = await stubIncoming(page, { decline: 'cancelled' });
    await jb.goto(PATH);
    await expect(requests.rows).toHaveCount(3);

    await requests.declineButton('David Chen').click();
    await dialog.message.fill('Thank you, David. We cannot take that many this month.');
    await dialog.decline.click();

    await expect(dialog.root).toHaveCount(0);
    const told = toasts.danger('Request not declined');
    await expect(told).toContainText('David Chen cancelled this request.');
    await expect(requests.row('David Chen')).toHaveCount(0);
    await expect(requests.statusTab(/^New/)).toContainText('2');
    await expect(requests.statusTab(/^Declined/)).toContainText('0');
    expect(fake.declines).toEqual([]);
  });

  test('L2-129 AC1: the decline dialog opens on "Keep request", and Escape keeps the request', async ({
    page,
    jb,
  }) => {
    const requests = new IncomingRequestsPage(page);
    const dialog = new DeclineRequestDialog(page);
    await requests.setWidth(1280);
    const fake = await stubIncoming(page);
    await jb.goto(PATH);

    await requests.declineButton('Ruth Mensah').click();

    await expect(dialog.keep).toBeFocused();
    await dialog.escape();
    await expect(dialog.root).toHaveCount(0);
    await expect(requests.row('Ruth Mensah')).toBeVisible();
    expect(fake.declines).toEqual([]);
  });

  test('L2-053 AC5: the note stops at 1,000 characters', async ({ page, jb }) => {
    const requests = new IncomingRequestsPage(page);
    const dialog = new DeclineRequestDialog(page);
    await requests.setWidth(1280);
    await stubIncoming(page);
    await jb.goto(PATH);

    await requests.declineButton('Ruth Mensah').click();
    await dialog.message.pressSequentially('a'.repeat(5), { delay: 0 });
    await expect(dialog.message).toHaveAttribute('maxlength', '1000');
  });
});
