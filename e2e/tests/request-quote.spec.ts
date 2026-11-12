import { expect, test } from '../fixtures/jb-test';
import { stubQuote } from '../fixtures/quote';
import { joannaSession, keepDraft, stubSession } from '../fixtures/session';
import { BusinessPage } from '../pages/business.page';
import { RequestQuoteDialog } from '../pages/messages.page';
import { SignInRequiredDialog } from '../pages/sign-in-required.dialog';

const NEED = 'Two hundred tees and sixty mugs for our church’s 25th anniversary.';

test.describe('request a quote (L2-045)', () => {
  test('AC1: "Ask" on a service opens the dialog addressed to the business', async ({
    page,
    jb,
  }) => {
    const business = new BusinessPage(page);
    const dialog = new RequestQuoteDialog(page);
    await business.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubQuote(page);
    await jb.goto('/b/luzandre');

    await business.serviceRows
      .filter({ hasText: 'Custom design consultation' })
      .getByRole('link')
      .click();

    await expect(page).toHaveURL(/\/b\/luzandre\/quote\?service=[\w-]+$/);
    await expect(dialog.title).toHaveText('Ask Luzandre.com for a quote');
    await expect(dialog.description).toContainText(
      'Tell Naomi what you have in mind. There’s no obligation to buy.',
    );
    await expect(dialog.phoneHelp).toHaveText('Shared with Luzandre.com for this request only.');
    await expect(dialog.what).toBeFocused();

    await dialog.what.fill(NEED);
    await dialog.send.click();
    await expect(dialog.title).toHaveText('Quote request sent to Luzandre.com');
    expect(fake.sends[0].serviceId).toMatch(/^[\w-]{8,}$/);
  });

  test('a visitor is asked to join first', async ({ page, jb }) => {
    const business = new BusinessPage(page);
    const prompt = new SignInRequiredDialog(page);
    await business.setWidth(1280);
    await stubQuote(page);
    await jb.goto('/b/luzandre');
    await expect(business.heading).toHaveText('Luzandre.com');

    await business.serviceRows
      .filter({ hasText: 'Custom design consultation' })
      .getByRole('link')
      .click();

    await expect(prompt.title).toHaveText('Join to ask Luzandre.com for a quote');
    await expect(prompt.joinFree).toHaveAttribute(
      'href',
      /^\/join\?returnUrl=%2Fb%2Fluzandre%2Fquote%3Fservice%3D[\w-]+$/,
    );
  });

  test('AC2: sending with nothing described names what is missing and focuses it', async ({
    page,
    jb,
  }) => {
    const dialog = new RequestQuoteDialog(page);
    await new BusinessPage(page).setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubQuote(page);
    await jb.goto('/b/luzandre/quote');

    await dialog.send.click();

    await expect(dialog.fieldError).toHaveText(
      'Describe what you need in a sentence or two so Naomi can price it.',
    );
    await expect(dialog.what).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.what).toBeFocused();
    expect(fake.sends).toHaveLength(0);
  });

  test('AC3: a phone that is not 10 digits is refused and what was typed is kept', async ({
    page,
    jb,
  }) => {
    const dialog = new RequestQuoteDialog(page);
    await new BusinessPage(page).setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubQuote(page);
    await jb.goto('/b/luzandre/quote');
    await dialog.what.fill(NEED);
    await dialog.phone.fill('416-555-01');

    await dialog.send.click();

    await expect(dialog.fieldError).toHaveText(
      'Enter a 10-digit phone number, like 416-555-0142, or leave it empty.',
    );
    await expect(dialog.phone).toBeFocused();
    await expect(dialog.what).toHaveValue(NEED);
    expect(fake.sends).toHaveLength(0);
  });

  test('L2-126 AC2, AC6: each field says whether it is required and a message is tied to its field', async ({
    page,
    jb,
  }) => {
    const dialog = new RequestQuoteDialog(page);
    await new BusinessPage(page).setWidth(1280);
    await jb.signInAs('member');
    await stubQuote(page);
    await jb.goto('/b/luzandre/quote');

    await expect(dialog.labels).toHaveText([
      'What do you need? (required)',
      'Needed by (optional)',
      'Budget (optional)',
      'Phone (optional)',
    ]);

    await dialog.phone.fill('416-555-01');
    await dialog.send.click();

    await expect(dialog.fieldError).toHaveCount(2);
    await expect(dialog.what).toHaveAccessibleDescription(
      'Describe what you need in a sentence or two so Naomi can price it.',
    );
    await expect(dialog.phone).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.phone).toHaveAccessibleDescription(
      /Enter a 10-digit phone number, like 416-555-0142, or leave it empty\./,
    );
    await expect(dialog.phone).toHaveValue('416-555-01');
    await expect(dialog.what).toBeFocused();
  });

  test('AC4: a date in the past is refused', async ({ page, jb }) => {
    const dialog = new RequestQuoteDialog(page);
    await new BusinessPage(page).setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubQuote(page);
    await jb.goto('/b/luzandre/quote');
    await dialog.what.fill(NEED);
    await dialog.neededBy.fill('2020-01-01');

    await dialog.send.click();

    await expect(dialog.fieldError).toHaveText('Choose a date from today on.');
    expect(fake.sends).toHaveLength(0);
  });

  test('AC5: sending shows where it went and what to expect', async ({ page, jb }) => {
    const dialog = new RequestQuoteDialog(page);
    await new BusinessPage(page).setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubQuote(page);
    await jb.goto('/b/luzandre/quote');

    await dialog.what.fill(NEED);
    await dialog.neededBy.fill('2027-02-14');
    await dialog.budget.fill('About $4,000');
    await dialog.phone.fill('416-555-0142');
    await dialog.send.click();

    await expect(dialog.title).toHaveText('Quote request sent to Luzandre.com');
    await expect(dialog.description).toContainText(
      'Naomi usually replies within a few hours. Naomi’s quote arrives in your messages.',
    );
    await expect(dialog.viewRequest).toHaveAttribute('href', '/requests/r-quote');
    expect(fake.sends).toHaveLength(1);
    expect(fake.sends[0]).toMatchObject({
      listingSlug: 'luzandre',
      serviceId: null,
      description: NEED,
      neededBy: '2027-02-14',
      budget: 'About $4,000',
      phone: '416-555-0142',
    });
    expect(fake.sends[0].idempotencyKey).toMatch(/^[\w-]{8,}$/);
  });

  test('AC7: the phone of the profile is already filled in and is sent as it is', async ({
    page,
    jb,
  }) => {
    const dialog = new RequestQuoteDialog(page);
    await new BusinessPage(page).setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubQuote(page, { phone: '416-555-0142' });
    await jb.goto('/b/luzandre/quote');

    await expect(dialog.phone).toHaveValue('416-555-0142');
    await expect(dialog.phone).toBeEditable();
    await expect(dialog.what).toBeFocused();

    await dialog.what.fill(NEED);
    await dialog.send.click();

    await expect(dialog.title).toHaveText('Quote request sent to Luzandre.com');
    expect(fake.sends[0].phone).toBe('416-555-0142');
    expect(fake.accountWrites).toEqual([]);
  });

  test('AC7: a phone changed in the dialog goes with the request and the profile is not written', async ({
    page,
    jb,
  }) => {
    const dialog = new RequestQuoteDialog(page);
    await new BusinessPage(page).setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubQuote(page, { phone: '416-555-0142' });
    await jb.goto('/b/luzandre/quote');
    await expect(dialog.phone).toHaveValue('416-555-0142');
    await dialog.what.fill(NEED);

    await dialog.phone.fill('647-555-0199');
    await dialog.send.click();

    await expect(dialog.title).toHaveText('Quote request sent to Luzandre.com');
    expect(fake.sends[0].phone).toBe('647-555-0199');
    expect(fake.accountWrites).toEqual([]);
  });

  test('AC7: a phone cleared in the dialog is not sent, by keyboard alone', async ({
    page,
    jb,
  }) => {
    const dialog = new RequestQuoteDialog(page);
    await new BusinessPage(page).setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubQuote(page, { phone: '416-555-0142' });
    await jb.goto('/b/luzandre/quote');
    await expect(dialog.what).toBeFocused();
    await expect(dialog.phone).toHaveValue('416-555-0142');

    await page.keyboard.type(NEED);
    await dialog.tabTo(dialog.phone);
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Delete');
    await page.keyboard.press('Enter');

    await expect(dialog.title).toHaveText('Quote request sent to Luzandre.com');
    expect(fake.sends[0].phone).toBeNull();
    expect(fake.accountWrites).toEqual([]);
  });

  test('AC7: a member with no phone in the profile finds the field empty', async ({ page, jb }) => {
    const dialog = new RequestQuoteDialog(page);
    await new BusinessPage(page).setWidth(1280);
    await jb.signInAs('member');
    await stubQuote(page, { phone: null });
    await jb.goto('/b/luzandre/quote');

    await expect(dialog.what).toBeFocused();
    await expect(dialog.phone).toHaveValue('');
  });

  for (const [kept, what] of [
    ['647-555-0199', 'another number'],
    ['', 'no number'],
  ]) {
    test(`AC7: a draft that kept ${what} is restored over the phone of the profile`, async ({
      page,
      jb,
    }) => {
      const dialog = new RequestQuoteDialog(page);
      await new BusinessPage(page).setWidth(1280);
      await stubSession(page, { signedIn: true });
      await keepDraft(page, {
        email: joannaSession.email,
        address: '/b/luzandre/quote',
        key: 'quote',
        values: { description: NEED, neededBy: '', budget: '', phone: kept },
      });
      await stubQuote(page, { phone: '416-555-0142' });
      await jb.goto('/b/luzandre/quote');

      await expect(dialog.what).toHaveValue(NEED);
      await expect(dialog.phone).toHaveValue(kept);
    });
  }

  test('without a known reply time the dialog says it will reply', async ({ page, jb }) => {
    const dialog = new RequestQuoteDialog(page);
    await new BusinessPage(page).setWidth(1280);
    await jb.signInAs('member');
    await stubQuote(page, { usuallyReplies: null });
    await jb.goto('/b/luzandre/quote');
    await dialog.what.fill(NEED);

    await dialog.send.click();

    await expect(dialog.description).toContainText('Naomi will reply with a quote.');
  });

  test('AC6: the description stops at 2,000 characters and the budget at 60', async ({
    page,
    jb,
  }) => {
    const dialog = new RequestQuoteDialog(page);
    await new BusinessPage(page).setWidth(1280);
    await jb.signInAs('member');
    await stubQuote(page);
    await jb.goto('/b/luzandre/quote');

    await expect(dialog.what).toHaveAttribute('maxlength', '2000');
    await expect(dialog.budget).toHaveAttribute('maxlength', '60');
  });

  test('while sending the dialog is busy and cannot be sent twice', async ({ page, jb }) => {
    const dialog = new RequestQuoteDialog(page);
    await new BusinessPage(page).setWidth(1280);
    await jb.signInAs('member');
    await stubQuote(page, { delivery: 'hang' });
    await jb.goto('/b/luzandre/quote');
    await dialog.what.fill(NEED);

    await dialog.send.click();

    await expect(dialog.send).toHaveAttribute('aria-busy', 'true');
    await expect(dialog.cancel).toBeDisabled();
    await expect(dialog.what).toHaveAttribute('readonly', '');
  });

  test('a failure keeps what was typed and a retry sends once', async ({ page, jb }) => {
    const dialog = new RequestQuoteDialog(page);
    await new BusinessPage(page).setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubQuote(page, { delivery: 'fail' });
    await jb.goto('/b/luzandre/quote');
    await dialog.what.fill(NEED);

    await dialog.send.click();

    await expect(dialog.alert).toContainText('We couldn’t send that');
    await expect(dialog.what).toHaveValue(NEED);

    fake.delivery = 'ok';
    await dialog.send.click();
    await expect(dialog.title).toHaveText('Quote request sent to Luzandre.com');
    expect(fake.sends).toHaveLength(1);
  });

  test('an unconfirmed e-mail is told to confirm first', async ({ page, jb }) => {
    const dialog = new RequestQuoteDialog(page);
    await new BusinessPage(page).setWidth(1280);
    await jb.signInAs('member');
    await stubQuote(page, { delivery: 'unconfirmed' });
    await jb.goto('/b/luzandre/quote');
    await dialog.what.fill(NEED);

    await dialog.send.click();

    await expect(dialog.alert).toContainText('Confirm your e-mail first');
  });

  test('the server’s field codes are shown under their fields', async ({ page, jb }) => {
    const dialog = new RequestQuoteDialog(page);
    await new BusinessPage(page).setWidth(1280);
    await jb.signInAs('member');
    await stubQuote(page, { delivery: 'invalid' });
    await jb.goto('/b/luzandre/quote');
    await dialog.what.fill(NEED);

    await dialog.send.click();

    await expect(dialog.fieldError).toHaveText([
      'Choose a date from today on.',
      'Enter a 10-digit phone number, like 416-555-0142, or leave it empty.',
    ]);
    await expect(dialog.neededBy).toBeFocused();
  });
});
