using System.Net;
using System.Text.Json;
using Jubilee.Application.Abstractions;
using Jubilee.Application.Directory;
using Jubilee.Infrastructure.Persistence;
using Jubilee.Tests.Shared;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Time.Testing;

namespace Jubilee.Api.Tests.Support;

/// <summary>
/// The API on a per-fixture EF Core InMemory store (ADR 0009), a controllable clock and the
/// test-only authentication scheme.
/// </summary>
public class JubileeApiFactory : WebApplicationFactory<Program>
{
    private readonly string _storeName = $"jubilee-api-{Guid.NewGuid():N}";

    private readonly ResettableClock _clock = new();

    /// <summary>The API's clock. Tests advance it; <see cref="Reset"/> puts it back.</summary>
    public FakeTimeProvider Clock => _clock.Current;

    /// <summary>Switch that makes the database unavailable.</summary>
    public DatabaseOutage Database { get; } = new();

    public InMemoryMediaStore Media { get; } = new();

    public FakeEmailSender Emails { get; } = new();

    public FakeBotChallenge Bot { get; } = new();

    public FakeGoogle Google { get; } = new();

    /// <summary>Everything the API logged.</summary>
    public CapturedLogs Logs { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.UseSetting("Database:Provider", Infrastructure.DependencyInjection.InMemoryProvider);
        builder.UseSetting("ConnectionStrings:Jubilee", _storeName);
        builder.UseSetting("RateLimits:DirectoryReadsPerMinute", "100000");
        builder.UseSetting("RateLimits:JoinsPerHour", "100000");
        builder.UseSetting("RateLimits:ReferenceLinksPerMinute", "100000");
        builder.UseSetting("Email:WebhookSecret", "test-webhook-secret");
        builder.UseSetting("App:PublicBaseUrl", "https://jubilee.test");
        ConfigureSettings(builder);
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(_clock);
            services
                .AddAuthentication()
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.SchemeName, _ => { });
            // Authenticate with the test scheme; challenges still go to the API's own scheme.
            services.PostConfigure<AuthenticationOptions>(o => o.DefaultAuthenticateScheme = TestAuthHandler.SchemeName);
            services.AddScoped<IAppDbContext>(sp => new OutageAwareDbContext(sp.GetRequiredService<AppDbContext>(), Database));
            services.AddSingleton<ILoggerProvider>(Logs);
            services.RemoveAll<Jubilee.Application.Abstractions.IMediaStore>();
            services.AddSingleton<Jubilee.Application.Abstractions.IMediaStore>(Media);
            services.RemoveAll<Jubilee.Application.Accounts.IEmailSender>();
            services.AddSingleton<Jubilee.Application.Accounts.IEmailSender>(Emails);
            services.RemoveAll<Jubilee.Application.Accounts.IBreachedPasswordChecker>();
            services.AddSingleton<Jubilee.Application.Accounts.IBreachedPasswordChecker, FakeBreachedPasswordChecker>();
            services.RemoveAll<Jubilee.Application.Accounts.IBotChallengeVerifier>();
            services.AddSingleton<Jubilee.Application.Accounts.IBotChallengeVerifier>(Bot);
            services.RemoveAll<Jubilee.Application.Accounts.IGoogleIdentityClient>();
            services.AddSingleton<Jubilee.Application.Accounts.IGoogleIdentityClient>(Google);
            services.AddControllers().AddApplicationPart(typeof(FailingController).Assembly);
            ConfigureTestServices(services);
        });
    }

    protected virtual void ConfigureSettings(IWebHostBuilder builder)
    {
    }

    protected virtual void ConfigureTestServices(IServiceCollection services)
    {
    }

    /// <summary>A client that keeps cookies but does not follow redirects, for the Google round trip.</summary>
    public HttpClient CreateNoRedirectClient() => CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

    public HttpClient CreateMemberClient(string name = "Joanna Adeyemi", string? subject = null, string? role = null)
    {
        var client = CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.UserHeader, name);
        if (subject is not null)
        {
            client.DefaultRequestHeaders.Add(TestAuthHandler.SubjectHeader, subject);
        }

        if (role is not null)
        {
            client.DefaultRequestHeaders.Add(TestAuthHandler.RoleHeader, role);
        }

        return client;
    }

    /// <summary>Runs <paramref name="work"/> against the database in its own scope.</summary>
    public async Task WithDb(Func<AppDbContext, Task> work)
    {
        using var scope = Services.CreateScope();
        await work(scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }

    /// <summary>
    /// Changes the store behind the application's back, the way a direct database write would: no
    /// interceptor sees it, so the directory cache is not invalidated.
    /// </summary>
    public async Task WithDbBehindTheApp(Func<AppDbContext, Task> work)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(_storeName, Infrastructure.DependencyInjection.InMemoryRoot)
            .Options;
        await using var db = new AppDbContext(options);
        await work(db);
    }

    /// <summary>Adds entities and saves them the way the application does.</summary>
    public Task Arrange(params object[] entities) => WithDb(async db =>
    {
        db.AddRange(entities);
        await db.SaveChangesAsync();
    });

    /// <summary>Empties the database and the read cache and resets the clock between tests.</summary>
    public async Task Reset()
    {
        _clock.Current = new FakeTimeProvider(ListingMother.Now);
        Database.Unavailable = false;
        Emails.Clear();
        Emails.Failing = false;
        Media.Clear();
        Bot.Passes = true;
        Google.Identity = new("google-1", "g@example.com", true, "Gina", "Gordon");
        Logs.Clear();
        await WithDb(async db =>
        {
            db.RemoveRange(db.Notifications);
            db.RemoveRange(db.RequestTransitions);
            db.RemoveRange(db.DeliveryMethods);
            db.RemoveRange(db.ListingDrafts);
            db.RemoveRange(db.ListingSubmissions);
            db.RemoveRange(db.ReferenceLinks);
            db.RemoveRange(db.ReferenceAnswers);
            db.RemoveRange(db.ReviewTicks);
            db.RemoveRange(db.ListingDecisions);
            db.RemoveRange(db.AuditRecords);
            db.RemoveRange(db.ResponseTimeStats);
            db.RemoveRange(db.Requests);
            db.RemoveRange(db.ConversationReports);
            db.RemoveRange(db.Messages);
            db.RemoveRange(db.MessageAttachments);
            db.RemoveRange(db.Conversations);
            db.RemoveRange(db.OutboxMessages);
            db.RemoveRange(db.LinkTokens);
            db.RemoveRange(db.PasswordResetRequests);
            db.RemoveRange(db.Members);
            db.RemoveRange(db.RecentSearches);
            db.RemoveRange(db.StockAlerts);
            db.RemoveRange(db.SavedItems);
            db.RemoveRange(db.ConsentRecords);
            db.RemoveRange(db.ContentVersions);
            db.RemoveRange(db.ListingReportEntries);
            db.RemoveRange(db.ListingReports);
            db.RemoveRange(db.ListingViews);
            db.RemoveRange(db.ListingPhotos);
            db.RemoveRange(db.FeaturedSlots);
            db.RemoveRange(db.Services);
            db.RemoveRange(db.Products);
            db.RemoveRange(db.Listings);
            await db.SaveChangesAsync();
        });
        Services.GetRequiredService<IDirectoryReadCache>().Invalidate();
    }

    public async Task<JsonElement> GetJson(string url, HttpClient? client = null)
    {
        var response = await (client ?? CreateClient()).GetAsync(url);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
    }

}

/// <summary>A FakeTimeProvider cannot go back in time, so each test gets a fresh one.</summary>
internal sealed class ResettableClock : TimeProvider
{
    public FakeTimeProvider Current { get; set; } = new(ListingMother.Now);

    public override DateTimeOffset GetUtcNow() => Current.GetUtcNow();
}

public static class JsonElementExtensions
{
    public static string[] Slugs(this JsonElement array) =>
        [.. array.EnumerateArray().Select(e => e.GetProperty("slug").GetString()!)];
}
