using Jubilee.Application.Abstractions;
using Jubilee.Domain;

namespace Jubilee.Application;

/// <summary>E-mail the member can turn off goes through the member's choice and is marked with its category (L2-068).</summary>
public static class EmailPolicy
{
    /// <summary>Queues the e-mail unless the member turned the category off or the address bounced. The in-app notification is not affected.</summary>
    public static bool Queue(
        IAppDbContext db, Member member, string category, string subject, string body, DateTimeOffset now,
        DateTimeOffset? notBefore = null, Guid? correlationId = null)
    {
        if (!member.WantsEmail(category))
        {
            return false;
        }

        db.OutboxMessages.Add(OutboxMessage.Email(member.Id, member.Email, subject, body, now, notBefore, correlationId, category));
        return true;
    }
}
