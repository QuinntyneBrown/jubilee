import { stubChallenge, stubLaunchChallenge } from '../fixtures/bot-challenge';
import { expect, test } from '../fixtures/jb-test';
import { MarketingHomePage, naomiDetails } from '../pages/marketing-home.page';

// The business pre-registration of the launching-soon marketing page (L2-216, ADR 0044). The
// answers come from the recording; the busy, failed, limited and refused states from stubs.

test.describe('business pre-registration (L2-216)', () => {
  test('AC1: the form asks for the business, its owner and consent, and says it lists nothing', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    await jb.open('marketing-home');
    const form = home.businessForm;
    await expect(form.labels).toHaveText([
      'Business name (required)',
      'Your name (required)',
      'Email (required)',
      'Phone (optional)',
      'Category (required)',
      'Area of Toronto (required)',
      'Website or social link (optional)',
      'About your business (required)',
    ]);
    // The categories are the eleven of the directory, after "Choose a category"
    await expect(form.field('Category').locator('option')).toHaveText([
      'Choose a category',
      'Shops',
      'Rooms & rentals',
      'Financial & insurance',
      'Legal & immigration',
      'Home & property',
      'Real estate & living',
      'Health & family',
      'Business & tech',
      'Learning',
      'Media',
      'Community',
    ]);
    await expect(form.form).toContainText(
      'The neighbourhood you work from or serve, for example Leslieville.',
    );
    await expect(form.form).toContainText(
      'One or two sentences: what you offer and who it is for.',
    );
    await expect(form.form).toContainText(
      'Yes, the Jubilee team may contact me about listing this business. I can ask to stop at any time.',
    );
    await expect(form.send).toBeVisible();
    await expect(form.note).toHaveText(
      'We use these details only to prepare your listing and to contact you about it. We never sell data.',
    );
  });

  test('AC2: sent empty, it lists the seven things to fix, moves focus there and sends nothing', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    await jb.open('marketing-home');
    const form = home.businessForm;
    const sent = form.watch();
    await form.send.click();
    await expect(form.summary).toContainText('Fix 7 things to continue');
    await expect(form.summaryLinks).toHaveText([
      'Enter your business’s name',
      'Enter your name',
      'Enter a valid e-mail address',
      'Choose a category',
      'Enter the area of Toronto you work in',
      'Describe your business in a sentence or two',
      'Say yes so that we may contact you',
    ]);
    await expect.poll(() => form.hasFocus(form.summary)).toBe(true);
    await expect(form.fieldErrors).toHaveText([
      'Enter your business’s name.',
      'Enter your name.',
      'Enter your e-mail address.',
      'Choose a category.',
      'Enter the area of Toronto you work in.',
      'Describe your business in a sentence or two.',
      'Tick the box so that we may contact you.',
    ]);
    await expect(form.field('Business name')).toHaveAttribute('aria-invalid', 'true');
    expect(sent()).toBe(0);
    await form.summaryLinks.nth(3).click();
    await expect(form.field('Category')).toBeFocused();
  });

  test('AC3: an e-mail, a phone number or a website that is not one is refused in the browser', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    await jb.open('marketing-home');
    await home.fillBusiness({
      ...naomiDetails,
      email: 'naomi@',
      phone: '555-0142',
      website: 'not a site',
    });
    await home.businessForm.send.click();
    await expect(home.businessForm.errorOf('Email')).toHaveText(
      'Enter a valid e-mail address, like name@example.com.',
    );
    await expect(home.businessForm.errorOf('Phone')).toHaveText(
      'Enter a 10-digit phone number, or leave this empty.',
    );
    await expect(home.businessForm.errorOf('Website or social link')).toHaveText(
      'Enter a web address, like example.com, or leave this empty.',
    );
    await expect(home.businessForm.summaryLinks).toHaveText([
      'Enter a valid e-mail address',
      'Enter a 10-digit phone number',
      'Enter a web address',
    ]);
  });

  test('AC4: while it is sent the button is busy, the fields are read-only and a second press sends nothing', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    await jb.open('marketing-home.business-busy');
    const form = home.businessForm;
    const sent = form.watch();
    await home.fillBusiness();
    await form.send.click();
    await expect(form.send).toHaveAttribute('aria-busy', 'true');
    await expect(form.send).toHaveText('Send my details');
    await expect(form.field('Business name')).toHaveAttribute('readonly', '');
    await expect(form.field('About your business')).toHaveAttribute('readonly', '');
    await expect(form.field('Category')).toBeDisabled();
    await expect(form.consent).toBeDisabled();
    await form.send.click({ force: true });
    expect(sent()).toBe(1);
  });

  test('AC5 and AC9: valid details are sent with consent, and a confirmation that takes focus says what happens next', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    await jb.open('marketing-home');
    const form = home.businessForm;
    await home.fillBusiness();
    const request = await form.sendAndCapture();
    expect(request.postDataJSON()).toEqual({
      businessName: 'Luzandre.com',
      contactName: 'Naomi Laurent',
      email: 'naomi@luzandre.com',
      phone: '416-555-0142',
      category: 'shops',
      area: 'Leslieville',
      website: 'luzandre.com',
      description: 'Custom Christian apparel, artworks and gifts, made in Toronto.',
      consent: true,
      challengeToken: null,
    });
    await expect(form.confirmationHeading).toHaveText('Thank you. We have your details.');
    await expect(form.confirmation).toContainText(
      'The Jubilee team will be in touch at naomi@luzandre.com before launch. Your business is not listed yet.',
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
    await jb.open('marketing-home.business-retrying');
    const form = home.businessForm;
    const sent = form.watch();
    await home.fillBusiness();
    // When the owner sends the form
    await form.send.click();
    // Then a notice, not an error, says it is still being sent, and the form stays busy
    await expect(form.alert).toContainText('Still sending.');
    await expect(form.alert).toContainText(
      'We couldn’t reach Jubilee just now. Keep this page open: we’ll keep trying, and what you typed is still here.',
    );
    await expect(form.alert).toHaveAttribute('role', 'status');
    await expect(form.alert).not.toContainText('We couldn’t send your details.');
    await expect(form.send).toHaveAttribute('aria-busy', 'true');
    // And the same details are sent again without the owner pressing anything
    await expect.poll(sent, { timeout: 15_000 }).toBeGreaterThanOrEqual(2);
    // And every value typed is kept
    await expect(form.field('Business name')).toHaveValue('Luzandre.com');
    await expect(form.field('Your name')).toHaveValue('Naomi Laurent');
    await expect(form.field('Email')).toHaveValue('naomi@luzandre.com');
    await expect(form.field('Phone')).toHaveValue('416-555-0142');
    await expect(form.field('Category')).toHaveValue('shops');
    await expect(form.field('Area of Toronto')).toHaveValue('Leslieville');
    await expect(form.field('Website or social link')).toHaveValue('luzandre.com');
    await expect(form.field('About your business')).toHaveValue(naomiDetails.description);
    await expect(form.consent).toBeChecked();
  });

  test('AC6: once Jubilee answers, the details that were still sending are confirmed', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    // Given the first send fails on the way and the next is accepted
    await jb.open('marketing-home.business-recovered');
    const form = home.businessForm;
    const bodies = form.capture();
    await home.fillBusiness();
    // When the owner sends the form once
    await form.send.click();
    await expect(form.alert).toContainText('Still sending.');
    // Then the confirmation takes the place of the form by itself
    await expect(form.confirmationHeading).toHaveText('Thank you. We have your details.', {
      timeout: 15_000,
    });
    await expect(form.form).toHaveCount(0);
    // And the same details were sent both times
    expect(bodies()).toHaveLength(2);
    expect(bodies()[1]).toEqual(bodies()[0]);
  });

  test('AC7: too many pre-registrations says when to try again and keeps every value', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    await jb.open('marketing-home.business-rate-limited');
    await home.fillBusiness();
    await home.businessForm.send.click();
    await expect(home.businessForm.alert).toHaveText(
      'You’re doing that a lot. Try again in 42 minutes.',
    );
    await expect(home.businessForm.field('Business name')).toHaveValue('Luzandre.com');
  });

  test('AC8: a bot challenge that was not passed says so and keeps every value', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    await jb.open('marketing-home.business-challenge-failed');
    await home.fillBusiness();
    await home.businessForm.send.click();
    await expect(home.businessForm.alert).toHaveText(
      'We couldn’t check that you’re not a robot. Wait a moment and try again.',
    );
    await expect(home.businessForm.field('About your business')).toHaveValue(
      naomiDetails.description,
    );
  });

  test('AC8 and L2-218 AC5: with a bot challenge configured the details carry its token', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    const loaded = await stubChallenge(page, ['token-1']);
    await stubLaunchChallenge(page);
    await jb.open('marketing-home');
    await home.fillBusiness();
    const request = await home.businessForm.sendAndCapture();
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
    await home.fillBusiness();
    const request = await home.businessForm.sendAndCapture();
    expect(request.postDataJSON().challengeToken).toBeNull();
    expect(loaded()).toBe(0);
  });

  test('AC8: after a challenge that was not passed, the next send carries a fresh token', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    await stubChallenge(page, ['token-1', 'token-2']);
    await stubLaunchChallenge(page);
    await jb.open('marketing-home.business-challenge-failed');
    const form = home.businessForm;
    const bodies = form.capture();
    await home.fillBusiness();
    await form.send.click();
    await expect(form.alert).toHaveText(
      'We couldn’t check that you’re not a robot. Wait a moment and try again.',
    );
    await expect(form.summary).toHaveCount(0);
    await form.send.click();
    await expect.poll(() => bodies().length).toBe(2);
    expect(bodies().map((body) => (body as { challengeToken: string }).challengeToken)).toEqual([
      'token-1',
      'token-2',
    ]);
  });

  test('AC3: a category or a website the server refuses is shown at its field, with the summary, and every value is kept', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    // Given the server refuses the category and the website with their codes
    await jb.open('marketing-home.business-server-invalid');
    const form = home.businessForm;
    await home.fillBusiness();
    // When the owner sends the form
    await form.send.click();
    // Then the summary names both, in the order of the form, and takes the focus
    await expect(form.summaryLinks).toHaveText(['Choose a category', 'Enter a web address']);
    await expect.poll(() => form.hasFocus(form.summary)).toBe(true);
    // And each field says how to fix it
    await expect(form.errorOf('Category')).toHaveText('Choose a category.');
    await expect(form.errorOf('Website or social link')).toHaveText(
      'Enter a web address, like example.com, or leave this empty.',
    );
    // And every value typed is kept, and can be changed again
    await expect(form.send).not.toHaveAttribute('aria-busy', 'true');
    await expect(form.field('Business name')).toHaveValue('Luzandre.com');
    await expect(form.field('Website or social link')).toHaveValue('luzandre.com');
    await expect(form.field('About your business')).toHaveValue(naomiDetails.description);
    await expect(form.consent).toBeChecked();
  });

  test('AC6: a send that cannot be made shows no error: the form says it is still sending and sends again', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    await jb.open('marketing-home.business-unreachable');
    const form = home.businessForm;
    const sent = form.watch();
    await home.fillBusiness();
    await form.send.click();
    await expect(form.alert).toContainText('Still sending.');
    await expect(form.send).toHaveAttribute('aria-busy', 'true');
    await expect(form.field('Business name')).toHaveValue('Luzandre.com');
    await expect.poll(sent, { timeout: 15_000 }).toBeGreaterThanOrEqual(2);
  });

  test('AC6: details not answered within 10 seconds show no error, say they are still sending and are sent again 5 seconds later', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    await page.clock.install();
    await jb.open('marketing-home.business-busy');
    const form = home.businessForm;
    const sent = form.watch();
    await home.fillBusiness();
    await form.send.click();
    await page.clock.runFor(9_000);
    await expect(form.alert).toHaveCount(0);
    await page.clock.runFor(1_000);
    await expect(form.alert).toContainText('Still sending.');
    await expect(form.send).toHaveAttribute('aria-busy', 'true');
    expect(sent()).toBe(1);
    await page.clock.runFor(5_000);
    await expect.poll(sent).toBe(2);
  });
});
