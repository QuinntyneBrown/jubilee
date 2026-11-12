import { test } from "../../../e2e/fixtures/demo";
import {
  inboxRows,
  manyRows,
  stubMessaging,
} from "../../../e2e/fixtures/messaging";
import { smallJpeg } from "../../../e2e/fixtures/photos";
import { BusinessPage } from "../../../e2e/pages/business.page";
import {
  ConversationPage,
  MessagesPage,
  NewMessageDialog,
} from "../../../e2e/pages/messages.page";
import { Toasts } from "../../../e2e/pages/toasts";

// Video 11: journey 6, message a business. A member writes to a business whose owner is away,
// pages a long inbox and sends a photo that could not be scanned at first, against the recorded
// API and the messaging stand-in of the behaviour spec (ADR 0009); two cards say what the run did
// behind the screen. Built by `node tools/video-demo/build.mjs` (docs/videos/README.md).

/** Just under the point where the counter of the last 200 characters appears (L2-055 AC5). */
const LONG = `${"I am new to Canada and would like help planning for my children’s education. ".repeat(50)}`;

test("journey 6: message a business", async ({ demo }) => {
  const business = new BusinessPage(demo.page);
  const dialog = new NewMessageDialog(demo.page);
  const conversation = new ConversationPage(demo.page);
  const messages = new MessagesPage(demo.page);
  const toasts = new Toasts(demo.page);

  // Joanna has 64 conversations, and Trevor of Legacy Financial is back on Thursday 12 November.
  await demo.jb.signInAs("member");
  const fake = await stubMessaging(demo.page, {
    rows: manyRows(64),
    awayUntil: "2026-11-12T05:00:00Z",
    uploading: "unchecked",
  });
  await demo.jb.goto("/b/legacy-financial");
  await business.heading.waitFor();
  await demo.card("Journey 6 · Message a business", [
    "A member and a business hold a private conversation from an inbox.",
    "This run: from 94% to 98%.",
  ]);
  await demo.scene("intro");

  await demo.hideCard();
  await demo.scene("dialog", async () => {
    await demo.click(business.messageLink);
    await dialog.title.waitFor();
    await demo.point(dialog.hint);
    await demo.pause(1500);
    // A long message, then a few more words: the counter appears for the last 200 characters.
    await dialog.message.fill(LONG.slice(0, 3790));
    await dialog.message.focus();
    await demo.page.keyboard.press("Control+End");
    await dialog.message.pressSequentially(" Thank you!", { delay: 60 });
    await dialog.counter.waitFor();
    await demo.point(dialog.counter);
    await demo.pause(1500);
  });

  await demo.scene("away", async () => {
    await dialog.message.fill(
      "Hello Trevor, do you help newcomers set up RESPs for their children?",
    );
    await demo.click(dialog.send);
    await conversation.heading.waitFor();
    const toast = toasts.withTitle("Trevor is away until Thursday");
    await toast.waitFor();
    await demo.point(toast);
    await demo.pause(2500);
    await demo.point(conversation.away);
  });

  await demo.jb.goto("/messages");
  await messages.list.rows.nth(49).waitFor();
  await demo.scene("inbox", async () => {
    await demo.point(messages.subtitle);
    await demo.pause(1200);
    await demo.scroll(3000);
    await demo.point(messages.list.showMore);
    await demo.pause(600);
    await messages.list.showMore.focus();
    await demo.page.keyboard.press("Enter");
    await messages.list.rows.nth(63).waitFor();
    await demo.scroll(700);
  });

  // Back in the conversation, with a short inbox beside it and Trevor back, so that nothing but the
  // photo is on the screen.
  fake.rows = inboxRows();
  fake.awayUntil = null;
  await demo.jb.goto("/messages/c-legacy");
  await conversation.heading.waitFor();
  const bubble = conversation.bubble("Here’s the page of the statement");
  await demo.scene("photo", async () => {
    await conversation.photoInput.setInputFiles(smallJpeg());
    await conversation.attachedPhoto.waitFor();
    await demo.point(conversation.attachedPhoto);
    await demo.type(
      conversation.composer,
      "Here’s the page of the statement I mentioned.",
    );
    await demo.click(conversation.send);
    await bubble.tryAgain.waitFor();
    await demo.point(bubble.time);
  });

  // The scanner answers now: the same message is uploaded and sent.
  fake.uploading = "ok";
  await demo.scene("retry", async () => {
    await demo.click(bubble.tryAgain);
    await bubble.viewPhoto.waitFor();
    await demo.point(bubble.photo);
  });

  await demo.card("Behind the screen", [
    "Checked by its content, scanned by ClamAV (INSTREAM), then stored under a random name.",
    "Infected: 422 FAILED_SCAN. No scanner, or no answer in time: 503 SCAN_UNAVAILABLE. Nothing is stored either way.",
    "A photo’s link is never signed with a key that is in the source code.",
    "Proved by MessagingTests, MalwareScannerTests and AttachmentLinkTests.",
  ]);
  await demo.scene("behind");

  await demo.card("Journey 6 · 98%", [
    "Done: the away toast with its day, a paged inbox, photos scanned and kept by the media store.",
    "Left for the owner: run clamd and set Malware__Scanner=clamav; a cookieless media domain (eng/azure/README.md).",
  ]);
  await demo.scene("close");
});
