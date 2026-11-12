import { expect, test } from '../fixtures/jb-test';
import { stubListingDrafts } from '../fixtures/listing-drafts';
import {
  LAURENT_PHOTOGRAPHY,
  LAURENT_STUDIO,
  OTHER_BUSINESSES,
  stubMyBusiness,
} from '../fixtures/my-business';
import { ListBusinessPage } from '../pages/list-business.page';
import { ConfirmRequestDialog } from '../pages/confirm-request.dialog';
import { EditListingPage } from '../pages/edit-listing.page';
import { ForbiddenPage } from '../pages/forbidden.page';
import { MyBusinessPage } from '../pages/my-business.page';
import { PauseListingDialog } from '../pages/pause-listing.dialog';
import { Toasts } from '../pages/toasts';
import { AwayPeriodDialog } from '../pages/away-period.dialog';

const OVERVIEW = '/my-business';
const EDITOR = '/my-business/listing';

const photo = (name = 'front.png') => ({
  name,
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
    'base64',
  ),
});

test.describe('run a business listing: My business (L2-085, L2-086, L2-096, L2-097)', () => {
  test('L2-085: a live listing shows the week in numbers and the sections of the workspace', async ({
    page,
    jb,
  }) => {
    const business = new MyBusinessPage(page);
    await business.setWidth(1280);
    await stubMyBusiness(page);
    await jb.goto(OVERVIEW);

    await expect(business.heading).toHaveText('Luzandre.com');
    await expect(business.subtitle).toHaveText('Verified · live since June 2026');
    await expect(business.publicLink).toBeVisible();
    await expect(business.stat('Listing views, 7 days')).toContainText('312');
    await expect(business.stat('Listing views, 7 days')).toContainText('↑ 18% on last week');
    await expect(business.stat('Open requests')).toContainText('2 new since yesterday');
    await expect(business.stat('Unanswered messages')).toContainText('1');
    await expect(business.section('Overview')).toHaveAttribute('aria-current', 'page');
    await expect(business.section(/^Requests/)).toContainText('3');
    await expect(business.listingCard).toContainText('4 products');
    await expect(business.listingCard).toContainText('1 sold out');
    await expect(business.listingCard).toContainText('Verification');
    await expect(business.listingCard).toContainText('Verified Jun 2026');
    await expect(business.listingCard).not.toContainText('Church reference');
  });

  test('L2-085 AC2 and AC6: "Saved by members" shows the members who saved the business and how many are new this week', async ({
    page,
    jb,
  }) => {
    const business = new MyBusinessPage(page);
    await stubMyBusiness(page);
    await jb.goto(OVERVIEW);

    await expect(business.stats).toHaveCount(4);
    await expect(business.statValue('Saved by members')).toHaveText('28');
    await expect(business.statNote('Saved by members')).toHaveText('↑ 4 this week');
  });

  test('L2-085 AC6: a week with no new save says so in words', async ({ page, jb }) => {
    const business = new MyBusinessPage(page);
    await stubMyBusiness(page, { saved: { value: 28, change: 0 } });
    await jb.goto(OVERVIEW);

    await expect(business.statValue('Saved by members')).toHaveText('28');
    await expect(business.statNote('Saved by members')).toHaveText('None new this week');
  });

  test('L2-085: the requests that need a reply are listed and can be confirmed from here', async ({
    page,
    jb,
  }) => {
    const business = new MyBusinessPage(page);
    const confirm = new ConfirmRequestDialog(page);
    const toasts = new Toasts(page);
    await business.setWidth(1280);
    await stubMyBusiness(page);
    await jb.goto(OVERVIEW);

    await expect(business.replyRows).toHaveCount(2);
    await expect(business.replyRow('Samuel Park')).toContainText('Custom church team tee × 24');
    await business
      .replyRow('Samuel Park')
      .getByRole('button', { name: /^Confirm/ })
      .click();
    await confirm.confirm.click();

    await expect(toasts.withTitle('Order confirmed')).toBeVisible();
  });

  test('L2-086: a submitted listing says it is being reviewed, with the progress and no numbers', async ({
    page,
    jb,
  }) => {
    const business = new MyBusinessPage(page);
    await business.setWidth(1280);
    await stubMyBusiness(page, { state: 'ready-to-review' });
    await jb.goto(OVERVIEW);

    await expect(business.subtitle).toHaveText('Pending verification · submitted today');
    await expect(business.alert.first()).toContainText('We’re reviewing Luzandre.com');
    await expect(business.alert.first()).toContainText(
      'You submitted it today. We review and publish within two business days.',
    );
    await expect(business.alert.first().getByRole('button')).toHaveCount(0);
    await expect(business.timeline).toContainText([
      'Listing submitted',
      'Review by Jubilee',
      'Live on Jubilee',
    ]);
    await expect(business.timeline.nth(1)).toHaveAttribute('aria-current', 'step');
    await expect(business.publicLink).toHaveText(/Preview listing/);
    await expect(business.stats).toHaveCount(0);
  });

  test('L2-086: when changes are requested the reviewer asks are shown with Edit listing', async ({
    page,
    jb,
  }) => {
    const business = new MyBusinessPage(page);
    await business.setWidth(1280);
    await stubMyBusiness(page, { state: 'changes-requested' });
    await jb.goto(OVERVIEW);

    await expect(business.subtitle).toHaveText('Changes requested · not public yet');
    await expect(business.alert.first()).toContainText('Your tagline mentions a discount code');
    await expect(business.alert.first()).toContainText('Two changes needed before we can publish');
    await expect(business.alert.first()).toContainText(
      'Miriam from the verification team, Mon 9 Nov.',
    );
    await expect(business.main.getByRole('link', { name: 'Edit listing' })).toBeVisible();
  });

  test('L2-086: a member with no business is invited to list one', async ({ page, jb }) => {
    const business = new MyBusinessPage(page);
    await business.setWidth(1280);
    await stubMyBusiness(page, { state: 'none' });
    await jb.goto(OVERVIEW);

    await expect(business.empty).toContainText('List your business free');
    await expect(business.listYours).toBeVisible();
    await expect(business.switcher).toHaveCount(0);
    await expect(business.listAnother).toHaveCount(0);
  });

  test('L2-086 AC1: "List your business" opens the listing form', async ({ page, jb }) => {
    const business = new MyBusinessPage(page);
    const form = new ListBusinessPage(page);
    await stubMyBusiness(page, { state: 'none' });
    await stubListingDrafts(page);
    await jb.goto(OVERVIEW);

    await business.listYours.click();

    await expect(page).toHaveURL(/\/list$/);
    await expect(form.heading).toBeVisible();
  });

  test('L2-086: an overview that cannot load quotes the reference JB-BIZ-503 and tries again', async ({
    page,
    jb,
  }) => {
    const business = new MyBusinessPage(page);
    await business.setWidth(1280);
    const fake = await stubMyBusiness(page, { overview: 'fails' });
    await jb.goto(OVERVIEW);

    await expect(business.reference).toHaveText('JB-BIZ-503');
    fake.overview = 'ok';
    await business.tryAgain.click();
    await expect(business.heading).toHaveText('Luzandre.com');
  });

  test('L2-097 AC1: an answer of 403 shows the forbidden page', async ({ page, jb }) => {
    const forbidden = new ForbiddenPage(page);
    await forbidden.setWidth(1280);
    await stubMyBusiness(page, { overview: 'forbidden' });
    await jb.goto(OVERVIEW);

    await expect(forbidden.heading).toBeVisible();
    await expect(page).toHaveURL(/\/forbidden$/);
  });

  test('L2-085: a listing just verified shows a banner that can be dismissed', async ({
    page,
    jb,
  }) => {
    const business = new MyBusinessPage(page);
    await business.setWidth(1280);
    await stubMyBusiness(page, { justApproved: true });
    await jb.goto(OVERVIEW);

    await expect(business.liveBanner).toContainText(
      'Luzandre.com is verified and live. Members can find you in Shops.',
    );
    await business.liveBanner.getByRole('button', { name: 'Dismiss' }).click();
    await expect(business.liveBanner).toHaveCount(0);
  });
});

