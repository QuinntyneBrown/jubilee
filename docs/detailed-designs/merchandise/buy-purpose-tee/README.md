# Buy the Purpose Tee

## Overview

Jubilee takes no payment between members and businesses: members pay the business directly. The
one thing Jubilee sells is its own merchandise, and the first of it is the Purpose Tee, a black
shirt printed "Prosper with purpose." (`L1-034`, ADR 0073). Every shirt sold helps keep Jubilee
free for the Christian business people of Toronto, which is the mission's "resource His Kingdom"
in the plainest form: the shirt pays for the directory, and it gives the wearer an easy way to say
what Jubilee is for.

This feature covers the whole slice: the Purpose Tee page in the app, the bag kept on the device,
checkout on Stripe's hosted page, the webhook that marks an order paid, the return page, the
buyer's and the team's e-mails, the tables, the seed, the limits and the jobs that expire and
erase orders. The mocks are `docs/mocks/pages/purpose-tee/` (ten states),
`docs/mocks/pages/purpose-tee-thanks/` (six), `docs/mocks/dialogs/bag/` (eight) and the two
e-mails `docs/mocks/emails/merch-order-paid.html` and `merch-new-order.html`. The Magic Patterns
frame "Purpose Tee" is their source; what the product changes from it is listed in
`docs/design-reference/magic-patterns/README.md`.

The page never says or implies that buying the shirt brings prosperity. Deuteronomy 8:18 is quoted
word for word in the story section, away from the price and every button (`docs/scripture.md`).

The terms below are local to this feature.

- **buyer** — anyone who buys, with or without an account; an order is not tied to an account
- **fit** — Youth, Women’s or Men’s; each has its own sizes, note and guide note
- **size** — one size of one fit, sold under its **SKU** (`youth-XS`, `womens-M`, `mens-3XL`)
- **stock** — how many of a size are on hand; null when it is not counted
- **hold** — the quantity of a pending order, set against the stock until it is paid or expires
- **left** — what can still be sold of a size: its stock less the holds, never below 0; null when the stock is not counted
- **bag** — the lines a buyer has chosen, kept on the device in `localStorage` under `jubilee.bag`
- **delivery** — `ship` (Canada Post in Canada, $9, free from $60) or `pickup` (free, at the Jubilee gathering in Toronto)
- **order number** — what a person reads: `PT-` and six characters (`PT-4F7K2Q`)
- **reference** — what a link holds: 128 random bits, base64url, the only key of the return page
- **payment provider** — Stripe; Jubilee uses its hosted Checkout page and its signed webhook, and no SDK or script

## Description

### Backend

The feature follows the pattern of the other features: entities in `Jubilee.Domain`, MediatR
commands, queries and handlers in `Jubilee.Application`, EF configurations, a migration and the
Stripe client in `Jubilee.Infrastructure`, a thin controller in `Jubilee.Api` and a job in
`Jubilee.Worker`. The rules live in the handlers and the entities.

- **`MerchProduct`** — domain entity (`backend/src/Jubilee.Domain/Merch.cs`): `Id`, `Slug`
  (`purpose-tee`), `Name`, `Colour`, `UnitPriceCents`, `Currency` (`CAD`), `ShippingCents` and
  `FreeShippingFromCents`, and its `Variants`. The price and the shipping are rows, never
  constants, so a change of price is a change of data (`L2-263` AC5).
- **`MerchVariant`** — one size: `Id`, `ProductId`, `Sku` (unique), `Fit` (`MerchFit`), `Size`,
  `Ages` (youth only), `ChestInches`, `LengthInches`, `Stock` (null when not counted) and
  `SortOrder`. `TakeStock(quantity)` lowers the stock, never below 0, and answers whether it was
  short (`L2-268` AC6).
