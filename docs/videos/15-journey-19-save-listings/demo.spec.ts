import { test } from "../../../e2e/fixtures/demo";
import { BROWSE_SAVED, SAVED_ITEMS, stubSaved } from "../../../e2e/fixtures/saved";
import { PASSWORD, joannaSession, stubSession } from "../../../e2e/fixtures/session";
import { BrowsePage } from "../../../e2e/pages/browse.page";
import { BusinessPage } from "../../../e2e/pages/business.page";
import { CategoryPage } from "../../../e2e/pages/category.page";
import { SavedPage } from "../../../e2e/pages/saved.page";
import { AccountMenuRegion, SignInPage } from "../../../e2e/pages/sign-in.page";
import { SignInRequiredDialog } from "../../../e2e/pages/sign-in-required.dialog";
import { Toasts } from "../../../e2e/pages/toasts";
import { WelcomePage } from "../../../e2e/pages/welcome.page";

// Video 15: journey 19, save listings for later. The session is the fake of drafts.spec.ts, so
// Joanna can sign out and in again without a reload; the saved list is the fake of saved.spec.ts
// and card-hearts.spec.ts (ADR 0009). Cards say what is proved behind the screen.
// Built by `node tools/video-demo/build.mjs` (docs/videos/README.md).

test("journey 19: save listings for later", async ({ demo }) => {
  const page = demo.page;
  const browse = new BrowsePage(page);
  const toasts = new Toasts(page);
  const menu = new AccountMenuRegion(page);
  const welcome = new WelcomePage(page);
  const prompt = new SignInRequiredDialog(page);
  const signIn = new SignInPage(page);
  const category = new CategoryPage(page);
  const shop = new BusinessPage(page);
  const saved = new SavedPage(page);
  const park = () => page.mouse.move(1270, 715, { steps: 12 });

  await stubSession(page, { signedIn: true });
  const fake = await stubSaved(page, { items: [] });
  await demo.jb.goto("/");
  await browse.featuredCard(0).heart.waitFor();
  await demo.card("Journey 19 · Save listings for later", [
    "A member keeps businesses, products and spaces on a private list, to find them again.",
    "This run: from 90% to complete.",
  ]);
  await demo.scene("intro");

  await demo.hideCard();
  await demo.scene("browse", async () => {
    await demo.scroll(420);
    await demo.point(browse.featuredCard(0).heart);
    await demo.pause(1500);
    await demo.point(browse.featuredCard(1).heart);
    await demo.pause(1500);
    await demo.point(browse.featuredCard(2).heart);
  });

  await demo.scene("save", async () => {
    await demo.click(browse.featuredCard(0).heart);
    await toasts.withTitle("Saved Legacy Financial. Find it any time under Saved.").waitFor();
    await demo.pause(1500);
    await demo.point(toasts.withTitle("Saved Legacy Financial. Find it any time under Saved."));
  });

  await demo.scene("undo", async () => {
    const toast = toasts.withTitle("Saved Legacy Financial. Find it any time under Saved.");
    await demo.click(toasts.action(toast, "Undo"));
    await demo.pause(800);
    await demo.point(browse.featuredCard(0).heart);
  });

  await demo.scene("more", async () => {
    await demo.click(browse.spaceCard(0).heart);
    await demo.pause(1200);
    await demo.click(browse.productCard(0).heart);
  });

  await demo.scene("busy", async () => {
    fake.save = "pending";
    await demo.click(browse.productCard(1).heart);
    await demo.pause(1200);
    await demo.click(browse.productCard(1).heart);
    await park();
  });

  fake.save = "ok";
  fake.items = [{ ...SAVED_ITEMS[2], business: { ...SAVED_ITEMS[2].business!, slug: "waterworks-plumbing-drains" } }];
  await demo.jb.goto("/b/luzandre");
  await shop.productCard(0).heart.waitFor();
  await demo.scene("category", async () => {
    await demo.point(shop.productCard(0).heart);
    await demo.pause(1500);
    await demo.jb.goto("/c/home-property");
    await category.card(0).heart.waitFor();
    await demo.point(category.card(1).heart);
    await demo.pause(1200);
    await demo.point(category.card(0).heart);
  });

  fake.items = [BROWSE_SAVED[2]];
  await demo.jb.goto("/");
  await browse.featuredCard(0).heart.waitFor();
  await demo.scene("signout", async () => {
    await demo.scroll(420);
    await demo.point(browse.featuredCard(0).heart);
    await demo.pause(1200);
    await demo.click(browse.avatar);
    await demo.click(menu.signOut);
    await demo.click(menu.confirmSignOut);
    await welcome.browseBusinesses.waitFor();
    await demo.click(welcome.browseBusinesses);
    await browse.featuredCard(0).heart.waitFor();
    await demo.scroll(420);
    await demo.point(browse.featuredCard(0).heart);
  });

  await demo.scene("visitor", async () => {
    await demo.click(browse.featuredCard(1).heart);
    await prompt.title.waitFor();
    await demo.pause(1200);
    await demo.point(prompt.title);
  });

  await demo.scene("return", async () => {
    fake.items = [BROWSE_SAVED[2]];
    await demo.click(prompt.signIn);
    await signIn.email.waitFor();
    await demo.type(signIn.email, joannaSession.email);
    await demo.type(signIn.password, PASSWORD);
    await demo.click(signIn.signIn);
    await toasts.withTitle("Saved Luzandre.com. Find it any time under Saved.").waitFor();
    await demo.scroll(420);
    await demo.point(browse.featuredCard(1).heart);
  });

  await park();
  fake.items = [
    { ...BROWSE_SAVED[2], id: "a1000000-0000-4000-8000-000000000021", name: "Luzandre.com", savedAt: "2026-11-12T15:00:00Z", business: { ...BROWSE_SAVED[2].business!, slug: "luzandre", name: "Luzandre.com", tagline: "Unique & custom Christian apparel, artworks & gifts that bring joy", categorySlug: "shops", highlight: "Ships across Canada" } },
    ...BROWSE_SAVED,
  ];
  await demo.jb.goto("/saved");
  await saved.cards.first().waitFor();
  await demo.scene("saved", async () => {
    await demo.point(saved.subtitle);
    await demo.pause(2500);
    await demo.point(saved.cards.nth(2));
  });

  await park();
  await demo.card("Proved by tests", [
    "card-hearts.spec.ts: the hearts of business, product and space cards on Browse, a category, search, a shop and the listing and product pages; the busy heart; the visitor's return; signing out (L2-041 AC7 to AC10).",
    "SavedTests.cs: a space is saved by its slug and listed as a business. saveable.spec.ts compares the heart with its mock, unsaved, saved, busy and focused.",
  ]);
  await demo.scene("proof");

  await demo.card("Journey 19 is complete", [
    "ADR 0054 records the decisions: the heart beside the card's link, the busy heart, a visitor's save remembered for the tab, the saved store cleared whenever no member is signed in.",
    "No migration. Left for the owner: run the visual, responsive and accessibility sweeps.",
  ]);
  await demo.scene("close");
});
