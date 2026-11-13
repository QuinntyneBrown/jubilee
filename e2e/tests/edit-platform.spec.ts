// Acceptance Test
// Traces to: L2-256
// Description: the founder of a software platform edits it from My business: the editor shows the
// platform's own fields, validates them as when it was listed, and saves them live at once.

import { expect, test } from '../fixtures/jb-test';
import { LANTERNREAD, stubMyBusiness } from '../fixtures/my-business';
import { EditListingPage } from '../pages/edit-listing.page';

// Against a stand-in for the owner's workspace (ADR 0009).

const EDITOR = '/my-business/listing';

test.describe('edit a software platform (L2-256)', () => {
  test('L2-256 AC1: the founder edits the platform’s own fields, filled with what is stored', async ({
    page,
    jb,
  }) => {
    // Given the founder of Lanternread
    const editor = new EditListingPage(page);
    await editor.setWidth(1280);
    await stubMyBusiness(page, { listing: LANTERNREAD });

    // When the editor loads
    await jb.goto(EDITOR);

    // Then it shows the platform's fields with their stored values
    await expect(editor.platform.nameLabel).toContainText('Platform name');
    await expect(editor.platform.nameHelp).toHaveText('The name people know it by.');
    await expect(editor.platform.taglineLabel).toContainText('One line on what it does');
    await expect(editor.platformName).toHaveValue('Lanternread');
    await expect(editor.platformTagline).toHaveValue('A reading log families keep together');
    await expect(editor.counter.first()).toHaveText('36 / 90');
    await expect(editor.platform.website).toHaveValue('https://lanternread.example');
    await expect(editor.platform.websiteHelp).toHaveText(
      'Where people use it. It starts with https://.',
    );
    await expect(editor.platform.does).toHaveValue(/^Families log the books/);
    await expect(editor.platform.forWhom).toHaveValue(/^Families with children aged 4 to 12/);
    await expect(editor.platform.pricing).toHaveValue(
      'Free for families. Schools pay per classroom.',
    );
    await expect(editor.platform.pricingCount).toHaveText('45 / 120');
    await expect(editor.highlight).toHaveValue('Free for families');
    await expect(editor.status).toHaveText('Changes are published when you save');
    await expect(editor.addPhoto).toBeVisible();
    // and not the fields of a business
    await expect(editor.about).toHaveCount(0);
    await expect(editor.category).toHaveCount(0);
    await expect(editor.where).toHaveCount(0);
    await expect(editor.hours).toHaveCount(0);
    await expect(editor.website).toHaveCount(0);
    // and the preview is the platform's card
    await expect(editor.previewHeading).toHaveText('How members see it');
    await expect(editor.preview).toContainText('Lanternread');
    await expect(editor.previewTag).toHaveText('Software');
  });

  test('L2-256 AC2: valid changes are saved and live at once', async ({ page, jb }) => {
    // Given the founder in the editor
    const editor = new EditListingPage(page);
    const fake = await stubMyBusiness(page, { listing: LANTERNREAD });
    await jb.goto(EDITOR);

    // When they change the address and the pricing and save
    await editor.platform.website.fill('https://app.lanternread.example');
    await editor.platform.pricing.fill('Free');
    await editor.save.click();

    // Then the platform is sent in the editor's save and the change is live
    await expect(editor.success).toContainText('Your changes are live now.');
    expect(fake.saves).toHaveLength(1);
    expect(fake.saves[0]).toMatchObject({
      name: 'Lanternread',
      category: 'software-platforms',
      hours: '',
      highlight: 'Free for families',
      platform: {
        website: 'https://app.lanternread.example',
        for: 'Families with children aged 4 to 12, and the teachers who cheer them on.',
        pricing: 'Free',
      },
    });
    await expect(editor.platform.website).toHaveValue('https://app.lanternread.example');
  });

  test('L2-256 AC2: the platform is validated as when it was listed, with the same messages', async ({
    page,
    jb,
  }) => {
    // Given the founder in the editor
    const editor = new EditListingPage(page);
    const fake = await stubMyBusiness(page, { listing: LANTERNREAD });
    await jb.goto(EDITOR);

    // When they empty the words, leave an address that is not https, and save
    await editor.platform.website.fill('http://lanternread.example');
    await editor.platform.does.fill('');
    await editor.platform.forWhom.fill(' ');
    await editor.platform.pricing.fill('');
    await editor.save.click();

    // Then each field says what is wrong and nothing is sent
    await expect(editor.platform.websiteError).toHaveText(
      'Enter a web address starting with https://',
    );
    await expect(editor.platform.doesError).toHaveText(
      'Say what your platform does in a few lines.',
    );
    await expect(editor.platform.forError).toHaveText('Say who your platform is for.');
    await expect(editor.platform.pricingError).toHaveText(
      'Say how it is priced, like “Free” or “$8 a month”.',
    );
    await expect(editor.summary).toContainText('Fix 4 things to continue');
    await expect(editor.summary.getByRole('link')).toHaveCount(4);
    expect(fake.saves).toHaveLength(0);

    // When the address is emptied
    await editor.platform.website.fill('');
    await editor.save.click();

    // Then it is asked for
    await expect(editor.platform.websiteError).toHaveText(
      'Enter the web address where people use your platform.',
    );
    expect(fake.saves).toHaveLength(0);
  });

  test('L2-256 AC2: the codes the API answers are shown on the platform fields', async ({
    page,
    jb,
  }) => {
    // Given an API that refuses the address
    const editor = new EditListingPage(page);
    await stubMyBusiness(page, {
      listing: LANTERNREAD,
      saveErrors: { 'platform.website': 'INVALID', 'platform.does': 'REQUIRED' },
    });
    await jb.goto(EDITOR);

    // When the founder saves a change
    await editor.platform.pricing.fill('Free');
    await editor.save.click();

    // Then the fields carry the messages of the form
    await expect(editor.platform.websiteError).toHaveText(
      'Enter a web address starting with https://',
    );
    await expect(editor.platform.doesError).toHaveText(
      'Say what your platform does in a few lines.',
    );
  });

  test('L2-256 AC1: Discard changes puts the stored platform back', async ({ page, jb }) => {
    // Given the founder with unsaved changes
    const editor = new EditListingPage(page);
    await stubMyBusiness(page, { listing: LANTERNREAD });
    await jb.goto(EDITOR);
    await editor.platform.pricing.fill('Free');
    await editor.platform.website.fill('https://other.example');

    // When they discard them
    await editor.discard.click();

    // Then the stored values are back
    await expect(editor.platform.pricing).toHaveValue(
      'Free for families. Schools pay per classroom.',
    );
    await expect(editor.platform.website).toHaveValue('https://lanternread.example');
  });
});
