import { test } from "../../../e2e/fixtures/demo";
import { stubPolicies } from "../../../e2e/fixtures/policies";
import { AdminPoliciesPage } from "../../../e2e/pages/admin-policies.page";
import { AdminPolicyPage } from "../../../e2e/pages/admin-policy.page";
import { PolicyPage } from "../../../e2e/pages/policy.page";
import { PublishPolicyDialog } from "../../../e2e/pages/publish-policy.dialog";

// Video 28: journey 22, read policies and get help (L2-226). An administrator lists the policy
// pages, edits the privacy notice with its preview beside the fields, publishes version 3, and a
// member reads it. The admin application is answered by the stand-in of the behaviour specs
// (`e2e/fixtures/policies.ts`, ADR 0009); the member's read of `/api/content/privacy` is answered
// from what that stand-in published. Cards say what only the tests prove. Built by
// `node tools/video-demo/build.mjs` (docs/videos/README.md).

const LEAD =
  "We collect only what the marketplace needs to work, and we never sell it or share it for advertising.";

test("journey 22: read policies and get help", async ({ demo }) => {
  const page = demo.page;
  const policies = new AdminPoliciesPage(page);
  const editor = new AdminPolicyPage(page);
  const dialog = new PublishPolicyDialog(page);
  const reader = new PolicyPage(page);
  const park = () => page.mouse.move(1270, 715, { steps: 12 });

  const fake = await stubPolicies(page);
  await demo.jb.gotoAdmin("/policies");
  await policies.heading.waitFor({ timeout: 15_000 });
  await demo.card("Journey 22 · Read policies and get help", [
    "Read the statement of faith, terms, privacy notice and help.",
    "This run: administrators publish each page from the admin application.",
  ]);
  await demo.scene("intro");

  await demo.hideCard();
  await demo.scene("list", async () => {
    await demo.point(policies.row("Terms of use"));
    await demo.pause(900);
    await demo.point(policies.meta("Privacy"));
    await demo.pause(1500);
  });

  await demo.scene("editor", async () => {
    await demo.click(policies.edit("Privacy"));
    await editor.title.waitFor({ timeout: 10_000 });
    await demo.pause(600);
    await demo.point(editor.lead);
    await editor.lead.fill("");
    await demo.type(editor.lead, LEAD);
    await demo.point(editor.document.locator(".policy-document__lead"));
    await demo.pause(1200);
    await demo.point(editor.document.locator(".policy-document__updated"));
    await demo.pause(800);
  });

  await demo.scene("confirm", async () => {
    await demo.click(editor.publish);
    await dialog.title.waitFor();
    await demo.point(dialog.description);
    await demo.pause(2500);
  });

  await demo.scene("published", async () => {
    await demo.click(dialog.publish);
    await editor.versionRows
      .first()
      .getByText("Version 3 · published")
      .waitFor({ timeout: 10_000 });
    await demo.point(editor.subtitle);
    await demo.pause(1200);
    await editor.versions.scrollIntoViewIfNeeded();
    await demo.point(editor.versionRows.first());
    await demo.pause(1500);
  });

  // The member's read is answered from the version the stand-in just published.
  await page.route("**/api/content/privacy", (route) => {
    const v = fake.versions.privacy[0];
    return route.fulfill({
      json: {
        slug: "privacy",
        title: v.title,
        lead: v.lead,
        version: v.number,
        publishedAt: v.publishedAt,
        sections: v.sections,
      },
    });
  });
  await demo.jb.goto("/privacy");
  await reader.title.waitFor({ timeout: 15_000 });
  await demo.scene("member", async () => {
    await demo.point(reader.lead);
    await demo.pause(1500);
    await demo.point(reader.updated);
    await demo.pause(800);
  });

  await park();
  await demo.card("Behind the screen", [
    "A publish started from an older version answers 409 and publishes nothing (PolicyEditorTests, L2-226 AC7).",
    "Each publish is stored with the administrator’s name and audited as content.published (L2-226 AC6).",
    "A moderator or a member is refused every policy endpoint (L2-226 AC10).",
    "Pages are read through a cache the publish clears, which answers while the database is down (L2-226 AC11).",
  ]);
  await demo.scene("behind");

  await demo.card("Journey 22 · the owner’s step", [
    "Publish the real privacy contact and the final legal wording from Policies.",
    "No deployment is needed.",
  ]);
  await demo.scene("close");
});
