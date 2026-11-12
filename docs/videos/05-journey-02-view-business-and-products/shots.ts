import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from '../../../e2e/fixtures/jb-test';
import { stubCatalogue } from '../../../e2e/fixtures/catalogue';
import { joanna } from '../../../e2e/fixtures/cast';
import { fulfil, recordedAnswer } from '../../../e2e/fixtures/mock-api';
import { BACK_IN_STOCK, NOTIFICATIONS, stubNotifications } from '../../../e2e/fixtures/notifications';
import { BrowsePage } from '../../../e2e/pages/browse.page';
import { BusinessPage } from '../../../e2e/pages/business.page';
import { MyProductsPage } from '../../../e2e/pages/my-products.page';
import { NotificationsPage } from '../../../e2e/pages/notifications.page';
import { ProductEditorDialog } from '../../../e2e/pages/product-editor.dialog';
import { ProductPage } from '../../../e2e/pages/product.page';
import { Toasts } from '../../../e2e/pages/toasts';
import { DESKTOP, PHONE, bringToTop, detail, shot, shotsDir } from '../../../tools/video-record/shots';

// The pictures of the film: the running app in each state journey 2 added, with every /api request
// answered as in the behaviour specs (ADR 0009). Not a test and not a sweep; see ../README.md,
// "A demo built from screenshots". The story follows one product, the Gold cross stoneware mug.

const MUG = 'Gold cross stoneware mug';
const MUG_PATH = '/b/luzandre/p/gold-cross-stoneware-mug';

/** The notification the member gets when the mug returns (L2-036 AC4). */
const MUG_IS_BACK = {
  ...BACK_IN_STOCK,
  title: `${MUG} is back in stock`,
  target: MUG_PATH,
};

test.describe('desktop', () => {
  test.use(DESKTOP);

  test('the owner sets the stock to 0 and is told the product is sold out', async ({ page, jb }) => {
    const products = new MyProductsPage(page);
    const editor = new ProductEditorDialog(page);
    const toasts = new Toasts(page);
    await stubCatalogue(page);
    await jb.goto('/my-business/products');

    await products.edit(MUG).click();
    await editor.stock.fill('0');
    await shot(page, 'owner-editor');

    await editor.submit.click();
    const toast = toasts.warning(`“${MUG}” is sold out`);
    await toast.waitFor();
    await products.status(MUG).waitFor();
    await shot(page, 'owner-toast');
    await detail(toast, 'owner-toast-detail', 4);
  });

  test('the shop page says “Sold out” on the card', async ({ page, jb }) => {
    const shop = new BusinessPage(page);
    await jb.open('shop.sold-out');
    await shop.productCard(1).badge.waitFor();

    await bringToTop(shop.products);
    await shot(page, 'shop-sold-out');
    await detail(shop.productCard(1).root, 'shop-sold-out-detail', 20);
  });

  test('a member asks to be told when the product is back', async ({ page, jb }) => {
    const product = new ProductPage(page);
    await page.route(`**/api/listings/luzandre/products/gold-cross-stoneware-mug`, async (route) => {
      const answer = await recordedAnswer(route);
      const mug = answer.body as Record<string, unknown>;
      await fulfil(route, {
        ...answer,
        body: {
          ...mug,
          soldOut: true,
          maxQuantity: 0,
          restockNote: 'Naomi fires the next batch on Mon 23 Nov.',
        },
      });
    });
    await page.route('**/api/products/*/stock-alert', (route) => route.fulfill({ status: 204 }));
    await jb.signInAs('member');
    await jb.goto(MUG_PATH);

    await product.alertButton.waitFor();
    await shot(page, 'product-sold-out');

    await product.alertButton.click();
    await product.alertStatus.waitFor();
    await shot(page, 'product-alert-requested');
  });

  test('the member is told in the app when the product is back', async ({ page, jb }) => {
    const browse = new BrowsePage(page);
    const centre = new NotificationsPage(page);
    const toasts = new Toasts(page);
    // Joanna is the member who asked; the stub's own member is the owner.
    const fake = await stubNotifications(
      page,
      { items: NOTIFICATIONS },
      { ...joanna.session, isVerifier: false },
    );
    await jb.goto('/');
    await browse.main.getByRole('heading', { level: 1 }).waitFor();

    fake.push(MUG_IS_BACK);
    const toast = toasts.withTitle(MUG_IS_BACK.title);
    await toast.waitFor();
    await shot(page, 'notice-toast');
    await detail(toast, 'notice-toast-detail', 4);

    await jb.goto('/notifications');
    await centre.link(MUG_IS_BACK.title).waitFor();
    await toasts.dismiss(toasts.withTitle(MUG_IS_BACK.title)).click({ timeout: 2000 }).catch(() => undefined);
    await shot(page, 'notifications');
  });

  test('the e-mail, as the backend renders it', async ({ page }) => {
    // shots/email.html is written by tools/video-record/render-email.fsx from ../email.txt.
    // A short window, so the picture of the whole page ends where the e-mail does.
    await page.setViewportSize({ width: 680, height: 200 });
    await page.goto(pathToFileURL(path.join(shotsDir, 'email.html')).href);
    await page.screenshot({ path: path.join(shotsDir, 'email.png'), fullPage: true });
  });

  test('the owner’s preview of a listing that is not public gives its status', async ({ page, jb }) => {
    const business = new BusinessPage(page);
    await jb.open('business.preview');

    await business.previewBanner.waitFor();
    await shot(page, 'preview-owner');
    await detail(business.previewBanner, 'preview-owner-detail', 8);
  });

  test('the verification team’s preview gives the status too', async ({ page, jb }) => {
    const business = new BusinessPage(page);
    await page.route('**/api/listings/legacy-financial', async (route) => {
      const answer = await recordedAnswer(route);
      const listing = answer.body as Record<string, unknown>;
      await fulfil(route, {
        ...answer,
        body: {
          ...listing,
          viewerRelation: 'verifier',
          verified: false,
          stage: 'ready-to-review',
          status: 'ready-to-review',
        },
      });
    });
    await jb.signInAs('member');
    await jb.goto('/b/legacy-financial');

    await business.previewBanner.waitFor();
    await shot(page, 'preview-team');
    await detail(business.previewBanner, 'preview-team-detail', 8);
  });
});

test.describe('phone', () => {
  test.use(PHONE);

  test('the sold-out card on a phone', async ({ page, jb }) => {
    const shop = new BusinessPage(page);
    await jb.open('shop.sold-out');
    await shop.productCard(1).badge.waitFor();

    await bringToTop(shop.products, 72);
    await shot(page, 'shop-sold-out-phone');
  });
});
