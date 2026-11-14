// Acceptance Test
// Traces to: L2-291, L2-292, L2-293
// Description: the page of a non-profit shows its leader and its own words, and its main action is
// a plain link out to its page for giving or its website; it takes no requests and no reviews.

import { expect, test } from '../fixtures/jb-test';
import { NonprofitPage } from '../pages/nonprofit.page';
import { SignInRequiredDialog } from '../pages/sign-in-required.dialog';

const NOTE =
  'Opens in a new tab. Gifts go straight to Hope House Toronto. Jubilee takes no gift or payment and has not checked this non-profit.';

test.describe('non-profit page (L2-291)', () => {
  test('AC1-AC3: it shows the leader, the line, the links out, its mission, who it serves and the details', async ({
    page,
    jb,
  }) => {
    const nonprofit = new NonprofitPage(page);
    await nonprofit.setWidth(1280);
    await jb.open('nonprofit');
    await expect.poll(() => nonprofit.dataPage()).toBe('business');

    await expect(nonprofit.backLink).toHaveText('Back to browse');
    await expect(nonprofit.kicker).toHaveText('Non-profits');
    await expect(nonprofit.kicker.getByRole('link')).toHaveAttribute('href', '/c/non-profits');
    await expect(nonprofit.heading).toHaveText('Hope House Toronto');
    await expect(nonprofit.leader).toHaveText('Led by Grace Adeyemi');
    await expect(nonprofit.line).toHaveText(
      'Meals, beds and friendship for men leaving the shelter system.',
    );
    await expect(nonprofit.mediaTile).toContainText('Non-profit');
    await expect(nonprofit.highlight).toHaveText('Volunteers welcome');

    // AC2: "Give on" first, then "Visit"
    await expect(nonprofit.actions.getByRole('link').first()).toHaveAccessibleName(
      'Give on hopehouse.example (opens in a new tab)',
    );
    await expect(nonprofit.give).toHaveAttribute('href', 'https://hopehouse.example/give');
    await expect(nonprofit.visit).toHaveAttribute('href', 'https://hopehouse.example');
    await expect(nonprofit.linksNote).toHaveText(NOTE);
    await expect(nonprofit.messageLeader).toBeVisible();
    await expect(nonprofit.save).toBeVisible();
    await expect(nonprofit.share).toBeVisible();

    await expect(nonprofit.missionText).toHaveText(
      'Hope House is a home in Moss Park for up to eight men at a time as they leave the shelter system. We cook and eat together every night, help each man find work and a place of his own, and stay his friends after he moves on. We do it because Jesus welcomed us first.',
    );
    await expect(nonprofit.servesText).toHaveText(
      'Men aged 18 and over moving out of Toronto’s shelters.',
    );
    await expect(nonprofit.detailTerms).toHaveText([
      'Works in',
      'Website',
      'Page for giving',
      'On Jubilee since',
    ]);
    await expect(nonprofit.detail('Works in')).toHaveText('Moss Park and Regent Park');
    await expect(nonprofit.websiteLink).toHaveAttribute('href', 'https://hopehouse.example');
    await expect(nonprofit.givingLink).toHaveAttribute('href', 'https://hopehouse.example/give');
    await expect(nonprofit.reportLink).toBeVisible();
  });

  test('AC2: with no page for giving, "Visit {host}" is the main action', async ({ page, jb }) => {
    const nonprofit = new NonprofitPage(page);
    await jb.open('nonprofit.website-only');

    await expect(nonprofit.heading).toHaveText('Bread & Bridges');
    await expect(nonprofit.give).toHaveCount(0);
    await expect(nonprofit.visit).toHaveAccessibleName(
      'Visit breadandbridges.example (opens in a new tab)',
    );
    await expect(nonprofit.visit).toHaveClass(/btn--primary/);
    await expect(nonprofit.linksNote).toHaveText(
      'Opens in a new tab. Gifts go straight to Bread & Bridges. Jubilee takes no gift or payment and has not checked this non-profit.',
    );
    await expect(nonprofit.detailTerms).toHaveText(['Works in', 'Website', 'On Jubilee since']);
  });

  test('AC4: it offers no booking, quote, request, services, products, rating or reviews, and calls nothing verified', async ({
    page,
    jb,
  }) => {
    const nonprofit = new NonprofitPage(page);
    await jb.open('nonprofit');
    await expect(nonprofit.heading).toHaveText('Hope House Toronto');

    await expect(nonprofit.requestActions).toHaveCount(0);
    await expect(nonprofit.servicesSection).toHaveCount(0);
    await expect(nonprofit.productsSection).toHaveCount(0);
    await expect(nonprofit.reviews).toHaveCount(0);
    for (const term of ['Where', 'Hours', 'Languages']) {
      await expect(nonprofit.detail(term)).toHaveCount(0);
    }
    for (const word of ['Verified', 'Approved', 'Vetted', 'Registered']) {
      await expect(nonprofit.main).not.toContainText(word, { ignoreCase: true });
    }
  });

  test('L2-290 AC6: "More in Non-profits" lists the other non-profits, never this one', async ({
    page,
    jb,
  }) => {
    const nonprofit = new NonprofitPage(page);
    await jb.open('nonprofit');

    await expect(nonprofit.moreCards).toHaveCount(2);
    await expect(nonprofit.more).not.toContainText('Hope House Toronto');
    await expect(nonprofit.moreCard(0).categoryLabel).toHaveText('Non-profit');
    await expect(nonprofit.seeAll).toHaveAttribute('href', '/c/non-profits');
  });

  test('AC5: "Message leader" opens the conversation with the non-profit', async ({ page, jb }) => {
    const nonprofit = new NonprofitPage(page);
    await jb.open('nonprofit');
    await expect(nonprofit.messageLeader).toHaveAttribute('href', '/b/hope-house-toronto/message');
  });

  test('AC6: a visitor follows the links out and shares without signing in; messaging asks them to sign in', async ({
    page,
    jb,
  }) => {
    const nonprofit = new NonprofitPage(page);
    const prompt = new SignInRequiredDialog(page);
    await jb.open('nonprofit.signed-out');

    await expect(nonprofit.give).toHaveAttribute('href', 'https://hopehouse.example/give');
    await expect(nonprofit.share).toBeVisible();
    await nonprofit.messageLeader.click();
    await expect(prompt.joinFree).toHaveAttribute(
      'href',
      '/join?returnUrl=%2Fb%2Fhope-house-toronto%2Fmessage',
    );
  });

  test('AC7: the leader sees the banner and "Edit listing"; the links out stay', async ({
    page,
    jb,
  }) => {
    const nonprofit = new NonprofitPage(page);
    await jb.open('nonprofit.owner');

    await expect(nonprofit.ownerBanner).toContainText('This is how members see your listing');
    await expect(nonprofit.editListing).toHaveAttribute('href', '/my-business/edit');
    await expect(nonprofit.give).toBeVisible();
    await expect(nonprofit.visit).toBeVisible();
    await expect(nonprofit.messageLeader).toHaveCount(0);
    await expect(nonprofit.save).toHaveCount(0);
    await expect(nonprofit.reportLink).toHaveCount(0);
  });

  test('AC8: the leader’s preview of a paused non-profit says it is not public', async ({
    page,
    jb,
  }) => {
    const nonprofit = new NonprofitPage(page);
    await jb.open('nonprofit.preview');

    await expect(nonprofit.ownerBanner).toContainText('Preview: members can’t see this page yet');
    await expect(nonprofit.heading).toHaveText('Hope House Toronto');
    await expect(nonprofit.give).toBeVisible();
  });

  test('AC9: while it loads it says so, and a failed load says "We couldn’t load this non-profit" with JB-BIZ-503', async ({
    page,
    jb,
  }) => {
    const nonprofit = new NonprofitPage(page);
    await jb.open('nonprofit.loading');
    await expect(nonprofit.loadingStatus).toHaveText('Loading this non-profit…');
    await expect(nonprofit.skeletons.first()).toBeAttached();

    await jb.open('nonprofit.error');
    await expect(nonprofit.errorState).toContainText('We couldn’t load this non-profit');
    await expect(nonprofit.errorReference).toHaveText('JB-BIZ-503');
    await expect(nonprofit.tryAgain).toBeVisible();
  });
});

