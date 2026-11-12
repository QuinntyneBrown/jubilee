import { test } from "../../../e2e/fixtures/demo";
import { BACK_IN_STOCK, stubNotifications, type FakeNotification } from "../../../e2e/fixtures/notifications";
import { stubProfile } from "../../../e2e/fixtures/profile";
import { stubUnsubscribe } from "../../../e2e/fixtures/unsubscribe";
import { NotificationSettingsPage } from "../../../e2e/pages/notification-settings.page";
import { NotificationsPage } from "../../../e2e/pages/notifications.page";
import { Toasts } from "../../../e2e/pages/toasts";
import { UnsubscribePage } from "../../../e2e/pages/unsubscribe.page";

// Video 14: journey 17, stay notified. The notification centre and the event stream are answered by
// the fake of notifications.spec.ts and toasts.spec.ts (ADR 0009); the settings by the fake of
// account.spec.ts; the unsubscribe page by the fake of unsubscribe.spec.ts. The cards say what the
// run built behind the screen: the jobs and the measurement of the stream.
// Built by `node tools/video-demo/build.mjs` (docs/videos/README.md).

/** A notification that arrives over the stream; the app shows it as an info toast. */
const arrival = (
  n: number,
  kind: FakeNotification["kind"],
  title: string,
  detail: string,
  target: string,
): FakeNotification => ({
  id: `c3000000-0000-4000-8000-0000000001${String(n).padStart(2, "0")}`,
  kind,
  title,
  detail,
  target,
  at: "2026-11-10T14:30:00Z",
  read: false,
});

test("journey 17: stay notified", async ({ demo }) => {
  const page = demo.page;
  const centre = new NotificationsPage(page);
  const toasts = new Toasts(page);
  const settings = new NotificationSettingsPage(page);
  const unsubscribe = new UnsubscribePage(page);
  const park = () => page.mouse.move(1270, 715, { steps: 12 });

  const fake = await stubNotifications(page, { markAll: "fails" });
  await demo.jb.goto("/notifications");
  await centre.heading.waitFor();
  await demo.card("Journey 17 · Stay notified", [
    "A member receives events through the notification centre, toasts, banners and e-mail.",
    "This run: from 89% to complete.",
  ]);
  await demo.scene("intro");

  await demo.hideCard();
  await demo.scene("centre", async () => {
    await demo.point(centre.heading);
    await demo.pause(2500);
    await demo.point(centre.link("New in Shops: Flower Creations"));
  });

  await demo.scene("toast", async () => {
    fake.push(BACK_IN_STOCK);
    const toast = toasts.info(BACK_IN_STOCK.title);
    await toast.waitFor();
    await demo.pause(3000);
    await demo.point(toast);
  });

  await demo.scene("three", async () => {
    await demo.click(centre.markAll);
    await toasts.danger("Couldn’t mark them as read").waitFor();
    await demo.pause(3500);
    await park();
    fake.push(arrival(2, "message", "New message from Legacy Financial", "“Thursday at ten works for us.”", "/messages/m2"));
    await toasts.info("New message from Legacy Financial").waitFor();
    await demo.pause(1800);
    fake.push(arrival(3, "request", "Luzandre.com confirmed your order", "Faith heavyweight tee, charcoal", "/requests/r3"));
    await toasts.info("Luzandre.com confirmed your order").waitFor();
    await demo.pause(1500);
    await demo.point(toasts.danger("Couldn’t mark them as read"));
  });

  await demo.scene("reopen", async () => {
    await demo.click(toasts.dismiss(toasts.danger("Couldn’t mark them as read")));
    await park();
    // The server refuses the stream: the browser stops asking, and the app asks again by itself.
    fake.stream = "refused";
    while (fake.refusals === 0) await demo.pause(100);
    fake.stream = "ok";
    fake.push(arrival(4, "request", "Flower Creations confirmed your order", "Pickup Sat 14 Nov", "/requests/r4"));
    const toast = toasts.info("Flower Creations confirmed your order");
    await toast.waitFor({ timeout: 15_000 });
    await demo.point(toast);
  });

  // The fake stream would send its events again to a new page: the recorded, silent stream answers
  // from here on.
  await page.unroute(/\/api\/events(\?.*)?$/);
  await demo.jb.signInAs("member");
  await stubProfile(page);
  await demo.jb.goto("/account/notifications");
  await settings.frequency.waitFor();
  await demo.scene("settings", async () => {
    await demo.point(settings.heading);
    await demo.pause(1500);
    await demo.point(settings.frequency);
    await demo.pause(1500);
    await settings.frequency.selectOption("daily-summary");
    await demo.pause(800);
    await demo.scroll(-600);
    await demo.point(settings.status);
  });

  await park();
  await demo.card("One daily summary", [
    "L2-016 AC6 to AC8: for a member on the daily summary, e-mails about messages and requests are held in the outbox. At 7:00 a.m. in Toronto the job daily-summary sends one e-mail, “Your Jubilee summary for {day}”, listing them in order.",
    "Meeting reminders and e-mails about sign-in and security are never held. EmailNotificationTests.DailySummary.cs, ADR 0053.",
  ]);
  await demo.scene("summary");

  await demo.card("New businesses and tips for business owners", [
    "L2-222: on Monday at 7:00 a.m. in Toronto, “New on Jubilee this week” goes to members with “New businesses” on. NewBusinessTests.cs.",
    "L2-223: on the first day of a month, each owner of a public listing with “Tips for business owners” on gets the next of four tips. OwnerTipTests.cs.",
    "L2-149 AC1: both carry Jubilee’s mailing address, and are not sent without one. EmailLayoutTests.cs.",
  ]);
  await demo.scene("notes");

  await stubUnsubscribe(page, "messages");
  await demo.jb.goto("/unsubscribe/the-token");
  await unsubscribe.settings.waitFor();
  await demo.scene("unsubscribe", async () => {
    await demo.point(unsubscribe.heading);
    await demo.pause(4000);
    await demo.point(unsubscribe.text);
    await demo.pause(4000);
    await demo.point(unsubscribe.settings);
  });

  await demo.scene("kinds", async () => {
    await stubUnsubscribe(page, "summary");
    await demo.jb.goto("/unsubscribe/the-token");
    await unsubscribe.settings.waitFor();
    await demo.point(unsubscribe.text);
    await demo.pause(5000);
    await stubUnsubscribe(page, "invalid");
    await demo.jb.goto("/unsubscribe/half-a-token");
    await unsubscribe.settings.waitFor();
    await demo.point(unsubscribe.heading);
  });

  await park();
  await demo.card("Delivered within 2 seconds", [
    "L2-070 AC1: EventStreamTests.cs sends 20 notifications to an open stream, one at a time, and fails unless the 95th percentile of the time to arrive is under 2 seconds.",
    "AC4: the app opens the stream again after 5 seconds, then waits longer, up to 60 seconds, and at once when the device is online again. notifications.spec.ts.",
  ]);
  await demo.scene("stream");

  await demo.card("Journey 17 is complete", [
    "ADR 0053 records the decisions; the designs of notifications name the code as built.",
    "Left for the owner: set Email__MailingAddress in production, run jubilee migrate for StayNotified, measure delivery in production, and run the visual, responsive and accessibility sweeps.",
  ]);
  await demo.scene("close");
});
