import { expect, test } from '../fixtures/jb-test';
import { SAVED_ITEMS, stubSaved, type FakeSavedItem } from '../fixtures/saved';
import { BrowsePage } from '../pages/browse.page';
import { BusinessPage } from '../pages/business.page';
import { CategoryPage } from '../pages/category.page';
import { ProductPage } from '../pages/product.page';
import { SearchPage } from '../pages/search.page';
import { SignInRequiredDialog } from '../pages/sign-in-required.dialog';
import { Toasts } from '../pages/toasts';

// Hearts on business, product and space cards (L2-041 AC7 to AC10, ADR 0054). The saved list is
// answered by fixtures/saved.ts, which keeps the calls the app made (ADR 0009).

/** A saved business as `GET /api/saved` lists it. */
function savedBusiness(slug: string, name: string): FakeSavedItem {
  return {
    ...SAVED_ITEMS[3],
    id: `b0000000-0000-4000-8000-${slug.length.toString().padStart(12, '0')}`,
    name,
    business: { ...SAVED_ITEMS[3].business!, slug, name },
  };
}

test.describe('the heart on a business card (L2-041 AC7)', () => {
  test('AC7, AC1, AC2: a featured card on Browse saves at once, offers Undo and stays on Browse', async ({
    page,
    jb,
  }) => {
    const browse = new BrowsePage(page);
    const toasts = new Toasts(page);
    const fake = await stubSaved(page, { items: [] });
    await jb.open('browse');
    const heart = browse.featuredCard(0).heart;

    await expect(heart).toHaveAccessibleName('Save Legacy Financial');
    await expect(heart).toHaveAttribute('aria-pressed', 'false');
    await heart.click();

    await expect(heart).toHaveAttribute('aria-pressed', 'true');
    await expect(heart).toHaveAccessibleName('Saved. Remove Legacy Financial from saved');
    const toast = toasts.withTitle('Saved Legacy Financial. Find it any time under Saved.');
    await expect(toast).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    expect(fake.calls).toEqual(['PUT businesses/legacy-financial']);

    await toasts.action(toast, 'Undo').click();
    await expect(heart).toHaveAttribute('aria-pressed', 'false');
    expect(fake.calls).toEqual([
      'PUT businesses/legacy-financial',
      'DELETE businesses/legacy-financial',
    ]);
  });

  test('AC7, AC3: a saved card in a category shows pressed, and pressing it removes it', async ({
    page,
    jb,
  }) => {
    const category = new CategoryPage(page);
    const fake = await stubSaved(page, {
      items: [savedBusiness('waterworks-plumbing-drains', 'WaterWorks Plumbing & Drains')],
    });
    await jb.open('category');
    const heart = category.card(0).heart;

    await expect(heart).toHaveAttribute('aria-pressed', 'true');
    await expect(heart).toHaveAccessibleName(
      'Saved. Remove WaterWorks Plumbing & Drains from saved',
    );
    await expect(category.card(1).heart).toHaveAttribute('aria-pressed', 'false');
    await heart.click();

    await expect(heart).toHaveAttribute('aria-pressed', 'false');
    expect(fake.calls).toEqual(['DELETE businesses/waterworks-plumbing-drains']);
  });

  test('AC7, AC4: a save from a card that cannot reach the server goes back and offers Try again', async ({
    page,
    jb,
  }) => {
    const browse = new BrowsePage(page);
    const toasts = new Toasts(page);
    await stubSaved(page, { items: [], save: 'offline' });
    await jb.open('browse');
    const heart = browse.featuredCard(1).heart;

    await heart.click();

    await expect(
      toasts.withTitle(
        'Couldn’t save Luzandre.com. You’re offline. Reconnect and tap the heart again.',
      ),
    ).toBeVisible();
    await expect(heart).toHaveAttribute('aria-pressed', 'false');
  });

  test('AC8: a heart whose save is on its way is busy, and a second press does nothing', async ({
    page,
    jb,
  }) => {
    const browse = new BrowsePage(page);
    const fake = await stubSaved(page, { items: [], save: 'pending' });
    await jb.open('browse');
    const heart = browse.featuredCard(0).heart;

    await heart.click();
    await expect(heart).toHaveAttribute('aria-busy', 'true');
    await expect(heart).toHaveAttribute('aria-pressed', 'true');
    await heart.click();

    await expect(heart).toHaveAttribute('aria-pressed', 'true');
    expect(fake.calls).toEqual(['PUT businesses/legacy-financial']);
  });

  test('AC7: the heart works from the keyboard and keeps focus', async ({ page, jb }) => {
    const browse = new BrowsePage(page);
    const fake = await stubSaved(page, { items: [] });
    await jb.open('browse');
    const heart = browse.featuredCard(0).heart;

    await heart.focus();
    await page.keyboard.press('Enter');

    await expect(heart).toHaveAttribute('aria-pressed', 'true');
    await expect(heart).toBeFocused();
    expect(fake.calls).toEqual(['PUT businesses/legacy-financial']);
  });
});

