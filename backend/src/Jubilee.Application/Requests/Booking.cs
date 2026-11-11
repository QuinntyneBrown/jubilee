using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using Jubilee.Application.Abstractions;
using Jubilee.Application.Accounts;
using Jubilee.Application.Errors;
using Jubilee.Application.Listings;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Requests;

public sealed record BookingServiceDto(Guid Id, string Name, string Detail, string PriceKind, int? PriceCents);

public sealed record BookingOptionsDto(
    BusinessRef Business,
    string OwnerFirstName,
    string MeetsOn,
    IReadOnlyList<int> MeetingDays,
    string? Area,
    string? UsuallyConfirms,
    int MaxDaysAhead,
    IReadOnlyList<BookingServiceDto> Services);

public sealed record BusinessRef(string Name, string Slug);

public sealed record AvailabilityDto(string Day, bool Available, IReadOnlyList<string> Slots);

public sealed record BookedRequestDto(Guid Id, string Status, string MemberStatus);

/// <summary>What a status is called to the member and to the owner (L2-043 AC1).</summary>
public static class RequestLabels
{
    public static string Wire(RequestStatus status) => status.ToString().ToLowerInvariant();

    public static string ForMember(RequestStatus status) => status switch
    {
        RequestStatus.New => "Awaiting reply",
        RequestStatus.Confirmed => "Confirmed",
        RequestStatus.Declined => "Declined",
        RequestStatus.Cancelled => "Cancelled",
        _ => "Completed",
    };
}

/// <summary>The days and times a business meets (L2-044): days within 180 days of today on which it is open.</summary>
public static class BookingAvailability
{
    public const int MaxDaysAhead = 180;

    /// <summary>The start times of a day, until the owner sets their own.</summary>
    public static readonly string[] DefaultSlots = ["09:00", "10:00", "13:30", "16:00", "19:00"];

    private static readonly Regex Minutes = new(@"(\d+)\s*min", RegexOptions.Compiled);

    public static bool TryParseDay(string? raw, out DateOnly day) =>
        DateOnly.TryParseExact(raw, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out day);

    public static bool IsOffered(Listing listing, DateOnly day, DateTimeOffset now)
    {
        var today = TorontoClock.Today(now);
        return day >= today && day <= today.AddDays(MaxDaysAhead) && listing.MeetsOn(day.DayOfWeek);
    }

    public static IReadOnlyList<string> SlotsFor(Listing listing, DateOnly day, DateTimeOffset now) =>
        !IsOffered(listing, day, now)
            ? []
            : [.. DefaultSlots.Where(slot => TorontoClock.At(day, TimeOnly.Parse(slot, CultureInfo.InvariantCulture)) > now)];

    /// <summary>The length of a meeting for a service whose detail says, for example, "60 min".</summary>
    public static TimeSpan LengthOf(Service service) =>
        service.DurationMinutes is { } owned ? TimeSpan.FromMinutes(owned) : Minutes.Match(service.Detail) is { Success: true } m
            ? TimeSpan.FromMinutes(int.Parse(m.Groups[1].Value, CultureInfo.InvariantCulture))
            : TimeSpan.FromMinutes(30);

    public static string MeetsOn(Listing listing)
    {
        var days = Enumerable.Range(0, 7).Select(i => (DayOfWeek)((i + 1) % 7)).Where(listing.MeetsOn).ToList();
        if (days.Count == 0)
        {
            return "by arrangement";
        }

        var names = days.Select(d => d.ToString()).ToList();
        var consecutive = days.Count > 2 && days.Zip(days.Skip(1), (a, b) => (((int)a + 1) % 7) == (int)b).All(x => x);
        return consecutive
            ? $"{names[0]} to {names[^1]}"
            : names.Count == 1 ? names[0] : string.Join(", ", names[..^1]) + " and " + names[^1];
    }
}

