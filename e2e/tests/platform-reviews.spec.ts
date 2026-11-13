// Acceptance Test
// Traces to: L2-258, L2-260
// Description: the "Reviews" section of a software platform's page: it says whose word the
// reviews rest on, offers "Write a review" to a member who is not the founder, and shows each
// review as about "Their platform". The reviews are answered by `stubReviews` (ADR 0009).

import { expect, test } from '../fixtures/jb-test';
import { joannasPlatformReview, lanternreadReviews, stubReviews } from '../fixtures/reviews';
import { PlatformPage } from '../pages/platform.page';
import { SignInRequiredDialog } from '../pages/sign-in-required.dialog';

const LINE =
  'Reviews here are from members who say they have used Lanternread. That is their own word. Jubilee does not check it.';

test.describe('reviews of a software platform (L2-258, L2-260)', () => {
  test('L2-258 AC1, AC6, L2-260 AC1: a member reads whose word the reviews are and may write one', async ({
    page,
    jb,
  }) => {
    // Given Lanternread with four reviews, and a member who has not reviewed it
    const platform = new PlatformPage(page);
    const reviews = platform.reviewsSection;
    await platform.setWidth(1280);
    await stubReviews(page, 'lanternread', { items: lanternreadReviews(), writing: 'eligible' });
    await jb.signInAs('member');

    // When the page renders
    await jb.goto('/b/lanternread');

    // Then the section says whose word the reviews rest on
    await expect(reviews.heading).toBeVisible();
    await expect(reviews.notice).toHaveText(LINE);
    // and sums them up
    await expect(reviews.average).toHaveText('4.3');
    await expect(reviews.count).toHaveText('4 reviews');
    await expect(reviews.ratingLink).toHaveText(/Rated\s*4\.3\s*out of 5,\s*4 reviews/);
    // and each review is about the platform, the founder's reply under her name
    await expect(reviews.reviews).toHaveCount(3);
    await expect(reviews.review(0).item).toHaveText('Their platform');
    await expect(reviews.root.locator('.review__reply-head')).toContainText(
      'Response from Abigail Thornton',
    );
    // and "Write a review" leads to the screen that asks the statement of use
    await expect(reviews.write).toHaveAttribute('href', '/b/lanternread/review');
    // and nothing calls a review or the platform verified, approved or vetted
    await expect(reviews.root).not.toContainText(/verified|approved|vetted/i);
    await expect(reviews.review(0).verified).toHaveCount(0);
  });

  test('L2-260 AC2: with no reviews the section invites the first and still says whose word it is', async ({
    page,
    jb,
  }) => {
    const platform = new PlatformPage(page);
    const reviews = platform.reviewsSection;
    await stubReviews(page, 'lanternread', { items: [], writing: 'eligible' });
    await jb.signInAs('member');

    await jb.goto('/b/lanternread');

    await expect(reviews.empty).toContainText('No reviews yet');
    await expect(reviews.emptyTexts).toHaveText([
      'Used Lanternread? Your review helps the next family decide.',
      LINE,
    ]);
    await expect(reviews.write).toHaveAttribute('href', '/b/lanternread/review');
    await expect(reviews.ratingLink).toHaveText('No reviews yet');
  });

  test('L2-258 AC4: a visitor who presses Write a review is asked to sign in or join', async ({
    page,
    jb,
  }) => {
    const platform = new PlatformPage(page);
    const reviews = platform.reviewsSection;
    const prompt = new SignInRequiredDialog(page);
    await stubReviews(page, 'lanternread', {
      items: lanternreadReviews(),
      viewer: 'visitor',
      writing: 'sign-in',
    });

    await jb.goto('/b/lanternread');
    await expect(reviews.notice).toHaveText(LINE);
    await reviews.write.click();

    await expect(prompt.joinFree).toHaveAttribute(
      'href',
      `/join?returnUrl=${encodeURIComponent('/b/lanternread/review')}`,
    );
  });

  test('L2-258 AC4: the founder is not offered Write a review on their own platform', async ({
    page,
    jb,
  }) => {
    const platform = new PlatformPage(page);
    const reviews = platform.reviewsSection;
    await stubReviews(page, 'lanternread', {
      items: lanternreadReviews(),
      viewer: 'owner',
      writing: 'owner',
    });
    await jb.signInAs('member');

    await jb.goto('/b/lanternread');

    await expect(reviews.notice).toHaveText(LINE);
    await expect(reviews.write).toHaveCount(0);
    await expect(reviews.review(2).replyButton.or(reviews.review(2).editReply)).toBeVisible();
  });

  test('L2-258 AC5: a member who has reviewed the platform sees "Your review" in place of Write a review', async ({
    page,
    jb,
  }) => {
    const platform = new PlatformPage(page);
    const reviews = platform.reviewsSection;
    await stubReviews(page, 'lanternread', {
      items: [joannasPlatformReview(), ...lanternreadReviews()],
      writing: 'written',
    });
    await jb.signInAs('member');

    await jb.goto('/b/lanternread');

    const mine = reviews.myReview();
    await expect(mine.author).toHaveText(/Joanna A\.\s*Your review/);
    await expect(mine.item).toHaveText('Their platform');
    await expect(mine.edit).toBeVisible();
    await expect(mine.remove).toBeVisible();
    await expect(reviews.write).toHaveCount(0);
    await expect(reviews.notice).toHaveText(LINE);
  });
});
