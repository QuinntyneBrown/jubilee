import { expect, test } from '../fixtures/jb-test';
import { stubListingDrafts, type FakeDraft } from '../fixtures/listing-drafts';
import { ListBusinessPage } from '../pages/list-business.page';

// Listing a space through List your business (L2-198 to L2-200), against a stand-in for the
// listing-draft endpoints (ADR 0009).

const earlier: FakeDraft = {
  id: 'd-1',
  kind: 'space',
  name: 'Furnished room in a family home, Leslieville',
  tagline: 'Quiet room with a desk, shared bath, home-cooked Sunday dinners',
  categorySlug: 'rooms-rentals',
  highlight: null,
  place: null,
  agreed: false,
  items: [],
  idempotencyKey: null,
  updatedAt: '2026-11-09T20:00:00Z',
  space: {
    term: 'room',
    rent: 950,
    available: 'Now',
    minimumStay: 4,
    neighbourhood: 'Leslieville',
    address: '88 Curzon St, Toronto',
    place: 'Private room',
    facts: ['Double bed', 'Shared bath'],
    included: ['Wi-Fi', 'Laundry'],
    household: 'Ruth and Kwame with our daughter Abena (14).',
    rules: ['No smoking'],
  },
};

test.describe('list a space (L2-198 to L2-200)', () => {
  test('L2-198 AC1-AC3: "A space" turns the form into List a space, with its own preview', async ({
    page,
    jb,
  }) => {
    const list = new ListBusinessPage(page);
    await list.setWidth(1280);
    await jb.signInAs('member');
    await stubListingDrafts(page);
    await jb.goto('/list');

    await expect(list.space.offer).toBeVisible();
    await list.space.offer.check();

    await expect(list.heading).toHaveText('List a space');
    await expect(list.space.nameLabel).toContainText('Listing title');
    await expect(list.space.nameHelp).toHaveText(
      'Say what it is and where: “Furnished room in Leslieville”.',
    );
    await expect(list.space.taglineLabel).toContainText('One line renters should know');
    await expect(list.category).toHaveCount(0);
    await expect(list.addItem).toHaveCount(0);
    await expect(list.space.previewHeading).toHaveText('How renters see it');
    await expect(list.space.previewPending).toHaveText('Pending verification');

    await list.name.fill('Bright basement apartment in the Annex');
    await list.space.price.fill('1850');
    await expect(list.space.previewTitle).toHaveText('Bright basement apartment in the Annex');
    await expect(list.space.previewPrice).toHaveText('$1,850 / month');
    await expect(list.space.previewBadge).toHaveText('Long term');
  });

  test('L2-199 AC1-AC3, AC5: the fields follow the term, and what was typed stays', async ({
    page,
    jb,
  }) => {
    const list = new ListBusinessPage(page);
    await list.setWidth(1280);
    await jb.signInAs('member');
    await stubListingDrafts(page);
    await jb.goto('/list?kind=space');

    await expect(list.space.term('Long term')).toBeChecked();
    await expect(list.space.priceLabel).toContainText('Price per month');
    await expect(list.space.availableLabel).toContainText('Move-in date');
    await expect(list.space.minimumLabel).toContainText('Minimum stay');
    await expect(list.space.minimum.locator('option')).toHaveText([
      'Month to month',
      '4 months',
      '6 months',
      '12-month lease',
    ]);
    await expect(list.space.neighbourhoodHelp).toHaveText(
      'Your exact address is only shared once you accept a request.',
    );
    await expect(list.space.addressHelp).toHaveText(
      'Only the renter whose request you accept sees it.',
    );
    await expect(list.space.place.locator('option')).toHaveText([
      'Private room',
      'Basement apartment',
      'Guest suite',
      'Entire house',
      'Condo',
      'Event hall',
    ]);
    await expect(list.space.included).toHaveText([
      'Utilities',
      'Wi-Fi',
      'Laundry',
      'Furnished',
      'Parking',
      'Private bath',
      'Kitchen use',
      'Pets OK',
    ]);
    await expect(list.space.household).toHaveCount(0);
    await expect(list.space.photosHelp).toContainText(
      'Add photos from My business once you submit. The first photo is your cover.',
    );

    await list.space.includedChip('Wi-Fi').click();
    await expect(list.space.includedChip('Wi-Fi')).toHaveAttribute('aria-pressed', 'true');
    await expect(list.space.includedChip('Parking')).toHaveAttribute('aria-pressed', 'false');

    await list.space.price.fill('120');
    await list.space.neighbourhood.fill('Roncesvalles');
    await list.space.term('Short stays').check();

    await expect(list.space.priceLabel).toContainText('Price per night');
    await expect(list.space.availableLabel).toContainText('Available');
    await expect(list.space.minimumLabel).toContainText('Minimum nights');
    await expect(list.space.minimum.locator('option')).toHaveText([
      '1 night',
      '2 nights',
      '3 nights',
      '1 week',
    ]);
    await expect(list.space.price).toHaveValue('120');
    await expect(list.space.neighbourhood).toHaveValue('Roncesvalles');
    await expect(list.space.includedChip('Wi-Fi')).toHaveAttribute('aria-pressed', 'true');
  });

  test('L2-199 AC4: a Room and a Roommate ask about the household', async ({ page, jb }) => {
    const list = new ListBusinessPage(page);
    await list.setWidth(1280);
    await jb.signInAs('member');
    await stubListingDrafts(page);
    await jb.goto('/list?kind=space');

    await list.space.term('Rooms').check();
    await expect(list.space.householdLabel).toContainText('Who lives in the home');
    await expect(list.space.householdHelp).toHaveText(
      'Renters choose people as much as rooms. A few honest lines go a long way.',
    );

    await list.space.term('Roommates').check();
    await expect(list.space.householdLabel).toContainText(
      'Who you are, and who you’re looking for',
    );

    await list.space.term('Long term').check();
    await expect(list.space.household).toHaveCount(0);
  });

  test('L2-199 AC6-AC8, L2-200 AC1: an empty space names every missing field', async ({
    page,
    jb,
  }) => {
    const list = new ListBusinessPage(page);
    await list.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubListingDrafts(page);
    await jb.goto('/list?kind=space');

    await expect(list.space.agreement).toHaveAccessibleName(
      'I agree to Jubilee’s statement of faith, and confirm I’m allowed to rent this space and will follow Ontario’s tenancy rules.',
    );
    await list.space.term('Rooms').check();
    await list.submit.click();

    await expect(list.fieldError).toContainText([
      'Enter the rent in whole dollars, like 950.',
      'Say when renters can move in, like Mar 1 or Now.',
      'Enter the neighbourhood, like The Annex.',
      'Enter the exact address. Renters only see it once you accept them.',
      'Tell renters who lives there in a line or two.',
      'Agree to the statement of faith and the rental terms to submit your space.',
    ]);
    await list.space.price.fill('60000');
    await list.submit.click();
    await expect(list.fieldError).toContainText(['Enter a rent of $50,000 or less.']);
    expect(fake.submits).toHaveLength(0);
  });

  test('L2-199 AC10, L2-198 AC4: a space draft saves every field and comes back as it was', async ({
    page,
    jb,
  }) => {
    const list = new ListBusinessPage(page);
    await list.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubListingDrafts(page, { draft: earlier });
    await jb.goto('/list');

    await expect(list.space.offer).toBeChecked();
    await expect(list.space.term('Rooms')).toBeChecked();
    await expect(list.space.price).toHaveValue('950');
    await expect(list.space.available).toHaveValue('Now');
    await expect(list.space.minimum).toHaveValue('4');
    await expect(list.space.neighbourhood).toHaveValue('Leslieville');
    await expect(list.space.address).toHaveValue('88 Curzon St, Toronto');
    await expect(list.space.place).toHaveValue('Private room');
    await expect(list.space.facts).toHaveValue('Double bed\nShared bath');
    await expect(list.space.includedChip('Laundry')).toHaveAttribute('aria-pressed', 'true');
    await expect(list.space.household).toHaveValue('Ruth and Kwame with our daughter Abena (14).');
    await expect(list.space.rules).toHaveValue('No smoking');

    await list.space.rules.fill('No smoking\nShare the chore rota');
    await list.saveDraft.click();

    await expect(list.saved).toBeVisible();
    expect(fake.saves.at(-1)).toMatchObject({
      kind: 'space',
      space: {
        term: 'room',
        rent: 950,
        minimumStay: 4,
        address: '88 Curzon St, Toronto',
        included: ['Wi-Fi', 'Laundry'],
        rules: ['No smoking', 'Share the chore rota'],
      },
    });
  });

  test('L2-200 AC2: a valid space is in for verification', async ({ page, jb }) => {
    const list = new ListBusinessPage(page);
    await list.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubListingDrafts(page);
    await jb.goto('/list?kind=space');

    await list.name.fill('Bright basement apartment in the Annex');
    await list.tagline.fill('Separate entrance, garden walkout');
    await list.space.fillValid();
    await list.space.agreement.check();
    await list.submit.click();

    await expect(list.doneHeading).toHaveText(
      'Bright basement apartment in the Annex is in for verification',
    );
    await expect(list.goToMyBusiness).toBeVisible();
    expect(fake.submits[0]).toMatchObject({
      kind: 'space',
      categorySlug: null,
      space: { term: 'long-term', rent: 1850, available: 'Dec 1', neighbourhood: 'The Annex' },
    });
  });

  test('the server’s space codes are shown under their fields', async ({ page, jb }) => {
    const list = new ListBusinessPage(page);
    await list.setWidth(1280);
    await jb.signInAs('member');
    await stubListingDrafts(page, {
      outcome: 'invalid',
      errors: { 'space.rent': 'TOO_HIGH', 'space.address': 'REQUIRED' },
    });
    await jb.goto('/list?kind=space');

    await list.name.fill('Bright basement apartment in the Annex');
    await list.tagline.fill('Separate entrance, garden walkout');
    await list.space.fillValid();
    await list.space.agreement.check();
    await list.submit.click();

    await expect(list.fieldError).toHaveText([
      'Enter a rent of $50,000 or less.',
      'Enter the exact address. Renters only see it once you accept them.',
    ]);
  });
});
