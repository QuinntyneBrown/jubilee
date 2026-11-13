import { LISTING_ID, stubAdmin } from '../../../e2e/fixtures/admin';
import { test } from '../../../e2e/fixtures/demo';
import { AdminListingPage } from '../../../e2e/pages/admin-listing.page';
import { AdminListingsPage } from '../../../e2e/pages/admin-listings.page';
import { TakeDownListingDialog } from '../../../e2e/pages/take-down-listing.dialog';

// Video 21: journey 12, keep listings honest (ADR 0057, ADR 0059). The Jubilee team's Listings in
// the admin application, a search by name, one listing with its owner, its flag and how members see
// it, and "Take down listing" refused without a reason, then sent with one. The app is answered by the
// stand-ins of the behaviour specs (ADR 0009); two cards say what the run did behind the screen. Built
// by `node tools/video-demo/build.mjs` (docs/videos/README.md).

const REASON =
  'The web address in the listing’s name leads to a different company’s store, so members could not tell who they were buying from.';

test('journey 12: keep listings honest', async ({ demo }) => {
  const listings = new AdminListingsPage(demo.page);
  const listing = new AdminListingPage(demo.page);
  const dialog = new TakeDownListingDialog(demo.page);

  await stubAdmin(demo.page);
  await demo.jb.gotoAdmin('/listings');
  await listings.heading.waitFor();
  await demo.card('Journey 12 · Keep listings honest', [
    'The Jubilee team looks through published listings and takes down one that misrepresents a business.',
    'This run: from 93% to 100%.',
  ]);
  await demo.scene('intro');

  await demo.hideCard();
  await demo.scene('listings', async () => {
    await demo.point(listings.subtitle);
    await demo.pause(1500);
    await demo.point(listings.row('Luzandre.com'));
  });

  await demo.scene('search', async () => {
    await demo.type(listings.search, 'okafor');
    await listings.search.press('Enter');
    await listings.row('Okafor & Sons Furniture').waitFor();
    await demo.pause(800);
    await demo.point(listings.row('Okafor & Sons Furniture'));
  });

  await demo.jb.gotoAdmin(`/listings/${LISTING_ID}`);
  await listing.heading.waitFor();
  await demo.scene('listing', async () => {
    await demo.point(listing.subtitle);
    await demo.pause(1200);
    await demo.point(listing.ownerRow('Other listings'));
    await demo.pause(1200);
    await demo.point(listing.flags);
    await demo.pause(1200);
    await demo.point(listing.preview);
  });

  await demo.scene('reason', async () => {
    await demo.click(listing.takeDown);
    await dialog.title.waitFor();
    await demo.pause(1200);
    await demo.click(dialog.takeDown);
    await dialog.error.waitFor();
    await demo.point(dialog.error);
  });

  await demo.scene('taken', async () => {
    await demo.type(dialog.reason, REASON);
    await demo.click(dialog.takeDown);
    await dialog.root.waitFor({ state: 'detached' });
    await listing.takedown.waitFor();
    await demo.point(listing.takedown);
  });

  await demo.page.mouse.move(1240, 700);
  await demo.card('Behind the screen', [
    'jubilee staff grant | revoke writes staff.role-granted or staff.role-revoked with the operator (cli|user) and the roles before and after; a command that changes nothing writes nothing.',
    'Each opening of /listings/:id writes owner.viewed with “Listing {id}” as the reason.',
    'Proved by StaffCommandTests, AdminListingsTests and keep-listings-honest.spec.ts (ADR 0059).',
  ]);
  await demo.scene('behind');

  await demo.card('Journey 12 · 100%', [
    'Done: Listings, one listing, Take down listing, and the audit of every takedown, access and role change.',
    'Left for the owner, by hand: the screens against their mocks (ADR 0010).',
  ]);
  await demo.scene('close');
});
