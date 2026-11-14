# Jubilee personas

Seventeen people in Toronto who come across Jubilee. They are invented: no persona is a real
person, congregation or business. They exist so that requirements, designs, mocks and copy are
tested against someone in particular, and each is read in the light of the mission
([`../specs/L0.md`](../specs/L0.md)):

> Jubilee helps Christian business owners in Toronto do well in business and use what they earn to
> support God's work. We do this because we love Jesus and stay close to Him.

The personas use the roles of [`../specs/L1.md`](../specs/L1.md): visitor, member, owner and
renter. What they say Jubilee does today follows [`../specs/L2.md`](../specs/L2.md); what they
wish it did is in each `feedback.md`.

## What each folder holds

| File | What it tells |
|---|---|
| `README.md` | Who the person is: household, work, church, what they want and what worries them. |
| `onboarding-journey.md` | How they find Jubilee, and their experience from first contact to the first moment of value. |
| `profile-setup-journey.md` | How they set up their profile and, if they list, their business or space, with the values they would type. |
| `feedback.md` | Feedback they might send through Rate, Report a bug and Kudos, and how Jubilee could better suit their needs. |

## Business people and members

| Persona | Who | Role on Jubilee | What they test |
|---|---|---|---|
| [Daniel Okafor](daniel-okafor-software-developer/README.md) | 34, software developer, Liberty Village | Member, then owner (Business & tech) | A member who becomes an owner; a technical eye on rough edges. |
| [Marcus Chen](marcus-chen-financial-consultant/README.md) | 46, independent family financial consultant, Agincourt | Owner (Financial & insurance) | A regulated profession: credentials, compliance and how money is spoken of. |
| [Sofia Reyes](sofia-reyes-photographer/README.md) | 38, family and wedding photographer, Mimico | Owner (Media) | A visual business with a family calendar: portfolio, bookings, deposits. |
| [Rajan Thomas](rajan-thomas-software-architect/README.md) | 51, software architect, Willowdale | Member | A buyer who wants evidence: privacy, security and how Jubilee keeps listings honest. |
| [Tomasz Kowalski](tomasz-kowalski-construction-worker/README.md) | 29, construction worker, Roncesvalles | Owner (Home & property) | Weekend work that is barely a "business"; a phone on a building site; English as a second language. |
| [Devon Campbell](devon-campbell-used-car-salesman/README.md) | 44, used car salesman, West Hill | Member, uncertain owner | An employee, not an owner, in a trade with no category. |
| [Luis Herrera](luis-herrera-mechanic/README.md) | 39, mechanic and garage owner, Weston | Owner | A real shop with no automotive category; urgent calls. |
| [Grace Kim](grace-kim-graphic-designer/README.md) | 27, freelance graphic designer, Willowdale | Owner (Media) | A designer's eye on the product; meeting other business people, not only customers. |
| [Amara Mensah](amara-mensah-quality-analyst/README.md) | 31, quality analyst on parental leave, Scarborough Village | Member | A tester who finds the edges, one-handed at 3 a.m., and follows up her bug reports. |
| [Eleanor Whitfield](eleanor-whitfield-stationery-artist/README.md) | 62, stationery artist, the Beaches | Owner (Shops) | A home-based maker with modest confidence in technology; order requests without payment. |
| [Miriam Haddad](miriam-haddad-home-cook/README.md) | 55, home cook, Wexford | Owner | Food sold by word of mouth, with no food category and home-kitchen rules. |
| [Olena Bondarenko](olena-bondarenko-house-cleaner/README.md) | 41, house cleaner and newcomer, Bloor West Village | Owner (Home & property) | An English-only app read through translation; starting again without references. |
| [Caleb Wright](caleb-wright-bookkeeper/README.md) | 58, bookkeeper, East York | Owner (Financial & insurance) and member | Screen reader and keyboard only: accessibility as the whole experience. |

## Rooms and rentals

| Persona | Who | Role on Jubilee | What they test |
|---|---|---|---|
| [Victoria Lam](victoria-lam-executive-landlord/README.md) | 49, executive with five rental properties, Leaside | Owner (Long term spaces) | Several spaces, a delegate, choosing tenants rightly, wealth held as stewardship. |
| [André Baptiste](andre-baptiste-family-seeking-home/README.md) | 42, unemployed, family of five, Scarborough | Member and renter | Finding a home under pressure with only a term filter; dignity in need. |
| [Ruth D'Souza](ruth-dsouza-homeowner-renting-room/README.md) | 67, widowed homeowner, East York | Owner (Room) | Renting a room in the home she lives in: safety, her address, what to say and ask. |
| [Joshua Tan](joshua-tan-student-subletting/README.md) | 21, international student, Kensington Market | Owner (Roommate) | A tenant who sublets: consent, urgency, and language that does not sound like him. |

## What the personas say together

Themes that recur across the `feedback.md` files. They are observations, not requirements.

- **Categories.** The eleven categories have no place for cars (Devon, Luis) or food (Miriam), and
  some owners hesitate between two (Grace).
- **Who counts as a business.** Weekend work (Tomasz), an employee of someone else's business
  (Devon), a tenant with a room (Joshua) and a widow with a spare bedroom (Ruth) do not hear
  themselves in "Christian-owned business".
- **Showing the work.** Six photos is few for a photographer, a designer or a maker, and a
  regulated professional has nowhere to state a licence (Marcus, Caleb).
- **Gaps the personas found in the requirements.** Writing the journeys showed places where
  [`../specs/L2.md`](../specs/L2.md) is silent, and the personas meet them as friction. The
  service business page shows credential tags and "Languages" (L2-033), but no field in listing a
  business or Edit listing collects them (L2-072, L2-087). Photos are added in Edit listing, not on `/list`, so a listing
  goes live without one and its preview shows only the category tile. No field says how an owner declares "Free quote", "Emergency calls" or "Open
  Saturdays", or how a free-text "Area you serve" maps to the five area filters (L2-024). A shop
  has nowhere to set its delivery methods (L2-046, L2-091). Confirming a "Request a viewing"
  releases the exact address (L2-207, L2-208).
- **Finding a space.** Spaces can be filtered by term only: a family that needs three bedrooms at
  a rent it can carry (André) has to open every card, and a renter cannot say what they need.
- **Renting rightly.** Owners of spaces want to know what they may ask a renter and how to choose
  fairly (Victoria, Ruth), and several owners want someone else to help run a listing.
- **Language and access.** The app is in English only (Olena, Tomasz, André), and for Caleb every
  label, focus order and announcement is the product.
- **Trust.** Jubilee does not verify businesses (ADR 0057): owners agree to the statement of faith
  and to deal honestly, and the Jubilee team takes down listings that misrepresent a business.
  Members want to know how that works and to see what other members found (Rajan, Amara), and
  owners in trades with a poor reputation want a way to earn a good name.

## Using the personas

- Name the persona a requirement or design serves when it helps the reader ("Ruth lists a Room").
- A persona's suggestion is not a requirement. Anything taken up needs a requirement in
  [`../specs/`](../specs/), a detailed design and a mock before it is built, and must serve the
  mission.
- When the product changes, update the journeys of the personas it touches in the same change.