- **`MerchOrder`** — `Id`, `Number`, `Reference`, `Status` (`Pending`, `Paid`, `Expired`),
  `Delivery` (`Ship`, `Pickup`), `SubtotalCents`, `ShippingCents`, `TaxCents`, `TotalCents`,
  `Currency`, `CheckoutSessionId`, `CreatedAt`, `ExpiresAt`, `PaidAt`, and, once paid,
  `BuyerEmail`, `BuyerName` and `ShippingAddress`, with `PersonalDataErasedAt`; and its `Lines`.
  `Start(...)` prices it from the variants and the product; `MarkPaid(...)` is the only way to
  paid and does nothing on a paid order; `Expire(now)` does nothing on a paid one;
  `ErasePersonalData(now)` clears the three fields. It holds no card data (`L2-270` AC4).
- **`MerchOrderLine`** — `Id`, `OrderId`, `VariantId`, `Sku`, `Fit`, `Size`, `Quantity` and
  `UnitPriceCents`, copied when the order starts so that a later change of price changes no
  order.
- **Persistence** — `IAppDbContext` and `AppDbContext` gain `MerchProducts`, `MerchVariants`,
  `MerchOrders` and `MerchOrderLines`, each with an EF configuration: unique indexes on
  `MerchProduct.Slug`, `MerchVariant.Sku`, `MerchOrder.Number`, `MerchOrder.Reference` and
  `MerchOrder.CheckoutSessionId`; an index on `(Status, ExpiresAt)` for the holds and the expiry
  job. The migration `AddMerchandise` adds the four tables; `jubilee migrate` applies it, never
  the API.
- **Seed** — `jubilee seed` adds the Purpose Tee and its seventeen sizes when there is no product
  `purpose-tee`, with the stock of the frame (Youth L 3, Youth XL 0, Women’s XL 2, Men’s 3XL 2,
  the rest not counted). It never changes a product that exists, so it is safe to run again and
  never resets a stock the team has set.
- **`MerchFits`** — the fixed content of the three fits: name, note and guide note, in
  `Jubilee.Application/Merch/MerchFits.cs`, like the rest of Jubilee's content (`Content.cs`).
- **`GetMerchProductQuery`** — answers `MerchProductDto`: the name, colour, price, currency,
  shipping and free-shipping amount, and the fits in order with their sizes; each size has its
  `sku`, `label`, `ages`, `chest`, `length` and `left` (`L2-263` AC4). `left` is computed by
  `MerchStock.LeftAsync`, which subtracts the quantities of the pending orders whose `ExpiresAt`
  is still ahead (`L2-267` AC2).
- **`StartCheckoutCommand`** (lines of `sku`, `quantity`, `unitPriceCents`; `delivery`) — when
  `IPaymentGateway.IsConfigured` is false it throws `UnavailableException("checkout_unavailable")`
  before anything else (`L2-267` AC5). It then validates, collecting one code per field:
  `lines: REQUIRED`; per line `UNKNOWN`, `OUT_OF_RANGE` (1 to 10), `DUPLICATE`, `PRICE_CHANGED`,
  `ONLY_LEFT:{n}` and `SOLD_OUT`; `delivery: INVALID` (`L2-267` AC3). A valid checkout starts a
  `MerchOrder` with a new number and reference and `ExpiresAt` 30 minutes ahead, asks the gateway
  for a session, stores the order with the session id and answers the session's address. When
  the gateway fails, nothing is stored and it throws `UnavailableException("checkout_failed")`
  (`L2-267` AC6). The order is saved only after the session exists, so a failure leaves no hold.
- **`CheckoutSessionRequest`** — what the handler asks of the gateway: the order's reference, the
  lines (name "Purpose Tee · Black — {fit} {size}", unit amount, quantity), the shipping amount
  for a shipped order, whether to collect a shipping address (`CA` only), whether tax is automatic,
  the success and cancel addresses built from `App:PublicBaseUrl` (never from the request) and the
  expiry.
- **`IPaymentGateway`** (`Jubilee.Application/Merch/`) — `IsConfigured` and
  `CreateCheckoutSessionAsync(request) → CheckoutSession(Id, Url)`, which throws
  `PaymentGatewayException` when the provider refuses or cannot be reached. Tests replace it with
  `FakePaymentGateway`; no test reaches Stripe or any network (ADR 0009).
