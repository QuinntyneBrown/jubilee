using System.Globalization;
using Jubilee.Application.Abstractions;
using Jubilee.Application.Accounts;
using Jubilee.Application.Requests;
using Jubilee.Domain;
using MediatR;

namespace Jubilee.Application.OwnerWorkspace;

/// <summary>
/// When meetings can be booked (L2-220): the days of the week (0 is Sunday), the opening and closing times of day in
/// Toronto as <c>HH:mm</c>, how often a time is offered, the days in words, and whether the owner saved them.
/// </summary>
public sealed record MeetingHoursDto(IReadOnlyList<int> Days, string OpensAt, string ClosesAt, int SlotMinutes, string MeetsOn, bool OwnerSet);

/// <summary>The rules of meeting hours.</summary>
public static class MeetingHoursRules
{
    /// <summary>The slot lengths an owner chooses from, in minutes.</summary>
    public static readonly int[] SlotLengths = [15, 30, 45, 60, 90, 120];

    /// <summary>What the dialog proposes to an owner who never saved hours.</summary>
    public static readonly TimeOnly SuggestedOpensAt = new(9, 0);

    public static readonly TimeOnly SuggestedClosesAt = new(17, 0);

    public const int SuggestedSlotMinutes = 30;

    public static MeetingHoursDto Of(Listing listing) => new(
        [.. Enumerable.Range(0, 7).Where(i => listing.MeetsOn((DayOfWeek)i))],
        Wire(listing.MeetingOpensAt ?? SuggestedOpensAt),
        Wire(listing.MeetingClosesAt ?? SuggestedClosesAt),
        listing.MeetingSlotMinutes ?? SuggestedSlotMinutes,
        BookingAvailability.MeetsOn(listing),
        listing.MeetingSlotMinutes is not null);

    public static bool TryParseTime(string? raw, out TimeOnly time) =>
        TimeOnly.TryParseExact(raw?.Trim(), "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out time);

    private static string Wire(TimeOnly time) => time.ToString("HH:mm", CultureInfo.InvariantCulture);
}

/// <summary>The owner says when meetings can be booked (L2-220). Requests already sent keep their times (AC5).</summary>
public sealed record SetMeetingHoursCommand(string Subject, IReadOnlyList<int>? Days, string? OpensAt, string? ClosesAt, int? SlotMinutes)
    : IRequest<MeetingHoursDto>;

public sealed class SetMeetingHoursCommandHandler(IAppDbContext db) : IRequestHandler<SetMeetingHoursCommand, MeetingHoursDto>
{
    public async Task<MeetingHoursDto> Handle(SetMeetingHoursCommand request, CancellationToken cancellationToken)
    {
        var listing = await Workspace.Owned(db, request.Subject, cancellationToken);
        var errors = new Dictionary<string, string>();
        if (request.Days is not { Count: > 0 } days)
        {
            errors["days"] = "REQUIRED";
            days = [];
        }
        else if (days.Any(day => day is < 0 or > 6))
        {
            errors["days"] = "INVALID";
        }

        var opensGiven = Time(request.OpensAt, "opensAt", errors, out var opensAt);
        var closesGiven = Time(request.ClosesAt, "closesAt", errors, out var closesAt);
        var window = opensGiven && closesGiven && closesAt > opensAt;
        if (opensGiven && closesGiven && !window)
        {
            errors["closesAt"] = "BEFORE_OPENS";
        }

        if (request.SlotMinutes is not { } slotMinutes)
        {
            errors["slotMinutes"] = "REQUIRED";
        }
        else if (!MeetingHoursRules.SlotLengths.Contains(slotMinutes))
        {
            errors["slotMinutes"] = "INVALID";
        }
        else if (window && closesAt - opensAt < TimeSpan.FromMinutes(slotMinutes))
        {
            errors["slotMinutes"] = "TOO_SHORT";
        }

        if (errors.Count > 0)
        {
            throw new ValidationFailedException(errors);
        }

        listing.SetMeetingHours(days.Distinct().Aggregate(0, (bits, day) => bits | (1 << day)), opensAt, closesAt, request.SlotMinutes!.Value);
        await db.SaveChangesAsync(cancellationToken);
        return MeetingHoursRules.Of(listing);
    }

    private static bool Time(string? raw, string field, Dictionary<string, string> errors, out TimeOnly time)
    {
        time = default;
        if (string.IsNullOrWhiteSpace(raw))
        {
            errors[field] = "REQUIRED";
            return false;
        }

        if (!MeetingHoursRules.TryParseTime(raw, out time))
        {
            errors[field] = "INVALID";
            return false;
        }

        return true;
    }
}
