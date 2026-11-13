import { stubBooking } from '../fixtures/booking';
import { stubFeedback } from '../fixtures/feedback';
import { expect, test } from '../fixtures/jb-test';
import { stubListingDrafts } from '../fixtures/listing-drafts';
import { stubOrder } from '../fixtures/order';
import { stubQuote } from '../fixtures/quote';
import { BusinessPage } from '../pages/business.page';
import { ListBusinessPage } from '../pages/list-business.page';
import { BookMeetingDialog, RequestItemDialog, RequestQuoteDialog } from '../pages/messages.page';
import { MomentCheck } from '../pages/moment-check';
import { ProductPage } from '../pages/product.page';

const tee = '/b/luzandre/p/faith-heavyweight-tee-charcoal';

test.describe('moment check-ins (L2-211)', () => {
  test('AC1, AC3: after a meeting request a high score is stored at once and thanked', async ({
    page,
    jb,
  }) => {
    const dialog = new BookMeetingDialog(page);
    const check = new MomentCheck(page);
    await new BusinessPage(page).setWidth(1280);
    await jb.signInAs('member');
    await stubBooking(page);
    const fake = await stubFeedback(page);
    await jb.goto('/b/legacy-financial/book');
    await dialog.day.fill('2026-11-12');
    await dialog.time('10:00 a.m.').click();
    await dialog.send.click();
    await expect(dialog.title).toHaveText('Request sent to Legacy Financial');

    await expect(check.question).toHaveText('How easy was it to send your request?');
    await expect(check.scores).toHaveAccessibleName(
      'How easy was it to send your request? 1 is very hard, 5 is very easy.',
    );
    await expect(check.scores.getByRole('radio')).toHaveCount(5);
    await expect(check.ends).toHaveText('Very hardVery easy');
    await expect(check.thanks).toHaveCount(0);
    await expect(check.note).toHaveCount(0);

    await check.score(5).click();

    await expect(check.thanks).toHaveText('Thanks, that helps us.');
    await expect(check.note).toHaveCount(0);
    expect(fake.sent).toHaveLength(1);
    expect(fake.sent[0].method).toBe('PUT');
    expect(fake.sent[0].path).toMatch(/^check-ins\/[0-9a-f-]{36}$/);
    expect(fake.sent[0].body).toEqual({ moment: 'request-sent', score: 5 });
  });

  test('AC3, AC4, AC5: a low score asks what got in the way, and each answer replaces the last', async ({
    page,
    jb,
  }) => {
    const dialog = new RequestQuoteDialog(page);
    const check = new MomentCheck(page);
    await new BusinessPage(page).setWidth(1280);
    await jb.signInAs('member');
    await stubQuote(page);
    const fake = await stubFeedback(page);
    await jb.goto('/b/luzandre/quote');
    await dialog.what.fill('Two hundred tees for our church’s anniversary.');
    await dialog.send.click();
    await expect(dialog.title).toHaveText('Quote request sent to Luzandre.com');
    await expect(check.question).toHaveText('How easy was it to send your request?');

    await check.score(4).click();
    await expect(check.thanks).toBeVisible();
    await check.score(2).click();

    await expect(check.scoreRadio(2)).toBeChecked();
    await expect(check.thanks).toHaveCount(0);
    await expect(check.note).toBeVisible();
    await expect(check.note).toHaveAttribute('maxlength', '1000');
    await check.note.fill('I couldn’t tell which service to pick.');
    await check.send.click();

    await expect(check.thanks).toHaveText('Thanks, that helps us.');
    await expect(check.note).toHaveCount(0);
    expect(fake.sent).toHaveLength(3);
    expect(fake.sent.map((sent) => sent.body)).toEqual([
      { moment: 'request-sent', score: 4 },
      { moment: 'request-sent', score: 2 },
      { moment: 'request-sent', score: 2, note: 'I couldn’t tell which service to pick.' },
    ]);
    // One answer per confirmation: every send names the same check-in.
    expect(new Set(fake.sent.map((sent) => sent.path)).size).toBe(1);
  });

  test('AC4: the note is optional', async ({ page, jb }) => {
    const dialog = new RequestItemDialog(page);
    const check = new MomentCheck(page);
    await new ProductPage(page).setWidth(1280);
    await jb.signInAs('member');
    await stubOrder(page);
    const fake = await stubFeedback(page);
    await jb.goto(`${tee}/request?option=M&quantity=1`);
    await dialog.send.click();
    await expect(dialog.title).toHaveText('Request sent to Luzandre.com');
    await expect(check.question).toHaveText('How easy was it to send your request?');

    await check.score(3).click();
    await check.send.click();

    await expect(check.thanks).toHaveText('Thanks, that helps us.');
    expect(fake.sent.map((sent) => sent.body)).toEqual([
      { moment: 'request-sent', score: 3 },
      { moment: 'request-sent', score: 3 },
    ]);
  });

  test('AC2: after a listing is published the question is about listing', async ({ page, jb }) => {
    const list = new ListBusinessPage(page);
    const check = new MomentCheck(page);
    await list.setWidth(1280);
    await jb.signInAs('member');
    await stubListingDrafts(page);
    const fake = await stubFeedback(page);
    await jb.goto('/list');
    await list.fillValid();
    await list.publish.click();
    await expect(list.doneHeading).toHaveText('Luzandre.com is live');

    await expect(check.question).toHaveText('How easy was it to list your business?');
    await expect(check.scores).toHaveAccessibleName(
      'How easy was it to list your business? 1 is very hard, 5 is very easy.',
    );
    await check.score(1).click();
    await expect(check.note).toBeVisible();
    expect(fake.sent[0].body).toEqual({ moment: 'listing-submitted', score: 1 });
  });

  test('AC6: an answer that cannot be stored says nothing and blocks nothing', async ({
    page,
    jb,
  }) => {
    const dialog = new BookMeetingDialog(page);
    const check = new MomentCheck(page);
    await new BusinessPage(page).setWidth(1280);
    await jb.signInAs('member');
    await stubBooking(page);
    const fake = await stubFeedback(page, { mode: 'offline' });
    await jb.goto('/b/legacy-financial/book');
    await dialog.day.fill('2026-11-12');
    await dialog.time('10:00 a.m.').click();
    await dialog.send.click();
    await expect(dialog.title).toHaveText('Request sent to Legacy Financial');

    await check.score(2).click();
    await expect.poll(() => fake.sent.length).toBe(1);
    await check.note.fill('Too many steps.');
    await check.send.click();

    await expect(check.thanks).toHaveText('Thanks, that helps us.');
    await expect(check.alert).toHaveCount(0);
    await expect(dialog.alert).toHaveCount(0);
    await expect(dialog.title).toHaveText('Request sent to Legacy Financial');
    await expect(dialog.viewRequest).toHaveAttribute('href', '/requests/r-booked');
  });

  test('AC7: a question that is ignored stores nothing', async ({ page, jb }) => {
    const dialog = new BookMeetingDialog(page);
    const check = new MomentCheck(page);
    await new BusinessPage(page).setWidth(1280);
    await jb.signInAs('member');
    await stubBooking(page);
    const fake = await stubFeedback(page);
    await jb.goto('/b/legacy-financial/book');
    await dialog.day.fill('2026-11-12');
    await dialog.time('10:00 a.m.').click();
    await dialog.send.click();
    await expect(check.question).toBeVisible();

    await dialog.close.click();

    await expect(dialog.root).toHaveCount(0);
    expect(fake.sent).toHaveLength(0);
  });
});
