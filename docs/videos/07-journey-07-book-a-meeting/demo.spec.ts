import { stubBooking } from '../../../e2e/fixtures/booking';
import { stubCatalogue } from '../../../e2e/fixtures/catalogue';
import { test } from '../../../e2e/fixtures/demo';
import { MeetingHoursDialog } from '../../../e2e/pages/meeting-hours.dialog';
import { BookMeetingDialog } from '../../../e2e/pages/messages.page';
import { MyServicesPage } from '../../../e2e/pages/my-services.page';
import { Toasts } from '../../../e2e/pages/toasts';

// Video 07: journey 7, book a meeting. An owner sets meeting hours on My services and a member is
// offered only the times inside them, against the stubs of meeting-hours.spec.ts and
// book-meeting.spec.ts (ADR 0009); the cards say what the run proved behind the screen. Built by
// `node tools/video-demo/build.mjs` (docs/videos/README.md).

/** The hours Naomi saves, and the hours the business Joanna books has saved. */
const HOURS = { days: [2, 4, 6], opensAt: '10:00', closesAt: '12:00', slotMinutes: 30 };

test('journey 7: book a meeting', async ({ demo }) => {
  const page = demo.page;
  const services = new MyServicesPage(page);
  const hours = new MeetingHoursDialog(page);
  const book = new BookMeetingDialog(page);
  const toasts = new Toasts(page);
  const park = () => page.mouse.move(1270, 715, { steps: 12 });

  // The owner: Naomi, of Luzandre.com, who never saved hours.
  await stubCatalogue(page);
  await demo.jb.goto('/my-business/services');
  await services.meetingHours.waitFor();
  await demo.card('Journey 7 · Book a meeting', [
    'A member requests a meeting time for a service with a business.',
    'This run: from 95% to complete.',
  ]);
  await demo.scene('intro');

  await demo.hideCard();
  await demo.scene('services', async () => {
    await demo.pause(4500);
    await demo.point(services.meetingHours);
  });

  await demo.scene('dialog', async () => {
    await demo.click(services.meetingHours);
    await hours.save.waitFor();
    await demo.point(hours.days);
    await demo.pause(1500);
    await demo.point(hours.from);
    await demo.pause(900);
    await demo.point(hours.until);
    await demo.pause(900);
    await demo.point(hours.every);
    await demo.pause(1500);
    await demo.point(hours.description);
  });

  await demo.scene('days', async () => {
    await demo.click(hours.day('Monday'));
    await demo.click(hours.day('Wednesday'));
    await demo.click(hours.day('Friday'));
    await demo.click(hours.day('Saturday'));
  });

  await demo.scene('invalid', async () => {
    await demo.point(hours.from);
    await hours.from.fill('10:00');
    await demo.pause(700);
    await demo.point(hours.until);
    await hours.until.fill('09:00');
    await demo.pause(900);
    await demo.click(hours.save);
    await hours.untilError.waitFor();
    await demo.point(hours.untilError);
  });

  await demo.scene('saved', async () => {
    await demo.point(hours.until);
    await hours.until.fill('12:00');
    await demo.pause(700);
    await demo.click(hours.save);
    const saved = toasts.withTitle('Meeting hours saved');
    await saved.waitFor();
    await demo.point(saved);
  });

  // A member: Joanna, booking a business whose owner saved the same hours.
  await demo.jb.signInAs('member');
  await stubBooking(page, { hours: HOURS });
  await demo.scene('member', async () => {
    await demo.jb.goto('/b/legacy-financial/book');
    await book.day.waitFor();
    await demo.pause(3500);
    await demo.point(book.day);
    await book.day.fill('2026-11-12');
    await book.time('11:30 a.m.').waitFor();
    await demo.point(book.time('10:00 a.m.'));
    await demo.pause(600);
    await demo.point(book.time('11:30 a.m.'));
  });

  await demo.scene('longer', async () => {
    await demo.point(book.service);
    await book.service.selectOption({ label: 'Retirement & RRSP review · 60 min' });
    await book.time('11:30 a.m.').waitFor({ state: 'detached' });
    await demo.point(book.time('11:00 a.m.'));
  });

  await demo.scene('closed', async () => {
    await demo.point(book.day);
    await book.day.fill('2026-11-13');
    await book.fieldError.waitFor();
    await demo.point(book.fieldError);
  });

  await demo.scene('send', async () => {
    await demo.point(book.day);
    await book.day.fill('2026-11-12');
    await demo.click(book.time('10:30 a.m.'));
    await demo.click(book.send);
    await book.viewRequest.waitFor();
    await demo.point(book.title);
  });

  // The dialog is drawn above everything else on the page: it closes before the card covers it.
  await book.close.click();
  await book.root.waitFor({ state: 'detached' });
  await park();
  await demo.card('The API decides when a meeting can be asked for', [
    'PUT /api/my-business/meeting-hours: only the owner, for their own listing; days, From, Until and a slot length are checked again (422 with a code per field).',
    'L2-220 AC4, AC5: Toronto times of day on either side of a clock change; requests already sent keep their day, time and status.',
    'MeetingHoursTests.cs, 19 test cases, through the API’s own endpoints.',
  ]);
  await demo.scene('rules');

  await demo.card('Two criteria that had no test now have one', [
    'L2-044 AC6: the note of a booking stops at 1,000 characters. book-meeting.spec.ts.',
    'L2-044 AC5: the owner gets an in-app notification of the booking, and the member one when it is confirmed. BookingTests.cs.',
  ]);
  await demo.scene('proved');

  await demo.card('Journey 7 is complete', [
    'L2-220 and ADR 0048 record the work; the booking design describes the code as built.',
    'Left for the owner: the visual, responsive and accessibility sweeps.',
    'Not built: different hours on different days, calendars and double booking.',
  ]);
  await demo.scene('close');
});
