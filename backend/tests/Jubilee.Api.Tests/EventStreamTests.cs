using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;

namespace Jubilee.Api.Tests;

public sealed class FastEventsFactory : JubileeApiFactory
{
    protected override void ConfigureSettings(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder) =>
        builder.UseSetting("Events:PollMilliseconds", "20");
}

// Real-time delivery: L2-070 and L2-065 AC4. Joanna and Naomi each hold the stream open.
public sealed class EventStreamTests : IClassFixture<FastEventsFactory>, IAsyncLifetime
{
    private const string JoannaId = "member|joanna";
    private const string NaomiId = "member|naomi";

    private readonly FastEventsFactory _factory;

    public EventStreamTests(FastEventsFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        var listing = ListingMother.Public("luzandre-com", "shops", "Luzandre.com");
        listing.AssignOwner(NaomiId);
        await _factory.Arrange(listing);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient Joanna() => _factory.CreateMemberClient("Joanna Adeyemi", JoannaId);

    private HttpClient Naomi() => _factory.CreateMemberClient("Naomi Laurent", NaomiId);

    internal sealed record Frame(string? Id, string Event, JsonElement Data);

    internal sealed class Stream(HttpResponseMessage response, StreamReader reader) : IDisposable
    {
        public HttpResponseMessage Response => response;

        /// <summary>The next event, or null when none comes in the time allowed.</summary>
        public async Task<Frame?> Next(TimeSpan within)
        {
            using var timeout = new CancellationTokenSource(within);
            string? id = null;
            string? name = null;
            string? data = null;
            try
            {
                while (true)
                {
                    var line = await reader.ReadLineAsync(timeout.Token);
                    if (line is null)
                    {
                        return null;
                    }

                    if (line.Length == 0)
                    {
                        if (name is not null)
                        {
                            return new Frame(id, name, JsonDocument.Parse(data ?? "null").RootElement);
                        }

                        continue;
                    }

                    if (line.StartsWith("id: ", StringComparison.Ordinal))
                    {
                        id = line[4..];
                    }
                    else if (line.StartsWith("event: ", StringComparison.Ordinal))
                    {
                        name = line[7..];
                    }
                    else if (line.StartsWith("data: ", StringComparison.Ordinal))
                    {
                        data = line[6..];
                    }
                }
            }
            catch (OperationCanceledException)
            {
                return null;
            }
        }

        /// <summary>The next notification event, skipping the counts.</summary>
        public async Task<Frame?> NextNotification(TimeSpan within)
        {
            var deadline = DateTime.UtcNow + within;
            while (DateTime.UtcNow < deadline)
            {
                var frame = await Next(deadline - DateTime.UtcNow);
                if (frame is null || frame.Event == "notification")
                {
                    return frame;
                }
            }

            return null;
        }

        public void Dispose()
        {
            reader.Dispose();
            response.Dispose();
        }
    }

    internal static async Task<Stream> Open(HttpClient client, string? lastEventId = null, string path = "/api/events")
    {
        var request = new HttpRequestMessage(HttpMethod.Get, path);
        if (lastEventId is not null)
        {
            request.Headers.Add("Last-Event-ID", lastEventId);
        }

        var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return new Stream(response, new StreamReader(await response.Content.ReadAsStreamAsync()));
    }

    private async Task<string> Ask(string question)
    {
        var started = await Joanna().PostAsJsonAsync("/api/conversations", new { listingSlug = "luzandre-com", body = question, idempotencyKey = Guid.NewGuid().ToString() });
        return JsonDocument.Parse(await started.Content.ReadAsStringAsync()).RootElement.GetProperty("conversationId").GetString()!;
    }

    private Task Reply(string conversation, string body) =>
        Naomi().PostAsJsonAsync($"/api/conversations/{conversation}/messages", new { body, idempotencyKey = Guid.NewGuid().ToString() });

    [Fact]
    public async Task L2_070_a_visitor_cannot_open_the_stream()
    {
        var response = await _factory.CreateClient().GetAsync("/api/events", HttpCompletionOption.ResponseHeadersRead);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // L2-070 AC1, AC3: it carries the events of its own user and nobody else's
    [Fact]
    public async Task L2_070_AC1_a_new_notification_reaches_the_open_page_and_AC3_only_its_own_user_gets_it()
    {
        var conversation = await Ask("Do you ship to Ottawa?");
        using var joanna = await Open(Joanna());
        using var naomi = await Open(Naomi());
        await naomi.NextNotification(TimeSpan.FromSeconds(1)); // Naomi's own earlier notification, if the stream replays none
        _factory.Clock.Advance(TimeSpan.FromSeconds(1));

        await Reply(conversation, "Yes, across Canada.");

        var frame = await joanna.NextNotification(TimeSpan.FromSeconds(2));
        Assert.NotNull(frame);
        Assert.Equal("message", frame.Data.GetProperty("kind").GetString());
        Assert.Contains("Luzandre.com", frame.Data.GetProperty("title").GetString());
        Assert.NotNull(frame.Id);
        Assert.Null(await naomi.NextNotification(TimeSpan.FromMilliseconds(300)));
    }

    // L2-046 AC8, L2-070 AC1, AC3: a new order request reaches the owner's open page, and not the member's
    [Fact]
    public async Task L2_046_AC8_a_new_order_request_reaches_the_owners_open_page_and_not_the_members()
    {
        Guid pickup = default;
        await _factory.WithDb(async db =>
        {
            var shop = db.Listings.Single(l => l.Slug == "luzandre-com");
            var tee = Product.Create(shop.Id, "faith-tee", "Faith heavyweight tee, charcoal", 3400, false, TileTint.Ink, TileIcon.Shirt, ListingMother.Now.AddMinutes(-10));
            tee.SetStock(20);
            var method = DeliveryMethod.Create(shop.Id, 1, DeliveryKind.Pickup, "Pick up in Leslieville", 0, "Free");
            db.Products.Add(tee);
            db.DeliveryMethods.Add(method);
            await db.SaveChangesAsync();
            pickup = method.Id;
        });
        using var joanna = await Open(Joanna());
        using var naomi = await Open(Naomi());
        _factory.Clock.Advance(TimeSpan.FromSeconds(1));

        var sent = await Joanna().PostAsJsonAsync("/api/requests/orders", new
        {
            listingSlug = "luzandre-com", productSlug = "faith-tee", option = (string?)null, quantity = 2, deliveryMethodId = pickup,
            shippingAddress = (string?)null, note = (string?)null, idempotencyKey = Guid.NewGuid().ToString(),
        });
        Assert.Equal(HttpStatusCode.Created, sent.StatusCode);

        var frame = await naomi.NextNotification(TimeSpan.FromSeconds(2));
        Assert.NotNull(frame);
        Assert.Equal("request", frame.Data.GetProperty("kind").GetString());
        Assert.Equal("New order request from Joanna Adeyemi", frame.Data.GetProperty("title").GetString());
        Assert.Equal("Faith heavyweight tee, charcoal × 2", frame.Data.GetProperty("detail").GetString());
        Assert.Equal("/my-business/requests", frame.Data.GetProperty("target").GetString());
        Assert.NotNull(frame.Id);
        Assert.Null(await joanna.NextNotification(TimeSpan.FromMilliseconds(300)));
    }

    // L2-065 AC4: the badge counts follow within seconds
    [Fact]
    public async Task L2_065_AC4_the_badge_counts_are_sent_when_they_change()
    {
        var conversation = await Ask("Do you ship to Ottawa?");
        using var joanna = await Open(Joanna());
        var first = await joanna.Next(TimeSpan.FromSeconds(2));
        Assert.Equal("counts", first!.Event);
        Assert.Equal(0, first.Data.GetProperty("unreadNotificationCount").GetInt32());
        _factory.Clock.Advance(TimeSpan.FromSeconds(1));

        await Reply(conversation, "Yes, across Canada.");

        Frame? counts;
        do
        {
            counts = await joanna.Next(TimeSpan.FromSeconds(2));
        }
        while (counts is not null && counts.Event != "counts");
        Assert.NotNull(counts);
        Assert.Equal(1, counts.Data.GetProperty("unreadNotificationCount").GetInt32());
        Assert.Equal(1, counts.Data.GetProperty("unreadConversationCount").GetInt32());
    }

    // L2-070 AC2: missed events arrive after a reconnect, once
    [Fact]
    public async Task L2_070_AC2_a_reconnect_delivers_what_was_missed_and_nothing_twice()
    {
        var conversation = await Ask("Do you ship to Ottawa?");
        string seen;
        using (var joanna = await Open(Joanna()))
        {
            _factory.Clock.Advance(TimeSpan.FromSeconds(1));
            await Reply(conversation, "First reply.");
            var frame = await joanna.NextNotification(TimeSpan.FromSeconds(2));
            seen = frame!.Id!;
        }

        _factory.Clock.Advance(TimeSpan.FromSeconds(1));
        await Reply(conversation, "Second reply.");
        _factory.Clock.Advance(TimeSpan.FromSeconds(1));
        await Reply(conversation, "Third reply.");

        using var again = await Open(Joanna(), seen);
        var second = await again.NextNotification(TimeSpan.FromSeconds(2));
        var third = await again.NextNotification(TimeSpan.FromSeconds(2));
        Assert.Contains("Second reply.", second!.Data.GetProperty("detail").GetString());
        Assert.Contains("Third reply.", third!.Data.GetProperty("detail").GetString());
        Assert.Null(await again.NextNotification(TimeSpan.FromMilliseconds(300)));
    }

    // L2-070 AC4: the application opens the stream again itself and names the last event in the address
    [Fact]
    public async Task L2_070_AC4_a_stream_opened_again_with_the_last_event_in_the_address_gets_what_was_missed_once()
    {
        var conversation = await Ask("Do you ship to Ottawa?");
        string seen;
        using (var joanna = await Open(Joanna()))
        {
            _factory.Clock.Advance(TimeSpan.FromSeconds(1));
            await Reply(conversation, "First reply.");
            seen = (await joanna.NextNotification(TimeSpan.FromSeconds(2)))!.Id!;
        }

        _factory.Clock.Advance(TimeSpan.FromSeconds(1));
        await Reply(conversation, "Second reply.");

        using var again = await Open(Joanna(), path: $"/api/events?lastEventId={seen}");
        var second = await again.NextNotification(TimeSpan.FromSeconds(2));
        Assert.Contains("Second reply.", second!.Data.GetProperty("detail").GetString());
        Assert.Null(await again.NextNotification(TimeSpan.FromMilliseconds(300)));
    }
}

// L2-070 AC1 measured (ADR 0053): at the polling interval production runs with, how long a notification
// takes from its save to its frame on an open stream.
public sealed class EventStreamDeliveryTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string JoannaId = "member|joanna";

    private readonly JubileeApiFactory _factory;

    public EventStreamDeliveryTests(JubileeApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task L2_070_AC1_a_notification_reaches_the_open_page_within_two_seconds_at_the_95th_percentile()
    {
        const int Samples = 20;
        using var stream = await EventStreamTests.Open(_factory.CreateMemberClient("Joanna Adeyemi", JoannaId));
        var took = new List<TimeSpan>();
        for (var i = 0; i < Samples; i++)
        {
            // Events fall anywhere in the server's polling second, as they do in production.
            await Task.Delay(TimeSpan.FromMilliseconds(i * 137 % 400));
            _factory.Clock.Advance(TimeSpan.FromSeconds(1));
            var now = _factory.Clock.GetUtcNow();
            var watch = System.Diagnostics.Stopwatch.StartNew();
            await _factory.Arrange(Notification.Create(JoannaId, "request", $"Update {i}", "Detail", "/requests", now));

            var frame = await stream.NextNotification(TimeSpan.FromSeconds(5));

            watch.Stop();
            Assert.NotNull(frame);
            Assert.Equal($"Update {i}", frame.Data.GetProperty("title").GetString());
            took.Add(watch.Elapsed);
        }

        took.Sort();
        var p95 = took[(int)Math.Ceiling(Samples * 0.95) - 1];
        Assert.True(p95 < TimeSpan.FromSeconds(2), $"The 95th percentile was {p95.TotalMilliseconds:F0} ms; the slowest {took[^1].TotalMilliseconds:F0} ms.");
    }
}
