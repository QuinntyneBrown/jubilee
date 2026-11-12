import { expect, test } from '../fixtures/jb-test';
import { stubListingDrafts, type FakeDraft } from '../fixtures/listing-drafts';
import { stubSession, unconfirmedSession } from '../fixtures/stubs';
import { ListBusinessPage, ListingItemDialog } from '../pages/list-business.page';

const earlier: FakeDraft = {
  id: 'd-1',
  kind: 'products',
  name: 'Luzandre.com',
  tagline: 'Unique & custom Christian apparel',
  categorySlug: 'shops',
  highlight: null,
  place: 'Online · ships across Canada',
  agreed: false,
  items: [
    { name: 'Gold cross stoneware mug', detail: null, priceKind: 'amount', priceCents: 2400 },
  ],
  idempotencyKey: null,
  updatedAt: '2026-11-09T20:00:00Z',
};

test.describe('list your business (L2-071 to L2-079)', () => {
  test('a first visit shows a blank form and a preview that follows the typing', async ({
    page,
    jb,
  }) => {
    const list = new ListBusinessPage(page);
    await list.setWidth(1280);
    await jb.signInAs('member');
    await stubListingDrafts(page);
    await jb.goto('/list');

    await expect(list.heading).toHaveText('List your business');
    await expect(list.intro).toHaveText(
      'Free for Christian-owned businesses in Toronto. Every listing is verified before it goes live.',
    );
    // L2-071: nobody is asked for a church or a pastor.
    await expect(list.legends).toHaveText(['What do you offer?', 'Products']);
    await expect(list.products).toBeChecked();
    await expect(list.previewTag).toHaveText('Shop');
    await expect(list.previewName).toHaveText('Your business name');

    await list.name.fill('Luzandre.com');
    await list.tagline.fill('Christian apparel & gifts');
    await expect(list.previewName).toHaveText('Luzandre.com');
    await expect(list.previewTagline).toHaveText('Christian apparel & gifts');
    await expect(list.taglineCount).toHaveText('25 / 90');

    await list.services.check();
    await expect(list.previewTag).toHaveText('Business');
    await expect(list.placeLabel).toHaveText('Area you serve');
  });

  test('the draft left earlier is restored', async ({ page, jb }) => {
    const list = new ListBusinessPage(page);
    await list.setWidth(1280);
    await jb.signInAs('member');
    await stubListingDrafts(page, { draft: earlier });
    await jb.goto('/list');

    await expect(list.name).toHaveValue('Luzandre.com');
    await expect(list.tagline).toHaveValue('Unique & custom Christian apparel');
    await expect(list.itemRows).toHaveCount(1);
    await expect(list.itemRows.first()).toContainText('Gold cross stoneware mug');
    await expect(list.itemRows.first()).toContainText('$24');
  });

  test('a draft that cannot load can be tried again', async ({ page, jb }) => {
    const list = new ListBusinessPage(page);
    await list.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubListingDrafts(page, { outcome: 'load-fails' });
    await jb.goto('/list');

    await expect(list.loadError).toContainText('We couldn’t load your draft');
    await expect(list.loadError).toContainText('JB-LST-503');

    fake.outcome = 'ok';
    await list.tryAgain.click();
    await expect(list.name).toBeVisible();
  });

  test('a product is added and removed through the dialog', async ({ page, jb }) => {
    const list = new ListBusinessPage(page);
    const dialog = new ListingItemDialog(page);
    await list.setWidth(1280);
    await jb.signInAs('member');
    await stubListingDrafts(page);
    await jb.goto('/list');

    await list.addItem.click();
    await expect(dialog.title).toHaveText('Add a product');
    await dialog.add.click();
    await expect(dialog.fieldError).toHaveCount(2);

    await dialog.name.fill('Faith heavyweight tee, charcoal');
    await dialog.price.fill('34');
    await dialog.add.click();

    await expect(list.itemRows).toHaveCount(1);
    await expect(list.itemRows.first()).toContainText('Faith heavyweight tee, charcoal');
    await expect(list.itemRows.first()).toContainText('$34');

    await list.main.getByRole('button', { name: 'Remove Faith heavyweight tee, charcoal' }).click();
    await expect(list.itemRows).toHaveCount(0);
  });

  test('a service can be priced as an ask', async ({ page, jb }) => {
    const list = new ListBusinessPage(page);
    const dialog = new ListingItemDialog(page);
    await list.setWidth(1280);
    await jb.signInAs('member');
    await stubListingDrafts(page);
    await jb.goto('/list');
    await list.services.check();

    await list.addItem.click();
    await expect(dialog.title).toHaveText('Add a service');
    await dialog.name.fill('Retirement planning');
    await dialog.detail.fill('60 minutes');
    await dialog.add.click();

    await expect(list.itemRows.first()).toContainText('Retirement planning');
    await expect(list.itemRows.first()).toContainText('Ask');
  });

  test('saving a draft says when it was saved and sends what was typed', async ({ page, jb }) => {
    const list = new ListBusinessPage(page);
    await list.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubListingDrafts(page);
    await jb.goto('/list');

    await list.name.fill('Luzandre.com');
    await list.saveDraft.click();

    await expect(list.saved).toContainText('Draft saved');
    await expect(list.saved).toContainText('nothing is public until you submit');
    expect(fake.creates).toHaveLength(1);
    expect(fake.creates[0].name).toBe('Luzandre.com');
  });

  test('a draft saves itself after ten idle seconds', async ({ page, jb }) => {
    const list = new ListBusinessPage(page);
    await list.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubListingDrafts(page);
    await jb.goto('/list');
    await page.clock.install();

    await list.name.fill('Luzandre.com');
    await page.clock.runFor(10_500);

    await expect.poll(() => fake.creates.length).toBe(1);
  });

  test('submitting with things missing lists them and focuses the summary', async ({
    page,
    jb,
  }) => {
    const list = new ListBusinessPage(page);
    await list.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubListingDrafts(page);
    await jb.goto('/list');
    await list.tagline.fill('Christian apparel & gifts');

    await list.submit.click();

    await expect(list.summary).toBeFocused();
    await expect(list.summary).toContainText('Fix 2 things to continue');
    await expect(list.summaryLinks).toHaveText([
      'Enter your business name',
      'Agree to the statement of faith',
    ]);
    await expect(list.fieldError).toHaveText([
      'Enter your business name as customers know it.',
      'Agree to the statement of faith to submit your listing.',
    ]);
    await expect(list.tagline).toHaveValue('Christian apparel & gifts');
    expect(fake.submits).toHaveLength(0);

    await list.summaryLinks.first().click();
    await expect(list.name).toBeFocused();
  });

  test('a tagline over 90 characters says how long it is', async ({ page, jb }) => {
    const list = new ListBusinessPage(page);
    await list.setWidth(1280);
    await jb.signInAs('member');
    await stubListingDrafts(page);
    await jb.goto('/list');
    await list.fillValid();
    await list.tagline.fill('x'.repeat(95));

    await list.submit.click();

    await expect(list.fieldError).toHaveText(['Shorten this to 90 characters. It has 95.']);
  });

  test('a valid listing is submitted and the next steps are shown', async ({ page, jb }) => {
    const list = new ListBusinessPage(page);
    await list.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubListingDrafts(page);
    await jb.goto('/list');
    await list.fillValid();

    await list.submit.click();

    await expect(list.doneHeading).toHaveText('Luzandre.com is in for verification');
    await expect(list.doneText).toHaveText(
      'Nothing more to do right now. We’ll e-mail you the moment you’re live.',
    );
    await expect(list.timeline).toHaveCount(3);
    await expect(list.timeline).toContainText([
      'You submitted Luzandre.com',
      'We review your listing',
      'You’re live',
    ]);
    await expect(list.timeline.nth(1)).toContainText('Within two business days');
    await expect(list.timeline.nth(2)).toContainText(
      'We e-mail you the moment members can find you',
    );
    await expect(list.goToMyBusiness).toHaveAttribute('href', '/my-business');
    expect(fake.submits).toHaveLength(1);
    expect(fake.submits[0].idempotencyKey).toMatch(/^[\w-]{8,}$/);
    expect(fake.submits[0].agreed).toBe(true);
    expect(fake.submits[0]).not.toHaveProperty('church');
    expect(fake.submits[0]).not.toHaveProperty('pastorEmail');
  });

  test('while submitting the button is busy and the fields are locked', async ({ page, jb }) => {
    const list = new ListBusinessPage(page);
    await list.setWidth(1280);
    await jb.signInAs('member');
    await stubListingDrafts(page, { outcome: 'hang' });
    await jb.goto('/list');
    await list.fillValid();

    await list.submit.click();

    await expect(list.submit).toHaveAttribute('aria-busy', 'true');
    await expect(list.name).toHaveAttribute('readonly', '');
  });

  test('a field the server refuses is shown on that field', async ({ page, jb }) => {
    const list = new ListBusinessPage(page);
    await list.setWidth(1280);
    await jb.signInAs('member');
    await stubListingDrafts(page, { outcome: 'invalid' });
    await jb.goto('/list');
    await list.fillValid();

    await list.submit.click();

    await expect(list.fieldError).toHaveText(['Shorten this to 90 characters. It has 94.']);
    await expect(list.summary).toBeFocused();
  });

  test('reaching the listing limit says so', async ({ page, jb }) => {
    const list = new ListBusinessPage(page);
    await list.setWidth(1280);
    await jb.signInAs('member');
    await stubListingDrafts(page, { outcome: 'limit' });
    await jb.goto('/list');
    await list.fillValid();

    await list.submit.click();

    await expect(list.alert).toContainText('You can list up to 5 businesses.');
  });

  test('an unconfirmed e-mail can write a draft but not submit', async ({ page, jb }) => {
    const list = new ListBusinessPage(page);
    await list.setWidth(1280);
    await jb.signInAs('member');
    await stubSession(page, unconfirmedSession);
    await stubListingDrafts(page);
    await jb.goto('/list');

    await expect(list.confirmNotice).toBeVisible();
    await expect(list.submit).toBeDisabled();
    await expect(list.saveDraft).toBeEnabled();
  });

  test('a visitor is sent to sign in and brought back', async ({ page, jb }) => {
    await stubListingDrafts(page);
    await jb.goto('/list');

    await expect(page).toHaveURL(/\/sign-in\?returnUrl=%2Flist$/);
  });

  test('the statement of faith can be read', async ({ page, jb }) => {
    await jb.goto('/statement-of-faith');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Statement of faith');
    await expect(page.getByText('Last updated 2 November 2026')).toBeVisible();
  });
});
