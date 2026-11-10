# 0004. Directory ordering rules

## Status

Accepted, 10 November 2026.

## Context

`L2-025` requires a documented "Recommended" score. The designs left the weights, the order
inside a category group, the choice of "From the shops" products and the category fact open.

## Decision

**Recommended score.** `score = 0.5 × completeness + 0.3 × responsiveness + 0.2 × recency`.
Each input is between 0 and 1.

| Input | Value |
|---|---|
| completeness | Share of these four that the listing has: a tagline, a highlight, at least one offer, at least one area served |
| responsiveness | `1 − median response minutes ÷ 1440`, kept between 0 and 1; `0.5` while the listing has no measured response time |
| recency | `1 − days since verification ÷ 365`, kept between 0 and 1 |

The score is stored on the listing and recalculated when the listing is approved. Ties are broken
by name. No input represents payment: paid placement does not exist.

**Sort names.** "Name A–Z" orders by a stored form of the name that is case-folded, stripped of
accents and stripped of a leading "The".

**Category groups on the browse home.** A group shows the first four businesses in Recommended
order.

**From the shops.** The browse home shows the five most recently added products of public
listings in the Shops category, newest first.

**Category fact.** The category page shows "{n} take emergency calls", the number of public
listings in the category that offer emergency calls, and leaves it out when the number is 0.

**Category tiles.** A listing without a cover photo shows its category's tile:

| Category | Tint | Icon | Short label |
|---|---|---|---|
| Shops | gold | bag | Shop |
| Financial & insurance | green | chart | Financial |
| Legal & immigration | blue | shield | Legal |
| Home & property | ink | wrench | Home |
| Real estate & living | gold | home | Real estate |
| Health & family | green | heart | Health |
| Business & tech | blue | briefcase | Business |
| Learning | blue | book | Learning |
| Media | ink | image | Media |
| Community | green | user | Community |

## Consequences

- Recency falls every day but the stored score changes only on approval. A scheduled job that
  refreshes the score belongs to the background-jobs journey; until then the order inside a
  category is stable between approvals.
- Responsiveness has no data until messaging exists, so completeness and recency decide the
  order for now.
- A product has no photo until uploads exist. It stores a tint and an icon for its tile.