internal static class Bookable
{
    public static async Task<Listing> PublicListing(IAppDbContext db, string slug, CancellationToken cancellationToken) =>
        await db.Listings.WherePublic().AsNoTracking().SingleOrDefaultAsync(l => l.Slug == slug, cancellationToken)
        ?? throw new NotFoundException("listing_not_found", "There is no such business.");

    public static async Task<Service> BookableService(IAppDbContext db, Listing listing, Guid serviceId, CancellationToken cancellationToken) =>
        await db.Services.AsNoTracking().SingleOrDefaultAsync(
            s => s.Id == serviceId && s.ListingId == listing.Id && s.Action == ServiceAction.Book, cancellationToken)
        ?? throw new NotFoundException("service_not_found", "There is no such service.");

    public static string OwnerFirstName(Listing listing) =>
        (listing.OwnerName?.Split(',')[0].Trim().Split(' ')[0]) is { Length: > 0 } first ? first : listing.Name;
}

/// <summary>What the booking dialog needs to open (L2-044 AC1).</summary>
public sealed record GetBookingOptionsQuery(string Slug) : IRequest<BookingOptionsDto>;

public sealed class GetBookingOptionsQueryHandler(IAppDbContext db) : IRequestHandler<GetBookingOptionsQuery, BookingOptionsDto>
{
    public async Task<BookingOptionsDto> Handle(GetBookingOptionsQuery request, CancellationToken cancellationToken)
    {
        var listing = await Bookable.PublicListing(db, request.Slug, cancellationToken);
        var services = await db.Services.AsNoTracking()
            .Where(s => s.ListingId == listing.Id && s.Action == ServiceAction.Book)
            .OrderBy(s => s.Position)
            .ToListAsync(cancellationToken);
        return new BookingOptionsDto(
            new BusinessRef(listing.Name, listing.Slug),
            Bookable.OwnerFirstName(listing),
            BookingAvailability.MeetsOn(listing),
            [.. Enumerable.Range(0, 7).Where(i => listing.MeetsOn((DayOfWeek)i))],
            listing.MeetingArea,
            WireValues.Of(listing.ReplyTimeBand) switch
            {
                "few-hours" => "within a few hours",
                "day" => "within a day",
                "few-days" => "within a few days",
                _ => null,
            },
            BookingAvailability.MaxDaysAhead,
            [.. services.Select(s => new BookingServiceDto(s.Id, s.Name, s.Detail, WireValues.Of(s.PriceKind), s.PriceCents))]);
    }
}

/// <summary>The times of one day (L2-044 AC1, AC3).</summary>
public sealed record GetAvailabilityQuery(string Slug, Guid ServiceId, string? Day) : IRequest<AvailabilityDto>;

public sealed class GetAvailabilityQueryHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<GetAvailabilityQuery, AvailabilityDto>
{
    public async Task<AvailabilityDto> Handle(GetAvailabilityQuery request, CancellationToken cancellationToken)
    {
        var listing = await Bookable.PublicListing(db, request.Slug, cancellationToken);
        await Bookable.BookableService(db, listing, request.ServiceId, cancellationToken);
        if (!BookingAvailability.TryParseDay(request.Day, out var day))
        {
            return new AvailabilityDto(request.Day ?? string.Empty, false, []);
        }

        var now = clock.GetUtcNow();
        return new AvailabilityDto(request.Day!, BookingAvailability.IsOffered(listing, day, now), BookingAvailability.SlotsFor(listing, day, now));
    }
}

/// <summary>A member asks a business for a meeting (L2-044). Nothing is charged.</summary>
public sealed record BookMeetingCommand(
    string Subject, string Name, string ListingSlug, Guid ServiceId, string? Day, string? Time, string? Mode, string? Note, string? IdempotencyKey)
    : IRequest<BookedRequestDto>;

