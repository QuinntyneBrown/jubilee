# 0058. Reviews: verified by a confirmed request, one per member and listing, one public reply, moderated in the reports queue; photos, Helpful and the Top rated shelf deferred

## Status

Accepted, 12 November 2026. Applies ADR 0009 (tests without a database), ADR 0035 (presentation
in the components library), ADR 0036 (component parity) and ADR 0040 (the admin application).
Requirements L1-031 and L2-225 to L2-239; journey 32.

## Context

The Magic Patterns design draws reviews in the Jubilee App prototype: the "Write a Review" frame,
the Reviews section of the "Listing" frame, `RatingInline` on the business, space and product
cards, and the shared `Stars.tsx` and `reviews.ts`. All its reviews are sample content, and the
prototype decides nothing about who may review, what "Verified" means when Jubilee takes no
payment, what of the author is shown, how a review is moderated or what happens to it when an
account goes. Reviews are about honest dealing (Proverbs 11:1, Matthew 5:37): the decisions below
keep the measure honest and the copy free of any push towards a good review.

## Decision

- **Who may review: a member with a confirmed or completed request.** A member may review a
  listing once the owner confirmed one of their requests for it (`RequestStatus.Confirmed` or
  `Completed`, any kind: booking, quote, order or space). A member with no such request may not
  review at all (403 `NOT_ELIGIBLE`): an unverified review is the false balance reviews exist to
  prevent. So every review is Verified, and the "Verified" mark stays to say so. Because Jubilee
  takes no payment, the words are "Verified means {name} confirmed the reviewer’s request on
  Jubilee." and not the frame's "made a booking, purchase or stay through Jubilee". The request is
  checked when the review is written, not afterwards: a later cancel does not take a review down.
- **One review per member per listing, editable and removable.** The handler refuses a second
  (409 `ALREADY_REVIEWED`); a review the author removed or the team took down frees the place. An
  edited review shows "Edited" beside its date, and its reply stays. Removing deletes the review
  with its reply and its reports. An edit tells nobody.
- **The item** is one of the listing's services or products by id, as `reviewableItems` does;
  `?item={id}` chooses one. A listing with one, or none, asks nothing: the review is about that one,
  "Their service" or "A purchase". A space's item is "My stay" (Short stay) or "Renting here". The
  item's name is kept on the review, so a renamed or deleted product does not empty it.
- **Name shown: first name and last initial**, as it was when the review was written ("Joanna
  A."), with initials in a circle. No context line (a church or a neighbourhood) is shown: the home
  church is private (L1-020) and Jubilee does not collect a neighbourhood. There is no "Anonymous"
  choice for now: a review stands by a name, and the counselling case of the frame is deferred
  until a counselling business asks for it.
- **The owner's reply** is one public reply per review, kept on the review row (`ReplyText`,
  `RepliedAt`, `ReplyEditedAt`, `ReplyFrom`), not a table of its own: there is never more than
  one. The owner replaces it with the same `PUT`; it shows "Edited". The first reply tells the
  author; a change tells nobody. An owner never removes a review: they report it like anyone.
- **Notifications** use `NotificationRules.Tell` (kind `review`, the star icon) and
  `EmailPolicy.Queue` under the existing "requests" e-mail category, because a review follows a
  request: the owner of a new review; the author of the first reply; the author of a review taken
  down, with the reason. No new e-mail preference is added.
- **Moderation in the existing reports queue.** Anyone signed in reports a review (not their own)
  with a reason and an optional note; `ReviewReport` is a third kind of report beside listing and
  conversation reports, loaded by `ReportStore`, so `/reports` in the admin application lists it
  with the type "Review". The actions on a review report are "Dismiss", "Message the reporter" and
  "Take the review down", which needs a reason the author reads and a resolution note, resolves
  every report of that review and writes an audit record. A taken-down review is kept, hidden, for
  12 months for the record, then deleted. The rules a review must follow: it is about the author's
  own dealing with the listing; it is honest; it names no other person and shares no private
  details (addresses, phone numbers, health); it carries no advertising or links; it uses no
  abusive or hateful words. A negative review that keeps these rules stays.
- **Photos are deferred**, and "Add photos (optional)" is left out of the mocks and the screen.
  They would need the photo pipeline of ADR 0014 and ADR 0039 (scanning, renditions, moderation of
  pictures of people's homes and faces) for a first version that does not need them. The frame's
  photo on a review is a known difference.
- **Helpful is deferred.** One mark per member per review is simple to store, but "Most relevant"
  would then rank by votes that can be gathered; a first version ranks without them. "Most
  relevant" puts reviews of the last 12 months first, then the longer text, then the newer.
- **The rating on cards needs 3 reviews.** Below 3 the card shows nothing: an average of one or
  two reviews misleads, and "New · no reviews yet" on most cards at launch says nothing useful.
  The listing page itself shows its rating from the first review. The "Top rated" shelf (the
  frame's `TOP_RATED`, 10 reviews) is deferred, as are ratings on each service row of a listing.
- **Stored counts.** `Listing` and `Product` hold the count of each star (`Stars1` to `Stars5`),
  updated in the same transaction as every review change. Cards are read in lists of up to 16; a
  query per card, or an aggregate per list, would cost more than five integers per row
  (L2-156). The average is computed from them, rounded half up to one decimal.
- **Reading: one public endpoint, sorted and filtered in the app.** `GET
  /api/listings/{slug}/reviews` (`[AllowAnonymous]`, on purpose) answers the summary, every
  review newest first, the caller's relation and whether they may write. A listing's reviews are
  few at launch; sorting and filtering them in the app keeps the bars and the sort instant and the
  offline cache whole. When a listing passes 200 reviews this becomes paging on the server.
  `?product={slug}` answers the reviews of one product.
- **Writing: a screen, not a dialog.** `/b/:slug/review` (page `write-review`, behind
  `memberGuard`) as the frame draws it; the posted state is a state of the page. Editing,
  removing, replying and reporting are CDK dialogs (`edit-review`, `remove-review`,
  `reply-review`, `report-review`).
- **Limits** (L2-137), counted in the handlers as reports are: 5 new reviews per member per day,
  30 edits and replies per hour, 10 review reports per day.
- **Account data.** Deleting an account deletes the member's reviews and the reports they sent
  and recounts the stars; the data download holds the reviews they wrote, the reports they sent
  and, for an owner, the reviews of their listings with their replies.
- **Copy.** The frame's prompt "What did they do well?" and its placeholders, which lead towards
  praise, become "What did they do, and how did it go? …" and "Say what happened, as you would
  tell a friend." No line asks for a good review or promises a rating. The posted screen says the
  review can be edited "from their page", because Jubilee has no list of one's reviews yet.
- **Before launch.** Reviews are app behaviour; the marketing site (ADR 0044, ADR 0047) is not
  changed.

## Consequences

- Every review on Jubilee can be traced to a request its business confirmed, so the "Verified"
  mark is true of all of them, and a business cannot be reviewed by people it never served.
- A new business shows no rating on its cards until three members have reviewed it.
- One migration adds `Reviews` and `ReviewReports` and the star counts on `Listings` and
  `Products`; `jubilee migrate` applies it. The seed adds sample reviews to three listings and one
  product so the recording and the mocks have them.
- Deferred, each its own later change: photos on reviews; "Helpful"; the "Top rated" shelf;
  ratings on service rows; a member's list of their own reviews; an anonymous choice for sensitive
  services; paging reviews on the server.
- `docs/design-reference/magic-patterns/README.md` lists the differences from the frames.
