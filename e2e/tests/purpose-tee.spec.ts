import { expect, test } from '../fixtures/jb-test';
import { purposeTee, storedBag, stubMerch, youthSoldOut } from '../fixtures/merch';
import { BagDialog } from '../pages/bag.dialog';
import { PurposeTeePage } from '../pages/purpose-tee.page';

// The Purpose Tee page: L2-263, L2-264, L2-265 (L1-034, ADR 0073). Every merchandise call is
// answered by the stand-in of fixtures/merch.ts (ADR 0009).

const VERSE =
  '“But you shall remember Yahweh your God, for it is he who gives you power to get wealth, that he may establish his covenant which he swore to your fathers, as it is today.” (Deuteronomy 8:18, WEB)';

test.describe('the Purpose Tee page (L2-263)', () => {
  test('AC1: anyone sees the tee, Men’s L chosen, quantity 1, in the app shell', async ({
    page,
    jb,
  }) => {
    await stubMerch(page);
    const tee = new PurposeTeePage(page);
    await jb.goto('/purpose-tee');

    await expect(page).toHaveTitle('Purpose Tee · Jubilee');
    await expect(tee.topBar).toBeVisible();
    await expect(tee.footer).toBeVisible();
    await expect(tee.backToBrowse).toHaveText('Back to browse');
    await expect(tee.bagButton).toHaveAccessibleName('Bag, 0 items');
    await expect(tee.frontThumb).toHaveAttribute('aria-pressed', 'true');
    await expect(tee.kicker).toHaveText('Jubilee tee · Black');
    await expect(tee.heading).toHaveText('Prosper with purpose.');
    await expect(tee.price).toHaveText('$25 CAD');
    await expect(tee.description).toContainText('Heavyweight black cotton');
    await expect(tee.fitOption('Men’s')).toBeChecked();
    await expect(tee.size('L')).toBeChecked();
    await expect(tee.sizeStatus).toHaveText('Men’s L: 22″ chest, 30″ long.');
    await expect(tee.quantityValue).toHaveText('1');
    await expect(tee.addButton).toHaveText('Add to bag · $25');
    await expect(tee.deliveryNote).toHaveText(
      'Ships across Canada in 3–5 business days, free over $60. Pick up free at the Jubilee gathering in Toronto. Tax is added at checkout.',
    );
    await expect(tee.disclosures).toHaveText([
      'Fabric & fit',
      'The print',
      'Care',
      'Shipping & returns',
    ]);
    for (const summary of await tee.disclosures.all()) {
      await expect(summary).toHaveAttribute('aria-expanded', 'false');
    }
    await expect(tee.storyHeading).toHaveText('Why “purpose” is the gold word.');
  });

  test('AC1: a member sees the same page', async ({ page, jb }) => {
    await stubMerch(page);
    const tee = new PurposeTeePage(page);
    await jb.signInAs('member');
    await jb.goto('/purpose-tee');

    await expect(tee.heading).toHaveText('Prosper with purpose.');
    await expect(tee.avatar.first()).toBeAttached();
  });

  test('AC2: the story quotes Deuteronomy 8:18 word for word, and the price is never beside it', async ({
    page,
    jb,
  }) => {
    await stubMerch(page);
    const tee = new PurposeTeePage(page);
    await jb.goto('/purpose-tee');

    await expect(tee.storyParagraphs.first()).toContainText(VERSE);
    await expect(tee.storyParagraphs.nth(1)).toHaveText(
      'Every shirt sold helps keep Jubilee free for the Christian business people of Toronto, and gives you an easy way to tell someone what it’s for.',
    );
    await expect(tee.story).not.toContainText('$');
    await expect(tee.story.getByRole('button')).toHaveCount(0);
  });

  test('AC3: while it loads the page shows its skeleton and says so', async ({ page, jb }) => {
    await stubMerch(page, { productAnswer: 'hang' });
    const tee = new PurposeTeePage(page);
    await jb.goto('/purpose-tee');

    await expect(tee.loadingStatus).toBeAttached();
    await expect(tee.main.locator('.skeleton').first()).toBeVisible();
  });

  test('AC3: when it cannot load, it says so with the reference, and "Try again" loads it', async ({
    page,
    jb,
  }) => {
    const merch = await stubMerch(page, { productAnswer: 'error' });
    const tee = new PurposeTeePage(page);
    await jb.goto('/purpose-tee');

    await expect(tee.errorState.getByRole('heading')).toHaveText('We couldn’t load the tee');
    await expect(tee.errorReference).toHaveText('JB-MERCH-503');
    await expect(tee.errorBackToBrowse).toBeVisible();

    merch.productAnswer = 'ok';
    await tee.tryAgain.click();
    await expect(tee.heading).toHaveText('Prosper with purpose.');
  });

  test('AC5: the price and what is left are the API’s', async ({ page, jb }) => {
    const product = purposeTee();
    await stubMerch(page, { product: { ...product, unitPriceCents: 2750 } });
    const tee = new PurposeTeePage(page);
    await jb.goto('/purpose-tee');

    await expect(tee.price).toHaveText('$27.50 CAD');
    await expect(tee.addButton).toHaveText('Add to bag · $27.50');
  });
});

