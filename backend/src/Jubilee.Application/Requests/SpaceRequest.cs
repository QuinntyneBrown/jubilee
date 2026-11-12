using System.Globalization;
using Jubilee.Application.Abstractions;
using Jubilee.Application.Accounts;
using Jubilee.Application.Errors;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Requests;

/// <summary>
/// A renter asks the owner of a space for it (L2-197): a Short stay with its check-in and
/// check-out, any other term with its move-in and months. Nothing is charged.
/// </summary>
public sealed record RequestSpaceCommand(
    string Subject,
    string Name,
    string ListingSlug,
    string? CheckIn,
    string? CheckOut,
    string? MoveIn,
    int? StayMonths,
    string? Note,
    string? IdempotencyKey) : IRequest<BookedRequestDto>;

public sealed class RequestSpaceCommandHandler(IAppDbContext db, TimeProvider clock, AccountSettings settings)
    : IRequestHandler<RequestSpaceCommand, BookedRequestDto>
{
    /// <summary>A date can be asked for this far ahead at most (L2-197 AC5).</summary>
    public const int MaxDaysAhead = 365;

    public async Task<BookedRequestDto> Handle(RequestSpaceCommand command, CancellationToken cancellationToken)
    {
        var key = string.IsNullOrWhiteSpace(command.IdempotencyKey) ? Guid.NewGuid().ToString() : command.IdempotencyKey.Trim();
        var earlier = await db.Requests.AsNoTracking()
            .SingleOrDefaultAsync(r => r.MemberSubject == command.Subject && r.IdempotencyKey == key, cancellationToken);
        if (earlier is not null)
        {
            return new BookedRequestDto(earlier.Id, RequestLabels.Wire(earlier.Status), RequestLabels.ForMember(earlier.Status));
        }

        var listing = await Bookable.PublicListing(db, command.ListingSlug, cancellationToken);
        var space = listing.Space ?? throw new NotFoundException("listing_not_found", "There is no such space.");
        if (listing.OwnerId == command.Subject)
        {
            throw new ConflictException("OWN_LISTING", "You can't ask for your own space.");
        }

        // One open request per member and space, so two tabs cannot send two (L2-197 AC9).
        if (await db.Requests.AsNoTracking().AnyAsync(
                r => r.MemberSubject == command.Subject && r.ListingId == listing.Id && r.Kind == RequestKind.Space
                    && (r.Status == RequestStatus.New || r.Status == RequestStatus.Confirmed),
                cancellationToken))
        {
            throw new ConflictException("ALREADY_REQUESTED", "You already have an open request for this space.");
        }

        var now = clock.GetUtcNow();
        var today = TorontoClock.Today(now);
        var errors = new Dictionary<string, string>();
        DateOnly? checkIn = null, checkOut = null, moveIn = null;
        int? months = null;

        if (SpaceTerms.IsNightly(space.Term))
        {
            checkIn = Date(command.CheckIn, "checkIn", today, errors);
            checkOut = Date(command.CheckOut, "checkOut", today, errors);
            if (checkIn is { } from && checkOut is { } to && !errors.ContainsKey("checkOut"))
            {
                if (to <= from)
                {
                    errors["checkOut"] = "NOT_AFTER_CHECK_IN";
                }
                else if (to.DayNumber - from.DayNumber < space.MinimumStay)
                {
                    errors["checkOut"] = "BELOW_MINIMUM_STAY";
                }
            }
        }
        else
        {
            moveIn = Date(command.MoveIn, "moveIn", today, errors);
            if (command.StayMonths is not { } stay || !SpaceTerms.StayChoices.Contains(stay))
            {
                errors["stayMonths"] = "REQUIRED";
            }
            else if (stay < space.MinimumStay)
            {
                errors["stayMonths"] = "BELOW_MINIMUM_STAY";
            }
            else
            {
                months = stay;
            }
        }

        if ((command.Note?.Trim().Length ?? 0) > Request.MaxNoteLength)
        {
            errors["note"] = "TOO_LONG";
        }

        if (errors.Count > 0)
        {
            throw new ValidationFailedException(errors);
        }

        var request = Request.AskForSpace(
            command.Subject, command.Name, listing.Id, listing.Name, space, checkIn, checkOut, moveIn, months, command.Note, key, now);
        db.Requests.Add(request);
        await TellOwner(listing, request, now, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return new BookedRequestDto(request.Id, RequestLabels.Wire(request.Status), RequestLabels.ForMember(request.Status));
    }

    private static DateOnly? Date(string? raw, string field, DateOnly today, Dictionary<string, string> errors)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            errors[field] = "REQUIRED";
            return null;
        }

        if (!BookingAvailability.TryParseDay(raw, out var day))
        {
            errors[field] = "INVALID";
            return null;
        }

        if (day < today)
        {
            errors[field] = "IN_THE_PAST";
            return null;
        }

        if (day.DayNumber - today.DayNumber > MaxDaysAhead)
        {
            errors[field] = "TOO_FAR";
            return null;
        }

        return day;
    }

    private async Task TellOwner(Listing listing, Request request, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var title = $"New space request from {request.MemberName}";
        var when = IncomingRules.When(request) ?? string.Empty;
        Notifications.NotificationRules.Tell(db, listing.OwnerId, "request", title, $"{listing.Name} · {when}", "/my-business/requests", now, request.Id);
        if (!Guid.TryParse(listing.OwnerId, out var ownerId)
            || await db.Members.AsNoTracking().SingleOrDefaultAsync(m => m.Id == ownerId, cancellationToken) is not { } owner)
        {
            return;
        }

        var lines = new List<string> { $"{IncomingRules.Title(request)}", $"When: {when}" };
        if (IncomingRules.SpaceTotal(request) is { } total)
        {
            lines.Add($"Total: {total}");
        }

        if (request.Note is not null)
        {
            lines.Add($"Note: {request.Note}");
        }

        EmailPolicy.Queue(
            db,
            owner,
            EmailCategories.Requests,
            title,
            string.Create(
                CultureInfo.InvariantCulture,
                $"Hi {owner.FirstName},\n\n{request.MemberName} would like your space.\n\n{string.Join("\n", lines)}\n\nYour exact address is shared only if you confirm.\n\nReply to it: {settings.PublicBaseUrl.TrimEnd('/')}/my-business/requests\n\nJubilee · Toronto's Christian marketplace\n"),
            now);
    }
}
