import { expect, test } from '../fixtures/jb-test';
import { stubOrder } from '../fixtures/order';
import { BrowsePage } from '../pages/browse.page';
import { BusinessPage } from '../pages/business.page';
import { CategoryPage } from '../pages/category.page';
import { ProductPage } from '../pages/product.page';
import { WelcomePage } from '../pages/welcome.page';

// The journey by keyboard alone: welcome → browse home → a filtered, sorted category.
test('a visitor completes the journey with the keyboard only', async ({ page, jb }) => {
  const welcome = new WelcomePage(page);
  const browse = new BrowsePage(page);
  const category = new CategoryPage(page);
  await welcome.setWidth(1280);
  await jb.open('welcome');

  // From the welcome page to the browse home
  await welcome.browseBusinesses.focus();
  await welcome.pressEnter();
  await expect(browse.directoryHeading).toHaveText('All 47 businesses');

  // From a category chip to the category page
  await browse.categoryChips.nth(4).focus();
  await browse.pressEnter();
  await expect(category.heading).toHaveText('Home & property');
  await expect(category.cards).toHaveCount(10);

  // Press a filter chip with Space and choose a sort order with the arrow keys
  await category.chip('Emergency calls').focus();
  await page.keyboard.press('Space');
  await expect(category.chip('Emergency calls')).toHaveAttribute('aria-pressed', 'true');
  await expect(category.chip('Emergency calls')).toBeFocused();
  await expect(category.cards).toHaveCount(3);

  await category.sort.focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(page).toHaveURL(/offers=emergency-calls&sort=name$/);
  await expect(category.card(0).name).toHaveText('Cornerstone Electric');
});

test('the filters sheet keeps focus inside and is operable with the keyboard', async ({
  page,
  jb,
}) => {
  const category = new CategoryPage(page);
  const { filters } = category;
  await category.setWidth(360);
  await jb.open('category');

  await category.filtersButton.focus();
  await category.pressEnter();
  // Focus starts on the primary button
  await expect(filters.show).toBeFocused();
  // Tab from the last control wraps to the first: focus never leaves the sheet
  await category.pressTab();
  await expect(filters.close).toBeFocused();

  await filters.box('Emergency calls').focus();
  await page.keyboard.press('Space');
  await expect(filters.show).toHaveText('Show 3 businesses');
  await filters.show.focus();
  await category.pressEnter();
  await expect(category.cards).toHaveCount(3);
});

test('a visitor uses a business page with the keyboard only', async ({ page, jb }) => {
  const business = new BusinessPage(page);
  await business.setWidth(1280);
  await jb.open('business');

  // The actions follow one another in reading order
  await business.primaryAction.focus();
  await business.pressTab();
  await expect(business.messageLink).toBeFocused();
  await business.pressTab();
  await expect(business.saveButton).toBeFocused();
  await business.pressTab();
  await expect(business.shareLink).toBeFocused();

  // A related business opens with Enter
  await business.relatedCard(0).root.focus();
  await business.pressEnter();
  await expect(business.heading).toHaveText('Deeks Insurance');
});

test('a member chooses a size and a quantity and requests a product with the keyboard only', async ({
  page,
  jb,
}) => {
  const product = new ProductPage(page);
  await product.setWidth(1280);
  await stubOrder(page);
  await jb.open('product');

  // Space chooses the first size, the arrow keys move to the next one
  await product.option('S').focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowRight');
  await expect(product.option('M')).toBeChecked();

  await page.keyboard.press('Tab');
  await expect(product.quantity).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(product.quantity).toHaveValue('2');

  await page.keyboard.press('Tab');
  await expect(product.requestButton).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(
    '/b/luzandre/p/faith-heavyweight-tee-charcoal/request?option=M&quantity=2',
  );
});
