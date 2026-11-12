import {
  BACK_BY,
  UNHANDLED_REFERENCE,
  stubHelp,
  stubMaintenance,
  stubUnhandled,
} from '../fixtures/errors';
import { expect, test } from '../fixtures/jb-test';
import { stubMyBusiness } from '../fixtures/my-business';
import { Toasts } from '../pages/toasts';
import { BrowsePage } from '../pages/browse.page';
import { BusinessPage } from '../pages/business.page';
import { ForbiddenPage } from '../pages/forbidden.page';
import { MaintenancePage } from '../pages/maintenance.page';
import { ReportListingDialog } from '../pages/report-listing.dialog';
import { ServerErrorPage } from '../pages/server-error.page';

const HOME = '**/api/directory/home';

test.describe('server error (L2-115, L2-118)', () => {
  test('L2-115 AC1: a page that fails with an unhandled error shows the page with its reference and a way forward', async ({
    page,
    jb,
  }) => {
    const error = new ServerErrorPage(page);
    await stubUnhandled(page, HOME);
    await jb.goto('/');

    await expect(page).toHaveURL(/\/error\?/);
    await expect(error.heading).toHaveText('Something went wrong on our side');
    await expect(error.text).toHaveText(
      'Your messages and requests are safe. Try again in a minute; if it keeps happening, tell us and quote the reference below.',
    );
    await expect(error.reference).toHaveText(UNHANDLED_REFERENCE);
    await expect(error.tryAgain).toBeVisible();
    await expect(error.getHelp).toHaveAttribute('href', '/help');
  });

  test('L2-115 AC2: the page shows nothing from the server but the reference', async ({
    page,
    jb,
  }) => {
    const error = new ServerErrorPage(page);
    await stubUnhandled(page, HOME);
    await jb.goto('/');
    await expect(error.heading).toBeVisible();

    const shown = await error.content();
    expect(shown).not.toMatch(/Exception|stack|SELECT |\.cs\b|localhost|C:\\|at \w+\./i);
  });

  test('Try again returns to the page the member left and it loads once the fault is gone', async ({
    page,
    jb,
  }) => {
    const error = new ServerErrorPage(page);
    const browse = new BrowsePage(page);
    const fake = await stubUnhandled(page, HOME);
    await jb.goto('/');
    await error.tryAgain.click();

    await expect(page).not.toHaveURL(/\/error/);
    await expect(browse.heading).toBeVisible();
    expect(fake.requests).toBe(2);
  });

  test('an address that is not a reference is not shown', async ({ page, jb }) => {
    const error = new ServerErrorPage(page);
    await jb.goto('/error?ref=<script>alert(1)</script>&from=//evil.example');

    await expect(error.heading).toBeVisible();
    await expect(error.reference).toHaveCount(0);
    await error.tryAgain.click();
    await expect(page).not.toHaveURL(/evil/);
  });

  test('a save that fails with an unhandled error leaves the member where they are with what they typed', async ({
    page,
    jb,
  }) => {
    const business = new BusinessPage(page);
    const report = new ReportListingDialog(page);
    await business.setWidth(1280);
    await jb.signInAs('member');
    await page.route('**/api/listings/*/reports', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/problem+json',
        body: JSON.stringify({
          status: 500,
          code: 'unexpected_error',
          reference: UNHANDLED_REFERENCE,
        }),
      }),
    );
    await jb.goto('/b/luzandre');
    await business.reportLink.click();
    await report.reason(/Something else/).click();
    await report.description.fill('Please look at this.');
    await report.send.click();

    await expect(report.alert).toBeVisible();
    await expect(report.description).toHaveValue('Please look at this.');
    await expect(page).toHaveURL(/\/b\/luzandre\/report$/);
  });
});