test.describe('run a business listing: more than one business (L2-079)', () => {
  test('AC4: an owner with one business sees "List another business" and no switcher', async ({
    page,
    jb,
  }) => {
    const business = new MyBusinessPage(page);
    const form = new ListBusinessPage(page);
    await stubMyBusiness(page);
    await stubListingDrafts(page);
    await jb.goto(OVERVIEW);

    await expect(business.heading).toHaveText('Luzandre.com');
    await expect(business.switcher).toHaveCount(0);
    await business.listAnother.click();

    await expect(page).toHaveURL(/\/list\?draft=new$/);
    await expect(form.heading).toBeVisible();
  });

  test('AC4: the switcher names each business with its stage and each draft, with the one shown selected', async ({
    page,
    jb,
  }) => {
    const business = new MyBusinessPage(page);
    await stubMyBusiness(page, { others: OTHER_BUSINESSES });
    await jb.goto(OVERVIEW);

    await expect(business.switcherOptions).toHaveText([
      'Luzandre.com · Live',
      'Laurent Photography · Pending verification',
      'Laurent Studio · Draft',
    ]);
    await expect(business.switcher).toHaveValue('7c1d0000-0000-4000-8000-000000000001');
    await expect(business.listAnother).toBeVisible();
  });

  test('AC5: choosing another business shows it and the select keeps focus', async ({
    page,
    jb,
  }) => {
    const business = new MyBusinessPage(page);
    const fake = await stubMyBusiness(page, { others: OTHER_BUSINESSES });
    await jb.goto(OVERVIEW);
    await expect(business.heading).toHaveText('Luzandre.com');

    await business.switcher.focus();
    await business.chooseBusiness('Laurent Photography · Pending verification');

    await expect(business.heading).toHaveText('Laurent Photography');
    await expect(business.subtitle).toHaveText('Pending verification · submitted today');
    await expect(business.switcher).toHaveValue(LAURENT_PHOTOGRAPHY);

    // The select is a native control and keeps focus, so the keyboard goes on choosing from it.
    await expect(business.switcher).toBeFocused();
    await business.chooseBusiness('Luzandre.com · Live');
    await expect(business.heading).toHaveText('Luzandre.com');
    await expect(business.switcher).toBeFocused();
    expect(fake.choices).toEqual([LAURENT_PHOTOGRAPHY, '7c1d0000-0000-4000-8000-000000000001']);
  });

  test('AC5: choosing a draft opens the listing form with that draft', async ({ page, jb }) => {
    const business = new MyBusinessPage(page);
    const form = new ListBusinessPage(page);
    const fake = await stubMyBusiness(page, { others: OTHER_BUSINESSES });
    await stubListingDrafts(page);
    await jb.goto(OVERVIEW);

    await business.chooseBusiness('Laurent Studio · Draft');

    await expect(page).toHaveURL(new RegExp(`/list\\?draft=${LAURENT_STUDIO}$`));
    await expect(form.heading).toBeVisible();
    expect(fake.choices).toEqual([]);
  });

  test('AC5: a switch that fails says so and the business shown stays selected', async ({
    page,
    jb,
  }) => {
    const business = new MyBusinessPage(page);
    const toasts = new Toasts(page);
    await stubMyBusiness(page, { others: OTHER_BUSINESSES, choose: 'fails' });
    await jb.goto(OVERVIEW);

    await business.chooseBusiness('Laurent Photography · Pending verification');

    await expect(toasts.danger('We couldn’t switch businesses')).toContainText(
      'Luzandre.com is still shown. Try again.',
    );
    await expect(business.heading).toHaveText('Luzandre.com');
    await expect(business.switcher).toHaveValue('7c1d0000-0000-4000-8000-000000000001');
  });
});

