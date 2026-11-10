# Manage services

## Overview

Jubilee is Toronto's Christian marketplace: a directory of verified
Christian-owned businesses. A *service* is one piece of work a business offers,
such as a consultation, a lesson or custom work. Members do not pay through
Jubilee; they either book a time for a service or ask for a quote, and the owner
confirms or declines the request.

This feature covers the "Services" tab of the owner workspace at
`/my-business/services`. The owner sees each service with its name, detail and
price, adds and edits services in a dialog, deletes a service after a
confirmation, and moves services up or down to set the public order.

Each service has a *pricing* — one of "Free", "Fixed price" or "Ask for a quote"
— and a *member action* — what "Members can" do with it: "Book a time" or "Ask
for a quote". A bookable service has a duration and one or more *meeting modes*
(video, or in person at a place), and its bookable slots come from the listing's
hours. A listing holds at most 50 services.

## Description

The feature is a vertical slice from the services page in `Jubilee Web` to the
`Jubilee database`.

- **`MyServicesPage`** — Angular page at `/my-business/services`. It shows the
  count (for example "2 services"), "Add service" and each service with name,
  detail, price ("Free", an amount, or "Ask") and "Edit" and "Delete" actions.
  The empty state reads "No services yet. Offer custom work, consultations or
  lessons? Add them here so members can book or ask for a quote." The load-error
  state carries `JB-SVC-503`.
- **`ReorderControls`** — shared drag handle and move up and move down buttons,
  also used by `manage-products`.
