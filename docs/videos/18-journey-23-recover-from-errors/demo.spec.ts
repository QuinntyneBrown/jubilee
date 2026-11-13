import { join } from "node:path";
import { test } from "../../../e2e/fixtures/demo";
import { stubHelp, stubKeptSlug } from "../../../e2e/fixtures/errors";
import { stubMyBusiness } from "../../../e2e/fixtures/my-business";
import { routes } from "../../../e2e/fixtures/routes";
import { BusinessPage } from "../../../e2e/pages/business.page";
import { ForbiddenPage } from "../../../e2e/pages/forbidden.page";
import { NotFoundPage } from "../../../e2e/pages/not-found.page";
import { StaticPage } from "../../../e2e/pages/static-page";
import { Toasts } from "../../../e2e/pages/toasts";

// Video 18: journey 23, recover from errors. The app is answered from the recorded API and the stubs of
// error-pages.spec.ts (ADR 0009): the API's 301 for an old slug is stubKeptSlug, the forbidden owner's workspace
// is stubMyBusiness, and "Ask for access" is stubHelp. The static pages are opened as built; the app's build copies
// Archivo to /static/Archivo.woff2, which a dev server started before that change does not serve, so the demo
// answers that path with the same file. Cards say what has no screen: the host's statuses and the team's e-mail.
// Built by `node tools/video-demo/build.mjs` (docs/videos/README.md).

const ARCHIVO = join(__dirname, "../../../frontend/projects/components/src/lib/assets/fonts/Archivo.woff2");

test("journey 23: recover from errors", async ({ demo }) => {
  const page = demo.page;
  const business = new BusinessPage(page);
  const notFound = new NotFoundPage(page);
  const shown = new StaticPage(page);
  const forbidden = new ForbiddenPage(page);
  const toasts = new Toasts(page);
  const park = () => page.mouse.move(1270, 715, { steps: 12 });

  await page.route("**/static/Archivo.woff2", (route) => route.fulfill({ path: ARCHIVO, contentType: "font/woff2" }));
  await stubKeptSlug(page, "legacy-financial-group", "legacy-financial");

  await demo.jb.goto("/");
  await demo.card("Journey 23 · Recover from errors", [
    "Anyone sees a clear page for a missing, forbidden, failed or maintenance state, with a way forward.",
    "This run: from 79% to complete.",
  ]);
  await demo.scene("intro");

  await demo.hideCard();
  await demo.scene("renamed", async () => {
    await demo.jb.goto("/b/legacy-financial-group");
    await business.heading.waitFor();
    await demo.pause(1200);
    await demo.point(business.heading);
  });

  const now = new URL(page.url()).pathname;
  await demo.card("The address follows the name", [
    `Opened: /b/legacy-financial-group. Shown at: ${now}.`,
    "A new business name gives the listing a new slug; the old one is kept as a ListingSlug and answers 301, for the page and its products.",
    "A kept slug is never given to another listing (KeptSlugTests).",
  ]);
  await demo.scene("address");

  await demo.jb.goto("/no-such-page");
  await notFound.heading.waitFor();
  await demo.hideCard();
  await demo.scene("not-found", async () => {
    await demo.pause(600);
    await demo.point(notFound.heading);
    await demo.pause(1200);
    await demo.point(notFound.search);
  });

  await park();
  await demo.card("A page load gets its status first", [
    "eng/azure/server.js matches the address against the app's routes.json and asks GET /api/documents/status.",
    "404 with the app for a missing page, listing or category; 403 for the owner's workspace without a listing; 301 to the current slug; 503 in maintenance; 500 when the app cannot be served (ADR 0056).",
  ]);
  await demo.scene("statuses");

  await shown.goto(routes["static-maintenance"].app);
  await shown.heading.waitFor();
  await demo.hideCard();
  await demo.scene("maintenance", async () => {
    await demo.pause(800);
    await demo.point(shown.text);
    await demo.pause(1500);
    await demo.point(shown.checkAgain);
  });

  await shown.goto(routes["static-server-error"].app);
  await shown.heading.waitFor();
  await demo.scene("server-error", async () => {
    await demo.pause(800);
    await demo.point(shown.tryAgain);
    await demo.pause(800);
    await demo.point(shown.getHelp);
    await demo.pause(800);
    await demo.point(shown.reference);
  });

  // Joanna owns no listing: her session and navigation are installed after the stub, so they answer first.
  await stubMyBusiness(page, { overview: "forbidden" });
  await demo.jb.signInAs("member");
  await stubHelp(page);
  await demo.jb.goto("/my-business");
  await forbidden.heading.waitFor();
  await demo.scene("forbidden", async () => {
    await demo.pause(800);
    await demo.point(forbidden.text);
    await demo.pause(800);
    await demo.click(forbidden.askForAccess);
  });

  await demo.scene("asked", async () => {
    await toasts.withTitle("We’ve passed your request to the team.").waitFor();
    await demo.point(forbidden.askForAccess);
  });

  await park();
  await demo.card("Access request: /my-business", [
    "CreateAccessRequestCommandHandler tells the team through VerificationTeam.Tell, saved with the request: the page, the member's name and e-mail address, and the time in Toronto.",
    "A repeated key, or a sixth request within an hour, sends nothing (AccessRequestNoticeTests).",
  ]);
  await demo.scene("email");

  await demo.card("Proved by tests", [
    "KeptSlugTests, DocumentStatusTests and AccessRequestNoticeTests in the API; eng/azure/server.test.js for every page-load status.",
    "error-pages.spec.ts for the redirected listing and product; static-pages.spec.ts for the static pages: their copy, no script, Archivo.",
  ]);
  await demo.scene("proof");

  await demo.card("Journey 23 is complete", [
    "ADR 0056 records the decisions. One migration (ListingSlugs); no new setting on Azure.",
    "Left for the owner: check the page-load statuses after deploying (eng/azure/README.md), and run the visual, responsive and accessibility sweeps.",
  ]);
  await demo.scene("close");
});
