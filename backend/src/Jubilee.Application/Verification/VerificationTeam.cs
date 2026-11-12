using Jubilee.Application.Abstractions;
using Jubilee.Domain;

namespace Jubilee.Application.Verification;

/// <summary>
/// The one place that decides who on the verification team is told of something (ADR 0055): an e-mail through the
/// outbox to the team's address (<see cref="VerificationSettings.TeamEmail"/>), or nobody when no address is set.
/// The message is added to <paramref name="db"/> and saved with the change that caused it.
/// </summary>
public static class VerificationTeam
{
    public static void Tell(
        IAppDbContext db, VerificationSettings settings, string subject, string textBody, DateTimeOffset now, Guid? correlationId = null)
    {
        if (string.IsNullOrWhiteSpace(settings.TeamEmail))
        {
            return;
        }

        db.OutboxMessages.Add(OutboxMessage.Email(null, settings.TeamEmail.Trim(), subject, textBody, now, correlationId: correlationId));
    }

    /// <summary>The address of a page of the admin application, such as <c>/reports/{id}</c>.</summary>
    public static string AdminLink(VerificationSettings settings, string path) => $"{settings.AdminBaseUrl.TrimEnd('/')}{path}";
}
