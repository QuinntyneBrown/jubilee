using Jubilee.Application.Abstractions;
using Jubilee.Application.Errors;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Accounts;

/// <summary>The one place a category is switched, so a consent change and its record commit together (L2-149 AC3).</summary>
public static class Consent
{
    /// <summary>Sets the category; false when it is unknown. A change of a promotional category appends a record.</summary>
    public static bool TrySet(IAppDbContext db, Member member, string category, bool on, ConsentMethod method, DateTimeOffset now)
    {
        var before = member.EmailPreference(category);
        if (before is null || !member.SetEmailPreference(category, on))
        {
            return false;
        }

        if (before != on && EmailCategories.IsPromotional(category))
        {
            db.ConsentRecords.Add(ConsentRecord.Of(member.Id, category, on, method, now));
        }

        return true;
    }
}

public static class NotificationFrequencies
{
    public const string AsItHappens = "as-it-happens";

    public const string DailySummary = "daily-summary";
}

public sealed record NotificationPreferencesDto(bool Messages, bool Requests, bool Reminders, bool NewBusinesses, bool Tips, string Frequency);

public sealed record GetNotificationPreferencesQuery(Guid MemberId) : IRequest<NotificationPreferencesDto>;

public sealed class GetNotificationPreferencesQueryHandler(IAppDbContext db)
    : IRequestHandler<GetNotificationPreferencesQuery, NotificationPreferencesDto>
{
    public async Task<NotificationPreferencesDto> Handle(GetNotificationPreferencesQuery request, CancellationToken cancellationToken)
    {
        var m = await db.Members.AsNoTracking().SingleOrDefaultAsync(x => x.Id == request.MemberId, cancellationToken)
            ?? throw new NotFoundException("MEMBER_NOT_FOUND", "There is no such account.");
        return new NotificationPreferencesDto(
            m.EmailMessages, m.EmailRequests, m.EmailReminders, m.EmailNewBusinesses, m.EmailTips,
            m.EmailDailySummary ? NotificationFrequencies.DailySummary : NotificationFrequencies.AsItHappens);
    }
}

/// <summary>Changes one setting: one of the five switches, or how often (L2-016). One per request, so two quick changes cannot overwrite each other.</summary>
public sealed record UpdateNotificationPreferenceCommand(Guid MemberId, string? Setting, bool? Enabled, string? Frequency) : IRequest;

public sealed class UpdateNotificationPreferenceCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<UpdateNotificationPreferenceCommand>
{
    public async Task Handle(UpdateNotificationPreferenceCommand request, CancellationToken cancellationToken)
    {
        var member = await db.Members.SingleOrDefaultAsync(m => m.Id == request.MemberId, cancellationToken)
            ?? throw new NotFoundException("MEMBER_NOT_FOUND", "There is no such account.");

        if (request.Setting == "frequency")
        {
            if (request.Frequency is not (NotificationFrequencies.AsItHappens or NotificationFrequencies.DailySummary))
            {
                throw new ValidationFailedException(new Dictionary<string, string> { ["frequency"] = "FREQUENCY_UNKNOWN" });
            }

            member.SetEmailFrequency(request.Frequency == NotificationFrequencies.DailySummary);
        }
        else if (request.Enabled is null
            || !Consent.TrySet(db, member, request.Setting ?? string.Empty, request.Enabled.Value, ConsentMethod.SettingsSwitch, clock.GetUtcNow()))
        {
            throw new ValidationFailedException(new Dictionary<string, string> { ["setting"] = "SETTING_UNKNOWN" });
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}
