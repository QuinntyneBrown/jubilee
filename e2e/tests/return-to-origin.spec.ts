import { stubBooking } from '../fixtures/booking';
import { expect, test } from '../fixtures/jb-test';
import { stubOrder } from '../fixtures/order';
import { stubQuote } from '../fixtures/quote';
import { stubSaved } from '../fixtures/saved';
import { PASSWORD, stubSession } from '../fixtures/session';
import { BusinessPage } from '../pages/business.page';
import {
  BookMeetingDialog,
  NewMessageDialog,
  RequestItemDialog,
  RequestQuoteDialog,
} from '../pages/messages.page';
import { ProductPage } from '../pages/product.page';
import { SignInRequiredDialog } from '../pages/sign-in-required.dialog';
import { SignInPage } from '../pages/sign-in.page';
import { Toasts } from '../pages/toasts';

// The sign-in prompt and return to origin (L2-012 AC2, AC4): a visitor starts an action, signs in
// from the prompt and is brought back with the action carried on. The started action travels in
// the return path (ADR 0046).

const EMAIL = 'joanna.adeyemi@example.com';

test.describe('the action a visitor started opens after sign-in (L2-012)', () => {
  test('AC2: "Message" brings the visitor back to the listing with the message dialog open', async ({
    page,
    jb,
  }) => {
    const business = new BusinessPage(page);
    const prompt = new SignInRequiredDialog(page);
    const signIn = new SignInPage(page);
    const dialog = new NewMessageDialog(page);
    await business.setWidth(1280);
    const session = await stubSession(page);
    await jb.goto('/b/legacy-financial');

    await business.messageLink.click();
    await expect(prompt.title).toHaveText('Join to message Legacy Financial');
    await prompt.signIn.click();
    await signIn.signInWith(EMAIL, PASSWORD);

    await expect(dialog.title).toHaveText('Message Legacy Financial');
    await expect(dialog.message).toBeFocused();
    await expect(page).toHaveURL(/\/b\/legacy-financial\/message$/);
    expect(session.signIns).toHaveLength(1);
  });

  test('AC2: "Book" brings the visitor back with the booking dialog open', async ({ page, jb }) => {
    const business = new BusinessPage(page);
    const prompt = new SignInRequiredDialog(page);
    const dialog = new BookMeetingDialog(page);
    await business.setWidth(1280);
    await stubSession(page);
    await stubBooking(page);
    await jb.goto('/b/legacy-financial');

    await business.bookLink.click();
    await expect(prompt.title).toHaveText('Join to book Legacy Financial');
    await prompt.signIn.click();
    await new SignInPage(page).signInWith(EMAIL, PASSWORD);

    await expect(dialog.title).toHaveText('Book a meeting with Legacy Financial');
    await expect(dialog.service).toContainText('Discovery meeting');
    await expect(page).toHaveURL(/\/b\/legacy-financial\/book$/);
  });

  test('AC2: "Ask for a quote" brings the visitor back with the quote dialog open for the service they chose', async ({
    page,
    jb,
  }) => {
    const business = new BusinessPage(page);
    const prompt = new SignInRequiredDialog(page);
    const dialog = new RequestQuoteDialog(page);
    await business.setWidth(1280);
    await stubSession(page);
    await stubQuote(page);
    await jb.goto('/b/luzandre');

    await business.serviceRows
      .filter({ hasText: 'Custom design consultation' })
      .getByRole('link')
      .click();
    await expect(prompt.title).toHaveText('Join to ask Luzandre.com for a quote');
    await prompt.signIn.click();
    await new SignInPage(page).signInWith(EMAIL, PASSWORD);

    await expect(dialog.what).toBeVisible();
    await expect(dialog.title).toContainText('Luzandre.com');
    await expect(page).toHaveURL(/\/b\/luzandre\/quote\?service=[\w-]+$/);
  });

  test('AC2: "Request this item" brings the visitor back with the order request open for the size they chose', async ({
    page,
    jb,
  }) => {
    const product = new ProductPage(page);
    const prompt = new SignInRequiredDialog(page);
    const dialog = new RequestItemDialog(page);
    await product.setWidth(1280);
    await stubSession(page);
    await stubOrder(page);
    await jb.goto('/b/luzandre/p/faith-heavyweight-tee-charcoal');
    await product.choose('M');

    await product.requestButton.click();
    await expect(prompt.title).toHaveText('Join to request Faith heavyweight tee, charcoal');
    await prompt.signIn.click();
    await new SignInPage(page).signInWith(EMAIL, PASSWORD);

    await expect(dialog.title).toHaveText('Request this item');
    await expect(dialog.summary).toContainText('Size M × 1');
  });

  test('AC4: "Save" is carried out after sign-in, once, and the heart shows it', async ({
    page,
    jb,
  }) => {
    const business = new BusinessPage(page);
    const prompt = new SignInRequiredDialog(page);
    const toasts = new Toasts(page);
    await business.setWidth(1280);
    await stubSession(page);
    const saved = await stubSaved(page, { items: [] });
    await jb.goto('/b/luzandre');

    await business.saveButton.click();
    await expect(prompt.title).toHaveText('Join to save Luzandre.com');
    await prompt.signIn.click();
    await new SignInPage(page).signInWith(EMAIL, PASSWORD);

    await expect(
      toasts.withTitle('Saved Luzandre.com. Find it any time under Saved.'),
    ).toBeVisible();
    await expect(business.saveButton).toHaveAttribute('aria-pressed', 'true');
    await expect(page).toHaveURL(/\/b\/luzandre$/);
    expect(saved.calls).toEqual(['PUT businesses/luzandre']);
  });
});
