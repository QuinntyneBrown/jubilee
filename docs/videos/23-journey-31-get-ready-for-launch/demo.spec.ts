import { test } from "../../../e2e/fixtures/demo";
import { MarketingHomePage, naomiDetails } from "../../../e2e/pages/marketing-home.page";

// Video 23: journey 31, get ready for launch (L2-215 to L2-218, ADR 0044, ADR 0047, ADR 0061). The marketing
// site on :4201 in its launching-soon state, answered from the recorded API and the launch stubs the behaviour
// specs use (ADR 0009), each state opened by its route key: the launch notification (invalid, busy, still
// sending, confirmed, limited) and the business pre-registration (refused by the server, bot challenge,
// confirmed). Cards open it, say what the API, host, CLI and worker tests prove, show the owner's checklist and
// close it. Built by `node tools/video-demo/build.mjs` (docs/videos/README.md).

test("journey 31: get ready for launch", async ({ demo }) => {
  const page = demo.page;
  const home = new MarketingHomePage(page);
  const notify = home.notifyForm;
  const business = home.businessForm;
  const park = () => page.mouse.move(1270, 715, { steps: 8 });
  // Brings a notice or a confirmation to the middle of the screen, clear of the sticky top bar.
  const centre = (target: typeof notify.alert) =>
    target.evaluate((element) => element.scrollIntoView({ block: "center", behavior: "smooth" }));

  await demo.jb.open("marketing-home");
  await home.ready();

  await demo.card("Journey 31 · Get ready for launch", [
    "Before Jubilee opens: the launch notice, and a business's details for launch day.",
    "This run: a passing test for every criterion of L2-215 to L2-218, and the owner's checklist.",
  ]);
  await demo.scene("intro");

  await demo.hideCard();
  await demo.scene("page", async () => {
    await demo.pause(600);
    await demo.point(home.launchingSoon);
    await demo.pause(900);
    await demo.point(home.badge);
    await demo.pause(900);
    await demo.click(home.tellMe);
    await demo.pause(1200);
  });

  await demo.scene("invalid", async () => {
    await demo.click(notify.send);
    await notify.summary.waitFor();
    await demo.pause(900);
    await demo.point(notify.summaryLinks.first());
  });

  await demo.jb.open("marketing-home.notify-busy");
  await home.ready();
  await demo.scene("busy", async () => {
    await demo.type(notify.field("Email"), "joanna.adeyemi@example.com");
    await demo.type(notify.field("First name"), "Joanna");
    await demo.click(notify.consent);
    await demo.click(notify.send);
    await demo.pause(1200);
    await demo.point(notify.field("Email"));
  });

  await demo.jb.open("marketing-home.notify-recovered");
  await home.ready();
  await demo.scene("retrying", async () => {
    await home.fillNotify();
    await demo.click(notify.send);
    await notify.alert.waitFor();
    await centre(notify.alert);
    await demo.point(notify.alert);
    await notify.confirmationHeading.waitFor({ timeout: 15_000 });
    await demo.point(notify.confirmationHeading);
  });

  await demo.jb.open("marketing-home.notify-rate-limited");
  await home.ready();
  await home.fillNotify();
  await demo.scene("limited", async () => {
    await demo.click(notify.send);
    await notify.alert.waitFor();
    await centre(notify.alert);
    await demo.point(notify.alert);
  });

  await park();
  await demo.jb.open("marketing-home.business-server-invalid");
  await home.ready();
  await home.fillBusiness();
  await demo.scene("server", async () => {
    await demo.point(home.preRegisterHeading);
    await demo.pause(900);
    await demo.click(business.send);
    await business.summary.waitFor();
    await demo.pause(900);
    await demo.point(business.errorOf("Category"));
    await demo.pause(900);
    await demo.point(business.errorOf("Website or social link"));
  });

  await demo.jb.open("marketing-home.business-challenge-failed");
  await home.ready();
  await home.fillBusiness();
  await demo.scene("challenge", async () => {
    await demo.click(business.send);
    await business.alert.waitFor();
    await centre(business.alert);
    await demo.pause(900);
    await demo.point(business.alert);
  });

  // The confirmation is the recorded answer: the stubs of the refused states are taken away.
  await page.unroute("**/api/launch/businesses");
  await demo.jb.open("marketing-home");
  await home.ready();
  await home.fillBusiness(naomiDetails);
  await demo.scene("success", async () => {
    await demo.click(business.send);
    await business.confirmationHeading.waitFor();
    await centre(business.confirmation);
    await demo.pause(600);
    await demo.point(business.confirmationHeading);
  });

  await demo.card("Proved behind the proxy", [
    "Each visitor's address has its own 5 sign-ups and 5 pre-registrations an hour.",
    "An address a caller states without the proxy's key is not believed (L2-218 AC3).",
    "LaunchTests.cs in the API, server.test.js on the marketing host.",
  ]);
  await demo.scene("proxy");

  await demo.card("Read with the CLI, deleted on time", [
    "jubilee launch list --kind notifications > sign-ups.csv: the header row alone when empty.",
    "Each reading is audited with its kind and count (LaunchCommandTests.cs).",
    "The daily job deletes what is 12 months old, counts only (LaunchRetentionJobTests.cs).",
  ]);
  await demo.scene("cli");

  await demo.card("The owner's checklist", [
    "eng/azure/README.md: migrations, proxy key, marketing host, team address, forwarding,",
    "send each form, read it back, bot challenge. Each step: command, check, fix.",
    "ADR 0061.",
  ]);
  await demo.scene("checklist");

  await demo.card("Left to the owner", [
    "Run the checklist in production: send each form once and read it back.",
    "Journey 31: 100%.",
  ]);
  await demo.scene("close");
});