test.describe('the heart on product and space cards (L2-041 AC7)', () => {
  test('a product card on Browse saves the product of its shop', async ({ page, jb }) => {
    const browse = new BrowsePage(page);
    const toasts = new Toasts(page);
    const fake = await stubSaved(page, { items: [] });
    await jb.open('browse');
    const heart = browse.productCard(0).heart;

    await expect(heart).toHaveAccessibleName('Save Faith heavyweight tee, charcoal');
    await heart.click();

    await expect(heart).toHaveAttribute('aria-pressed', 'true');
    await expect(
      toasts.withTitle('Saved Faith heavyweight tee, charcoal. Find it any time under Saved.'),
    ).toBeVisible();
    expect(fake.calls).toEqual(['PUT products/luzandre/faith-heavyweight-tee-charcoal']);
  });

  test('a space card on the rooms shelf is saved as the listing it is', async ({ page, jb }) => {
    const browse = new BrowsePage(page);
    const fake = await stubSaved(page, { items: [] });
    await jb.open('browse');
    const heart = browse.spaceCard(0).heart;

    await expect(heart).toHaveAccessibleName('Save Guest suite near Roncesvalles');
    await heart.click();

    await expect(heart).toHaveAttribute('aria-pressed', 'true');
    expect(fake.calls).toEqual(['PUT businesses/roncesvalles-guest-suite']);
  });

  test('a space card in the Rooms & rentals category and in search has its heart', async ({
    page,
    jb,
  }) => {
    const category = new CategoryPage(page);
    const search = new SearchPage(page);
    const fake = await stubSaved(page, { items: [] });

    await jb.open('category.rooms-rentals');
    await category.spaceCard(0).heart.click();
    await expect(category.spaceCard(0).heart).toHaveAttribute('aria-pressed', 'true');

    await jb.open('search.spaces');
    await search.spaceCard(0).heart.click();
    await expect(search.spaceCard(0).heart).toHaveAttribute('aria-pressed', 'true');

    expect(fake.calls).toHaveLength(2);
    expect(fake.calls.every((call) => call.startsWith('PUT businesses/'))).toBe(true);
  });

  test('the product cards of a shop and the related businesses of a listing have hearts', async ({
    page,
    jb,
  }) => {
    const shop = new BusinessPage(page);
    const fake = await stubSaved(page, { items: [] });
    await jb.open('shop');
    const product = shop.productCard(0);
    const name = (await product.name.textContent())!.trim();

    await expect(product.heart).toHaveAccessibleName(`Save ${name}`);
    await product.heart.click();
    await expect(product.heart).toHaveAttribute('aria-pressed', 'true');
    expect(fake.calls[0]).toMatch(/^PUT products\/luzandre\//);

    await jb.open('business');
    await shop.relatedCard(0).heart.click();
    await expect(shop.relatedCard(0).heart).toHaveAttribute('aria-pressed', 'true');
    expect(fake.calls[1]).toMatch(/^PUT businesses\//);
  });

  test('the cards of more from the shop on a product page have hearts', async ({ page, jb }) => {
    const product = new ProductPage(page);
    const fake = await stubSaved(page, { items: [] });
    await jb.open('product');
    const more = product.moreCard(0);

    await more.heart.click();

    await expect(more.heart).toHaveAttribute('aria-pressed', 'true');
    expect(fake.calls[0]).toMatch(/^PUT products\/luzandre\//);
  });
});

test.describe('a visitor presses the heart on a card (L2-041 AC9, L2-012 AC4)', () => {
  test('AC9: the prompt opens, and after signing in on the same page the item is saved once', async ({
    page,
    jb,
  }) => {
    const browse = new BrowsePage(page);
    const prompt = new SignInRequiredDialog(page);
    const toasts = new Toasts(page);
    await jb.open('browse.signed-out');
    const heart = browse.featuredCard(1).heart;

    await expect(heart).toHaveAttribute('aria-pressed', 'false');
    await heart.click();
    await expect(prompt.title).toHaveText('Join to save Luzandre.com');
    await expect(prompt.joinFree).toHaveAttribute('href', /returnUrl=%2F$/);

    // Signing in brings the visitor back to Browse, where the heart they pressed is saved.
    await jb.signInAs('member');
    const fake = await stubSaved(page, { items: [] });
    await jb.goto('/');
    await expect(
      toasts.withTitle('Saved Luzandre.com. Find it any time under Saved.'),
    ).toBeVisible();
    await expect(heart).toHaveAttribute('aria-pressed', 'true');
    expect(fake.calls).toEqual(['PUT businesses/luzandre']);

    // Once: coming back to the page does not save it again.
    await jb.goto('/');
    await expect(heart).toHaveAttribute('aria-pressed', 'false');
    expect(fake.calls).toEqual(['PUT businesses/luzandre']);
  });

  test('AC9: closing the prompt focuses the heart again, and signing in elsewhere saves nothing', async ({
    page,
    jb,
  }) => {
    const browse = new BrowsePage(page);
    const prompt = new SignInRequiredDialog(page);
    await jb.open('browse.signed-out');
    const heart = browse.productCard(0).heart;

    await heart.click();
    await expect(prompt.title).toHaveText('Join to save Faith heavyweight tee, charcoal');
    await prompt.close.click();
    await expect(heart).toBeFocused();

    await jb.signInAs('member');
    const fake = await stubSaved(page, { items: [] });
    await jb.goto('/c/home-property');
    await expect(new CategoryPage(page).card(0).heart).toBeVisible();
    expect(fake.calls).toEqual([]);
  });
});
