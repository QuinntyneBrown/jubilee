import { test } from "../../../e2e/fixtures/demo";
import { stubMessaging } from "../../../e2e/fixtures/messaging";
import {
  INSTALLED_APP_URL,
  deviceOffline,
  deviceOnline,
  waitForAppShell,
  waitForSnapshot,
} from "../../../e2e/fixtures/offline";
import { stubSaved } from "../../../e2e/fixtures/saved";
import { BrowsePage } from "../../../e2e/pages/browse.page";
import { BusinessPage } from "../../../e2e/pages/business.page";
import { ConnectionBannerRegion } from "../../../e2e/pages/connection-banner";
import { ConversationPage } from "../../../e2e/pages/messages.page";
import { AccountMenuRegion, SignInPage } from "../../../e2e/pages/sign-in.page";
import { Toasts } from "../../../e2e/pages/toasts";

// Video 29: journey 24, use Jubilee offline (L2-119 to L2-122, ADR 0068). The production build with
// its service worker, served on :4203 by eng/azure/server.js, is opened online, then loaded again
// with the whole device offline. A message written offline waits and is sent when the connection
// returns; a slow connection warns; signing out clears the device. The API is answered from the
// recording and the stubs of the behaviour specs (ADR 0009). Cards say what only the tests prove.
// Built by `node tools/video-demo/build.mjs` (docs/videos/README.md).

const MESSAGE = "Should I bring last year’s tax return?";

test("journey 24: use Jubilee offline", async ({ demo }) => {
  const page = demo.page;
  const browse = new BrowsePage(page);
  const banner = new ConnectionBannerRegion(page);
  const conversation = new ConversationPage(page);
  const business = new BusinessPage(page);
  const toasts = new Toasts(page);
  const menu = new AccountMenuRegion(page);
  const park = () => page.mouse.move(1270, 715, { steps: 12 });

  // The recorder's browser does not report its emulated network to the page, so the page is told
  // as a phone's browser would tell it: navigator.onLine follows the device.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => sessionStorage.getItem("jb-demo-offline") !== "1",
    });
  });
  const offline = async () => {
    await page.evaluate(() => sessionStorage.setItem("jb-demo-offline", "1"));
    await deviceOffline(page);
  };
  const online = async () => {
    await deviceOnline(page);
    await page.evaluate(() => {
      sessionStorage.removeItem("jb-demo-offline");
      window.dispatchEvent(new Event("online"));
    });
  };

  await demo.jb.signInAs("member");
  const messages = await stubMessaging(page);
  // Online: a conversation and the browse home are opened, and the app shell is installed.
  await demo.jb.goto(`${INSTALLED_APP_URL}/messages/c-legacy`);
  await conversation.ready();
  await waitForSnapshot(page, "conversation:c-legacy");
  await demo.card("Journey 24 · Use Jubilee offline", [
    "Browse saved pages and queue messages on a poor connection.",
    "This run: Jubilee opens with no connection, sends what was written",
    "even when it is closed, and leaves nothing behind at sign-out.",
  ]);
  await browse.brand.dispatchEvent("click");
  await browse.featuredCards.first().waitFor({ timeout: 15_000 });
  await waitForSnapshot(page, "browse-home");
  await waitForAppShell(page);
  await demo.scene("intro");

  await demo.hideCard();
  await demo.scene("shell", async () => {
    await demo.point(browse.featuredCards.first());
    await demo.pause(1200);
    await offline();
    await page.reload();
    await browse.featuredCards.first().waitFor({ timeout: 15_000 });
    await banner.root.waitFor({ timeout: 10_000 });
    await demo.point(banner.root);
    await demo.pause(2500);
    await demo.point(browse.searchBox);
    await demo.pause(1200);
  });

  await page.goto(`${INSTALLED_APP_URL}/messages/c-legacy`);
  await conversation.ready();
  await demo.scene("queue", async () => {
    await demo.point(conversation.bubbles.first());
    await demo.pause(1000);
    await demo.type(conversation.composer, MESSAGE);
    await demo.click(conversation.send);
    await conversation.bubble("tax return").status.waitFor({ timeout: 10_000 });
    await demo.point(conversation.bubble("tax return").status);
    await demo.pause(1500);
    // The conversation keeps its newest message in view, which scrolls the banner away.
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await demo.point(banner.root);
    await demo.pause(800);
  });

  await demo.scene("back", async () => {
    await online();
    await banner.root
      .getByText("1 saved message was sent", { exact: false })
      .waitFor({ timeout: 15_000 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await demo.point(banner.root);
    await demo.pause(2000);
    if (messages.sends.length !== 1) throw new Error("the queued message was not sent once");
  });

  await park();
  await demo.card("Background Sync", [
    "Jubilee closed, the connection back: the browser wakes the service worker,",
    "which sends the queue in order, each message with its idempotency key.",
    "Without Background Sync, the queue is sent the next time Jubilee is open.",
  ]);
  await demo.scene("sync");

  // A slow connection: every answer takes 1.5 seconds; the waits are shortened for the film.
  await page.addInitScript(() => {
    Object.assign((globalThis as { __jbTimings?: object }).__jbTimings ?? {}, {
      slowMean: 1_000,
      slowRequest: 2_500,
      retryWindow: 20_000,
      retryEvery: 1_000,
    });
  });
  const saved = await stubSaved(page, { items: [], save: "offline" });
  await page.route("**/api/**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    await route.fallback();
  });
  await page.goto(`${INSTALLED_APP_URL}/b/luzandre`);
  await business.saveButton.waitFor({ timeout: 20_000 });
  await demo.hideCard();
  await demo.scene("slow", async () => {
    await banner.root.getByText("Your connection is slow.").waitFor({ timeout: 15_000 });
    await demo.point(banner.root);
    await demo.pause(1800);
    await demo.click(business.saveButton);
    await toasts.warning("Still sending your request").waitFor({ timeout: 15_000 });
    await demo.point(toasts.warning("Still sending your request"));
    await demo.pause(2500);
    saved.save = "ok";
    await toasts
      .withTitle("Saved Luzandre.com. Find it any time under Saved.")
      .waitFor({ timeout: 20_000 });
    await demo.pause(1500);
  });

  await page.unroute("**/api/**");
  await page.route("**/api/session", (route) =>
    route.request().method() === "DELETE" ? route.fulfill({ status: 204 }) : route.fallback(),
  );
  await demo.scene("signout", async () => {
    await demo.click(new SignInPage(page).avatar);
    await demo.click(menu.signOut);
    await menu.confirmSignOut.waitFor({ timeout: 10_000 });
    await demo.pause(800);
    await demo.click(menu.confirmSignOut);
    await page.waitForFunction(() => document.body.dataset["page"] === "welcome", undefined, {
      timeout: 15_000,
    });
    await demo.pause(1500);
  });

  await park();
  await demo.card("Behind the screen", [
    "The service worker leaves every /api request to the network and keeps none of them.",
    "A message the worker sent is never sent again by the page (offline-installed.spec.ts).",
    "A message waiting more than 24 hours is marked Not sent (L2-120 AC3).",
    "Attempts to reach Jubilee wait 5, 10, 20, 40, then 60 seconds (L2-121 AC3).",
  ]);
  await demo.scene("behind");

  await demo.card("Journey 24 · the owner’s step", [
    "Host a status page apart from Jubilee and set its address",
    "(environment.statusUrl) for “Check status”.",
  ]);
  await demo.scene("close");
});
