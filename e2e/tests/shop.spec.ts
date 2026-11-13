import { expect, test } from '../fixtures/jb-test';
import { BusinessPage } from '../pages/business.page';

// Shop page: L2-034. "shop" is /b/luzandre against the recorded answers of the seeded API (ADR 0009).

test.describe('shop page (L2-034)', () => {
  test('AC1: it shows the header, "Shop products", products with the count, Custom work, About, Details and related', async ({
    page,
    jb,
  }) => {
    const shop = new BusinessPage(page);
    await shop.setWidth(1280);
    await jb.open('shop');
    await expect(page).toHaveTitle('Luzandre.com · Jubilee');

    await expect(shop.kicker).toHaveText('Shops');
    await expect(shop.heading).toHaveText('Luzandre.com');
    await expect(shop.ownerName).toHaveCount(0);
    await expect(shop.tagline).toHaveText(
      'Unique & custom Christian apparel, artworks & gifts that bring joy',
    );
    await expect(shop.primaryAction).toHaveText('Shop products');
    await expect(shop.highlight).toHaveText('Ships across Canada');

    await expect(shop.productCount).toHaveText('4 products');
    await expect(shop.productCards).toHaveCount(4);
    const tee = shop.productCard(0);
    await expect(tee.name).toHaveText('Faith heavyweight tee, charcoal');
    await expect(tee.price).toHaveText('$34');
    await expect(tee.shopName).toHaveCount(0);
    await expect(tee.root).toHaveAttribute('href', '/b/luzandre/p/faith-heavyweight-tee-charcoal');
    await expect(shop.productCard(2).price).toHaveText('$22 ea');

    await expect(shop.services.getByRole('heading', { level: 2 })).toHaveText('Custom work');
    await expect(shop.serviceRows.locator('.row__title')).toHaveText([
      'Custom design consultation',
      'Church merch package',
    ]);
    await expect(shop.serviceRow(0).action).toHaveAccessibleName('Ask Custom design consultation');
    await expect(shop.serviceRow(0).action).toHaveAttribute(
      'href',
      /^\/b\/luzandre\/quote\?service=[0-9a-f-]{36}$/,
    );
    await expect(shop.about).toContainText('Custom tees, mugs and original artwork');
    await expect(shop.detailTerms).toHaveText([
      'Where',
      'Delivery',
      'Made to order',
      'On Jubilee since',
      'Replies',
    ]);
    await expect(shop.detailValues).toHaveText([
      'Online · studio pickup in Leslieville',
      'Canada Post, $9 flat · free over $75',
      'Ready in 5–7 days',
      'June 2026',
      'Usually within a few hours',
    ]);
    await expect(shop.related.getByRole('heading', { level: 2 })).toHaveText('More in Shops');
    await expect(shop.relatedCards.locator('.biz-card__name')).toHaveText([
      'Christian Bookstores',
      'Flower Creations',
    ]);
  });

  test('AC1: "Shop products" takes the member to the products', async ({ page, jb }) => {
    const shop = new BusinessPage(page);
    await shop.setWidth(360);
    await jb.open('shop');

    await shop.primaryAction.click();
    await expect(page).toHaveURL(/\/b\/luzandre#products$/);
    await expect(shop.products).toBeInViewport();
  });

  test('AC2: a shop without products says it is setting up shop and offers "Send a message"', async ({
    page,
    jb,
  }) => {
    const shop = new BusinessPage(page);
    await jb.open('shop.empty');

    await expect(shop.productsEmpty.getByRole('heading')).toHaveText('No products yet');
    await expect(shop.productsEmpty).toContainText(
      'Luzandre.com is setting up shop. Message them to ask what’s coming.',
    );
    await expect(shop.productsEmpty.getByRole('link', { name: 'Send a message' })).toHaveAttribute(
      'href',
      '/b/luzandre/message',
    );
    await expect(shop.productCount).toHaveCount(0);
    await expect(shop.primaryAction).toHaveText('Send a message');
  });

  test('AC3: a sold-out product says “Sold out” on its card, in words', async ({ page, jb }) => {
    const shop = new BusinessPage(page);
    await jb.open('shop.sold-out');

    const mug = shop.productCard(1);
    await expect(mug.name).toHaveText('Gold cross stoneware mug');
    await expect(mug.badge).toHaveText('Sold out');
    // The card is one link: its name reads the badge with the product and the price
    await expect(mug.root).toHaveAccessibleName(
      'Sold out Gold cross stoneware mug Rated 4.7 out of 5 from 3 reviews $24',
    );
    await expect(mug.root).toHaveAttribute('href', '/b/luzandre/p/gold-cross-stoneware-mug');
    // A product in stock carries no badge
    await expect(shop.productCard(0).badge).toHaveCount(0);
    await expect(shop.productCards.locator('.media__tag')).toHaveCount(1);
  });

  test('AC4 and L2-118: a shop that fails to load says so and quotes JB-BIZ-503', async ({
    page,
    jb,
  }) => {
    const shop = new BusinessPage(page);
    // Opened from the Shops category, so the page knows it is a shop before it loads
    await jb.open('shop.error');

    await expect(shop.errorState.getByRole('heading', { level: 1 })).toHaveText(
      'We couldn’t load this shop',
    );
    await expect(shop.errorReference).toHaveText('JB-BIZ-503');
  });

  test('loading: a shop opened from a list announces it is loading with the product skeleton', async ({
    page,
    jb,
  }) => {
    const shop = new BusinessPage(page);
    await jb.open('shop.loading');

    await expect(shop.loadingStatus).toHaveText('Loading this shop…');
    await expect(shop.main.locator('ul.card-grid .skeleton--square')).toHaveCount(4);
  });
});
