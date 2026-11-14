import { expect, test } from '../fixtures/jb-test';
import { HOSTED_CHECKOUT, purposeTee, seedBag, storedBag, stubMerch } from '../fixtures/merch';
import { BagDialog } from '../pages/bag.dialog';
import { PurposeTeePage } from '../pages/purpose-tee.page';

// The bag and checkout: L2-266, L2-267 (L1-034). The provider's hosted page is a stand-in on
// localhost; no test reaches Stripe (ADR 0009).

const MENS_L = { sku: 'mens-L', fit: 'Men’s', size: 'L', quantity: 1 };
const WOMENS_M = { sku: 'womens-M', fit: 'Women’s', size: 'M', quantity: 1 };

test.describe('the bag (L2-266)', () => {
  test('AC1, AC3: the bag lists each size, the delivery, the totals and "Check out"', async ({
    page,
    jb,
  }) => {
    await stubMerch(page);
    await seedBag(page, [MENS_L, WOMENS_M]);
    const tee = new PurposeTeePage(page);
    const bag = new BagDialog(page);
    await jb.goto('/purpose-tee');

    await tee.bagButton.click();
    await expect(bag.title).toHaveText('Your bag');
    await expect(bag.description).toHaveText('2 shirts. Prices are before tax.');
    await expect(bag.lines).toHaveCount(2);
    const line = bag.line('Men’s L');
    await expect(line.name).toHaveText('Purpose Tee · Black');
    await expect(line.meta).toHaveText('Men’s L · $25 each');
    await expect(line.amount).toHaveText('$25.00');
    await expect(line.remove).toHaveAccessibleName('Remove Men’s L');

    await expect(bag.ship).toBeChecked();
    await expect(bag.delivery).toContainText('Canada Post · $9, free from $60 · 3–5 business days');
    await expect(bag.delivery).toContainText('Free · we e-mail you the date and place');
    await expect(bag.shirts).toHaveText('$50.00');
    await expect(bag.shipping).toHaveText('$9.00');
    await expect(bag.total).toHaveText('$59.00 CAD');
    await expect(bag.taxNote).toHaveText(
      'Tax is added on Stripe’s secure checkout page. Jubilee never sees your card.',
    );
    await expect(bag.keepShopping).toBeVisible();
    await expect(bag.checkOut).toHaveText('Check out · $59.00');
  });

  test('AC3: picking up, or $60 of shirts, makes shipping free', async ({ page, jb }) => {
    await stubMerch(page);
    await seedBag(page, [MENS_L, WOMENS_M]);
    const tee = new PurposeTeePage(page);
    const bag = new BagDialog(page);
    await jb.goto('/purpose-tee');
    await tee.bagButton.click();

    await bag.pickup.check();
    await expect(bag.shipping).toHaveText('Free');
    await expect(bag.checkOut).toHaveText('Check out · $50.00');

    await bag.ship.check();
    await bag.line('Men’s L').more.click();
    await expect(bag.shirts).toHaveText('$75.00');
    await expect(bag.shipping).toHaveText('Free');
    await expect(bag.total).toHaveText('$75.00 CAD');
  });

  test('AC2: a quantity moves the line, the totals and the Bag count; "Remove" takes the line away', async ({
    page,
    jb,
  }) => {
    await stubMerch(page);
    await seedBag(page, [MENS_L]);
    const tee = new PurposeTeePage(page);
    const bag = new BagDialog(page);
    await jb.goto('/purpose-tee');
    await tee.bagButton.click();

    const line = bag.line('Men’s L');
    await line.more.click();
    await expect(line.quantityValue).toHaveText('2');
    await expect(line.amount).toHaveText('$50.00');
    await expect(bag.description).toHaveText('2 shirts. Prices are before tax.');
    await expect(tee.bagCount).toHaveText('2');

    await line.remove.click();
    await expect(bag.lines).toHaveCount(0);
    await expect(bag.emptyText).toHaveText(
      'Your bag is empty. Choose a fit and a size, then “Add to bag”.',
    );
    await bag.chooseSize.click();
    await expect(bag.root).toHaveCount(0);
    expect(await storedBag(page)).toEqual([]);
  });

  test('AC2: a line never goes above what is left', async ({ page, jb }) => {
    await stubMerch(page);
    await seedBag(page, [{ sku: 'mens-3XL', fit: 'Men’s', size: '3XL', quantity: 2 }]);
    const tee = new PurposeTeePage(page);
    const bag = new BagDialog(page);
    await jb.goto('/purpose-tee');
    await tee.bagButton.click();

    await expect(bag.line('Men’s 3XL').more).toBeDisabled();
  });

  test('AC4: the bag is kept across a reload and another screen', async ({ page, jb }) => {
    await stubMerch(page);
    const tee = new PurposeTeePage(page);
    await jb.goto('/purpose-tee');
    await tee.addButton.click();

    await tee.backToBrowse.click();
    await expect(page).toHaveURL(/localhost:4200\/$/);
    await page.goBack();
    await expect(tee.bagButton).toHaveAccessibleName('Bag, 1 item');
    await page.reload();
    await expect(tee.bagButton).toHaveAccessibleName('Bag, 1 item');
  });

  test('AC4: opening the bag reads the prices and stock again', async ({ page, jb }) => {
    const product = purposeTee();
    product.fits[2].sizes = product.fits[2].sizes.filter((s) => s.label !== 'S');
    await stubMerch(page, { product });
    await seedBag(page, [
      MENS_L,
      { sku: 'mens-S', fit: 'Men’s', size: 'S', quantity: 1 },
      { sku: 'womens-XL', fit: 'Women’s', size: 'XL', quantity: 3 },
    ]);
    const tee = new PurposeTeePage(page);
    const bag = new BagDialog(page);
    await jb.goto('/purpose-tee');
    await tee.bagButton.click();

    await expect(bag.lines).toHaveCount(2);
    await expect(bag.line('Women’s XL').problem).toHaveText(
      'Only 2 left in Women’s XL. Lower the quantity to check out.',
    );
    await bag.line('Women’s XL').fewer.click();
    await expect(bag.line('Women’s XL').problem).toHaveCount(0);
  });

  test('AC4: when the prices cannot be read again, it says so and checkout waits', async ({
    page,
    jb,
  }) => {
    const merch = await stubMerch(page);
    await seedBag(page, [MENS_L]);
    const tee = new PurposeTeePage(page);
    const bag = new BagDialog(page);
    await jb.goto('/purpose-tee');
    await expect(tee.heading).toBeVisible();
    merch.productAnswer = 'error';

    await tee.bagButton.click();
    await expect(bag.alert).toContainText('We couldn’t check the prices');
    await expect(bag.alert).toContainText(
      'Nothing was charged. Close the bag and open it again in a moment.',
    );
    await expect(bag.delivery).toHaveCount(0);
    await expect(bag.totals).toHaveCount(0);
    await expect(bag.checkOut).toBeDisabled();
  });

  test('AC5: "Keep shopping", Close and Escape close it and focus returns to the Bag', async ({
    page,
    jb,
  }) => {
    await stubMerch(page);
    await seedBag(page, [MENS_L]);
    const tee = new PurposeTeePage(page);
    const bag = new BagDialog(page);
    await jb.goto('/purpose-tee');

    for (const close of [
      () => bag.keepShopping.click(),
      () => bag.close.click(),
      () => page.keyboard.press('Escape'),
    ]) {
      await tee.bagButton.click();
      await expect(bag.title).toBeVisible();
      await close();
      await expect(bag.root).toHaveCount(0);
      await expect(tee.bagButton).toBeFocused();
    }
  });
});

