import { expect, test } from '../fixtures/jb-test';
import { PICKUP_ID, SHIP_ID, stubOrder } from '../fixtures/order';
import { RequestItemDialog } from '../pages/messages.page';
import { ProductPage } from '../pages/product.page';
import { SignInRequiredDialog } from '../pages/sign-in-required.dialog';

const tee = '/b/luzandre/p/faith-heavyweight-tee-charcoal';

test.describe('request a product (L2-046)', () => {
  test('AC1: "Request this item" opens the dialog with the item, the options and the delivery methods', async ({
    page,
    jb,
  }) => {
    const product = new ProductPage(page);
    const dialog = new RequestItemDialog(page);
    await product.setWidth(1280);
    await jb.signInAs('member');
    await stubOrder(page);
    await jb.goto(tee);
    await product.choose('M');

    await product.requestButton.click();

    await expect(page).toHaveURL(`${tee}/request?option=M&quantity=1`);
    await expect(dialog.title).toHaveText('Request this item');
    await expect(dialog.description).toHaveText(
      'No payment now. Luzandre.com confirms and you pay them directly.',
    );
    await expect(dialog.summary).toContainText('Faith heavyweight tee, charcoal');
    await expect(dialog.summary).toContainText('Size M × 1');
    await expect(dialog.summary).toContainText('$34');
    await expect(dialog.methods).toHaveCount(2);
    await expect(dialog.method('Ship to me')).toContainText(
      'Canada Post, $9 flat · 3–6 business days',
    );
    await expect(dialog.method('Pick up in Leslieville')).toContainText('Free');
  });

  test('a visitor is asked to join first', async ({ page, jb }) => {
    const product = new ProductPage(page);
    const prompt = new SignInRequiredDialog(page);
    await product.setWidth(1280);
    await stubOrder(page);
    await jb.goto(tee);
    await product.choose('M');

    await product.requestButton.click();

    await expect(prompt.title).toHaveText('Join to request Faith heavyweight tee, charcoal');
    await expect(prompt.joinFree).toHaveAttribute(
      'href',
      /^\/join\?returnUrl=%2Fb%2Fluzandre%2Fp%2F/,
    );
  });

  test('AC2: shipping asks for an address, prefilled from the last one used', async ({
    page,
    jb,
  }) => {
    const dialog = new RequestItemDialog(page);
    await new ProductPage(page).setWidth(1280);
    await jb.signInAs('member');
    await stubOrder(page);
    await jb.goto(`${tee}/request?option=M&quantity=1`);

    await expect(dialog.address).toHaveValue('48 Woodmount Ave, East York, ON M4C 3X8');

    await dialog.address.fill('');
    await dialog.send.click();

    await expect(dialog.fieldError).toHaveText('Enter the address to ship to, with postal code.');
    await expect(dialog.address).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.address).toBeFocused();
  });

  test('AC2: an address without a postal code is refused', async ({ page, jb }) => {
    const dialog = new RequestItemDialog(page);
    const fake = await stubOrder(page);
    await new ProductPage(page).setWidth(1280);
    await jb.signInAs('member');
    await jb.goto(`${tee}/request?option=M&quantity=1`);

    await dialog.address.fill('48 Woodmount Ave, East York');
    await dialog.send.click();

    await expect(dialog.fieldError).toHaveText('Enter the address to ship to, with postal code.');
    expect(fake.sends).toHaveLength(0);
  });

  test('AC3: pickup hides the address and does not send it', async ({ page, jb }) => {
    const dialog = new RequestItemDialog(page);
    await new ProductPage(page).setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubOrder(page);
    await jb.goto(`${tee}/request?option=M&quantity=1`);

    await dialog.method('Pick up in Leslieville').click();

    await expect(dialog.address).toHaveCount(0);
    await dialog.send.click();
    await expect(dialog.title).toHaveText('Request sent to Luzandre.com');
    expect(fake.sends[0].deliveryMethodId).toBe(PICKUP_ID);
    expect(fake.sends[0].shippingAddress).toBeNull();
  });

  test('AC4: the estimate follows the delivery choice and the shop’s free-shipping threshold', async ({
    page,
    jb,
  }) => {
    const dialog = new RequestItemDialog(page);
    await new ProductPage(page).setWidth(1280);
    await jb.signInAs('member');
    await stubOrder(page);
    await jb.goto(`${tee}/request?option=M&quantity=1`);

    await expect(dialog.itemAmount).toHaveText('$34.00');
    await expect(dialog.shippingAmount).toHaveText('$9.00');
    await expect(dialog.total).toHaveText('$43.00 + tax');

    await dialog.method('Pick up in Leslieville').click();
    await expect(dialog.shippingAmount).toHaveText('Free');
    await expect(dialog.total).toHaveText('$34.00 + tax');
  });

  test('AC4: shipping is free at or above the threshold', async ({ page, jb }) => {
    const dialog = new RequestItemDialog(page);
    await new ProductPage(page).setWidth(1280);
    await jb.signInAs('member');
    await stubOrder(page);
    await jb.goto(`${tee}/request?option=M&quantity=3`);

    await expect(dialog.itemAmount).toHaveText('$102.00');
    await expect(dialog.shippingAmount).toHaveText('Free');
    await expect(dialog.total).toHaveText('$102.00 + tax');
  });

  test('AC5: sending shows where it went, the reply time and the lead time', async ({
    page,
    jb,
  }) => {
    const dialog = new RequestItemDialog(page);
    await new ProductPage(page).setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubOrder(page);
    await jb.goto(`${tee}/request?option=M&quantity=2`);

    await dialog.note.fill('Gift wrap please.');
    await dialog.send.click();

    await expect(dialog.title).toHaveText('Request sent to Luzandre.com');
    await expect(dialog.description).toContainText(
      'Naomi confirms stock and tells you how to pay, usually within a few hours.',
    );
    await expect(dialog.description).toContainText('Made to order: ready in 5–7 days.');
    await expect(dialog.keepShopping).toBeVisible();
    await expect(dialog.viewRequest).toHaveAttribute('href', '/requests/r-order');
    expect(fake.sends).toHaveLength(1);
    expect(fake.sends[0]).toMatchObject({
      listingSlug: 'luzandre',
      productSlug: 'faith-heavyweight-tee-charcoal',
      option: 'M',
      quantity: 2,
      deliveryMethodId: SHIP_ID,
      shippingAddress: '48 Woodmount Ave, East York, ON M4C 3X8',
      note: 'Gift wrap please.',
    });
    expect(fake.sends[0].idempotencyKey).toMatch(/^[\w-]{8,}$/);
  });

  test('AC5: "Keep shopping" closes the dialog and goes back to the shop', async ({ page, jb }) => {
    const dialog = new RequestItemDialog(page);
    await new ProductPage(page).setWidth(1280);
    await jb.signInAs('member');
    await stubOrder(page);
    await jb.goto(`${tee}/request?option=M&quantity=1`);
    await dialog.send.click();
    await expect(dialog.title).toHaveText('Request sent to Luzandre.com');

    await dialog.keepShopping.click();

    await expect(page).toHaveURL('/b/luzandre');
    await expect(dialog.root).toHaveCount(0);
  });

  test('AC3, AC4: by keyboard alone, the arrow keys choose pickup, the estimate follows and Enter on "Send request" sends once', async ({
    page,
    jb,
  }) => {
    const dialog = new RequestItemDialog(page);
    await new ProductPage(page).setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubOrder(page);
    await jb.goto(`${tee}/request?option=M&quantity=1`);
    await expect(dialog.total).toHaveText('$43.00 + tax');

    await dialog.radio('Ship to me').focus();
    await page.keyboard.press('ArrowDown');

    await expect(dialog.radio('Pick up in Leslieville')).toBeChecked();
    await expect(dialog.address).toHaveCount(0);
    await expect(dialog.shippingAmount).toHaveText('Free');
    await expect(dialog.total).toHaveText('$34.00 + tax');

    await page.keyboard.press('Tab');
    await expect(dialog.note).toBeFocused();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(dialog.send).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(dialog.title).toHaveText('Request sent to Luzandre.com');
    await expect(dialog.viewRequest).toBeFocused();
    expect(fake.sends).toHaveLength(1);
    expect(fake.sends[0].deliveryMethodId).toBe(PICKUP_ID);
  });

  test('Escape closes the dialog, sends nothing and leaves the member on the product', async ({
    page,
    jb,
  }) => {
    const dialog = new RequestItemDialog(page);
    await new ProductPage(page).setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubOrder(page);
    await jb.goto(`${tee}/request?option=M&quantity=1`);
    await dialog.note.fill('Gift wrap please.');

    await page.keyboard.press('Escape');

    await expect(dialog.root).toHaveCount(0);
    await expect(page).toHaveURL(tee);
    expect(fake.sends).toHaveLength(0);
  });

  test('when the shop’s delivery methods cannot be read, the dialog says so and nothing can be sent', async ({
    page,
    jb,
  }) => {
    const dialog = new RequestItemDialog(page);
    await new ProductPage(page).setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubOrder(page, { optionsLoad: false });
    await jb.goto(`${tee}/request?option=M&quantity=1`);

    await expect(dialog.alert).toContainText('Requests aren’t available right now');
    await expect(dialog.send).toHaveCount(0);

    await dialog.closeButton.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(page).toHaveURL(tee);
    expect(fake.sends).toHaveLength(0);
  });

  test('AC6: the request carries no price, shipping or total', async ({ page, jb }) => {
    const dialog = new RequestItemDialog(page);
    await new ProductPage(page).setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubOrder(page);
    await jb.goto(`${tee}/request?option=M&quantity=1`);

    await dialog.send.click();

    await expect(dialog.title).toHaveText('Request sent to Luzandre.com');
    expect(Object.keys(fake.sends[0]).sort()).toEqual([
      'deliveryMethodId',
      'idempotencyKey',
      'listingSlug',
      'note',
      'option',
      'productSlug',
      'quantity',
      'shippingAddress',
    ]);
  });

  test('AC7: a quantity above the stock is refused with how many are left', async ({
    page,
    jb,
  }) => {
    const dialog = new RequestItemDialog(page);
    await new ProductPage(page).setWidth(1280);
    await jb.signInAs('member');
    await stubOrder(page, { delivery: 'stock' });
    await jb.goto(`${tee}/request?option=S&quantity=8`);

    await dialog.send.click();

    await expect(dialog.alert).toHaveText(/Only 1 left\. Lower the quantity to continue\./);
    await expect(dialog.send).toBeEnabled();
  });

  test('while sending the dialog is busy and cannot be sent twice', async ({ page, jb }) => {
    const dialog = new RequestItemDialog(page);
    await new ProductPage(page).setWidth(1280);
    await jb.signInAs('member');
    await stubOrder(page, { delivery: 'hang' });
    await jb.goto(`${tee}/request?option=M&quantity=1`);

    await dialog.send.click();

    await expect(dialog.send).toHaveAttribute('aria-busy', 'true');
    await expect(dialog.cancel).toBeDisabled();
    await expect(dialog.address).toHaveAttribute('readonly', '');
  });

  test('a failure keeps what was typed and a retry sends once', async ({ page, jb }) => {
    const dialog = new RequestItemDialog(page);
    await new ProductPage(page).setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubOrder(page, { delivery: 'fail' });
    await jb.goto(`${tee}/request?option=M&quantity=1`);
    await dialog.note.fill('Keep this.');

    await dialog.send.click();

    await expect(dialog.alert).toContainText('We couldn’t send that');
    await expect(dialog.note).toHaveValue('Keep this.');

    fake.delivery = 'ok';
    await dialog.send.click();
    await expect(dialog.title).toHaveText('Request sent to Luzandre.com');
    expect(fake.sends).toHaveLength(1);
  });

  test('an unconfirmed e-mail is told to confirm first', async ({ page, jb }) => {
    const dialog = new RequestItemDialog(page);
    await new ProductPage(page).setWidth(1280);
    await jb.signInAs('member');
    await stubOrder(page, { delivery: 'unconfirmed' });
    await jb.goto(`${tee}/request?option=M&quantity=1`);

    await dialog.send.click();

    await expect(dialog.alert).toContainText('Confirm your e-mail first');
  });

  test('the server’s address refusal is shown under the address', async ({ page, jb }) => {
    const dialog = new RequestItemDialog(page);
    await new ProductPage(page).setWidth(1280);
    await jb.signInAs('member');
    await stubOrder(page, { delivery: 'address' });
    await jb.goto(`${tee}/request?option=M&quantity=1`);

    await dialog.send.click();

    await expect(dialog.fieldError).toHaveText('Enter the address to ship to, with postal code.');
  });
});
