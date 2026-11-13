import { expect, test } from '../fixtures/jb-test';
import { stubReviewForm, suiteForm } from '../fixtures/reviews';
import { WriteReviewPage } from '../pages/write-review.page';

// Acceptance Test
// Traces to: L2-226, L2-227, L2-228
// Description: the Write a review screen at /b/{slug}/review: what it shows, who reaches it, how
// the review is checked, posted once and confirmed, and what a failure keeps. The form and the
// post are answered by `stubReviewForm` (ADR 0009).

const GOOD =
  'Trevor took the time to understand what we needed before suggesting anything. Clear, honest and no pressure. We’d go back.';

test.describe('the Write a review screen (L2-227)', () => {
  test('AC1/AC2/AC3/AC4/AC5: it names the listing, then the stars, the service, the text and the notes', async ({
    page,
    jb,
  }) => {
    const write = new WriteReviewPage(page);
    await write.setWidth(1280);
    await stubReviewForm(page, 'legacy-financial');
    await jb.signInAs('member');
    await jb.goto('/b/legacy-financial/review');

    await expect.poll(() => write.dataPage()).toBe('write-review');
    await expect(page).toHaveTitle('Write a review · Jubilee');
    await expect(write.backLink).toHaveText('Back to Legacy Financial');
    await expect(write.backLink).toHaveAttribute('href', '/b/legacy-financial');
    await expect(write.subjectName).toHaveText('Legacy Financial');
    await expect(write.subjectMeta).toHaveText('Financial & insurance');
    await expect(write.heading).toHaveText('How was it?');

    await expect(write.stars.getByRole('radio')).toHaveCount(5);
    await expect(write.star(1)).toHaveAccessibleName('1 of 5: Poor');
    await expect(write.star(5)).toHaveAccessibleName('5 of 5: Excellent');
    await expect(write.starWord).toHaveText('Tap to rate');
    await write.rate(4);
    await expect(write.starWord).toHaveText('Good');

    await expect(write.itemGroup).toBeVisible();
    await expect(write.items).toHaveCount(4);
    await expect(write.item('Discovery meeting')).toBeChecked();

    await expect(write.prompt).toHaveText(
      'What did they do, and how did it go? Was the price what they quoted? Would you hire them again?',
    );
    await expect(write.text).toHaveAttribute(
      'placeholder',
      'Say what happened, as you would tell a friend.',
    );
    await expect(write.text).toHaveAttribute('maxlength', '2000');
    await expect(write.counter).toHaveText('At least 40 characters · 0');
    await write.text.fill(GOOD);
    await expect(write.counter).toHaveText(`Looks good · ${GOOD.length}`);

    await expect(write.notes).toHaveText([
      'Your review posts under your first name and last initial: Joanna A.',
      'Keep to what happened to you: no private details of anyone and no advertising.',
    ]);
    await expect(write.post).toHaveText('Post review');
  });

  test('AC3: ?item= chooses that service', async ({ page, jb }) => {
    const write = new WriteReviewPage(page);
    await stubReviewForm(page, 'legacy-financial');
    await jb.signInAs('member');
    await jb.goto('/b/legacy-financial/review?item=svc-estate');

    await expect(write.item('Estate & legacy plan')).toBeChecked();
  });

  test('AC1/AC3/AC4: a space is about the stay, with its host and its own prompt', async ({
    page,
    jb,
  }) => {
    const write = new WriteReviewPage(page);
    await stubReviewForm(page, 'roncesvalles-guest-suite', { form: suiteForm() });
    await jb.signInAs('member');
    await jb.goto('/b/roncesvalles-guest-suite/review');

    await expect(write.backLink).toHaveText('Back to listing');
    await expect(write.subjectMeta).toHaveText('Hosted by Paul & Marta Kowalski');
    await expect(write.itemGroup).toHaveCount(0);
    await expect(write.prompt).toHaveText(
      'Was it as described? How was the host? Would you stay again?',
    );
  });

  test('AC7: at 360 px Post review spans the width', async ({ page, jb }) => {
    const write = new WriteReviewPage(page);
    await write.setWidth(360);
    await stubReviewForm(page, 'legacy-financial');
    await jb.signInAs('member');
    await jb.goto('/b/legacy-financial/review');

    const button = await write.post.boundingBox();
    const form = await write.main.locator('form').boundingBox();
    expect(Math.round(button!.width)).toBe(Math.round(form!.width));
  });
});

test.describe('who reaches the Write a review screen (L2-226)', () => {
  test('AC2: a member who may not write is told when they can', async ({ page, jb }) => {
    const write = new WriteReviewPage(page);
    await stubReviewForm(page, 'legacy-financial', {
      refusal: { status: 403, code: 'NOT_ELIGIBLE' },
    });
    await jb.signInAs('member');
    await jb.goto('/b/legacy-financial/review');

    await expect(write.notEligible).toContainText(
      'You can review Legacy Financial after they confirm a request of yours.',
    );
    await expect(write.main.locator('form')).toHaveCount(0);
    await expect(
      write.notEligible.getByRole('link', { name: 'Back to Legacy Financial' }),
    ).toHaveAttribute('href', '/b/legacy-financial');
  });

  test('AC5: a member who already wrote one is sent to the listing', async ({ page, jb }) => {
    await stubReviewForm(page, 'legacy-financial', {
      refusal: { status: 409, code: 'ALREADY_REVIEWED' },
    });
    await jb.signInAs('member');
    await jb.goto('/b/legacy-financial/review');

    await expect(page).toHaveURL(/\/b\/legacy-financial$/);
  });

  test('AC3: a visitor is sent to sign in and back', async ({ page, jb }) => {
    await jb.goto('/b/legacy-financial/review');

    await expect(page).toHaveURL(/\/sign-in\?returnUrl=%2Fb%2Flegacy-financial%2Freview/);
  });
});

