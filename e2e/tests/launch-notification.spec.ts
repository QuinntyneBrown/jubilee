import { expect, test } from '../fixtures/jb-test';
import { MarketingHomePage } from '../pages/marketing-home.page';

// The launch notification sign-up of the launching-soon marketing page (L2-217, ADR 0044). The
// answers come from the recording; the busy, failed, limited and refused states from stubs.

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

  test('AC6: a failed send says so and keeps everything typed', async ({ page, jb }) => {
    const home = new MarketingHomePage(page);
    await jb.open('marketing-home.notify-error');
    const form = home.notifyForm;
    await home.fillNotify();
    await form.send.click();
    await expect(form.alert).toContainText('We couldn’t add you to the list.');
    await expect(form.alert).toContainText(
      'Nothing is lost: what you typed is still here. Try again in a moment.',
    );
    await expect(form.alert).toHaveAttribute('role', 'alert');
    await expect(form.field('Email')).toHaveValue('joanna.adeyemi@example.com');
    await expect(form.field('First name')).toHaveValue('Joanna');
    await expect(form.consent).toBeChecked();
    await expect(form.send).not.toHaveAttribute('aria-busy', 'true');
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
});
