# 0074. Non-profits: a non-profit is a listing kind with its own category, its page links out to its own giving page or website, and it takes no requests and no reviews

## Status

Accepted, 14 November 2026. Implements L1-035 (L2-285 to L2-298); journey 35. Follows ADR 0042
(a space is a listing kind) and ADR 0072 (software platforms), whose shape it copies. Amends ADR
0072 in one place: the web-address rule of `PlatformRules` becomes the shared `WebAddressRules`,
which both kinds use. Applies ADR 0009 (tests without a database), ADR 0011 (search over the
database), ADR 0035 (presentation in the components library), ADR 0036 (component parity), ADR
0044 (launching soon), ADR 0057 (ship without verification) and ADR 0066 (reviews), which it
does not change for any other kind.

## Context

L0-001 says Jubilee helps Christian business owners "use what they earn to support God's work".
Much of that work in Toronto is done by Christian non-profits: youth ministries, food banks run
by churches, newcomer and housing ministries, campus and workplace fellowships. Jubilee listed
four kinds of listing (`Services`, `Shop`, `Space`, `Platform`), each derived from its category by
`Category.KindOf`, and none fits a non-profit: it sells nothing to the people it serves, takes no
booking or quote, and the way to support it is its own website or its own page for giving.

Three things make a non-profit harder to list honestly than a platform. Money is involved, so
the page must never look like Jubilee takes, holds or counts a gift. A charity has a registration
number with the Canada Revenue Agency, and showing one would read as a check Jubilee did not
make. And a star rating of a ministry is not a measure Jubilee can keep honest: no request
bounds who may review it, and the people it serves are rarely the people who would rate it. The
Magic Patterns design reference draws no non-profit.

The words are fixed in the requirements: a **non-profit**, kind `nonprofit`, in the category
**"Non-profits"** (`non-profits`); the owner of a non-profit is called its **leader** in copy
("Led by {owner name}", "Message leader"), whether they lead it or represent it; its **page for
giving** is its own page where people give, on its own site or the giving service it chose.

## Decision

- **`ListingKind.Nonprofit` is derived from the category, as `Shop`, `Space` and `Platform`
  are.** "Non-profits" is the thirteenth and last of thirteen fixed categories (`Category.All`,
  `Category.NonprofitsSlug`). A listing created in it is a `Nonprofit`; `Edit` refuses to move a
  non-profit out or any other listing in with `CATEGORY_LOCKED`, as it does for a space and a
  platform. Its wire value is `nonprofit` (`WireValues.Of`), and a draft's kind on the wire is
  `nonprofit` too.
- **The non-profit's own fields are an owned type, `NonprofitDetails`, on `Listing` and on
  `ListingDraft`.** It holds its mission (600 characters), who it serves (300), where in Toronto it
  works (120) and its page for giving (an optional address, 200). EF maps it with
  `OwnsOne(...).ToJson("Nonprofit")` into one nullable JSON column, exactly as `SpaceDetails` and
  `PlatformDetails` are, so every other listing leaves it null.
- **The website is `Listing.Website`, the field that already exists**, and on a draft
  `ListingDraft.Website`, which the platform added. For a non-profit it is required. Both the
  website and the page for giving follow the rule ADR 0072 set for a platform's address: an
  absolute `https` URL with a dotted host, no user or password, 200 characters at most. That rule
  moves out of `PlatformRules` into `WebAddressRules` (`IsWebAddress`, `Host`,
  `MaxWebsiteLength`), which `PlatformRules` now forwards to, so the two kinds cannot drift.
- **The page's main action is a plain link out, to the page for giving when there is one and to
  the website otherwise.** `ListingPageDto` gains `Nonprofit` (`NonprofitPageDto`: `website`,
  `host`, `giveUrl`, `giveHost`, `mission`, `serves`, `area`), null for every other kind. The app
  renders each address as an `<a>` with `target="_blank"` and `rel="noopener noreferrer nofollow"`
  and the text "Give on {host}" or "Visit {host}". There is no redirect endpoint and no click is
  counted: the address carries nothing of the member, and Jubilee learns nothing of who followed
  it, whether they gave or how much. The server never requests either address. An address that no
  longer passes the rule is left out of the answer instead of being linked. Under the links the
  page says "Opens in a new tab. Gifts go straight to {name}. Jubilee takes no gift or payment and
  has not checked this non-profit."
- **Jubilee takes, holds, counts and receipts no gift.** There is no donation form, no amount, no
  goal, no total and no receipt. This keeps L1-007 and ADR 0073 whole: the Purpose Tee is still
  the only thing Jubilee is paid for.
- **No charity registration number is asked, stored or shown.** We considered showing it as the
  organisation's own word with "Jubilee does not check it". We chose not to collect it: a
  registration number reads as a credential however it is captioned, a wrong or borrowed number
  shown on Jubilee would lend it Jubilee's name, and anyone who wants to check a charity can look
  it up in the Canada Revenue Agency's public list or ask the leader by message. Leaving it out
  claims nothing (Proverbs 11:1).
