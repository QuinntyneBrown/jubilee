# 0073. Jubilee sells its own merchandise: the Purpose Tee, paid by card on Stripe Checkout, from a page in the app open to visitors

## Status

Accepted, 13 November 2026. Implements L1-034 (L2-263 to L2-271). Narrows the sentence "Jubilee
does not take payment" of `AGENTS.md`, `README.md` and `docs/specs/L1.md` to what it always
meant: payment between members and businesses. ADR 0017 (order requests) is unchanged. Applies
ADR 0009 (tests without a database or a network), ADR 0010 (only behaviour tests run), ADR 0035
(presentation in the components library), ADR 0036 (component parity), ADR 0038 (e-mail through
the outbox) and ADR 0044 (the marketing site links nowhere while launching soon).

## Context

> Abiding in Jesus and for love of Him, Jubilee equips Christian business people in Toronto to
> prosper with purpose and resource His Kingdom.

Jubilee is free to the Christian business people it serves, and it has to be paid for. The Magic
Patterns "Marketing Site" prototype has a frame, "Purpose Tee", that sells a black tee printed
with "Prosper with purpose." on the front and the J mark and `jubilee.to` on the back, in three
fits (Youth, Women's, Men's), each size with its own stock, at $25 CAD. Every shirt sold helps
keep Jubilee free, and gives its wearer an easy way to say what Jubilee is for.

Jubilee's rule is that it takes no payment (AGENTS.md, L1, L1-028, L1-031, L1-033, ADR 0017): a
member pays the business directly, and Jubilee never stands between them, holds funds or prices a
business's goods. The rule exists so that Jubilee is a directory and a meeting place, not a
merchant over its members. Selling Jubilee's own shirt is a different thing: Jubilee is the seller,
the goods are its own, and no member or business is party to the sale. We had to decide whether the
rule covers it, how a card is taken without Jubilee ever holding card data, where the page lives,
whether a buyer needs an account, how the bag is kept, how tax and delivery are handled, and what
the team must configure.

## Decision

### The scope of "Jubilee takes no payment"

- **The rule is about members and businesses, and it stays whole.** Jubilee takes no payment
  between a member and a business, holds no funds for them and prices nothing of theirs. Booking,
  quote, order and space requests, reviews and platforms are unchanged.
- **Jubilee may sell its own merchandise.** The texts that state the rule say "Jubilee takes no
  payment between members and businesses" and name L1-034 as the one place Jubilee is paid, for
  its own goods. This serves L0-001: the sale funds a free Jubilee for the people the mission
  names, and nothing in it touches a member's dealings with a business.
- **Only the Purpose Tee in black is sold.** Other colourways, other products and a storefront are
  deferred. The marketing site does not link to the page while it is launching soon (ADR 0044).

### The provider: Stripe Checkout, hosted

- **The card is taken on Stripe's hosted Checkout page.** The app sends the buyer to
  `checkout.stripe.com`; card numbers never reach a Jubilee page, the API, the database or a log.
  Jubilee stores no card data, and no Stripe script runs on a Jubilee page. Jubilee is in PCI DSS
  SAQ A scope.
- **No Stripe SDK.** Jubilee makes one call to Stripe (create a Checkout Session) and receives one
  kind of call (the webhook). `StripePaymentGateway` (Infrastructure) creates the session with a
  form-encoded `POST https://api.stripe.com/v1/checkout/sessions` through a typed `HttpClient`,
  behind `IPaymentGateway` (Application). The webhook's signature is checked by
  `StripeSignature` (Application), which follows Stripe's documented scheme (`Stripe-Signature`:
  `t=` and `v1=`, HMAC-SHA256 of `{t}.{body}` with the endpoint secret, compared in fixed time,
  refused when `t` is more than 5 minutes from now). It needs no network, so the API tests run the
  real check on signed and unsigned events (ADR 0009); only the gateway is faked.
- **Canadian dollars only, prices on the server.** The product and its variants are rows
  (`MerchProduct`, `MerchVariant`), prices in cents. The checkout body names variants and
  quantities and the unit price the buyer saw; the server re-prices every line from its rows and
  refuses a line whose price changed (422 `validation_failed`, `PRICE_CHANGED`) or whose stock is
  short (`ONLY_LEFT:{n}`, or `SOLD_OUT`). Stripe receives `price_data` the server computed, never a
  price from the browser.
- **Delivery: shipped in Canada or picked up.** The buyer chooses in the bag: "Ship to me" (Canada
  only, $9, free when the shirts come to $60 or more, 3 to 5 business days) or "Pick up at the
  Jubilee gathering in Toronto" (free). The shipping fee and threshold are stored on the product,
  not in code. Stripe collects a shipping address, limited to `CA`, only for a shipped order.
