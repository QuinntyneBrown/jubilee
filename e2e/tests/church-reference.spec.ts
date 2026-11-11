import { expect, test } from '../fixtures/jb-test';
import { stubReference } from '../fixtures/reference';
import { ChurchReferencePage } from '../pages/church-reference.page';

const TOKEN = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';

test.describe('answer a church reference (L2-081, L2-082)', () => {
  test('AC1: a valid link asks the pastor how well they know the owner, with no account', async ({
    page,
    jb,
  }) => {
    const reference = new ChurchReferencePage(page);
    await reference.setWidth(1280);
    const fake = await stubReference(page);
    await jb.goto(`/reference/${TOKEN}`);

    await expect(reference.heading).toHaveText('Can you confirm Naomi Laurent?');
    await expect(reference.intro).toHaveText(
      'Naomi is listing Luzandre.com on Jubilee, Toronto’s Christian marketplace, and named you at Grace Toronto Church as Naomi’s church reference. Your answer is private: Naomi and the public never see it.',
    );
    await expect(reference.question).toContainText('How well do you know Naomi?');
    await expect(reference.question).toContainText('(required)');
    await expect(reference.answers).toHaveCount(3);
    await expect(reference.answer(/I know Naomi and can vouch for Naomi/)).toBeVisible();
    await expect(reference.answer(/can’t vouch for Naomi’s business/)).toBeVisible();
    await expect(reference.answer(/I don’t know this person/)).toBeVisible();
    await expect(reference.name).toBeVisible();
    await expect(reference.role).toHaveAttribute('placeholder', 'Pastor, elder, deacon…');
    await expect(reference.noteHelp).toHaveText('Only the Jubilee verification team reads this.');
    expect(fake.opens).toHaveLength(1);
  });

  test('L2-140: the token is sent in the body, taken out of the address bar and not leaked by the referrer', async ({
    page,
    jb,
  }) => {
    const reference = new ChurchReferencePage(page);
    await reference.setWidth(1280);
    const fake = await stubReference(page);
    await jb.goto(`/reference/${TOKEN}`);
    await expect(reference.heading).toHaveText('Can you confirm Naomi Laurent?');

    expect(fake.opens[0].token).toBe(TOKEN);
    expect(fake.opens[0].url).not.toContain(TOKEN);
    expect(page.url()).not.toContain(TOKEN);
    expect(new URL(page.url()).pathname).toBe('/reference');
    await expect(reference.referrerPolicy).toHaveAttribute('content', 'no-referrer');
  });

  test('AC3: sending with no answer and no role names both and focuses the summary', async ({
    page,
    jb,
  }) => {
    const reference = new ChurchReferencePage(page);
    await reference.setWidth(1280);
    const fake = await stubReference(page);
    await jb.goto(`/reference/${TOKEN}`);
    await reference.name.fill('Daniel Okoro');

    await reference.send.click();

    await expect(reference.summary).toBeFocused();
    await expect(reference.summary).toContainText('Fix 2 things to continue');
    await expect(reference.summaryLinks).toHaveText([
      'Choose how well you know Naomi',
      'Enter your role at the church',
    ]);
    await expect(reference.fieldError).toHaveText([
      'Choose one answer so we know how to treat this reference.',
      'Enter your role at the church, like pastor or elder.',
    ]);
    await expect(reference.name).toHaveValue('Daniel Okoro');
    expect(fake.answers).toHaveLength(0);

    await reference.summaryLinks.nth(1).click();
    await expect(reference.role).toBeFocused();
  });

  test('a note over 1,000 characters is refused before it is sent', async ({ page, jb }) => {
    const reference = new ChurchReferencePage(page);
    await reference.setWidth(1280);
    const fake = await stubReference(page);
    await jb.goto(`/reference/${TOKEN}`);
    await reference.answer(/can vouch/).check();
    await reference.name.fill('Daniel Okoro');
    await reference.role.fill('Lead pastor');
    await reference.note.fill('n'.repeat(1001));

    await reference.send.click();

    await expect(reference.fieldError).toHaveText(['Shorten this to 1000 characters.']);
    expect(fake.answers).toHaveLength(0);
  });

  test('AC4: a valid answer is sent and the page thanks the pastor', async ({ page, jb }) => {
    const reference = new ChurchReferencePage(page);
    await reference.setWidth(1280);
    const fake = await stubReference(page);
    await jb.goto(`/reference/${TOKEN}`);
    await reference.answer(/I know Naomi and can vouch for Naomi/).check();
    await reference.name.fill('Daniel Okoro');
    await reference.role.fill('Lead pastor');
    await reference.note.fill('Naomi has served on our hospitality team for six years.');

    await reference.send.click();

    await expect(reference.heading).toHaveText('Thank you, Daniel Okoro');
    await expect(reference.text).toHaveText(
      'Your answer went privately to the Jubilee verification team. Naomi will hear from us within two business days. You won’t be contacted again about this listing.',
    );
    expect(fake.answers).toEqual([
      {
        token: TOKEN,
        answer: 'vouches',
        name: 'Daniel Okoro',
        role: 'Lead pastor',
        note: 'Naomi has served on our hospitality team for six years.',
      },
    ]);
  });

  test('while the answer is being sent the button is busy and the fields are locked', async ({
    page,
    jb,
  }) => {
    const reference = new ChurchReferencePage(page);
    await reference.setWidth(1280);
    const fake = await stubReference(page);
    await jb.goto(`/reference/${TOKEN}`);
    await reference.answer(/can vouch/).check();
    await reference.name.fill('Daniel Okoro');
    await reference.role.fill('Lead pastor');
    fake.outcome = 'hang';

    await reference.send.click();

    await expect(reference.send).toHaveAttribute('aria-busy', 'true');
    await expect(reference.name).toHaveAttribute('readonly', '');
    await expect(reference.answer(/can vouch/)).toBeDisabled();
  });

  test('the server refusing an answer is shown on its field and the typed values stay', async ({
    page,
    jb,
  }) => {
    const reference = new ChurchReferencePage(page);
    await reference.setWidth(1280);
    await stubReference(page, { answerErrors: { role: 'ROLE_REQUIRED' } });
    await jb.goto(`/reference/${TOKEN}`);
    await reference.answer(/can vouch/).check();
    await reference.name.fill('Daniel Okoro');
    await reference.role.fill('x');

    await reference.send.click();

    await expect(reference.fieldError).toHaveText([
      'Enter your role at the church, like pastor or elder.',
    ]);
    await expect(reference.name).toHaveValue('Daniel Okoro');
    await expect(reference.summary).toBeFocused();
  });

  test('AC5: "tell us" reports the request and closes it', async ({ page, jb }) => {
    const reference = new ChurchReferencePage(page);
    await reference.setWidth(1280);
    const fake = await stubReference(page);
    await jb.goto(`/reference/${TOKEN}`);

    await reference.tellUs.click();

    await expect(reference.heading).toHaveText('Thank you. We’ve closed this request');
    expect(fake.reports).toEqual([{ token: TOKEN }]);
  });

  test('L2-082 AC1: a closed link says so, in the owner’s name', async ({ page, jb }) => {
    const reference = new ChurchReferencePage(page);
    await reference.setWidth(1280);
    await stubReference(page, { outcome: 'closed' });
    await jb.goto(`/reference/${TOKEN}`);

    await expect(reference.heading).toHaveText('This request is closed');
    await expect(reference.text).toHaveText(
      'Reference links work once, for 14 days. If Naomi still needs a reference, Naomi can send you a new request from the listing.',
    );
    await expect(reference.aboutJubilee).toBeVisible();
  });

  test('L2-082 AC2: an unknown link shows the same page and nothing about a listing', async ({
    page,
    jb,
  }) => {
    const reference = new ChurchReferencePage(page);
    await reference.setWidth(1280);
    await stubReference(page, { outcome: 'unknown' });
    await jb.goto('/reference/0000');

    await expect(reference.heading).toHaveText('This request is closed');
    await expect(reference.main).not.toContainText('Naomi');
    await expect(reference.main).not.toContainText('Luzandre');
  });

  test('L2-082 AC3: a form that cannot load says so, quotes JB-REF-502 and can be tried again', async ({
    page,
    jb,
  }) => {
    const reference = new ChurchReferencePage(page);
    await reference.setWidth(1280);
    const fake = await stubReference(page, { outcome: 'load-fails' });
    await jb.goto(`/reference/${TOKEN}`);

    await expect(reference.alert).toContainText('We couldn’t load the reference request');
    await expect(reference.reference).toHaveText('JB-REF-502');

    fake.outcome = 'open';
    await reference.tryAgain.click();
    await expect(reference.heading).toHaveText('Can you confirm Naomi Laurent?');
    expect(fake.opens.at(-1)?.token).toBe(TOKEN);
  });

  test('a phone shows the whole form without sideways scrolling', async ({ page, jb }) => {
    const reference = new ChurchReferencePage(page);
    await reference.setWidth(360);
    await stubReference(page);
    await jb.goto(`/reference/${TOKEN}`);

    await expect(reference.send).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });
});