test.describe('maintenance (L2-117)', () => {
  test('AC1: while Jubilee is being updated the page says when it is back and that nothing is lost', async ({
    page,
    jb,
  }) => {
    const maintenance = new MaintenancePage(page);
    await stubMaintenance(page, HOME);
    await jb.goto('/');

    await expect(page).toHaveURL(/\/maintenance\?/);
    await expect(maintenance.heading).toHaveText('Jubilee is being updated');
    await expect(maintenance.text).toContainText(
      'We’re back by 6:00 a.m. Eastern on Wednesday 11 November. Nothing you’ve sent is lost.',
    );
    await expect(maintenance.checkAgain).toBeVisible();
    expect(BACK_BY).toContain('2026-11-11');
  });

  test('Check again returns to the page the member left once maintenance is over', async ({
    page,
    jb,
  }) => {
    const maintenance = new MaintenancePage(page);
    const browse = new BrowsePage(page);
    const fake = await stubMaintenance(page, HOME);
    await jb.goto('/');
    await maintenance.checkAgain.click();

    await expect(page).not.toHaveURL(/\/maintenance/);
    await expect(browse.heading).toBeVisible();
    expect(fake.requests).toBe(2);
  });

  test('Check again while it is still being updated shows the page again', async ({ page, jb }) => {
    const maintenance = new MaintenancePage(page);
    await stubMaintenance(page, HOME, 2);
    await jb.goto('/');
    await maintenance.checkAgain.click();

    await expect(page).toHaveURL(/\/maintenance\?/);
    await expect(maintenance.heading).toHaveText('Jubilee is being updated');
  });

  test('without a back-by time the page says it will be back shortly', async ({ page, jb }) => {
    const maintenance = new MaintenancePage(page);
    await jb.goto('/maintenance');

    await expect(maintenance.text).toContainText('We’ll be back shortly.');
  });

  test('a save held by maintenance keeps the dialog and what was typed', async ({ page, jb }) => {
    const business = new BusinessPage(page);
    const report = new ReportListingDialog(page);
    await business.setWidth(1280);
    await jb.signInAs('member');
    await page.route('**/api/listings/*/reports', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/problem+json',
        body: JSON.stringify({ status: 503, code: 'MAINTENANCE', backBy: BACK_BY }),
      }),
    );
    await jb.goto('/b/luzandre');
    await business.reportLink.click();
    await report.reason(/misleading/).click();
    await report.description.fill('The hours are wrong.');
    await report.send.click();

    await expect(report.alert).toBeVisible();
    await expect(report.description).toHaveValue('The hours are wrong.');
    await expect(page).not.toHaveURL(/maintenance/);
  });
});

test.describe('forbidden: ask for access (L2-114)', () => {
  test('AC2: Ask for access sends the page the member could not open and says it was sent', async ({
    page,
    jb,
  }) => {
    const forbidden = new ForbiddenPage(page);
    const toasts = new Toasts(page);
    await forbidden.setWidth(1280);
    await stubMyBusiness(page, { overview: 'forbidden' });
    const help = await stubHelp(page);
    await jb.goto('/my-business');
    await forbidden.askForAccess.click();

    await expect(toasts.withTitle('We’ve passed your request to the team.')).toBeVisible();
    await expect(forbidden.askForAccess).toHaveText('Requested ✓');
    await expect(forbidden.askForAccess).toBeDisabled();
    expect(help.bodies).toEqual([{ url: '/my-business' }]);
    expect(help.keys[0]).toBeTruthy();
  });

  test('a request that fails says so and Try again sends it with the same key', async ({
    page,
    jb,
  }) => {
    const forbidden = new ForbiddenPage(page);
    const toasts = new Toasts(page);
    await forbidden.setWidth(1280);
    await stubMyBusiness(page, { overview: 'forbidden' });
    const help = await stubHelp(page, { failures: 1 });
    await jb.goto('/my-business');
    await forbidden.askForAccess.click();

    const failed = toasts.withTitle('We couldn’t send your request.');
    await expect(failed).toBeVisible();
    await expect(forbidden.askForAccess).toHaveText('Ask for access');
    await toasts.action(failed, 'Try again').click();

    await expect(forbidden.askForAccess).toHaveText('Requested ✓');
    expect(help.keys).toHaveLength(2);
    expect(help.keys[0]).toBe(help.keys[1]);
  });
});
