import { expect, test } from '../fixtures/jb-test';
import { stubReports } from '../fixtures/reports';
import { BusinessPage } from '../pages/business.page';
import { ReportListingDialog } from '../pages/report-listing.dialog';
import { ShareListingDialog } from '../pages/share-listing.dialog';
import { SignInRequiredDialog } from '../pages/sign-in-required.dialog';

test.describe('share a listing (L2-038)', () => {
  test('AC1: the dialog shows the canonical link, even to a visitor', async ({ page, jb }) => {
    const business = new BusinessPage(page);
    const share = new ShareListingDialog(page);
    await business.setWidth(1280);
    await jb.goto('/b/luzandre');
    await business.shareLink.first().click();

    await expect(share.title).toBeVisible();
    await expect(share.link).toHaveValue(/\/b\/luzandre$/);
    await expect(page).toHaveURL(/\/b\/luzandre\/share$/);
    await expect(share.email).toHaveAttribute('href', /^mailto:\?subject=.*&body=.*luzandre/);
    await expect(share.whatsapp).toHaveAttribute('href', /^https:\/\/wa\.me\/\?text=.*luzandre/);
  });

  test('AC2: Copy puts the link on the clipboard and says Copied', async ({
    page,
    jb,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const business = new BusinessPage(page);
    const share = new ShareListingDialog(page);
    await business.setWidth(1280);
    await jb.goto('/b/luzandre');
    await business.shareLink.first().click();
    await share.copy.click();

    await expect(share.copy).toHaveText('Copied ✓');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/b\/luzandre$/);
    await expect(share.copy).toHaveText('Copy', { timeout: 5000 });
  });

  test('closing the dialog returns to the listing', async ({ page, jb }) => {
    const business = new BusinessPage(page);
    const share = new ShareListingDialog(page);
    await business.setWidth(1280);
    await jb.goto('/b/luzandre');
    await business.shareLink.first().click();
    await share.done.click();

    await expect(share.title).toBeHidden();
    await expect(page).toHaveURL(/\/b\/luzandre$/);
  });
});

test.describe('report a listing (L2-039)', () => {
  test('AC1/AC2: a member sends a reason and a description; the report is private', async ({
    page,
    jb,
  }) => {
    const business = new BusinessPage(page);
    const report = new ReportListingDialog(page);
    await business.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubReports(page);
    await jb.goto('/b/luzandre');
    await business.reportLink.click();

    await expect(report.title).toBeVisible();
    await report.reason(/misleading/).click();
    await report.description.fill('The hours are wrong.');
    await expect(report.counter).toHaveText('1980 characters left');
    await report.send.click();

    await expect(report.title).toHaveText('Thanks for telling us');
    await expect(report.thanks).toContainText('private');
    expect(fake.bodies).toEqual([{ reason: 'misleading', description: 'The hours are wrong.' }]);
    expect(fake.keys).toHaveLength(1);
    expect(fake.keys[0]).toBeTruthy();
  });

  test('AC3: an empty form names each missing field and focuses the first', async ({
    page,
    jb,
  }) => {
    const business = new BusinessPage(page);
    const report = new ReportListingDialog(page);
    await business.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubReports(page);
    await jb.goto('/b/luzandre');
    await business.reportLink.click();
    await report.send.click();

    await expect(report.reasonError).toBeVisible();
    await expect(report.descriptionError).toBeVisible();
    await expect(report.reason(/real business/)).toBeFocused();
    expect(fake.bodies).toHaveLength(0);
  });

  test('AC4: a failed send keeps what was typed and the retry reuses the key', async ({
    page,
    jb,
  }) => {
    const business = new BusinessPage(page);
    const report = new ReportListingDialog(page);
    await business.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubReports(page, { failures: 1 });
    await jb.goto('/b/luzandre');
    await business.reportLink.click();
    await report.reason(/bad experience/).click();
    await report.description.fill('Never delivered.');
    await report.send.click();

    await expect(report.alert).toContainText('send that');
    await expect(report.description).toHaveValue('Never delivered.');
    await report.send.click();

    await expect(report.title).toHaveText('Thanks for telling us');
    expect(fake.keys).toHaveLength(2);
    expect(fake.keys[0]).toBe(fake.keys[1]);
  });

  test('AC5: too many reports in an hour asks the member to wait', async ({ page, jb }) => {
    const business = new BusinessPage(page);
    const report = new ReportListingDialog(page);
    await business.setWidth(1280);
    await jb.signInAs('member');
    await stubReports(page, { mode: 'limited' });
    await jb.goto('/b/luzandre');
    await business.reportLink.click();
    await report.reason(/Something else/).click();
    await report.description.fill('Other.');
    await report.send.click();

    await expect(report.alert).toContainText('Slow down');
    await expect(report.description).toHaveValue('Other.');
  });

  test('AC6: a visitor is asked to sign in and returns to the report', async ({ page, jb }) => {
    const business = new BusinessPage(page);
    const prompt = new SignInRequiredDialog(page);
    await business.setWidth(1280);
    await jb.goto('/b/luzandre');
    await business.reportLink.click();

    await expect(prompt.title).toBeVisible();
    await expect(prompt.title).toContainText('report');
    await expect(prompt.signIn).toHaveAttribute('href', /returnUrl=.*luzandre.*report/);
  });
});
