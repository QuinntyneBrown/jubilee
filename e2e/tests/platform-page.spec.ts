// Acceptance Test
// Traces to: L2-254, L2-255, L2-253
// Description: the page of a software platform shows the founder's words and one main action, a
// plain link out to the platform's own website; it offers no booking, quote or request.

import { expect, test } from '../fixtures/jb-test';
import { PlatformPage } from '../pages/platform.page';
import { SignInRequiredDialog } from '../pages/sign-in-required.dialog';

test.describe('platform page (L2-254)', () => {
  test('AC1, AC2: it shows the founder, the line, the link out, what it does, who it is for and the details', async ({
    page,
    jb,
  }) => {
    const platform = new PlatformPage(page);
    await platform.setWidth(1280);
    await jb.open('platform');
    await expect.poll(() => platform.dataPage()).toBe('business');

    await expect(platform.backLink).toHaveText('Back to browse');
    await expect(platform.kicker).toHaveText('Software platforms');
    await expect(platform.kicker.getByRole('link')).toHaveAttribute(
      'href',
      '/c/software-platforms',
    );
    await expect(platform.heading).toHaveText('Lanternread');
    await expect(platform.founder).toHaveText('Founded by Abigail Thornton');
    await expect(platform.line).toHaveText('A reading log families keep together');
    await expect(platform.mediaTile).toContainText('Software');
    await expect(platform.highlight).toHaveText('Free for families');

    await expect(platform.visit).toContainText('Visit lanternread.example');
    await expect(platform.visitNote).toHaveText(
      'Opens lanternread.example in a new tab. You sign up and pay there. Jubilee takes no payment and has not checked this platform.',
    );
    await expect(platform.messageFounder).toBeVisible();
    await expect(platform.save).toBeVisible();
    await expect(platform.share).toBeVisible();

    await expect(platform.doesText).toHaveText(
      'Families log the books their children read, set a weekly reading goal together and see the streak grow. Grandparents and teachers can cheer from their own accounts.',
    );
    await expect(platform.forWhomText).toHaveText(
      'Families with children aged 4 to 12, and the teachers who cheer them on.',
    );
    await expect(platform.detailTerms).toHaveText(['Pricing', 'Website', 'On Jubilee since']);
    await expect(platform.detail('Pricing')).toHaveText(
      'Free for families. Schools pay per classroom.',
    );
    await expect(platform.detail('Website')).toContainText('lanternread.example');
    await expect(platform.reportLink).toBeVisible();
  });

  test('AC3: it offers no booking, quote, request, services or products, and calls nothing verified', async ({
    page,
    jb,
  }) => {
    const platform = new PlatformPage(page);
    await jb.open('platform');
    await expect(platform.heading).toHaveText('Lanternread');

    await expect(platform.requestActions).toHaveCount(0);
    await expect(platform.servicesSection).toHaveCount(0);
    await expect(platform.productsSection).toHaveCount(0);
    for (const term of ['Where', 'Hours', 'Languages']) {
      await expect(platform.detail(term)).toHaveCount(0);
    }
    for (const word of ['Verified', 'Approved', 'Vetted']) {
      await expect(platform.main).not.toContainText(word, { ignoreCase: true });
    }
  });

  test('L2-253 AC5: "More in Software platforms" lists the other platforms, never this one', async ({
    page,
    jb,
  }) => {
    const platform = new PlatformPage(page);
    await jb.open('platform');

    await expect(platform.moreCards).toHaveCount(2);
    await expect(platform.more).not.toContainText('Lanternread');
    await expect(platform.moreCard(0).categoryLabel).toHaveText('Software');
    await expect(platform.seeAll).toHaveAttribute('href', '/c/software-platforms');
  });

  test('AC4: "Message founder" opens the conversation with the platform', async ({ page, jb }) => {
    const platform = new PlatformPage(page);
    await jb.open('platform');
    await expect(platform.messageFounder).toHaveAttribute('href', '/b/lanternread/message');
  });

  test('AC5: a visitor follows the link out and shares without signing in; messaging asks them to sign in', async ({
    page,
    jb,
  }) => {
    const platform = new PlatformPage(page);
    const prompt = new SignInRequiredDialog(page);
    await jb.open('platform.signed-out');

    await expect(platform.visit).toHaveAttribute('href', 'https://lanternread.example');
    await expect(platform.share).toBeVisible();
    await platform.messageFounder.click();
    await expect(prompt.joinFree).toHaveAttribute(
      'href',
      '/join?returnUrl=%2Fb%2Flanternread%2Fmessage',
    );
  });

  test('AC6: the founder sees the banner and "Edit listing"; the link out stays', async ({
    page,
    jb,
  }) => {
    const platform = new PlatformPage(page);
    await jb.open('platform.owner');

    await expect(platform.ownerBanner).toContainText('This is how members see your listing');
    await expect(platform.editListing).toHaveAttribute('href', '/my-business/edit');
    await expect(platform.visit).toContainText('Visit lanternread.example');
    await expect(platform.messageFounder).toHaveCount(0);
    await expect(platform.save).toHaveCount(0);
    await expect(platform.reportLink).toHaveCount(0);
  });

  test('AC7: the founder’s preview of a paused platform says it is not public', async ({
    page,
    jb,
  }) => {
    const platform = new PlatformPage(page);
    await jb.open('platform.preview');

    await expect(platform.ownerBanner).toContainText('Preview: members can’t see this page yet');
    await expect(platform.heading).toHaveText('Lanternread');
    await expect(platform.visit).toContainText('Visit lanternread.example');
    await expect(platform.reviews).toHaveCount(0);
  });

  test('AC8: a failed load says "We couldn’t load this platform" with JB-BIZ-503 and Try again', async ({
    page,
    jb,
  }) => {
    const platform = new PlatformPage(page);
    await jb.open('platform.error');

    await expect(platform.errorState).toContainText('We couldn’t load this platform');
    await expect(platform.errorReference).toHaveText('JB-BIZ-503');
    await expect(platform.tryAgain).toBeVisible();
  });
});

