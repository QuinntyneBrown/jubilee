# 0057. Ship without verification

## Status

Accepted, 12 November 2026. Supersedes ADR 0020 (verification decisions) and the verification
parts of ADR 0018, 0023, 0040, 0041 and 0052; each carries a note. Applies ADR 0036 (component
parity) to the changed copy and the removed components.

## Context

Until now an owner submitted a listing "for verification". It waited in a queue of the admin
application until a member of the verification team approved it, asked for changes or declined
it. Only an approved listing went live, and only it carried the "Verified" mark. A change of
name or category asked the team to re-check the listing, and a listing paused for a year went
back to the queue.

The owner has decided that Jubilee ships without verification. Owners publish their own
listings; the Jubilee team checks listings behind the scenes and acts where a listing
misrepresents a business. Jubilee therefore no longer says that a business is verified: the
mission asks Jubilee to be "honest, trustworthy and generous in what it builds and how it
speaks" (`L0-001`), and a mark that promises a check nobody made before publishing would not be
honest. What every owner still does is agree to the statement of faith and to deal honestly with
every customer (`L2-075`), and every member can still report a listing (`L2-039`).

## Decision

### Owners publish; a listing is live straight away

- **"Submit for verification" becomes "Publish listing".** A valid listing whose owner agreed to
  the statement of faith and confirmed their e-mail goes live at once and is public within 60
  seconds. The page says "{Business} is live. Members can find you in {category} now." with "View
  public listing", "Go to My business" and "Add more products" (or "Add more services"). A space
  follows the same rule with its title and "Rooms & rentals".
- **`POST /api/listing-drafts/{id}/publish` replaces `/submit`** (`PublishListingCommand`, `Listing.Publish`).
- **The stages are Draft and Live.** "Ready to review", "Changes requested" and "Declined" are
  removed (`ready-to-review`, `changes-requested`, `declined`). Paused, on hold and deleted stay
  the flags they were. `POST /api/listings/{id}/verification/resubmit` and
  `GET /api/listings/{id}/verification` are deleted.
- **Copy before publishing.** `/list` says "Free for Christian-owned businesses in Toronto. Your
  listing goes live as soon as you publish it." and "Offer both? Pick the main one now and add the
  other once you're live." An unconfirmed member reads "Confirm your e-mail to publish." and the
  statement-of-faith error is "Agree to the statement of faith to publish your listing." The live
  preview marks the card "Not published yet".
- **My business.** With no listing: "List your business free. Tell members what you offer, agree
  to the statement of faith and publish. You're live straight away. It takes about ten minutes."
  with "List your business". The pending, changes-requested and approved states and the
  verification banner are removed. A live listing's header says "Live since {Month YYYY}" and
  "Your listing" says "Live since {Mon YYYY}". The switcher names "{Business} · Live" or
  "{Business} · Draft".
- **No re-check.** A change of name or category is live when saved and sends nothing to anyone:
  the team e-mail, the owner's "We’ll re-check {Business}" notice and `RecheckRequestedAt` go.
- **Resume is always resume.** A paused listing is public again within 60 seconds of "Resume
  listing", however long it was paused. The pause dialog no longer says "You keep your verified
  status."

### No "Verified" mark anywhere

- `jb-verified-mark` and `jb-verified-business-label` are deleted from `components`, with their
  parity specs, design-system pages and mock regions. Business cards, directory rows, space
  cards, the product page ("Sold by {Business}"), the welcome page, the category page, the
  marketing site and the app preview carry no mark.
- The listing page's line above the name gives the category only ("Financial & insurance"); a
  space page gives the neighbourhood only ("Roncesvalles"). The API drops `verified` from every
  listing, card and search result.
- Counts say "{n} businesses", never "{n} verified businesses". "Newest" orders by the date a
  listing was published (`Listing.PublishedAt`, renamed from `ApprovedAt`).
- The owner's banner on their live listing reads "This is how members see your listing. It's
  live. Changes you make are published straight away." The preview of a listing that is not
  public gives the status "Draft · not published yet", "Paused · not public" or "On hold while we
  look into a report · not public" (`draft`, `paused`, `on-hold`).

### The Jubilee team, not the verification team

- Every word to members, owners and staff says "the Jubilee team". The staff role `verifier` is
  renamed `moderator` ("Moderator"); the stored flag keeps its value, so existing grants carry
  over and only the CLI (`jubilee staff grant --role moderator|admin`) and the wire name change.
- Help asks "How does Jubilee keep listings honest?" and answers "Every owner agrees to Jubilee's
  statement of faith and to deal honestly with every customer when they list. If a listing isn't
  honest about its business, report it from the listing page: the Jubilee team reads every report
  and takes down listings that misrepresent a business." The statement of faith's section "How a
  listing is confirmed" becomes "How listings stay honest" with the same link to Help.
