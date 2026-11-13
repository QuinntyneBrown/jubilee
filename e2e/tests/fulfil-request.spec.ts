import { expect, test } from '../fixtures/jb-test';
import { confirmedRows, GRACE, stubIncoming } from '../fixtures/incoming-requests';
import { FulfilRequestDialog } from '../pages/fulfil-request.dialog';
import { IncomingRequestsPage } from '../pages/incoming-requests.page';
import { Toasts } from '../pages/toasts';

const PATH = '/my-business/requests';

// Naomi's Luzandre.com has three new requests, Grace's confirmed order and Joanna's confirmed booking.
test.describe('mark an order fulfilled (L2-225)', () => {
  test('L2-225 AC1: a confirmed order offers Mark fulfilled; a confirmed booking and a new request do not', async ({
    page,
    jb,
  }) => {
    const requests = new IncomingRequestsPage(page);
    await requests.setWidth(1280);
    const fake = await stubIncoming(page);
    fake.rows.push(...confirmedRows());
    await jb.goto(PATH);
    await expect(requests.rows).toHaveCount(3);
    await expect(requests.fulfilButtons).toHaveCount(0);

    await requests.statusTab(/^Confirmed/).click();

    await expect(requests.rows).toHaveCount(2);
    await expect(requests.fulfilButton('Grace Adeyemi')).toBeVisible();
    await expect(requests.fulfilButton('Grace Adeyemi')).toHaveText('Mark fulfilled');
    await expect(requests.fulfilButtons).toHaveCount(1);

    await requests.statusTab(/^All/).click();
    await expect(requests.rows).toHaveCount(5);
    await expect(requests.fulfilButtons).toHaveCount(1);
  });

  test('L2-225 AC2, L2-129: the dialog names the order and its customer, says what happens and keeps "Not yet" first', async ({
    page,
    jb,
  }) => {
    const requests = new IncomingRequestsPage(page);
    const dialog = new FulfilRequestDialog(page);
    await requests.setWidth(1280);
    const fake = await stubIncoming(page);
    fake.rows.push(...confirmedRows());
    await jb.goto(PATH);
    await requests.statusTab(/^Confirmed/).click();

    await requests.fulfilButton('Grace Adeyemi').click();

    await expect(dialog.title).toHaveText('Mark Grace’s order fulfilled?');
    await expect(dialog.description).toHaveText('Only mark it fulfilled once Grace has it.');
    await expect(dialog.details).toContainText('Grace Adeyemi');
    await expect(dialog.details).toContainText('Gold cross stoneware mug × 2');
    await expect(dialog.details).toContainText('$48.00 + tax');
    await expect(dialog.consequence).toHaveText(
      'Grace is told it’s done and the order moves to Completed.',
    );
    await expect(dialog.notYet).toBeFocused();
    await dialog.notYet.click();
    await expect(dialog.title).toHaveCount(0);
    expect(fake.fulfils).toEqual([]);
  });

  test('L2-225 AC3: marking it fulfilled completes the order, says the customer was told and leaves the Confirmed tab', async ({
    page,
    jb,
  }) => {
    const requests = new IncomingRequestsPage(page);
    const dialog = new FulfilRequestDialog(page);
    const toasts = new Toasts(page);
    await requests.setWidth(1280);
    const fake = await stubIncoming(page);
    fake.rows.push(...confirmedRows());
    await jb.goto(PATH);
    await requests.statusTab(/^Confirmed/).click();

    await requests.fulfilButton('Grace Adeyemi').click();
    await dialog.fulfil.click();

    await expect(dialog.title).toHaveCount(0);
    expect(fake.fulfils).toEqual([GRACE]);
    const toast = toasts.withTitle('Order fulfilled');
    await expect(toast).toContainText('Grace has been told.');
    await expect(toasts.action(toast, 'Undo')).toHaveCount(0);
    await expect(requests.row('Grace Adeyemi')).toHaveCount(0);
    await expect(requests.statusTab(/^Confirmed/)).toContainText('1');
    await requests.statusTab(/^All/).click();
    await expect(requests.row('Grace Adeyemi')).toContainText('Completed');
    await expect(requests.fulfilButtons).toHaveCount(0);
  });

  test('L2-225 AC3: the keyboard alone opens the dialog and marks the order fulfilled', async ({
    page,
    jb,
  }) => {
    const requests = new IncomingRequestsPage(page);
    const dialog = new FulfilRequestDialog(page);
    const toasts = new Toasts(page);
    await requests.setWidth(1280);
    const fake = await stubIncoming(page);
    fake.rows.push(...confirmedRows());
    await jb.goto(PATH);
    await requests.statusTab(/^Confirmed/).click();

    await requests.fulfilButton('Grace Adeyemi').focus();
    await page.keyboard.press('Enter');
    await expect(dialog.notYet).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(dialog.fulfil).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(toasts.withTitle('Order fulfilled')).toBeVisible();
    expect(fake.fulfils).toEqual([GRACE]);
  });

  test('L2-225 AC4, L2-128: a failure keeps the dialog open, says the order is still confirmed and offers Try again', async ({
    page,
    jb,
  }) => {
    const requests = new IncomingRequestsPage(page);
    const dialog = new FulfilRequestDialog(page);
    await requests.setWidth(1280);
    const fake = await stubIncoming(page, { fulfil: 'fails' });
    fake.rows.push(...confirmedRows());
    await jb.goto(PATH);
    await requests.statusTab(/^Confirmed/).click();

    await requests.fulfilButton('Grace Adeyemi').click();
    await dialog.fulfil.click();

    await expect(dialog.alert).toContainText('We couldn’t mark it fulfilled');
    await expect(dialog.alert).toContainText(
      'The order is still confirmed. Check your connection and try again.',
    );
    fake.fulfil = 'ok';
    await dialog.tryAgain.click();
    await expect(dialog.title).toHaveCount(0);
    expect(fake.fulfils).toEqual([GRACE]);
  });

  test('L2-225 AC5: an order the customer cancelled shows why and changes nothing', async ({
    page,
    jb,
  }) => {
    const requests = new IncomingRequestsPage(page);
    const dialog = new FulfilRequestDialog(page);
    await requests.setWidth(1280);
    const fake = await stubIncoming(page, { fulfil: 'cancelled' });
    fake.rows.push(...confirmedRows());
    await jb.goto(PATH);
    await requests.statusTab(/^Confirmed/).click();

    await requests.fulfilButton('Grace Adeyemi').click();
    await dialog.fulfil.click();

    await expect(dialog.alert).toContainText('Grace Adeyemi cancelled this request.');
    await expect(dialog.alert).toContainText('Nothing was changed.');
    await expect(dialog.fulfil).toBeDisabled();
    expect(fake.fulfils).toEqual([]);
    await dialog.notYet.click();
    await expect(requests.row('Grace Adeyemi')).toHaveCount(0);
  });
});
