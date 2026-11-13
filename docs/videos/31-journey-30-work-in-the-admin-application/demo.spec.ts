import { stubAdmin } from "../../../e2e/fixtures/admin";
import { test } from "../../../e2e/fixtures/demo";
import { ADMIN_URL } from "../../../e2e/fixtures/jb-test";
import { daniel, miriam } from "../../../e2e/fixtures/staff";
import { AdminListingsPage } from "../../../e2e/pages/admin-listings.page";
import { AdminMovedPage } from "../../../e2e/pages/admin-moved.page";
import { AdminShellPage } from "../../../e2e/pages/admin-shell.page";
import { AdminSignInPage } from "../../../e2e/pages/admin-sign-in.page";

// Video 31: journey 30, work in the admin application (L2-188 to L2-195, ADR 0070). A staff
// member signs in through single sign-on, works in the admin bar, is told a screen is not for
// their role, signs out, is refused off an allowed network, and an old admin link in the app says
// the page has moved. The API is answered by the stand-ins of the behaviour specs
// (`e2e/fixtures/admin.ts`, `e2e/fixtures/staff.ts`, ADR 0009); the identity provider is a
// stand-in that hands back Miriam's session. Cards say what only the tests prove. Built by
// `node tools/video-demo/build.mjs` (docs/videos/README.md).

test("journey 30: work in the admin application", async ({ demo }) => {
  const page = demo.page;
  const signIn = new AdminSignInPage(page);
  const shell = new AdminShellPage(page);
  const listings = new AdminListingsPage(page);
  const moved = new AdminMovedPage(page);
  const park = () => page.mouse.move(1270, 715, { steps: 12 });

  const fake = await stubAdmin(page);
  fake.staff.answer = "signed-out";
  // The stand-in of the identity provider: the second factor is confirmed and Miriam comes back
  // to the screen she asked for, signed in.
  await page.route("**/api/staff/sign-in/start**", (route) => {
    fake.staff.answer = miriam;
    return route.fulfill({ status: 302, headers: { location: `${ADMIN_URL}/listings` } });
  });

  await demo.jb.gotoAdmin("/sign-in");
  await signIn.heading.waitFor({ timeout: 15_000 });
  await demo.card("Journey 30 · Work in the admin application", [
    "Staff sign in through single sign-on, from an allowed network.",
    "They work in the admin application's own shell, and sign out.",
    
  ]);
  await demo.scene("intro");

  await demo.hideCard();
  await demo.scene("sign-in", async () => {
    await demo.point(signIn.lead);
    await demo.pause(1500);
    await demo.point(signIn.frameFoot);
    await demo.pause(1000);
    await demo.click(signIn.signIn);
    await listings.heading.waitFor({ timeout: 15_000 });
  });

  await demo.scene("shell", async () => {
    await demo.point(shell.navLink("Listings"));
    await demo.pause(700);
    await demo.point(shell.navLink(/^Reports/));
    await demo.pause(900);
    await demo.point(shell.navLink("Featured"));
    await demo.pause(700);
    await demo.point(shell.staffRole);
    await demo.pause(900);
  });

  fake.staff.answer = daniel;
  await demo.jb.gotoAdmin("/reports");
  await shell.statusHeading.waitFor({ timeout: 15_000 });
  await demo.scene("role", async () => {
    await demo.point(shell.statusHeading);
    await demo.pause(1500);
    await demo.point(shell.navLink("Policies"));
    await demo.pause(1200);
  });

  await demo.scene("sign-out", async () => {
    await demo.click(shell.statusAction("Sign out"));
    await signIn.alert.waitFor({ timeout: 15_000 });
    await demo.point(signIn.alert);
    await demo.pause(1200);
  });

  fake.staff.answer = "network-refused";
  await demo.jb.gotoAdmin("/listings");
  await signIn.alert.waitFor({ timeout: 15_000 });
  await demo.scene("network", async () => {
    await demo.point(signIn.alert);
    await demo.pause(2000);
  });

  await demo.jb.goto("/admin/verifications");
  await moved.heading.waitFor({ timeout: 15_000 });
  await demo.scene("moved", async () => {
    await demo.point(moved.text);
    await demo.pause(1200);
    await demo.point(moved.openAdmin);
    await demo.pause(1200);
  });

  await park();
  await demo.card("Behind the screen", [
    "Every admin-only endpoint refuses a member session with 403 (StaffAccessTests, L2-191 AC5).",
    "A member session and a staff session in one browser outlive each other's sign-out (L2-190 AC5).",
    "A staff member cannot take down their own listing (StaffSignInTests, L2-193 AC6).",
    "Every role change by jubilee staff is in the audit log (StaffCommandTests, L2-098 AC4).",
  ]);
  await demo.scene("behind");

  await demo.card("Journey 30 · the owner's checklist", [
    "Register the admin application with Entra ID and require a second factor.",
    "Set the allowed networks: create-admin.sh with STAFF_NETWORKS.",
    "Grant the first administrator: staff.sh grant.",
    "Sign in once against production (eng/azure/README.md).",
  ]);
  await demo.scene("close");
});
