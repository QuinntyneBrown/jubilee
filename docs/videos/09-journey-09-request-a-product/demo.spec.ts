import { test } from "../../../e2e/fixtures/demo";
import { stubOrder } from "../../../e2e/fixtures/order";
import { IncomingRequestsPage } from "../../../e2e/pages/incoming-requests.page";
import { RequestItemDialog } from "../../../e2e/pages/messages.page";
import { ProductPage } from "../../../e2e/pages/product.page";

// Video 09: journey 9, request a product. A member sends a shop an order request from the product
// page, against the stub of request-item.spec.ts (ADR 0009), and the owner's Incoming requests is
// opened from the recorded API; the cards say what the run proved behind the screen. Built by
// `node tools/video-demo/build.mjs` (docs/videos/README.md).

const tee = "/b/luzandre/p/faith-heavyweight-tee-charcoal";

test("journey 9: request a product", async ({ demo }) => {
  const page = demo.page;
  const product = new ProductPage(page);
  const dialog = new RequestItemDialog(page);
  const incoming = new IncomingRequestsPage(page);
  const park = () => page.mouse.move(1270, 715, { steps: 12 });

  // The member: Joanna, on the product page of Luzandre.com.
  await demo.jb.signInAs("member");
  await stubOrder(page);
  await demo.jb.goto(tee);
  await product.requestButton.waitFor();
  await demo.card("Journey 9 · Request a product", [
    "A member sends a shop an order request for a product, without payment.",
    "This run: from 95% to complete.",
  ]);
  await demo.scene("intro");

  await demo.hideCard();
  await demo.scene("product", async () => {
    await demo.point(product.heading);
    await demo.pause(2500);
    await demo.point(product.optionGroup);
    await product.choose("M");
    await demo.pause(900);
    await demo.point(product.quantity);
    await product.quantity.fill("2");
    await demo.pause(1200);
    await demo.click(product.requestButton);
    await dialog.ready();
  });

  await demo.scene("dialog", async () => {
    await demo.point(dialog.description);
    await demo.pause(4500);
    await demo.point(dialog.summary);
    await demo.pause(2500);
    await demo.point(dialog.methodGroup);
  });

  await demo.scene("ship", async () => {
    await demo.point(dialog.method("Ship to me"));
    await demo.pause(1200);
    await demo.point(dialog.address);
    await demo.pause(3500);
    await demo.point(dialog.itemAmount);
    await demo.pause(1500);
    await demo.point(dialog.shippingAmount);
    await demo.pause(1200);
    await demo.point(dialog.total);
  });

  await demo.scene("pickup", async () => {
    await demo.click(dialog.method("Pick up in Leslieville"));
    await dialog.address.waitFor({ state: "detached" });
    await demo.pause(2500);
    await demo.point(dialog.shippingAmount);
    await demo.pause(1500);
    await demo.point(dialog.total);
  });

  await demo.scene("keyboard", async () => {
    await demo.point(dialog.methodGroup);
    await dialog.radio("Pick up in Leslieville").focus();
    await demo.pause(3500);
    await page.keyboard.press("ArrowUp");
    await dialog.address.waitFor();
    await demo.pause(1800);
    await page.keyboard.press("ArrowDown");
    await demo.pause(1800);
    await page.keyboard.press("ArrowUp");
    await dialog.address.waitFor();
  });

  await demo.scene("send", async () => {
    await demo.type(dialog.note, "Gift wrap please.");
    await demo.click(dialog.send);
    await dialog.viewRequest.waitFor();
    await demo.point(dialog.title);
    await demo.pause(5500);
    await demo.point(dialog.viewRequest);
  });

  // The owner's side, from the recorded API: where an order request arrives.
  await demo.scene("owner", async () => {
    await demo.jb.open("incoming-requests");
    await incoming.rows.first().waitFor();
    await demo.point(incoming.statusTab(/^New/));
    await demo.pause(2500);
    await demo.point(incoming.rows.first());
  });

  await park();
  await demo.card("Who is told when an order is sent", [
    'L2-046 AC8: the owner gets the in-app notification "New order request from {member}", linked to Incoming requests, and finds the request there as "New". OrderRequestTests.cs.',
    "L2-070: the notification reaches the owner’s open page as a real-time event, and not the member’s. EventStreamTests.cs.",
    "The member is told nothing until the owner answers.",
  ]);
  await demo.scene("told");

  await demo.card("When the shop confirms, and in the conversation", [
    "L2-052 AC2, AC4: the customer is told in the app, and only then is the stock reduced by the quantity. OrderRequestTests.cs.",
    'L2-057 AC8: the order is a card in the conversation of the member and the shop: "Order request", the product and quantity, the delivery method and the total. OrderRequestTests.cs.',
  ]);
  await demo.scene("confirmed");

  await demo.card("Journey 9 is complete", [
    "L2-046 has an eighth criterion and ADR 0017 is amended; the request-item design names the code as built. request-item.spec.ts proves the dialog by keyboard.",
    "Left for the owner: the visual, responsive and accessibility sweeps.",
    'Not built: tax (shown as "+ tax", never calculated). Never: carts, checkout and payment.',
  ]);
  await demo.scene("close");
});
