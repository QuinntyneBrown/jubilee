import { expect, test } from '../fixtures/jb-test';
import { PAUSED, SAVED_ITEMS, stubSaved } from '../fixtures/saved';
import { BusinessPage } from '../pages/business.page';
import { ProductPage } from '../pages/product.page';
import { SavedPage } from '../pages/saved.page';
import { SignInRequiredDialog } from '../pages/sign-in-required.dialog';
import { Toasts } from '../pages/toasts';

const SAVED_TOAST = 'Saved Luzandre.com. Find it any time under Saved.';
const TEE = '/b/luzandre/p/faith-heavyweight-tee-charcoal';

test.describe('save and unsave (L2-041)', () => {
  test('AC1: pressing the heart shows it pressed at once and offers Undo', async ({ page, jb }) => {
    const business = new BusinessPage(page);
    const toasts = new Toasts(page);
    await business.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubSaved(page, { items: [] });
    await jb.goto('/b/luzandre');

    await expect(business.saveButton).toHaveAttribute('aria-pressed', 'false');
    await business.saveButton.click();

    await expect(business.saveButton).toHaveAttribute('aria-pressed', 'true');
    await expect(business.saveButton).toHaveAccessibleName('Saved. Remove from saved');
    const toast = toasts.withTitle(SAVED_TOAST);
    await expect(toast).toBeVisible();
    expect(fake.calls).toEqual(['PUT businesses/luzandre']);

    // AC2: Undo within the 8 seconds removes it again.
    await toasts.action(toast, 'Undo').click();
    await expect(business.saveButton).toHaveAttribute('aria-pressed', 'false');
    expect(fake.calls).toEqual(['PUT businesses/luzandre', 'DELETE businesses/luzandre']);
  });

  test('AC3: pressing a saved heart removes the item', async ({ page, jb }) => {
    const business = new BusinessPage(page);
    await business.setWidth(1280);
    await jb.signInAs('member');
    const items = [
      {
        ...SAVED_ITEMS[1],
        name: 'Luzandre.com',
        business: { ...SAVED_ITEMS[1].business!, slug: 'luzandre', name: 'Luzandre.com' },
      },
    ];
    const fake = await stubSaved(page, { items });
    await jb.goto('/b/luzandre');

    await expect(business.saveButton).toHaveAttribute('aria-pressed', 'true');
    await business.saveButton.click();

    await expect(business.saveButton).toHaveAttribute('aria-pressed', 'false');
    expect(fake.calls).toEqual(['DELETE businesses/luzandre']);
  });

  test('AC4: a save that cannot reach the server goes back and offers Try again', async ({
    page,
    jb,
  }) => {
    const business = new BusinessPage(page);
    const toasts = new Toasts(page);
    await business.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubSaved(page, { items: [], save: 'offline' });
    await jb.goto('/b/luzandre');

    await business.saveButton.click();

    const toast = toasts.withTitle(
      'Couldn\u2019t save Luzandre.com. You\u2019re offline. Reconnect and tap the heart again.',
    );
    await expect(toast).toBeVisible();
    await expect(business.saveButton).toHaveAttribute('aria-pressed', 'false');

    fake.save = 'ok';
    await toasts.action(toast, 'Try again').click();
    await expect(business.saveButton).toHaveAttribute('aria-pressed', 'true');
    await expect(toasts.withTitle(SAVED_TOAST)).toBeVisible();
  });

  test('AC5: at 500 items another save is refused with the limit message', async ({ page, jb }) => {
    const business = new BusinessPage(page);
    const toasts = new Toasts(page);
    await business.setWidth(1280);
    await jb.signInAs('member');
    await stubSaved(page, { items: [], save: 'limit' });
    await jb.goto('/b/luzandre');

    await business.saveButton.click();

    await expect(toasts.withTitle('You can save up to 500 items. Remove some to add more.')).toBeVisible();
    await expect(business.saveButton).toHaveAttribute('aria-pressed', 'false');
  });

  test('a product has a heart too', async ({ page, jb }) => {
    const product = new ProductPage(page);
    await product.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubSaved(page, { items: [] });
    await jb.goto(TEE);

    await product.saveButton.click();

    await expect(product.saveButton).toHaveAttribute('aria-pressed', 'true');
    expect(fake.calls).toEqual(['PUT products/luzandre/faith-heavyweight-tee-charcoal']);
  });

  test('L2-012: a visitor is asked to join, and is brought back and the item is saved', async ({
    page,
    jb,
  }) => {
    const business = new BusinessPage(page);
    const prompt = new SignInRequiredDialog(page);
    const toasts = new Toasts(page);
    await business.setWidth(1280);
    await jb.goto('/b/luzandre');

    await business.saveButton.click();
    await expect(prompt.title).toHaveText('Join to save Luzandre.com');
    await expect(prompt.joinFree).toHaveAttribute('href', /returnUrl=%2Fb%2Fluzandre%3Fsave%3D1/);

    // After signing in the visitor lands on the return address, and the heart they pressed is saved.
    await jb.signInAs('member');
    const fake = await stubSaved(page, { items: [] });
    await page.goto('/b/luzandre?save=1');
    await expect(toasts.withTitle(SAVED_TOAST)).toBeVisible();
    await expect(business.saveButton).toHaveAttribute('aria-pressed', 'true');
    await expect(page).toHaveURL(/\/b\/luzandre$/);
    expect(fake.calls).toEqual(['PUT businesses/luzandre']);
  });
});