test.describe('check out (L2-267)', () => {
  test('AC1: "Check out" sends the lines and the delivery, then goes to the hosted page', async ({
    page,
    jb,
  }) => {
    const merch = await stubMerch(page);
    await seedBag(page, [MENS_L, WOMENS_M]);
    const tee = new PurposeTeePage(page);
    const bag = new BagDialog(page);
    await jb.goto('/purpose-tee');
    await tee.bagButton.click();
    await bag.pickup.check();

    await bag.checkOut.click();
    await page.waitForURL(`**${HOSTED_CHECKOUT}`);
    expect(merch.checkouts).toEqual([
      {
        lines: [
          { sku: 'mens-L', quantity: 1, unitPriceCents: 2500 },
          { sku: 'womens-M', quantity: 1, unitPriceCents: 2500 },
        ],
        delivery: 'pickup',
      },
    ]);
  });

  test('AC1: while it opens, the button says so and the bag is locked', async ({ page, jb }) => {
    await stubMerch(page, { checkout: 'hang' });
    await seedBag(page, [MENS_L]);
    const tee = new PurposeTeePage(page);
    const bag = new BagDialog(page);
    await jb.goto('/purpose-tee');
    await tee.bagButton.click();

    await bag.checkOut.click();
    await expect(bag.checkOut).toHaveText('Opening checkout…');
    await expect(bag.checkOut).toHaveAttribute('aria-busy', 'true');
    await expect(bag.keepShopping).toBeDisabled();
    await expect(bag.close).toBeDisabled();
    await expect(bag.line('Men’s L').remove).toBeDisabled();
    await expect(bag.pickup).toBeDisabled();
  });

  test('AC4: a 422 says the bag needs a change and the problem under each line', async ({
    page,
    jb,
  }) => {
    const product = purposeTee();
    await stubMerch(page, {
      product,
      checkout: 'invalid',
      invalid: {
        'lines[0].unitPriceCents': 'PRICE_CHANGED',
        'lines[1].quantity': 'ONLY_LEFT:1',
        'lines[2].quantity': 'SOLD_OUT',
      },
    });
    await seedBag(page, [
      MENS_L,
      { sku: 'mens-3XL', fit: 'Men’s', size: '3XL', quantity: 2 },
      WOMENS_M,
    ]);
    const tee = new PurposeTeePage(page);
    const bag = new BagDialog(page);
    await jb.goto('/purpose-tee');
    await tee.bagButton.click();
    product.unitPriceCents = 2800;

    await bag.checkOut.click();
    await expect(bag.alert).toContainText('Your bag needs a change');
    await expect(bag.alert).toContainText('Nothing was charged.');
    await expect(bag.line('Men’s 3XL').problem).toHaveText(
      'Only 1 left in Men’s 3XL. Lower the quantity to check out.',
    );
    await expect(bag.line('Men’s 3XL').quantityValue).toHaveText('2');
    await expect(bag.line('Women’s M').problem).toHaveText(
      'Women’s M is sold out. Remove it to check out.',
    );
    await expect(bag.line('Men’s L').problem).toHaveText('The price is now $28.00.');
    await expect(bag.line('Men’s L').meta).toHaveText('Men’s L · $28 each');
  });

  test('AC5: without a payment provider, checkout isn’t open yet and the bag is kept', async ({
    page,
    jb,
  }) => {
    await stubMerch(page, { checkout: 'unavailable' });
    await seedBag(page, [MENS_L]);
    const tee = new PurposeTeePage(page);
    const bag = new BagDialog(page);
    await jb.goto('/purpose-tee');
    await tee.bagButton.click();

    await bag.checkOut.click();
    await expect(bag.alert).toContainText('Checkout isn’t open yet');
    await expect(bag.alert).toContainText(
      'The shirts are ready, and we’re still setting up payment. Nothing was charged. Your bag is kept on this device; come back soon.',
    );
    await expect(bag.checkOut).toBeDisabled();
    expect(await storedBag(page)).toHaveLength(1);
  });

  test('AC6: when the provider fails, it says so with the reference and can be tried again', async ({
    page,
    jb,
  }) => {
    const merch = await stubMerch(page, { checkout: 'failed' });
    await seedBag(page, [MENS_L]);
    const tee = new PurposeTeePage(page);
    const bag = new BagDialog(page);
    await jb.goto('/purpose-tee');
    await tee.bagButton.click();

    await bag.checkOut.click();
    await expect(bag.alert).toHaveRole('alert');
    await expect(bag.alert).toContainText('We couldn’t open checkout');
    await expect(bag.alert.locator('code')).toHaveText('JB-MERCH-503');
    await expect(bag.checkOut).toBeEnabled();

    merch.checkout = 'ok';
    await bag.checkOut.click();
    await page.waitForURL(`**${HOSTED_CHECKOUT}`);
  });

  test('AC7: too many checkouts says when to try again', async ({ page, jb }) => {
    await stubMerch(page, { checkout: 'rate-limited' });
    await seedBag(page, [MENS_L]);
    const tee = new PurposeTeePage(page);
    const bag = new BagDialog(page);
    await jb.goto('/purpose-tee');
    await tee.bagButton.click();

    await bag.checkOut.click();
    await expect(bag.alert).toContainText('You’ve tried to check out a lot');
    await expect(bag.alert).toContainText('Try again in 12 minutes. Nothing was charged.');
    await expect(bag.checkOut).toBeDisabled();
  });

  test('AC8: a member checks out the same way, with no session sent for it', async ({
    page,
    jb,
  }) => {
    const merch = await stubMerch(page);
    await seedBag(page, [MENS_L]);
    const tee = new PurposeTeePage(page);
    const bag = new BagDialog(page);
    await jb.signInAs('member');
    await jb.goto('/purpose-tee');
    await tee.bagButton.click();

    await bag.checkOut.click();
    await page.waitForURL(`**${HOSTED_CHECKOUT}`);
    expect(merch.checkouts).toHaveLength(1);
  });
});
