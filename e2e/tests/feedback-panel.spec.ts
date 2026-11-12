import { expect, test } from '../fixtures/jb-test';
import { stubFeedback } from '../fixtures/feedback';
import { FeedbackDialog } from '../pages/feedback.dialog';
import { ShellPage } from '../pages/shell.page';

test.describe('feedback launcher and panel (L2-210)', () => {
  test('AC1: a member sees the launcher as a pill from 768 px', async ({ page, jb }) => {
    const shell = new ShellPage(page);
    await shell.setWidth(1280);
    await jb.signInAs('member');
    await jb.goto('/');

    await expect(shell.feedbackLauncher).toBeVisible();
    await expect(shell.feedbackLauncher).toHaveAccessibleName('Give feedback');
    await expect(shell.feedbackLauncher).toContainText('Feedback');
    await expect(shell.feedbackLauncherLabel).toBeVisible();
  });

  test('AC1: on a phone the launcher is a round button above the tab bar', async ({ page, jb }) => {
    const shell = new ShellPage(page);
    await shell.setWidth(360);
    await jb.signInAs('member');
    await jb.goto('/');

    await expect(shell.feedbackLauncher).toBeVisible();
    await expect(shell.feedbackLauncher).toHaveAccessibleName('Give feedback');
    await expect(shell.feedbackLauncherLabel).toBeHidden();
    const launcher = (await shell.feedbackLauncher.boundingBox())!;
    const tabBar = (await shell.tabBar.boundingBox())!;
    expect(launcher.y + launcher.height).toBeLessThanOrEqual(tabBar.y);
    expect(launcher.width).toBeGreaterThanOrEqual(44);
    expect(launcher.height).toBeGreaterThanOrEqual(44);
  });

  test('AC1: a visitor and a screen without the bars show no launcher', async ({ page, jb }) => {
    const shell = new ShellPage(page);
    await shell.setWidth(1280);
    await jb.goto('/');
    await expect(shell.topBar).toBeVisible();
    await expect(shell.feedbackLauncher).toHaveCount(0);

    await jb.goto('/sign-in');
    await expect(shell.main).toBeVisible();
    await expect(shell.feedbackLauncher).toHaveCount(0);
  });

  test('AC2: the launcher opens the panel on Rate, and the arrow keys move between the tabs', async ({
    page,
    jb,
  }) => {
    const shell = new ShellPage(page);
    const panel = new FeedbackDialog(page);
    await shell.setWidth(1280);
    await jb.signInAs('member');
    await jb.goto('/');
    await shell.feedbackLauncher.focus();
    await page.keyboard.press('Enter');

    await expect(panel.title).toHaveText('Tell us how it’s going');
    await expect(panel.tab('Rate')).toHaveAttribute('aria-selected', 'true');
    await expect(panel.tab('Report a bug')).toHaveAttribute('tabindex', '-1');
    await expect(panel.tab('Kudos')).toHaveAttribute('tabindex', '-1');

    await panel.tab('Rate').focus();
    await page.keyboard.press('ArrowRight');
    await expect(panel.tab('Report a bug')).toHaveAttribute('aria-selected', 'true');
    await expect(panel.tab('Report a bug')).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(panel.tab('Kudos')).toHaveAttribute('aria-selected', 'true');
  });

  test('AC2: from 640 px the panel is a card in the bottom right corner; under it, a bottom sheet', async ({
    page,
    jb,
  }) => {
    const shell = new ShellPage(page);
    const panel = new FeedbackDialog(page);
    await shell.setWidth(1280);
    await jb.signInAs('member');
    await jb.goto('/');
    await shell.feedbackLauncher.click();
    await expect(panel.title).toBeVisible();
    await panel.settled();
    const view = page.viewportSize()!;
    const card = (await panel.panel.boundingBox())!;
    expect(card.x).toBeGreaterThan(view.width / 2);
    expect(view.width - (card.x + card.width)).toBeLessThan(48);
    expect(view.height - (card.y + card.height)).toBeLessThan(48);

    await page.keyboard.press('Escape');
    await shell.setWidth(360);
    await shell.feedbackLauncher.click();
    await expect(panel.title).toBeVisible();
    await panel.settled();
    const sheet = (await panel.panel.boundingBox())!;
    expect(sheet.x).toBe(0);
    expect(Math.round(sheet.width)).toBe(360);
    expect(Math.round(sheet.y + sheet.height)).toBe(page.viewportSize()!.height);
  });

  test('AC3: the stars are one group, each with its word, and the note asks by the rating', async ({
    page,
    jb,
  }) => {
    const shell = new ShellPage(page);
    const panel = new FeedbackDialog(page);
    await shell.setWidth(1280);
    await jb.signInAs('member');
    await jb.goto('/');
    await shell.feedbackLauncher.click();

    await expect(panel.stars).toHaveAccessibleName('How’s Jubilee working for you so far?');
    for (const [n, word] of [
      [1, 'Frustrating'],
      [2, 'Not great'],
      [3, 'Okay'],
      [4, 'Good'],
      [5, 'Love it'],
    ] as const) {
      await expect(panel.starRadio(n)).toHaveAccessibleName(`${n} of 5: ${word}`);
    }
    await expect(panel.starWord).toHaveText('Tap to rate');
    await expect(panel.note).toHaveAttribute(
      'placeholder',
      'What would make it better? (optional)',
    );

    await panel.star(2).click();
    await expect(panel.starRadio(2)).toBeChecked();
    await expect(panel.starWord).toHaveText('Not great');
    await expect(panel.note).toHaveAttribute(
      'placeholder',
      'What would make it better? (optional)',
    );

    await panel.star(4).click();
    await expect(panel.starWord).toHaveText('Good');
    await expect(panel.note).toHaveAttribute('placeholder', 'What’s working well? (optional)');
  });

  test('AC6, AC7: a rating is sent with its note and the panel says thank you', async ({
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

    await expect(panel.send).toHaveText('Send rating');
    await expect(panel.send).toBeDisabled();
    await panel.star(4).click();
    await expect(panel.send).toBeEnabled();
    await panel.note.fill('Search is quick.');
    await panel.send.click();

    await expect(panel.title).toHaveText('Thank you, Joanna.');
    await expect(panel.thanks).toHaveText(
      'Every rating is read, and it shapes what we build next.',
    );
    expect(fake.sent).toHaveLength(1);
    expect(fake.sent[0].path).toBe('ratings');
    expect(fake.sent[0].body).toMatchObject({ rating: 4, note: 'Search is quick.' });
    expect(fake.sent[0].key).toBeTruthy();

    await panel.done.click();
    await expect(panel.root).toHaveCount(0);
    await expect(shell.feedbackLauncher).toBeFocused();
  });

  test('AC7: the send button is busy until the answer arrives', async ({ page, jb }) => {
    const shell = new ShellPage(page);
    const panel = new FeedbackDialog(page);
    await shell.setWidth(1280);
    await jb.signInAs('member');
    await stubFeedback(page, { mode: 'pending' });
    await jb.goto('/');
    await shell.feedbackLauncher.click();
    await panel.star(5).click();
    await panel.send.click();

    await expect(panel.send).toHaveAttribute('aria-busy', 'true');
    await expect(panel.close).toBeDisabled();
    await expect(panel.starRadio(5)).toBeDisabled();
  });

  test('AC10: Escape, the close button and the scrim close the panel and focus returns to the launcher', async ({
    page,
    jb,
  }) => {
    const shell = new ShellPage(page);
    const panel = new FeedbackDialog(page);
    await shell.setWidth(1280);
    await jb.signInAs('member');
    await jb.goto('/');

    await shell.feedbackLauncher.click();
    await panel.star(3).click();
    await panel.note.fill('Half a thought.');
    await page.keyboard.press('Escape');
    await expect(panel.root).toHaveCount(0);
    await expect(shell.feedbackLauncher).toBeFocused();

    await shell.feedbackLauncher.click();
    await expect(panel.note).toHaveValue('');
    await expect(panel.starWord).toHaveText('Tap to rate');
    await panel.close.click();
    await expect(panel.root).toHaveCount(0);
    await expect(shell.feedbackLauncher).toBeFocused();

    await shell.feedbackLauncher.click();
    await expect(panel.title).toBeVisible();
    await panel.pressScrim();
    await expect(panel.root).toHaveCount(0);
  });

  test('AC11: a note is held to 1,000 characters', async ({ page, jb }) => {
    const shell = new ShellPage(page);
    const panel = new FeedbackDialog(page);
    await shell.setWidth(1280);
    await jb.signInAs('member');
    await jb.goto('/');
    await shell.feedbackLauncher.click();

    await expect(panel.note).toHaveAttribute('maxlength', '1000');
  });
});
