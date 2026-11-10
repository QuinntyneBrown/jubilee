import { expect, test } from '../fixtures/jb-test';
import { ProductPage } from '../pages/product.page';

// Product page: L2-035, L2-118. "product" is the charcoal tee of Luzandre.com in the seeded API.

const teePath = '/b/luzandre/p/faith-heavyweight-tee-charcoal';

test.describe('product page (L2-035)', () => {
  test('AC1: it shows the product with its price, delivery, shop, sizes, quantity and request action', async ({
    page,
    jb,
  }) => {
    const product = new ProductPage(page);
    await product.setWidth(1280);
    await jb.open('product');
    await expect(page).toHaveTitle('Faith heavyweight tee, charcoal · Jubilee');

    await expect(product.breadcrumbLinks).toHaveText(['Browse', 'Luzandre.com']);
    await expect(product.breadcrumbLinks.nth(1)).toHaveAttribute('href', '/b/luzandre');
    await expect(product.breadcrumbCurrent).toHaveText('Faith heavyweight tee, charcoal');
    await expect(product.heading).toHaveText('Faith heavyweight tee, charcoal');
    await expect(product.price).toHaveText('$34');
    await expect(product.deliveryLine).toHaveText('· plus $9 shipping, or free pickup');
    await expect(product.soldBy).toHaveText(/Sold by Luzandre\.com\s*Verified/);
    await expect(product.shopLink).toHaveAttribute('href', '/b/luzandre');
    await expect(product.optionGroup.locator('legend')).toHaveText('Size');
    await expect(product.optionGroup.locator('label.chip')).toHaveText([
      'S',
      'M',
      'L',
      'XL',
      '2XL',
    ]);
    await expect(product.optionGroup.getByRole('radio', { checked: true })).toHaveCount(0);
    await expect(product.quantity).toHaveValue('1');
    await expect(product.requestButton).toBeEnabled();
    await expect(product.messageLink).toHaveAccessibleName('Message Luzandre.com');
    await expect(product.messageLink).toHaveAttribute('href', '/b/luzandre/message');
    await expect(product.paymentNote).toHaveText(
      'No payment now. Luzandre.com confirms stock and tells you how to pay.',
    );
    await expect(product.mediaTag).toHaveCount(0);
  });

  test('AC2: "Request this item" without a size says "Choose a size." and does not start a request', async ({
    page,
    jb,
  }) => {
    const product = new ProductPage(page);
    await jb.open('product');

    await product.requestButton.click();

    await expect(product.optionError).toHaveText('Choose a size.');
    await expect(product.optionGroup).toHaveAccessibleDescription('Choose a size.');
    await expect(product.option('S')).toBeFocused();
    await expect(page).toHaveURL(new RegExp(`${teePath}$`));

    await product.choose('L');
    await expect(product.optionError).toHaveCount(0);
  });

  test('AC2: with a size and a quantity, "Request this item" starts the request for them', async ({
    page,
    jb,
  }) => {
    const product = new ProductPage(page);
    await jb.open('product');

    await product.choose('M');
    await expect(product.option('M')).toBeChecked();
    await product.quantity.fill('2');
    await product.requestButton.click();

    await expect(page).toHaveURL(`${teePath}/request?option=M&quantity=2`);
  });

  test('AC3: the quantity is a whole number from 1 to the stock of the chosen size', async ({
    page,
    jb,
  }) => {
    const product = new ProductPage(page);
    await jb.open('product');

    await product.quantity.fill('30');
    await product.requestButton.click();
    await expect(product.quantityError).toHaveText('Choose a number from 1 to 20.');
    await expect(product.quantity).toHaveAttribute('aria-invalid', 'true');
    await expect(product.quantity).toHaveAccessibleDescription('Choose a number from 1 to 20.');

    await product.choose('S');
    await product.quantity.fill('9');
    await product.requestButton.click();
    await expect(product.optionError).toHaveCount(0);
    await expect(product.quantityError).toHaveText('Choose a number from 1 to 8.');
    await expect(product.quantity).toBeFocused();
    await expect(page).toHaveURL(new RegExp(`${teePath}$`));

    await product.quantity.fill('0');
    await product.requestButton.click();
    await expect(product.quantityError).toHaveText('Choose a number from 1 to 8.');

    await product.quantity.fill('8');
    await product.requestButton.click();
    await expect(page).toHaveURL(`${teePath}/request?option=S&quantity=8`);
  });

  test('AC3: a product with a minimum order quantity starts at it and refuses less', async ({
    page,
    jb,
  }) => {
    const product = new ProductPage(page);
    await jb.goto('/b/luzandre/p/custom-church-team-tee');

    await expect(product.price).toHaveText('$22 ea');
    await expect(product.optionGroup).toHaveCount(0);
    await expect(product.quantity).toHaveValue('12');

    await product.quantity.fill('5');
    await product.requestButton.click();
    await expect(product.quantityError).toHaveText('This item has a minimum of 12.');

    await product.quantity.fill('12');
    await product.requestButton.click();
    await expect(page).toHaveURL('/b/luzandre/p/custom-church-team-tee/request?quantity=12');
  });

  test('AC4: Details shows the description and the attributes', async ({ page, jb }) => {
    const product = new ProductPage(page);
    await jb.open('product');

    await expect(product.description).toHaveText(
      'A 240 gsm combed-cotton tee with a small gold-thread emblem on the chest. Printed and stitched to order in Leslieville.',
    );
    await expect(product.detailTerms).toHaveText(['Fit', 'Care', 'Ready in', 'Returns']);
    await expect(product.detailValues).toHaveText([
      'Relaxed, true to size',
      'Cold wash, hang dry',
      '5–7 days, made to order',
      '14 days, unworn',
    ]);
  });

  test('AC5: "More from" the shop shows three other products and "Visit shop"', async ({
    page,
    jb,
  }) => {
    const product = new ProductPage(page);
    await jb.open('product');

    await expect(product.more.getByRole('heading', { level: 2 })).toHaveText(
      'More from Luzandre.com',
    );
    await expect(product.moreCards.locator('.biz-card__name')).toHaveText([
      'Gold cross stoneware mug',
      'Custom church team tee (min. 12)',
      'Morning mug, set of two',
    ]);
    await expect(product.moreCard(0).shopName).toHaveCount(0);
    await expect(product.visitShop).toHaveAttribute('href', '/b/luzandre');

    await product.moreCards.first().click();
    await expect(product.heading).toHaveText('Gold cross stoneware mug');
    await expect(product.optionGroup).toHaveCount(0);
  });

  test('L2-118: a product that fails to load says so, quotes JB-PRD-503 and offers the shop', async ({
    page,
    jb,
  }) => {
    const product = new ProductPage(page);
    await jb.open('product.error');

    await expect(product.errorState.getByRole('heading', { level: 1 })).toHaveText(
      'We couldn’t load this product',
    );
    await expect(product.errorReference).toHaveText('JB-PRD-503');
    await expect(product.breadcrumbCurrent).toHaveText('Faith heavyweight tee, charcoal');
    await expect(product.backToShop).toHaveText('Back to Luzandre.com');
    await expect(product.backToShop).toHaveAttribute('href', '/b/luzandre');

    await page.unroute('**/api/listings/luzandre/products/faith-heavyweight-tee-charcoal');
    await product.tryAgain.click();
    await expect(product.heading).toHaveText('Faith heavyweight tee, charcoal');
  });

  test('loading: a product announces it is loading', async ({ page, jb }) => {
    const product = new ProductPage(page);
    await jb.open('product.loading');

    await expect(product.loadingStatus).toHaveText('Loading this product…');
    await expect(product.breadcrumbLinks).toHaveText(['Browse', 'Luzandre.com']);
  });

  test('L2-028: a product that does not exist shows the not-found page', async ({ page, jb }) => {
    await jb.goto('/b/luzandre/p/no-such-product');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/can’t find/i);
  });
});