- **`StripePaymentGateway`** (`Jubilee.Infrastructure/Merch/`) — a typed `HttpClient` that posts
  the form-encoded `POST https://api.stripe.com/v1/checkout/sessions` with the secret key as a
  bearer token: `mode=payment`, `currency=cad`, one `line_items` entry per line with
  `price_data`, `shipping_options` with a fixed amount for a shipped order,
  `shipping_address_collection[allowed_countries][0]=CA` only when shipped,
  `automatic_tax[enabled]`, `client_reference_id` (the reference), `success_url`, `cancel_url`
  and `expires_at`. It sends an `Idempotency-Key` of the reference. It never logs the key or the
  body. There is no Stripe SDK: one call is all Jubilee makes.
- **`StripeSignature`** (`Jubilee.Application/Merch/`) — verifies `Stripe-Signature`
  (`t=…,v1=…`): the HMAC-SHA256 of `{t}.{body}` with the webhook secret, compared in fixed time
  with each `v1`, and `t` within 5 minutes of `TimeProvider`. The tests run the real verifier with
  a test secret and sign their own events.
- **`CompleteCheckoutCommand`** (the raw body and the header) — verifies the signature, or throws
  `ValidationFailedException` (`signature: INVALID`) answered as 400 `signature_invalid` by the
  controller (`L2-268` AC3). It reads `type` and `data.object`; finds the order by
  `CheckoutSessionId`; ignores an unknown session or type (`L2-268` AC5). A paid event
  (`checkout.session.completed` with `payment_status` `paid`, or
  `checkout.session.async_payment_succeeded`) on a pending or expired order calls `MarkPaid` with
  the buyer's e-mail and name (`customer_details`), the shipping address
  (`collected_information.shipping_details` or `shipping_details`), `total_details.amount_tax`
  and `amount_total`, takes the stock of each line, and adds the two `OutboxMessage` e-mails, all
  in one save (`L2-268` AC1, ADR 0038). A paid order is left as it is (AC2). `checkout.session.expired`
  expires a pending order (AC4).
- **`MerchEmails`** — the plain-text bodies of "Your Jubilee order {number}" and "New Purpose Tee
  order {number}: ship" (or ": pick up"), as the mocks of `docs/mocks/emails/merch-*` read. The
  team's address is `MerchSettings.TeamEmail`, or `Launch:TeamEmail` when it is empty; with neither
  only the buyer's is queued. A short stock adds its line to the team's e-mail (`L2-268` AC6).
- **`GetMerchOrderQuery`** — answers `MerchOrderDto`: `number`, `status`, `delivery`, `lines`
  (fit, size, quantity) and `totalCents`, and nothing of the buyer; an unknown reference throws
  `NotFoundException("order_not_found")` (`L2-269` AC7).
- **`ExpireMerchOrdersCommand`** — expires the pending orders whose `ExpiresAt` passed more than 5
  minutes ago (`L2-270` AC6). **`PurgeMerchOrdersCommand`** — deletes the orders never paid whose
  `ExpiresAt` is more than 30 days ago, and erases the e-mail, name and address of the orders paid
  more than 6 years ago (`L2-270` AC5, `L2-148` AC7); it answers the two counts.
- **`MerchSettings`** — a record read once by the Infrastructure composition: `SecretKey`
  (`Stripe:SecretKey`), `WebhookSecret` (`Stripe:WebhookSecret`), `AutomaticTax`
  (`Stripe:AutomaticTax`, true by default), `TeamEmail` (`Merch:TeamEmail`, else
  `Launch:TeamEmail`) and `PublicBaseUrl` (`App:PublicBaseUrl`).
- **`UnavailableException`** — new, in `Jubilee.Application/Errors/`, beside the others: the API
  answers 503 ProblemDetails with its `code` and the endpoint's error reference.
