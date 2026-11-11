using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Jubilee.Application.Accounts;
using Jubilee.Application.Emails;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Http;

namespace Jubilee.Infrastructure.Tests;

/// <summary>The e-mail sender behind <see cref="IEmailSender"/> (L2-179, ADR 0038). No test reaches the provider.</summary>
public class EmailSenderTests
{
    // Not a real key: the bytes of "test-access-key", in the form the provider's keys take.
    private static readonly byte[] AccessKey = Encoding.UTF8.GetBytes("test-access-key");

    private static readonly EmailMessage Message = new(
        "joanna.adeyemi@example.com", "Legacy Financial confirmed your meeting", "Text part", "<!DOCTYPE html><p>HTML part</p>",
        "https://jubilee.test/api/email/unsubscribe/abc");

    private sealed class RecordingHandler : HttpMessageHandler
    {
        public HttpStatusCode Status { get; set; } = HttpStatusCode.Accepted;

        public HttpRequestMessage? Request { get; private set; }

        public string Body { get; private set; } = string.Empty;

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Request = request;
            Body = request.Content is null ? string.Empty : await request.Content.ReadAsStringAsync(cancellationToken);
            return new HttpResponseMessage(Status);
        }
    }

    private static (IEmailSender Sender, RecordingHandler Provider) Build(Dictionary<string, string?> settings)
    {
        settings["Database:Provider"] = DependencyInjection.InMemoryProvider;
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(settings).Build();
        var provider = new RecordingHandler();
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSingleton<IConfiguration>(configuration);
        services.AddInfrastructure(configuration);
        services.ConfigureAll<HttpClientFactoryOptions>(
            options => options.HttpMessageHandlerBuilderActions.Add(builder => builder.PrimaryHandler = provider));
        return (services.BuildServiceProvider().GetRequiredService<IEmailSender>(), provider);
    }

    private static Dictionary<string, string?> ProviderSettings() => new()
    {
        ["Email:ConnectionString"] = $"endpoint=https://jubilee.test.communication.azure.com/;accesskey={Convert.ToBase64String(AccessKey)}",
        ["Email:From"] = "no-reply@jubilee.to",
    };

    [Fact]
    public async Task L2_179_AC1_an_e_mail_goes_to_the_provider_with_both_parts_and_a_signed_request()
    {
        var (sender, provider) = Build(ProviderSettings());

        await sender.SendAsync(Message, CancellationToken.None);

        var request = provider.Request!;
        Assert.Equal(HttpMethod.Post, request.Method);
        Assert.Equal("https://jubilee.test.communication.azure.com/emails:send?api-version=2023-03-31", request.RequestUri!.ToString());

        var body = JsonDocument.Parse(provider.Body).RootElement;
        Assert.Equal("no-reply@jubilee.to", body.GetProperty("senderAddress").GetString());
        Assert.Equal(Message.To, body.GetProperty("recipients").GetProperty("to")[0].GetProperty("address").GetString());
        Assert.Equal(Message.Subject, body.GetProperty("content").GetProperty("subject").GetString());
        Assert.Equal("Text part", body.GetProperty("content").GetProperty("plainText").GetString());
        Assert.Equal(Message.HtmlBody, body.GetProperty("content").GetProperty("html").GetString());

        // The request is signed with the access key over the method, the path, the date, the host and the body's hash.
        var date = request.Headers.GetValues("x-ms-date").Single();
        var hash = request.Headers.GetValues("x-ms-content-sha256").Single();
        Assert.Equal(Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(provider.Body))), hash);
        var signature = Convert.ToBase64String(HMACSHA256.HashData(
            AccessKey,
            Encoding.UTF8.GetBytes($"POST\n/emails:send?api-version=2023-03-31\n{date};jubilee.test.communication.azure.com;{hash}")));
        Assert.Equal(
            $"HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature={signature}",
            request.Headers.GetValues("Authorization").Single());
    }

    [Fact]
    public async Task L2_068_AC3_and_L2_179_AC4_a_notification_e_mail_carries_one_click_unsubscribe_and_no_tracking()
    {
        var (sender, provider) = Build(ProviderSettings());

        await sender.SendAsync(Message, CancellationToken.None);

        var body = JsonDocument.Parse(provider.Body).RootElement;
        Assert.Equal("<https://jubilee.test/api/email/unsubscribe/abc>", body.GetProperty("headers").GetProperty("List-Unsubscribe").GetString());
        Assert.Equal("List-Unsubscribe=One-Click", body.GetProperty("headers").GetProperty("List-Unsubscribe-Post").GetString());
        Assert.True(body.GetProperty("userEngagementTrackingDisabled").GetBoolean());
    }

    [Theory]
    [InlineData(HttpStatusCode.TooManyRequests)]
    [InlineData(HttpStatusCode.ServiceUnavailable)]
    [InlineData(HttpStatusCode.Unauthorized)]
    public async Task L2_179_AC3_an_answer_other_than_accepted_is_thrown_so_the_outbox_retries(HttpStatusCode status)
    {
        var (sender, provider) = Build(ProviderSettings());
        provider.Status = status;

        var thrown = await Assert.ThrowsAsync<HttpRequestException>(() => sender.SendAsync(Message, CancellationToken.None));

        Assert.Equal(status, thrown.StatusCode);
    }

    [Fact]
    public async Task L2_179_AC7_without_a_provider_nothing_leaves_and_the_e_mail_is_written_to_the_preview_folder()
    {
        var folder = Path.Combine(Path.GetTempPath(), $"jubilee-mail-{Guid.NewGuid():N}");
        try
        {
            var (sender, provider) = Build(new Dictionary<string, string?> { ["Email:PreviewFolder"] = folder });

            await sender.SendAsync(Message, CancellationToken.None);

            Assert.Null(provider.Request);
            Assert.Equal(Message.HtmlBody, await File.ReadAllTextAsync(Directory.GetFiles(folder, "*.html").Single()));
            var text = await File.ReadAllTextAsync(Directory.GetFiles(folder, "*.txt").Single());
            Assert.Contains("To: joanna.adeyemi@example.com", text);
            Assert.EndsWith("Text part", text);
        }
        finally
        {
            if (Directory.Exists(folder))
            {
                Directory.Delete(folder, recursive: true);
            }
        }
    }
}
