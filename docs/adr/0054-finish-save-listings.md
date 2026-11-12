# 0054. Finish save listings

Status: accepted

## Context

Journey 19 (a member saves businesses and products to a private list) was recorded at 90%. ADR 0027
deferred the hearts on cards in lists, because the mocks showed the heart on the business page
only, and said the sign-out of journey 5 would call `SavedStore.reset()`. Nothing calls it: after a
member signs out, the hearts of the next person on the device still show the member's list until
the page is reloaded, and the next member to sign in is shown the old list, because the store reads
`GET /api/saved` once and never again. `L2-041` was silent on cards, on a heart whose request is on
its way, and on signing out; criteria 7 to 10 now say what happens.

## Decision

- **The heart sits beside the card's link, never in it.** A card is a link (`a[jb-business-card]`,
  `a[jb-product-card]`, `a[jb-space-card]`), and a button inside a link is invalid HTML that
  assistive technology reads as one control. `jb-saveable` (`div[jb-saveable]`, block `saveable`)
  wraps the card and draws its heart, `saveable__heart`, a toggle button over the top right of the
  card's picture. The card is unchanged, so its parity with the mocks holds; the media tag and the
  space badge stay at the top left.
- **The heart says its state in its name and `aria-pressed`, and its shape.** Unpressed it is named
  "Save {name}" and drawn as an outline; pressed it is named "Saved. Remove {name} from saved",
  carries `aria-pressed="true"` and is filled in the danger colour. The name of each heart is
  different, so a list of hearts can be told apart by a screen reader.
- **A heart on its way is busy.** `SavedStore` keeps the keys whose save or removal is unanswered;
  such a heart carries `aria-busy="true"` and a press is ignored until the server answers
  (`L2-041` AC8). The same guard applies to the hearts of the listing and product pages, so two
  quick presses can no longer race a save against its removal.
- **Hearts on cards are wired by one service.** `CardHearts` (`services/card-hearts.ts`) gives a
  page `isSaved`, `isBusy` and `press`; `CardHearts.attach()`, called by each page with hearts,
  reads the saved list when a member is signed in and finishes a visitor's save after sign-in. The
  pages with hearts on cards are Browse (featured, rooms and the shops' products), a category,
  search (the space cards), a business or shop page (its products, its related businesses and
  spaces) and a product page (more from the shop). Directory rows and search rows have no heart:
  they are the compact list, and the page they open has one. The welcome page, the saved page and
  the owner's previews have none either.
- **A visitor's save on a card is remembered for the tab.** A card has no page of its own to come
  back to with `?save=1`, so `PendingActionService` keeps `{ kind: 'save', returnPath, target }` in
  `sessionStorage`, and the sign-in prompt brings the visitor back to the page they were on. When
  that page attaches its hearts for a member, the remembered save for that path is taken and
  carried out once (`L2-012` AC4). A remembered save for another path is left alone, so a visitor
  who closed the prompt and signed in elsewhere has nothing saved behind their back.
- **The store is cleared whenever no member is signed in.** The application root resets
  `SavedStore` when `SessionService.member()` becomes null, which covers signing out, the server
  ending the session (`L2-116`) and a visitor at start-up. Reset forgets the keys, the loaded list,
  the busy keys and any list read still on its way, so the next member's list is read again from
  the server. The store keeps nothing in browser storage, so nothing else is left on the device.
- **The owner sees hearts on cards too.** A card does not know who owns it, and saving one's own
  listing harms no one; the owner's own page keeps "Edit listing" in place of its heart (ADR 0027).

## Consequences

- No change to the API: a space is a listing and is saved by its slug, which a test now proves.
  The saved endpoints stay without a rate limit: each is idempotent, takes the member from the
  session and is bounded by the 500-item limit, so more hearts on screen add no new way to load
  the server.
- `jb-saveable` is a new component of the `components` library with its design-system page and a
  parity spec; the mocks of every page with these cards draw the heart, and
  `pages/browse/saved-hearts.html` shows it saved, unsaved, busy and focused.
- ADR 0027's deferrals of the hearts on cards and of clearing the store on sign-out are closed by
  this record. Its other deferrals (a "Saved" link in the chrome, back-in-stock alerts) stand.
