using System.Text.RegularExpressions;
using Jubilee.Domain;
using Jubilee.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Jubilee.Worker.Tests;

// Acceptance Test
// Traces to: L2-140 (AC3), L2-008 (AC2)
// Description: the worker issues a reset link and sends its e-mail without writing the token to any log line.
public sealed partial class PasswordResetJobTests : IDisposable
{
    private readonly string _store = $"jubilee-worker-{Guid.NewGuid():N}";
    private readonly string _preview = Path.Combine(Path.GetTempPath(), $"jubilee-j18-{Guid.NewGuid():N}");

    public void Dispose()
    {
        if (Directory.Exists(_preview))
        {
            Directory.Delete(_preview, recursive: true);
        }
    }

    private AppDbContext Db() => new(new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase(_store, Infrastructure.DependencyInjection.InMemoryRoot)
        .Options);

    /// <summary>Every line the whole worker logs, from every category.</summary>
    private sealed class Captured : ILoggerProvider, ILogger
    {
        public List<string> Lines { get; } = [];

        public ILogger CreateLogger(string categoryName) => this;

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            lock (Lines)
            {
                Lines.Add(formatter(state, exception) + exception);
            }
        }

        public void Dispose()
        {
        }
    }

    // L2-140 AC3
    // Given a reset request for an address with an account, when the worker issues the link and sends the e-mail
    // with no e-mail provider configured, then the e-mail holds the token and no log line of the worker does.
    [Fact]
    public async Task L2_140_AC3_issuing_and_sending_a_reset_link_writes_no_token_to_the_worker_log()
    {
        var now = DateTimeOffset.UtcNow;
        var email = EmailAddress.TryParse("joanna.adeyemi@example.com")!;
        await using (var db = Db())
        {
            db.Members.Add(Member.Join(email, "Joanna", "Adeyemi", null, "hash", now.AddDays(-30)));
            db.PasswordResetRequests.Add(PasswordResetRequest.Record(email, now));
            await db.SaveChangesAsync();
        }

        var builder = WorkerHost.CreateBuilder(
        [
            $"--Database:Provider={Infrastructure.DependencyInjection.InMemoryProvider}",
            $"--ConnectionStrings:Jubilee={_store}",
            $"--Email:PreviewFolder={_preview}",
            "--Worker:OutboxIntervalSeconds=1",
            "--App:PublicBaseUrl=https://jubilee.test",
        ]);
        var captured = new Captured();
        builder.Logging.ClearProviders();
        builder.Logging.SetMinimumLevel(LogLevel.Trace);
        builder.Logging.AddProvider(captured);
        using var host = builder.Build();
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(30));

        await host.StartAsync(timeout.Token);
        while (!timeout.IsCancellationRequested
            && !(Directory.Exists(_preview) && Directory.EnumerateFiles(_preview, "*reset-your-jubilee-password.txt").Any()))
        {
            await Task.Delay(50, timeout.Token);
        }

        await host.StopAsync(CancellationToken.None);

        var mail = await File.ReadAllTextAsync(Directory.EnumerateFiles(_preview, "*reset-your-jubilee-password.txt").Single());
        var token = TokenInLink().Match(mail).Groups[1].Value;
        Assert.Equal(43, token.Length);
        string[] lines;
        lock (captured.Lines)
        {
            lines = [.. captured.Lines];
        }

        // The worker logged the e-mail it sent, so its log was being written.
        Assert.Contains(lines, line => line.Contains("Reset your Jubilee password", StringComparison.Ordinal));
        Assert.DoesNotContain(lines, line => line.Contains(token, StringComparison.Ordinal));
    }

    [GeneratedRegex(@"https://jubilee\.test/reset-password/([A-Za-z0-9_-]+)")]
    private static partial Regex TokenInLink();
}
