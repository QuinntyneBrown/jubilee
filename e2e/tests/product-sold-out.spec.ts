import { expect, test } from '../fixtures/jb-test';
import { fulfil, recordedAnswer } from '../fixtures/mock-api';
import { ProductPage } from '../pages/product.page';
import { SignInRequiredDialog } from '../pages/sign-in-required.dialog';

// Sold out and back-in-stock alerts: L2-036. The seeded tee is in stock, so the sold-out state is
// the API's answer for a product with stock 0 in every size.

const teePath = '/b/luzandre/p/faith-heavyweight-tee-charcoal';

test.describe('sold-out product (L2-036)', () => {
  test('AC1: it shows "Sold out", the restock note, disabled sizes and quantity, and "Tell me when it’s back"', async ({
    page,
    jb,
  }) => {
    const product = new ProductPage(page);
    await jb.open('product.sold-out');

    await expect(product.mediaTag).toHaveText('Sold out');
    await expect(product.soldOutAlert).toHaveRole('status');
    await expect(product.soldOutAlert.locator('.alert__title')).toHaveText(
      'Sold out in every size',
    );
    await expect(product.soldOutAlert).toContainText('Naomi prints the next batch on Mon 23 Nov.');
    for (const size of ['S', 'M', 'L', 'XL', '2XL']) {
      await expect(product.option(size)).toBeDisabled();
    }
    await expect(product.quantity).toBeDisabled();
    await expect(product.requestButton).toHaveCount(0);
    await expect(product.paymentNote).toHaveCount(0);
    await expect(product.alertButton).toBeEnabled();
    await expect(product.messageLink).toHaveAccessibleName('Message Luzandre.com');
  });

  test('AC1: a product without options sold out says only "Sold out"', async ({ page, jb }) => {
    const product = new ProductPage(page);
    await page.route(
      '**/api/listings/luzandre/products/gold-cross-stoneware-mug',
      async (route) => {
        const answer = await recordedAnswer(route);
        const mug = answer.body as Record<string, unknown>;
        await fulfil(route, { ...answer, body: { ...mug, soldOut: true, maxQuantity: 0 } });
      },
    );
    await jb.goto('/b/luzandre/p/gold-cross-stoneware-mug');

    await expect(product.soldOutAlert.locator('.alert__title')).toHaveText('Sold out');
    await expect(product.optionGroup).toHaveCount(0);
    await expect(product.alertButton).toBeVisible();
  });

  test('AC2: a member presses "Tell me when it’s back" and is told they will hear', async ({
    page,
    jb,
  }) => {
    const product = new ProductPage(page);
    await jb.open('product.sold-out');
    const asked = page.waitForRequest(
      (request) =>
        request.method() === 'PUT' && /\/api\/products\/[^/]+\/stock-alert$/.test(request.url()),
    );

    await product.alertButton.click();

    await asked;
    await expect(product.alertStatus).toHaveText('We’ll tell you when it’s back');
    await expect(product.alertStatus).toHaveRole('status');
    await expect(product.alertButton).toHaveCount(0);
  });

  test('AC2: a member who already asked sees that they will hear', async ({ page, jb }) => {
    const product = new ProductPage(page);
    await jb.open('product.alert-requested');

    await expect(product.alertStatus).toHaveText('We’ll tell you when it’s back');
    await expect(product.alertButton).toHaveCount(0);
  });

  test('AC2 and L2-012: a visitor is asked to join or sign in first', async ({ page, jb }) => {
    const product = new ProductPage(page);
    const dialog = new SignInRequiredDialog(page);
    await jb.open('product.sold-out', { who: 'visitor' });

    await product.alertButton.click();

    await expect(dialog.root).toHaveAccessibleName('Join to be told when it’s back');
    await expect(dialog.description).toHaveText(
      'Jubilee is free. An account lets businesses reply to you and keeps your bookings in one place. We’ll bring you straight back here.',
    );
    await expect(dialog.joinFree).toBeFocused();
    await expect(dialog.signIn).toHaveAttribute(
      'href',
      `/sign-in?returnUrl=${encodeURIComponent(teePath)}`,
    );
    await expect(dialog.joinFree).toHaveAttribute(
      'href',
      `/join?returnUrl=${encodeURIComponent(teePath)}`,
    );

    await page.keyboard.press('Escape');
    await expect(dialog.root).toHaveCount(0);
    await expect(product.alertButton).toBeFocused();
  });
});