test.describe('run a business listing: pause and resume (L2-096)', () => {
  test('L2-096 AC1 and AC2: the dialog says what stays, and pausing shows the persistent banner', async ({
    page,
    jb,
  }) => {
    const business = new MyBusinessPage(page);
    const dialog = new PauseListingDialog(page);
    const toasts = new Toasts(page);
    await business.setWidth(1280);
    const fake = await stubMyBusiness(page);
    await jb.goto(OVERVIEW);

    await business.pause.click();
    await expect(dialog.title).toHaveText('Pause Luzandre.com?');
    await expect(dialog.description).toContainText(
      'Your listing is hidden from browse and search until you resume it. Your 3 open requests and your messages stay. You keep your verified status.',
    );
    await expect(dialog.keep).toBeFocused();
    await dialog.pause.click();

    await expect(toasts.withTitle('Listing paused')).toBeVisible();
    await expect(business.pausedBanner).toContainText(
      'It’s hidden from browse and search until you resume it.',
    );
    await expect(business.resume).toBeVisible();
    await expect(business.subtitle).toHaveText('Verified · paused, not public');
    expect(fake.pauses).toBe(1);
  });

  test('L2-096: keeping it live closes the dialog and sends nothing', async ({ page, jb }) => {
    const business = new MyBusinessPage(page);
    const dialog = new PauseListingDialog(page);
    await business.setWidth(1280);
    const fake = await stubMyBusiness(page);
    await jb.goto(OVERVIEW);

    await business.pause.click();
    await dialog.keep.click();

    await expect(dialog.root).toHaveCount(0);
    expect(fake.pauses).toBe(0);
  });

  test('L2-096 AC5: a pause that fails says the listing is still live and offers to try again', async ({
    page,
    jb,
  }) => {
    const business = new MyBusinessPage(page);
    const dialog = new PauseListingDialog(page);
    await business.setWidth(1280);
    const fake = await stubMyBusiness(page, { pause: 'fails' });
    await jb.goto(OVERVIEW);

    await business.pause.click();
    await dialog.pause.click();
    await expect(dialog.alert).toContainText('We couldn’t pause it');
    await expect(dialog.alert).toContainText('Your listing is still live. Try again.');

    fake.pause = 'ok';
    await dialog.tryAgain.click();
    await expect(dialog.root).toHaveCount(0);
    await expect(business.pausedBanner).toBeVisible();
  });

  test('L2-096 AC3: resuming makes the listing public again', async ({ page, jb }) => {
    const business = new MyBusinessPage(page);
    const toasts = new Toasts(page);
    await business.setWidth(1280);
    const fake = await stubMyBusiness(page, { paused: true });
    await jb.goto(OVERVIEW);

    await expect(business.pausedBanner).toBeVisible();
    await business.resume.click();

    await expect(toasts.withTitle('Listing resumed')).toBeVisible();
    await expect(business.pausedBanner).toHaveCount(0);
    await expect(business.subtitle).toHaveText('Verified · live since June 2026');
    expect(fake.resumes).toBe(1);
  });

  test('L2-096 AC4: a listing paused for a year goes back to verification when resumed', async ({
    page,
    jb,
  }) => {
    const business = new MyBusinessPage(page);
    const toasts = new Toasts(page);
    await business.setWidth(1280);
    await stubMyBusiness(page, { paused: true, resume: 'review' });
    await jb.goto(OVERVIEW);

    await business.resume.click();

    await expect(toasts.withTitle('Back in the verification queue')).toBeVisible();
    await expect(business.subtitle).toHaveText('Pending verification · submitted today');
  });
});

