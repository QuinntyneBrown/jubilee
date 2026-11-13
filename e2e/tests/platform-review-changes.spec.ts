// Acceptance Test
// Traces to: L2-260, L2-262
// Description: once written, a review of a software platform is a review like any other: its
// author edits it without stating use again, the founder replies, a member reports it; offline,
// the writes wait for a connection and the link out stays a link. The reviews and their writes
// are answered by `stubReviews` (ADR 0009).

import { expect, test } from '../fixtures/jb-test';
import { goOffline } from '../fixtures/offline';
import { joannasPlatformReview, lanternreadReviews, stubReviews } from '../fixtures/reviews';
import { PlatformPage } from '../pages/platform.page';
import { EditReviewDialog, ReplyReviewDialog, ReportReviewDialog } from '../pages/review-dialogs';

const LONGER =
  'We started in October and my son has read every night since. The school side took us a while to set up.';

test.describe('a review of a platform, once written (L2-260)', () => {
  test('L2-260 AC4: the edit dialog has no item to choose and does not ask the statement again', async ({
    page,
    jb,
  }) => {
    // Given Joanna's own review of Lanternread
    const platform = new PlatformPage(page);
    const edit = new EditReviewDialog(page);
    const fake = await stubReviews(page, 'lanternread', {
      items: [joannasPlatformReview(), ...lanternreadReviews()],
      writing: 'written',
    });
    await jb.signInAs('member');
    await jb.goto('/b/lanternread');
    const mine = platform.reviewsSection.myReview();

    // When she opens it to edit
    await mine.edit.click();

    // Then the dialog holds the stars and the text, and nothing else to choose or to state
    await expect(edit.title).toHaveText('Edit your review');
    await expect(edit.star(4)).toBeChecked();
    await expect(edit.text).toHaveValue(joannasPlatformReview().text);
    await expect(edit.itemGroup).toHaveCount(0);
    await expect(edit.checkboxes).toHaveCount(0);

    // When she saves a change
    await edit.rate(3);
    await edit.text.fill(LONGER);
    await edit.save.click();

    // Then it is sent without a statement of use and the review shows the change
    await expect(edit.root).toBeHidden();
    await expect(mine.text).toHaveText(LONGER);
    await expect(mine.item).toHaveText('Their platform');
    expect(fake.writes).toHaveLength(1);
    expect(fake.writes[0]).toMatchObject({ method: 'PUT', path: '/api/reviews/rv-lr-joanna' });
    expect(fake.writes[0].body).toMatchObject({ rating: 3, text: LONGER });
    expect(fake.writes[0].body).not.toHaveProperty('usedIt');
  });

  test('L2-260 AC5: the founder replies to a review of their platform', async ({ page, jb }) => {
    // Given the founder on their platform's page
    const platform = new PlatformPage(page);
    const reply = new ReplyReviewDialog(page);
    const fake = await stubReviews(page, 'lanternread', {
      items: lanternreadReviews(),
      viewer: 'owner',
      writing: 'owner',
    });
    await jb.signInAs('member');
    await jb.goto('/b/lanternread');
    const grace = platform.reviewsSection.review(0);

    // When they reply to the first review
    await grace.replyButton.click();
    await reply.text.fill('Thank you, Grace. Tell the boys we said well done.');
    await reply.post.click();

    // Then the reply is sent and shown under the review
    await expect(reply.root).toBeHidden();
    await expect(grace.replyText).toHaveText('Thank you, Grace. Tell the boys we said well done.');
    expect(fake.writes[0]).toMatchObject({ method: 'PUT', path: '/api/reviews/rv-lr-grace/reply' });
  });

  test('L2-260 AC6: a member who believes the author did not use the platform reports the review', async ({
    page,
    jb,
  }) => {
    // Given a member reading Lanternread's reviews
    const platform = new PlatformPage(page);
    const report = new ReportReviewDialog(page);
    const fake = await stubReviews(page, 'lanternread', { items: lanternreadReviews() });
    await jb.signInAs('member');
    await jb.goto('/b/lanternread');

    // When they report the first review as not about a real dealing
    await platform.reviewsSection.review(0).report.click();
    await report.reason('It isn’t about a real dealing with them').check();
    await report.send.click();

    // Then the report is sent to the Jubilee team and the review stays shown
    await expect(report.done).toBeVisible();
    expect(fake.writes[0]).toMatchObject({
      method: 'POST',
      path: '/api/reviews/rv-lr-grace/reports',
    });
    expect(fake.writes[0].body).toMatchObject({ reason: 'not-a-real-dealing' });
    await expect(platform.reviewsSection.reviews).toHaveCount(3);
  });
});

test.describe('a platform page offline (L2-262)', () => {
  test('L2-262 AC5: offline, Write a review and Message founder wait for a connection and the link out stays a link', async ({
    page,
    jb,
  }) => {
    // Given a member on Lanternread's page
    const platform = new PlatformPage(page);
    await platform.setWidth(1280);
    await stubReviews(page, 'lanternread', { items: lanternreadReviews(), writing: 'eligible' });
    await jb.signInAs('member');
    await jb.goto('/b/lanternread');
    await expect(platform.reviewsSection.write).toBeVisible();

    // When the device goes offline
    await goOffline(page);

    // Then the writes say they need a connection
    const needs = 'Needs a connection. It works again when you’re back online.';
    await expect(platform.reviewsSection.write).toHaveAttribute('aria-disabled', 'true');
    await expect(platform.reviewsSection.write).toHaveAttribute('title', needs);
    await expect(platform.messageFounder).toHaveAttribute('aria-disabled', 'true');
    // and the link out is still a plain link to the founder's address
    await expect(platform.visit).toHaveAttribute('href', 'https://lanternread.example');
    await expect(platform.visit).not.toHaveAttribute('aria-disabled', 'true');
  });
});
