import { expect, test } from '../fixtures/jb-test';
import { SUITE, stubMyBusiness } from '../fixtures/my-business';
import { EditListingPage } from '../pages/edit-listing.page';

const EDITOR = '/my-business/listing';

test.describe('edit a space (L2-209)', () => {
  test('L2-209 AC1: the owner of a space edits its own fields, filled with what is stored', async ({
    page,
    jb,
  }) => {
    // Given the owner of the guest suite
    const editor = new EditListingPage(page);
    await editor.setWidth(1280);
    await stubMyBusiness(page, { listing: SUITE });

    // When the editor loads
    await jb.goto(EDITOR);

    // Then it shows the space's fields with their stored values
    await expect(editor.space.nameLabel).toContainText('Listing title');
    await expect(editor.space.taglineLabel).toContainText('One line renters should know');
    await expect(editor.about).toHaveValue(/^Ten minutes’ walk/);
    await expect(editor.space.term('Short stays')).toBeChecked();
    await expect(editor.space.priceLabel).toContainText('Price per night');
    await expect(editor.space.price).toHaveValue('120');
    await expect(editor.space.available).toHaveValue('Most weekends');
    await expect(editor.space.minimumLabel).toContainText('Minimum nights');
    await expect(editor.space.minimum).toHaveValue('2');
    await expect(editor.space.neighbourhood).toHaveValue('Roncesvalles');
    await expect(editor.space.address).toHaveValue('112 Fermanagh Ave, Toronto, ON M6R 1M2');
    await expect(editor.space.place).toHaveValue('Guest suite');
    await expect(editor.space.facts).toHaveValue(
      'Queen bed\nPrivate bath\nSleeps 2\nSelf check-in',
    );
    await expect(editor.space.includedChip('Wi-Fi')).toHaveAttribute('aria-pressed', 'true');
    await expect(editor.space.includedChip('Utilities')).toHaveAttribute('aria-pressed', 'false');
    await expect(editor.space.rules).toHaveValue('Check-in after 3 pm\nNo parties\nNo smoking');
    // and not the business's own fields
    await expect(editor.category).toHaveCount(0);
    await expect(editor.hours).toHaveCount(0);
    await expect(editor.website).toHaveCount(0);
    // and the preview is the space card
    await expect(editor.space.previewHeading).toHaveText('How renters see it');
    await expect(editor.space.previewBadge).toHaveText('Short stay');
    await expect(editor.space.previewPrice).toHaveText('$120 / night');
    await expect(editor.space.previewPending).toHaveCount(0);
  });

  test('L2-209 AC2: valid changes are saved and live at once', async ({ page, jb }) => {
    // Given the owner of the guest suite in the editor
    const editor = new EditListingPage(page);
    await editor.setWidth(1280);
    const fake = await stubMyBusiness(page, { listing: SUITE });
    await jb.goto(EDITOR);

    // When they raise the rent, include laundry and save
    await editor.space.price.fill('140');
    await editor.space.includedChip('Laundry').click();
    await editor.save.click();

    // Then the space is sent in the editor's save and the change is live
    await expect(editor.success).toContainText('Your changes are live now.');
    expect(fake.saves).toHaveLength(1);
    expect(fake.saves[0]).toMatchObject({
      name: 'Guest suite near Roncesvalles',
      category: 'rooms-rentals',
      hours: '',
      space: {
        term: 'short-stay',
        rent: 140,
        available: 'Most weekends',
        minimumStay: 2,
        neighbourhood: 'Roncesvalles',
        address: '112 Fermanagh Ave, Toronto, ON M6R 1M2',
        place: 'Guest suite',
        facts: ['Queen bed', 'Private bath', 'Sleeps 2', 'Self check-in'],
        included: ['Wi-Fi', 'Laundry', 'Furnished', 'Parking', 'Private bath'],
        household: null,
        rules: ['Check-in after 3 pm', 'No parties', 'No smoking'],
      },
    });
    await expect(editor.space.price).toHaveValue('140');
  });

  test('L2-209 AC2: the space fields are checked as when it was listed, and nothing is sent', async ({
    page,
    jb,
  }) => {
    // Given the owner of the guest suite in the editor
    const editor = new EditListingPage(page);
    await editor.setWidth(1280);
    const fake = await stubMyBusiness(page, { listing: SUITE });
    await jb.goto(EDITOR);

    // When they empty the rent and the address and save
    await editor.space.price.fill('');
    await editor.space.address.fill('');
    await editor.save.click();

    // Then each field says what is missing, the summary counts them and nothing is saved
    await expect(editor.fieldError(editor.space.price)).toHaveText(
      'Enter the rent in whole dollars, like 950.',
    );
    await expect(editor.fieldError(editor.space.address)).toHaveText(
      'Enter the exact address. Renters only see it once you accept them.',
    );
    await expect(editor.summary).toContainText('Fix 2 things to continue');
    expect(fake.saves).toEqual([]);
  });

  test('L2-209 AC3: a change of term changes the price unit and the card, and is saved', async ({
    page,
    jb,
  }) => {
    // Given the owner of the guest suite in the editor
    const editor = new EditListingPage(page);
    await editor.setWidth(1280);
    const fake = await stubMyBusiness(page, { listing: SUITE });
    await jb.goto(EDITOR);

    // When they rent it long term instead, at $1,600 a month, and save
    await editor.space.term('Long term').check();
    await editor.space.price.fill('1600');

    // Then the form and the card speak of months
    await expect(editor.space.priceLabel).toContainText('Price per month');
    await expect(editor.space.minimumLabel).toContainText('Minimum stay');
    await expect(editor.space.minimum).toHaveValue('1');
    await expect(editor.space.previewBadge).toHaveText('Long term');
    await expect(editor.space.previewPrice).toHaveText('$1,600 / month');

    await editor.save.click();
    await expect(editor.success).toBeVisible();
    expect(fake.saves[0]).toMatchObject({
      space: { term: 'long-term', rent: 1600, minimumStay: 1 },
    });
  });
});
