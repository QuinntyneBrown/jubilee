import { expect, test } from '../fixtures/jb-test';
import { stubMyBusiness } from '../fixtures/my-business';
import {
  STATEMENT_LAPSED,
  naomiOwing,
  stubStatementAgreement,
} from '../fixtures/statement-of-faith';
import { MyBusinessPage } from '../pages/my-business.page';
import { StatementAgreementDialog } from '../pages/statement-agreement.dialog';
import { Toasts } from '../pages/toasts';

const OVERVIEW = '/my-business';

test.describe('list a business: agreeing to an updated statement of faith (L2-075, L2-096 AC6)', () => {
  test('AC3: an owner who agreed to an earlier version is asked in a dialog when the app opens', async ({
    page,
    jb,
  }) => {
    const dialog = new StatementAgreementDialog(page);
    await stubMyBusiness(page, {}, naomiOwing());
    await jb.goto(OVERVIEW);

    await expect(dialog.title).toBeVisible();
    await expect(dialog.title).toHaveText('The statement of faith has been updated');
    await expect(dialog.description).toHaveText(
      'We updated Jubilee’s statement of faith on 2 November 2026. Read it and agree by 2 December 2026 to keep your listing on Jubilee.',
    );
    await expect(dialog.read).toHaveAttribute('href', '/statement-of-faith');
    await expect(dialog.read).toHaveAttribute('target', '_blank');
    await expect(dialog.notNow).toBeVisible();
    await expect(dialog.agree).toBeVisible();
  });

  test('AC3: an owner who owes no agreement is not asked', async ({ page, jb }) => {
    const business = new MyBusinessPage(page);
    const dialog = new StatementAgreementDialog(page);
    await stubMyBusiness(page);
    await jb.goto(OVERVIEW);

    await expect(business.heading).toHaveText('Luzandre.com');
    await expect(dialog.root).toHaveCount(0);
    await expect(business.statementBanner).toHaveCount(0);
  });

  test('AC4: "I agree" is busy, records the current version, closes and thanks the owner', async ({
    page,
    jb,
  }) => {
    const business = new MyBusinessPage(page);
    const dialog = new StatementAgreementDialog(page);
    const toasts = new Toasts(page);
    await business.setWidth(1280);
    await stubMyBusiness(page, {}, naomiOwing());
    const fake = await stubStatementAgreement(page, 'pending');
    await jb.goto(OVERVIEW);

    await dialog.agree.click();
    await expect(dialog.agree).toHaveAttribute('aria-busy', 'true');
    await expect(dialog.notNow).toBeDisabled();
    expect(fake.agreements).toEqual([{ version: '2026-11-02' }]);

    await page.unroute('**/api/statement-of-faith/agreement');
    await stubStatementAgreement(page, 'ok');
    await page.reload();
    await dialog.agree.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(toasts.withTitle('Thank you')).toContainText(
      'Your agreement to the statement of faith is recorded.',
    );
    await expect(business.statementBanner).toHaveCount(0);
  });

  test('AC4: an agreement that cannot be recorded keeps the dialog open and says so', async ({
    page,
    jb,
  }) => {
    const dialog = new StatementAgreementDialog(page);
    await stubMyBusiness(page, {}, naomiOwing());
    const fake = await stubStatementAgreement(page, 'fails');
    await jb.goto(OVERVIEW);

    await dialog.agree.click();

    await expect(dialog.alert).toHaveText('We couldn’t record that. Try again.');
    await expect(dialog.title).toBeVisible();
    fake.outcome = 'ok';
    await dialog.agree.click();
    await expect(dialog.root).toHaveCount(0);
  });

  test('AC5: "Not now" and Esc close the dialog; My business keeps "Read and agree" until the owner agrees', async ({
    page,
    jb,
  }) => {
    const business = new MyBusinessPage(page);
    const dialog = new StatementAgreementDialog(page);
    await business.setWidth(1280);
    await stubMyBusiness(page, {}, naomiOwing());
    await jb.goto(OVERVIEW);

    await dialog.notNow.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(business.statementBanner).toContainText(
      'The statement of faith has been updated. Read it and agree by 2 December 2026 to keep Luzandre.com live.',
    );
    await business.section('Listing').click();
    await business.section('Overview').click();
    await expect(business.heading).toHaveText('Luzandre.com');
    await expect(dialog.root).toHaveCount(0);

    await business.readAndAgree.click();
    await expect(dialog.title).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog.root).toHaveCount(0);
    await expect(business.readAndAgree).toBeFocused();

    await page.reload();
    await expect(dialog.title).toBeVisible();
  });

  test('AC6 and L2-096 AC6: after 30 days the listing is paused, "Read and agree" replaces "Resume listing", and agreeing makes it live again', async ({
    page,
    jb,
  }) => {
    const business = new MyBusinessPage(page);
    const dialog = new StatementAgreementDialog(page);
    await business.setWidth(1280);
    const listing = await stubMyBusiness(page, { paused: true }, naomiOwing(STATEMENT_LAPSED));
    await stubStatementAgreement(page, 'ok', () => {
      listing.paused = false;
    });
    await jb.goto(OVERVIEW);

    await expect(dialog.description).toHaveText(
      'Luzandre.com is paused until you agree to the updated statement of faith. We updated it on 2 November 2026.',
    );
    await dialog.notNow.click();
    await expect(business.statementBanner).toContainText(
      'Luzandre.com is paused until you agree to the updated statement of faith.',
    );
    await expect(business.pausedBanner).toHaveCount(0);
    await expect(business.resume).toHaveCount(0);

    await business.readAndAgree.click();
    await dialog.agree.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(business.statementBanner).toHaveCount(0);
    await expect(business.pausedBanner).toHaveCount(0);
    await expect(business.subtitle).toHaveText('Verified · live since June 2026');
  });
});
