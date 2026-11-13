// Acceptance Test
// Traces to: L2-249, L2-250, L2-251
// Description: a founder lists a software platform through List your business: the fourth card
// turns the form into "List a software platform", its fields are validated in words, a draft
// keeps them, and publishing says where members find it.

import { expect, test } from '../fixtures/jb-test';
import { stubListingDrafts, type FakeDraft } from '../fixtures/listing-drafts';
import { ListBusinessPage } from '../pages/list-business.page';

// Against a stand-in for the listing-draft endpoints (ADR 0009).

const earlier: FakeDraft = {
  id: 'd-1',
  kind: 'platform',
  name: 'Lanternread',
  tagline: 'A reading log families keep together',
  categorySlug: null,
  highlight: 'Free for families',
  place: null,
  agreed: false,
  items: [],
  idempotencyKey: null,
  updatedAt: '2026-11-09T20:00:00Z',
  platform: {
    website: 'https://lanternread.example',
    does: 'Families log the books their children read.',
    for: 'Families with children aged 4 to 12.',
    pricing: 'Free for families.',
  },
};

test.describe('list a software platform (L2-249 to L2-251)', () => {
  test('L2-249 AC1-AC3: "A software platform" turns the form into List a software platform, with its preview', async ({
    page,
    jb,
  }) => {
    const list = new ListBusinessPage(page);
    await list.setWidth(1280);
    await jb.signInAs('member');
    await stubListingDrafts(page);
    await jb.goto('/list');

    await expect(list.platform.offer).toBeVisible();
    await expect(list.platform.offerText).toHaveText('An app or tool people use online.');
    await list.name.fill('Lanternread');
    await list.platform.offer.check();

    await expect(list.heading).toHaveText('List a software platform');
    await expect(list.platform.nameLabel).toContainText('Platform name');
    await expect(list.platform.nameHelp).toHaveText('The name people know it by.');
    await expect(list.platform.taglineLabel).toContainText('One line on what it does');
    await expect(list.name).toHaveValue('Lanternread');
    await expect(list.category).toHaveCount(0);
    await expect(list.place).toHaveCount(0);
    await expect(list.addItem).toHaveCount(0);
    await expect(list.highlight).toBeVisible();
    await expect(list.platform.website).toBeVisible();

    await expect(list.platform.previewHeading).toHaveText('How members see it');
    await expect(list.previewName).toHaveText('Lanternread');
    await expect(list.previewTag).toHaveText('Software');
    await expect(list.previewPerks).toHaveText(['Not published yet']);
    await list.tagline.fill('A reading log families keep together');
    await list.highlight.fill('Free for families');
    await expect(list.previewTagline).toHaveText('A reading log families keep together');
    await expect(list.previewPerks).toHaveText(['Free for families', 'Not published yet']);
  });

  test('L2-249 AC2: /list?kind=platform opens the platform form', async ({ page, jb }) => {
    const list = new ListBusinessPage(page);
    await jb.signInAs('member');
    await stubListingDrafts(page);
    await jb.goto('/list?kind=platform');

    await expect(list.heading).toHaveText('List a software platform');
    await expect(list.platform.offer).toBeChecked();
  });

  test('L2-250 AC1, AC2: the platform fields have their hints, limits and counters', async ({
    page,
    jb,
  }) => {
    const list = new ListBusinessPage(page);
    await jb.signInAs('member');
    await stubListingDrafts(page);
    await jb.goto('/list?kind=platform');

    await expect(list.platform.websiteHelp).toHaveText(
      'Where people use it. It starts with https://.',
    );
    await expect(list.platform.doesHelp).toHaveText(
      'A few plain lines. What can someone do with it?',
    );
    await expect(list.platform.forHelp).toHaveText('Like “Families with children aged 4 to 12”.');
    await expect(list.platform.pricingHelp).toHaveText(
      'In your own words, like “Free for families. Schools pay per classroom.”',
    );
    await expect(list.platform.note).toHaveText(
      'Members go to your website to use it. Jubilee takes no payment.',
    );
    await expect(list.platform.photosNote).toHaveText(
      'Add photos from My business once you publish. The first photo is your cover.',
    );
    await expect(list.platform.website).toHaveAttribute('maxlength', '200');
    await expect(list.platform.does).toHaveAttribute('maxlength', '600');
    await expect(list.platform.forWhom).toHaveAttribute('maxlength', '300');
    await expect(list.platform.pricing).toHaveAttribute('maxlength', '120');

    await list.platform.does.fill('Families log the books their children read.');
    await list.platform.forWhom.fill('Families');
    await list.platform.pricing.fill('Free');
    await expect(list.platform.doesCount).toHaveText('43 / 600');
    await expect(list.platform.forCount).toHaveText('8 / 300');
    await expect(list.platform.pricingCount).toHaveText('4 / 120');
  });

  test('L2-250 AC3, AC5: empty platform fields are named, and nothing is published', async ({
    page,
    jb,
  }) => {
    const list = new ListBusinessPage(page);
    await jb.signInAs('member');
    const drafts = await stubListingDrafts(page);
    await jb.goto('/list?kind=platform');

    await list.name.fill('Lanternread');
    await list.tagline.fill('A reading log families keep together');
    await list.agree.check();
    await list.publish.click();

    await expect(list.platform.websiteError).toHaveText(
      'Enter the web address where people use your platform.',
    );
    await expect(list.platform.doesError).toHaveText('Say what your platform does in a few lines.');
    await expect(list.platform.forError).toHaveText('Say who your platform is for.');
    await expect(list.platform.pricingError).toHaveText(
      'Say how it is priced, like “Free” or “$8 a month”.',
    );
    await expect(list.summary).toBeFocused();
    await expect(list.summaryLinks).toHaveCount(4);
    await expect(list.platform.website).toHaveAttribute('aria-invalid', 'true');
    expect(drafts.publishes).toHaveLength(0);
  });

  test('L2-250 AC5: an empty name or line is asked for in the words of a platform', async ({
    page,
    jb,
  }) => {
    const list = new ListBusinessPage(page);
    await jb.signInAs('member');
    const drafts = await stubListingDrafts(page);
    await jb.goto('/list?kind=platform');

    await list.platform.fillValid(list);
    await list.name.fill('');
    await list.tagline.fill('');
    await list.publish.click();

    await expect(list.platform.nameError).toHaveText(
      'Enter the name people know your platform by.',
    );
    await expect(list.platform.taglineError).toHaveText('Say in one line what it does.');
    await expect(list.summaryLinks).toHaveText([
      'Enter your platform’s name',
      'Say in one line what it does',
    ]);
    expect(drafts.publishes).toHaveLength(0);
  });

  for (const address of [
    'http://lanternread.example',
    'lanternread.example',
    'javascript:alert(1)',
    'https://me:secret@lanternread.example',
  ]) {
    test(`L2-250 AC4: "${address}" is not a web address a platform can have`, async ({
      page,
      jb,
    }) => {
      const list = new ListBusinessPage(page);
      await jb.signInAs('member');
      const drafts = await stubListingDrafts(page);
      await jb.goto('/list?kind=platform');

      await list.platform.fillValid(list);
      await list.platform.website.fill(address);
      await list.publish.click();

      await expect(list.platform.websiteError).toHaveText(
        'Enter a web address starting with https://',
      );
      expect(drafts.publishes).toHaveLength(0);
    });
  }

  test('L2-250 AC6: the codes the API answers are shown on the platform fields', async ({
    page,
    jb,
  }) => {
    const list = new ListBusinessPage(page);
    await jb.signInAs('member');
    await stubListingDrafts(page, {
      outcome: 'invalid',
      errors: { 'platform.website': 'INVALID', 'platform.pricing': 'REQUIRED' },
    });
    await jb.goto('/list?kind=platform');

    await list.platform.fillValid(list);
    await list.publish.click();

    await expect(list.platform.websiteError).toHaveText(
      'Enter a web address starting with https://',
    );
    await expect(list.platform.pricingError).toHaveText(
      'Say how it is priced, like “Free” or “$8 a month”.',
    );
  });

  test('L2-249 AC4, L2-250 AC8: a saved platform draft is restored, and Save draft sends every field', async ({
    page,
    jb,
  }) => {
    const list = new ListBusinessPage(page);
    await jb.signInAs('member');
    const drafts = await stubListingDrafts(page, { draft: earlier });
    await jb.goto('/list');

    await expect(list.heading).toHaveText('List a software platform');
    await expect(list.platform.offer).toBeChecked();
    await expect(list.name).toHaveValue('Lanternread');
    await expect(list.platform.website).toHaveValue('https://lanternread.example');
    await expect(list.platform.does).toHaveValue('Families log the books their children read.');
    await expect(list.platform.forWhom).toHaveValue('Families with children aged 4 to 12.');
    await expect(list.platform.pricing).toHaveValue('Free for families.');
    await expect(list.highlight).toHaveValue('Free for families');

    await list.platform.website.fill('not an address yet');
    await list.saveDraft.click();
    await expect(list.saved).toBeVisible();

    expect(drafts.saves.at(-1)).toMatchObject({
      kind: 'platform',
      categorySlug: null,
      place: null,
      items: [],
      highlight: 'Free for families',
      platform: {
        website: 'not an address yet',
        does: 'Families log the books their children read.',
        for: 'Families with children aged 4 to 12.',
        pricing: 'Free for families.',
      },
    });
  });

  test('L2-251 AC1: unticked, the agreement stops publishing with the message of any listing', async ({
    page,
    jb,
  }) => {
    const list = new ListBusinessPage(page);
    await jb.signInAs('member');
    const drafts = await stubListingDrafts(page);
    await jb.goto('/list?kind=platform');

    await list.platform.fillValid(list);
    await list.agree.uncheck();
    await expect(list.platform.agreement).toHaveText(
      'I agree to Jubilee’s statement of faith and to deal honestly with every customer.',
    );
    await list.publish.click();

    await expect(list.fieldError).toHaveText([
      'Agree to the statement of faith to publish your listing.',
    ]);
    expect(drafts.publishes).toHaveLength(0);
  });

  test('L2-251 AC2: a valid platform is published and the page says where members find it', async ({
    page,
    jb,
  }) => {
    const list = new ListBusinessPage(page);
    await jb.signInAs('member');
    const drafts = await stubListingDrafts(page, { publishedSlug: 'lanternread' });
    await jb.goto('/list?kind=platform');

    await list.platform.fillValid(list);
    await list.publish.click();

    await expect(list.doneHeading).toHaveText('Lanternread is live');
    await expect(list.doneText).toHaveText('Members can find it in Software platforms now.');
    await expect(list.viewPublicListing).toHaveAttribute('href', '/b/lanternread');
    await expect(list.goToMyBusiness).toHaveAttribute('href', '/my-business');
    await expect(list.addMore).toHaveCount(0);
    expect(drafts.publishes).toHaveLength(1);
    expect(drafts.publishes[0]).toMatchObject({
      kind: 'platform',
      name: 'Lanternread',
      agreed: true,
      categorySlug: null,
      items: [],
      platform: { website: 'https://lanternread.example' },
    });
  });

  test('L2-251 AC2: while it publishes the fields are read-only and the button is busy', async ({
    page,
    jb,
  }) => {
    const list = new ListBusinessPage(page);
    await jb.signInAs('member');
    await stubListingDrafts(page, { outcome: 'hang' });
    await jb.goto('/list?kind=platform');

    await list.platform.fillValid(list);
    await list.publish.click();

    await expect(list.publish).toHaveAttribute('aria-busy', 'true');
    await expect(list.platform.website).toHaveJSProperty('readOnly', true);
    await expect(list.platform.does).toHaveJSProperty('readOnly', true);
  });
});
