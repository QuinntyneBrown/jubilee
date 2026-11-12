import { expect, test } from '../fixtures/jb-test';
import { SAVED_ITEMS, stubSaved, type FakeSavedItem } from '../fixtures/saved';
import { BrowsePage } from '../pages/browse.page';
import { CategoryPage } from '../pages/category.page';
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
