// Acceptance Test
// Traces to: L2-286, L2-287, L2-288
// Description: a leader lists a non-profit through List your business: the fifth card turns the
// form into "List a non-profit", its fields are validated in words, a draft keeps them, and
// publishing says members find it in Non-profits.

import { chipCategories } from '../fixtures/categories';
import { expect, test } from '../fixtures/jb-test';
import { stubListingDrafts, type FakeDraft } from '../fixtures/listing-drafts';
import { ListBusinessPage } from '../pages/list-business.page';

// Against a stand-in for the listing-draft endpoints (ADR 0009).

const earlier: FakeDraft = {
  id: 'd-1',
  kind: 'nonprofit',
  name: 'Hope House Toronto',
  tagline: 'Meals, beds and friendship for men leaving the shelter system.',
  categorySlug: null,
  highlight: 'Volunteers welcome',
  place: null,
  agreed: false,
  items: [],
  idempotencyKey: null,
  updatedAt: '2026-11-09T20:00:00Z',
  nonprofit: {
    website: 'https://hopehouse.example',
    giveUrl: 'https://hopehouse.example/give',
    mission: 'We share meals, beds and friendship with men leaving the shelters.',
    serves: 'Men aged 18 and over moving out of Toronto’s shelters.',
    area: 'Moss Park and Regent Park',
  },
};