test.describe('choose the view, the fit and the size (L2-264)', () => {
  test('AC1: "Back" shows the back of the shirt and "Front" the front again', async ({
    page,
    jb,
  }) => {
    await stubMerch(page);
    const tee = new PurposeTeePage(page);
    await jb.goto('/purpose-tee');

    await tee.backThumb.click();
    await expect(tee.stageImage).toHaveAccessibleName(
      'The Purpose Tee from the back: the J mark and jubilee.to below the collar',
    );
    await expect(tee.backThumb).toHaveAttribute('aria-pressed', 'true');
    await expect(tee.frontThumb).toHaveAttribute('aria-pressed', 'false');

    await tee.frontThumb.click();
    await expect(tee.stageImage).toHaveAccessibleName(/^The Purpose Tee from the front/);
  });

  test('AC2: a fit shows its sizes and note; L is kept from Men’s to Women’s', async ({
    page,
    jb,
  }) => {
    await stubMerch(page);
    const tee = new PurposeTeePage(page);
    await jb.goto('/purpose-tee');

    await tee.chooseFit('Women’s');
    await expect.poll(() => tee.sizeLabels()).toEqual(['XS', 'S', 'M', 'L', 'XL', '2XL']);
    await expect(tee.fitNote).toHaveText(/^Slim through the body/);
    await expect(tee.size('L')).toBeChecked();
    await expect(tee.sizeStatus).toHaveText('Women’s L: 19.5″ chest, 27.25″ long.');

    await tee.chooseFit('Youth');
    await expect.poll(() => tee.sizeLabels()).toEqual(['XS', 'S', 'M', 'L', 'XL']);
    await expect(tee.sizes).toContainText('14–16');
  });

  test('AC2: the fits are chosen with the arrow keys; a size the new fit lacks is dropped', async ({
    page,
    jb,
  }) => {
    await stubMerch(page);
    const tee = new PurposeTeePage(page);
    await jb.goto('/purpose-tee');

    await tee.chooseSize('3XL');
    await tee.fitOption('Men’s').focus();
    await page.keyboard.press('ArrowRight'); // wraps to Youth
    await expect(tee.fitOption('Youth')).toBeChecked();
    await expect(tee.sizes.getByRole('radio', { checked: true })).toHaveCount(0);
    await expect(tee.sizeStatus).toHaveText('');
  });

  test('AC3: a sold-out size is disabled and named "sold out"', async ({ page, jb }) => {
    await stubMerch(page);
    const tee = new PurposeTeePage(page);
    await jb.goto('/purpose-tee');

    await tee.chooseFit('Youth');
    const xl = tee.size('XL');
    await expect(xl).toHaveAccessibleName(/^XL, sold out/);
    await expect(xl).toBeDisabled();
    await tee.chooseSize('M');
    await tee.size('M').focus();
    await page.keyboard.press('ArrowRight'); // L
    await page.keyboard.press('ArrowRight'); // XL is skipped, wraps to XS
    await expect(xl).not.toBeChecked();
  });

  test('AC4: three or fewer left says how many', async ({ page, jb }) => {
    await stubMerch(page);
    const tee = new PurposeTeePage(page);
    await jb.goto('/purpose-tee');

    await tee.chooseFit('Women’s');
    await tee.chooseSize('XL');
    await expect(tee.sizeStatus).toHaveText('Only 2 left in Women’s XL.');
    await expect(tee.sizeStatus).toHaveAttribute('aria-live', 'polite');
  });

  test('AC5: the size guide opens under the sizes and follows the fit', async ({ page, jb }) => {
    await stubMerch(page);
    const tee = new PurposeTeePage(page);
    await jb.goto('/purpose-tee');

    await expect(tee.guide).toHaveCount(0);
    await tee.guideToggle.click();
    await expect(tee.guideToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(tee.guideCaption).toHaveText('Men’s, garment laid flat, in inches. Classic fit.');
    await expect(tee.guideRows).toHaveCount(6);
    await expect(tee.guideRows.nth(2)).toHaveText(/L\s*22\s*30/);

    await tee.chooseFit('Youth');
    await expect(tee.guideCaption).toHaveText(
      'Youth, garment laid flat, in inches. Between sizes? Size up; they grow.',
    );
    await expect(tee.guideRows.first()).toContainText('(4–5)');

    await tee.guideToggle.click();
    await expect(tee.guideToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(tee.guide).toHaveCount(0);
  });

  test('AC6: a fit with every size sold out says so', async ({ page, jb }) => {
    await stubMerch(page, { product: youthSoldOut() });
    const tee = new PurposeTeePage(page);
    await jb.goto('/purpose-tee');

    await tee.chooseFit('Youth');
    // Wait for Youth's sizes before listing them: `all()` does not retry, and a list taken while
    // Men's six sizes are still shown points one radio past Youth's five.
    await expect.poll(() => tee.sizeLabels()).toEqual(['XS', 'S', 'M', 'L', 'XL']);
    for (const radio of await tee.sizes.getByRole('radio').all()) {
      await expect(radio).toBeDisabled();
    }
    await expect(tee.sizeStatus).toHaveText('Every Youth size is sold out. Choose another fit.');
  });
});

test.describe('quantity and "Add to bag" (L2-265)', () => {
  test('AC1: the quantity moves between 1 and what is left, and the button follows', async ({
    page,
    jb,
  }) => {
    await stubMerch(page);
    const tee = new PurposeTeePage(page);
    await jb.goto('/purpose-tee');

    await expect(tee.fewer).toBeDisabled();
    await tee.more.click();
    await tee.more.click();
    await expect(tee.quantityValue).toHaveText('3');
    await expect(tee.addButton).toHaveText('Add to bag · $75');

    await tee.chooseSize('3XL'); // two left
    await expect(tee.quantityValue).toHaveText('2');
    await expect(tee.more).toBeDisabled();
    await tee.fewer.click();
    await expect(tee.quantityValue).toHaveText('1');
    await expect(tee.fewer).toBeDisabled();
  });

  test('AC1: never more than 10', async ({ page, jb }) => {
    await stubMerch(page);
    const tee = new PurposeTeePage(page);
    await jb.goto('/purpose-tee');

    for (let i = 0; i < 9; i++) await tee.more.click();
    await expect(tee.quantityValue).toHaveText('10');
    await expect(tee.more).toBeDisabled();
  });

  test('AC2: with no size chosen, "Add to bag" nudges and moves focus to the sizes', async ({
    page,
    jb,
  }) => {
    await stubMerch(page);
    const tee = new PurposeTeePage(page);
    await jb.goto('/purpose-tee');

    await tee.chooseSize('3XL');
    await tee.chooseFit('Youth'); // Youth has no 3XL: no size is chosen
    await tee.addButton.click();

    await expect(tee.nudge).toHaveText('Pick a size to continue');
    await expect(tee.nudge).toHaveRole('alert');
    await expect(tee.size('XS')).toBeFocused();
    await expect(tee.bagButton).toHaveAccessibleName('Bag, 0 items');

    await tee.chooseSize('S');
    await expect(tee.nudge).toHaveCount(0);
  });

  test('AC3, AC6: adding puts the line in the bag, says "Added to bag" and counts it', async ({
    page,
    jb,
  }) => {
    await stubMerch(page);
    const tee = new PurposeTeePage(page);
    await jb.goto('/purpose-tee');

    await tee.more.click();
    await tee.addButton.click();
    await expect(tee.addButton).toHaveText('Added to bag');
    await expect(tee.addedLine).toHaveText('Men’s L · Black');
    await expect(tee.checkOut).toBeVisible();
    await expect(tee.bagButton).toHaveAccessibleName('Bag, 2 items');
    await expect(tee.bagCount).toHaveText('2');
    expect(await storedBag(page)).toEqual([
      { sku: 'mens-L', fit: 'Men’s', size: 'L', quantity: 2, unitPriceCents: 2500 },
    ]);
  });

  test('AC3: adding the same size again adds to its line, never above what is left', async ({
    page,
    jb,
  }) => {
    await stubMerch(page);
    const tee = new PurposeTeePage(page);
    await jb.goto('/purpose-tee');

    await tee.chooseSize('3XL');
    await tee.addButton.click();
    await tee.more.click();
    await tee.addButton.click();
    await expect(tee.bagButton).toHaveAccessibleName('Bag, 2 items');
    expect(await storedBag(page)).toEqual([
      { sku: 'mens-3XL', fit: 'Men’s', size: '3XL', quantity: 2, unitPriceCents: 2500 },
    ]);
  });

  test('AC4: changing the size after adding offers "Add to bag" again', async ({ page, jb }) => {
    await stubMerch(page);
    const tee = new PurposeTeePage(page);
    await jb.goto('/purpose-tee');

    await tee.addButton.click();
    await tee.chooseSize('M');
    await expect(tee.addButton).toHaveText('Add to bag · $25');
    await expect(tee.addedLine).toHaveCount(0);
  });

  test('AC5: "Check out" under the added line opens the bag', async ({ page, jb }) => {
    await stubMerch(page);
    const tee = new PurposeTeePage(page);
    const bag = new BagDialog(page);
    await jb.goto('/purpose-tee');

    await tee.addButton.click();
    await tee.checkOut.click();
    await expect(bag.title).toBeVisible();
    await expect(bag.description).toHaveText('1 shirt. Prices are before tax.');
  });

  test('AC6: one shirt is "Bag, 1 item"', async ({ page, jb }) => {
    await stubMerch(page);
    const tee = new PurposeTeePage(page);
    await jb.goto('/purpose-tee');

    await tee.addButton.click();
    await expect(tee.bagButton).toHaveAccessibleName('Bag, 1 item');
  });
});
