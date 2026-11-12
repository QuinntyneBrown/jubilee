# 0045. Finish viewing a business and its products: back-in-stock notices, the preview status

Status: accepted

## Context

Journey 2 (view a business and its products) was built before accounts, notifications and the owner's product management existed, so ADR 0007 left three things open and ADR 0025 deferred a fourth: the back-in-stock notice in the app and by e-mail (L2-036 AC2), the owner's sold-out toast (L2-036 AC3), the "Sold out" badge on product cards (L2-034 AC3) and the status on the preview of a listing that is not public (L2-028 AC3). Journeys 16 and 17 have since built the stock change, the notification centre, the event stream and the e-mail outbox. The design of the product page still described a `ProductBackInStock` outbox message handed by `OutboxDispatcherJob` to a `StockAlertNotifier` in the Worker; neither was built.

## Decision

- **The notice is written with the stock change, not dispatched from an outbox message.** `StockAlertNotifier.TellAsync` runs in the handler that changed the stock, before it saves, so the closed alerts, the notifications and the queued e-mails commit with the stock change or not at all. This is how every other notification is made (`NotificationRules.Tell` with `EmailPolicy.Queue`); the outbox holds e-mails only, and a second kind of outbox message with its own dispatcher would be a mechanism for one event. There is no `ProductBackInStock` message.
- **Back in stock means the product stops being sold out, by any path.** `Product.SetStock` already reports `StockChange.BackInStock`; `Product.RestoreStock` now reports it too. The two paths are the owner's edit of a product (`SaveProductCommandHandler`) and a confirmed order taken back (`UndoConfirmRequestCommandHandler`).
- **Once per alert.** Telling a member sets `StockAlert.NotifiedAt`, which closes the alert. A later return to stock tells nobody who has not pressed "Tell me when it's back" again.
- **Only a public shop tells.** When the shop is not public as the stock returns (paused, on hold), nobody is told and the alerts stay open for the next time; a member could not open the product anyway.
- **The notification** is of a new kind, `product`: title "{product} is back in stock", detail "{shop} has it again. You asked to be told.", target the product page. The browser gives the kind the bag icon and the toast action "View in shop" (L2-066 AC5).
- **The e-mail belongs to "Request updates".** The alert is something the member asked a shop for, so the category is `requests`; the member's switch, an unconfirmed address and a bounced address each stop it, and the notification is still created (L2-068 AC2). It carries the unsubscribe link of its category like every e-mail of the outbox. It is queued at once, with no delay.
- **The owner's sold-out toast comes from the server's answer.** `ProductRowDto` gains `stockChange` (`none`, `became-sold-out`, `back-in-stock`); the answer of a save says what the save did to the stock, so the page does not guess from what it last loaded. The warning toast takes the place of "Product updated" or "Product added": one save, one toast. Stock that reaches 0 because the owner confirmed an order shows no toast: L2-036 AC3 is about the owner setting the stock.
- **"Sold out" on a card is the tile's tag.** `ProductCardDto` gains `soldOut` and `jb-product-card` passes "Sold out" to `jb-media-tile` as its tag, the badge the product page already shows. No new component. Because the DTO is shared, every product card says it: the shop page, "More from {shop}", the browse home and the saved page.
- **The preview status is a new field, `status`.** `stage` alone cannot say why a live listing is not public (paused, on hold). `ListingPageDto.Status` is `live` for a public listing, otherwise the first that applies of `on-hold`, `paused`, `draft`, `ready-to-review`, `changes-requested`, `declined`; the browser turns it into the words of the owner workspace (L2-219). `stage` stays for its readers.
- **A deleted listing is not found for everyone**, its owner and the verification team included: it has no status to preview.
- **The verification team's preview shows no member actions.** Booking, messaging, saving, sharing and reporting a listing that is not public would each fail on the server, so the page does not offer them.

## Consequences

- ADR 0007's open items for L2-036 AC2 and AC3 and ADR 0025's deferral of the "product back in stock" notification are closed.
- The recorded API answers of the e2e suite gain `soldOut` on product cards, `status` on listing pages and `stockChange` on the owner's product rows.
- A back-in-stock e-mail follows "Request updates"; there is no switch of its own. If members ask for one, it is a new category in `EmailCategories` and a new row on the settings page (L2-016).
- A daily summary (L2-016 AC6) is not built by any category yet; when it is, this e-mail joins it like the other "Request updates" e-mails.
