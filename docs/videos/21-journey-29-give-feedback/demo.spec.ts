import { test } from "../../../e2e/fixtures/demo";
import { stubBooking } from "../../../e2e/fixtures/booking";
import { stubFeedback } from "../../../e2e/fixtures/feedback";
import { FeedbackDialog } from "../../../e2e/pages/feedback.dialog";
import { FeedbackPage } from "../../../e2e/pages/feedback.page";
import { BookMeetingDialog } from "../../../e2e/pages/messages.page";
import { MomentCheck } from "../../../e2e/pages/moment-check";
import { ShellPage } from "../../../e2e/pages/shell.page";

// Video 21: journey 29, give feedback (L2-210 to L2-214, ADR 0043, ADR 0059). Joanna, a member, is
// answered from the recorded API and the feedback and booking stubs the behaviour specs use (ADR 0009):
// the launcher and panel (rate, report a bug, kudos), a check-in after a meeting request, the feedback
// page and "Your feedback". Cards open it, say what the API tests and the parity seam prove, and close it.
// Built by `node tools/video-demo/build.mjs` (docs/videos/README.md).

test("journey 29: give feedback", async ({ demo }) => {
  const page = demo.page;
  const shell = new ShellPage(page);
  const panel = new FeedbackDialog(page);
  const feedback = new FeedbackPage(page);
  const booking = new BookMeetingDialog(page);
  const check = new MomentCheck(page);
  const park = () => page.mouse.move(1270, 300, { steps: 8 });

  await demo.jb.signInAs("member");
  await stubFeedback(page);
  await stubBooking(page);
  await demo.jb.goto("/");
  await shell.feedbackLauncher.waitFor();

  await demo.card("Journey 29 · Give feedback", [
    "Rate Jubilee, report a bug or send kudos from any screen, answer a check-in, follow past feedback.",
    "This run: a passing test for every criterion of L2-210 to L2-214.",
  ]);
  await demo.scene("intro");

  await demo.hideCard();
  await demo.scene("launcher", async () => {
    await demo.pause(600);
    await demo.point(shell.feedbackLauncher);
  });

  await demo.scene("rate", async () => {
    await demo.click(shell.feedbackLauncher);
    await panel.title.waitFor();
    await demo.pause(1200);
    await demo.click(panel.star(4));
    await demo.pause(600);
    await demo.type(panel.note, "Finding a plumber took a day.");
    await demo.click(panel.send);
    await panel.done.waitFor();
    await demo.pause(1500);
    await demo.click(panel.done);
  });

  await demo.scene("bug", async () => {
    await demo.click(shell.feedbackLauncher);
    await demo.click(panel.tab("Report a bug"));
    await demo.type(panel.bugText, "The map on a business page stays blank.");
    await demo.point(panel.attached.first());
    await demo.pause(1500);
    await page.keyboard.press("Escape");
  });

  await demo.scene("kudos", async () => {
    await demo.click(shell.feedbackLauncher);
    await demo.click(panel.tab("Kudos"));
    await demo.click(panel.chip("Found someone I trust"));
    await demo.click(panel.chip("Quick replies"));
    await demo.point(panel.chip("Feels like church family"));
    await demo.pause(5000);
    await demo.click(panel.send);
    await panel.done.waitFor();
    await demo.pause(1200);
    await demo.click(panel.done);
    await park();
  });

  await demo.scene("check-in", async () => {
    await demo.jb.goto("/b/legacy-financial/book");
    await booking.day.fill("2026-11-12");
    await demo.click(booking.time("10:00 a.m."));
    await demo.click(booking.send);
    await check.question.waitFor();
    await demo.point(check.question);
    await demo.pause(800);
    await demo.click(check.score(2));
    await demo.type(check.note, "I wasn't sure which service to pick.");
    await demo.click(check.send);
    await check.thanks.waitFor();
    await demo.pause(800);
  });

  await demo.click(booking.close);
  await demo.scene("page", async () => {
    await demo.jb.goto("/feedback/rate");
    await feedback.heading.waitFor();
    await demo.pause(800);
    await demo.click(feedback.star(5));
    await demo.click(feedback.score("Finding businesses", 5));
    await demo.click(feedback.score("Messages and requests", 4));
    await demo.point(feedback.better);
  });

  await demo.scene("history", async () => {
    await demo.point(feedback.historyItems.first());
    await demo.pause(1500);
    await demo.point(feedback.reply(feedback.historyItems.last()));
    await demo.pause(1200);
    await park();
  });

  await demo.card("Proved by API tests", [
    "A PNG screenshot is cleaned and stored; kudos sent twice with one key are stored once (L2-214 AC6, AC8).",
    "The list gives each kind its title parts and status, never what was written (AC10).",
    "backend/tests/Jubilee.Api.Tests/FeedbackTests.Kinds.cs",
  ]);
  await demo.scene("api");

  await demo.card("Proved by behaviour specs", [
    "Reduced motion: the launcher and the panel appear without movement (L2-210 AC12).",
    "Touch: every target of the panel is pressed over 44 px; a chip is still drawn 32 px tall.",
    "e2e/tests/feedback-panel.spec.ts",
  ]);
  await demo.scene("motion");

  await demo.card("Parity, ready for the reference", [
    "A parity spec whose reference is absent compares with components/<component>/<case>-<width>.png",
    "as soon as the owner saves it, with no change to the spec (ADR 0059).",
  ]);
  await demo.scene("parity");

  await demo.card("Left to the owner", [
    "Export the Feedback captures to docs/design-reference/magic-patterns/components/.",
    "Run the sweeps by hand. Journey 29: 99%.",
  ]);
  await demo.scene("close");
});
