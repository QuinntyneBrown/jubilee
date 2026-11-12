import { expect, test } from '../fixtures/jb-test';
import { stubFeedback } from '../fixtures/feedback';
import { BrowsePage } from '../pages/browse.page';
import { FeedbackDialog } from '../pages/feedback.dialog';
import { FeedbackPage } from '../pages/feedback.page';
import { SignInPage } from '../pages/sign-in.page';

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG = [0xff, 0xd8, 0xff, 0xe0];

/** A picture by its first bytes, which is how the app tells one (L2-138). */
const picture = (name: string, head: number[], mimeType: string, bytes: number) => ({
  name,
  mimeType,
  buffer: Buffer.concat([Buffer.from(head), Buffer.alloc(bytes - head.length, 1)]),
});
const png = (name: string, bytes = 2_000) => picture(name, PNG, 'image/png', bytes);
const jpeg = (name: string, bytes = 900) => picture(name, JPEG, 'image/jpeg', bytes);

test.describe('the feedback page (L2-212)', () => {
  test('AC1: a member opens the page on Rate; the tabs change the address', async ({
    page,
    jb,
  }) => {
    const feedback = new FeedbackPage(page);
    await feedback.setWidth(1280);
    await jb.signInAs('member');
    await stubFeedback(page);
    await jb.goto('/feedback');

    await expect(page).toHaveURL(/\/feedback\/rate$/);
    await expect(feedback.heading).toHaveText('Help us make Jubilee better');
    await expect(feedback.kind('Rate')).toHaveAttribute('aria-selected', 'true');
    await expect(feedback.feedbackLauncher).toHaveCount(0);

    await feedback.kind('Report a bug').click();
    await expect(page).toHaveURL(/\/feedback\/bug$/);
    await expect(feedback.where).toBeVisible();

    await feedback.kind('Report a bug').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL(/\/feedback\/kudos$/);
    await expect(feedback.kind('Kudos')).toBeFocused();
    await expect(feedback.forTeam).toBeVisible();
  });

  test('AC1: a visitor is asked to sign in first', async ({ page, jb }) => {
    const signIn = new SignInPage(page);
    await jb.goto('/feedback/bug');

    await expect(page).toHaveURL(/\/sign-in\?returnUrl=%2Ffeedback%2Fbug/);
    await expect(signIn.heading).toBeVisible();
  });

  test('AC1: an address that names no tab opens Rate', async ({ page, jb }) => {
    const feedback = new FeedbackPage(page);
    await jb.signInAs('member');
    await stubFeedback(page);
    await jb.goto('/feedback/nonsense');

    await expect(page).toHaveURL(/\/feedback\/rate$/);
    await expect(feedback.kind('Rate')).toHaveAttribute('aria-selected', 'true');
  });

  test('L2-210 AC9: "Full form" closes the panel and opens the page on the same tab', async ({
    page,
    jb,
  }) => {
    const browse = new BrowsePage(page);
    const panel = new FeedbackDialog(page);
    const feedback = new FeedbackPage(page);
    await browse.setWidth(1280);
    await jb.signInAs('member');
    await stubFeedback(page);
    await jb.goto('/');
    await browse.feedbackLauncher.click();
    await panel.tab('Kudos').click();
    await panel.fullForm.click();

    await expect(panel.root).toHaveCount(0);
    await expect(page).toHaveURL(/\/feedback\/kudos$/);
    await expect(feedback.kind('Kudos')).toHaveAttribute('aria-selected', 'true');
  });

  test('AC2, AC10, AC11: a rating with the parts of Jubilee is sent and confirmed', async ({
    page,
    jb,
  }) => {
    const feedback = new FeedbackPage(page);
    await feedback.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubFeedback(page);
    await jb.goto('/feedback/rate');

    await expect(feedback.starWord).toHaveText('Tap to rate');
    await expect(feedback.mayContact).not.toBeChecked();
    await expect(feedback.submit).toHaveText('Send feedback');
    await expect(feedback.scoreRows).toContainText('Browse, search and categories');
    await expect(feedback.scoreRows).toContainText('Creating and editing a listing');
    await expect(feedback.scoreRows).toContainText('Meetings, quotes and order requests');
    await expect(feedback.scoreRows).toContainText('Verification and verified marks');

    await feedback.star(4).click();
    await expect(feedback.starWord).toHaveText('Good');
    await feedback.score('Finding businesses', 5).click();
    await feedback.score('Messages and requests', 2).click();
    await feedback.score('Trust and verification', 3).click();
    // Pressing the chosen score again clears it.
    await feedback.score('Trust and verification', 3).click();
    await expect(feedback.scoreRadio('Trust and verification', 3)).not.toBeChecked();
    await expect(feedback.scoreRadio('Finding businesses', 5)).toBeChecked();
    await feedback.better.fill('One place for every request to a business.');
    await feedback.mayContact.check();
    await feedback.submit.click();

    await expect(feedback.confirmationTitle).toHaveText('Thanks for rating Jubilee.');
    await expect(feedback.confirmationText).toHaveText(
      'Joanna, we read every rating, and the lowest-scored parts are what we work on next.',
    );
    expect(fake.sent).toHaveLength(1);
    expect(fake.sent[0].path).toBe('ratings');
    expect(fake.sent[0].key).toBeTruthy();
    expect(fake.sent[0].body).toEqual({
      rating: 4,
      note: 'One place for every request to a business.',
      areas: { finding: 5, messaging: 2 },
      mayContact: true,
    });
    await expect(feedback.historyItems.first()).toContainText('Rated Jubilee 4 of 5');

    await feedback.backToJubilee.click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('AC3: without an overall rating nothing is sent and focus moves to the stars', async ({
    page,
    jb,
  }) => {
    const feedback = new FeedbackPage(page);
    await feedback.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubFeedback(page);
    await jb.goto('/feedback/rate');
    await feedback.better.fill('Faster search.');
    await feedback.submit.click();

    await expect(feedback.starsError).toHaveText('Choose a rating from 1 to 5.');
    await expect(feedback.stars).toHaveAttribute('aria-invalid', 'true');
    await expect(feedback.starRadio(1)).toBeFocused();
    await expect(feedback.better).toHaveValue('Faster search.');
    expect(fake.sent).toHaveLength(0);

    await feedback.star(3).click();
    await expect(feedback.starsError).toHaveCount(0);
  });

  test('AC4, AC11: a bug report carries where, what, how often and the version', async ({
    page,
    jb,
  }) => {
    const feedback = new FeedbackPage(page);
    await feedback.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubFeedback(page);
    await jb.goto('/feedback/bug');

    await expect(feedback.where.locator('option')).toHaveText([
      'Choose a place',
      'Browse and search',
      'A business or product page',
      'Listing a business',
      'Messages',
      'Requests',
      'Signing in or joining',
      'Somewhere else',
    ]);
    await expect(feedback.alsoAttached).toHaveText(
      'We’ll also attach your browser and device and the app’s version (1.0.0).',
    );
    await expect(feedback.submit).toHaveText('Send bug report');
    await expect(feedback.happened).toHaveAttribute('maxlength', '2000');
    await expect(feedback.expected).toHaveAttribute('maxlength', '2000');

    await feedback.where.selectOption({ label: 'Requests' });
    await feedback.happened.fill('The button said Sending for a minute.');
    await feedback.expected.fill('A confirmation.');
    await feedback.often('Sometimes').click();
    await feedback.often('Every time').click();
    await expect(feedback.often('Sometimes')).toHaveAttribute('aria-pressed', 'false');
    await expect(feedback.often('Every time')).toHaveAttribute('aria-pressed', 'true');
    await feedback.submit.click();

    await expect(feedback.confirmationTitle).toHaveText('Got it. We’re on it.');
    await expect(feedback.confirmationText).toHaveText(
      'Joanna, your report is logged as FB-7K2M9Q. Follow it under Your feedback.',
    );
    expect(fake.sent).toHaveLength(1);
    expect(fake.sent[0].path).toBe('bug-reports');
    expect(fake.sent[0].body).toEqual({
      where: 'requests',
      happened: 'The button said Sending for a minute.',
      expected: 'A confirmation.',
      frequency: 'every-time',
      screen: 'feedback',
      version: '1.0.0',
    });
    await expect(feedback.historyItems.first()).toContainText(
      'The button said Sending for a minute.',
    );
  });

  test('AC4: pressing the chosen frequency again clears it', async ({ page, jb }) => {
    const feedback = new FeedbackPage(page);
    await jb.signInAs('member');
    const fake = await stubFeedback(page);
    await jb.goto('/feedback/bug');
    await feedback.where.selectOption({ label: 'Messages' });
    await feedback.happened.fill('A photo never showed.');
    await feedback.often('Just once').click();
    await feedback.often('Just once').click();
    await expect(feedback.often('Just once')).toHaveAttribute('aria-pressed', 'false');
    await feedback.submit.click();

    await expect(feedback.confirmationTitle).toBeVisible();
    expect(fake.sent[0].body).not.toHaveProperty('frequency');
    expect(fake.sent[0].body).not.toHaveProperty('expected');
  });

  test('AC5: a bug report without a place or what happened names both and sends nothing', async ({
    page,
    jb,
  }) => {
    const feedback = new FeedbackPage(page);
    await feedback.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubFeedback(page);
    await jb.goto('/feedback/bug');
    await feedback.submit.click();

    await expect(feedback.whereError).toHaveText('Choose where it happened.');
    await expect(feedback.happenedError).toHaveText('Tell us what happened.');
    await expect(feedback.where).toBeFocused();
    await expect(feedback.where).toHaveAttribute('aria-invalid', 'true');
    expect(fake.sent).toHaveLength(0);

    await feedback.where.selectOption({ label: 'Somewhere else' });
    await feedback.submit.click();
    await expect(feedback.whereError).toHaveCount(0);
    await expect(feedback.happened).toBeFocused();
    expect(fake.sent).toHaveLength(0);
  });

  test('AC6: up to three screenshots are listed by name, removed, and sent with the report', async ({
    page,
    jb,
  }) => {
    const feedback = new FeedbackPage(page);
    await feedback.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubFeedback(page);
    await jb.goto('/feedback/bug');

    await feedback.attach(png('one.png'), png('two.png'));
    await expect(feedback.screenshot('one.png')).toBeVisible();
    await expect(feedback.screenshot('two.png')).toBeVisible();
    await feedback.removeScreenshot('one.png').click();
    await expect(feedback.screenshot('one.png')).toHaveCount(0);
    await feedback.attach(jpeg('three.jpg'));
    // Nothing is uploaded before the report is sent.
    expect(fake.sent).toHaveLength(0);

    await feedback.where.selectOption({ label: 'Requests' });
    await feedback.happened.fill('See the pictures.');
    await feedback.submit.click();

    await expect(feedback.confirmationTitle).toHaveText('Got it. We’re on it.');
    expect(fake.sent.map((sent) => sent.path)).toEqual([
      'screenshots',
      'screenshots',
      'bug-reports',
    ]);
    expect(fake.sent[2].body).toMatchObject({ screenshotIds: ['shot-1', 'shot-2'] });
  });

  test('AC6: a file that is not a picture, one that is too large and a fourth are refused', async ({
    page,
    jb,
  }) => {
    const feedback = new FeedbackPage(page);
    await feedback.setWidth(1280);
    await jb.signInAs('member');
    await stubFeedback(page);
    await jb.goto('/feedback/bug');

    await feedback.attach({
      name: 'notes.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.alloc(100, 1),
    });
    await expect(feedback.screenshotError).toHaveText('Use a JPEG or PNG of 5 MB or less.');
    await expect(feedback.screenshotFiles).toHaveCount(0);

    await feedback.attach(png('huge.png', 5 * 1024 * 1024 + 1));
    await expect(feedback.screenshotError).toHaveText('Use a JPEG or PNG of 5 MB or less.');

    await feedback.attach(png('a.png'), png('b.png'), png('c.png'));
    await expect(feedback.screenshotError).toHaveCount(0);
    await expect(feedback.screenshotFiles.getByRole('listitem')).toHaveCount(3);
    await expect(feedback.addScreenshots).toBeDisabled();

    await feedback.removeScreenshot('c.png').click();
    await feedback.attach(png('d.png'), png('e.png'));
    await expect(feedback.screenshotError).toHaveText('You can add up to three screenshots.');
    await expect(feedback.screenshotFiles.getByRole('listitem')).toHaveCount(3);
    await expect(feedback.screenshot('d.png')).toBeVisible();
    await expect(feedback.screenshot('e.png')).toHaveCount(0);
  });

  test('AC7, AC11: kudos to the Jubilee team', async ({ page, jb }) => {
    const feedback = new FeedbackPage(page);
    await feedback.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubFeedback(page);
    await jb.goto('/feedback/kudos');

    await expect(feedback.forTeam).toBeChecked();
    await expect(feedback.forCards).toContainText('Something about the app itself.');
    await expect(feedback.forCards).toContainText('Someone you hired or bought from.');
    await expect(feedback.which).toHaveCount(0);
    await expect(feedback.showOnPage).toHaveCount(0);
    await expect(feedback.submit).toHaveText('Send kudos');

    await feedback.chip('Easy to list').click();
    await feedback.note.fill('The listing form was painless.');
    await feedback.submit.click();

    await expect(feedback.confirmationTitle).toHaveText('That made our day.');
    await expect(feedback.confirmationText).toHaveText(
      'Joanna, we share every kudos with the whole team. Thank you for saying it.',
    );
    expect(fake.sent[0].path).toBe('kudos');
    expect(fake.sent[0].body).toEqual({
      chips: ['easy-to-list'],
      note: 'The listing form was painless.',
    });
    await expect(feedback.historyItems.first()).toContainText('Kudos to the Jubilee team');
  });

  test('AC8, AC11: kudos to a business the member has contacted, with consent to show it', async ({
    page,
    jb,
  }) => {
    const feedback = new FeedbackPage(page);
    await feedback.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubFeedback(page);
    await jb.goto('/feedback/kudos');
    await feedback.forBusiness.check({ force: true });

    await expect(feedback.which.locator('option')).toHaveText([
      'Choose a business',
      'Christian Bookstores',
      'Legacy Financial',
      'WaterWorks Plumbing & Drains',
    ]);
    await expect(feedback.showOnPage).not.toBeChecked();
    await feedback.which.selectOption({ label: 'Legacy Financial' });
    await feedback.chip('Found someone I trust').click();
    await feedback.showOnPage.check();
    await feedback.submit.click();

    await expect(feedback.confirmationTitle).toHaveText('Thank you for saying it.');
    await expect(feedback.confirmationText).toHaveText(
      'Joanna, we’ve kept your note for Legacy Financial.',
    );
    expect(fake.sent[0].body).toEqual({
      business: 'legacy-financial',
      chips: ['trust'],
      showOnPage: true,
    });
    await expect(feedback.historyItems.first()).toContainText('Kudos to Legacy Financial');
  });

  test('AC8: a member who has contacted no business cannot choose "A business"', async ({
    page,
    jb,
  }) => {
    const feedback = new FeedbackPage(page);
    await jb.signInAs('member');
    await stubFeedback(page, { businesses: [] });
    await jb.goto('/feedback/kudos');

    await expect(feedback.forBusiness).toBeDisabled();
    await expect(feedback.forHint).toHaveText('Send a request or a message to a business first.');
  });

  test('AC9: kudos with nothing chosen, or no business, say what is missing', async ({
    page,
    jb,
  }) => {
    const feedback = new FeedbackPage(page);
    await feedback.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubFeedback(page);
    await jb.goto('/feedback/kudos');
    await feedback.submit.click();

    await expect(feedback.chipsError).toHaveText('Choose what stood out or write a note.');
    await expect(feedback.chip('Found someone I trust')).toBeFocused();
    expect(fake.sent).toHaveLength(0);

    await feedback.forBusiness.check({ force: true });
    await feedback.note.fill('Thank you.');
    await feedback.submit.click();
    await expect(feedback.chipsError).toHaveCount(0);
    await expect(feedback.whichError).toHaveText('Choose the business.');
    await expect(feedback.which).toBeFocused();
    expect(fake.sent).toHaveLength(0);
  });

  test('AC11: while it is sent the button says "Sending…" and the fields cannot be changed', async ({
    page,
    jb,
  }) => {
    const feedback = new FeedbackPage(page);
    await feedback.setWidth(1280);
    await jb.signInAs('member');
    await stubFeedback(page, { mode: 'pending' });
    await jb.goto('/feedback/rate');
    await feedback.star(5).click();
    await feedback.better.fill('Nothing.');
    await feedback.submit.click();

    await expect(feedback.submit).toHaveAttribute('aria-busy', 'true');
    await expect(feedback.submit).toHaveAccessibleName('Sending…');
    await expect(feedback.starRadio(5)).toBeDisabled();
    await expect(feedback.better).toBeDisabled();
    await expect(feedback.mayContact).toBeDisabled();
    await expect(feedback.kind('Kudos')).toBeDisabled();
  });

  test('AC12: a failed submission keeps everything and the retry reuses the key', async ({
    page,
    jb,
  }) => {
    const feedback = new FeedbackPage(page);
    await feedback.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubFeedback(page, { failures: 1 });
    await jb.goto('/feedback/bug');
    await feedback.where.selectOption({ label: 'Messages' });
    await feedback.happened.fill('A photo never showed.');
    await feedback.submit.click();

    await expect(feedback.alert).toContainText('We couldn’t send that');
    await expect(feedback.alert).toContainText('connection');
    await expect(feedback.where).toHaveValue('messages');
    await expect(feedback.happened).toHaveValue('A photo never showed.');
    await feedback.submit.click();

    await expect(feedback.confirmationTitle).toHaveText('Got it. We’re on it.');
    expect(fake.sent).toHaveLength(2);
    expect(fake.sent[0].key).toBeTruthy();
    expect(fake.sent[0].key).toBe(fake.sent[1].key);
  });

  test('AC12: too much feedback in an hour asks the member to slow down', async ({ page, jb }) => {
    const feedback = new FeedbackPage(page);
    await jb.signInAs('member');
    await stubFeedback(page, { mode: 'limited' });
    await jb.goto('/feedback/rate');
    await feedback.star(1).click();
    await feedback.submit.click();

    await expect(feedback.alert).toContainText('Slow down a little');
    await expect(feedback.starRadio(1)).toBeChecked();
  });

  test('AC12: a submission that never answers fails after ten seconds', async ({ page, jb }) => {
    const feedback = new FeedbackPage(page);
    await page.clock.install();
    await jb.signInAs('member');
    await stubFeedback(page, { mode: 'pending' });
    await jb.goto('/feedback/rate');
    await feedback.star(2).click();
    await feedback.submit.click();
    await expect(feedback.submit).toHaveAttribute('aria-busy', 'true');

    await page.clock.fastForward(10_500);
    await expect(feedback.alert).toContainText('took too long');
    await expect(feedback.submit).not.toHaveAttribute('aria-busy', 'true');
  });

  test('AC12: an error the server finds shows under its field', async ({ page, jb }) => {
    const feedback = new FeedbackPage(page);
    await jb.signInAs('member');
    await stubFeedback(page, {
      mode: 'invalid',
      errors: { business: 'BUSINESS_NOT_CONTACTED' },
    });
    await jb.goto('/feedback/kudos');
    await feedback.forBusiness.check({ force: true });
    await feedback.which.selectOption({ label: 'Legacy Financial' });
    await feedback.note.fill('Thank you.');
    await feedback.submit.click();

    await expect(feedback.whichError).toHaveText(
      'Choose a business you’ve sent a request or a message to.',
    );
    await expect(feedback.note).toHaveValue('Thank you.');
  });

  test('AC13: "Your feedback" follows the form under 1024 px and sits beside it from there', async ({
    page,
    jb,
  }) => {
    const feedback = new FeedbackPage(page);
    await jb.signInAs('member');
    await stubFeedback(page);
    await feedback.setWidth(360);
    await jb.goto('/feedback/rate');
    await expect(feedback.historyItems.first()).toBeVisible();
    expect(await feedback.historyIsBeside()).toBe(false);
    expect(await feedback.overflowsHorizontally()).toBe(false);

    await feedback.setWidth(1280);
    expect(await feedback.historyIsBeside()).toBe(true);
    expect(await feedback.overflowsHorizontally()).toBe(false);
  });

  test('AC14: notes are held to 1,000 characters', async ({ page, jb }) => {
    const feedback = new FeedbackPage(page);
    await jb.signInAs('member');
    await stubFeedback(page);
    await jb.goto('/feedback/rate');
    await expect(feedback.better).toHaveAttribute('maxlength', '1000');

    await feedback.kind('Kudos').click();
    await expect(feedback.note).toHaveAttribute('maxlength', '1000');
  });
});

test.describe('your feedback (L2-213)', () => {
  test('AC1, AC2, AC3: each item has its title, date, reference, status in words and reply', async ({
    page,
    jb,
  }) => {
    const feedback = new FeedbackPage(page);
    await feedback.setWidth(1280);
    await jb.signInAs('member');
    await stubFeedback(page);
    await jb.goto('/feedback/rate');

    await expect(feedback.historyItems).toHaveCount(4);
    const working = feedback.historyItems.nth(0);
    await expect(working).toContainText('Photos I attach to a message take a long time to show');
    await expect(working).toContainText('Bug report:');
    await expect(working).toContainText('FB-4NWP6R');
    await expect(feedback.status(working)).toHaveText('Being worked on');
    await expect(feedback.date(working)).toHaveText('Fri 6 Nov');
    await expect(feedback.reply(working)).toHaveCount(0);

    const kudos = feedback.historyItems.nth(1);
    await expect(kudos).toContainText('Kudos to Christian Bookstores');
    await expect(feedback.status(kudos)).toHaveText('Received');

    const rating = feedback.historyItems.nth(2);
    await expect(rating).toContainText('Rated Jubilee 4 of 5');
    await expect(feedback.status(rating)).toHaveText('Read by the team');
    await expect(feedback.date(rating)).toHaveText('28 Oct');

    const fixed = feedback.historyItems.nth(3);
    await expect(fixed).toContainText('FB-3HX8TD');
    await expect(feedback.status(fixed)).toHaveText('Fixed');
    await expect(feedback.reply(fixed)).toContainText(
      'Fixed on 23 October. Thanks for catching it, Joanna. Miriam, Jubilee',
    );
  });

  test('AC4: a member with no feedback is told what will show', async ({ page, jb }) => {
    const feedback = new FeedbackPage(page);
    await jb.signInAs('member');
    await stubFeedback(page, { history: [] });
    await jb.goto('/feedback/rate');

    await expect(feedback.historyEmpty).toHaveText(
      'Nothing yet. What you send shows up here, with our reply.',
    );
    await expect(feedback.historyItems).toHaveCount(0);
  });

  test('AC5: skeleton rows show while the list loads', async ({ page, jb }) => {
    const feedback = new FeedbackPage(page);
    await jb.signInAs('member');
    await stubFeedback(page, { history: 'loading' });
    await jb.goto('/feedback/rate');

    await expect(feedback.historyLoading).toBeVisible();
    await expect(feedback.stars).toBeVisible();
  });

  test('AC5: a list that fails to load can be tried again and the form still works', async ({
    page,
    jb,
  }) => {
    const feedback = new FeedbackPage(page);
    await jb.signInAs('member');
    const fake = await stubFeedback(page, { history: 'error' });
    await jb.goto('/feedback/rate');

    await expect(feedback.historyError).toContainText('We couldn’t load your feedback.');
    await feedback.star(5).click();
    await expect(feedback.starWord).toHaveText('Love it');

    fake.history = [];
    await feedback.historyRetry.click();
    await expect(feedback.historyEmpty).toBeVisible();
    await expect(feedback.historyError).toHaveCount(0);
  });
});
