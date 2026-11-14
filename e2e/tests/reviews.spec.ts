import { expect, test } from '../fixtures/jb-test';
import { joannasReview, legacyReviews, stubReviewForm, stubReviews } from '../fixtures/reviews';
import { BrowsePage } from '../pages/browse.page';
import { BusinessCard } from '../pages/business-card';
import { BusinessPage } from '../pages/business.page';
import { SignInRequiredDialog } from '../pages/sign-in-required.dialog';

// Acceptance Test
// Traces to: L2-226, L2-229, L2-230
// Description: the rating under a listing's name and its "Reviews" section: who may write, the
// summary, the list, the owner's reply, the member's own review, filter and sort, loading and
// failure. The reviews are answered by `stubReviews` with the seeded ones (ADR 0009).

test.describe('reviews on a listing page (L2-229)', () => {
  test('AC1/AC2: under the name the rating leads to the section, which sums the reviews up', async ({
    page,
    jb,
  }) => {
    const business = new BusinessPage(page);
    const reviews = business.reviews;
    await business.setWidth(1280);
    await stubReviews(page, 'legacy-financial');
    await jb.signInAs('member');
    await jb.goto('/b/legacy-financial');

    await expect(reviews.ratingLink).toHaveText(/Rated\s*4\.6\s*out of 5,\s*5 reviews/);
    await expect(reviews.ratingLink).toHaveAttribute('href', /#reviews$/);
    await expect(reviews.heading).toBeVisible();
    await expect(reviews.average).toHaveText('4.6');
    await expect(reviews.summaryStars).toHaveAttribute('aria-label', 'Rated 4.6 out of 5');
    await expect(reviews.count).toHaveText('5 reviews');
    await expect(reviews.bars).toHaveCount(5);
    await expect(reviews.bar(5)).toHaveAccessibleName('5 stars, 3 reviews');
    await expect(reviews.bar(4)).toHaveAccessibleName('4 stars, 2 reviews');
    await expect(reviews.bar(1)).toHaveAccessibleName('1 stars, 0 reviews');
    await expect(reviews.note).toHaveCount(0);

    await reviews.ratingLink.click();
    await expect(page).toHaveURL(/#reviews$/);
  });

  test('AC3/AC4/AC5: three reviews show, most relevant first, each with its reply; Show all adds the rest', async ({
    page,
    jb,
  }) => {
    const business = new BusinessPage(page);
    const reviews = business.reviews;
    await business.setWidth(1280);
    await stubReviews(page, 'legacy-financial');
    await jb.signInAs('member');
    await jb.goto('/b/legacy-financial');

    await expect(reviews.reviews.locator('.review__author')).toHaveText([
      'Grace A.',
      'Marcus T.',
      'Priya S.',
    ]);
    const grace = reviews.review(0);
    await expect(grace.avatar).toHaveText('GA');
    await expect(grace.meta).toHaveText('3 Nov 2026');
    await expect(grace.stars).toHaveAttribute('aria-label', '5 out of 5 stars');
    await expect(grace.item).toHaveText('Estate & legacy plan');
    await expect(grace.verified).toHaveCount(0);
    await expect(grace.text).toContainText('Trevor helped my husband and me write wills');
    await expect(grace.replyHead).toHaveText(/Response from Trevor Chew\s*· 4 Nov 2026/);
    await expect(grace.replyText).toHaveText(
      'Thank you, Grace. It was a joy to work with you both. See you at the six-month check-in.',
    );

    await reviews.showAll.click();
    await expect(reviews.reviews).toHaveCount(5);
    await expect(reviews.showAll).toBeHidden();
    await expect(reviews.review(3).root).toBeFocused();
  });

  test('AC3: a review is shown as text, with its line breaks, never as markup (L2-136)', async ({
    page,
    jb,
  }) => {
    const business = new BusinessPage(page);
    const [first, ...rest] = legacyReviews();
    await stubReviews(page, 'legacy-financial', {
      items: [
        { ...first, text: '<b>Bold</b> claim\nSecond line', editedAt: first.createdAt },
        ...rest,
      ],
    });
    await jb.signInAs('member');
    await jb.goto('/b/legacy-financial');
    await business.reviews.sort.selectOption({ label: 'Newest' });

    const grace = business.reviews.byAuthor('Grace A.');
    await expect(grace.text).toHaveText('<b>Bold</b> claim\nSecond line', { useInnerText: true });
    await expect(grace.root.locator('.review__text b')).toHaveCount(0);
    await expect(grace.meta).toHaveText('3 Nov 2026 · Edited');
  });

  test('AC6: a listing with no reviews invites the first', async ({ page, jb }) => {
    const business = new BusinessPage(page);
    const reviews = business.reviews;
    await stubReviews(page, 'legacy-financial', { items: [] });
    await jb.signInAs('member');
    await jb.goto('/b/legacy-financial');

    await expect(reviews.ratingLink).toHaveText('No reviews yet');
    await expect(reviews.empty).toContainText('No reviews yet');
    await expect(reviews.empty).toContainText(
      'Worked with Legacy Financial? Your review helps the next family decide.',
    );
    await expect(reviews.write).toHaveAttribute('href', '/b/legacy-financial/review');
    await expect(reviews.sort).toHaveCount(0);
    await expect(reviews.bars).toHaveCount(0);
  });

  test('AC7: the member’s own review is first, apart, with Edit and Remove', async ({
    page,
    jb,
  }) => {
    const business = new BusinessPage(page);
    const reviews = business.reviews;
    await business.setWidth(1280);
    await stubReviews(page, 'legacy-financial', {
      items: [joannasReview(), ...legacyReviews()],
      writing: 'written',
    });
    await jb.signInAs('member');
    await jb.goto('/b/legacy-financial');

    const mine = reviews.myReview();
    await expect(mine.author).toHaveText(/Joanna A\.\s*Your review/);
    await expect(mine.meta).toHaveText('Posted 10 Nov 2026');
    await expect(mine.edit).toBeVisible();
    await expect(mine.remove).toBeVisible();
    await expect(mine.report).toHaveCount(0);
    await expect(reviews.write).toHaveCount(0);
    await expect(reviews.reviews.locator('.review__author')).not.toContainText(['Joanna A.']);
    await expect(reviews.count).toHaveText('6 reviews');
  });

  test('AC8: the owner replies to each review; a member reports any but their own; a visitor does neither', async ({
    page,
    jb,
  }) => {
    const business = new BusinessPage(page);
    const reviews = business.reviews;
    await business.setWidth(1280);
    await stubReviews(page, 'legacy-financial', { viewer: 'owner', writing: 'owner' });
    await jb.signInAs('member');
    await jb.goto('/b/legacy-financial');

    await expect(reviews.write).toHaveCount(0);
    await expect(reviews.review(0).editReply).toHaveAccessibleName('Edit reply to Grace A.');
    await expect(reviews.review(1).replyButton).toHaveAccessibleName('Reply to Marcus T.');
    await expect(reviews.review(1).report).toHaveAccessibleName('Report Marcus T.’s review');
  });

  test('AC8: a member sees Report on each review', async ({ page, jb }) => {
    const business = new BusinessPage(page);
    const reviews = business.reviews;
    await stubReviews(page, 'legacy-financial');
    await jb.signInAs('member');
    await jb.goto('/b/legacy-financial');

    await expect(reviews.review(0).report).toHaveAccessibleName('Report Grace A.’s review');
    await expect(reviews.review(0).replyButton).toHaveCount(0);
  });

  test('AC8: a visitor sees neither Reply nor Report', async ({ page, jb }) => {
    const business = new BusinessPage(page);
    const reviews = business.reviews;
    await stubReviews(page, 'legacy-financial', { viewer: 'visitor', writing: 'sign-in' });
    await jb.goto('/b/legacy-financial');

    await expect(reviews.reviews).toHaveCount(3);
    await expect(reviews.root.locator('.review__actions button')).toHaveCount(0);
  });

  test('AC9: while loading a skeleton shows; a failure says so and Try again loads them', async ({
    page,
    jb,
  }) => {
    const business = new BusinessPage(page);
    const reviews = business.reviews;
    const fake = await stubReviews(page, 'legacy-financial', { mode: 'loading' });
    await jb.signInAs('member');
    await jb.goto('/b/legacy-financial');

    await expect(reviews.root).toHaveAttribute('aria-busy', 'true');
    await expect(reviews.loadingStatus).toHaveText('Loading the reviews…');
    await expect(business.heading).toHaveText('Legacy Financial');

    fake.mode = 'ok';
    fake.failures = 1;
    await page.reload();
    await expect(reviews.error).toContainText('We couldn’t load the reviews.');
    await expect(reviews.errorReference).toHaveText('JB-REV-503');
    await expect(business.serviceRows).toHaveCount(4);

    await reviews.tryAgain.click();
    await expect(reviews.reviews).toHaveCount(3);
  });
});

test.describe('who may write a review (L2-226)', () => {
  test('AC1: an eligible member is offered Write a review, which leads to /b/{slug}/review', async ({
    page,
    jb,
  }) => {
    const reviews = new BusinessPage(page).reviews;
    await stubReviews(page, 'legacy-financial', { writing: 'eligible' });
    await jb.signInAs('member');
    await jb.goto('/b/legacy-financial');

    await expect(reviews.write).toHaveAttribute('href', '/b/legacy-financial/review');
    await expect(reviews.notice).toHaveCount(0);

    await stubReviewForm(page, 'legacy-financial');
    await reviews.write.click();
    await expect(page).toHaveURL(/\/b\/legacy-financial\/review$/);
  });

  test('AC2: a member without a confirmed request is told when they can review', async ({
    page,
    jb,
  }) => {
    const reviews = new BusinessPage(page).reviews;
    await stubReviews(page, 'legacy-financial', { writing: 'not-eligible' });
    await jb.signInAs('member');
    await jb.goto('/b/legacy-financial');

    await expect(reviews.write).toHaveCount(0);
    await expect(reviews.notice).toHaveText(
      'You can review Legacy Financial after they confirm a request of yours.',
    );
  });

  test('AC3: a visitor pressing Write a review is asked to join, and comes back to the form', async ({
    page,
    jb,
  }) => {
    const reviews = new BusinessPage(page).reviews;
    const prompt = new SignInRequiredDialog(page);
    await stubReviews(page, 'legacy-financial', { viewer: 'visitor', writing: 'sign-in' });
    await jb.goto('/b/legacy-financial');

    await reviews.write.click();
    await expect(prompt.title).toHaveText('Join to review Legacy Financial');
    await expect(prompt.signIn).toHaveAttribute(
      'href',
      /returnUrl=%2Fb%2Flegacy-financial%2Freview/,
    );
    await expect(page).toHaveURL(/\/b\/legacy-financial$/);
  });

  test('AC4: the owner is not offered Write a review', async ({ page, jb }) => {
    const reviews = new BusinessPage(page).reviews;
    await stubReviews(page, 'legacy-financial', { viewer: 'owner', writing: 'owner' });
    await jb.signInAs('member');
    await jb.goto('/b/legacy-financial');

    await expect(reviews.heading).toBeVisible();
    await expect(reviews.write).toHaveCount(0);
  });

  test('AC6: no review carries a Verified mark (ADR 0057)', async ({ page, jb }) => {
    const reviews = new BusinessPage(page).reviews;
    await stubReviews(page, 'legacy-financial');
    await jb.signInAs('member');
    await jb.goto('/b/legacy-financial');

    await expect(reviews.review(0).text).toBeVisible();
    await expect(reviews.review(0).verified).toHaveCount(0);
    await expect(reviews.note).toHaveCount(0);
    await expect(reviews.root).not.toContainText('Verified');
  });
});

test.describe('filter and sort reviews (L2-230)', () => {
  test('AC1/AC2/AC6: a bar filters to its stars, says so, and Clear shows every review', async ({
    page,
    jb,
  }) => {
    const reviews = new BusinessPage(page).reviews;
    await stubReviews(page, 'legacy-financial');
    await jb.signInAs('member');
    await jb.goto('/b/legacy-financial');

    await expect(reviews.filterText).toHaveText('Tap a star bar to filter');
    await reviews.bar(4).click();
    await expect(reviews.bar(4)).toHaveAttribute('aria-pressed', 'true');
    await expect(reviews.reviews.locator('.review__author')).toHaveText(['Priya S.', 'Esther L.']);
    await expect(reviews.filterText).toContainText('Showing 2 reviews with 4 stars');
    await expect(reviews.status).toHaveText('Showing 2 reviews');

    await reviews.clear.click();
    await expect(reviews.bar(4)).toHaveAttribute('aria-pressed', 'false');
    await expect(reviews.reviews).toHaveCount(3);
    await expect(reviews.filterText).toHaveText('Tap a star bar to filter');

    await reviews.bar(5).press('Enter');
    await expect(reviews.bar(5)).toHaveAttribute('aria-pressed', 'true');
    await expect(reviews.reviews).toHaveCount(3);
    await reviews.bar(5).press('Space');
    await expect(reviews.bar(5)).toHaveAttribute('aria-pressed', 'false');
  });

  test('AC3: a filter with no reviews says so', async ({ page, jb }) => {
    const reviews = new BusinessPage(page).reviews;
    await stubReviews(page, 'legacy-financial');
    await jb.signInAs('member');
    await jb.goto('/b/legacy-financial');

    await reviews.bar(3).click();
    await expect(reviews.none).toHaveText('No 3-star reviews written up yet.');
  });

  test('AC4/AC5: the sort orders the reviews', async ({ page, jb }) => {
    const reviews = new BusinessPage(page).reviews;
    const authors = reviews.reviews.locator('.review__author');
    await stubReviews(page, 'legacy-financial');
    await jb.signInAs('member');
    await jb.goto('/b/legacy-financial');

    await expect(reviews.sort.locator('option')).toHaveText([
      'Most relevant',
      'Newest',
      'Highest rated',
      'Lowest rated',
    ]);
    await reviews.sort.selectOption({ label: 'Newest' });
    await expect(authors).toHaveText(['Grace A.', 'Marcus T.', 'Esther L.']);
    await reviews.sort.selectOption({ label: 'Lowest rated' });
    await expect(authors).toHaveText(['Esther L.', 'Priya S.', 'Grace A.']);
    await reviews.sort.selectOption({ label: 'Highest rated' });
    await expect(authors).toHaveText(['Grace A.', 'Marcus T.', 'Paul K.']);
  });
});

test.describe('ratings on cards (L2-231)', () => {
  test('AC1/AC3/AC4: a card shows the rating from three reviews, and none below', async ({
    page,
    jb,
  }) => {
    const browse = new BrowsePage(page);
    await browse.setWidth(1280);
    await jb.goto('/');

    const legacy = new BusinessCard(browse.featuredCards.filter({ hasText: 'Legacy Financial' }));
    await expect(legacy.rating).toHaveText(/4\.6\s*\(5\)/);
    await expect(legacy.rating.locator('.visually-hidden')).toHaveText(
      'Rated 4.6 out of 5 from 5 reviews',
    );
    const unrated = new BusinessCard(
      browse.featuredCards.filter({ hasNotText: /Legacy Financial|Luzandre/ }).first(),
    );
    await expect(unrated.name).toBeVisible();
    await expect(unrated.rating).toHaveCount(0);
  });
});
