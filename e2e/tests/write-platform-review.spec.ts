// Acceptance Test
// Traces to: L2-258, L2-259
// Description: the Write a review screen of a software platform: it asks the member's own
// statement that they have used the platform, says Jubilee does not check it, refuses to post
// without it and sends it with the review.

import { expect, test } from '../fixtures/jb-test';
import { lanternreadForm, stubReviewForm } from '../fixtures/reviews';
import { WriteReviewPage } from '../pages/write-review.page';

// The form and the post are answered by `stubReviewForm` (ADR 0009).

const GOOD =
  'We log every book the children finish. The weekly goal keeps all of us reading, and it has stayed free.';
const REVIEW = '/b/lanternread/review';

test.describe('write a review of a software platform (L2-258, L2-259)', () => {
  test('L2-259 AC1, L2-258 AC2: the screen names the platform and asks the statement of use, unticked', async ({
    page,
    jb,
  }) => {
    // Given a member on the Write a review screen of Lanternread
    const write = new WriteReviewPage(page);
    await write.setWidth(1280);
    await stubReviewForm(page, 'lanternread', { form: lanternreadForm() });
    await jb.signInAs('member');

    // When it renders
    await jb.goto(REVIEW);

    // Then it names the platform and its category
    await expect(write.backLink).toHaveText('Back to Lanternread');
    await expect(write.backLink).toHaveAttribute('href', '/b/lanternread');
    await expect(write.subjectName).toHaveText('Lanternread');
    await expect(write.subjectMeta).toHaveText('Software platforms');
    await expect(write.heading).toHaveText('How was it?');
    // and there is nothing to choose between
    await expect(write.itemGroup).toHaveCount(0);
    // and the prompt asks about using it
    await expect(write.prompt).toHaveText(
      'What did you use it for, and how did it go? Was the price what the site said? Would you use it again?',
    );
    // and the statement of use is asked, unticked, in the member's own word
    await expect(write.usedIt).not.toBeChecked();
    await expect(write.usedItLabel).toContainText('I have used Lanternread myself.');
    await expect(write.usedItHint).toHaveText('This is your own word. Jubilee does not check it.');
    await expect(write.notes).toHaveText([
      'Your review posts under your first name and last initial: Joanna A.',
      'Keep to what happened to you: no private details of anyone and no advertising.',
    ]);
    await expect(write.post).toHaveText('Post review');
    // and no line says anyone checked the member's use
    await expect(write.main).not.toContainText(/verified|approved|vetted/i);
  });

  test('L2-259 AC2: without the statement nothing is sent and the box says what to do', async ({
    page,
    jb,
  }) => {
    // Given a rating and a text, and the statement unticked
    const write = new WriteReviewPage(page);
    const fake = await stubReviewForm(page, 'lanternread', { form: lanternreadForm() });
    await jb.signInAs('member');
    await jb.goto(REVIEW);
    await write.rate(5);
    await write.text.fill(GOOD);

    // When the member posts
    await write.post.click();

    // Then the statement is asked for and nothing is sent
    await expect(write.usedItError).toHaveText('Tick the box to say you have used Lanternread.');
    await expect(write.usedIt).toHaveAttribute('aria-invalid', 'true');
    await expect(write.usedIt).toBeFocused();
    expect(fake.posts).toHaveLength(0);

    // When they tick it
    await write.usedIt.check();

    // Then the message goes
    await expect(write.usedItError).toHaveCount(0);
  });

  test('L2-259 AC2: with the stars and the text missing too, every message shows and the stars take focus', async ({
    page,
    jb,
  }) => {
    const write = new WriteReviewPage(page);
    const fake = await stubReviewForm(page, 'lanternread', { form: lanternreadForm() });
    await jb.signInAs('member');
    await jb.goto(REVIEW);
    await write.text.fill('Good app.');

    await write.post.click();

    await expect(write.ratingError).toHaveText('Choose a star rating to post your review.');
    await expect(write.textError).toHaveText('Write at least 40 characters. This has 9.');
    await expect(write.usedItError).toHaveText('Tick the box to say you have used Lanternread.');
    await expect(write.star(1)).toBeFocused();
    expect(fake.posts).toHaveLength(0);
  });

  test('L2-259 AC3, AC4: with the statement the review is sent with usedIt and confirmed in place', async ({
    page,
    jb,
  }) => {
    // Given a valid review with the statement ticked
    const write = new WriteReviewPage(page);
    const fake = await stubReviewForm(page, 'lanternread', { form: lanternreadForm() });
    await jb.signInAs('member');
    await jb.goto(REVIEW);
    await write.rate(4);
    await write.text.fill(GOOD);
    await write.usedIt.check();

    // When the member posts
    await write.post.click();

    // Then it is sent once, with the statement, and the screen confirms it
    await expect(write.postedTitle).toHaveText('Thanks, your review is live.');
    await expect(write.postedItem).toHaveText('Their platform · Lanternread');
    await expect(write.seeIt).toHaveText('See it on their page');
    await expect(write.seeIt).toHaveAttribute('href', '/b/lanternread');
    expect(fake.posts).toHaveLength(1);
    expect(fake.posts[0].body).toMatchObject({ rating: 4, text: GOOD, usedIt: true });
  });

  test('L2-259 AC5: the API’s refusal of the statement shows the same message', async ({
    page,
    jb,
  }) => {
    const write = new WriteReviewPage(page);
    await stubReviewForm(page, 'lanternread', {
      form: lanternreadForm(),
      postMode: 'invalid',
      errors: { usedIt: 'STATEMENT_REQUIRED' },
    });
    await jb.signInAs('member');
    await jb.goto(REVIEW);
    await write.rate(4);
    await write.text.fill(GOOD);
    await write.usedIt.check();

    await write.post.click();

    await expect(write.usedItError).toHaveText('Tick the box to say you have used Lanternread.');
    await expect(write.text).toHaveValue(GOOD);
  });

  test('L2-259 AC5: a failed send keeps the review and the statement', async ({ page, jb }) => {
    const write = new WriteReviewPage(page);
    await stubReviewForm(page, 'lanternread', { form: lanternreadForm(), postMode: 'offline' });
    await jb.signInAs('member');
    await jb.goto(REVIEW);
    await write.rate(4);
    await write.text.fill(GOOD);
    await write.usedIt.check();

    await write.post.click();

    await expect(write.alert).toContainText('We couldn’t post your review');
    await expect(write.text).toHaveValue(GOOD);
    await expect(write.usedIt).toBeChecked();
  });

  test('L2-258 AC8: the review screen of a business asks no statement and sends none', async ({
    page,
    jb,
  }) => {
    const write = new WriteReviewPage(page);
    const fake = await stubReviewForm(page, 'legacy-financial');
    await jb.signInAs('member');
    await jb.goto('/b/legacy-financial/review');
    await expect(write.heading).toHaveText('How was it?');

    await expect(write.usedIt).toHaveCount(0);
    await write.rate(5);
    await write.text.fill(GOOD);
    await write.post.click();

    await expect(write.postedTitle).toBeVisible();
    expect(fake.posts[0].body).not.toHaveProperty('usedIt');
  });
});
