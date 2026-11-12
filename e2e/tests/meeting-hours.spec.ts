import { stubBooking } from '../fixtures/booking';
import { stubCatalogue } from '../fixtures/catalogue';
import { expect, test } from '../fixtures/jb-test';
import { BusinessPage } from '../pages/business.page';
import { MeetingHoursDialog } from '../pages/meeting-hours.dialog';
import { BookMeetingDialog } from '../pages/messages.page';
import { MyServicesPage } from '../pages/my-services.page';
import { Toasts } from '../pages/toasts';

const SERVICES = '/my-business/services';

test.describe('meeting hours (L2-220)', () => {
  test('AC1: "Meeting hours" on My services shows the hours in force', async ({ page, jb }) => {
    const services = new MyServicesPage(page);
    const dialog = new MeetingHoursDialog(page);
    await services.setWidth(1280);
    await stubCatalogue(page);
    await jb.goto(SERVICES);

    await services.meetingHours.click();

    await expect(dialog.title).toHaveText('Meeting hours');
    await expect(dialog.description).toHaveText(
      'Members are offered meeting times inside these hours, in Toronto time. Requests you already have keep their times.',
    );
    expect(await dialog.ticked()).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    await expect(dialog.day('Saturday')).not.toBeChecked();
    await expect(dialog.day('Sunday')).not.toBeChecked();
    await expect(dialog.from).toHaveValue('09:00');
    await expect(dialog.until).toHaveValue('17:00');
    await expect(dialog.every).toHaveValue('30');
    await expect(dialog.every.locator('option')).toHaveText([
      '15 minutes',
      '30 minutes',
      '45 minutes',
      '1 hour',
      '1½ hours',
      '2 hours',
    ]);
  });

  test('AC1: hours an owner saved before are the ones shown', async ({ page, jb }) => {
    const services = new MyServicesPage(page);
    const dialog = new MeetingHoursDialog(page);
    await services.setWidth(1280);
    await stubCatalogue(page, {
      meetingHours: {
        days: [2, 4, 6],
        opensAt: '13:00',
        closesAt: '18:30',
        slotMinutes: 90,
        meetsOn: 'Tuesday, Thursday and Saturday',
        ownerSet: true,
      },
    });
    await jb.goto(SERVICES);

    await services.meetingHours.click();

    expect(await dialog.ticked()).toEqual(['Tuesday', 'Thursday', 'Saturday']);
    await expect(dialog.from).toHaveValue('13:00');
    await expect(dialog.until).toHaveValue('18:30');
    await expect(dialog.every).toHaveValue('90');
  });

  test('AC6: saving sends the hours, closes the dialog, says so and returns focus', async ({
    page,
    jb,
  }) => {
    const services = new MyServicesPage(page);
    const dialog = new MeetingHoursDialog(page);
    const toasts = new Toasts(page);
    await services.setWidth(1280);
    const fake = await stubCatalogue(page);
    await jb.goto(SERVICES);
    await services.meetingHours.click();

    await dialog.day('Friday').uncheck();
    await dialog.day('Saturday').check();
    await dialog.from.fill('10:00');
    await dialog.until.fill('14:00');
    await dialog.every.selectOption({ label: '1 hour' });
    await dialog.save.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(toasts.withTitle('Meeting hours saved')).toContainText(
      'Members are offered times Monday, Tuesday, Wednesday, Thursday and Saturday, 10:00 a.m. to 2:00 p.m.',
    );
    await expect(services.meetingHours).toBeFocused();
    expect(fake.hoursSaves).toEqual([
      { days: [1, 2, 3, 4, 6], opensAt: '10:00', closesAt: '14:00', slotMinutes: 60 },
    ]);

    await services.meetingHours.click();
    expect(await dialog.ticked()).toEqual([
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Saturday',
    ]);
    await expect(dialog.from).toHaveValue('10:00');
  });

  test('AC2: no day, a closing time that is not later and an empty time are refused before anything is sent', async ({
    page,
    jb,
  }) => {
    const services = new MyServicesPage(page);
    const dialog = new MeetingHoursDialog(page);
    await services.setWidth(1280);
    const fake = await stubCatalogue(page);
    await jb.goto(SERVICES);
    await services.meetingHours.click();

    for (const day of await dialog.ticked()) await dialog.day(day).uncheck();
    await dialog.until.fill('09:00');
    await dialog.save.click();

    await expect(dialog.daysError).toHaveText('Choose at least one day.');
    await expect(dialog.untilError).toHaveText('Choose a time after 9:00 a.m.');
    await expect(dialog.until).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.day('Monday')).toBeFocused();

    await dialog.day('Monday').check();
    await dialog.until.fill('');
    await dialog.save.click();
    await expect(dialog.daysError).toHaveCount(0);
    await expect(dialog.untilError).toHaveText('Choose a time.');
    expect(fake.hoursSaves).toEqual([]);
  });

  test('AC2: hours with no room for one meeting are refused', async ({ page, jb }) => {
    const services = new MyServicesPage(page);
    const dialog = new MeetingHoursDialog(page);
    await services.setWidth(1280);
    const fake = await stubCatalogue(page);
    await jb.goto(SERVICES);
    await services.meetingHours.click();

    await dialog.until.fill('10:00');
    await dialog.every.selectOption({ label: '2 hours' });
    await dialog.save.click();

    await expect(dialog.everyError).toHaveText(
      'Leave room for at least one meeting: 2 hours or more.',
    );
    expect(fake.hoursSaves).toEqual([]);
  });

  test('AC2: what the server refuses shows under its field', async ({ page, jb }) => {
    const services = new MyServicesPage(page);
    const dialog = new MeetingHoursDialog(page);
    await services.setWidth(1280);
    const fake = await stubCatalogue(page, { hours: 'refused' });
    await jb.goto(SERVICES);
    await services.meetingHours.click();

    await dialog.save.click();

    await expect(dialog.untilError).toHaveText('Choose a time after 9:00 a.m.');
    await expect(dialog.title).toBeVisible();
    expect(fake.hoursSaves).toHaveLength(1);
  });

  test('AC6: while saving the dialog is busy and cannot be sent twice', async ({ page, jb }) => {
    const services = new MyServicesPage(page);
    const dialog = new MeetingHoursDialog(page);
    await services.setWidth(1280);
    const fake = await stubCatalogue(page, { hours: 'hangs' });
    await jb.goto(SERVICES);
    await services.meetingHours.click();

    await dialog.save.click();

    await expect(dialog.save).toHaveAttribute('aria-busy', 'true');
    await expect(dialog.cancel).toBeDisabled();
    await expect(dialog.from).toHaveAttribute('readonly', '');
    await expect(dialog.day('Monday')).toBeDisabled();
    expect(fake.hoursSaves).toHaveLength(1);
  });

  test('AC7: a save that fails says nothing changed, keeps what was chosen and can be tried again', async ({
    page,
    jb,
  }) => {
    const services = new MyServicesPage(page);
    const dialog = new MeetingHoursDialog(page);
    const toasts = new Toasts(page);
    await services.setWidth(1280);
    const fake = await stubCatalogue(page, { hours: 'fails' });
    await jb.goto(SERVICES);
    await services.meetingHours.click();
    await dialog.day('Saturday').check();
    await dialog.until.fill('12:00');

    await dialog.save.click();

    await expect(dialog.alert).toContainText('We couldn’t save that');
    await expect(dialog.alert).toContainText('Your meeting hours have not changed. Try again.');
    await expect(dialog.day('Saturday')).toBeChecked();
    await expect(dialog.until).toHaveValue('12:00');

    fake.hours = 'ok';
    await dialog.save.click();
    await expect(toasts.withTitle('Meeting hours saved')).toBeVisible();
    expect(fake.hoursSaves).toHaveLength(2);
  });

  test('AC9: the dialog works from the keyboard, and Escape closes it without saving', async ({
    page,
    jb,
  }) => {
    const services = new MyServicesPage(page);
    const dialog = new MeetingHoursDialog(page);
    await services.setWidth(1280);
    const fake = await stubCatalogue(page);
    await jb.goto(SERVICES);

    await services.meetingHours.focus();
    await page.keyboard.press('Enter');
    await expect(dialog.day('Monday')).toBeFocused();
    await page.keyboard.press('Space');
    await expect(dialog.day('Monday')).not.toBeChecked();
    await page.keyboard.press('Escape');

    await expect(dialog.root).toHaveCount(0);
    await expect(services.meetingHours).toBeFocused();
    expect(fake.hoursSaves).toEqual([]);
  });

  test('AC9: on a phone every control of the dialog is within reach', async ({ page, jb }) => {
    const services = new MyServicesPage(page);
    const dialog = new MeetingHoursDialog(page);
    await services.setWidth(360);
    const fake = await stubCatalogue(page);
    await jb.goto(SERVICES);

    await services.meetingHours.click();
    await dialog.day('Sunday').check();
    await dialog.save.click();

    await expect(dialog.root).toHaveCount(0);
    expect(fake.hoursSaves[0]).toMatchObject({ days: [0, 1, 2, 3, 4, 5] });
  });

  test('AC3: a member is offered only the times inside the saved hours', async ({ page, jb }) => {
    const dialog = new BookMeetingDialog(page);
    await new BusinessPage(page).setWidth(1280);
    await jb.signInAs('member');
    await stubBooking(page, {
      hours: { days: [2, 4, 6], opensAt: '10:00', closesAt: '12:00', slotMinutes: 30 },
    });
    await jb.goto('/b/legacy-financial/book');

    await dialog.day.fill('2026-11-12');
    await expect(dialog.times).toHaveText(['10:00 a.m.', '10:30 a.m.', '11:00 a.m.', '11:30 a.m.']);

    await dialog.service.selectOption({ label: 'Retirement & RRSP review · 60 min' });
    await expect(dialog.times).toHaveText(['10:00 a.m.', '10:30 a.m.', '11:00 a.m.']);

    await dialog.day.fill('2026-11-13');
    await expect(dialog.fieldError).toHaveText(
      'Trevor can’t meet on that day. Trevor meets Tuesday, Thursday and Saturday.',
    );
    await expect(dialog.times).toHaveCount(0);
  });
});
