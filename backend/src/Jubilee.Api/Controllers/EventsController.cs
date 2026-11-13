using System.Globalization;
using System.Text;
using System.Text.Json;
using Jubilee.Application.Abstractions;
using Jubilee.Application.Navigation;
using Jubilee.Application.Notifications;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Controllers;

/// <summary>
/// The persistent connection that carries a signed-in member's events to the open page (L2-070): a
/// server-sent event stream of their own notifications and of their badge counts. Another user's events are
/// never sent (AC3); a reconnect with <c>Last-Event-ID</c> receives what it missed and nothing twice (AC2).
/// </summary>
[ApiController]
[Route("api/events")]
public sealed class EventsController(IServiceScopeFactory scopes, TimeProvider clock, IConfiguration configuration) : ControllerBase
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    /// <summary>The event id of a notification: the moment it was made, in ticks, so ids only grow.</summary>
    public static string EventId(Domain.Notification n) => n.CreatedAt.UtcTicks.ToString(CultureInfo.InvariantCulture);

    [HttpGet]
    public async Task Stream([FromQuery] string? lastEventId, CancellationToken cancellationToken)
    {
        var viewer = User.ToViewer();
        var subject = viewer.Subject!;
        var poll = TimeSpan.FromMilliseconds(Math.Max(10, configuration.GetValue("Events:PollMilliseconds", 1000)));
        var beat = TimeSpan.FromSeconds(configuration.GetValue("Events:HeartbeatSeconds", 15));

        Response.Headers.ContentType = "text/event-stream";
        Response.Headers.CacheControl = "no-cache";
        Response.Headers["X-Accel-Buffering"] = "no";
        var header = Request.Headers["Last-Event-ID"].FirstOrDefault() ?? lastEventId;
        var cursor = long.TryParse(header, NumberStyles.None, CultureInfo.InvariantCulture, out var parsed)
            ? new DateTimeOffset(parsed, TimeSpan.Zero)
            : clock.GetUtcNow();

        await Write(": connected\nretry: 3000\n\n", cancellationToken);
        NavigationSummary? last = null;
        var sinceBeat = TimeSpan.Zero;
        try
        {
            while (!cancellationToken.IsCancellationRequested)
            {
                await using (var scope = scopes.CreateAsyncScope())
                {
                    var db = scope.ServiceProvider.GetRequiredService<IAppDbContext>();
                    var now = clock.GetUtcNow();
                    var fresh = await NotificationRules.Visible(db, subject, now).AsNoTracking()
                        .Where(n => n.CreatedAt > cursor).OrderBy(n => n.CreatedAt).Take(100).ToListAsync(cancellationToken);
                    foreach (var notification in fresh)
                    {
                        await Write(
                            $"id: {EventId(notification)}\nevent: notification\ndata: {JsonSerializer.Serialize(NotificationRules.Row(notification), Json)}\n\n",
                            cancellationToken);
                        cursor = notification.CreatedAt;
                        sinceBeat = TimeSpan.Zero;
                    }

                    var counts = await scope.ServiceProvider.GetRequiredService<ISender>()
                        .Send(new GetNavigationSummaryQuery(subject, viewer.IsModerator), cancellationToken);
                    if (counts != last)
                    {
                        last = counts;
                        await Write($"event: counts\ndata: {JsonSerializer.Serialize(counts, Json)}\n\n", cancellationToken);
                        sinceBeat = TimeSpan.Zero;
                    }
                }

                await Task.Delay(poll, cancellationToken);
                sinceBeat += poll;
                if (sinceBeat >= beat)
                {
                    await Write(": ping\n\n", cancellationToken);
                    sinceBeat = TimeSpan.Zero;
                }
            }
        }
        catch (OperationCanceledException)
        {
            // The page closed the connection.
        }
    }

    private async Task Write(string text, CancellationToken cancellationToken)
    {
        await Response.Body.WriteAsync(Encoding.UTF8.GetBytes(text), cancellationToken);
        await Response.Body.FlushAsync(cancellationToken);
    }
}