- The marketing site drops "Every business is verified before it appears." and "Sending this form
  does not list or verify your business". The app preview's note "Verified by the Jubilee team"
  becomes "Every owner agrees to our statement of faith".

### The admin application: listings, reports and featured

- **`/listings` replaces the queue.** Every listing that is or was public, newest published
  first, with Business, Category, Owner, Published and Status ("Live", "Paused", "On hold"), a
  "Flagged" tag for the flags of `L2-072`, the summary "{n} listings · {n} published in the last 7
  days" and a search by name. Empty: "No listings yet. A listing appears here as soon as its owner
  publishes it." Failure: "We couldn't load the listings" with `JB-ADM-503`.
- **`/listings/:id` replaces the review.** It shows the name, "{category} · published {when} ·
  {status}", the Owner panel, the flags and the preview "How members see it", with one action:
  "Take down listing". There is no checklist and no approve, request-changes or decline.
- **"Take down listing"** opens "Take down {business}?" with "It leaves Jubilee straight away and
  {owner} is e-mailed your reason. Use this when a listing misrepresents a business.", "Reason
  for {owner}" (required: "Tell the owner why it was taken down."), "Keep it" and "Take down
  listing". The listing is deleted at once (`Listing.TakeDown` sets `DeletedAt` with `TakenDownAt`, `TakenDownByName` and `TakedownReason`), the owner is notified and e-mailed "We’ve
  taken down {Business}" with the reason, the action is written to the audit log as
  `listing.taken-down`, and the page says "Taken down. You took down {business} today at {time}.
  {Owner} has been e-mailed your reason." A moderator cannot take down their own listing (403); a
  second takedown answers 409 `ALREADY_TAKEN_DOWN`. The owner may list again.
- `/` opens `/listings`; the navigation reads "Listings", "Reports", "Featured". The app's old
  `/admin/verifications` links lead to `/listings`. `GET /api/staff/session` no longer counts a
  queue.
- **Endpoints.** `GET /api/admin/listings`, `GET /api/admin/listings/{id}` and
  `POST /api/admin/listings/{id}/take-down` replace `/api/admin/verifications/*` (queue, review,
  checklist, approve, request-changes, decline). Reports and featured keep their endpoints.

### The data migration

One new EF migration, `ShipWithoutVerification`; old migrations are never edited. In this order it
moves every listing in "Ready to review" or "Changes requested" to Live with `PublishedAt` set to
when it was submitted (its owner had asked to go live), closes every "Declined" listing as before (deleted, at the Draft stage),
renames `ApprovedAt` to `PublishedAt`, drops `ApprovedBy` and `RecheckRequestedAt`, adds the three takedown columns, and drops
the tables of review ticks and decisions. The audit log keeps every past decision.

### What this changes in ADR 0053, ADR 0055 and ADR 0056

- **A new business is new when it is published** (ADR 0053, L2-222): the publish handler tells the
  members who asked to hear of new businesses in its category, and the weekly note lists the
  businesses published in the last 7 days, under "These businesses joined Jubilee this week in
  categories you’ve browsed."
- **The team's e-mail is the Jubilee team's** (ADR 0055): `VerificationTeam.Tell` and
  `VerificationSettings` become `JubileeTeam.Tell` and `TeamSettings` in the `Moderation`
  namespace, and the address is `Moderation:TeamEmail`, else `Launch:TeamEmail`. No deployment
  set `Verification:TeamEmail`. The report e-mail says the reporter's name "is shown to the
  Jubilee team in the admin application only".
- **"Ask for access" e-mails the Jubilee team** (ADR 0056) through the same `JubileeTeam.Tell`.
- **The owner's other listings** (L2-079 AC3), which the review screen named, are named with their
  stages on the listing's screen of the admin application ("Laurent Photography · Live, Laurent
  Studio · Draft"). The review's "No products or services yet" goes with the review.

### Requirement numbers

`L1-014` becomes "Jubilee team administration and moderation" and `L1-015` drops the verified
mark. `L2-098` to `L2-101` are rewritten for the Jubilee team, the listings list, one listing and
the takedown; `L2-102` (request changes), `L2-103` (resubmission), `L2-104` (decline) and `L2-111`
(verified mark) are removed and their numbers are not reused. `L2-078` becomes "Publish a
listing".

## Consequences

- An owner is live in about ten minutes, with no wait. A listing that misrepresents a business
  can be public until the team finds it or a member reports it; the team takes it down from the
  admin application, and the owner is told why.
- Jubilee promises nothing it does not do: no page, e-mail or pitch says "verified".
- E-mail confirmation (`/verify-email`) is not business verification and stays: a member still
  confirms their e-mail before publishing or messaging.
- Staff whose role was `verifier` keep their access as `moderator`; scripts that call
  `jubilee staff grant --role verifier` must say `moderator`.