- **`MerchController`** — `[Route("api/merch")]`, `[AllowAnonymous]` on purpose: buyers need no
  account. None of its actions sets or needs a session cookie, so the anti-CSRF token does not
  apply. Its bodies refuse unknown fields (`L2-267` AC3).

| Endpoint | Does | Answer | Limit |
|---|---|---|---|
| `GET /api/merch/purpose-tee` | `GetMerchProductQuery` | 200 `MerchProductDto` | the directory's read limit |
| `POST /api/merch/checkout` | `StartCheckoutCommand` | 201 `{ url }`; 422; 503 `checkout_unavailable` or `checkout_failed` | 10 per IP an hour |
| `GET /api/merch/orders/{reference}` | `GetMerchOrderQuery` | 200 `MerchOrderDto`; 404 `order_not_found` | 60 per IP a minute |
| `POST /api/merch/webhooks/stripe` | `CompleteCheckoutCommand` with the raw body | 200; 400 `signature_invalid` | 600 a minute in all |

- **`MerchRateLimit`** — three fixed-window policies beside the others:
  `MerchRateLimit.Checkouts` (`RateLimits:MerchCheckoutsPerHour`, 10),
  `MerchRateLimit.OrderReads` (`RateLimits:MerchOrderReadsPerMinute`, 60) and
  `MerchRateLimit.Webhooks` (`RateLimits:MerchWebhooksPerMinute`, 600, one partition), answered
  429 `rate_limited` with `Retry-After` (`L2-270` AC7).
- **Error reference** — `JB-MERCH-503` on the product read, the checkout and the order read.
- **`MerchOrderJob`** — background service in `Jubilee.Worker`: every 5 minutes it sends
  `ExpireMerchOrdersCommand`; once a day `PurgeMerchOrdersCommand`; it logs the counts only.
- **Help** — the answer "Does Jubilee take payment?" of `Content.cs` says what `L2-263` AC6 says.
- **Tests** — `backend/tests/Jubilee.Api.Tests/MerchTests*.cs` exercise the four endpoints over
  HTTP on the EF Core InMemory provider with `FakePaymentGateway` and events signed in the test
  with a test secret (ADR 0009): each code, the holds, both 503s, the limits, the signature, the
  replay, both e-mails, the short stock, the return answers, the expiry and the purge.
  `Jubilee.Infrastructure.Tests` checks the form `StripePaymentGateway` posts, against a stub
  `HttpMessageHandler`, without a network.

### Frontend `api` library

- **`MerchApi`** — the contract: read the product, start a checkout, read an order.
  **`MERCH_API`** is its token and **`HttpMerchApi`** its implementation.
- **Models** — `MerchProduct`, `MerchFit`, `MerchSize`, `CheckoutRequest`, `CheckoutLine`,
  `Delivery`, `MerchOrder`, `CheckoutProblem` (the codes of a 422 by line).
- **`BagStore`** — `providedIn: 'root'`, a signal of the bag's lines (`sku`, `fit`, `size`,
  `quantity`, `unitPriceCents`), read from and written to `localStorage` key `jubilee.bag` in a
  `try`/`catch`, so a browser without storage still has a bag for the visit. It adds, changes,
  removes and clears lines; `count` and `subtotalCents` are computed. Pure helpers in
  `merch.ts` compute the shipping, the total, the money text ("$59.00") and the summary of lines
  ("Men’s L and Women’s M").

### Frontend `components` library

Presentation lives in `components` only (ADR 0035). Each component is `name.ts`, `name.html` and
`name.scss` with the rules of its block from `docs/design-system/assets/components.css`, and has
a parity spec (ADR 0036).

- **`TeeGallery`** (`jb-tee-gallery`, blocks `tee-gallery` and `tee`) — the stage with the front or
  back drawing, and the two thumbnails as toggle buttons; output `viewChange`.
- **`MerchHead`** (`jb-merch-head`) — kicker, heading with its accent, price and description.
- **`SegmentedChoice`** (`fieldset[jb-segmented-choice]`) — the fits as native radios with the
  sliding pill and the note.
