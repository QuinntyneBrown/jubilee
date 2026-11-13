import { expect, test } from '../fixtures/jb-test';
import { SpacePage } from '../pages/space.page';

// The page of a space (L2-205) and its booking card (L2-206 AC1, AC2), against the recorded
// answers of the seeded API (ADR 0009).

test.describe('space page (L2-205)', () => {
  test('AC1: the guest suite shows its head, booking card, the space, its rows, inclusions, rules, host and more spaces', async ({
    page,
    jb,
  }) => {
    const space = new SpacePage(page);
    await space.setWidth(1280);
    await jb.open('space.short-stay');

    await expect(space.backLink).toHaveText('Back to rentals');
    await expect(space.backLink).toHaveAttribute('href', '/c/rooms-rentals');
    await expect(space.kicker).toHaveText('Roncesvalles');
    await expect(space.heading).toHaveText('Guest suite near Roncesvalles');
    await expect(space.line).toHaveText(
      'Private suite for visiting family, conferences or a weekend away',
    );
    await expect(space.placeHeading).toHaveText('Guest suite');
    await expect(space.facts).toHaveText([
      'Queen bed',
      'Private bath',
      'Sleeps 2',
      'Self check-in',
    ]);
    await expect(space.row('Available')).toHaveText('Most weekends');
    await expect(space.row('Minimum stay')).toHaveText('2 nights');
    await expect(space.row('Neighbourhood')).toHaveText('Roncesvalles');
    await expect(space.row('Rent')).toHaveText('$120 per night');
    await expect(space.includedItems).toHaveText(['Wi-Fi', 'Furnished', 'Parking', 'Private bath']);
    await expect(space.ruleItems).toHaveText(['Check-in after 3 pm', 'No parties', 'No smoking']);
    await expect(space.household).toHaveCount(0);
    await expect(space.hostName).toHaveText('Paul & Marta Kowalski');
    await expect(space.hostCard).not.toContainText('Verified');
    await expect(space.hostAbout).toContainText('Ten minutes’ walk to High Park');
    await expect(space.moreCards).toHaveCount(4);
    await expect(space.moreCard(0).title).toHaveText(
      'Furnished room in a family home, Leslieville',
    );
    await expect(space.reportLink).toBeVisible();
  });

  test('L2-206 AC1: the booking card has the rent, the minimum stay, the call to action, message, save and the payment line', async ({
    page,
    jb,
  }) => {
    const space = new SpacePage(page);
    await space.setWidth(1280);
    await jb.open('space.short-stay');

    const card = space.bookingCard;
    await expect(card.price).toContainText('$120 / night');
    await expect(card.minimum).toHaveText('2 nights min.');
    await expect(card.callToAction).toHaveText('Request to book');
    await expect(card.messageHost).toBeVisible();
    await expect(card.save).toHaveAttribute('aria-pressed', 'false');
    await expect(card.note).toHaveText('You won’t pay anything until the host accepts.');
  });

  test('L2-206 AC1: the call to action fits the term', async ({ page, jb }) => {
    const space = new SpacePage(page);
    await space.setWidth(1280);

    await jb.open('space.long-term');
    await expect(space.bookingCard.callToAction).toHaveText('Request a viewing');
    await expect(space.bookingCard.minimum).toHaveText('12-month lease min.');
    await expect(space.row('Available')).toHaveText('From Dec 1');

    await jb.open('space.roommate');
    await expect(space.bookingCard.callToAction).toHaveText('Meet the household');
  });

  test('AC2: a room shows who lives there', async ({ page, jb }) => {
    const space = new SpacePage(page);
    await jb.open('space.room');

    await expect(space.householdText).toHaveText(
      'Ruth and Kwame with our daughter Abena (14) and a very calm cat. We eat together on Sundays and you’re always welcome.',
    );
  });

  test('AC4: under 768 px the bar fixed to the bottom carries the rent and the call to action', async ({
    page,
    jb,
  }) => {
    const space = new SpacePage(page);
    await space.setWidth(360);
    await jb.open('space.room');

    await expect(space.bookingBar).toBeVisible();
    await expect(space.bookingBarPrice).toHaveText('$950 / month');
    await expect(space.bookingBarAction).toHaveText('Request a viewing');
    await expect(space.bookingCard.callToAction).toBeHidden();

    await space.setWidth(1280);
    await expect(space.bookingBar).toBeHidden();
    await expect(space.bookingCard.callToAction).toBeVisible();
  });

  test('AC5: while it loads it says so; a failed load names JB-BIZ-503 and goes back to rentals', async ({
    page,
    jb,
  }) => {
    const space = new SpacePage(page);
    await jb.open('space.loading');
    await expect(space.loadingStatus).toHaveText('Loading this space…');
    await expect(space.backLink).toHaveText('Back to rentals');

    await jb.open('space.error');
    await expect(space.errorState).toContainText('We couldn’t load this space');
    await expect(space.errorReference).toHaveText('JB-BIZ-503');
  });

  test('AC6: the page never shows an exact address', async ({ page, jb }) => {
    const space = new SpacePage(page);
    await jb.open('space.short-stay');

    await expect(space.heading).toBeVisible();
    await expect(space.main).not.toContainText('Galley Ave');
  });
});
