import { test } from "../../../e2e/fixtures/demo";
import { OTHER_BUSINESSES, stubMyBusiness, type FakePhoto } from "../../../e2e/fixtures/my-business";
import { LISTING_PHOTOS, stubListingMedia } from "../../../e2e/fixtures/photos";
import { BusinessPage } from "../../../e2e/pages/business.page";
import { EditListingPage } from "../../../e2e/pages/edit-listing.page";
import { MyBusinessPage } from "../../../e2e/pages/my-business.page";
import { PauseListingDialog } from "../../../e2e/pages/pause-listing.dialog";

// Video 11: journey 15, run a business listing. Naomi's workspace is answered by the fake of
// my-business.spec.ts (ADR 0009), with her other business and a draft, and three photos whose files
// are the pictures of the design reference. The public page with photos is the stubbed state
// `business.photos` of listing-photos.spec.ts. The cards say what the run proved behind the screen.
// Built by `node tools/video-demo/build.mjs` (docs/videos/README.md).

const photos: FakePhoto[] = LISTING_PHOTOS.map((photo, index) => ({
  id: `9e1d0000-0000-4000-8000-0000000000a${index + 1}`,
  key: photo.key,
  position: index + 1,
  alt: `Luzandre.com photo ${index + 1}`,
  customAlt: null,
  width: photo.width,
  height: photo.height,
}));

test("journey 15: run a business listing", async ({ demo }) => {
  const page = demo.page;
  const business = new MyBusinessPage(page);
  const editor = new EditListingPage(page);
  const pause = new PauseListingDialog(page);
  const listing = new BusinessPage(page);
  const park = () => page.mouse.move(1270, 715, { steps: 12 });

  await stubMyBusiness(page, { others: OTHER_BUSINESSES, photos });
  // After the fake, whose own answer for a photo file is a plain square: the last route wins.
  await stubListingMedia(page);
  await demo.jb.goto("/my-business");
  await business.stats.first().waitFor();
  await demo.card("Journey 15 · Run a business listing", [
    "An owner monitors the listing, edits its details, and pauses or resumes it.",
    "This run: from 90% to complete.",
  ]);
  await demo.scene("intro");

  await demo.hideCard();
  await demo.scene("saved", async () => {
    await demo.point(business.heading);
    await demo.pause(2500);
    await demo.point(business.statValue("Saved by members"));
    await demo.pause(3000);
    await demo.point(business.statNote("Saved by members"));
  });

  await demo.scene("switcher", async () => {
    await demo.point(business.switcher);
    await demo.pause(6500);
    await business.chooseBusiness("Laurent Photography · Pending verification");
    await business.alert.first().waitFor();
    await demo.pause(800);
    await demo.point(business.alert.first());
  });

  await demo.scene("another", async () => {
    await demo.pause(5000);
    await demo.point(business.switcher);
    await business.chooseBusiness("Luzandre.com · Live");
    await business.stats.first().waitFor();
    await demo.pause(2000);
    await demo.point(business.listAnother);
  });

  await demo.scene("drag", async () => {
    await demo.jb.goto("/my-business/listing");
    await editor.photoTiles.nth(2).waitFor();
    await editor.photoHelp.scrollIntoViewIfNeeded();
    await demo.point(editor.photoHelp);
    await demo.pause(1500);
    await demo.point(editor.dragHandle(3));
    await demo.pause(800);
    // The same drag as EditListingPage.dragPhoto, slowly enough to be seen.
    const from = await editor.photoTiles.nth(2).boundingBox();
    const to = await editor.photoTiles.nth(0).boundingBox();
    const handle = await editor.dragHandle(3).boundingBox();
    if (from && to && handle) {
      const start = { x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 };
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      await page.mouse.move(start.x - 8, start.y - 4, { steps: 6 });
      await page.mouse.move(to.x + (start.x - from.x), to.y + (start.y - from.y), { steps: 70 });
      await demo.pause(500);
      await page.mouse.up();
    }
    await demo.pause(800);
    await demo.point(editor.photoTiles.first());
  });

  await demo.scene("keyboard", async () => {
    await demo.pause(2500);
    await editor.moveEarlier(2).focus();
    await demo.pause(2200);
    await page.keyboard.press("Enter");
    await demo.pause(600);
  });

  await demo.scene("recheck", async () => {
    await editor.name.scrollIntoViewIfNeeded();
    await demo.click(editor.name);
    await editor.name.fill("");
    await editor.name.pressSequentially("Luzandre Print Co.", { delay: 45 });
    await demo.pause(500);
    await demo.click(editor.save);
    await editor.success.waitFor();
    await editor.success.scrollIntoViewIfNeeded();
    await demo.point(editor.success);
  });

  await park();
  await demo.card("A re-check tells the team and the owner", [
    'L2-087 AC6: the verification team is e-mailed "Re-check: Luzandre Print Co. changed its name or category", with the old and the new name and category and the link to the admin application.',
    'The owner gets the e-mail and the notification "We’ll re-check Luzandre Print Co."; both e-mails are saved with the change. RecheckNoticeTests.cs, ADR 0051.',
  ]);
  await demo.scene("email");

  await demo.jb.open("business.photos");
  await listing.coverPhoto.waitFor();
  await demo.hideCard();
  await demo.scene("public", async () => {
    await demo.point(listing.coverPhoto);
    await demo.pause(4500);
    await listing.photos.scrollIntoViewIfNeeded();
    await demo.pause(600);
    await demo.point(listing.photoImages.first());
    await demo.pause(1500);
    await demo.point(listing.photoImages.nth(1));
  });

  await park();
  await demo.card("A picture with srcset", [
    "L2-221: jb-media-tile draws a picture: a WebP source and a JPEG img, each with the renditions 320, 640 and 1280 at their true widths, sizes, width and height.",
    "The cover is fetched first; the others load lazily. listing-photos.spec.ts and OwnerWorkspaceTests.cs.",
  ]);
  await demo.scene("srcset");

  // The public page was opened as a member; the workspace is Naomi's again, on a fresh fake.
  await stubMyBusiness(page, { others: OTHER_BUSINESSES, photos });
  await demo.jb.goto("/my-business");
  await business.pause.waitFor();
  await demo.hideCard();
  await demo.scene("pause", async () => {
    await demo.click(business.pause);
    await pause.pause.waitFor();
    await demo.pause(2500);
    await demo.click(pause.pause);
    await business.pausedBanner.waitFor();
    await demo.point(business.pausedBanner);
    await demo.pause(2000);
    await demo.point(business.resume);
  });

  await park();
  await demo.card("A pause reaches every public page within 60 seconds", [
    "L2-096 AC2 and AC3, L2-028 AC2: after the owner pauses, the next request of the welcome page, browse, the category and its count, search and a neighbour’s related businesses no longer holds the listing; its own address is 404 to others. A resume brings it back.",
    "No public answer may be kept for more than 60 seconds (Cache-Control). PauseBoundTests.cs.",
  ]);
  await demo.scene("bound");

  await demo.card("Journey 15 is complete", [
    "ADR 0051 records the decisions and amends ADR 0023; the three owner-workspace designs name the code as built.",
    "Left for the owner: the visual, responsive and accessibility sweeps, and jubilee migrate for AddWorkspaceChoice.",
    "Not built here: a list of re-checks in the admin application, and the photo on the business card (L2-155 AC3).",
  ]);
  await demo.scene("close");
});
