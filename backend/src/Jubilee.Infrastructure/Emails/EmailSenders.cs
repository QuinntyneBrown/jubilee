using System.Net;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Jubilee.Application.Accounts;
using Jubilee.Application.Emails;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Jubilee.Infrastructure.Emails;

/// <summary>
/// The sender when no e-mail provider is configured (L2-179 AC7): nothing leaves the system. It logs who
/// an e-mail went to and its subject, never the body, which holds a link token. With
/// <c>Email:PreviewFolder</c> set it also writes the HTML and the text there, for a developer to open.
/// </summary>
public sealed class LoggingEmailSender(IConfiguration configuration, ILogger<LoggingEmailSender> logger) : IEmailSender
{
    public async Task SendAsync(EmailMessage message, CancellationToken cancellationToken)
    {
        logger.LogInformation("E-mail \"{Subject}\" sent to {To}.", message.Subject, message.To);

        var folder = configuration["Email:PreviewFolder"];
        if (string.IsNullOrWhiteSpace(folder))
        {
            return;
        }

        Directory.CreateDirectory(folder);
        var name = $"{DateTimeOffset.UtcNow:yyyyMMdd-HHmmss-fff}-{Slug(message.Subject)}";
        await File.WriteAllTextAsync(Path.Combine(folder, name + ".html"), message.HtmlBody, Encoding.UTF8, cancellationToken);
        await File.WriteAllTextAsync(
            Path.Combine(folder, name + ".txt"), $"To: {message.To}\nSubject: {message.Subject}\n\n{message.TextBody}", Encoding.UTF8, cancellationToken);
    }

    private static string Slug(string subject)
    {
        var slug = new string(subject.ToLowerInvariant().Select(c => char.IsAsciiLetterOrDigit(c) ? c : '-').ToArray()).Trim('-');
        return slug.Length > 60 ? slug[..60] : slug;
    }
}