- **`ServiceEditorDialog`** — dialog titled "Add a service" or "Edit service".
  It holds "Service name" (required), "Short detail" (optional, "Length, place or
  what to bring. 60 characters at most."), "Pricing", "Price (CAD)" and "Members
  can". "Price (CAD)" shows only for "Fixed price"; choosing "Free" or "Ask for a
  quote" hides and clears it. Choosing "Book a time" reveals the duration and the
  meeting modes. Its primary button reads "Add service" or "Save changes". A
  failed save shows "We couldn't save the service. Nothing was changed and what
  you typed is still here. Try again."
- **`DeleteServiceDialog`** — confirmation titled "Delete “{name}”?" with
  "Members can no longer ask for it. Open quote requests stay open. This can't be
  undone.", "Keep service" (focused by default) and "Delete service". A failed
  delete shows "We couldn't delete it. The service is still listed. Try again."
- **`ServicesApi`** and **`OwnerServicesStore`** — typed HTTP client and signal
  store. The client attaches an idempotency key from `IdempotencyKeyFactory` to
  each create.
- **`OwnerServicesController`** — ASP.NET Core controller for
  `GET` and `POST /api/owner/listings/{listingId}/services`,
  `PUT` and `DELETE /api/owner/listings/{listingId}/services/{serviceId}`, and
  `PUT /api/owner/listings/{listingId}/services/order`. It applies
  `ListingOwnerPolicy`; a member who does not own the listing receives `403`.
- **`AddServiceCommand`**, **`UpdateServiceCommand`** and
  **`ServiceCommandValidator`** — the editor requests and their shared rules.
  Failures return `422` with per-field codes: `SERVICE_NAME_REQUIRED` ("Enter a
  name for the service."), `PRICE_INVALID` ("Enter a price in dollars, like
  8.00."; required for "Fixed price" and validated as in `L2-091`: 0.01 to
  100,000.00 with at most two decimals), `DETAIL_TOO_LONG` (more than 60
  characters), `DURATION_INVALID` (outside 15 to 480 minutes),
  `MODE_REQUIRED` (bookable with no meeting mode) and `PLACE_REQUIRED` (in
  person with no place).
- **`AddServiceCommandHandler`** and **`UpdateServiceCommandHandler`** — load
  the listing, call `Listing.AddService` or `Service.Update`, and save the
  service with a `ServiceChanged` outbox message in one unit of work. On a 51st
  service the handler returns `422` with `SERVICE_LIMIT_REACHED` and the page
  shows "You can list up to 50 services."
- **`DeleteServiceCommandHandler`** — calls `Listing.RemoveService`, which sets
  `Service.DeletedAt`. Public queries filter deleted services, so the service
  leaves the public listing. Request rows are not touched, so open requests for
  the service stay open.
- **`ReorderServicesCommandHandler`** — validates that the submitted IDs are
  exactly the listing's services and calls `Listing.ReorderServices`.
- **`Service`** — domain entity with `Pricing`, a nullable `PriceCents` (set
  only for `FixedPrice`), `MemberAction`, a nullable `DurationMinutes`,
  `Modes`, `Place` and `SortOrder`. `Update` clears the price when the pricing is
  not `FixedPrice` and clears the booking fields when the action is not
  `BookATime`.
- **`OutboxDispatcher`** — hosted job in `Jubilee.Worker` that applies
  `ServiceChanged` to the `Search index`.

Services are manageable while the listing is not live (`L2-097`); they become
public with the listing. The booking features compute slots from
`Service.DurationMinutes` and the listing's hours.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-093` | `L1-013` | The system shall show the owner's services with a count, "Add service", and each service's name, detail, price and Edit and Delete actions, and an empty state when there are none. The system shall refuse a service beyond the maximum of 50 with "You can list up to 50 services." |
| `L2-094` | `L1-013` | The system shall let the owner add and edit a service in a dialog with a name, a short detail of at most 60 characters, a pricing of Free, Fixed price or Ask for a quote, and a member action of Book a time or Ask for a quote. A fixed price shall be required and validated as in `L2-091`; a bookable service shall have a duration of 15 to 480 minutes and its meeting modes, and shall use the listing's hours for bookable slots. |
| `L2-095` | `L1-013` | After the owner confirms a delete, the service shall be removed from the public listing and open requests for it shall stay open. |
| `L2-090` | `L1-013` | When the owner moves a product or service up or down by drag or keyboard buttons, the public listing shall show items in the new order after save. |
| `L2-132` | `L1-018` | A create request shall carry a client-generated idempotency key, and the server shall return the original result for a repeated key within 24 hours without creating a duplicate. |
| `L2-133` | `L1-019` | The server shall check ownership of the listing before doing anything and shall return 403 to an owner API call for a listing the caller does not own. |
| `L2-129` | `L1-018` | A delete shall be confirmed in a dialog that states the consequence with real names, says "This can't be undone." and focuses the safe choice by default. |

## Diagrams

### System context

The owner manages services through Jubilee. Members appear because the public
listing they browse reflects each change.

![C4 system context for managing services](diagrams/c4-context.png)

### Containers

`Jubilee Web` calls the `Jubilee API`, which writes the `Jubilee database` and
uses the `Cache` for idempotency keys. The `Jubilee Worker` applies service
changes to the `Search index`.

![C4 container view for managing services](diagrams/c4-container.png)

### Components

The page opens the two dialogs and shares `ServicesApi` with them. In the API,
one controller dispatches the command handlers that act on the `Listing`
aggregate.

![C4 component view for managing services](diagrams/c4-component.png)

### Class structure

`Listing` owns up to 50 `Service` entities. Each `Service` holds a
`ServicePricing`, a `MemberAction` and, when bookable, its `MeetingModes`.

![Class diagram for managing services](diagrams/class-structure.png)

### Behaviour — add a service

The dialog adapts its fields to the chosen pricing and member action, and the
server repeats every rule before the listing accepts the service.

![Sequence diagram for adding a service](diagrams/sequence-add-service.png)

### Behaviour — delete a service

The confirmation states the consequence. The handler soft-deletes the service
and leaves requests untouched, so open requests stay open.

![Sequence diagram for deleting a service](diagrams/sequence-delete-service.png)
