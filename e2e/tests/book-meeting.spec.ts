import { stubBooking } from '../fixtures/booking';
import { expect, test } from '../fixtures/jb-test';
import { BusinessPage } from '../pages/business.page';
import { BookMeetingDialog } from '../pages/messages.page';
import { SignInRequiredDialog } from '../pages/sign-in-required.dialog';

test.describe('book a meeting (L2-044)', () => {
  test('AC1: "Book a meeting" opens the dialog addressed to the business', async ({ page, jb }) => {
    const business = new BusinessPage(page);
    const dialog = new BookMeetingDialog(page);
    await business.setWidth(1280);
    await jb.signInAs('member');
    await stubBooking(page);
    await jb.goto('/b/legacy-financial');

    await business.bookLink.click();

    await expect(page).toHaveURL(/\/b\/legacy-financial\/book$/);
    await expect(dialog.title).toHaveText('Book a meeting with Legacy Financial');
    await expect(dialog.description).toContainText(
      'Ask for a time. Trevor confirms it or suggests another; nothing is charged.',
    );
    await expect(dialog.service).toContainText('Discovery meeting · 30 min · Free');
    await expect(dialog.how).toContainText('In person, North York');
  });

  test('a visitor is asked to join first', async ({ page, jb }) => {
    const business = new BusinessPage(page);
    const prompt = new SignInRequiredDialog(page);
    await business.setWidth(1280);
    await stubBooking(page);
    await jb.goto('/b/legacy-financial');
    await expect(business.heading).toHaveText('Legacy Financial');

    await business.bookLink.click();

    await expect(prompt.joinFree).toHaveAttribute(
      'href',
      '/join?returnUrl=%2Fb%2Flegacy-financial%2Fbook',
    );
  });

  test('AC2: the times of a day that is met are offered', async ({ page, jb }) => {
    const dialog = new BookMeetingDialog(page);
    await new BusinessPage(page).setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubBooking(page);
    await jb.goto('/b/legacy-financial/book');

    await dialog.day.fill('2026-11-12');

    await expect(dialog.times).toHaveText([
      '9:00 a.m.',
      '10:00 a.m.',
      '1:30 p.m.',
      '4:00 p.m.',
      '7:00 p.m.',
    ]);
    expect(fake.availabilityAsked.at(-1)).toEqual({ day: '2026-11-12', serviceId: 's-discovery' });
  });

  test('AC3: a day the business does not meet shows an error and no times', async ({
    page,
    jb,
  }) => {
    const dialog = new BookMeetingDialog(page);
    await new BusinessPage(page).setWidth(1280);
    await jb.signInAs('member');
    await stubBooking(page);
    await jb.goto('/b/legacy-financial/book');

    await dialog.day.fill('2026-11-14');

    await expect(dialog.fieldError).toHaveText(
      'Trevor can’t meet on that day. Trevor meets Monday to Friday.',
    );
    await expect(dialog.times).toHaveCount(0);
  });

  test('AC4: sending without a day or a time names what is missing', async ({ page, jb }) => {
    const dialog = new BookMeetingDialog(page);
    await new BusinessPage(page).setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubBooking(page);
    await jb.goto('/b/legacy-financial/book');

    await dialog.send.click();
    await expect(dialog.fieldError.first()).toHaveText(
      'Choose a day. Trevor meets Monday to Friday.',
    );

    await dialog.day.fill('2026-11-12');
    await dialog.send.click();
    await expect(dialog.fieldError).toHaveText('Choose a time.');
    expect(fake.sends).toHaveLength(0);
  });

  test('AC5: sending the request shows where it went', async ({ page, jb }) => {
    const dialog = new BookMeetingDialog(page);
    await new BusinessPage(page).setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubBooking(page);
    await jb.goto('/b/legacy-financial/book');

    await dialog.day.fill('2026-11-12');
    await dialog.time('10:00 a.m.').click();
    await dialog.how.selectOption({ label: 'In person, North York' });
    await dialog.note.fill('RRSPs and a giving plan.');
    await dialog.send.click();

    await expect(dialog.title).toHaveText('Request sent to Legacy Financial');
    await expect(dialog.description).toContainText('Trevor usually confirms within a day.');
    await expect(dialog.viewRequest).toHaveAttribute('href', '/requests/r-booked');
    expect(fake.sends).toHaveLength(1);
    expect(fake.sends[0]).toMatchObject({
      listingSlug: 'legacy-financial',
      serviceId: 's-discovery',
      day: '2026-11-12',
      time: '10:00',
      mode: 'in-person',
      note: 'RRSPs and a giving plan.',
    });
    expect(fake.sends[0].idempotencyKey).toMatch(/^[\w-]{8,}$/);
  });

  test('a business with no area offers video only', async ({ page, jb }) => {
    const dialog = new BookMeetingDialog(page);
    await new BusinessPage(page).setWidth(1280);
    await jb.signInAs('member');
    await stubBooking(page, { area: null });
    await jb.goto('/b/legacy-financial/book');

    await expect(dialog.how.locator('option')).toHaveText(['Video call']);
  });

  test('AC6: while sending the dialog is busy and cannot be sent twice', async ({ page, jb }) => {
    const dialog = new BookMeetingDialog(page);
    await new BusinessPage(page).setWidth(1280);
    await jb.signInAs('member');
    await stubBooking(page, { delivery: 'hang' });
    await jb.goto('/b/legacy-financial/book');
    await dialog.day.fill('2026-11-12');
    await dialog.time('10:00 a.m.').click();

    await dialog.send.click();

    await expect(dialog.send).toHaveAttribute('aria-busy', 'true');
    await expect(dialog.cancel).toBeDisabled();
    await expect(dialog.day).toHaveAttribute('readonly', '');
  });

  test('AC7: a failure keeps what was typed and a retry sends once', async ({ page, jb }) => {
    const dialog = new BookMeetingDialog(page);
    await new BusinessPage(page).setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubBooking(page, { delivery: 'fail' });
    await jb.goto('/b/legacy-financial/book');
    await dialog.day.fill('2026-11-12');
    await dialog.time('10:00 a.m.').click();
    await dialog.note.fill('Keep this.');

    await dialog.send.click();

    await expect(dialog.alert).toContainText('We couldn’t send that');
    await expect(dialog.note).toHaveValue('Keep this.');
    await expect(dialog.day).toHaveValue('2026-11-12');

    fake.delivery = 'ok';
    await dialog.send.click();
    await expect(dialog.title).toHaveText('Request sent to Legacy Financial');
    expect(fake.sends).toHaveLength(1);
  });

  test('an unconfirmed e-mail is told to confirm first', async ({ page, jb }) => {
    const dialog = new BookMeetingDialog(page);
    await new BusinessPage(page).setWidth(1280);
    await jb.signInAs('member');
    await stubBooking(page, { delivery: 'unconfirmed' });
    await jb.goto('/b/legacy-financial/book');
    await dialog.day.fill('2026-11-12');
    await dialog.time('10:00 a.m.').click();

    await dialog.send.click();

    await expect(dialog.alert).toContainText('Confirm your e-mail first');
  });

  test('a day taken meanwhile is shown on the day field', async ({ page, jb }) => {
    const dialog = new BookMeetingDialog(page);
    await new BusinessPage(page).setWidth(1280);
    await jb.signInAs('member');
    await stubBooking(page, { delivery: 'day-gone' });
    await jb.goto('/b/legacy-financial/book');
    await dialog.day.fill('2026-11-12');
    await dialog.time('10:00 a.m.').click();

    await dialog.send.click();

    await expect(dialog.fieldError).toContainText('can’t meet on that day');
  });
});
