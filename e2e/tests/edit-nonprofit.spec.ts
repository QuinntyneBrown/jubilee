// Acceptance Test
// Traces to: L2-294
// Description: the leader of a non-profit edits it from My business: the editor shows the
// non-profit's own fields, validates them as when it was listed, and saves them live at once.

import { expect, test } from '../fixtures/jb-test';
import { HOPE_HOUSE, stubMyBusiness } from '../fixtures/my-business';
import { EditListingPage } from '../pages/edit-listing.page';

// Against a stand-in for the owner's workspace (ADR 0009).

const EDITOR = '/my-business/listing';

test.describe('edit a non-profit (L2-294)', () => {
  test('AC1: the leader edits the non-profit’s own fields, filled with what is stored', async ({
    page,
    jb,
  }) => {
    // Given the leader of Hope House Toronto
    const editor = new EditListingPage(page);
    await editor.setWidth(1280);
    await stubMyBusiness(page, { listing: HOPE_HOUSE });

    // When the editor loads
    await jb.goto(EDITOR);

    // Then it shows the non-profit's fields with their stored values
    await expect(editor.nonprofit.nameLabel).toContainText('Non-profit name');
    await expect(editor.nonprofit.taglineLabel).toContainText('One line on what it does');
    await expect(editor.platformName).toHaveValue('Hope House Toronto');
    await expect(editor.counter.first()).toHaveText('62 / 90');
    await expect(editor.nonprofit.websiteLabel).toContainText('Website');
    await expect(editor.nonprofit.website).toHaveValue('https://hopehouse.example');
    await expect(editor.nonprofit.mission).toHaveValue(/^Hope House is a home in Moss Park/);
    await expect(editor.nonprofit.serves).toHaveValue(
      'Men aged 18 and over moving out of Toronto’s shelters.',
    );
    await expect(editor.nonprofit.area).toHaveValue('Moss Park and Regent Park');
    await expect(editor.nonprofit.areaCount).toHaveText('25 / 120');
    await expect(editor.nonprofit.give).toHaveValue('https://hopehouse.example/give');
    await expect(editor.highlight).toHaveValue('Volunteers welcome');
    await expect(editor.status).toHaveText('Changes are published when you save');
    await expect(editor.addPhoto).toBeVisible();
    // and not the fields of a business (its "Website" is the non-profit's own, above)
    await expect(editor.about).toHaveCount(0);
    await expect(editor.category).toHaveCount(0);
    await expect(editor.hours).toHaveCount(0);
    // and the preview is the non-profit's card
    await expect(editor.previewHeading).toHaveText('How members see it');
    await expect(editor.preview).toContainText('Hope House Toronto');
    await expect(editor.previewTag).toHaveText('Non-profit');
  });

  test('AC2: valid changes are saved and live at once; emptying the page for giving removes it', async ({
    page,
    jb,
  }) => {
    // Given the leader in the editor
    const editor = new EditListingPage(page);
    const fake = await stubMyBusiness(page, { listing: HOPE_HOUSE });
    await jb.goto(EDITOR);

    // When they change where it works, empty the page for giving and save
    await editor.nonprofit.area.fill('Across Toronto');
    await editor.nonprofit.give.fill('');
    await editor.save.click();

    // Then the non-profit is sent in the editor's save and the change is live
    await expect(editor.success).toContainText('Your changes are live now.');
    expect(fake.saves).toHaveLength(1);
    expect(fake.saves[0]).toMatchObject({
      name: 'Hope House Toronto',
      category: 'non-profits',
      hours: '',
      website: '',
      highlight: 'Volunteers welcome',
      nonprofit: {
        website: 'https://hopehouse.example',
        giveUrl: '',
        area: 'Across Toronto',
        serves: 'Men aged 18 and over moving out of Toronto’s shelters.',
      },
    });
    await expect(editor.nonprofit.area).toHaveValue('Across Toronto');
  });

  test('AC2: the non-profit is validated as when it was listed, with the same messages', async ({
    page,
    jb,
  }) => {
    // Given the leader in the editor
    const editor = new EditListingPage(page);
    const fake = await stubMyBusiness(page, { listing: HOPE_HOUSE });
    await jb.goto(EDITOR);

    // When they empty its words, give a page for giving that is not https, and save
    await editor.nonprofit.give.fill('http://hopehouse.example/give');
    await editor.nonprofit.mission.fill('');
    await editor.nonprofit.serves.fill(' ');
    await editor.nonprofit.area.fill('');
    await editor.save.click();

    // Then each field says what is wrong and nothing is sent
    await expect(editor.nonprofit.giveError).toHaveText(
      'Enter a web address starting with https://',
    );
    await expect(editor.nonprofit.missionError).toHaveText(
      'Say what work it does, in its own words.',
    );
    await expect(editor.nonprofit.servesError).toHaveText('Say who it serves.');
    await expect(editor.nonprofit.areaError).toHaveText('Say where in Toronto it works.');
    await expect(editor.summary).toContainText('Fix 4 things to continue');
    await expect(editor.summary.getByRole('link')).toHaveText([
      'Check the page for giving',
      'Say what work it does',
      'Say who it serves',
      'Say where in Toronto it works',
    ]);
    expect(fake.saves).toHaveLength(0);

    // When the website is emptied and the name too
    await editor.nonprofit.website.fill('');
    await editor.platformName.fill('');
    await editor.save.click();

    // Then they are asked for in the words of a non-profit
    await expect(editor.nonprofit.websiteError).toHaveText('Enter the non-profit’s website.');
    await expect(editor.nonprofit.nameError).toHaveText('Enter the name people know it by.');
    expect(fake.saves).toHaveLength(0);
  });

  test('AC2: the codes the API answers are shown on the non-profit fields', async ({
    page,
    jb,
  }) => {
    // Given an API that refuses the page for giving
    const editor = new EditListingPage(page);
    await stubMyBusiness(page, {
      listing: HOPE_HOUSE,
      saveErrors: { 'nonprofit.giveUrl': 'INVALID', 'nonprofit.mission': 'REQUIRED' },
    });
    await jb.goto(EDITOR);

    // When the leader saves a change
    await editor.nonprofit.area.fill('Across Toronto');
    await editor.save.click();

    // Then the fields carry the messages of the form
    await expect(editor.nonprofit.giveError).toHaveText(
      'Enter a web address starting with https://',
    );
    await expect(editor.nonprofit.missionError).toHaveText(
      'Say what work it does, in its own words.',
    );
  });

  test('AC1: Discard changes puts the stored non-profit back', async ({ page, jb }) => {
    // Given the leader with unsaved changes
    const editor = new EditListingPage(page);
    await stubMyBusiness(page, { listing: HOPE_HOUSE });
    await jb.goto(EDITOR);
    await editor.nonprofit.area.fill('Across Toronto');
    await editor.nonprofit.give.fill('https://other.example');

    // When they discard them
    await editor.discard.click();

    // Then the stored values are back
    await expect(editor.nonprofit.area).toHaveValue('Moss Park and Regent Park');
    await expect(editor.nonprofit.give).toHaveValue('https://hopehouse.example/give');
  });
});