- **`SizePicker`** (`fieldset[jb-size-picker]`) — the size chips as native radios, sold out
  disabled and named, the nudge, the status line and the size guide table.
- **`QuantityStepper`** (`jb-quantity-stepper`) — the two buttons and the `output`; size `sm`
  for the bag.
- **`AddToBag`** (`jb-add-to-bag`) — the main button and, once added, the status row with
  "Check out".
- **`BagButton`** (`button[jb-bag-button]`) — the bag with its count and accessible name.
- **`BagLine`** (`li[jb-bag-line]`) — one line of the bag with its stepper, remove and problem.
- **`MerchStory`** (`jb-merch-story`) — the section "Why “purpose” is the gold word.".
- **Icons** — `minus` and `chevron-down` join the icon set.

The bag's frame, the delivery choice, the totals, the alerts and the buttons are the existing
`jb-dialog`, `jb-radio-group`, `dl[jb-description-list]`, `jb-alert` and `jb-button`.

### Jubilee application

`frontend/projects/jubilee/src/app`. The application declares containers only.

- **Routes** — `purpose-tee` (`page: 'purpose-tee'`, `shell: 'app'`, title "Purpose Tee · Jubilee")
  and `purpose-tee/thanks` (`page: 'purpose-tee-thanks'`). Neither has a guard: no account is
  needed.
- **`PurposeTee`** page — reads the product through `MERCH_API`; holds the view, fit, size,
  quantity, nudge and added state as signals; composes the components; opens the bag with
  `Dialog` from the Bag button and "Check out". Loading and error use `jb-skeleton` and
  `jb-empty-state` with `JB-MERCH-503`.
- **`BagDialog`** (`dialogs/bag/`) — reads the product again when it opens to re-price the bag;
  shows the lines, the delivery, the totals and the alerts; "Check out" sends the checkout and,
  on 201, sets `window.location.href` to the provider's address through the injected
  `CHECKOUT_REDIRECT` token, so that a test replaces the navigation and never leaves localhost.
- **`PurposeTeeThanks`** page — reads `order` and `cancelled` from the query; reads the order;
  shows paid, pending (polling every 3 seconds for a minute), cancelled, not found and error;
  clears the bag when paid.
- **`app.config.ts`** — provides `MERCH_API` with `HttpMerchApi` and `CHECKOUT_REDIRECT`.
- **Tests** — Playwright behaviour specs with the page objects `purpose-tee.page.ts`,
  `bag.dialog.ts` and `purpose-tee-thanks.page.ts`; every `/api/merch` call is answered from the
  recording or a stub (ADR 0009), and the redirect is caught by the test.

