import { join } from 'node:path';
import { test } from '../../../e2e/fixtures/demo';
import { photoKey, stubCatalogue } from '../../../e2e/fixtures/catalogue';
import { fulfil, recordedAnswer } from '../../../e2e/fixtures/mock-api';
import { SAVED_ITEMS, stubSaved } from '../../../e2e/fixtures/saved';
import { MyProductsPage } from '../../../e2e/pages/my-products.page';
import { ProductEditorDialog } from '../../../e2e/pages/product-editor.dialog';
import { ProductPage } from '../../../e2e/pages/product.page';
import { SavedPage } from '../../../e2e/pages/saved.page';
import { Toasts } from '../../../e2e/pages/toasts';

// Video 25: journey 16, manage products and services (ADR 0063). Naomi adds a product to Luzandre.com
// with a photo, options and a minimum order, then drags another product to the top of her list; a
// member sees a product page with its photo, and a saved product the shop deleted. The app is answered
// by the stand-ins of the behaviour specs (ADR 0009); `/media/…` by the mug of the design reference.
// A card says what the tests prove behind the screen. Built by `node tools/video-demo/build.mjs`
// (docs/videos/README.md).

const MUG_PHOTO = join(__dirname, '..', '..', 'assets', 'photos', 'mug.jpg');
const NEW = 'Gold cross travel mug';
const TEE = 'Faith heavyweight tee, charcoal';
const MORNING = 'Morning mug, set of two';

test('journey 16: manage products and services', async ({ demo }) => {
  const page = demo.page;
  const products = new MyProductsPage(page);
  const editor = new ProductEditorDialog(page);
  const product = new ProductPage(page);
  const saved = new SavedPage(page);
  const toasts = new Toasts(page);
  const park = () => page.mouse.move(1270, 715, { steps: 12 });

  // The owner: Naomi, on the Products of Luzandre.com.
  await stubCatalogue(page);
  await demo.jb.goto('/my-business/products');
  await products.rows.first().waitFor();
  await demo.card('Journey 16 · Manage products and services', [
    'An owner adds, edits, reorders and deletes products and services.',
    'This run: from 90% to 100%.',
  ]);
  await demo.scene('intro');

  await demo.hideCard();
  await demo.scene('products', async () => {
    await demo.point(products.summary);
    await demo.pause(1200);
    await demo.point(products.row(TEE));
    await demo.pause(1200);
    await demo.point(products.dragHandle(TEE));
    await demo.pause(1200);
    await demo.point(products.dragHelp);
  });

  await demo.scene('photo', async () => {
    await demo.click(products.add);
    await editor.title.waitFor();
    await demo.pause(600);
    await demo.point(editor.photoButton);
    await demo.pause(800);
    await editor.picker.setInputFiles(MUG_PHOTO);
    await editor.photoImage.waitFor();
    await demo.point(editor.photoImage);
    await demo.pause(1000);
    await demo.type(editor.name, NEW);
    await demo.type(editor.price, '28.00');
  });

  await demo.scene('options', async () => {
    await demo.type(editor.minimum, '2');
    await demo.click(editor.addOption);
    await demo.type(editor.optionName, 'Size');
    await demo.type(editor.option(1), '12 oz');
    await demo.type(editor.optionStock(1), '8');
    await demo.click(editor.addOption);
    await demo.type(editor.option(2), '16 oz');
    await demo.type(editor.optionStock(2), '5');
  });

  await demo.scene('saved', async () => {
    await demo.click(editor.submit);
    await editor.root.waitFor({ state: 'hidden' });
    await demo.point(products.row(NEW));
    await demo.pause(1500);
    await demo.point(toasts.withTitle('Product added'));
    await demo.pause(1200);
    await demo.click(toasts.dismiss(toasts.withTitle('Product added')));
  });

  await demo.scene('drag', async () => {
    await demo.point(products.dragHandle(MORNING));
    await demo.pause(600);
    await products.drag(MORNING, TEE);
    await products.announcement
      .getByText(/moved to position 1/)
      .waitFor({ state: 'attached', timeout: 10_000 });
    await demo.point(products.row(MORNING));
    await demo.pause(1200);
  });

  // A member, on the public page of a product with a photo.
  await page.route(
    '**/api/listings/luzandre/products/faith-heavyweight-tee-charcoal',
    async (route) => {
      const answer = await recordedAnswer(route);
      const body = answer.body as Record<string, unknown>;
      await fulfil(route, {
        ...answer,
        body: {
          ...body,
          photo: { key: photoKey(7), alt: body['name'], width: 1200, height: 1200 },
        },
      });
    },
  );
  // The tee's photo is the tee of the design reference; every other photo is its mug.
  await page.route(`**/media/${photoKey(7)}/**`, (route) =>
    route.fulfill({ path: join(__dirname, '..', '..', 'assets', 'photos', 'tshirt.jpg') }),
  );
  await demo.jb.open('product');
  await product.mediaTile.locator('img').waitFor();
  await demo.scene('page', async () => {
    await demo.point(product.mediaTile);
    await demo.pause(2000);
  });

  // A member's saved list, after the shop deleted a product she saved.
  await demo.jb.signInAs('member');
  await stubSaved(page, {
    items: [{ ...SAVED_ITEMS[0], available: false, product: null }, ...SAVED_ITEMS.slice(1)],
  });
  await demo.jb.goto('/saved');
  await saved.card('Leather journaling Bible, ESV').waitFor();
  await demo.scene('deleted', async () => {
    await demo.point(saved.card('Leather journaling Bible, ESV'));
    await demo.pause(2000);
  });

  await park();
  await demo.card('Behind the screen', [
    'A photo is checked and scanned before it is stored; an infected one is refused, and at most 30 are taken an hour (CatalogueTests, L2-091 AC9, L2-138 AC6).',
    'Options, a minimum order and a deleted product on saved lists are tested on the server (L2-091 AC8, L2-092 AC2).',
    'A draft listing’s products and services are managed like a live one’s, and 50 services is the most (L2-097 AC3, L2-093 AC3).',
  ]);
  await demo.scene('behind');

  await demo.card('Journey 16 · complete', [
    'Products have a photo, options and a minimum order.',
    'Products and services are dragged by a handle, or moved with the arrows.',
    'Jubilee takes no payment: members pay the business directly.',
  ]);
  await demo.scene('close');
});
