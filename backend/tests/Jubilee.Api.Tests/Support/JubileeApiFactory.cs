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

    /// <summary>Everything the API logged.</summary>
    public CapturedLogs Logs { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.UseSetting("Database:Provider", Infrastructure.DependencyInjection.InMemoryProvider);
        builder.UseSetting("ConnectionStrings:Jubilee", _storeName);
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
            services.AddScoped<IAppDbContext>(sp => new OutageAwareDbContext(sp.GetRequiredService<AppDbContext>(), Database));
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
        Logs.Clear();
        await WithDb(async db =>
        {
            db.RemoveRange(db.StockAlerts);
            db.RemoveRange(db.ListingViews);
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
