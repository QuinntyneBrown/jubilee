import { test } from "../../../e2e/fixtures/demo";
import { stubModeration } from "../../../e2e/fixtures/moderation";
import { miriam } from "../../../e2e/fixtures/staff";
import { AdminFeaturedPage } from "../../../e2e/pages/admin-featured.page";
import { AdminReportPage } from "../../../e2e/pages/admin-report.page";
import { AdminReportsPage } from "../../../e2e/pages/admin-reports.page";
import { ReportActionDialog } from "../../../e2e/pages/report-action.dialog";
import { Toasts } from "../../../e2e/pages/toasts";

// Video 19: journey 25, moderate reports and feature businesses, in the admin application (ADR 0040). The admin
// application is answered by the stubs of moderation.spec.ts (stubModeration, with its staff session from
// stubStaff, ADR 0009). The staff session first counts the two unresolved reports the list shows; a report that
// "arrives" is the session answering three, which the admin bar shows after the next move between screens.
// Cards say what has no screen: the team's e-mail and the public pages on the next request.
// Built by `node tools/video-demo/build.mjs` (docs/videos/README.md).

test("journey 25: moderate reports and feature businesses", async ({ demo }) => {
  const page = demo.page;
  const reports = new AdminReportsPage(page);
  const report = new AdminReportPage(page);
  const dialog = new ReportActionDialog(page);
  const featured = new AdminFeaturedPage(page);
  const toasts = new Toasts(page);
  const park = () => page.mouse.move(1270, 715, { steps: 12 });

  const fake = await stubModeration(page, {}, { ...miriam, reportCount: 2 });
  await demo.jb.gotoAdmin("/reports");
  await reports.heading.waitFor();

  await demo.card("Journey 25 · Moderate reports and feature businesses", [
    "The Jubilee team handles the reports members send and chooses the businesses featured this week.",
    "This run: from 82% to complete.",
  ]);
  await demo.scene("intro");

  await demo.card("A report reaches the team at once", [
    "Subject: New report: a conversation with Legacy Financial",
    "What the member wrote, and the link to /reports/{id} in the admin application. No reporter, no messages.",
    "Through JubileeTeam.Tell and the outbox, in the save that files the report (ConversationReportNoticeTests).",
  ]);
  await demo.scene("email");

  await demo.hideCard();
  const reportsLink = reports.navLink(/^Reports/);
  await demo.scene("list", async () => {
    await demo.pause(600);
    await demo.point(reports.badgeIn(reportsLink));
    await demo.pause(1500);
    await demo.point(reports.rows.first());
  });

  await demo.scene("open", async () => {
    await demo.click(reports.row("Misleading").getByRole("link"));
    await report.heading.waitFor();
    await demo.pause(800);
    await demo.point(report.subtitle);
  });

  await demo.scene("hold", async () => {
    await demo.click(report.action("Place on hold"));
    await dialog.note.waitFor();
    await demo.type(dialog.note, "Pausing while we ask the owner about the address.");
    await demo.click(dialog.confirm("Place on hold"));
    await dialog.root.waitFor({ state: "detached" });
    await demo.pause(600);
    await demo.point(report.report);
  });

  await park();
  await demo.card("Gone from every public page", [
    "Welcome, Browse, the category, search and the related businesses: on the next request.",
    "The save drops the directory read cache (ADR 0003); search reads the database (ADR 0011). No outbox step (ADR 0058).",
    "Proved with every read cached first (ModerationBoundTests).",
  ]);
  await demo.scene("public");

  await demo.hideCard();
  fake.staff.answer = { ...miriam, reportCount: 3 };
  await demo.scene("arrives", async () => {
    await demo.pause(800);
    await demo.point(report.badgeIn(report.navLink(/^Reports/)));
  });

  await demo.scene("featured", async () => {
    await demo.click(featured.navLink("Featured"));
    await featured.heading.waitFor();
    await demo.pause(600);
    await demo.point(featured.badgeIn(featured.navLink(/^Reports/)));
  });

  await demo.scene("choose", async () => {
    await demo.type(featured.search, "financial");
    await demo.click(featured.add("Legacy Financial"));
    await demo.type(featured.search, "flower");
    await demo.click(featured.add("Flower Creations"));
    await demo.point(featured.count);
    await demo.click(featured.save);
    await toasts.withTitle("Featured businesses saved").waitFor();
    await demo.pause(800);
  });

  await park();
  await demo.card("Featured this week, on the next request", [
    "A week saved, or saved again, shows on the welcome page and Browse at once.",
    "A featured listing that is paused, held or removed is skipped, and returns when live again (ModerationBoundTests).",
  ]);
  await demo.scene("featured-public");

  await demo.card("Proved by tests", [
    "API: ConversationReportNoticeTests, ModerationTests (the count), ModerationBoundTests: each seen failing first.",
    "Browser: moderation.spec.ts, the admin bar's count after a move between screens and after an action.",
  ]);
  await demo.scene("proof");

  await demo.card("Journey 25 is complete", [
    "Nothing new to set on Azure: the team's e-mail goes to Launch__TeamEmail when Moderation__TeamEmail is not set.",
    "Left for the owner: the visual, responsive and accessibility sweeps.",
  ]);
  await demo.scene("close");
});
