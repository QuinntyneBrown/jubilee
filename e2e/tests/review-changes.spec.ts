import type { Page } from '@playwright/test';
import { type Jb, expect, test } from '../fixtures/jb-test';
import { goOffline } from '../fixtures/offline';
import { joannasReview, legacyReviews, stubReviews } from '../fixtures/reviews';
import { BusinessPage } from '../pages/business.page';
import {
  EditReviewDialog,
  RemoveReviewDialog,
  ReplyReviewDialog,
  ReportReviewDialog,
} from '../pages/review-dialogs';
import { Toasts } from '../pages/toasts';

// Acceptance Test
// Traces to: L2-233, L2-234, L2-236, L2-240
// Description: on a listing page the author edits or removes their review, the owner replies, and
// a member reports a review, each in a dialog; offline, the actions say they need a connection.
// The reviews and their writes are answered by `stubReviews` (ADR 0009).

const LONGER =
  'Trevor walked us through our budget with no pressure at all and sent the notes that evening. Five stars from us.';

async function openLegacy(page: Page, jb: Jb): Promise<BusinessPage> {
  const business = new BusinessPage(page);
  await business.setWidth(1280);
  await jb.signInAs('member');
  await jb.goto('/b/legacy-financial');
  return business;
}

test.describe('edit and remove your review (L2-233)', () => {
  test('AC1/AC3: Edit opens the review as it is; a change saves, shows Edited and says so', async ({
    page,
    jb,
  }) => {
    const fake = await stubReviews(page, 'legacy-financial', {
      items: [joannasReview(), ...legacyReviews()],
      writing: 'written',
    });
    const reviews = (await openLegacy(page, jb)).reviews;
    const edit = new EditReviewDialog(page);
    const toasts = new Toasts(page);

    const mine = reviews.myReview();
    await mine.edit.click();
    await expect(edit.title).toHaveText('Edit your review');
    await expect(edit.star(5)).toBeChecked();
    await expect(edit.text).toHaveValue(joannasReview().text);

    await edit.rate(4);
    await edit.text.fill(LONGER);
    await edit.save.click();

    await expect(edit.root).toBeHidden();
    await expect(toasts.withTitle('Review updated')).toBeVisible();
    await expect(mine.meta).toHaveText('Posted 10 Nov 2026 · Edited');
    await expect(mine.stars).toHaveAttribute('aria-label', '4 out of 5 stars');
    await expect(mine.text).toHaveText(LONGER);
    await expect(reviews.average).toHaveText('4.5');
    await expect(mine.edit).toBeFocused();
    expect(fake.writes).toEqual([
      expect.objectContaining({
        method: 'PUT',
        path: '/api/reviews/rv-joanna',
        body: { rating: 4, itemId: 'svc-discovery', text: LONGER },
      }),
    ]);
  });

  test('AC2: too little written says so and sends nothing', async ({ page, jb }) => {
    const fake = await stubReviews(page, 'legacy-financial', {
      items: [joannasReview(), ...legacyReviews()],
      writing: 'written',
    });
    const reviews = (await openLegacy(page, jb)).reviews;
    const edit = new EditReviewDialog(page);

    await reviews.myReview().edit.click();
    await edit.text.fill('Too short.');
    await edit.save.click();

    await expect(edit.textError).toHaveText('Write at least 40 characters. This has 10.');
    expect(fake.writes).toHaveLength(0);
  });

  test('AC4: a failed save keeps what was typed', async ({ page, jb }) => {
    await stubReviews(page, 'legacy-financial', {
      items: [joannasReview(), ...legacyReviews()],
      writing: 'written',
      writeMode: 'offline',
    });
    const reviews = (await openLegacy(page, jb)).reviews;
    const edit = new EditReviewDialog(page);

    await reviews.myReview().edit.click();
    await edit.text.fill(LONGER);
    await edit.save.click();

    await expect(edit.alert).toContainText('We couldn’t save that');
    await expect(edit.alert).toContainText('Your review has not changed. Try again.');
    await expect(edit.text).toHaveValue(LONGER);
  });

  test('AC5: Remove asks first, then takes the review away and offers Write a review again', async ({
    page,
    jb,
  }) => {
    const fake = await stubReviews(page, 'legacy-financial', {
      items: [joannasReview(), ...legacyReviews()],
      writing: 'written',
    });
    const reviews = (await openLegacy(page, jb)).reviews;
    const remove = new RemoveReviewDialog(page);
    const toasts = new Toasts(page);

    await reviews.myReview().remove.click();
    await expect(remove.title).toHaveText('Remove your review?');
    await expect(remove.description).toHaveText(
      'Your review of Legacy Financial will be taken off their page. You can write a new one later.',
    );
    await remove.remove.click();

    await expect(remove.root).toBeHidden();
    await expect(toasts.withTitle('Review removed')).toBeVisible();
    await expect(reviews.mine).toHaveCount(0);
    await expect(reviews.count).toHaveText('5 reviews');
    await expect(reviews.write).toBeVisible();
    await expect(reviews.heading).toBeFocused();
    expect(fake.writes).toEqual([
      expect.objectContaining({ method: 'DELETE', path: '/api/reviews/rv-joanna' }),
    ]);
  });
});

