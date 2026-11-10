using System.Collections.Concurrent;
using System.Data.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Jubilee.Application.Abstractions;
using Jubilee.Domain;
using Jubilee.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Jubilee.Api.Tests.Support;

/// <summary>
/// Makes every use of the database fail while <see cref="Unavailable"/> is set. Tests run on EF
/// Core InMemory (ADR 0009), which issues no commands, so the outage is felt where the
/// application reaches the database: <see cref="IAppDbContext"/>.
/// </summary>
public sealed class DatabaseOutage
{
    public const string SecretDetail = "Login failed for user 'jubilee_app' on tcp:sql-prod-01";

    public bool Unavailable { get; set; }

    internal void ThrowIfUnavailable()
    {
        if (Unavailable)
        {
            throw new OutageException(SecretDetail);
        }
    }

    private sealed class OutageException(string message) : DbException(message);
}

/// <summary>The application's database, failing as <see cref="DatabaseOutage"/> says.</summary>
public sealed class OutageAwareDbContext(AppDbContext inner, DatabaseOutage outage) : IAppDbContext
{
    public DbSet<Listing> Listings => Use(inner.Listings);

    public DbSet<Product> Products => Use(inner.Products);

    public DbSet<Service> Services => Use(inner.Services);

    public DbSet<FeaturedSlot> FeaturedSlots => Use(inner.FeaturedSlots);

    public DbSet<StockAlert> StockAlerts => Use(inner.StockAlerts);

    public DbSet<ListingView> ListingViews => Use(inner.ListingViews);

    public DbSet<RecentSearch> RecentSearches => Use(inner.RecentSearches);

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        outage.ThrowIfUnavailable();
        return inner.SaveChangesAsync(cancellationToken);
    }

    private T Use<T>(T set)
    {
        outage.ThrowIfUnavailable();
        return set;
    }
}

public sealed record CapturedLog(string Category, LogLevel Level, string Message, Exception? Exception);

/// <summary>Collects what the API logs so a test can look an error reference up, as support would.</summary>
public sealed class CapturedLogs : ILoggerProvider
{
    private readonly ConcurrentQueue<CapturedLog> _entries = new();

    public IReadOnlyCollection<CapturedLog> Entries => _entries;

    public void Clear() => _entries.Clear();

    public ILogger CreateLogger(string categoryName) => new Logger(categoryName, _entries);

    public void Dispose()
    {
    }

    private sealed class Logger(string category, ConcurrentQueue<CapturedLog> entries) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state)
            where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter) =>
            entries.Enqueue(new CapturedLog(category, logLevel, formatter(state, exception), exception));
    }
}

/// <summary>A test-only endpoint that fails outside the directory.</summary>
[ApiController]
[Route("api/test")]
[AllowAnonymous]
public sealed class FailingController : ControllerBase
{
    public const string SecretDetail = "NullReference in PaymentsService at line 42";

    [HttpGet("boom")]
    public IActionResult Boom() => throw new InvalidOperationException(SecretDetail);
}