public sealed class BookMeetingCommandHandler(IAppDbContext db, TimeProvider clock, AccountSettings settings)
    : IRequestHandler<BookMeetingCommand, BookedRequestDto>
{
    public async Task<BookedRequestDto> Handle(BookMeetingCommand command, CancellationToken cancellationToken)
    {
        var key = string.IsNullOrWhiteSpace(command.IdempotencyKey) ? Guid.NewGuid().ToString() : command.IdempotencyKey.Trim();
        var earlier = await db.Requests.AsNoTracking()
            .SingleOrDefaultAsync(r => r.MemberSubject == command.Subject && r.IdempotencyKey == key, cancellationToken);
        if (earlier is not null)
        {
            return new BookedRequestDto(earlier.Id, RequestLabels.Wire(earlier.Status), RequestLabels.ForMember(earlier.Status));
        }

        var errors = new Dictionary<string, string>();
        if (string.IsNullOrWhiteSpace(command.Day))
        {
            errors["day"] = "REQUIRED";
        }

        if (string.IsNullOrWhiteSpace(command.Time))
        {
            errors["time"] = "REQUIRED";
        }

        if ((command.Note?.Trim().Length ?? 0) > Request.MaxNoteLength)
        {
            errors["note"] = "TOO_LONG";
        }

        if (errors.Count > 0)
        {
            throw new ValidationFailedException(errors);
        }

        var listing = await Bookable.PublicListing(db, command.ListingSlug, cancellationToken);
        var service = await Bookable.BookableService(db, listing, command.ServiceId, cancellationToken);
        if (listing.OwnerId == command.Subject)
        {
            throw new ConflictException("OWN_LISTING", "You can't book your own business.");
        }

        var now = clock.GetUtcNow();
        if (!BookingAvailability.TryParseDay(command.Day, out var day) || !BookingAvailability.IsOffered(listing, day, now))
        {
            throw new ValidationFailedException(new Dictionary<string, string> { ["day"] = "DAY_UNAVAILABLE" });
        }

        var time = command.Time!.Trim();
        if (!BookingAvailability.SlotsFor(listing, day, now).Contains(time))
        {
            throw new ValidationFailedException(new Dictionary<string, string> { ["time"] = "TIME_UNAVAILABLE" });
        }

        var mode = string.Equals(command.Mode, "in-person", StringComparison.OrdinalIgnoreCase) && listing.MeetingArea is not null
            ? MeetingMode.InPerson
            : MeetingMode.Video;
        var startsAt = TorontoClock.At(day, TimeOnly.Parse(time, CultureInfo.InvariantCulture));
        var request = Request.Book(
            command.Subject, command.Name, listing.Id, service.Id, service.Name, startsAt, BookingAvailability.LengthOf(service),
            mode, mode == MeetingMode.InPerson ? listing.MeetingArea : null, command.Note, key, now);
        db.Requests.Add(request);
        await QueueOwnerEmail(listing, service, request, now, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return new BookedRequestDto(request.Id, RequestLabels.Wire(request.Status), RequestLabels.ForMember(request.Status));
    }

    private async Task QueueOwnerEmail(Listing listing, Service service, Request request, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var starts = TorontoClock.Local(request.StartsAt!.Value);
        Notifications.NotificationRules.Tell(
            db, listing.OwnerId, "request", $"New booking request from {request.MemberName}",
            $"{service.Name} · {starts.ToString("ddd d MMM, HH:mm", CultureInfo.InvariantCulture)}", "/my-business/requests", now, request.Id);
        if (!Guid.TryParse(listing.OwnerId, out var ownerId))
        {
            return;
        }

        var owner = await db.Members.AsNoTracking().SingleOrDefaultAsync(m => m.Id == ownerId, cancellationToken);
        if (owner is null)
        {
            return;
        }

        var local = TorontoClock.Local(request.StartsAt!.Value);
        var how = request.Mode == MeetingMode.InPerson ? $"In person, {request.Location}" : "Video call";
        var note = request.Note is null ? string.Empty : $"\nNote: {request.Note}\n";
        var when = $"{local.ToString("ddd d MMM yyyy", CultureInfo.InvariantCulture)}, {local.ToString("HH:mm", CultureInfo.InvariantCulture)}";
        EmailPolicy.Queue(
            db,
            owner,
            EmailCategories.Requests,
            $"New booking request from {request.MemberName}",
            $"Hi {owner.FirstName},\n\n{request.MemberName} would like to meet.\n\n{service.Name}\n{when}\n{how}\n{note}\nConfirm or decline it: {settings.PublicBaseUrl.TrimEnd('/')}/my-business/requests\n\nJubilee · Toronto's Christian marketplace\n",
            now);
    }
}

/// <summary>The calendar file of a member's confirmed, completed or cancelled booking (L2-050).</summary>
public sealed record GetBookingCalendarQuery(string Subject, Guid RequestId) : IRequest<string>;

public sealed class GetBookingCalendarQueryHandler(IAppDbContext db, TimeProvider clock, AccountSettings settings)
    : IRequestHandler<GetBookingCalendarQuery, string>
{
    public async Task<string> Handle(GetBookingCalendarQuery query, CancellationToken cancellationToken)
    {
        var request = await db.Requests.AsNoTracking().Include(r => r.Transitions)
            .SingleOrDefaultAsync(r => r.Id == query.RequestId && r.MemberSubject == query.Subject && r.Kind == RequestKind.Booking, cancellationToken);
        if (request is null || request.Status is RequestStatus.New or RequestStatus.Declined)
        {
            throw new NotFoundException("request_not_found", "There is no such booking.");
        }

        var business = await db.Listings.AsNoTracking().Where(l => l.Id == request.ListingId).Select(l => l.Name).SingleAsync(cancellationToken);
        return CalendarFileBuilder.Build(request, business, settings.PublicBaseUrl, clock.GetUtcNow());
    }
}

/// <summary>Writes an iCalendar document; the event's UID is the request's, so the same link updates the same event.</summary>
public static class CalendarFileBuilder
{
    public static string Build(Request request, string business, string publicBaseUrl, DateTimeOffset now)
    {
        var start = TorontoClock.Local(request.StartsAt!.Value);
        var end = TorontoClock.Local(request.EndsAt!.Value);
        var link = $"{publicBaseUrl.TrimEnd('/')}/requests/{request.Id}";
        var location = request.Mode == MeetingMode.InPerson ? request.Location ?? business : "Video";
        string[] lines =
        [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//Jubilee//Bookings//EN",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
            "BEGIN:VEVENT",
            $"UID:{request.Id}@jubilee",
            $"DTSTAMP:{now.UtcDateTime.ToString("yyyyMMdd'T'HHmmss'Z'", CultureInfo.InvariantCulture)}",
            $"SEQUENCE:{request.Transitions.Count}",
            $"DTSTART;TZID=America/Toronto:{start.ToString("yyyyMMdd'T'HHmmss", CultureInfo.InvariantCulture)}",
            $"DTEND;TZID=America/Toronto:{end.ToString("yyyyMMdd'T'HHmmss", CultureInfo.InvariantCulture)}",
            $"SUMMARY:{Escape($"{request.ServiceName} with {business}")}",
            $"LOCATION:{Escape(location)}",
            $"DESCRIPTION:{Escape($"{business}. Your request: {link}")}",
            $"URL:{link}",
            $"STATUS:{(request.Status == RequestStatus.Cancelled ? "CANCELLED" : "CONFIRMED")}",
            "END:VEVENT",
            "END:VCALENDAR",
        ];
        return string.Join("\r\n", lines) + "\r\n";
    }

    private static string Escape(string text) =>
        new StringBuilder(text).Replace("\\", "\\\\").Replace(";", "\\;").Replace(",", "\\,").Replace("\n", "\\n").ToString();
}
