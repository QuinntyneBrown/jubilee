import { stubChallenge, stubLaunchChallenge } from '../fixtures/bot-challenge';
import { expect, test } from '../fixtures/jb-test';
import { MarketingHomePage } from '../pages/marketing-home.page';

// The launch notification sign-up of the launching-soon marketing page (L2-217, ADR 0044). The
// answers come from the recording; the busy, still-sending, limited and refused states from stubs.

test.describe('launch notification sign-up (L2-217)', () => {
  test('AC1: the form asks for an address, an optional first name and consent', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    // Given anyone, when they open the marketing site
    await jb.open('marketing-home');
    const form = home.notifyForm;
    // Then "Jubilee is launching soon." holds the form named "Launch notification"
    await expect(form.labels).toHaveText(['Email (required)', 'First name (optional)']);
    await expect(form.consent).not.toBeChecked();
    await expect(form.form).toContainText(
      'Yes, e-mail me when Jubilee launches. I can unsubscribe at any time.',
    );
    await expect(form.send).toBeVisible();
    await expect(form.note).toHaveText(
      'We use your address for the launch notice only. We never sell data.',
    );
  });

  test('AC2: sent empty, it lists what to fix, moves focus there and sends nothing', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    await jb.open('marketing-home');
    const form = home.notifyForm;
    const sent = form.watch();
    // When the visitor sends the form with nothing in it
    await form.send.click();
    // Then the summary lists both things, each a link to its field, and holds the focus
    await expect(form.summary).toContainText('Fix 2 things to continue');
    await expect(form.summaryLinks).toHaveText([
      'Enter a valid e-mail address',
      'Say yes so that we may e-mail you',
    ]);
    await expect.poll(() => form.hasFocus(form.summary)).toBe(true);
    // And each field says how to fix it
    await expect(form.errorOf('Email')).toHaveText('Enter your e-mail address.');
    await expect(form.field('Email')).toHaveAttribute('aria-invalid', 'true');
    await expect(form.consentError()).toHaveText('Tick the box so that we may e-mail you.');
    await expect(form.consent).toHaveAttribute('aria-invalid', 'true');
    // And nothing was sent
    expect(sent()).toBe(0);
    // When the visitor follows the first link, the field takes the focus
    await form.summaryLinks.first().click();
    await expect(form.field('Email')).toBeFocused();
  });

  test('AC2: an address that is not one is refused in the browser', async ({ page, jb }) => {
    const home = new MarketingHomePage(page);
    await jb.open('marketing-home');
    await home.fillNotify('joanna@');
    await home.notifyForm.send.click();
    await expect(home.notifyForm.errorOf('Email')).toHaveText(
      'Enter a valid e-mail address, like name@example.com.',
    );
    await expect(home.notifyForm.summaryLinks).toHaveText(['Enter a valid e-mail address']);
  });

  test('AC3: while it is sent the button is busy, the fields are read-only and a second press sends nothing', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    await jb.open('marketing-home.notify-busy');
    const form = home.notifyForm;
    const sent = form.watch();
    await home.fillNotify();
    await form.send.click();
    await expect(form.send).toHaveAttribute('aria-busy', 'true');
    await expect(form.send).toHaveText('Tell me when it launches');
    await expect(form.field('Email')).toHaveAttribute('readonly', '');
    await expect(form.consent).toBeDisabled();
    await form.send.click({ force: true });
    expect(sent()).toBe(1);
  });

  test('AC4 and AC8: a valid form sends the address and consent, and is replaced by a confirmation that takes focus', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    await jb.open('marketing-home');
    const form = home.notifyForm;
    await home.fillNotify();
    // When the visitor sends the form
    const request = await form.sendAndCapture();
    // Then the address, the first name and the consent are sent
    expect(request.postDataJSON()).toEqual({
      email: 'joanna.adeyemi@example.com',
      firstName: 'Joanna',
      consent: true,
      challengeToken: null,
    });
    // And the confirmation takes the form's place and the focus
    await expect(form.confirmationHeading).toHaveText('You’re on the list.');
    await expect(form.confirmation).toContainText(
      'We’ll e-mail joanna.adeyemi@example.com the day Jubilee launches, and not before.',
    );
    await expect(form.form).toHaveCount(0);
    await expect.poll(() => form.hasFocus(form.confirmation)).toBe(true);
  });

  test('AC6: a send that cannot reach Jubilee shows no error: the form says it is still sending and sends again', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    // Given every send fails on the way
    await jb.open('marketing-home.notify-retrying');
    const form = home.notifyForm;
    const sent = form.watch();
    await home.fillNotify();
    // When the visitor sends the form
    await form.send.click();
    // Then a notice, not an error, says it is still being sent
    await expect(form.alert).toContainText('Still sending.');
    await expect(form.alert).toContainText(
      'We couldn’t reach Jubilee just now. Keep this page open: we’ll keep trying, and what you typed is still here.',
    );
    await expect(form.alert).toHaveAttribute('role', 'status');
    await expect(form.alert).not.toContainText('We couldn’t add you to the list.');
    // And the form stays busy with everything typed
    await expect(form.send).toHaveAttribute('aria-busy', 'true');
    await expect(form.field('Email')).toHaveValue('joanna.adeyemi@example.com');
    await expect(form.field('Email')).toHaveAttribute('readonly', '');
    await expect(form.field('First name')).toHaveValue('Joanna');
    await expect(form.consent).toBeChecked();
    // And the same sign-up is sent again without the visitor pressing anything
    await expect.poll(sent, { timeout: 15_000 }).toBeGreaterThanOrEqual(2);
    await expect(form.alert).toContainText('Still sending.');
  });

  test('AC6: once Jubilee answers, the sign-up that was still sending is confirmed', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    // Given the first send fails on the way and the next is accepted
    await jb.open('marketing-home.notify-recovered');
    const form = home.notifyForm;
    const bodies = form.capture();
    await home.fillNotify();
    // When the visitor sends the form once
    await form.send.click();
    await expect(form.alert).toContainText('Still sending.');
    // Then the confirmation takes the place of the form by itself
    await expect(form.confirmationHeading).toHaveText('You’re on the list.', { timeout: 15_000 });
    await expect(form.confirmation).toContainText(
      'We’ll e-mail joanna.adeyemi@example.com the day Jubilee launches, and not before.',
    );
    await expect(form.form).toHaveCount(0);
    // And the same sign-up was sent both times
    expect(bodies()).toHaveLength(2);
    expect(bodies()[1]).toEqual(bodies()[0]);
  });

  test('AC7: too many sign-ups says when to try again and keeps everything typed', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    await jb.open('marketing-home.notify-rate-limited');
    await home.fillNotify();
    await home.notifyForm.send.click();
    await expect(home.notifyForm.alert).toHaveText(
      'You’re doing that a lot. Try again in 42 minutes.',
    );
    await expect(home.notifyForm.field('Email')).toHaveValue('joanna.adeyemi@example.com');
  });

  test('AC7: a bot challenge that was not passed says so and keeps everything typed', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    await jb.open('marketing-home.notify-challenge-failed');
    await home.fillNotify();
    await home.notifyForm.send.click();
    await expect(home.notifyForm.alert).toHaveText(
      'We couldn’t check that you’re not a robot. Wait a moment and try again.',
    );
    await expect(home.notifyForm.field('First name')).toHaveValue('Joanna');
    await expect(home.notifyForm.consent).toBeChecked();
  });

  test('AC7 and L2-218 AC5: with a bot challenge configured the sign-up carries its token', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    // Given the API names the site key of a bot challenge
    const loaded = await stubChallenge(page, ['token-1']);
    await stubLaunchChallenge(page);
    await jb.open('marketing-home');
    await home.fillNotify();
    // When the visitor sends the form
    const request = await home.notifyForm.sendAndCapture();
    // Then the token of the challenge goes with the sign-up
    expect(request.postDataJSON().challengeToken).toBe('token-1');
    expect(loaded()).toBe(1);
  });

  test('L2-218 AC5: without a site key the page loads no challenge and sends no token', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    const loaded = await stubChallenge(page, ['token-1']);
    await jb.open('marketing-home');
    await home.fillNotify();
    const request = await home.notifyForm.sendAndCapture();
    expect(request.postDataJSON().challengeToken).toBeNull();
    expect(loaded()).toBe(0);
  });

  test('AC7: after a challenge that was not passed, the next send carries a fresh token', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    // Given a bot challenge is configured and the API refuses the first token
    await stubChallenge(page, ['token-1', 'token-2']);
    await stubLaunchChallenge(page);
    await jb.open('marketing-home.notify-challenge-failed');
    const form = home.notifyForm;
    const bodies = form.capture();
    await home.fillNotify();
    // When the visitor sends the form, is refused and sends it again
    await form.send.click();
    await expect(form.alert).toHaveText(
      'We couldn’t check that you’re not a robot. Wait a moment and try again.',
    );
    await expect(form.summary).toHaveCount(0);
    await form.send.click();
    // Then the second send carries the fresh token the page asked for
    await expect.poll(() => bodies().length).toBe(2);
    expect(bodies().map((body) => (body as { challengeToken: string }).challengeToken)).toEqual([
      'token-1',
      'token-2',
    ]);
  });

  test('AC2: an address the server refuses is shown at its field, with the summary, and everything typed is kept', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    // Given the server finds the address invalid where the page did not
    await jb.open('marketing-home.notify-server-invalid');
    const form = home.notifyForm;
    await home.fillNotify();
    // When the visitor sends the form
    await form.send.click();
    // Then the summary names the field and takes the focus, and the field says how to fix it
    await expect(form.summaryLinks).toHaveText(['Enter a valid e-mail address']);
    await expect.poll(() => form.hasFocus(form.summary)).toBe(true);
    await expect(form.errorOf('Email')).toHaveText(
      'Enter a valid e-mail address, like name@example.com.',
    );
    await expect(form.field('Email')).toHaveAttribute('aria-invalid', 'true');
    // And the form can be changed again, with everything typed
    await expect(form.send).not.toHaveAttribute('aria-busy', 'true');
    await expect(form.field('Email')).toHaveValue('joanna.adeyemi@example.com');
    await expect(form.field('First name')).toHaveValue('Joanna');
    await expect(form.consent).toBeChecked();
  });

  test('AC6: a send that cannot be made shows no error: the form says it is still sending and sends again', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    // Given the connection fails before any answer
    await jb.open('marketing-home.notify-unreachable');
    const form = home.notifyForm;
    const sent = form.watch();
    await home.fillNotify();
    await form.send.click();
    // Then the form says it is still sending, stays busy and sends the same sign-up again
    await expect(form.alert).toContainText('Still sending.');
    await expect(form.send).toHaveAttribute('aria-busy', 'true');
    await expect(form.field('Email')).toHaveValue('joanna.adeyemi@example.com');
    await expect.poll(sent, { timeout: 15_000 }).toBeGreaterThanOrEqual(2);
  });

  test('AC6: a send not answered within 10 seconds shows no error, says it is still sending and is sent again 5 seconds later', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    // Given Jubilee does not answer
    await page.clock.install();
    await jb.open('marketing-home.notify-busy');
    const form = home.notifyForm;
    const sent = form.watch();
    await home.fillNotify();
    await form.send.click();
    // When 9 seconds pass, the form is only busy
    await page.clock.runFor(9_000);
    await expect(form.send).toHaveAttribute('aria-busy', 'true');
    await expect(form.alert).toHaveCount(0);
    // When the tenth second passes, it says it is still sending, and no error
    await page.clock.runFor(1_000);
    await expect(form.alert).toContainText('Still sending.');
    await expect(form.send).toHaveAttribute('aria-busy', 'true');
    expect(sent()).toBe(1);
    // And 5 seconds later the same sign-up is sent again
    await page.clock.runFor(5_000);
    await expect.poll(sent).toBe(2);
  });
});