- **Tax by Stripe Tax, when Jubilee is registered.** Prices are before tax. With
  `Stripe:AutomaticTax` on (the default), the session asks Stripe Tax to compute GST/HST/PST from
  the address; the page says "Tax is added at checkout." While Jubilee is a small supplier not
  registered for GST/HST, the owner sets `Stripe:AutomaticTax=false` and no tax is charged. Jubilee
  never computes tax itself (as ADR 0017 for order requests).
- **The webhook is the only source of "paid".** `POST /api/merch/webhooks/stripe` takes
  `checkout.session.completed` (paid when `payment_status` is `paid`),
  `checkout.session.async_payment_succeeded` and `checkout.session.expired`. A paid event marks
  the order `Paid` once, lowers each variant's stock and queues two e-mails in the same save: the
  buyer's confirmation and the team's notice (ADR 0038). A repeated event changes nothing and
  answers 200. The return to the app proves nothing: the thanks page asks the API for the order's
  status and shows "pending" until the webhook has come.
- **Return addresses.** `success_url` is `{App:PublicBaseUrl}/purpose-tee/thanks?order={reference}`
  and `cancel_url` the same with `&cancelled=1`. The reference is a random 128-bit token of the
  order, not its id and not Stripe's session id; it is the only key the thanks page has, and the
  answer it gets holds no personal data.
- **Stock is held while an order is pending.** A pending order's lines count against the stock it
  can sell until the session expires (Stripe's minimum, 30 minutes), so two buyers cannot both pay
  for the last shirt. Stock is lowered when the order is paid. A variant whose stock is null is not
  counted (the frame's sizes with no stock figure).

### The page, the bag and the buyer

- **The page is in the app, at `/purpose-tee`, open to visitors**, with `/purpose-tee/thanks` for
  the return. It uses the app shell (`shell: 'app'`); the frame's header, its "Why Jubilee" and
  "Shop" links and its footer are the app's top bar, tab bar and footer. `/shop` and `/b/…/p/…` are
  not used: they read as a listing's words.
- **No account is needed.** Stripe Checkout collects the e-mail address and, for a shipped order,
  the address. A signed-in member is not asked to sign in and the order is not tied to their
  account; it is not part of their data download (it is Jubilee's sale record, kept for the time
  the law requires).
- **The bag is per browser.** It is kept in `localStorage` (`jubilee.bag`), holds lines across fits
  and sizes (variant, quantity), and is re-priced from `GET /api/merch/purpose-tee` each time it is
  shown and by the API at checkout. It is cleared when the thanks page finds the order paid. The
  bag button and its count sit in the page's own header row beside the back link: the app's top bar
  is the same on every screen, and a count there would be on screens that sell nothing.
- **Quantity is 1 to 10 per line, never above what can be sold.**

### Settings and secrets

| Setting | What it is | Where |
|---|---|---|
| `Stripe:SecretKey` | The restricted or secret API key (`rk_live_…`/`sk_live_…`) | Key Vault, referenced from the App Service |
| `Stripe:WebhookSecret` | The endpoint's signing secret (`whsec_…`) | Key Vault |
| `Stripe:AutomaticTax` | `true` (default) or `false` | App setting |
| `Merch:TeamEmail` | Where the new-order notice goes; `Launch:TeamEmail` when empty | App setting |

No publishable key is needed: the app follows the session's URL and loads no Stripe script. None of
these is committed. Without `Stripe:SecretKey` checkout answers 503 with the code
`checkout_unavailable` and the page says "Checkout isn't open yet." Without
`Stripe:WebhookSecret` the webhook refuses every event (400 `signature_invalid`).

### Limits

Checkout: 10 an hour per IP address. The order status: 60 a minute per IP address. The webhook: 600
a minute in all (Stripe retries). The product read shares the directory's budget (L2-137).

## Consequences

- Stripe is one more third-party host. The API calls `api.stripe.com`; the browser navigates to
  `checkout.stripe.com`. The app sends no `Content-Security-Policy` today; when one is added it
  needs nothing for a top-level navigation, and `form-action` stays `'self'` because the app
  follows a URL rather than posting a form. The API's own CSP (`default-src 'none'`) is unchanged.
- The team sees orders in the e-mail each paid order sends and in the Stripe dashboard, where
  refunds and exchanges are made. An admin screen for orders is deferred.
- Orders are personal data: the buyer's e-mail, name and address. Paid orders are kept 6 years for
  Jubilee's tax records and then stripped of the e-mail, name and address; orders that were never
  paid are deleted 30 days after they expired (L2-270).
- The owner must create the Stripe account, the webhook endpoint
  (`https://app.jubilee.to/api/merch/webhooks/stripe`, with the three events above), set the
  settings, and decide on tax registration before the page can take a payment. Until then it
  shows the shirt and answers checkout with "Checkout isn't open yet."
- Deferred: other colourways and products, an admin screen, refunds in the app, shipping outside
  Canada, discount codes, saved payment methods and a link from the marketing site.
