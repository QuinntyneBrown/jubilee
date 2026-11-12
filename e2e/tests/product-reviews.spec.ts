import { expect, test } from '../fixtures/jb-test';
import { stubReviews, teeReviews } from '../fixtures/reviews';
import { ProductPage } from '../pages/product.page';

// Acceptance Test
// Traces to: L2-231, L2-230
// Description: a product page shows the reviews of that product, and a member writes one about it
// from there. The reviews are answered by `stubReviews` (ADR 0009).

const TEE = '/b/luzandre/p/faith-heavyweight-tee-charcoal';

test.describe('reviews on a product page (L2-231)', () => {
  test('AC1/AC4: the reviews of the product, and its rating under the name', async ({
    page,
    jb,
  }) => {
    const product = new ProductPage(page);
    const fake = await stubReviews(page, 'luzandre', { items: teeReviews() });
    await jb.signInAs('member');
    await jb.goto(TEE);

    await expect(product.reviews.ratingLink).toHaveText(/Rated\s*3\.0\s*out of 5,\s*1 review$/);
    await expect(product.reviews.count).toHaveText('1 review');
    await expect(product.reviews.reviews.locator('.review__author')).toHaveText(['Kofi B.']);
    await expect(product.reviews.review(0).item).toHaveText('Faith heavyweight tee, charcoal');
    expect(fake.reads).toBeGreaterThan(0);
  });

  test('AC1: the product’s reviews are asked for by its slug', async ({ page, jb }) => {
    const product = new ProductPage(page);
    await stubReviews(page, 'luzandre', { items: teeReviews() });
    const asked = page.waitForRequest('**/api/listings/luzandre/reviews?*');
    await jb.signInAs('member');
    await jb.goto(TEE);

    expect(new URL((await asked).url()).searchParams.get('product')).toBe(
      'faith-heavyweight-tee-charcoal',
    );
    await expect(product.reviews.heading).toBeVisible();
  });

  test('AC2: a product with no reviews invites the first', async ({ page, jb }) => {
    const product = new ProductPage(page);
    await stubReviews(page, 'luzandre', { items: [] });
    await jb.signInAs('member');
    await jb.goto(TEE);

    await expect(product.reviews.ratingLink).toHaveText('No reviews yet');
    await expect(product.reviews.empty).toContainText(
      'Bought Faith heavyweight tee, charcoal? Your review helps the next family decide.',
    );
  });

  test('AC3: Write a review opens the form with the product chosen', async ({ page, jb }) => {
    const product = new ProductPage(page);
    await stubReviews(page, 'luzandre', { items: teeReviews() });
    await jb.signInAs('member');
    await jb.goto(TEE);

    await expect(product.reviews.write).toHaveAttribute(
      'href',
      /^\/b\/luzandre\/review\?item=[0-9a-f-]+$/,
    );
  });

  test('L2-225 AC2: a member who may not write is told why under the invitation', async ({
    page,
    jb,
  }) => {
    const product = new ProductPage(page);
    await stubReviews(page, 'luzandre', { items: [], writing: 'not-eligible' });
    await jb.signInAs('member');
    await jb.goto(TEE);

    await expect(product.reviews.empty).toContainText(
      'You can review Luzandre.com after they confirm a request of yours.',
    );
    await expect(product.reviews.write).toHaveCount(0);
  });
});
