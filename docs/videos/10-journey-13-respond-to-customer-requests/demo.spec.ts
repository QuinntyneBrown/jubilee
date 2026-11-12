import { test } from "../../../e2e/fixtures/demo";
import { stubIncoming } from "../../../e2e/fixtures/incoming-requests";
import { BusinessPage } from "../../../e2e/pages/business.page";
import { ConfirmRequestDialog } from "../../../e2e/pages/confirm-request.dialog";
import { DeclineRequestDialog } from "../../../e2e/pages/decline-request.dialog";
import { IncomingRequestsPage } from "../../../e2e/pages/incoming-requests.page";
import { Toasts } from "../../../e2e/pages/toasts";

// Video 10: journey 13, respond to customer requests. The owner's Incoming requests is answered by
// the fake of incoming-requests.spec.ts (ADR 0009): a request arrives over the event stream, a
// confirmation fails after its dialog was closed, and a decline meets a cancelled request. The
// "Replies fast" badge is the stubbed state of business.spec.ts; the cards say what the run proved
// behind the screen. Built by `node tools/video-demo/build.mjs` (docs/videos/README.md).

test("journey 13: respond to customer requests", async ({ demo }) => {
  const page = demo.page;
  const requests = new IncomingRequestsPage(page);
  const confirm = new ConfirmRequestDialog(page);
  const decline = new DeclineRequestDialog(page);
  const toasts = new Toasts(page);
  const business = new BusinessPage(page);
  const park = () => page.mouse.move(1270, 715, { steps: 12 });

  // The owner: Naomi, on the Incoming requests of Luzandre.com.
  const fake = await stubIncoming(page, {
    confirm: "fails",
    confirmDelayMs: 2500,
    decline: "cancelled",
  });
  await demo.jb.goto("/my-business/requests");
  await requests.rows.first().waitFor();
  await demo.card("Journey 13 · Respond to customer requests", [
    "An owner sees the requests customers sent, and confirms or declines each one.",
    "This run: from 90% to complete.",
  ]);
  await demo.scene("intro");

  await demo.hideCard();
  await demo.scene("list", async () => {
    await demo.point(requests.heading);
    await demo.pause(1800);
    await demo.point(requests.statusTab(/^New/));
    await demo.pause(1800);
    await demo.point(requests.row("Samuel Park"));
    await demo.pause(1500);
    await demo.point(requests.confirmButton("Samuel Park"));
  });

  await demo.scene("stream", async () => {
    await demo.pause(6500);
    fake.arrive();
    await requests.row("Grace Adeyemi").waitFor();
    await demo.point(requests.row("Grace Adeyemi"));
    await demo.pause(1500);
    await demo.point(toasts.withTitle("New booking request"));
  });

  await demo.scene("confirm", async () => {
    const told = toasts.withTitle("New booking request");
    if (await told.count()) await toasts.dismiss(told).click();
    await demo.click(requests.confirmButton("Samuel Park"));
    await confirm.confirm.waitFor();
    await demo.pause(2200);
    await demo.click(confirm.confirm);
    await demo.pause(500);
    await confirm.escape();
    await confirm.root.waitFor({ state: "detached" });
  });

  const failed = toasts.danger("Couldn’t confirm the order");
  await demo.scene("danger", async () => {
    await failed.waitFor();
    await demo.point(failed);
    await demo.pause(5000);
    await demo.point(requests.row("Samuel Park"));
    await demo.pause(2500);
    await demo.point(toasts.action(failed, "Try again"));
  });

  await demo.scene("again", async () => {
    fake.confirm = "ok";
    fake.confirmDelayMs = 0;
    await demo.click(toasts.action(failed, "Try again"));
    const confirmed = toasts.withTitle("Order confirmed");
    await confirmed.waitFor();
    await demo.point(confirmed);
    await demo.pause(3500);
    await demo.point(toasts.action(confirmed, "Undo"));
    await demo.pause(1500);
    await demo.point(requests.statusTab(/^Confirmed/));
  });

  await demo.scene("decline", async () => {
    const confirmed = toasts.withTitle("Order confirmed");
    if (await confirmed.count()) await toasts.dismiss(confirmed).click();
    await demo.click(requests.declineButton("David Chen"));
    await decline.keep.waitFor();
    await demo.point(decline.keep);
    await demo.pause(2500);
    await demo.type(decline.message, "Thank you, David. We cannot take that many this month.");
    await demo.pause(600);
    await demo.point(decline.decline);
  });

  await demo.scene("conflict", async () => {
    await demo.click(decline.decline);
    await decline.root.waitFor({ state: "detached" });
    const told = toasts.danger("Request not declined");
    await told.waitFor();
    await demo.point(told);
    await demo.pause(4500);
    await demo.point(requests.statusTab(/^New/));
  });

  // The member's side: the listing of a business that replies fast (the stub of business.spec.ts).
  // The fake stream says again what it sent to a page that opens anew; it has no part in this scene.
  fake.stream = "down";
  await demo.scene("badge", async () => {
    await demo.jb.open("business.replies-fast");
    await business.repliesFast.waitFor();
    await demo.point(business.repliesFast);
    await demo.pause(4500);
    const card = business.relatedCard(0);
    await demo.point(card.repliesFast);
  });

  await park();
  await demo.card("The event stream, and the fallback", [
    "L2-051 AC5: a new request and a cancellation reach the open page over GET /api/events; one toast says it. incoming-requests.spec.ts.",
    "L2-051 AC7: no timer while the stream is connected; while it cannot connect the page asks every 5 seconds, and reads once when it is back. RealtimeService.connected, ADR 0050.",
  ]);
  await demo.scene("fallback");

  await demo.card("The response-time job, and who is told", [
    "L2-182 AC1: JobRun, keyed by job and hour, lets one instance run the hour and records its success; a failed run is tried again the next hour. ResponseTimeJobTests.cs.",
    'L2-052 AC2, L2-053 AC3: the customer gets "Luzandre.com confirmed your order" or "declined your order" in the app, linked to the request. IncomingRequestTests.cs.',
  ]);
  await demo.scene("job");

  await demo.card("Journey 13 is complete", [
    "ADR 0050 records the decisions and amends ADR 0021; the three request designs name the code as built.",
    "Left for the owner: the visual, responsive and accessibility sweeps, and jubilee migrate for AddJobRuns.",
    "Not built here: the retries and dead-letter queue of L2-182 AC2, and moving the other jobs onto ScheduledJobs.",
  ]);
  await demo.scene("close");
});
