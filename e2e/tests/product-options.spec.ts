import { expect, test } from '../fixtures/jb-test';
import { PRODUCTS as ROWS, stubCatalogue } from '../fixtures/catalogue';
import { MyProductsPage } from '../pages/my-products.page';
import { ProductEditorDialog } from '../pages/product-editor.dialog';

// Options and minimum order in the product editor: L2-091 AC8 (ADR 0062).

const PRODUCTS = '/my-business/products';
const TEAM = 'Custom church team tee';

test.describe('product options and minimum order (L2-091 AC8)', () => {
  test('the editor offers a minimum order and options, each with its hint', async ({
    page,
    jb,
  }) => {
    const products = new MyProductsPage(page);
    const editor = new ProductEditorDialog(page);
    await products.setWidth(1280);
    await stubCatalogue(page);
    await jb.goto(PRODUCTS);

    await products.add.click();

    await expect(editor.minimum).toHaveValue('');
    await expect(
      editor.root.getByText('The fewest a member can ask for. Empty is 1.'),
    ).toBeVisible();
    await expect(editor.optionsHelp).toHaveText('Sizes or colours, each with its own stock.');
    await expect(editor.optionName).toHaveCount(0);
    await expect(editor.stock).toBeVisible();
    await expect(editor.addOption).toBeVisible();
  });

  test('options with their own stock and a minimum order are saved and listed', async ({
    page,
    jb,
  }) => {
    const products = new MyProductsPage(page);
    const editor = new ProductEditorDialog(page);
    await products.setWidth(1280);
    const fake = await stubCatalogue(page);
    await jb.goto(PRODUCTS);

    await products.add.click();
    await editor.name.fill('Youth retreat hoodie');
    await editor.price.fill('48.00');
    await editor.minimum.fill('6');
    await editor.addOption.click();

    await expect(editor.stock).toHaveCount(0);
    await expect(editor.option(1)).toBeFocused();
    await editor.optionName.fill('Size');
    await editor.option(1).fill('S');
    await editor.optionStock(1).fill('3');
    await editor.addOption.click();
    await editor.option(2).fill('M');
    await editor.optionStock(2).fill('0');
    await editor.submit.click();

    await expect(editor.root).toBeHidden();
    expect(fake.productSaves[0]).toMatchObject({
      minimumQuantity: 6,
      optionName: 'Size',
      options: [
        { label: 'S', stock: 3 },
        { label: 'M', stock: 0 },
      ],
    });
    await expect(products.row('Youth retreat hoodie')).toContainText('min. 6');
  });

  test('an option left without stock is not tracked, and an empty minimum is 1', async ({
    page,
    jb,
  }) => {
    const products = new MyProductsPage(page);
    const editor = new ProductEditorDialog(page);
    await products.setWidth(1280);
    const fake = await stubCatalogue(page);
    await jb.goto(PRODUCTS);

    await products.add.click();
    await editor.name.fill('Prayer journal');
    await editor.price.fill('18.00');
    await editor.addOption.click();
    await editor.option(1).fill('Navy');
    await editor.submit.click();

    await expect(editor.root).toBeHidden();
    expect(fake.productSaves[0]).toMatchObject({
      minimumQuantity: 1,
      options: [{ label: 'Navy', stock: null }],
    });
  });

  test('editing shows the options and minimum, and removing the last option brings back the stock', async ({
    page,
    jb,
  }) => {
    const products = new MyProductsPage(page);
    const editor = new ProductEditorDialog(page);
    await products.setWidth(1280);
    const rows = structuredClone(ROWS);
    rows[2].optionName = 'Size';
    rows[2].options = [
      { label: 'S', stock: 20 },
      { label: 'M', stock: 35 },
    ];
    const fake = await stubCatalogue(page, { productRows: rows });
    await jb.goto(PRODUCTS);

    await products.edit(TEAM).click();

    await expect(editor.minimum).toHaveValue('12');
    await expect(editor.optionName).toHaveValue('Size');
    await expect(editor.option(1)).toHaveValue('S');
    await expect(editor.optionStock(2)).toHaveValue('35');
    await expect(editor.stock).toHaveCount(0);

    await editor.removeOption(1).click();
    await expect(editor.option(1)).toHaveValue('M');
    await editor.removeOption(1).click();
    await expect(editor.optionName).toHaveCount(0);
    await expect(editor.stock).toBeVisible();
    await editor.stock.fill('40');
    await editor.submit.click();

    await expect(editor.root).toBeHidden();
    expect(fake.productSaves[0]).toMatchObject({ options: [], stock: 40, minimumQuantity: 12 });
  });

  test('a product has at most 10 options', async ({ page, jb }) => {
    const products = new MyProductsPage(page);
    const editor = new ProductEditorDialog(page);
    await products.setWidth(1280);
    await stubCatalogue(page);
    await jb.goto(PRODUCTS);

    await products.add.click();
    for (let n = 1; n <= 10; n++) await editor.addOption.click();

    await expect(editor.option(10)).toBeVisible();
    await expect(editor.addOption).toHaveCount(0);
    await expect(editor.optionsHelp).toHaveText('10 options is the most a product can have.');
  });

  test('a blank or repeated option name and a minimum outside 1 to 999 are refused, and nothing is sent', async ({
    page,
    jb,
  }) => {
    const products = new MyProductsPage(page);
    const editor = new ProductEditorDialog(page);
    await products.setWidth(1280);
    const fake = await stubCatalogue(page);
    await jb.goto(PRODUCTS);

    await products.add.click();
    await editor.name.fill('Youth retreat hoodie');
    await editor.price.fill('48.00');
    await editor.minimum.fill('0');
    await editor.addOption.click();
    await editor.option(1).fill('M');
    await editor.addOption.click();
    await editor.option(2).fill('m ');
    await editor.submit.click();

    await expect(editor.root.getByText('Enter a whole number from 1 to 999.')).toBeVisible();
    await expect(editor.optionsError).toHaveText('Give each option its own name.');
    await expect(editor.minimum).toBeFocused();
    expect(fake.productSaves).toHaveLength(0);

    await editor.minimum.fill('1000');
    await editor.option(2).fill('');
    await editor.submit.click();
    await expect(editor.root.getByText('Enter a whole number from 1 to 999.')).toBeVisible();
    await expect(editor.optionsError).toHaveText('Give each option its own name.');
    expect(fake.productSaves).toHaveLength(0);
  });
});
