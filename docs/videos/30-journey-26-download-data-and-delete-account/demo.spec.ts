import { stubAccountData } from "../../../e2e/fixtures/account-data";
import { test } from "../../../e2e/fixtures/demo";
import { keepOnDevice, savedOnDevice, waitForSnapshot } from "../../../e2e/fixtures/offline";
import { stubProfile } from "../../../e2e/fixtures/profile";
import { keepDraft } from "../../../e2e/fixtures/session";
import { AccountPage } from "../../../e2e/pages/account.page";
import { DeleteAccountDialog } from "../../../e2e/pages/delete-account.dialog";
import { Toasts } from "../../../e2e/pages/toasts";

// Video 30: journey 26, download data and delete account (L2-017, L2-018, ADR 0069). Joanna's
// download could not be prepared, and she asks again; she deletes her account, first on a dropped
// connection, then for good, and the device is cleared. The API is answered by the stand-ins of
// the behaviour specs (ADR 0009). Cards say what only the tests prove.
// Built by `node tools/video-demo/build.mjs` (docs/videos/README.md).

test("journey 26: download data and delete account", async ({ demo }) => {
  const page = demo.page;
  const account = new AccountPage(page);
  const dialog = new DeleteAccountDialog(page);
  const toasts = new Toasts(page);
  const park = () => page.mouse.move(1270, 715, { steps: 12 });

  // A draft of a message Joanna left, kept for her on this device (ADR 0046).
  await keepDraft(page, {
    email: "Joanna Adeyemi",
    address: "/messages/c-legacy",
    key: "composer",
    values: { body: "See you on Tuesday" },
  });
  await demo.jb.signInAs("member");
  await stubProfile(page);
  const fake = await stubAccountData(page, { exportState: "failed" });
  await demo.jb.goto("/account");
  await account.dataFailed.waitFor({ timeout: 15_000 });
  await waitForSnapshot(page, "session");
  await keepOnDevice(page, "conversation:c-legacy", { id: "c-legacy", messages: [] });

  await demo.card("Journey 26 · Download data and delete account", [
    "Export your personal data or permanently delete the account.",
    "This run: a download that could not be prepared says so, a deletion",
    "survives a restore, and nothing stays on the device.",
  ]);
  await demo.scene("intro");

  await demo.hideCard();
  await demo.scene("failed", async () => {
    await demo.point(account.dataFailed);
    await demo.pause(4000);
    await demo.click(account.downloadData);
    await account.dataWaiting.waitFor({ timeout: 10_000 });
    await demo.point(account.dataWaiting);
    await demo.pause(1500);
    if (fake.exportRequests !== 1) throw new Error("the download was not asked for once");
  });

  fake.deletion = "offline";
  await demo.scene("dialog", async () => {
    await demo.click(account.deleteAccount);
    await dialog.consequences.nth(0).waitFor({ timeout: 10_000 });
    await demo.point(dialog.keep);
    await demo.pause(1500);
    await demo.point(dialog.consequences.nth(1));
    await demo.pause(1200);
  });

  await demo.scene("dropped", async () => {
    await demo.type(dialog.confirmation, "DELETE");
    await demo.click(dialog.delete);
    await dialog.alert.getByText("Your connection dropped").waitFor({ timeout: 10_000 });
    await demo.point(dialog.alert);
    await demo.pause(1500);
  });

  fake.deletion = "ok";
  await demo.scene("deleted", async () => {
    await demo.click(dialog.delete);
    await toasts.withTitle("Your account was deleted").waitFor({ timeout: 15_000 });
    await demo.pause(1500);
    await park();
    await demo.pause(1000);
  });
  const left = await savedOnDevice(page);
  if (left.pages !== 0 || left.queued !== 0) throw new Error("the device was not cleared");

  await demo.card("Behind the screen", [
    "Every deletion is written to the deletion ledger, outside the database;",
    "after a restore the worker deletes the account again (L2-017 AC7).",
    "The archive is kept in the export store, never in the database (L2-018 AC5).",
    "The data link and the deletion confirmation carry no unsubscribe (L2-068 AC6).",
  ]);
  await demo.scene("behind");

  await demo.card("Journey 26 · the owner’s step", [
    "Keep the database’s backups for 35 days or less, with no long-term retention",
    "(eng/azure/README.md, “Deleted accounts, backups and data archives”).",
  ]);
  await demo.scene("close");
});
