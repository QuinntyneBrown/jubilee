import { expect, test } from '../fixtures/jb-test';
import { stubFeedback } from '../fixtures/feedback';
import { FeedbackDialog } from '../pages/feedback.dialog';
import { ShellPage } from '../pages/shell.page';

test.describe('bug reports, kudos and failures in the feedback panel (L2-210)', () => {
  test('AC4, AC7: a bug report says what is attached and is logged with a reference', async ({
    page,
    jb,
  }) => {
    const shell = new ShellPage(page);
    const panel = new FeedbackDialog(page);
    await shell.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubFeedback(page);
    await jb.goto('/');
    await shell.feedbackLauncher.click();
    await panel.tab('Report a bug').click();

    await expect(panel.attached).toHaveText(
      'We’ll attach: Browse · your browser and device · version 1.0.0',
    );
    await expect(panel.bugText).toHaveAttribute('maxlength', '1000');
    await expect(panel.send).toHaveText('Send report');
    await expect(panel.send).toBeDisabled();
    await panel.bugText.fill('   ');
    await expect(panel.send).toBeDisabled();
    await panel.bugText.fill('The page stayed blank until I reloaded it.');
    await expect(panel.send).toBeEnabled();
    await panel.send.click();

    await expect(panel.title).toHaveText('Thank you, Joanna.');
    await expect(panel.thanks).toHaveText('Logged as FB-7K2M9Q. Follow it under Your feedback.');
    expect(fake.sent).toHaveLength(1);
    expect(fake.sent[0].path).toBe('bug-reports');
    expect(fake.sent[0].body).toMatchObject({
      happened: 'The page stayed blank until I reloaded it.',
      screen: 'browse',
      version: '1.0.0',
    });
  });

  test('AC4: the screen that is attached is the one the member is on', async ({ page, jb }) => {
    const shell = new ShellPage(page);
    const panel = new FeedbackDialog(page);
    await shell.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubFeedback(page);
    await jb.goto('/b/luzandre');
    await shell.feedbackLauncher.click();
    await panel.tab('Report a bug').click();

    await expect(panel.attached).toContainText('We’ll attach: Business page ·');
    await panel.bugText.fill('The map pin is a block off.');
    await panel.send.click();
    await expect(panel.thanks).toContainText('Logged as');
    expect(fake.sent[0].body).toMatchObject({ screen: 'business' });
  });

  test('AC5, AC7: kudos are chips that say whether they are pressed, and a note', async ({
    page,
    jb,
  }) => {
    const shell = new ShellPage(page);
    const panel = new FeedbackDialog(page);
    await shell.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubFeedback(page);
    await jb.goto('/');
    await shell.feedbackLauncher.click();
    await panel.tab('Kudos').click();

    for (const chip of [
      'Found someone I trust',
      'Easy to list',
      'Quick replies',
      'Feels like church family',
      'Fair prices',
    ]) {
      await expect(panel.chip(chip)).toHaveAttribute('aria-pressed', 'false');
    }
    await expect(panel.note).toHaveAttribute(
      'placeholder',
      'Say more, or name someone who helped (optional)',
    );
    await expect(panel.send).toHaveText('Send kudos');
    await expect(panel.send).toBeDisabled();

    await panel.chip('Found someone I trust').click();
    await panel.chip('Quick replies').click();
    await panel.chip('Fair prices').click();
    await panel.chip('Fair prices').click();
    await expect(panel.chip('Found someone I trust')).toHaveAttribute('aria-pressed', 'true');
    await expect(panel.chip('Fair prices')).toHaveAttribute('aria-pressed', 'false');
    await expect(panel.send).toBeEnabled();
    await panel.note.fill('Daniel at Legacy answered within the hour.');
    await panel.send.click();

    await expect(panel.title).toHaveText('Thank you, Joanna.');
    await expect(panel.thanks).toHaveText(
      'We’ll pass it on to the team. Notes like this keep us going.',
    );
    expect(fake.sent[0].path).toBe('kudos');
    expect(fake.sent[0].body).toMatchObject({
      chips: ['trust', 'quick-replies'],
      note: 'Daniel at Legacy answered within the hour.',
    });
    expect(fake.sent[0].body).not.toHaveProperty('business');
  });

  test('AC6: a kudos note alone is enough to send', async ({ page, jb }) => {
    const shell = new ShellPage(page);
    const panel = new FeedbackDialog(page);
    await shell.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubFeedback(page);
    await jb.goto('/');
    await shell.feedbackLauncher.click();
    await panel.tab('Kudos').click();
    await panel.note.fill('Thank you for building this.');
    await expect(panel.send).toBeEnabled();
    await panel.send.click();

    await expect(panel.title).toHaveText('Thank you, Joanna.');
    expect(fake.sent[0].body).toMatchObject({ chips: [], note: 'Thank you for building this.' });
  });

  test('AC8: a failed send keeps what was typed and the retry reuses the key', async ({
    page,
    jb,
  }) => {
    const shell = new ShellPage(page);
    const panel = new FeedbackDialog(page);
    await shell.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubFeedback(page, { failures: 1 });
    await jb.goto('/');
    await shell.feedbackLauncher.click();
    await panel.tab('Report a bug').click();
    await panel.bugText.fill('The page stayed blank.');
    await panel.send.click();

    await expect(panel.alert).toContainText('We couldn’t send that');
    await expect(panel.alert).toContainText('connection');
    await expect(panel.bugText).toHaveValue('The page stayed blank.');
    await expect(panel.tab('Report a bug')).toHaveAttribute('aria-selected', 'true');
    await panel.send.click();

    await expect(panel.title).toHaveText('Thank you, Joanna.');
    expect(fake.sent).toHaveLength(2);
    expect(fake.sent[0].key).toBeTruthy();
    expect(fake.sent[0].key).toBe(fake.sent[1].key);
  });

  test('AC8: too much feedback in an hour asks the member to slow down', async ({ page, jb }) => {
    const shell = new ShellPage(page);
    const panel = new FeedbackDialog(page);
    await shell.setWidth(1280);
    await jb.signInAs('member');
    await stubFeedback(page, { mode: 'limited' });
    await jb.goto('/');
    await shell.feedbackLauncher.click();
    await panel.star(2).click();
    await panel.note.fill('Too slow.');
    await panel.send.click();

    await expect(panel.alert).toContainText('We couldn’t send that');
    await expect(panel.alert).toContainText('Slow down a little');
    await expect(panel.starRadio(2)).toBeChecked();
    await expect(panel.note).toHaveValue('Too slow.');
  });

  test('AC8: a send that never answers fails after ten seconds', async ({ page, jb }) => {
    const shell = new ShellPage(page);
    const panel = new FeedbackDialog(page);
    await shell.setWidth(1280);
    await page.clock.install();
    await jb.signInAs('member');
    await stubFeedback(page, { mode: 'pending' });
    await jb.goto('/');
    await shell.feedbackLauncher.click();
    await panel.star(5).click();
    await panel.send.click();
    await expect(panel.send).toHaveAttribute('aria-busy', 'true');

    await page.clock.fastForward(10_500);
    await expect(panel.alert).toContainText('took too long');
    await expect(panel.send).not.toHaveAttribute('aria-busy', 'true');
    await expect(panel.starRadio(5)).toBeChecked();
  });

  test('each tab keeps its own answer while the panel is open', async ({ page, jb }) => {
    const shell = new ShellPage(page);
    const panel = new FeedbackDialog(page);
    await shell.setWidth(1280);
    await jb.signInAs('member');
    await jb.goto('/');
    await shell.feedbackLauncher.click();
    await panel.star(4).click();
    await panel.tab('Report a bug').click();
    await panel.bugText.fill('Half a report.');
    await panel.tab('Rate').click();

    await expect(panel.starRadio(4)).toBeChecked();
    await panel.tab('Report a bug').click();
    await expect(panel.bugText).toHaveValue('Half a report.');
  });
});