test.describe('saved page (L2-042)', () => {
  test('AC1: the counts and the cards, newest first, each with a remove button', async ({ page, jb }) => {
    const saved = new SavedPage(page);
    await saved.setWidth(1280);
    await jb.signInAs('member');
    await stubSaved(page);
    await jb.goto('/saved');

    await expect(saved.heading).toHaveText('Saved');
    await expect(saved.subtitle).toHaveText('3 businesses \u00b7 1 product');
    await expect(saved.cards).toHaveCount(4);
    await expect(saved.cards.first()).toContainText('Leather journaling Bible, ESV');
    await expect(saved.cards.last()).toContainText('Legacy Financial');
    await expect(saved.card('Legacy Financial').getByRole('link')).toHaveAttribute('href', '/b/legacy-financial');
    await expect(saved.remove('Legacy Financial')).toBeVisible();
  });

  test('removing an item takes it off the list and the count', async ({ page, jb }) => {
    const saved = new SavedPage(page);
    await saved.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubSaved(page);
    await jb.goto('/saved');

    await saved.remove('Legacy Financial').click();

    await expect(saved.cards).toHaveCount(3);
    await expect(saved.subtitle).toHaveText('2 businesses \u00b7 1 product');
    expect(fake.calls).toEqual(['DELETE items/a1000000-0000-4000-8000-000000000001']);
  });

  test('AC2: with nothing saved the page says how to start', async ({ page, jb }) => {
    const saved = new SavedPage(page);
    await saved.setWidth(1280);
    await jb.signInAs('member');
    await stubSaved(page, { items: [] });
    await jb.goto('/saved');

    await expect(saved.empty).toContainText('Save businesses to find them again');
    await expect(saved.empty).toContainText('Tap the heart on any listing or product. Your saved list is private.');
    await expect(saved.browse).toHaveAttribute('href', '/');
  });

  test('AC3: a listing paused after it was saved shows as no longer available, without a link', async ({
    page,
    jb,
  }) => {
    const saved = new SavedPage(page);
    await saved.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubSaved(page, { items: [PAUSED] });
    await jb.goto('/saved');

    const card = saved.card('Harbour Bakery');
    await expect(card).toContainText('No longer available');
    await expect(card.getByRole('link')).toHaveCount(0);

    await saved.remove('Harbour Bakery').click();
    await expect(saved.cards).toHaveCount(0);
    expect(fake.calls).toEqual(['DELETE items/a1000000-0000-4000-8000-000000000009']);
  });

  test('AC5: when the list cannot load the page says so and quotes JB-SAV-503', async ({ page, jb }) => {
    const saved = new SavedPage(page);
    await saved.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubSaved(page, { list: 'fails' });
    await jb.goto('/saved');

    await expect(saved.alert).toContainText('We couldn\u2019t load your saved list');
    await expect(saved.reference).toHaveText('JB-SAV-503');

    fake.list = 'ok';
    await saved.tryAgain.click();
    await expect(saved.cards).toHaveCount(4);
  });
});
