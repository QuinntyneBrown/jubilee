import { expect, test } from '../fixtures/jb-test';
import { stubCatalogue } from '../fixtures/catalogue';
import { MyProductsPage } from '../pages/my-products.page';
import { MyServicesPage } from '../pages/my-services.page';
import { Toasts } from '../pages/toasts';

// Drag to reorder products and services, the move buttons kept as its keyboard equivalent:
// L2-090 AC2 (ADR 0063).

const PRODUCTS = '/my-business/products';
const SERVICES = '/my-business/services';

const TEE = 'Faith heavyweight tee, charcoal';
const MUG = 'Gold cross stoneware mug';
const TEAM = 'Custom church team tee';
const MORNING = 'Morning mug, set of two';
const CONSULTATION = 'Custom design consultation';
const PACKAGE = 'Church merch package';

test.describe('drag to reorder (L2-090 AC2)', () => {
  test('a product dragged by its handle takes its new place, and the move is saved', async ({
    page,
    jb,
  }) => {
    const products = new MyProductsPage(page);
    await products.setWidth(1280);
    const fake = await stubCatalogue(page);
    await jb.goto(PRODUCTS);
    const morning = fake.productRows[3].id;

    await products.drag(MORNING, TEE);

    await expect.poll(() => products.names()).toEqual([MORNING, TEE, MUG, `${TEAM} (min. 12)`]);
    expect(fake.moves).toEqual([{ id: morning, position: 1 }]);
    await expect(products.announcement).toHaveText(`${MORNING} moved to position 1 of 4.`);
  });

  test('a product dropped where it was sends nothing', async ({ page, jb }) => {
    const products = new MyProductsPage(page);
    await products.setWidth(1280);
    const fake = await stubCatalogue(page);
    await jb.goto(PRODUCTS);

    await products.drag(MUG, MUG);

    await expect(products.rows).toHaveCount(4);
    expect((await products.names())[1]).toBe(MUG);
    expect(fake.moves).toEqual([]);
  });

  test('a dragged product goes back when the move fails, and the page says so', async ({
    page,
    jb,
  }) => {
    const products = new MyProductsPage(page);
    const toasts = new Toasts(page);
    await products.setWidth(1280);
    const fake = await stubCatalogue(page, { move: 'fails' });
    await jb.goto(PRODUCTS);

    await products.drag(MORNING, TEE);

    await expect(toasts.withTitle('Couldn’t move the product')).toContainText(
      'The order is unchanged. Try again.',
    );
    await expect.poll(() => products.names()).toEqual([TEE, MUG, `${TEAM} (min. 12)`, MORNING]);
    expect(fake.moves).toHaveLength(1);
  });

  test('the product handle is for a pointer; the keyboard has the move buttons', async ({
    page,
    jb,
  }) => {
    const products = new MyProductsPage(page);
    await products.setWidth(1280);
    await stubCatalogue(page);
    await jb.goto(PRODUCTS);

    await expect(products.dragHandle(MUG)).toHaveAttribute('aria-hidden', 'true');
    await expect(products.dragHandle(MUG)).toHaveAttribute('tabindex', '-1');
    await expect(products.dragHandle(MUG)).toHaveAttribute('title', 'Drag to reorder');
    // The handle is first in each row's actions, yet Tab passes it by.
    await products.remove(TEE).focus();
    await page.keyboard.press('Tab');
    await expect(products.moveUp(MUG)).toBeFocused();
    await expect(products.dragHelp).toHaveText(
      'Drag a product by its handle, or use the arrows, to change the order.',
    );
  });

  test('a service dragged by its handle takes its new place, and the move is saved', async ({
    page,
    jb,
  }) => {
    const services = new MyServicesPage(page);
    await services.setWidth(1280);
    const fake = await stubCatalogue(page);
    await jb.goto(SERVICES);
    const pack = fake.serviceRows[1].id;

    await services.drag(PACKAGE, CONSULTATION);

    await expect.poll(() => services.names()).toEqual([PACKAGE, CONSULTATION]);
    expect(fake.moves).toEqual([{ id: pack, position: 1 }]);
    await expect(services.dragHandle(PACKAGE)).toHaveAttribute('aria-hidden', 'true');
    await expect(services.dragHelp).toHaveText(
      'Drag a service by its handle, or use the arrows, to change the order.',
    );
  });

  test('a dragged service goes back when the move fails, and the page says so', async ({
    page,
    jb,
  }) => {
    const services = new MyServicesPage(page);
    const toasts = new Toasts(page);
    await services.setWidth(1280);
    await stubCatalogue(page, { move: 'fails' });
    await jb.goto(SERVICES);

    await services.drag(PACKAGE, CONSULTATION);

    await expect(toasts.withTitle('Couldn’t move the service')).toContainText(
      'The order is unchanged. Try again.',
    );
    await expect.poll(() => services.names()).toEqual([CONSULTATION, PACKAGE]);
  });
});
