using Jubilee.Application.Abstractions;
using Jubilee.Domain;

namespace Jubilee.Application;

/// <summary>E-mail the member can turn off goes through the member's choice and is marked with its category (L2-068).</summary>
public static class EmailPolicy
{
    /// <summary>
    /// Queues the e-mail unless the member turned the category off or the address bounced. The in-app
    /// notification is not affected. For a member who chose "One daily summary" the e-mail of "New
    /// messages" and "Request updates" is held for the summary instead of being sent (L2-016 AC6).
    /// </summary>
    public static bool Queue(
        IAppDbContext db, Member member, string category, string subject, string body, DateTimeOffset now,
        DateTimeOffset? notBefore = null, Guid? correlationId = null)
    {
        if (!member.WantsEmail(category))
        {
            return false;
        }

        var held = member.EmailDailySummary && EmailCategories.IsHeldForSummary(category);
        db.OutboxMessages.Add(OutboxMessage.Email(member.Id, member.Email, subject, body, now, notBefore, correlationId, category, held));
        return true;
    }
}
