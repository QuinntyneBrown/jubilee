import { expect, test } from '../fixtures/jb-test';
import { stubSpaceRequest } from '../fixtures/space-request';
import { RequestSpaceDialog } from '../pages/request-space.dialog';
import { SignInRequiredDialog } from '../pages/sign-in-required.dialog';
import { SpacePage } from '../pages/space.page';

// Asking for a space (L2-205): the dialog by term, its checks, the answer, and the page once a
// request is open. The device's today is the mocks' today, 10 November 2026.

test.describe('request a space (L2-205)', () => {
  test('AC2: a visitor pressing the call to action is asked to join first', async ({
    page,
    jb,
  }) => {
    const space = new SpacePage(page);
    const prompt = new SignInRequiredDialog(page);
    await space.setWidth(1280);
    await jb.open('space.signed-out');

    await space.bookingCard.callToAction.click();

    await expect(prompt.title).toHaveText('Join to request Guest suite near Roncesvalles');
    await expect(prompt.joinFree).toHaveAttribute(
      'href',
      '/join?returnUrl=%2Fb%2Froncesvalles-guest-suite%2Frequest',
    );
  });

  test('AC3, AC7, AC8: "Request to book" asks for the dates, totals the stay and sends no price', async ({
    page,
    jb,
  }) => {
    const space = new SpacePage(page);
    const dialog = new RequestSpaceDialog(page);
    await space.setWidth(1280);
    const fake = await stubSpaceRequest(page);
    await jb.open('space.short-stay');

    await space.bookingCard.callToAction.click();

    await expect(page).toHaveURL(/\/b\/roncesvalles-guest-suite\/request$/);
    await expect(dialog.title).toHaveText('Request to book');
    await expect(dialog.description).toHaveText('Guest suite near Roncesvalles · Roncesvalles');
    await expect(dialog.noteLabel).toContainText('A note to Paul');
    await expect(dialog.payment).toBeVisible();
    await expect(dialog.amounts).toHaveCount(0);

    await dialog.checkIn.fill('2026-12-11');
    await dialog.checkOut.fill('2026-12-13');
    await expect(dialog.nights).toHaveText(/\$120 × 2 nights\s*\$240/);
    await expect(dialog.total).toHaveText(/Total\s*\$240/);

    await dialog.note.fill('Two adults, no pets.');
    await dialog.send.click();

    await expect(dialog.title).toHaveText('Sent to Paul');
    await expect(dialog.description).toHaveText(
      'You’ll hear back in Messages, usually within a day. The exact address is shared once they accept.',
    );
    await expect(dialog.viewRequest).toHaveAttribute('href', '/requests/r-space');
    expect(fake.sends).toHaveLength(1);
    expect(fake.sends[0]).toMatchObject({
      listingSlug: 'roncesvalles-guest-suite',
      checkIn: '2026-12-11',
      checkOut: '2026-12-13',
      note: 'Two adults, no pets.',
    });
    expect(Object.keys(fake.sends[0])).not.toEqual(
      expect.arrayContaining(['total', 'price', 'rent']),
    );
  });

  test('AC4: "Request a viewing" asks for the move-in and the stay, and shows no total', async ({
    page,
    jb,
  }) => {
    const space = new SpacePage(page);
    const dialog = new RequestSpaceDialog(page);
    await space.setWidth(1280);
    const fake = await stubSpaceRequest(page);
    await jb.open('space.long-term');

    await space.bookingCard.callToAction.click();

    await expect(dialog.title).toHaveText('Request a viewing');
    await expect(dialog.description).toHaveText(
      'Bright basement apartment in the Annex · The Annex',
    );
    await expect(dialog.staying.locator('option')).toHaveText([
      'Month to month',
      '4 months',
      '6 months',
      '8 months',
      '12 months',
      '18 months',
    ]);
    await expect(dialog.staying).toHaveValue('12');
    await expect(dialog.checkIn).toHaveCount(0);

    await dialog.moveIn.fill('2026-12-01');
    await expect(dialog.amounts).toHaveCount(0);
    await dialog.send.click();

    await expect(dialog.title).toHaveText('Sent to Grace');
    expect(fake.sends[0]).toMatchObject({
      listingSlug: 'annex-basement-apartment',
      moveIn: '2026-12-01',
      stayMonths: 12,
    });
  });

  test('"Meet the household" is the roommate’s dialog', async ({ page, jb }) => {
    const space = new SpacePage(page);
    const dialog = new RequestSpaceDialog(page);
    await space.setWidth(1280);
    await stubSpaceRequest(page);
    await jb.open('space.roommate');

    await space.bookingCard.callToAction.click();

    await expect(dialog.title).toHaveText('Meet the household');
    await expect(dialog.moveIn).toBeVisible();
  });

  test('AC5: a past check-in and a check-out not after check-in are named before sending', async ({
    page,
    jb,
  }) => {
    const space = new SpacePage(page);
    const dialog = new RequestSpaceDialog(page);
    await space.setWidth(1280);
    const fake = await stubSpaceRequest(page);
    await jb.open('space.short-stay');
    await space.bookingCard.callToAction.click();

    await dialog.checkIn.fill('2026-11-01');
    await dialog.checkOut.fill('2026-12-12');
    await dialog.send.click();

    await expect(dialog.fieldError).toHaveText(['Choose a date from today on.']);
    await expect(dialog.checkIn).toBeFocused();

    await dialog.checkIn.fill('2026-12-13');
    await dialog.send.click();

    await expect(dialog.fieldError).toHaveText(['Choose a check-out after check-in.']);
    await expect(dialog.checkOut).toBeFocused();
    expect(fake.sends).toHaveLength(0);
  });

  test('AC5, AC6: the server’s codes are shown under their fields', async ({ page, jb }) => {
    const space = new SpacePage(page);
    const dialog = new RequestSpaceDialog(page);
    await space.setWidth(1280);
    await stubSpaceRequest(page, {
      delivery: 'invalid',
      errors: { checkIn: 'TOO_FAR', checkOut: 'BELOW_MINIMUM_STAY' },
    });
    await jb.open('space.short-stay');
    await space.bookingCard.callToAction.click();

    // Dates the browser accepts; the server answers with its own codes.
    await dialog.checkIn.fill('2026-12-11');
    await dialog.checkOut.fill('2026-12-13');
    await dialog.send.click();

    await expect(dialog.fieldError).toHaveText([
      'Choose a date within the next year.',
      'This space needs at least 2 nights.',
    ]);
    await expect(dialog.title).toHaveText('Request to book');
  });

  test('a send that fails keeps what was typed and says so', async ({ page, jb }) => {
    const space = new SpacePage(page);
    const dialog = new RequestSpaceDialog(page);
    await space.setWidth(1280);
    await stubSpaceRequest(page, { delivery: 'fail' });
    await jb.open('space.long-term');
    await space.bookingCard.callToAction.click();

    await dialog.moveIn.fill('2026-12-01');
    await dialog.send.click();

    await expect(dialog.alert).toContainText('We couldn’t send that');
    await expect(dialog.moveIn).toHaveValue('2026-12-01');
  });

  test('AC9: with an open request the card says it went, and there is nothing to press again', async ({
    page,
    jb,
  }) => {
    const space = new SpacePage(page);
    await space.setWidth(360);
    await jb.open('space.requested');

    await expect(space.bookingCard.sent).toContainText('Sent to Paul');
    await expect(space.bookingCard.sent).toContainText(
      'The exact address is shared once they accept.',
    );
    await expect(space.bookingCard.callToAction).toHaveCount(0);
    await expect(space.bookingBar).toHaveCount(0);
    await expect(space.bookingCard.note).toHaveCount(0);
  });
});
