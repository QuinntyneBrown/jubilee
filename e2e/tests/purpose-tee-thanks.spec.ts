import { expect, test } from '../fixtures/jb-test';
import { PAID_ORDER, seedBag, storedBag, stubMerch, type MerchOrderData } from '../fixtures/merch';
import { PurposeTeeThanksPage } from '../pages/purpose-tee-thanks.page';

// The return page: L2-269 (L1-034). The order read is answered by fixtures/merch.ts.

const REFERENCE = 'q3v8XkR2mLp7TfZ1nWc4Yb';
const THANKS = `/purpose-tee/thanks?order=${REFERENCE}`;
const PENDING: MerchOrderData = { ...PAID_ORDER, status: 'pending' };
const MENS_L = { sku: 'mens-L', fit: 'Men’s', size: 'L', quantity: 1 };

test.describe('the return page (L2-269)', () => {
  test('AC1: while it asks, it says it is checking the order', async ({ page, jb }) => {
    await stubMerch(page, { orders: ['hang'] });
    const thanks = new PurposeTeeThanksPage(page);
    await jb.goto(THANKS);

    await expect(thanks.heading).toHaveText('Checking your order');
    await expect(thanks.state).toHaveRole('status');
    await expect(thanks.spinner).toBeVisible();
  });

  test('AC2: a paid order thanks the buyer, says what comes next and empties the bag', async ({
    page,
    jb,
  }) => {
    const order = page.waitForRequest(`**/api/merch/orders/${REFERENCE}`);
    await stubMerch(page);
    await seedBag(page, [MENS_L]);
    const thanks = new PurposeTeeThanksPage(page);
    await jb.goto(THANKS);
    await order;

    await expect(page).toHaveTitle('Purpose Tee · Jubilee');
    await expect(thanks.heading).toHaveText('Thank you. Your order is paid.');
    await expect(thanks.text).toHaveText(
      'Order PT-4F7K2Q: Men’s L and Women’s M, $66.67 CAD with shipping and tax. We’ve e-mailed your receipt to the address you gave at checkout. It ships in 3 to 5 business days. Every shirt helps keep Jubilee free for the Christian business people of Toronto.',
    );
    await expect(thanks.backToBrowse).toHaveAttribute('href', '/');
    await expect(thanks.seeTheTee).toHaveAttribute('href', '/purpose-tee');
    await expect.poll(() => storedBag(page)).toEqual([]);
  });

  test('AC2: a picked-up order says where to pick it up; two of a size read "2 ×"', async ({
    page,
    jb,
  }) => {
    await stubMerch(page, {
      orders: [
        {
          ...PAID_ORDER,
          delivery: 'pickup',
          lines: [{ fit: 'Men’s', size: 'L', quantity: 2 }],
          totalCents: 5650,
        },
      ],
    });
    const thanks = new PurposeTeeThanksPage(page);
    await jb.goto(THANKS);

    await expect(thanks.text).toContainText('Order PT-4F7K2Q: 2 × Men’s L, $56.50 CAD');
    await expect(thanks.text).toContainText(
      'Pick it up at the next Jubilee gathering in Toronto; we’ll e-mail you the date and place.',
    );
  });

  test('AC3: a pending order is confirmed by itself as the page asks again', async ({
    page,
    jb,
  }) => {
    const merch = await stubMerch(page, { orders: [PENDING, PENDING, PAID_ORDER] });
    const thanks = new PurposeTeeThanksPage(page);
    await page.clock.install();
    await jb.goto(THANKS);

    await expect(thanks.heading).toHaveText('We’re confirming your payment');
    await expect(thanks.text).toHaveText(
      'Stripe is telling us your payment went through. This takes a few seconds, and the page updates by itself. Please don’t pay again.',
    );
    await expect(thanks.spinner).toBeVisible();
    await page.clock.runFor(3000);
    await expect.poll(() => merch.orderReads).toBe(2);
    await page.clock.runFor(3000);
    await expect(thanks.heading).toHaveText('Thank you. Your order is paid.');
  });

  test('AC3: after a minute it says it is taking longer, and "Check again" asks', async ({
    page,
    jb,
  }) => {
    const merch = await stubMerch(page, { orders: [PENDING] });
    const thanks = new PurposeTeeThanksPage(page);
    await page.clock.install();
    await jb.goto(THANKS);
    await expect(thanks.heading).toHaveText('We’re confirming your payment');

    await page.clock.runFor(61_000);
    await expect(thanks.text).toHaveText(
      'This is taking longer than usual. Your receipt comes by e-mail once it’s confirmed; you don’t need to stay here.',
    );
    const reads = merch.orderReads;
    merch.orders = [PAID_ORDER];
    merch.orderReads = 0;
    await thanks.checkAgain.click();
    await expect(thanks.heading).toHaveText('Thank you. Your order is paid.');
    expect(reads).toBeGreaterThan(1);
  });

  test('AC4: leaving checkout before paying says nothing was paid and keeps the bag', async ({
    page,
    jb,
  }) => {
    await stubMerch(page, { orders: [PENDING] });
    await seedBag(page, [MENS_L]);
    const thanks = new PurposeTeeThanksPage(page);
    await jb.goto(`${THANKS}&cancelled=1`);

    await expect(thanks.heading).toHaveText('Nothing was paid');
    await expect(thanks.text).toHaveText(
      'You left checkout before paying, so nothing was charged. Your bag is as you left it.',
    );
    await expect(thanks.backToTheTee).toHaveAttribute('href', '/purpose-tee');
    await expect(thanks.backToBrowse).toBeVisible();
    expect(await storedBag(page)).toHaveLength(1);
  });

  test('AC4: an expired order says nothing was paid', async ({ page, jb }) => {
    await stubMerch(page, { orders: [{ ...PAID_ORDER, status: 'expired' }] });
    const thanks = new PurposeTeeThanksPage(page);
    await jb.goto(THANKS);

    await expect(thanks.heading).toHaveText('Nothing was paid');
  });

  test('AC4: "cancelled" with a paid order shows the paid page', async ({ page, jb }) => {
    await stubMerch(page);
    const thanks = new PurposeTeeThanksPage(page);
    await jb.goto(`${THANKS}&cancelled=1`);

    await expect(thanks.heading).toHaveText('Thank you. Your order is paid.');
  });

  test('AC5: an unknown order, or none, cannot be found', async ({ page, jb }) => {
    const merch = await stubMerch(page, { orders: ['missing'] });
    const thanks = new PurposeTeeThanksPage(page);
    await jb.goto(THANKS);

    await expect(thanks.heading).toHaveText('We can’t find that order');
    await expect(thanks.text).toHaveText(
      'The link may be incomplete. If you paid, your receipt is in your e-mail with its order number.',
    );
    await expect(thanks.backToTheTee).toBeVisible();
    await expect(thanks.backToBrowse).toBeVisible();

    merch.orderReads = 0;
    await jb.goto('/purpose-tee/thanks');
    await expect(thanks.heading).toHaveText('We can’t find that order');
    expect(merch.orderReads).toBe(0);
  });

  test('AC6: when the order cannot be checked, it says so and "Try again" asks again', async ({
    page,
    jb,
  }) => {
    await stubMerch(page, { orders: ['error', PAID_ORDER] });
    const thanks = new PurposeTeeThanksPage(page);
    await jb.goto(THANKS);

    await expect(thanks.heading).toHaveText('We couldn’t check your order');
    await expect(thanks.text).toContainText(
      'If you paid, nothing is lost: your receipt comes by e-mail. Check your connection and try again.',
    );
    await expect(thanks.reference).toHaveText('JB-MERCH-503');
    await thanks.tryAgain.click();
    await expect(thanks.heading).toHaveText('Thank you. Your order is paid.');
  });
});
