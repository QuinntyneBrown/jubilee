using Jubilee.Application.Abstractions;
using Jubilee.Domain;

namespace Jubilee.Application.Moderation;

/// <summary>
/// Where the Jubilee team reads its mail (<c>Moderation:TeamEmail</c>, else <c>Launch:TeamEmail</c>; null when nobody is
/// told by e-mail) and the address of the admin application its e-mails link to (ADR 0055, ADR 0057).
/// </summary>
public sealed record TeamSettings(string? TeamEmail, string AdminBaseUrl);

/// <summary>
/// The one place that decides who on the Jubilee team is told of something (ADR 0055): an e-mail through the outbox to
/// the team's address (<see cref="TeamSettings.TeamEmail"/>), or nobody when no address is set. The message is added
/// to <paramref name="db"/> and saved with the change that caused it.
/// </summary>
public static class JubileeTeam
{
    public static void Tell(
        IAppDbContext db, TeamSettings settings, string subject, string textBody, DateTimeOffset now, Guid? correlationId = null)
    {
        if (string.IsNullOrWhiteSpace(settings.TeamEmail))
        {
            return;
        }

        db.OutboxMessages.Add(OutboxMessage.Email(null, settings.TeamEmail.Trim(), subject, textBody, now, correlationId: correlationId));
    }

    /// <summary>The address of a page of the admin application, such as <c>/reports/{id}</c>.</summary>
    public static string AdminLink(TeamSettings settings, string path) => $"{settings.AdminBaseUrl.TrimEnd('/')}{path}";
}
