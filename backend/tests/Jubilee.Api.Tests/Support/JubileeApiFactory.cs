using System.Net;
using System.Text.Json;
using Jubilee.Application.Directory;
using Jubilee.Infrastructure.Persistence;
using Jubilee.Tests.Shared;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Time.Testing;

namespace Jubilee.Api.Tests.Support;

/// <summary>
/// The API on a per-fixture in-memory SQLite database (kept alive by one open connection), a
/// controllable clock and the test-only authentication scheme.
/// </summary>
public class JubileeApiFactory : WebApplicationFactory<Program>
{
    private readonly string _connectionString = $"DataSource=file:jubilee-{Guid.NewGuid():N}?mode=memory&cache=shared";
    private SqliteConnection? _keepAlive;

    private readonly ResettableClock _clock = new();

    /// <summary>The API's clock. Tests advance it; <see cref="Reset"/> puts it back.</summary>
    public FakeTimeProvider Clock => _clock.Current;

    /// <summary>Switch that makes the database unavailable.</summary>
    public DatabaseOutage Database { get; } = new();

    /// <summary>Everything the API logged.</summary>
    public CapturedLogs Logs { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        _keepAlive = new SqliteConnection(_connectionString);
        _keepAlive.Open();

        builder.UseEnvironment("Development");
        builder.UseSetting("Database:Provider", "Sqlite");
        builder.UseSetting("ConnectionStrings:Jubilee", _connectionString);
        builder.UseSetting("RateLimits:DirectoryReadsPerMinute", "100000");
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
            services.ConfigureDbContext<AppDbContext>(options => options.AddInterceptors(Database));
            services.AddSingleton<ILoggerProvider>(Logs);
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

    public HttpClient CreateMemberClient(string name = "Joanna Adeyemi")
    {
        var client = CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.UserHeader, name);
        return client;
    }

    /// <summary>Runs <paramref name="work"/> against the database in its own scope.</summary>
    public async Task WithDb(Func<AppDbContext, Task> work)
    {
        using var scope = Services.CreateScope();
        await work(scope.ServiceProvider.GetRequiredService<AppDbContext>());
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
        Logs.Clear();
        await WithDb(async db =>
        {
            await db.FeaturedSlots.ExecuteDeleteAsync();
            await db.Products.ExecuteDeleteAsync();
            await db.Listings.ExecuteDeleteAsync();
        });
        Services.GetRequiredService<IDirectoryReadCache>().Invalidate();
    }

    public async Task<JsonElement> GetJson(string url, HttpClient? client = null)
    {
        var response = await (client ?? CreateClient()).GetAsync(url);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        _keepAlive?.Dispose();
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
