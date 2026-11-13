import { expect, test } from '../fixtures/jb-test';
import { PRODUCTS as ROWS, photoKey, stubCatalogue } from '../fixtures/catalogue';
import { fulfil, recordedAnswer } from '../fixtures/mock-api';
import { largePng, png } from '../fixtures/photos';
import { MyProductsPage } from '../pages/my-products.page';
import { ProductEditorDialog } from '../pages/product-editor.dialog';
import { ProductPage } from '../pages/product.page';

// Product photos: L2-091 AC9 and AC10 (ADR 0063). The upload and the save are answered by the stub
// of the owner's catalogue; `/media/…` by the mocks' mug.

const PRODUCTS = '/my-business/products';
const MUG = 'Gold cross stoneware mug';

test.describe('product photos (L2-091 AC9, AC10)', () => {
  test('AC9: a chosen photo is uploaded, shown beside the button and saved with the product', async ({
    page,
    jb,
  }) => {
    const products = new MyProductsPage(page);
    const editor = new ProductEditorDialog(page);
    await products.setWidth(1280);
    const fake = await stubCatalogue(page);
    await jb.goto(PRODUCTS);

    await products.add.click();
    await expect(editor.photoButton).toHaveText('Add photo');
    await expect(editor.photoCaption).toBeVisible();
    await expect(editor.photoImage).toHaveCount(0);
    await editor.picker.setInputFiles(png(40, 40, 'bench.png'));

    await expect(editor.photoImage).toHaveAttribute('src', `/media/${photoKey(1)}/640.jpg`);
    await expect(editor.photoButton).toHaveText('Change photo');
    await expect(editor.removePhoto).toBeVisible();
    expect(fake.uploads).toHaveLength(1);

    await editor.name.fill('Walnut prayer bench');
    await editor.price.fill('185.00');
    await editor.submit.click();

    await expect(editor.root).toBeHidden();
    expect(fake.productSaves[0]).toMatchObject({ photoId: fake.uploads[0].id });
    await expect(products.row('Walnut prayer bench').locator('img')).toHaveAttribute(
      'alt',
      'Walnut prayer bench',
    );
  });

  test('AC9: while the photo uploads the button says so and the product waits for it', async ({
    page,
    jb,
  }) => {
    const products = new MyProductsPage(page);
    const editor = new ProductEditorDialog(page);
    await products.setWidth(1280);
    await stubCatalogue(page, { upload: 'hangs' });
    await jb.goto(PRODUCTS);

    await products.add.click();
    await editor.picker.setInputFiles(png(40, 40, 'bench.png'));

    await expect(editor.photoButton).toHaveText('Adding photo…');
    await expect(editor.photoButton).toBeDisabled();
    await expect(editor.photoButton).toHaveAttribute('aria-busy', 'true');
    await expect(editor.submit).toBeDisabled();
  });

  test('AC9: a photo over 5 MB is refused before it is sent', async ({ page, jb }) => {
    const products = new MyProductsPage(page);
    const editor = new ProductEditorDialog(page);
    await products.setWidth(1280);
    const fake = await stubCatalogue(page);
    await jb.goto(PRODUCTS);

    await products.add.click();
    await editor.name.fill('Walnut prayer bench');
    await editor.picker.setInputFiles(largePng());

    await expect(editor.photoError).toHaveText('Photos can be 5 MB at most.');
    await expect(editor.photoButton).toHaveText('Add photo');
    await expect(editor.name).toHaveValue('Walnut prayer bench');
    expect(fake.uploads).toHaveLength(0);
  });

  for (const [upload, words] of [
    ['infected', 'This photo didn’t pass our safety check.'],
    ['not-an-image', 'Add a JPG or PNG photo.'],
    ['unavailable', 'We couldn’t add the photo. Try again.'],
  ] as const) {
    test(`AC9: a photo the server refuses (${upload}) says why and leaves the tile as it was`, async ({
      page,
      jb,
    }) => {
      const products = new MyProductsPage(page);
      const editor = new ProductEditorDialog(page);
      await products.setWidth(1280);
      await stubCatalogue(page, { upload });
      await jb.goto(PRODUCTS);

      await products.add.click();
      await editor.name.fill('Walnut prayer bench');
      await editor.picker.setInputFiles(png(40, 40, 'bench.png'));

      await expect(editor.photoError).toHaveText(words);
      await expect(editor.photoImage).toHaveCount(0);
      await expect(editor.photoButton).toHaveText('Add photo');
      await expect(editor.name).toHaveValue('Walnut prayer bench');
    });
  }

  test('AC9: "Remove photo" saves the product without its photo', async ({ page, jb }) => {
    const products = new MyProductsPage(page);
    const editor = new ProductEditorDialog(page);
    await products.setWidth(1280);
    const photo = {
      id: 'c3000000-0000-4000-8000-000000000099',
      key: photoKey(99),
      width: 800,
      height: 800,
    };
    const rows = structuredClone(ROWS);
    rows[1].photo = photo;
    const fake = await stubCatalogue(page, { productRows: rows });
    await jb.goto(PRODUCTS);

    await expect(products.row(MUG).locator('img')).toHaveAttribute('alt', MUG);
    await products.edit(MUG).click();
    await expect(editor.photoImage).toHaveAttribute('src', `/media/${photo.key}/640.jpg`);
    await editor.removePhoto.click();

    await expect(editor.photoImage).toHaveCount(0);
    await expect(editor.photoButton).toHaveText('Add photo');
    await editor.submit.click();
    await expect(editor.root).toBeHidden();
    expect(fake.productSaves[0]).toMatchObject({ photoId: null });
    await expect(products.row(MUG).locator('img')).toHaveCount(0);
  });

  test('AC9: saving without touching the photo keeps it', async ({ page, jb }) => {
    const products = new MyProductsPage(page);
    const editor = new ProductEditorDialog(page);
    await products.setWidth(1280);
    const photo = {
      id: 'c3000000-0000-4000-8000-000000000099',
      key: photoKey(99),
      width: 800,
      height: 800,
    };
    const rows = structuredClone(ROWS);
    rows[1].photo = photo;
    const fake = await stubCatalogue(page, { productRows: rows });
    await jb.goto(PRODUCTS);

    await products.edit(MUG).click();
    await editor.price.fill('26.00');
    await editor.submit.click();

    await expect(editor.root).toBeHidden();
    expect(fake.productSaves[0]).toMatchObject({ photoId: photo.id });
  });

  test('AC10: the product page shows the photo in place of the tile, named by the product', async ({
    page,
    jb,
  }) => {
    const product = new ProductPage(page);
    await product.setWidth(1280);
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
    await stubCatalogueMedia(page);
    await jb.open('product');

    const photo = product.mediaTile.locator('img');
    await expect(photo).toHaveAttribute('alt', 'Faith heavyweight tee, charcoal');
    await expect(photo).toHaveAttribute('src', `/media/${photoKey(7)}/640.jpg`);
    await expect(product.mediaTile.locator('svg')).toHaveCount(0);
  });
});

/** The product page needs only the photos, not the owner's catalogue. */
async function stubCatalogueMedia(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/media/**', (route) =>
    /\.woff2?(\?|$)/.test(route.request().url())
      ? route.fallback()
      : route.fulfill({ status: 200, contentType: 'image/jpeg', body: Buffer.alloc(0) }),
  );
}
