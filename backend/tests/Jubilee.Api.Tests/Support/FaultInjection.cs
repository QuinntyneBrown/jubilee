using System.Collections.Concurrent;
using System.Data.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging;

namespace Jubilee.Api.Tests.Support;

/// <summary>Makes every database command fail while <see cref="Unavailable"/> is set.</summary>
public sealed class DatabaseOutage : DbCommandInterceptor
{
    public const string SecretDetail = "Login failed for user 'jubilee_app' on tcp:sql-prod-01";

    public bool Unavailable { get; set; }

    public override InterceptionResult<DbDataReader> ReaderExecuting(
        DbCommand command, CommandEventData eventData, InterceptionResult<DbDataReader> result)
    {
        ThrowIfUnavailable();
        return result;
    }

    public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
        DbCommand command, CommandEventData eventData, InterceptionResult<DbDataReader> result, CancellationToken cancellationToken = default)
    {
        ThrowIfUnavailable();
        return ValueTask.FromResult(result);
    }

    public override ValueTask<InterceptionResult<object>> ScalarExecutingAsync(
        DbCommand command, CommandEventData eventData, InterceptionResult<object> result, CancellationToken cancellationToken = default)
    {
        ThrowIfUnavailable();
        return ValueTask.FromResult(result);
    }

    private void ThrowIfUnavailable()
    {
        if (Unavailable)
        {
            throw new OutageException(SecretDetail);
        }
    }

    private sealed class OutageException(string message) : DbException(message);
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