test.describe('the link out to a platform’s website (L2-255)', () => {
  test('AC1: it is a plain link to the founder’s address, opening a new tab, with no opener, referrer or follow', async ({
    page,
    jb,
  }) => {
    const platform = new PlatformPage(page);
    await jb.open('platform');

    for (const link of [platform.visit, platform.websiteLink]) {
      await expect(link).toHaveAttribute('href', 'https://lanternread.example');
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer nofollow');
      await expect(link).toHaveAccessibleName(/lanternread\.example \(opens in a new tab\)$/);
    }
    await expect(platform.visit).toHaveAccessibleName(
      'Visit lanternread.example (opens in a new tab)',
    );
    await expect(platform.visit.locator('svg')).toHaveCount(1);
  });

  test('AC3, AC4: showing the page asks nothing of the platform’s website', async ({
    page,
    jb,
  }) => {
    const platform = new PlatformPage(page);
    const foreign = platform.watchForeignRequests();
    await jb.open('platform');
    await expect(platform.visit).toBeVisible();
    await expect(platform.moreCards).toHaveCount(2);

    expect(foreign).toEqual([]);
  });

  test('AC5: an address the rules refuse gives no link out and no "Website" row', async ({
    page,
    jb,
  }) => {
    const platform = new PlatformPage(page);
    await jb.open('platform.no-website');

    await expect(platform.heading).toHaveText('Lanternread');
    await expect(platform.visit).toHaveCount(0);
    await expect(platform.visitNote).toHaveCount(0);
    await expect(platform.detailTerms).toHaveText(['Pricing', 'On Jubilee since']);
    await expect(platform.messageFounder).toBeVisible();
  });

  test('AC6: the link out is reached with the keyboard and is at least 44 px high', async ({
    page,
    jb,
  }) => {
    const platform = new PlatformPage(page);
    await platform.setWidth(360);
    await jb.open('platform');

    await platform.visit.focus();
    await expect(platform.visit).toBeFocused();
    const box = await platform.visit.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  });
});
