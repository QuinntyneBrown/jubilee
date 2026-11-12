import { expect, test } from '../fixtures/jb-test';
import { stubListingDrafts, type FakeDraft } from '../fixtures/listing-drafts';
import { stubSession, unconfirmedSession } from '../fixtures/stubs';
import { ListBusinessPage } from '../pages/list-business.page';
import { ProductEditorDialog } from '../pages/product-editor.dialog';
import { ServiceEditorDialog } from '../pages/service-editor.dialog';

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

  test('the highlight is the green line of the preview, and stops at 30 characters (L2-072 AC1, AC7, L2-076 AC1)', async ({
    page,
    jb,
  }) => {
    const list = new ListBusinessPage(page);
    await list.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubListingDrafts(page);
    await jb.goto('/list');

    await expect(list.highlightLabel).toHaveText('Highlight (optional)');
    await expect(list.highlightHelp).toHaveText(
      'A short green line on your card, like “Free first meeting”. 30 characters at most.',
    );
    // With no highlight the card has only its mark.
    await expect(list.previewPerks).toHaveText(['Pending verification']);

    await list.highlight.fill('Ships across Canada');
    await expect(list.previewPerks).toHaveText(['Ships across Canada', 'Pending verification']);

    await list.highlight.fill('Ships across Canada and the United States');
    await expect(list.highlight).toHaveValue('Ships across Canada and the Un');

    await list.highlight.fill('Free first meeting');
    await list.saveDraft.click();
    await expect(list.saved).toBeVisible();
    expect(fake.creates[0].highlight).toBe('Free first meeting');

    // A space has no highlight (ADR 0018).
    await list.space.offer.check();
    await expect(list.highlight).toHaveCount(0);
  });

  test('the highlight of a saved draft is restored, in the form and in the preview', async ({
    page,
    jb,
  }) => {
    const list = new ListBusinessPage(page);
    await list.setWidth(1280);
    await jb.signInAs('member');
    await stubListingDrafts(page, { draft: { ...earlier, highlight: 'Ships across Canada' } });
    await jb.goto('/list');

    await expect(list.highlight).toHaveValue('Ships across Canada');
    await expect(list.previewPerks).toHaveText(['Ships across Canada', 'Pending verification']);
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

  test('a product is added through the product editor, kept with the draft, and removed (L2-073 AC1)', async ({
    page,
    jb,
  }) => {
    const list = new ListBusinessPage(page);
    const editor = new ProductEditorDialog(page);
    await list.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubListingDrafts(page);
    await jb.goto('/list');

    await list.addItem.click();
    await expect(editor.title).toHaveText('Add a product');
    await expect(editor.note).toHaveText('Nothing is public until your listing is verified.');
    await editor.submit.click();
    await expect(editor.errors).toHaveText([
      'Enter a name for the product.',
      'Enter a price in dollars, like 24.00.',
    ]);

    await editor.name.fill('Walnut prayer bench');
    await editor.price.fill('185.00');
    await editor.stock.fill('3');
    await editor.description.fill('Solid walnut kneeling bench, oiled finish, folds flat.');
    await editor.submit.click();

    // No listing exists yet: the product is kept with the draft and no catalogue endpoint is called.
    await expect(editor.root).toBeHidden();
    await expect(list.itemRows).toHaveCount(1);
    await expect(list.itemRows.first()).toContainText('Walnut prayer bench');
    await expect(list.itemRows.first()).toContainText('$185');

    await list.saveDraft.click();
    await expect(list.saved).toBeVisible();
    expect(fake.creates[0].items).toEqual([
      {
        name: 'Walnut prayer bench',
        detail: null,
        priceKind: 'amount',
        priceCents: 18500,
        description: 'Solid walnut kneeling bench, oiled finish, folds flat.',
        stock: 3,
        action: 'ask',
        durationMinutes: null,
        offersVideo: true,
        offersInPerson: false,
        inPersonPlace: null,
      },
    ]);

    await list.removeItem('Walnut prayer bench').click();
    await expect(list.itemRows).toHaveCount(0);
  });

  test('a service is added through the service editor with what members can do (L2-073 AC2)', async ({
    page,
    jb,
  }) => {
    const list = new ListBusinessPage(page);
    const editor = new ServiceEditorDialog(page);
    await list.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubListingDrafts(page);
    await jb.goto('/list');
    await list.services.check();

    await list.addItem.click();
    await expect(editor.title).toHaveText('Add a service');
    await expect(editor.note).toHaveText('Nothing is public until your listing is verified.');
    await editor.name.fill('Engagement session');
    await editor.detail.fill('45 min · In person or video');
    await editor.pricing.selectOption('ask');
    await editor.action.selectOption('book');
    await editor.duration.fill('45');
    await editor.inPerson.check();
    await editor.submit.click();
    // The editor checks its fields as it does in the workspace (L2-094 AC4).
    await expect(editor.errors).toHaveText(['Enter where you meet.']);
    await editor.place.fill('12 Queen St E, Toronto');
    await editor.submit.click();

    await expect(editor.root).toBeHidden();
    await expect(list.itemRows.first()).toContainText('Engagement session');
    await expect(list.itemRows.first()).toContainText('45 min · In person or video');
    await expect(list.itemRows.first()).toContainText('Ask');

    await list.saveDraft.click();
    await expect(list.saved).toBeVisible();
    expect(fake.creates[0].items).toEqual([
      {
        name: 'Engagement session',
        detail: '45 min · In person or video',
        priceKind: 'ask',
        priceCents: null,
        description: null,
        stock: null,
        action: 'book',
        durationMinutes: 45,
        offersVideo: true,
        offersInPerson: true,
        inPersonPlace: '12 Queen St E, Toronto',
      },
    ]);
  });

  test('a service members ask about has no meeting length, and a price is optional', async ({
    page,
    jb,
  }) => {
    const list = new ListBusinessPage(page);
    const editor = new ServiceEditorDialog(page);
    await list.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubListingDrafts(page);
    await jb.goto('/list');
    await list.services.check();

    await list.addItem.click();
    await editor.name.fill('Wedding day coverage');
    await editor.pricing.selectOption('amount');
    await editor.price.fill('2400');
    await expect(editor.action).toHaveValue('ask');
    await expect(editor.duration).toHaveCount(0);
    await editor.submit.click();

    await expect(list.itemRows.first()).toContainText('$2,400');
    await list.saveDraft.click();
    await expect(list.saved).toBeVisible();
    expect(fake.creates[0].items[0]).toMatchObject({
      priceKind: 'amount',
      priceCents: 240000,
      action: 'ask',
      durationMinutes: null,
      offersInPerson: false,
      inPersonPlace: null,
    });
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

  test('L2-127 AC2: a submission that takes longer than 10 seconds fails and can be tried again', async ({
    page,
    jb,
  }) => {
    const list = new ListBusinessPage(page);
    await list.setWidth(1280);
    await page.clock.install();
    await jb.signInAs('member');
    await stubListingDrafts(page, { outcome: 'hang' });
    await jb.goto('/list');
    await list.fillValid();

    await list.submit.click();
    await expect(list.submit).toHaveAttribute('aria-busy', 'true');
    await page.clock.fastForward(10_500);

    await expect(list.alert).toContainText('We couldn’t save that. Try again.');
    await expect(list.submit).not.toHaveAttribute('aria-busy', 'true');
    await expect(list.name).not.toHaveAttribute('readonly', '');
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
