import { test } from "../../../e2e/fixtures/demo";
import { MarketingHomePage } from "../../../e2e/pages/marketing-home.page";

// Video 20: journey 27, meet Jubilee on the marketing site (ADR 0013), in its launching-soon state (ADR 0044).
// The marketing site on :4201 is answered from the recorded API like every spec (ADR 0009): its one call,
// GET /api/launch. The film is driven by the keyboard as marketing-home.spec.ts drives it (L2-184 AC6), muted
// so that its burned-in captions carry the narration (AC5). Cards open and close it and say what the specs prove.
// Built by `node tools/video-demo/build.mjs` (docs/videos/README.md).

test("journey 27: meet Jubilee on the marketing site", async ({ demo }) => {
  const page = demo.page;
  const home = new MarketingHomePage(page);
  const park = () => page.mouse.move(1270, 715, { steps: 8 });

  await demo.jb.open("marketing-home");
  await home.ready();

  await demo.card("Journey 27 · Meet Jubilee on the marketing site", [
    "Jubilee is launching soon; the owner has not yet decided to open it (ADR 0044).",
    "This run: a behaviour spec for every criterion of L2-183, L2-184 and L2-186.",
  ]);
  await demo.scene("intro");

  await demo.hideCard();
  await demo.scene("page", async () => {
    await demo.pause(600);
    await demo.point(home.launchingSoon);
    await demo.pause(900);
    await demo.point(home.heading);
    await demo.pause(900);
    await demo.point(home.glimpse);
  });

  await park();
  await demo.scene("keyboard", async () => {
    await home.muteFilm();
    for (let press = 0; press < 10; press++) {
      await page.keyboard.press("Tab");
      await demo.pause(press < 9 ? 450 : 900);
    }
    await page.keyboard.press("Enter");
  });

  // The browser keeps its controls over the picture while the film has the focus; they would hide the
  // captions, so the visitor's focus leaves the film while it plays, and returns to it for the controls.
  await home.video.blur();
  await demo.scene("captions");

  await demo.scene("controls", async () => {
    await home.video.focus();
    await demo.pause(600);
    await page.keyboard.press("Space");
    await demo.pause(1500);
    await home.tabTo(home.chapter("Finding someone you can trust"));
    await demo.pause(1200);
    await page.keyboard.press("Enter");
    await demo.pause(800);
  });

  await demo.scene("mission", async () => {
    await home.video.evaluate((video: HTMLVideoElement) => video.pause());
    await demo.point(home.missionStatement);
    await demo.pause(1200);
    await park();
  });

  await demo.scene("headings", async () => {
    await demo.point(home.why.getByRole("heading", { level: 2 }));
    await demo.pause(1500);
    await demo.point(home.how.getByRole("heading", { level: 2 }));
    await demo.pause(1200);
    await park();
  });

  await demo.scene("tab-order", async () => {
    await home.sendDetails.focus();
    await page.keyboard.press("Enter");
    await demo.pause(800);
    for (let press = 0; press < 6; press++) {
      await page.keyboard.press("Tab");
      await demo.pause(700);
    }
  });

  await demo.scene("reduced", async () => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await demo.jb.open("marketing-home");
    await home.ready();
    await demo.pause(1500);
    await demo.click(home.watchTheFilm);
    await demo.pause(3200);
    await home.muteFilm();
    await demo.click(home.play);
  });

  await demo.scene("dark", async () => {
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await demo.jb.open("marketing-home", { theme: "dark" });
    await home.ready();
    await demo.pause(600);
    await demo.point(home.heading);
    await demo.pause(1200);
    await park();
  });

  await park();
  await demo.card("Proved by tests", [
    "e2e/tests/marketing-home.spec.ts: the film by keyboard (L2-184 AC6), its captions (AC5), every heading's accent (L2-183 AC7),",
    "the whole tab order, both device themes and play under reduced motion (L2-186 AC3 to AC5). Each seen failing first.",
  ]);
  await demo.scene("proof");

  await demo.card("Waiting on the owner's launch decision", [
    "L2-185: the links to the app from one configured address, restored by the journey 27 prompt on launch day.",
    "Until then ADR 0044 holds: no link to the app. Journey 27 stands at 95%.",
  ]);
  await demo.scene("close");
});
