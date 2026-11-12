import { test } from "../../../e2e/fixtures/demo";
import { stubReports } from "../../../e2e/fixtures/reports";
import { BusinessPage } from "../../../e2e/pages/business.page";
import { ReportListingDialog } from "../../../e2e/pages/report-listing.dialog";
import { ShareListingDialog } from "../../../e2e/pages/share-listing.dialog";
import { SignInRequiredDialog } from "../../../e2e/pages/sign-in-required.dialog";

// Video 17: journey 21, share or report a listing. The listing is answered from the recorded API;
// the report endpoint is the fake of share-report.spec.ts, held while the report is on its way, and
// the device's share sheet is the stand-in that spec installs (ADR 0009). Cards say what has no
// screen: the host's routing of link-preview fetchers and the team's e-mail.
// Built by `node tools/video-demo/build.mjs` (docs/videos/README.md).

test("journey 21: share or report a listing", async ({ demo }) => {
  const page = demo.page;
  const business = new BusinessPage(page);
  const share = new ShareListingDialog(page);
  const report = new ReportListingDialog(page);
  const prompt = new SignInRequiredDialog(page);
  const park = () => page.mouse.move(1270, 715, { steps: 12 });

  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "share", { configurable: true, value: async () => {} });
  });
  await demo.jb.goto("/b/luzandre");
  await business.shareLink.first().waitFor();
  await demo.card("Journey 21 · Share or report a listing", [
    "Anyone shares a listing's link; a member reports a problem with it, privately, to the verification team.",
    "This run: from 78% to complete.",
  ]);
  await demo.scene("intro");

  await demo.hideCard();
  await demo.scene("share", async () => {
    await demo.click(business.shareLink.first());
    await share.title.waitFor();
    await demo.pause(800);
    await demo.point(share.link);
    await demo.pause(1500);
    await demo.point(share.whatsapp);
  });

  await demo.scene("copy", async () => {
    await demo.click(share.copy);
    await demo.pause(600);
    await demo.point(share.copy);
  });

  await demo.scene("more", async () => {
    await demo.point(share.more);
  });

  await demo.scene("done", async () => {
    await demo.click(share.done);
    await share.title.waitFor({ state: "hidden" });
    await park();
  });

  await page.goto("/og-image.png");
  await demo.scene("image");

  await demo.card("Link previews", [
    "eng/azure/server.js answers /b/{slug} for a link-preview fetcher with /api/listings/{slug}/social-preview: og:title, og:description, og:url and og:image.",
    "Any other user agent, a search engine among them, gets the app. A listing that is not public answers 404 (ADR 0055).",
  ]);
  await demo.scene("preview");

  await demo.jb.goto("/b/luzandre");
  await business.reportLink.waitFor();
  await demo.hideCard();
  await demo.scene("visitor", async () => {
    await demo.click(business.reportLink);
    await prompt.title.waitFor();
    await demo.pause(800);
    await demo.point(prompt.title);
  });

  await demo.jb.signInAs("member");
  const fake = await stubReports(page, { hold: true });
  await demo.jb.goto("/b/luzandre");
  await business.reportLink.waitFor();
  await demo.scene("report", async () => {
    await demo.click(business.reportLink);
    await report.title.waitFor();
    await demo.pause(1200);
    await demo.click(report.reason(/misleading/));
    await demo.type(report.description, "The hours on the listing are wrong; the shop is closed on Mondays.");
    await demo.point(report.counter);
  });

  await demo.scene("busy", async () => {
    // The dialog gives up after 10 seconds (L2-127 AC2): the line is shorter, and the answer comes next.
    await demo.click(report.send);
    await report.send.dispatchEvent("click");
    await page.keyboard.press("Escape");
    await demo.point(report.cancel);
  });

  await demo.scene("thanks", async () => {
    fake.release();
    await report.close.waitFor();
    await demo.pause(800);
    await demo.point(report.thanks);
  });

  await demo.click(report.close);
  await report.title.waitFor({ state: "hidden" });
  await park();
  await demo.card("New report: Luzandre.com", [
    "ReportSubmitted writes the e-mail and VerificationTeam.Tell sends it to Verification:TeamEmail (else Launch:TeamEmail) through the outbox, saved with the report.",
    "The reason, what happened and /reports/{id} in the admin application; never the reporter. An addition within 24 hours is \"More on a report\".",
  ]);
  await demo.scene("email");

  await demo.card("Proved by tests", [
    "share-report.spec.ts: More… and its absence, \"Link copied\", focus back on Share, the busy report dialog, the 10-second timeout, the lost connection and the 2,000-character stop.",
    "ReportNoticeTests.cs: the team's e-mail, once per key, never the reporter. eng/azure/server.test.js: eight fetchers get the preview; a browser and a search engine get the app.",
  ]);
  await demo.scene("proof");

  await demo.card("Journey 21 is complete", [
    "ADR 0055 records the decisions: link-preview fetchers routed by the app's host, one og-image.png, one place that tells the team.",
    "No migration and no new setting. Left for the owner: run the visual, responsive and accessibility sweeps.",
  ]);
  await demo.scene("close");
});