test.describe('the links out to a non-profit’s website and page for giving (L2-292)', () => {
  test('AC1: each is a plain link to the leader’s address, opening a new tab, with no opener, referrer or follow, and an icon', async ({
    page,
    jb,
  }) => {
    const nonprofit = new NonprofitPage(page);
    await jb.open('nonprofit');

    for (const link of [
      nonprofit.give,
      nonprofit.visit,
      nonprofit.websiteLink,
      nonprofit.givingLink,
    ]) {
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer nofollow');
      await expect(link).toHaveAccessibleName(/hopehouse\.example \(opens in a new tab\)$/);
      await expect(link.locator('svg')).toHaveCount(1);
    }
  });

  test('AC3, AC4: showing the page asks nothing of the non-profit’s sites', async ({
    page,
    jb,
  }) => {
    const nonprofit = new NonprofitPage(page);
    const foreign = nonprofit.watchForeignRequests();
    await jb.open('nonprofit');
    await expect(nonprofit.give).toBeVisible();
    await expect(nonprofit.moreCards).toHaveCount(2);

    expect(foreign).toEqual([]);
  });

  test('AC5: a page for giving the rules refuse gives no "Give on" and no row', async ({
    page,
    jb,
  }) => {
    const nonprofit = new NonprofitPage(page);
    await jb.open('nonprofit.no-giving');

    await expect(nonprofit.heading).toHaveText('Hope House Toronto');
    await expect(nonprofit.give).toHaveCount(0);
    await expect(nonprofit.visit).toHaveClass(/btn--primary/);
    await expect(nonprofit.detailTerms).toHaveText(['Works in', 'Website', 'On Jubilee since']);
  });

  test('AC6: the links out are reached with the keyboard and are at least 44 px high', async ({
    page,
    jb,
  }) => {
    const nonprofit = new NonprofitPage(page);
    await nonprofit.setWidth(360);
    await jb.open('nonprofit');

    for (const link of [nonprofit.give, nonprofit.visit]) {
      await link.focus();
      await expect(link).toBeFocused();
      const box = await link.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  });
});
