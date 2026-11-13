import { expect, test } from '../fixtures/jb-test';
import { BusinessPage } from '../pages/business.page';

// The owner's view of their own listing (L2-037) and listing views.

test.describe('owner viewing their own listing (L2-037)', () => {
  test('AC1: a banner tells the owner this is how members see the listing', async ({
    page,
    jb,
  }) => {
    const business = new BusinessPage(page);
    await jb.open('business.owner');

    await expect(business.ownerBanner).toHaveRole('status');
    await expect(business.ownerBanner.locator('.alert__title')).toHaveText(
      'This is how members see your listing',
    );
    await expect(business.ownerBanner).toContainText(
      'It’s live. Changes you make are published straight away.',
    );
    await expect(business.goToMyBusiness).toHaveAttribute('href', '/my-business');
  });

  test('AC2: "Edit listing" replaces "Book a meeting" and "Message"; save and report are hidden', async ({
    page,
    jb,
  }) => {
    const business = new BusinessPage(page);
    await jb.open('business.owner');

    await expect(business.primaryAction).toHaveText('Edit listing');
    await expect(business.primaryAction).toHaveAttribute('href', '/my-business/edit');
    await expect(business.messageLink).toHaveCount(0);
    await expect(business.saveButton).toHaveCount(0);
    await expect(business.reportLink).toHaveCount(0);
    await expect(business.shareLink).toHaveAccessibleName('Share listing');
    await expect(business.shareLink).toHaveAttribute('href', '/b/legacy-financial/share');
    // The services are shown as members see them
    await expect(business.serviceRow(0).action).toHaveAccessibleName('Book Discovery meeting');
  });

  test('a member sees no owner banner and "Report this listing"', async ({ page, jb }) => {
    const business = new BusinessPage(page);
    await jb.open('business');

    await expect(business.ownerBanner).toHaveCount(0);
    await expect(business.reportLink).toBeVisible();
  });
});

test.describe('listing views (L2-037 AC3)', () => {
  test('a shown listing page records one view', async ({ page, jb }) => {
    const views: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().endsWith('/views'))
        views.push(request.url());
    });
    const business = new BusinessPage(page);
    await jb.open('business');
    await expect(business.heading).toHaveText('Legacy Financial');

    await expect
      .poll(() => views)
      .toEqual([expect.stringMatching(/\/api\/listings\/legacy-financial\/views$/)]);
  });

  test('a listing page that fails to load records no view', async ({ page, jb }) => {
    const views: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().endsWith('/views'))
        views.push(request.url());
    });
    const business = new BusinessPage(page);
    await jb.open('business.error');
    await expect(business.errorReference).toHaveText('JB-BIZ-503');

    expect(views).toEqual([]);
  });
});