test.describe('run a business listing: the away period (L2-062)', () => {
  test('AC3: "Set away period" asks for the day the owner is back', async ({ page, jb }) => {
    const business = new MyBusinessPage(page);
    const dialog = new AwayPeriodDialog(page);
    await business.setWidth(360);
    await stubMyBusiness(page);
    await jb.goto(OVERVIEW);
    await expect(business.awayRow).toContainText('Away period');
    await expect(business.awayRow).toContainText('Not set');

    await business.setAway.click();

    await expect(dialog.title).toHaveText('Set an away period');
    await expect(dialog.description).toHaveText(
      'Members who message you see that you’re away and when you’re back. Your listing stays public.',
    );
    await expect(dialog.backOn).toHaveAttribute('type', 'date');
    await expect(dialog.backOn).toHaveAttribute('min', '2026-11-11');
    await expect(dialog.backOn).toBeFocused();
    await expect(dialog.clear).toHaveCount(0);

    await page.keyboard.press('Escape');
    await expect(dialog.root).toBeHidden();
    await expect(business.setAway).toBeFocused();
  });

  test('AC3, AC5: saving a date shows "Away until" on My business, with Change', async ({
    page,
    jb,
  }) => {
    const business = new MyBusinessPage(page);
    const dialog = new AwayPeriodDialog(page);
    const toasts = new Toasts(page);
    await business.setWidth(1280);
    const fake = await stubMyBusiness(page);
    await jb.goto(OVERVIEW);

    await business.setAway.click();
    await dialog.backOn.fill('2026-11-16');
    await dialog.save.click();

    await expect(dialog.root).toBeHidden();
    await expect(toasts.withTitle('Away period set')).toContainText(
      'Members who message you see you’re away until Mon 16 Nov.',
    );
    await expect(business.awayRow).toContainText('Away until Mon 16 Nov');
    await expect(business.changeAway).toBeVisible();
    expect(fake.aways).toEqual(['2026-11-16']);
  });

  for (const [date, message] of [
    ['', 'Choose a date from tomorrow on.'],
    ['2026-11-10', 'Choose a date from tomorrow on.'],
    ['2027-11-11', 'Choose a date within a year.'],
  ] as const) {
    test(`AC4: "${date || 'no date'}" is refused under the field and nothing is saved`, async ({
      page,
      jb,
    }) => {
      const business = new MyBusinessPage(page);
      const dialog = new AwayPeriodDialog(page);
      await business.setWidth(1280);
      const fake = await stubMyBusiness(page);
      await jb.goto(OVERVIEW);
      await business.setAway.click();

      await dialog.backOn.fill(date);
      await dialog.save.click();

      await expect(dialog.backOnError).toHaveText(message);
      await expect(dialog.backOn).toHaveAttribute('aria-invalid', 'true');
      await expect(dialog.backOn).toBeFocused();
      expect(fake.aways).toEqual([]);
    });
  }

  test('AC4: a date the server refuses is said under the field', async ({ page, jb }) => {
    const business = new MyBusinessPage(page);
    const dialog = new AwayPeriodDialog(page);
    await business.setWidth(1280);
    await stubMyBusiness(page, { away: 'in-past' });
    await jb.goto(OVERVIEW);
    await business.setAway.click();
    await dialog.backOn.fill('2026-11-16');
    await dialog.save.click();

    await expect(dialog.backOnError).toHaveText('Choose a date from tomorrow on.');
    await expect(dialog.title).toBeVisible();
  });

  test('AC5: an away period that is set can be changed or cleared', async ({ page, jb }) => {
    const business = new MyBusinessPage(page);
    const dialog = new AwayPeriodDialog(page);
    const toasts = new Toasts(page);
    await business.setWidth(1280);
    const fake = await stubMyBusiness(page, { awayUntil: '2026-11-16T05:00:00Z' });
    await jb.goto(OVERVIEW);
    await expect(business.awayRow).toContainText('Away until Mon 16 Nov');

    await business.changeAway.click();
    await expect(dialog.backOn).toHaveValue('2026-11-16');
    await dialog.clear.click();

    await expect(dialog.root).toBeHidden();
    await expect(toasts.withTitle('Away period cleared')).toBeVisible();
    await expect(business.awayRow).toContainText('Not set');
    expect(fake.aways).toEqual([null]);
  });

  test('a save that fails says the away period has not changed and can be tried again', async ({
    page,
    jb,
  }) => {
    const business = new MyBusinessPage(page);
    const dialog = new AwayPeriodDialog(page);
    await business.setWidth(1280);
    const fake = await stubMyBusiness(page, { away: 'fails' });
    await jb.goto(OVERVIEW);
    await business.setAway.click();
    await dialog.backOn.fill('2026-11-16');
    await dialog.save.click();

    await expect(dialog.alert).toContainText('We couldn’t save that');
    await expect(dialog.alert).toContainText('Your away period has not changed. Try again.');
    await expect(dialog.backOn).toHaveValue('2026-11-16');

    fake.away = 'ok';
    await dialog.save.click();
    await expect(dialog.root).toBeHidden();
    expect(fake.aways).toEqual(['2026-11-16']);
  });
});