test.describe('list a non-profit (L2-286 to L2-288)', () => {
  test('L2-286 AC1-AC3: "A non-profit" turns the form into List a non-profit, with its preview', async ({
    page,
    jb,
  }) => {
    const list = new ListBusinessPage(page);
    await list.setWidth(1280);
    await jb.signInAs('member');
    await stubListingDrafts(page);
    await jb.goto('/list');

    await expect(list.nonprofit.offerText).toHaveText('A ministry or charity at work in Toronto.');
    await list.name.fill('Hope House Toronto');
    await list.nonprofit.offer.check();

    await expect(list.heading).toHaveText('List a non-profit');
    await expect(list.nonprofit.subtitle).toHaveText('For someone who leads or represents it.');
    await expect(list.nonprofit.nameLabel).toContainText('Non-profit name');
    await expect(list.nonprofit.nameHelp).toHaveText('The name people know it by.');
    await expect(list.nonprofit.taglineLabel).toContainText('One line on what it does');
    await expect(list.name).toHaveValue('Hope House Toronto');
    await expect(list.category).toHaveCount(0);
    // The business's area served gives way to "Where in Toronto it works", which keeps its id.
    await expect(list.placeLabel).toHaveText(/^Where in Toronto it works/);
    await expect(list.addItem).toHaveCount(0);
    await expect(list.highlight).toBeVisible();

    await expect(list.nonprofit.previewHeading).toHaveText('How members see it');
    await expect(list.previewName).toHaveText('Hope House Toronto');
    await expect(list.previewTag).toHaveText('Non-profit');
    await list.highlight.fill('Volunteers welcome');
    await expect(list.previewPerks).toHaveText(['Volunteers welcome', 'Not published yet']);
  });

  test('L2-286 AC2: /list?kind=nonprofit opens the non-profit form', async ({ page, jb }) => {
    const list = new ListBusinessPage(page);
    await jb.signInAs('member');
    await stubListingDrafts(page);
    await jb.goto('/list?kind=nonprofit');

    await expect(list.heading).toHaveText('List a non-profit');
    await expect(list.nonprofit.offer).toBeChecked();
  });

  test('L2-286 AC5: the arrow keys reach the fifth card like the other four', async ({
    page,
    jb,
  }) => {
    const list = new ListBusinessPage(page);
    await jb.signInAs('member');
    await stubListingDrafts(page);
    await jb.goto('/list?kind=platform');

    await list.platform.offer.focus();
    await page.keyboard.press('ArrowDown');
    await expect(list.nonprofit.offer).toBeChecked();
    await expect(list.heading).toHaveText('List a non-profit');
  });

  test('L2-287 AC1, AC2: the non-profit fields have their hints, limits and counters', async ({
    page,
    jb,
  }) => {
    const list = new ListBusinessPage(page);
    await jb.signInAs('member');
    await stubListingDrafts(page);
    await jb.goto('/list?kind=nonprofit');

    await expect(list.nonprofit.websiteLabel).toContainText('Website');
    await expect(list.nonprofit.websiteHelp).toHaveText(
      'Its own website. It starts with https://.',
    );
    await expect(list.nonprofit.missionHelp).toHaveText(
      'In its own words. What work does it do, and why?',
    );
    await expect(list.nonprofit.servesHelp).toHaveText(
      'Like “Young people aged 12 to 18 in Scarborough”.',
    );
    await expect(list.nonprofit.areaHelp).toHaveText(
      'Like “Regent Park and Moss Park” or “Across Toronto”.',
    );
    await expect(list.nonprofit.giveHelp).toHaveText(
      'Its own page where people give, if it has one. It starts with https://.',
    );
    await expect(list.nonprofit.note).toHaveText(
      'Gifts go straight to the non-profit, on its own website. Jubilee takes no gift and no payment.',
    );
    await expect(list.nonprofit.photosNote).toHaveText(
      'Add photos from My business once you publish. The first photo is your cover.',
    );
    await expect(list.nonprofit.website).toHaveAttribute('maxlength', '200');
    await expect(list.nonprofit.give).toHaveAttribute('maxlength', '200');
    await expect(list.nonprofit.mission).toHaveAttribute('maxlength', '600');
    await expect(list.nonprofit.serves).toHaveAttribute('maxlength', '300');
    await expect(list.nonprofit.area).toHaveAttribute('maxlength', '120');

    await list.nonprofit.mission.fill('We share meals.');
    await list.nonprofit.serves.fill('Men');
    await list.nonprofit.area.fill('Moss Park');
    await expect(list.nonprofit.missionCount).toHaveText('15 / 600');
    await expect(list.nonprofit.servesCount).toHaveText('3 / 300');
    await expect(list.nonprofit.areaCount).toHaveText('9 / 120');
  });

  test('L2-287 AC3, AC6: empty fields are named in the words of a non-profit, and nothing is published', async ({
    page,
    jb,
  }) => {
    const list = new ListBusinessPage(page);
    await jb.signInAs('member');
    const drafts = await stubListingDrafts(page);
    await jb.goto('/list?kind=nonprofit');

    await list.agree.check();
    await list.publish.click();

    await expect(list.nonprofit.nameError).toHaveText('Enter the name people know it by.');
    await expect(list.nonprofit.taglineError).toHaveText('Say in one line what it does.');
    await expect(list.nonprofit.websiteError).toHaveText('Enter the non-profit’s website.');
    await expect(list.nonprofit.missionError).toHaveText(
      'Say what work it does, in its own words.',
    );
    await expect(list.nonprofit.servesError).toHaveText('Say who it serves.');
    await expect(list.nonprofit.areaError).toHaveText('Say where in Toronto it works.');
    await expect(list.summary).toBeFocused();
    await expect(list.summaryLinks).toHaveText([
      'Enter the non-profit’s name',
      'Say in one line what it does',
      'Enter its website',
      'Say what work it does',
      'Say who it serves',
      'Say where in Toronto it works',
    ]);
    await expect(list.nonprofit.website).toHaveAttribute('aria-invalid', 'true');
    expect(drafts.publishes).toHaveLength(0);
  });

  test('L2-287 AC5: an empty page for giving is accepted', async ({ page, jb }) => {
    const list = new ListBusinessPage(page);
    await jb.signInAs('member');
    const drafts = await stubListingDrafts(page, { publishedSlug: 'hope-house-toronto' });
    await jb.goto('/list?kind=nonprofit');

    await list.nonprofit.fillValid(list);
    await list.nonprofit.give.fill('');
    await list.publish.click();

    await expect(list.doneHeading).toHaveText('Hope House Toronto is live');
    expect(drafts.publishes[0]).toMatchObject({ nonprofit: { giveUrl: '' } });
  });

  for (const address of [
    'http://hopehouse.example',
    'hopehouse.example',
    'javascript:alert(1)',
    'https://me:secret@hopehouse.example/give',
  ]) {
    test(`L2-287 AC4: "${address}" is neither a website nor a page for giving`, async ({
      page,
      jb,
    }) => {
      const list = new ListBusinessPage(page);
      await jb.signInAs('member');
      const drafts = await stubListingDrafts(page);
      await jb.goto('/list?kind=nonprofit');

      await list.nonprofit.fillValid(list);
      await list.nonprofit.website.fill(address);
      await list.nonprofit.give.fill(address);
      await list.publish.click();

      await expect(list.nonprofit.websiteError).toHaveText(
        'Enter a web address starting with https://',
      );
      await expect(list.nonprofit.giveError).toHaveText(
        'Enter a web address starting with https://',
      );
      await expect(list.summaryLinks).toHaveText([
        'Enter a web address starting with https://',
        'Check the page for giving',
      ]);
      expect(drafts.publishes).toHaveLength(0);
    });
  }

  test('L2-287 AC7: the codes the API answers are shown on the non-profit fields', async ({
    page,
    jb,
  }) => {
    const list = new ListBusinessPage(page);
    await jb.signInAs('member');
    await stubListingDrafts(page, {
      outcome: 'invalid',
      errors: { 'nonprofit.giveUrl': 'INVALID', 'nonprofit.area': 'REQUIRED' },
    });
    await jb.goto('/list?kind=nonprofit');

    await list.nonprofit.fillValid(list);
    await list.publish.click();

    await expect(list.nonprofit.giveError).toHaveText('Enter a web address starting with https://');
    await expect(list.nonprofit.areaError).toHaveText('Say where in Toronto it works.');
    await expect(list.nonprofit.mission).toHaveValue(
      'We share meals, beds and friendship with men leaving the shelters.',
    );
  });

  test('L2-286 AC4, L2-287 AC9: a saved non-profit draft is restored, and Save draft sends every field', async ({
    page,
    jb,
  }) => {
    const list = new ListBusinessPage(page);
    await jb.signInAs('member');
    const drafts = await stubListingDrafts(page, { draft: earlier });
    await jb.goto('/list');

    await expect(list.heading).toHaveText('List a non-profit');
    await expect(list.nonprofit.offer).toBeChecked();
    await expect(list.name).toHaveValue('Hope House Toronto');
    await expect(list.nonprofit.website).toHaveValue('https://hopehouse.example');
    await expect(list.nonprofit.give).toHaveValue('https://hopehouse.example/give');
    await expect(list.nonprofit.serves).toHaveValue(
      'Men aged 18 and over moving out of Toronto’s shelters.',
    );
    await expect(list.nonprofit.area).toHaveValue('Moss Park and Regent Park');
    await expect(list.highlight).toHaveValue('Volunteers welcome');

    await list.nonprofit.give.fill('not an address yet');
    await list.saveDraft.click();
    await expect(list.saved).toBeVisible();

    expect(drafts.saves.at(-1)).toMatchObject({
      kind: 'nonprofit',
      categorySlug: null,
      place: null,
      items: [],
      platform: null,
      nonprofit: { ...earlier.nonprofit, giveUrl: 'not an address yet' },
    });
  });

  test('L2-288 AC1: unticked, the agreement stops publishing with the message of any listing', async ({
    page,
    jb,
  }) => {
    const list = new ListBusinessPage(page);
    await jb.signInAs('member');
    const drafts = await stubListingDrafts(page);
    await jb.goto('/list?kind=nonprofit');

    await list.nonprofit.fillValid(list);
    await list.agree.uncheck();
    await list.publish.click();

    await expect(list.fieldError).toHaveText([
      'Agree to the statement of faith to publish your listing.',
    ]);
    expect(drafts.publishes).toHaveLength(0);
  });

  test('L2-288 AC2: a valid non-profit is published and the page says members find it in Non-profits', async ({
    page,
    jb,
  }) => {
    const list = new ListBusinessPage(page);
    await jb.signInAs('member');
    const drafts = await stubListingDrafts(page, { publishedSlug: 'hope-house-toronto' });
    await jb.goto('/list?kind=nonprofit');

    await list.nonprofit.fillValid(list);
    await list.publish.click();

    await expect(list.doneHeading).toHaveText('Hope House Toronto is live');
    await expect(list.doneText).toHaveText('Members can find it in Non-profits now.');
    await expect(list.viewPublicListing).toHaveAttribute('href', '/b/hope-house-toronto');
    await expect(list.goToMyBusiness).toHaveAttribute('href', '/my-business');
    await expect(list.addMore).toHaveCount(0);
    expect(drafts.publishes).toHaveLength(1);
    expect(drafts.publishes[0]).toMatchObject({
      kind: 'nonprofit',
      name: 'Hope House Toronto',
      agreed: true,
      categorySlug: null,
      items: [],
      nonprofit: {
        website: 'https://hopehouse.example',
        giveUrl: 'https://hopehouse.example/give',
        area: 'Moss Park and Regent Park',
      },
    });
  });

  test('L2-288 AC2: while it publishes the fields are read-only and the button is busy', async ({
    page,
    jb,
  }) => {
    const list = new ListBusinessPage(page);
    await jb.signInAs('member');
    await stubListingDrafts(page, { outcome: 'hang' });
    await jb.goto('/list?kind=nonprofit');

    await list.nonprofit.fillValid(list);
    await list.publish.click();

    await expect(list.publish).toHaveAttribute('aria-busy', 'true');
    await expect(list.nonprofit.website).toHaveJSProperty('readOnly', true);
    await expect(list.nonprofit.mission).toHaveJSProperty('readOnly', true);
  });

  test('a business cannot choose "Non-profits" as its category', async ({ page, jb }) => {
    const list = new ListBusinessPage(page);
    await jb.signInAs('member');
    await stubListingDrafts(page);
    await jb.goto('/list');

    // A business chooses among the categories of businesses and spaces (L2-286 AC2, L2-248 AC1).
    await expect(list.category.locator('option')).toHaveText(
      chipCategories
        .filter((c) => c.slug !== 'software-platforms' && c.slug !== 'non-profits')
        .map((c) => c.name),
    );
  });
});