test.describe('the owner’s public reply (L2-234)', () => {
  test('AC1/AC2/AC3: Reply opens the dialog; an empty reply is refused; a reply shows under the review', async ({
    page,
    jb,
  }) => {
    const fake = await stubReviews(page, 'legacy-financial', { viewer: 'owner', writing: 'owner' });
    const reviews = (await openLegacy(page, jb)).reviews;
    const reply = new ReplyReviewDialog(page);
    const toasts = new Toasts(page);

    const marcus = reviews.byAuthor('Marcus T.');
    await marcus.replyButton.click();
    await expect(reply.title).toHaveText('Reply to Marcus T.');
    await expect(reply.description).toHaveText(
      'Your reply is public. Everyone who reads the review reads it too.',
    );
    await reply.post.click();
    await expect(reply.error).toHaveText('Write your reply.');
    expect(fake.writes).toHaveLength(0);

    await reply.text.fill('Thank you, Marcus. Glad the plan is working.');
    await reply.post.click();

    await expect(reply.root).toBeHidden();
    await expect(toasts.withTitle('Reply posted')).toBeVisible();
    await expect(marcus.replyText).toHaveText('Thank you, Marcus. Glad the plan is working.');
    await expect(marcus.editReply).toBeFocused();
    expect(fake.writes).toEqual([
      expect.objectContaining({
        method: 'PUT',
        path: '/api/reviews/rv-marcus/reply',
        body: { text: 'Thank you, Marcus. Glad the plan is working.' },
      }),
    ]);
  });

  test('AC4: Edit reply holds the reply and saves it as edited', async ({ page, jb }) => {
    await stubReviews(page, 'legacy-financial', { viewer: 'owner', writing: 'owner' });
    const reviews = (await openLegacy(page, jb)).reviews;
    const reply = new ReplyReviewDialog(page);
    const toasts = new Toasts(page);

    const grace = reviews.byAuthor('Grace A.');
    await grace.editReply.click();
    await expect(reply.title).toHaveText('Edit your reply');
    await expect(reply.text).toHaveValue(
      'Thank you, Grace. It was a joy to work with you both. See you at the six-month check-in.',
    );
    await reply.text.fill('Thank you, Grace. See you at the check-in.');
    await reply.post.click();

    await expect(toasts.withTitle('Reply updated')).toBeVisible();
    await expect(grace.replyHead).toContainText('Edited');
  });
});

test.describe('report a review (L2-236)', () => {
  test('AC1/AC2/AC3: a member reports a review with a reason, once', async ({ page, jb }) => {
    const fake = await stubReviews(page, 'legacy-financial');
    const reviews = (await openLegacy(page, jb)).reviews;
    const report = new ReportReviewDialog(page);

    await reviews.byAuthor('Priya S.').report.click();
    await expect(report.title).toHaveText('Report this review');
    await report.send.click();
    await expect(report.reasonError).toHaveText('Choose what’s wrong with it.');
    expect(fake.writes).toHaveLength(0);

    await report.reason('It’s advertising or off-topic').check();
    await report.note.fill('Mentions another firm.');
    await report.send.click();

    await expect(report.title).toHaveText('Thanks for telling us');
    await expect(report.description).toHaveText(
      'The Jubilee team will look at it within one business day. The author won’t know who reported it.',
    );
    await report.done.click();
    await expect(report.root).toBeHidden();
    expect(fake.writes).toEqual([
      expect.objectContaining({
        method: 'POST',
        path: '/api/reviews/rv-priya/reports',
        body: { reason: 'advertising', note: 'Mentions another firm.' },
      }),
    ]);
    expect(fake.writes[0].key).toBeTruthy();
  });

  test('AC6: too many reports in a day says when to try again', async ({ page, jb }) => {
    await stubReviews(page, 'legacy-financial', { writeMode: 'limited' });
    const reviews = (await openLegacy(page, jb)).reviews;
    const report = new ReportReviewDialog(page);

    await reviews.byAuthor('Priya S.').report.click();
    await report.reason('Something else').check();
    await report.send.click();

    await expect(report.alert).toContainText('You’re doing that a lot. Try again in 20 minutes.');
  });
});

test.describe('reviews offline (L2-240 AC5)', () => {
  test('Write a review, Edit, Remove and Report need a connection', async ({ page, jb }) => {
    await stubReviews(page, 'legacy-financial', {
      items: [joannasReview(), ...legacyReviews()],
      writing: 'written',
    });
    const reviews = (await openLegacy(page, jb)).reviews;
    await expect(reviews.myReview().edit).toBeEnabled();

    await goOffline(page);
    const needs = 'Needs a connection. It works again when you’re back online.';
    await expect(reviews.myReview().edit).toBeDisabled();
    await expect(reviews.myReview().edit).toHaveAttribute('title', needs);
    await expect(reviews.myReview().remove).toBeDisabled();
    await expect(reviews.review(0).report).toBeDisabled();
  });
});
