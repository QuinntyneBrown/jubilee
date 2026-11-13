import { expect, test } from '../fixtures/jb-test';
import { stubCatalogue } from '../fixtures/catalogue';
import { DeleteItemDialog } from '../pages/delete-item.dialog';
import { ForbiddenPage } from '../pages/forbidden.page';
import { MyProductsPage } from '../pages/my-products.page';
import { MyServicesPage } from '../pages/my-services.page';
import { ProductEditorDialog } from '../pages/product-editor.dialog';
import { ServiceEditorDialog } from '../pages/service-editor.dialog';
import { Toasts } from '../pages/toasts';

const PRODUCTS = '/my-business/products';
const SERVICES = '/my-business/services';

const TEE = 'Faith heavyweight tee, charcoal';
const MUG = 'Gold cross stoneware mug';
const TEAM = 'Custom church team tee';
const MORNING = 'Morning mug, set of two';

test.describe('manage products (L2-089 to L2-091, L2-095, L2-127, L2-130, L2-132)', () => {
  test('L2-089: the products are listed with price, status and requests', async ({ page, jb }) => {
    const products = new MyProductsPage(page);
    await products.setWidth(1280);
    await stubCatalogue(page);
    await jb.goto(PRODUCTS);

    await expect(products.heading).toHaveText('Luzandre.com');
    await expect(products.summary).toHaveText('4 products · 1 sold out');
    await expect(products.rows).toHaveCount(4);
    await expect(products.row(TEE)).toContainText('$34');
    await expect(products.status(TEE)).toHaveText('Sold out');
    await expect(products.status(MUG)).toHaveText('Listed');
    await expect(products.row(MUG)).toContainText('26');
    await expect(products.row(TEAM)).toContainText('$22 ea');
    await expect(products.row(TEAM)).toContainText('min. 12');
    await expect(products.sections.getByRole('link', { name: 'Products' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('L2-089: a shop without products offers to add the first one', async ({ page, jb }) => {
    const products = new MyProductsPage(page);
    const editor = new ProductEditorDialog(page);
    await products.setWidth(1280);
    await stubCatalogue(page, { productRows: [] });
    await jb.goto(PRODUCTS);

    await expect(products.empty).toContainText('No products yet');
    await products.empty.getByRole('button', { name: 'Add product' }).click();
    await expect(editor.title).toHaveText('Add a product');
  });

  test('L2-089: a failed load names its reference and Try again loads the products', async ({
    page,
    jb,
  }) => {
    const products = new MyProductsPage(page);
    await products.setWidth(1280);
    const fake = await stubCatalogue(page, { products: 'fails' });
    await jb.goto(PRODUCTS);

    await expect(products.reference).toHaveText('JB-PRD-503');
    await expect(products.backToOverview).toBeVisible();
    fake.products = 'ok';
    await products.tryAgain.click();
    await expect(products.rows).toHaveCount(4);
  });

  test('L2-097: an answer of 403 shows the forbidden page', async ({ page, jb }) => {
    const forbidden = new ForbiddenPage(page);
    await forbidden.setWidth(1280);
    await stubCatalogue(page, { products: 'forbidden' });
    await jb.goto(PRODUCTS);

    await expect(forbidden.heading).toBeVisible();
    await expect(page).toHaveURL(/\/forbidden$/);
  });

  test('L2-091: adding a product lists it and the toast links to the shop', async ({
    page,
    jb,
  }) => {
    const products = new MyProductsPage(page);
    const editor = new ProductEditorDialog(page);
    const toasts = new Toasts(page);
    await products.setWidth(1280);
    const fake = await stubCatalogue(page);
    await jb.goto(PRODUCTS);

    await page.route('**/api/listings/luzandre-com/products/olive-wood-cross', (route) =>
      route.fulfill({ status: 404, json: { title: 'Not found', status: 404 } }),
    );
    await products.add.click();
    await expect(editor.title).toHaveText('Add a product');
    await editor.name.fill('Olive wood cross');
    await editor.price.fill('18.50');
    await editor.stock.fill('7');
    await editor.submit.click();

    const toast = toasts.withTitle('Product added');
    await expect(toast).toContainText('“Olive wood cross” is live in your shop.');
    await expect(editor.root).toBeHidden();
    await expect(products.rows).toHaveCount(5);
    await expect(products.row('Olive wood cross')).toContainText('$18.50');
    expect(fake.productSaves).toHaveLength(1);
    expect(fake.productSaves[0]).toMatchObject({ name: 'Olive wood cross', price: '18.50' });
    await expect(products.add).toBeFocused();

    await toasts.action(toast, 'View in shop').click();
    await expect(page).toHaveURL(/\/b\/luzandre-com\/p\/olive-wood-cross$/);
  });

  test('L2-091: an empty stock of 0 lists the product as sold out', async ({ page, jb }) => {
    const products = new MyProductsPage(page);
    const editor = new ProductEditorDialog(page);
    await products.setWidth(1280);
    await stubCatalogue(page);
    await jb.goto(PRODUCTS);

    await products.edit(MORNING).click();
    await expect(editor.title).toHaveText('Edit product');
    await expect(editor.name).toHaveValue(MORNING);
    await expect(editor.price).toHaveValue('42.00');
    await editor.stock.fill('0');
    await editor.submit.click();

    await expect(products.status(MORNING)).toHaveText('Sold out');
    await expect(products.summary).toHaveText('4 products · 2 sold out');
  });

  test('L2-036 AC3: setting the stock to 0 tells the owner the product is sold out', async ({
    page,
    jb,
  }) => {
    const products = new MyProductsPage(page);
    const editor = new ProductEditorDialog(page);
    const toasts = new Toasts(page);
    await products.setWidth(1280);
    await stubCatalogue(page);
    await jb.goto(PRODUCTS);

    await products.edit(MORNING).click();
    await editor.stock.fill('0');
    await editor.submit.click();

    const toast = toasts.warning(`“${MORNING}” is sold out`);
    await expect(toast).toContainText('Members can still ask to be told when it’s back.');
    await expect(toasts.dismiss(toast)).toBeVisible();
    // It takes the place of the toast that confirms the save
    await expect(toasts.withTitle('Product updated')).toHaveCount(0);
    await expect(products.status(MORNING)).toHaveText('Sold out');
  });

  test('L2-036 AC3: a product added with a stock of 0 is told as sold out', async ({
    page,
    jb,
  }) => {
    const products = new MyProductsPage(page);
    const editor = new ProductEditorDialog(page);
    const toasts = new Toasts(page);
    await products.setWidth(1280);
    await stubCatalogue(page);
    await jb.goto(PRODUCTS);

    await products.add.click();
    await editor.name.fill('Olive wood cross');
    await editor.price.fill('18.50');
    await editor.stock.fill('0');
    await editor.submit.click();

    await expect(toasts.warning('“Olive wood cross” is sold out')).toBeVisible();
    await expect(toasts.withTitle('Product added')).toHaveCount(0);
  });

  test('L2-036 AC3: a save that leaves stock, or brings it back, confirms the save as before', async ({
    page,
    jb,
  }) => {
    const products = new MyProductsPage(page);
    const editor = new ProductEditorDialog(page);
    const toasts = new Toasts(page);
    await products.setWidth(1280);
    await stubCatalogue(page);
    await jb.goto(PRODUCTS);

    // The tee is sold out; Naomi restocks it
    await products.edit(TEE).click();
    await editor.stock.fill('12');
    await editor.submit.click();

    await expect(toasts.withTitle('Product updated')).toContainText(`“${TEE}” is updated.`);
    await expect(toasts.warning(/is sold out/)).toHaveCount(0);
    await expect(products.summary).toHaveText('4 products');
  });

  test('L2-091 AC3: a missing name and a bad price are explained and nothing is sent', async ({
    page,
    jb,
  }) => {
    const products = new MyProductsPage(page);
    const editor = new ProductEditorDialog(page);
    await products.setWidth(1280);
    const fake = await stubCatalogue(page);
    await jb.goto(PRODUCTS);

    await products.add.click();
    await editor.price.fill('twelve');
    await editor.submit.click();

    await expect(editor.errors.nth(0)).toHaveText('Enter a name for the product.');
    await expect(editor.errors.nth(1)).toHaveText('Enter a price in dollars, like 24.00.');
    await expect(editor.name).toBeFocused();
    expect(fake.productSaves).toHaveLength(0);
  });

  test('L2-127: while saving the dialog is busy, and a failure keeps what was typed', async ({
    page,
    jb,
  }) => {
    const products = new MyProductsPage(page);
    const editor = new ProductEditorDialog(page);
    await products.setWidth(1280);
    const fake = await stubCatalogue(page, { save: 'fails' });
    await jb.goto(PRODUCTS);

    await products.add.click();
    await editor.name.fill('Olive wood cross');
    await editor.price.fill('18.50');
    await editor.submit.click();

    await expect(editor.alert).toContainText('We couldn’t save the product');
    await expect(editor.name).toHaveValue('Olive wood cross');
    await expect(editor.price).toHaveValue('18.50');
    expect(fake.productSaves).toHaveLength(1);

    fake.save = 'ok';
    await editor.submit.click();
    await expect(editor.root).toBeHidden();
    await expect(products.row('Olive wood cross')).toBeVisible();
  });

  test('L2-127 AC2: a save that never answers fails after ten seconds', async ({ page, jb }) => {
    const products = new MyProductsPage(page);
    const editor = new ProductEditorDialog(page);
    await products.setWidth(1280);
    await page.clock.install();
    await stubCatalogue(page, { save: 'hangs' });
    await jb.goto(PRODUCTS);

    await products.add.click();
    await editor.name.fill('Olive wood cross');
    await editor.price.fill('18.50');
    await editor.submit.click();
    await expect(editor.submit).toHaveAttribute('aria-busy', 'true');

    await page.clock.fastForward(10_500);
    await expect(editor.alert).toContainText('We couldn’t save the product');
    await expect(editor.submit).not.toHaveAttribute('aria-busy', 'true');
  });

  test('L2-132: a retry after a failure sends the same idempotency key', async ({ page, jb }) => {
    const products = new MyProductsPage(page);
    const editor = new ProductEditorDialog(page);
    await products.setWidth(1280);
    const fake = await stubCatalogue(page, { save: 'fails' });
    await jb.goto(PRODUCTS);

    await products.add.click();
    await editor.name.fill('Olive wood cross');
    await editor.price.fill('18.50');
    await editor.submit.click();
    await expect(editor.alert).toBeVisible();
    fake.save = 'ok';
    await editor.submit.click();
    await expect(editor.root).toBeHidden();

    expect(fake.productSaves).toHaveLength(2);
    const [first, second] = fake.productSaves;
    expect(first['idempotencyKey']).toBeTruthy();
    expect(second['idempotencyKey']).toBe(first['idempotencyKey']);
  });

  test('L2-091 AC4: the product limit is told in the dialog', async ({ page, jb }) => {
    const products = new MyProductsPage(page);
    const editor = new ProductEditorDialog(page);
    await products.setWidth(1280);
    await stubCatalogue(page, { save: 'limit' });
    await jb.goto(PRODUCTS);

    await products.add.click();
    await editor.name.fill('Olive wood cross');
    await editor.price.fill('18.50');
    await editor.submit.click();

    await expect(editor.alert).toContainText('You can list up to 100 products.');
  });

  test('L2-130 AC3: closing with typed text asks before discarding it', async ({ page, jb }) => {
    const products = new MyProductsPage(page);
    const editor = new ProductEditorDialog(page);
    await products.setWidth(1280);
    const fake = await stubCatalogue(page);
    await jb.goto(PRODUCTS);

    await products.add.click();
    await editor.name.fill('Olive wood cross');
    await page.keyboard.press('Escape');
    await expect(editor.root).toContainText('Discard what you typed?');
    await expect(editor.keepEditing).toBeFocused();

    await editor.keepEditing.click();
    await expect(editor.name).toHaveValue('Olive wood cross');

    await editor.cancel.click();
    await editor.discard.click();
    await expect(editor.root).toBeHidden();
    await expect(products.add).toBeFocused();
    expect(fake.productSaves).toHaveLength(0);
  });

  test('L2-130: an untouched editor closes at once', async ({ page, jb }) => {
    const products = new MyProductsPage(page);
    const editor = new ProductEditorDialog(page);
    await products.setWidth(1280);
    await stubCatalogue(page);
    await jb.goto(PRODUCTS);

    await products.add.click();
    await page.keyboard.press('Escape');
    await expect(editor.root).toBeHidden();
  });

  test('L2-092: deleting asks first, says what happens, and removes the product', async ({
    page,
    jb,
  }) => {
    const products = new MyProductsPage(page);
    const confirm = new DeleteItemDialog(page, 'product');
    const toasts = new Toasts(page);
    await products.setWidth(1280);
    const fake = await stubCatalogue(page);
    await jb.goto(PRODUCTS);

    await products.remove(MUG).click();
    await expect(confirm.title).toHaveText(`Delete “${MUG}”?`);
    await expect(confirm.description).toContainText(
      'It disappears from your shop now. The 26 past requests for it stay in your records.',
    );
    await expect(confirm.keep).toBeFocused();
    expect(fake.deleted).toEqual([]);

    await confirm.confirm.click();
    await expect(toasts.withTitle('Product deleted')).toBeVisible();
    await expect(products.rows).toHaveCount(3);
    await expect(products.row(MUG)).toHaveCount(0);
    expect(fake.deleted).toEqual([MUG]);
  });

  test('L2-092: keeping the product changes nothing', async ({ page, jb }) => {
    const products = new MyProductsPage(page);
    const confirm = new DeleteItemDialog(page, 'product');
    await products.setWidth(1280);
    const fake = await stubCatalogue(page);
    await jb.goto(PRODUCTS);

    await products.remove(MUG).click();
    await confirm.keep.click();
    await expect(confirm.root).toBeHidden();
    await expect(products.remove(MUG)).toBeFocused();
    await expect(products.rows).toHaveCount(4);
    expect(fake.deleted).toEqual([]);
  });

  test('L2-128: a failed delete says the product is still listed and can be retried', async ({
    page,
    jb,
  }) => {
    const products = new MyProductsPage(page);
    const confirm = new DeleteItemDialog(page, 'product');
    await products.setWidth(1280);
    const fake = await stubCatalogue(page, { remove: 'fails' });
    await jb.goto(PRODUCTS);

    await products.remove(MUG).click();
    await confirm.confirm.click();
    await expect(confirm.alert).toContainText('We couldn’t delete it');
    await expect(confirm.alert).toContainText('The product is still listed.');
    await expect(products.rows).toHaveCount(4);

    fake.remove = 'ok';
    await confirm.confirm.click();
    await expect(products.rows).toHaveCount(3);
  });

  test('L2-090: moving a product changes the order and announces it', async ({ page, jb }) => {
    const products = new MyProductsPage(page);
    await products.setWidth(1280);
    const fake = await stubCatalogue(page);
    await jb.goto(PRODUCTS);

    await expect(products.moveUp(TEE)).toBeDisabled();
    await expect(products.moveDown(MORNING)).toBeDisabled();
    await products.moveDown(TEE).click();

    await expect.poll(() => products.names()).toEqual(expect.arrayContaining([TEE]));
    expect((await products.names())[1]).toContain(TEE);
    await expect(products.announcement).toHaveText(`${TEE} moved to position 2 of 4.`);
    expect(fake.moves).toEqual([{ id: fake.productRows[1].id, position: 2 }]);
    await expect(products.moveDown(TEE)).toBeFocused();
  });

  test('L2-090: a failed move keeps the order and says so', async ({ page, jb }) => {
    const products = new MyProductsPage(page);
    const toasts = new Toasts(page);
    await products.setWidth(1280);
    await stubCatalogue(page, { move: 'fails' });
    await jb.goto(PRODUCTS);

    await products.moveDown(TEE).click();
    await expect(toasts.withTitle('Couldn’t move the product')).toBeVisible();
    expect((await products.names())[0]).toContain(TEE);
  });
});

test.describe('manage services (L2-092 to L2-095, L2-128)', () => {
  test('L2-092: the services are listed with their price and detail', async ({ page, jb }) => {
    const services = new MyServicesPage(page);
    await services.setWidth(1280);
    await stubCatalogue(page);
    await jb.goto(SERVICES);

    await expect(services.summary).toHaveText('2 services');
    await expect(services.rows).toHaveCount(2);
    await expect(services.price('Custom design consultation')).toHaveText('Free');
    await expect(services.row('Custom design consultation')).toContainText('30 min · Video');
    await expect(services.price('Church merch package')).toHaveText('Ask');
    await expect(services.row('Church merch package')).toContainText(
      'Tees, mugs and totes for your congregation',
    );
  });

  test('L2-092: no services shows an empty state, and a failed load quotes its reference', async ({
    page,
    jb,
  }) => {
    const services = new MyServicesPage(page);
    await services.setWidth(1280);
    const fake = await stubCatalogue(page, { serviceRows: [], services: 'fails' });
    await jb.goto(SERVICES);

    await expect(services.reference).toHaveText('JB-SVC-503');
    fake.services = 'ok';
    await services.tryAgain.click();
    await expect(services.empty).toContainText('No services yet');
  });

  test('L2-094: adding a service that members can book stores its length and modes', async ({
    page,
    jb,
  }) => {
    const services = new MyServicesPage(page);
    const editor = new ServiceEditorDialog(page);
    const toasts = new Toasts(page);
    await services.setWidth(1280);
    const fake = await stubCatalogue(page);
    await jb.goto(SERVICES);

    await services.add.click();
    await editor.name.fill('Logo workshop');
    await editor.pricing.selectOption('amount');
    await editor.price.fill('80');
    await editor.action.selectOption('book');
    await editor.duration.fill('60');
    await editor.inPerson.check();
    await editor.place.fill('Studio in Leslieville');
    await editor.submit.click();

    await expect(toasts.withTitle('Service added')).toBeVisible();
    await expect(services.rows).toHaveCount(3);
    await expect(services.price('Logo workshop')).toHaveText('$80');
    expect(fake.serviceSaves[0]).toMatchObject({
      name: 'Logo workshop',
      pricing: 'amount',
      price: '80',
      action: 'book',
      durationMinutes: 60,
      offersVideo: true,
      offersInPerson: true,
      place: 'Studio in Leslieville',
    });
    await expect(services.add).toBeFocused();
  });

  test('L2-094 AC2: choosing free or ask hides the price and sends none', async ({ page, jb }) => {
    const services = new MyServicesPage(page);
    const editor = new ServiceEditorDialog(page);
    await services.setWidth(1280);
    const fake = await stubCatalogue(page);
    await jb.goto(SERVICES);

    await services.add.click();
    await editor.name.fill('Prayer shawl fitting');
    await editor.pricing.selectOption('amount');
    await editor.price.fill('20');
    await editor.pricing.selectOption('ask');
    await expect(editor.price).toHaveCount(0);
    await editor.submit.click();

    await expect(editor.root).toBeHidden();
    expect(fake.serviceSaves[0]).toMatchObject({ pricing: 'ask', price: '' });
  });

  test('L2-094: a fixed price must be dollars, and booking needs a way to meet', async ({
    page,
    jb,
  }) => {
    const services = new MyServicesPage(page);
    const editor = new ServiceEditorDialog(page);
    await services.setWidth(1280);
    const fake = await stubCatalogue(page);
    await jb.goto(SERVICES);

    await services.add.click();
    await editor.name.fill('Logo workshop');
    await editor.pricing.selectOption('amount');
    await editor.price.fill('free');
    await editor.action.selectOption('book');
    await editor.video.uncheck();
    await editor.submit.click();

    await expect(editor.root).toContainText('Enter a price in dollars, like 8.00.');
    await expect(editor.root).toContainText('Choose video, in person or both.');
    expect(fake.serviceSaves).toHaveLength(0);

    await editor.price.fill('8');
    await editor.inPerson.check();
    await editor.submit.click();
    await expect(editor.root).toContainText('Enter where you meet.');
    expect(fake.serviceSaves).toHaveLength(0);
  });

  test('L2-094: editing a service shows what it has and saves the change', async ({ page, jb }) => {
    const services = new MyServicesPage(page);
    const editor = new ServiceEditorDialog(page);
    const toasts = new Toasts(page);
    await services.setWidth(1280);
    await stubCatalogue(page);
    await jb.goto(SERVICES);

    await services.edit('Church merch package').click();
    await expect(editor.title).toHaveText('Edit service');
    await expect(editor.name).toHaveValue('Church merch package');
    await expect(editor.pricing).toHaveValue('ask');
    await editor.pricing.selectOption('amount');
    await editor.price.fill('250');
    await editor.submit.click();

    await expect(toasts.withTitle('Service updated')).toBeVisible();
    await expect(services.price('Church merch package')).toHaveText('$250');
  });

  test('L2-128: a failed service save keeps the text, and discarding asks first', async ({
    page,
    jb,
  }) => {
    const services = new MyServicesPage(page);
    const editor = new ServiceEditorDialog(page);
    await services.setWidth(1280);
    const fake = await stubCatalogue(page, { save: 'fails' });
    await jb.goto(SERVICES);

    await services.add.click();
    await editor.name.fill('Logo workshop');
    await editor.submit.click();
    await expect(editor.alert).toContainText('We couldn’t save the service');
    await expect(editor.name).toHaveValue('Logo workshop');
    expect(fake.serviceSaves).toHaveLength(1);

    await page.keyboard.press('Escape');
    await expect(editor.root).toContainText('Discard what you typed?');
    await editor.discard.click();
    await expect(editor.root).toBeHidden();
  });

  test('L2-095: deleting a service asks first and removes it', async ({ page, jb }) => {
    const services = new MyServicesPage(page);
    const confirm = new DeleteItemDialog(page, 'service');
    const toasts = new Toasts(page);
    await services.setWidth(1280);
    const fake = await stubCatalogue(page);
    await jb.goto(SERVICES);

    await services.remove('Church merch package').click();
    await expect(confirm.title).toHaveText('Delete “Church merch package”?');
    await expect(confirm.description).toContainText('Members can no longer ask for it.');
    await expect(confirm.keep).toBeFocused();
    await confirm.confirm.click();

    await expect(toasts.withTitle('Service deleted')).toBeVisible();
    await expect(services.rows).toHaveCount(1);
    expect(fake.deleted).toEqual(['Church merch package']);
  });

  test('L2-093: moving a service changes the order', async ({ page, jb }) => {
    const services = new MyServicesPage(page);
    await services.setWidth(1280);
    const fake = await stubCatalogue(page);
    await jb.goto(SERVICES);

    await expect(services.moveUp('Custom design consultation')).toBeDisabled();
    await services.moveDown('Custom design consultation').click();

    await expect
      .poll(() => services.names())
      .toEqual(['Church merch package', 'Custom design consultation']);
    expect(fake.moves).toHaveLength(1);
    expect(fake.moves[0].position).toBe(2);
  });
});
