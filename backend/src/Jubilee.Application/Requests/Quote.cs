using System.Globalization;
using System.Text.RegularExpressions;
using Jubilee.Application.Abstractions;
using Jubilee.Application.Accounts;
using Jubilee.Application.Errors;
using Jubilee.Application.Listings;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Requests;

/// <summary>
/// What the quote dialog needs to open (L2-045 AC1). <c>Phone</c> is the caller's own profile phone, like
/// <c>416-555-0142</c>, for the dialog to start with (L2-045 AC7); null when the profile has none.
/// </summary>
public sealed record QuoteOptionsDto(BusinessRef Business, string OwnerFirstName, string? UsuallyReplies, string? Phone);

public sealed record GetQuoteOptionsQuery(string Subject, string Slug) : IRequest<QuoteOptionsDto>;

public sealed class GetQuoteOptionsQueryHandler(IAppDbContext db) : IRequestHandler<GetQuoteOptionsQuery, QuoteOptionsDto>
{
    public async Task<QuoteOptionsDto> Handle(GetQuoteOptionsQuery request, CancellationToken cancellationToken)
    {
        var listing = await Bookable.PublicListing(db, request.Slug, cancellationToken);
        var phone = Guid.TryParse(request.Subject, out var memberId)
            ? await db.Members.AsNoTracking().Where(m => m.Id == memberId).Select(m => m.Phone).SingleOrDefaultAsync(cancellationToken)
            : null;
        return new QuoteOptionsDto(
            new BusinessRef(listing.Name, listing.Slug),
            Bookable.OwnerFirstName(listing),
            WireValues.Of(listing.ReplyTimeBand) switch
            {
                "few-hours" => "within a few hours",
                "day" => "within a day",
                "few-days" => "within a few days",
                _ => null,
            },
            Profiles.FormatPhone(phone));
    }
}

/// <summary>A member asks a business to price a piece of work (L2-045). Nothing is charged.</summary>
public sealed record RequestQuoteCommand(
    string Subject,
    string Name,
    string ListingSlug,
    Guid? ServiceId,
    string? Description,
    string? NeededBy,
    string? Budget,
    string? Phone,
    string? IdempotencyKey) : IRequest<BookedRequestDto>;

public sealed partial class RequestQuoteCommandHandler(IAppDbContext db, TimeProvider clock, AccountSettings settings)
    : IRequestHandler<RequestQuoteCommand, BookedRequestDto>
{
    [GeneratedRegex(@"\D")]
    private static partial Regex NotDigit();

    public async Task<BookedRequestDto> Handle(RequestQuoteCommand command, CancellationToken cancellationToken)
    {
        var key = string.IsNullOrWhiteSpace(command.IdempotencyKey) ? Guid.NewGuid().ToString() : command.IdempotencyKey.Trim();
        var earlier = await db.Requests.AsNoTracking()
            .SingleOrDefaultAsync(r => r.MemberSubject == command.Subject && r.IdempotencyKey == key, cancellationToken);
        if (earlier is not null)
        {
            return new BookedRequestDto(earlier.Id, RequestLabels.Wire(earlier.Status), RequestLabels.ForMember(earlier.Status));
        }

        var now = clock.GetUtcNow();
        var errors = new Dictionary<string, string>();
        var description = command.Description?.Trim() ?? string.Empty;
        if (description.Length == 0)
        {
            errors["description"] = "REQUIRED";
        }
        else if (description.Length > Request.MaxDescriptionLength)
        {
            errors["description"] = "TOO_LONG";
        }

        var budget = command.Budget?.Trim();
        if ((budget?.Length ?? 0) > Request.MaxBudgetLength)
        {
            errors["budget"] = "TOO_LONG";
        }

        string? phone = null;
        if (!string.IsNullOrWhiteSpace(command.Phone))
        {
            phone = NotDigit().Replace(command.Phone, string.Empty);
            if (phone.Length != 10)
            {
                errors["phone"] = "INVALID_PHONE";
            }
        }

        DateOnly? neededBy = null;
        if (!string.IsNullOrWhiteSpace(command.NeededBy))
        {
            if (!BookingAvailability.TryParseDay(command.NeededBy, out var day))
            {
                errors["neededBy"] = "INVALID";
            }
            else if (day < TorontoClock.Today(now))
            {
                errors["neededBy"] = "IN_THE_PAST";
            }
            else
            {
                neededBy = day;
            }
        }

        if (errors.Count > 0)
        {
            throw new ValidationFailedException(errors);
        }

        var listing = await Bookable.PublicListing(db, command.ListingSlug, cancellationToken);

        // A software platform takes no requests: people use it on its own website (L2-254 AC3, ADR 0071).
        if (listing.Kind == ListingKind.Platform)
        {
            throw new ConflictException("NOT_OFFERED", "A software platform takes no quote requests.");
        }

        Service? service = null;
        if (command.ServiceId is { } serviceId)
        {
            service = await db.Services.AsNoTracking().SingleOrDefaultAsync(s => s.Id == serviceId && s.ListingId == listing.Id, cancellationToken)
                ?? throw new NotFoundException("service_not_found", "There is no such service.");
        }

        if (listing.OwnerId == command.Subject)
        {
            throw new ConflictException("OWN_LISTING", "You can't ask your own business for a quote.");
        }

        var request = Request.AskForQuote(
            command.Subject, command.Name, listing.Id, service?.Id, service?.Name, description, neededBy, budget, phone, key, now);
        db.Requests.Add(request);
        await QueueOwnerEmail(listing, request, now, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return new BookedRequestDto(request.Id, RequestLabels.Wire(request.Status), RequestLabels.ForMember(request.Status));
    }

    private async Task QueueOwnerEmail(Listing listing, Request request, DateTimeOffset now, CancellationToken cancellationToken)
    {
        Notifications.NotificationRules.Tell(
            db, listing.OwnerId, "request", $"New quote request from {request.MemberName}",
            request.ServiceName ?? request.Note ?? "A quote request", "/my-business/requests", now, request.Id);
        if (!Guid.TryParse(listing.OwnerId, out var ownerId))
        {
            return;
        }

        var owner = await db.Members.AsNoTracking().SingleOrDefaultAsync(m => m.Id == ownerId, cancellationToken);
        if (owner is null)
        {
            return;
        }

        var lines = new List<string> { request.Note! };
        if (request.ServiceName is not null)
        {
            lines.Insert(0, $"For: {request.ServiceName}");
        }

        if (request.NeededBy is { } by)
        {
            lines.Add($"Needed by: {by.ToString("ddd d MMM yyyy", CultureInfo.InvariantCulture)}");
        }

        if (request.Budget is not null)
        {
            lines.Add($"Budget: {request.Budget}");
        }

        if (request.Phone is { Length: 10 } phone)
        {
            lines.Add($"Phone (for this request only): {phone[..3]}-{phone[3..6]}-{phone[6..]}");
        }

        EmailPolicy.Queue(
            db,
            owner,
            EmailCategories.Requests,
            $"New quote request from {request.MemberName}",
            $"Hi {owner.FirstName},\n\n{request.MemberName} would like a quote.\n\n{string.Join("\n", lines)}\n\nReply to it: {settings.PublicBaseUrl.TrimEnd('/')}/my-business/requests\n\nJubilee · Toronto's Christian marketplace\n",
            now);
    }
}