test.describe('run a business listing: the editor (L2-087, L2-088)', () => {
  test('L2-087 AC1: the editor shows every field, the counter and the live preview', async ({
    page,
    jb,
  }) => {
    const editor = new EditListingPage(page);
    await editor.setWidth(1280);
    await stubMyBusiness(page);
    await jb.goto(EDITOR);

    await expect(editor.heading).toHaveText('Luzandre.com');
    await expect(editor.name).toHaveValue('Luzandre.com');
    await expect(editor.tagline).toHaveValue(/^Unique & custom Christian apparel/);
    await expect(editor.counter).toHaveText('66 / 90');
    await expect(editor.category).toHaveValue('shops');
    await expect(editor.hours).toHaveValue('Mon–Sat 10:00–6:00');
    await expect(editor.website).toHaveValue('https://luzandre.com');
    await expect(editor.highlight).toHaveValue('Ships across Canada');
    await expect(editor.status).toHaveText('Changes are published when you save');
    await expect(editor.discard).toBeVisible();
    await expect(editor.preview).toContainText('Luzandre.com');
    await expect(editor.section('Listing')).toHaveAttribute('aria-current', 'page');
  });

  test('L2-087 AC1: the preview follows what the owner types', async ({ page, jb }) => {
    const editor = new EditListingPage(page);
    await editor.setWidth(1280);
    await stubMyBusiness(page);
    await jb.goto(EDITOR);

    await editor.highlight.fill('Free first meeting');

    await expect(editor.preview).toContainText('Free first meeting');
  });

  test('L2-087 AC2: a tagline that is too long and empty hours are named in a summary and sent nowhere', async ({
    page,
    jb,
  }) => {
    const editor = new EditListingPage(page);
    await editor.setWidth(1280);
    const fake = await stubMyBusiness(page);
    await jb.goto(EDITOR);

    await editor.tagline.fill('x'.repeat(124));
    await editor.hours.fill('');
    await editor.save.click();

    await expect(editor.summary).toContainText('Fix 2 things to continue');
    await expect(editor.fieldError(editor.tagline)).toHaveText(
      'Shorten this to 90 characters. It has 124.',
    );
    await expect(editor.fieldError(editor.hours)).toHaveText(
      'Enter your hours, or “By appointment”.',
    );
    await expect(editor.tagline).toHaveAttribute('aria-invalid', 'true');
    await expect(editor.counter).toHaveText('124 / 90');
    expect(fake.saves).toHaveLength(0);
  });

  test('L2-087 AC3: a website that is not an http or https address is refused', async ({
    page,
    jb,
  }) => {
    const editor = new EditListingPage(page);
    await editor.setWidth(1280);
    const fake = await stubMyBusiness(page);
    await jb.goto(EDITOR);

    await editor.website.fill('luzandre.com');
    await editor.save.click();

    await expect(editor.fieldError(editor.website)).toHaveText(
      'Enter a web address starting with https://',
    );
    expect(fake.saves).toHaveLength(0);
  });

  test('L2-087 AC4: About stops at 1,500 characters and Highlight at 30', async ({ page, jb }) => {
    const editor = new EditListingPage(page);
    await editor.setWidth(1280);
    await stubMyBusiness(page);
    await jb.goto(EDITOR);

    await editor.highlight.clear();
    await editor.highlight.pressSequentially('h'.repeat(35));

    await expect(editor.highlight).toHaveValue('h'.repeat(30));
    await expect(editor.about).toHaveAttribute('maxlength', '1500');
  });

  test('L2-087 AC5: saving publishes at once and offers the public listing', async ({
    page,
    jb,
  }) => {
    const editor = new EditListingPage(page);
    await editor.setWidth(1280);
    const fake = await stubMyBusiness(page);
    await jb.goto(EDITOR);

    await editor.tagline.fill('Church tees printed in Toronto');
    await editor.save.click();

    await expect(editor.success).toContainText('Listing updated');
    await expect(editor.success).toContainText('Your changes are live now.');
    await expect(editor.success.getByRole('link', { name: 'View public listing' })).toBeVisible();
    expect(fake.saves).toHaveLength(1);
    // The save names the listing the editor opened (ADR 0051).
    expect(fake.saves[0]).toMatchObject({
      listingId: '7c1d0000-0000-4000-8000-000000000001',
      version: 0,
      tagline: 'Church tees printed in Toronto',
      category: 'shops',
    });
  });

  test('L2-087 AC6: a new name is live at once and the owner is told the team will look again', async ({
    page,
    jb,
  }) => {
    const editor = new EditListingPage(page);
    await editor.setWidth(1280);
    await stubMyBusiness(page);
    await jb.goto(EDITOR);

    await editor.name.fill('Luzandre Print Co.');
    await editor.save.click();

    await expect(editor.success).toContainText('Your changes are live now.');
    await expect(editor.success).toContainText(
      'Because you changed the name or category, the verification team will take another look within two business days. Your listing stays live.',
    );
  });

  test('L2-087 AC6: a save that changes neither the name nor the category promises no re-check', async ({
    page,
    jb,
  }) => {
    const editor = new EditListingPage(page);
    await editor.setWidth(1280);
    await stubMyBusiness(page);
    await jb.goto(EDITOR);

    await editor.tagline.fill('Church tees printed in Toronto');
    await editor.save.click();

    await expect(editor.success).toContainText('Your changes are live now.');
    await expect(editor.success).not.toContainText('verification team');
  });

  test('L2-087: discarding puts the saved words back', async ({ page, jb }) => {
    const editor = new EditListingPage(page);
    await editor.setWidth(1280);
    await stubMyBusiness(page);
    await jb.goto(EDITOR);

    await editor.name.fill('Something else');
    await editor.discard.click();

    await expect(editor.name).toHaveValue('Luzandre.com');
  });

  test('L2-087 AC8: a save over a newer version is refused and the owner can reload', async ({
    page,
    jb,
  }) => {
    const editor = new EditListingPage(page);
    await editor.setWidth(1280);
    const fake = await stubMyBusiness(page, { save: 'conflict' });
    await jb.goto(EDITOR);

    await editor.about.fill('Changed in another tab');
    await editor.save.click();

    await expect(editor.conflict).toContainText(
      'This listing changed since you opened it. Reload to see the latest.',
    );
    fake.save = 'ok';
    await editor.conflict.getByRole('button', { name: 'Reload' }).click();
    await expect(editor.conflict).toHaveCount(0);
    await expect(editor.about).toHaveValue(/^Custom tees, mugs/);
  });

  test('L2-087 AC7: an editor that cannot load quotes the reference JB-LST-503', async ({
    page,
    jb,
  }) => {
    const editor = new EditListingPage(page);
    await editor.setWidth(1280);
    await stubMyBusiness(page, { editor: 'fails' });
    await jb.goto(EDITOR);

    await expect(editor.reference).toHaveText('JB-LST-503');
    await expect(editor.main.getByRole('link', { name: 'Back to overview' })).toBeVisible();
  });

  test('L2-097 AC1: an answer of 403 on the editor shows the forbidden page', async ({
    page,
    jb,
  }) => {
    const forbidden = new ForbiddenPage(page);
    await forbidden.setWidth(1280);
    await stubMyBusiness(page, { editor: 'forbidden' });
    await jb.goto(EDITOR);

    await expect(page).toHaveURL(/\/forbidden$/);
  });
});