test.describe('posting a review (L2-228)', () => {
  test('AC1/AC2: nothing chosen and too little written: both say so, focus goes to the stars, nothing is sent', async ({
    page,
    jb,
  }) => {
    const write = new WriteReviewPage(page);
    const fake = await stubReviewForm(page, 'legacy-financial');
    await jb.signInAs('member');
    await jb.goto('/b/legacy-financial/review');

    await write.text.fill('Really helpful.');
    await write.post.click();

    await expect(write.ratingError).toHaveText('Choose a star rating to post your review.');
    await expect(write.textError).toHaveText('Write at least 40 characters. This has 15.');
    await expect(write.text).toHaveAttribute('aria-invalid', 'true');
    await expect(write.star(1)).toBeFocused();
    expect(fake.posts).toHaveLength(0);
  });

  test('AC3/AC4: a valid review is posted once with a key, and the screen confirms it', async ({
    page,
    jb,
  }) => {
    const write = new WriteReviewPage(page);
    const fake = await stubReviewForm(page, 'legacy-financial');
    await jb.signInAs('member');
    await jb.goto('/b/legacy-financial/review');

    await write.rate(5);
    await write.text.fill(`  ${GOOD}  `);
    await write.post.click();

    await expect(write.postedTitle).toHaveText('Thanks, your review is live.');
    await expect(write.postedTitle).toBeFocused();
    await expect(write.postedText).toHaveText(
      'Legacy Financial will be notified and can reply publicly. You can edit or remove your review from their page.',
    );
    await expect(write.postedStars).toHaveAttribute('aria-label', '5 out of 5 stars');
    await expect(write.postedWord).toHaveText('Excellent');
    await expect(write.postedItem).toHaveText('Discovery meeting · Legacy Financial');
    await expect(write.postedBody).toHaveText(GOOD);
    await expect(write.seeIt).toHaveText('See it on their page');
    await expect(write.seeIt).toHaveAttribute('href', '/b/legacy-financial');
    await expect(write.backToBrowse).toHaveAttribute('href', '/');

    expect(fake.posts).toHaveLength(1);
    expect(fake.posts[0].body).toEqual({ rating: 5, itemId: 'svc-discovery', text: `  ${GOOD}  ` });
    expect(fake.posts[0].key).toBeTruthy();
  });

  test('AC3: while posting the button is busy and a second press sends nothing', async ({
    page,
    jb,
  }) => {
    const write = new WriteReviewPage(page);
    const fake = await stubReviewForm(page, 'legacy-financial', { postMode: 'hang' });
    await jb.signInAs('member');
    await jb.goto('/b/legacy-financial/review');

    await write.rate(5);
    await write.text.fill(GOOD);
    await write.post.click();

    await expect(write.post).toHaveText('Posting…');
    await expect(write.post).toHaveAttribute('aria-busy', 'true');
    await expect(write.text).not.toBeEditable();
    await write.post.click({ force: true });
    expect(fake.posts).toHaveLength(1);
  });

  test('AC6: a failure keeps the review, and Post review sends it again with the same key', async ({
    page,
    jb,
  }) => {
    const write = new WriteReviewPage(page);
    const fake = await stubReviewForm(page, 'legacy-financial', { postMode: 'offline' });
    await jb.signInAs('member');
    await jb.goto('/b/legacy-financial/review');

    await write.rate(5);
    await write.choose('Estate & legacy plan');
    await write.text.fill(GOOD);
    await write.post.click();

    await expect(write.alert).toContainText('We couldn’t post your review');
    await expect(write.alert).toContainText('Your review is still here. Try again.');
    await expect(write.text).toHaveValue(GOOD);
    await expect(write.star(5)).toBeChecked();
    await expect(write.item('Estate & legacy plan')).toBeChecked();

    fake.postMode = 'ok';
    await write.post.click();
    await expect(write.postedTitle).toBeVisible();
    expect(fake.posts).toHaveLength(2);
    expect(fake.posts[1].key).toBe(fake.posts[0].key);
  });

  test('AC6: too many reviews in a day says when to try again', async ({ page, jb }) => {
    const write = new WriteReviewPage(page);
    await stubReviewForm(page, 'legacy-financial', { postMode: 'limited' });
    await jb.signInAs('member');
    await jb.goto('/b/legacy-financial/review');

    await write.rate(4);
    await write.text.fill(GOOD);
    await write.post.click();

    await expect(write.alert).toContainText('You’re doing that a lot. Try again in 20 minutes.');
  });

  test('AC6: an unknown service is named under the choice', async ({ page, jb }) => {
    const write = new WriteReviewPage(page);
    await stubReviewForm(page, 'legacy-financial', { postMode: 'invalid' });
    await jb.signInAs('member');
    await jb.goto('/b/legacy-financial/review');

    await write.rate(4);
    await write.text.fill(GOOD);
    await write.post.click();

    await expect(write.itemGroup).toContainText('Choose one of their services.');
  });
});
