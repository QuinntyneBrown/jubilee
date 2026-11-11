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

/// <summary>
/// Azure Communication Services Email over its REST API (ADR 0038). <c>Email:ConnectionString</c> is the
/// Communication Services connection string (<c>endpoint=…;accesskey=…</c>) and <c>Email:From</c> the
/// sender address. Each request is signed with HMAC-SHA256. Any answer other than 202 is thrown, so
/// the outbox retries with back-off (L2-179 AC3). Open and click tracking are off (L2-179 AC4).
/// </summary>
public sealed class AzureCommunicationEmailSender : IEmailSender
{
    private const string ApiVersion = "2023-03-31";

    private readonly HttpClient _http;
    private readonly TimeProvider _clock;
    private readonly Uri _endpoint;
    private readonly byte[] _accessKey;
    private readonly string _from;

    public AzureCommunicationEmailSender(HttpClient http, IConfiguration configuration, TimeProvider clock)
    {
        _http = http;
        _clock = clock;
        var parts = (configuration["Email:ConnectionString"] ?? string.Empty)
            .Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(part => part.Split('=', 2))
            .Where(pair => pair.Length == 2)
            .ToDictionary(pair => pair[0], pair => pair[1], StringComparer.OrdinalIgnoreCase);
        if (!parts.TryGetValue("endpoint", out var endpoint) || !parts.TryGetValue("accesskey", out var accessKey))
        {
            throw new InvalidOperationException("Email:ConnectionString must be of the form endpoint=https://…;accesskey=….");
        }

        _endpoint = new Uri(endpoint.TrimEnd('/') + "/");
        _accessKey = Convert.FromBase64String(accessKey);
        _from = configuration["Email:From"] is { Length: > 0 } from
            ? from
            : throw new InvalidOperationException("Email:From (the sender address) is not set.");
    }

    public async Task SendAsync(EmailMessage message, CancellationToken cancellationToken)
    {
        var headers = new Dictionary<string, string>();
        if (message.UnsubscribeUrl is not null)
        {
            headers["List-Unsubscribe"] = $"<{message.UnsubscribeUrl}>";
            headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
        }

        var body = JsonSerializer.SerializeToUtf8Bytes(new
        {
            senderAddress = _from,
            content = new { subject = message.Subject, plainText = message.TextBody, html = message.HtmlBody },
            recipients = new { to = new[] { new { address = message.To } } },
            headers,
            userEngagementTrackingDisabled = true,
        });

        // Built as text: "emails:send" as a relative reference would read as a URI with the scheme "emails".
        var uri = new Uri($"{_endpoint.AbsoluteUri}emails:send?api-version={ApiVersion}");
        var date = _clock.GetUtcNow().ToString("r", System.Globalization.CultureInfo.InvariantCulture);
        var contentHash = Convert.ToBase64String(SHA256.HashData(body));
        var host = uri.IsDefaultPort ? uri.Host : $"{uri.Host}:{uri.Port}";
        var toSign = $"POST\n{uri.PathAndQuery}\n{date};{host};{contentHash}";
        var signature = Convert.ToBase64String(HMACSHA256.HashData(_accessKey, Encoding.UTF8.GetBytes(toSign)));

        using var request = new HttpRequestMessage(HttpMethod.Post, uri) { Content = new ByteArrayContent(body) };
        request.Content.Headers.ContentType = new MediaTypeHeaderValue("application/json");
        request.Headers.TryAddWithoutValidation("x-ms-date", date);
        request.Headers.TryAddWithoutValidation("x-ms-content-sha256", contentHash);
        request.Headers.TryAddWithoutValidation(
            "Authorization", $"HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature={signature}");

        using var response = await _http.SendAsync(request, cancellationToken);
        if (response.StatusCode != HttpStatusCode.Accepted)
        {
            // The answer may name the recipient; the status is enough to act on.
            throw new HttpRequestException($"The e-mail provider answered {(int)response.StatusCode}.", null, response.StatusCode);
        }
    }
}