test.describe('run a business listing: photos (L2-088)', () => {
  test('L2-088 AC1 and AC5: the first photo is the cover and has a default description', async ({
    page,
    jb,
  }) => {
    const editor = new EditListingPage(page);
    await editor.setWidth(1280);
    await stubMyBusiness(page);
    await jb.goto(EDITOR);

    await editor.picker.setInputFiles(photo());
    await editor.picker.setInputFiles(photo('back.png'));

    await expect(editor.photoTiles).toHaveCount(2);
    await expect(editor.photoTiles.first()).toContainText('Cover');
    await expect(editor.photoTiles.first().getByRole('img')).toHaveAttribute(
      'alt',
      'Luzandre.com photo 1',
    );
    await expect(editor.photoAlt(2)).toHaveAttribute('placeholder', 'Luzandre.com photo 2');
    await expect(editor.moveEarlier(1)).toBeDisabled();
    await expect(editor.moveLater(2)).toBeDisabled();
  });

  test('L2-088 AC3: moving a photo earlier makes it the cover', async ({ page, jb }) => {
    const editor = new EditListingPage(page);
    await editor.setWidth(1280);
    const fake = await stubMyBusiness(page);
    await jb.goto(EDITOR);
    await editor.picker.setInputFiles(photo());
    await editor.picker.setInputFiles(photo('back.png'));
    await expect(editor.photoTiles).toHaveCount(2);
    const second = fake.photos[1].id;

    await editor.moveEarlier(2).click();

    await expect(editor.photoTiles.first()).toContainText('Cover');
    expect(fake.moves).toEqual([{ id: second, position: 1 }]);
    expect(fake.photos.find((item) => item.id === second)?.position).toBe(1);
  });

  test('L2-088 AC3: dragging a photo by its handle to the front makes it the cover', async ({
    page,
    jb,
  }) => {
    const editor = new EditListingPage(page);
    await editor.setWidth(1280);
    const fake = await stubMyBusiness(page);
    await jb.goto(EDITOR);
    await editor.picker.setInputFiles(photo());
    await editor.picker.setInputFiles(photo('back.png'));
    await editor.picker.setInputFiles(photo('studio.png'));
    await expect(editor.photoTiles).toHaveCount(3);
    await editor.photoAlt(3).fill('The studio in Leslieville');
    await editor.photoAlt(3).blur();
    const third = fake.photos[2].id;

    await editor.dragPhoto(3, 1);

    await expect(editor.photoAlt(1)).toHaveValue('The studio in Leslieville');
    await expect(editor.photoTiles.first()).toContainText('Cover');
    expect(fake.moves).toEqual([{ id: third, position: 1 }]);
  });

  test('L2-088 AC3: a dragged photo goes back when the move fails, and the page says so', async ({
    page,
    jb,
  }) => {
    const editor = new EditListingPage(page);
    await editor.setWidth(1280);
    const fake = await stubMyBusiness(page, { move: 'fails' });
    await jb.goto(EDITOR);
    await editor.picker.setInputFiles(photo());
    await editor.picker.setInputFiles(photo('back.png'));
    await expect(editor.photoTiles).toHaveCount(2);
    await editor.photoAlt(2).fill('The back of the tee');
    await editor.photoAlt(2).blur();

    await editor.dragPhoto(2, 1);

    await expect(editor.photoError).toHaveText('We couldn’t change your photos. Try again.');
    await expect(editor.photoAlt(2)).toHaveValue('The back of the tee');
    expect(fake.moves).toHaveLength(1);
  });

  test('L2-088 AC3: a photo dropped where it was sends nothing', async ({ page, jb }) => {
    const editor = new EditListingPage(page);
    await editor.setWidth(1280);
    const fake = await stubMyBusiness(page);
    await jb.goto(EDITOR);
    await editor.picker.setInputFiles(photo());
    await editor.picker.setInputFiles(photo('back.png'));
    await expect(editor.photoTiles).toHaveCount(2);

    await editor.dragPhoto(2, 2);

    await expect(editor.photoTiles).toHaveCount(2);
    expect(fake.moves).toEqual([]);
  });

  test('L2-088 AC3: the drag handle is for a pointer; the keyboard has the move buttons', async ({
    page,
    jb,
  }) => {
    const editor = new EditListingPage(page);
    await editor.setWidth(1280);
    await stubMyBusiness(page);
    await jb.goto(EDITOR);
    await editor.picker.setInputFiles(photo());
    await editor.picker.setInputFiles(photo('back.png'));
    await expect(editor.photoTiles).toHaveCount(2);

    await expect(editor.dragHandle(1)).toHaveAttribute('aria-hidden', 'true');
    await expect(editor.dragHandle(1)).toHaveAttribute('tabindex', '-1');
    await editor.photoAlt(1).focus();
    await page.keyboard.press('Tab');
    // Photo 1 cannot move earlier, so the first stop after its description is "later".
    await expect(editor.moveLater(1)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(editor.moveEarlier(2)).toBeEnabled();
    await expect(editor.photoHelp).toContainText('Drag a photo by its handle, or use the arrows');
  });

  test('L2-088 AC5: the owner describes a photo and can remove it', async ({ page, jb }) => {
    const editor = new EditListingPage(page);
    await editor.setWidth(1280);
    const fake = await stubMyBusiness(page);
    await jb.goto(EDITOR);
    await editor.picker.setInputFiles(photo());
    await expect(editor.photoTiles).toHaveCount(1);

    await editor.photoAlt(1).fill('The shop front on Queen Street');
    await editor.photoAlt(1).blur();
    await expect(editor.photoTiles.first().getByRole('img')).toHaveAttribute(
      'alt',
      'The shop front on Queen Street',
    );
    expect(fake.descriptions[0].alt).toBe('The shop front on Queen Street');

    await editor.remove(1).click();
    await expect(editor.photoTiles).toHaveCount(0);
    expect(fake.removals).toHaveLength(1);
  });

  test('L2-088 AC2: a photo the API refuses is explained', async ({ page, jb }) => {
    const editor = new EditListingPage(page);
    await editor.setWidth(1280);
    await stubMyBusiness(page, { photoRefusal: { status: 422, code: 'NOT_AN_IMAGE' } });
    await jb.goto(EDITOR);

    await editor.picker.setInputFiles(photo('front.png'));

    await expect(editor.photoError).toHaveText('Add a JPG or PNG photo.');
    await expect(editor.photoTiles).toHaveCount(0);
  });

  test('L2-088 AC2: a file over 5 MB is refused before it is sent', async ({ page, jb }) => {
    const editor = new EditListingPage(page);
    await editor.setWidth(1280);
    const fake = await stubMyBusiness(page);
    await jb.goto(EDITOR);

    await editor.picker.setInputFiles({
      name: 'big.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
    });

    await expect(editor.photoError).toHaveText('Photos can be 5 MB at most.');
    expect(fake.uploads).toBe(0);
  });

  test('L2-088 AC2: with six photos there is no seventh to add', async ({ page, jb }) => {
    const editor = new EditListingPage(page);
    await editor.setWidth(1280);
    await stubMyBusiness(page);
    await jb.goto(EDITOR);

    for (let i = 0; i < 6; i += 1) {
      await editor.picker.setInputFiles(photo(`p${i}.png`));
      await expect(editor.photoTiles).toHaveCount(i + 1);
    }

    await expect(editor.addPhoto).toHaveCount(0);
  });
});