## Requirements

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-263` | `L1-034` | The Purpose Tee page shall show the shirt, its price and its story from the API, with Deuteronomy 8:18 away from the price and no promise of prosperity, to anyone. |
| `L2-264` | `L1-034` | The buyer shall choose the view, the fit and the size; sold-out sizes are disabled and named; the size guide follows the fit. |
| `L2-265` | `L1-034` | The buyer shall choose a quantity from 1 to the lower of 10 and what is left, and add it to the bag, or be nudged to pick a size. |
| `L2-266` | `L1-034` | The bag shall hold lines across fits and sizes on the device, re-priced when opened, with the delivery and the totals before tax. |
| `L2-267` | `L1-034` | Checkout shall be priced by the server, refused with a code per line, and handed to the provider's hosted page; without a provider it shall say so. |
| `L2-268` | `L1-034` | An order shall be paid only on a signed event, once, lowering the stock and e-mailing the buyer and the team. |
| `L2-269` | `L1-034` | The return page shall say paid, pending, cancelled or not found, and shall empty the bag once paid. |
| `L2-270` | `L1-034`, `L1-019`, `L1-020` | No card data, server-side amounts, an unguessable reference, limits, expiry of holds and retention. |
| `L2-271` | `L1-034` | 360 to 1280 px, keyboard and touch, colour never alone, reduced motion, both themes. |
| `L2-137` | `L1-019` | The checkout, order read and webhook limits. |
| `L2-148` | `L1-020` | Orders never paid deleted after 30 days; paid orders' personal data erased after 6 years. |
| `L2-149` | `L1-020` | Order e-mails are transactional. |

## Diagrams

The PlantUML sources are in [`diagrams/`](diagrams/). They are not rendered: there is no PlantUML
on the machine that wrote this design.

### Containers

PlantUML source: [`diagrams/c4-container.puml`](diagrams/c4-container.puml).

`Jubilee Web` calls `/api/merch` on `Jubilee API`, which stores orders in `Jubilee database` and
creates a session on Stripe. The buyer's browser goes to Stripe's hosted page, pays there and
comes back to `Jubilee Web`. Stripe calls the webhook; `Jubilee Worker` sends the e-mails from the
outbox and expires and erases orders.

### Class structure — backend

PlantUML source: [`diagrams/class-backend.puml`](diagrams/class-backend.puml).

### Class structure — frontend

PlantUML source: [`diagrams/class-frontend.puml`](diagrams/class-frontend.puml).

### Behaviour — check out

PlantUML source: [`diagrams/sequence-checkout.puml`](diagrams/sequence-checkout.puml).

### Behaviour — the order is paid

PlantUML source: [`diagrams/sequence-webhook.puml`](diagrams/sequence-webhook.puml).

### Behaviour — the return page

PlantUML source: [`diagrams/sequence-return.puml`](diagrams/sequence-return.puml).

## Failure modes

| What fails | What the buyer sees | What happens to the order |
|---|---|---|
| No `Stripe:SecretKey` | "Checkout isn’t open yet." | None is made |
| Stripe refuses or cannot be reached | "We couldn’t open checkout." with `JB-MERCH-503` | None is kept; nothing is held |
| The buyer leaves Stripe's page | "Nothing was paid"; the bag is kept | Pending, then expired at 30 minutes; the hold ends |
| The webhook is slow | "We’re confirming your payment", then the paid page | Paid when the event arrives |
| The webhook never comes | After a minute: "Your receipt comes by e-mail once it’s confirmed" | Stripe retries for 3 days; the team sees the payment in Stripe's dashboard |
| The event arrives after the hold expired and stock ran out | The paid page | Paid; the team's e-mail says stock was short |
| The worker or the e-mail service is down | The paid page | Paid; the e-mails wait in the outbox (ADR 0038) |

## Open questions

Each was decided as the simplest option and recorded here; ADR 0073 holds the decision.

| Question | Answer |
|---|---|
| What does shipping cost? | $9 by Canada Post across Canada, free when the shirts come to $60 or more, stored on the product. The frame says "free over $60" and names no fee. |
| Is tax added? | Yes, by Stripe Tax (`Stripe:AutomaticTax`, true by default). Prices are before tax. Until Jubilee is registered for GST/HST the owner sets it false. |
| Does a buyer need an account? | No. The order is not tied to one; its reference is the key of the return page, and the receipt goes to the e-mail given to Stripe. |
| Where is the bag kept? | On the device, in `localStorage`. Nothing is sent until checkout; a server-side cart would need an account or a cookie for no gain. |
| When is stock lowered? | When paid. A pending order holds its quantity for 30 minutes, the life of its Stripe session. |
| What of the terms "Jubilee does not take payment or hold funds"? | They concern requests between members and businesses and stay true. The help answer is amended (`L2-263` AC6); the terms are left for the owner's next version of them. |
| Why the boxed accordion and an even split? | `jb-accordion` and `split--even` are the design system's; the frame's ruled details and 1.15:1 split are recorded as known differences. |
| Refunds and exchanges? | By the team in Stripe's dashboard; "Wrong size? Swap it free within 30 days, unworn." is handled by e-mail. No screen in the app. |

Deferred (ADR 0073): other colourways and products, an admin screen for orders, a link from the
marketing site, shipping outside Canada, discounts and saved payment methods.