- **The copy never says registered, verified, approved, vetted or endorsed.** It says what is
  true: the leader agreed to the statement of faith (L2-075), the words are the non-profit's own,
  gifts go straight to the non-profit, Jubilee has not checked it, and the Jubilee team takes down
  a listing that misrepresents itself (ADR 0057). No verse is placed beside a link to give, no
  line flatters a giver and nothing promises that giving brings a return (`docs/scripture.md`,
  "What Jubilee never says"). The verses the feature rests on (2 Corinthians 9:11, Galatians 6:10,
  1 Chronicles 29:14, Acts 20:35) are quoted in L1-035, not on the page.
- **A non-profit is shown on the business card, not a card of its own**, with the "Non-profits"
  tile (a thirteenth icon, `hands`, and tint) and the short label "Non-profit". Nothing on a card
  is particular to it, and it never has a rating because it takes no reviews.
- **A non-profit is not a business, so it is not counted as one.** `WhereBusiness` leaves out
  non-profits as it leaves out spaces: they are not in "All {n} businesses", the browse groups,
  the welcome page's count or the fallback of "Featured this week". The browse home gains a shelf
  of its own, "Non-profits in Toronto" (`BrowseHomeDto.Nonprofits`, a `NonprofitShelfDto` of its count and up to
  four business cards in Recommended order, as `RoomsShelfDto` holds space cards), after the businesses' groups. The Jubilee team may still
  choose a non-profit for a featured slot, as for any listing. "More in Non-profits", the saved
  list and "New businesses" notifications (L2-222) treat it as any listing in its category.
- **Search gives non-profits a group of their own.** `DatabaseSearchIndex` matches a non-profit by
  name, line, mission, who it serves and where it works, in memory as it does for spaces and
  platforms (ADR 0011), and returns it as a hit of kind `nonprofit`, counted in
  `SearchResults.NonprofitCount` and not in `BusinessCount`. The search screen shows the group
  "Non-profits" only when it has a match, so a search that finds none reads as before. The
  addresses are not searched.
- **The category page reuses the platform branch**: no offers, no areas, no fact, "Sort" and
  paging kept, "{n} non-profits".
- **A non-profit takes no requests.** It has no services and no products, so a booking and an
  order request already find nothing to name. The quote handler refuses one for a non-profit with
  409 `NOT_OFFERED`, as for a platform. Messaging is per listing and unchanged; it is how a member
  offers to volunteer or partner, and the page calls it "Message leader".
- **A non-profit takes no reviews in this feature.** `ReviewRules.WritingAsync` answers
  `not-offered` for a non-profit to everyone, and starting or posting a review of one answers 409
  `NOT_OFFERED`. The page has no rating and no "Reviews" section. Reviews on Jubilee rest on a
  dealing the owner confirmed (ADR 0066) or, for a platform, on the member's statement of use
  (ADR 0072); for a ministry neither measures anything a giver needs, and a star average of the
  work of God is a measure Jubilee could not keep honest.
- **Onboarding and editing follow the platform.** `/list` gains a fifth card, "A non-profit",
  and `?kind=nonprofit`; the form shows the non-profit fields in place of the category, the items
  and the place. Edit listing shows the same fields in place of About, Category, Where, Hours and
  Website. The agreement is the checkbox of L2-075, unchanged; nothing else is asked, because
  Jubilee could not check a proof that the member leads or represents the non-profit.
- **The admin application shows the kind through what it already shows**: the category column of
  the Listings table, and on a listing's record the website, the page for giving, the mission, who
  it serves and where it works in a panel "The non-profit".
- **Marketing copy** names non-profits among what Jubilee lists, in the launching-soon page's own
  words (ADR 0044), and the pre-registration form's category list gains "Non-profits"; it adds no
  link.
- **Seed and mocks use invented non-profits** (Hope House Toronto, Bread & Bridges, Lakeshore Youth
  Collective), on `.example` addresses. FaithTech Toronto, UrbanPromise Toronto and Youth for
  Christ Toronto were the model for the kind; no real organisation is seeded, mocked or named in
  copy.

## Consequences

- One migration adds the `Nonprofit` JSON column to `Listings` and `ListingDrafts`; `jubilee
  migrate` applies it. SQLite and InMemory take the schema from the model.
- Code that switched on four listing kinds must handle a fifth; the compiler finds the switch
  expressions. Every copy of the category list gains the thirteenth entry.
- The search answer gains `nonprofitCount`; a client that ignores it sees non-profits as hits of
  an unknown kind, which the app does not.
- A non-profit's page cannot show social proof. If supporters ask for it, the remedy is a later
  decision (for example a business saying it supports a non-profit), not a rating.
- Deferred, each its own later change: taking, holding, counting or receipting donations, or any
  payment through Jubilee; checking that a non-profit is a registered charity, Christian or in
  Toronto; a business page showing the non-profits it supports, or any link between a business and
  a non-profit; events, volunteer sign-ups, programmes as bookable services, campaigns and goals;
  reviews of non-profits; non-profits outside Toronto; a charity registration number; a card of
  its own; a persona for a non-profit leader in `docs/personas/`; and a narrated video for
  journey 35.
