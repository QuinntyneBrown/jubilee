using System.Net;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Microsoft.AspNetCore.Hosting;

namespace Jubilee.Api.Tests;

public sealed class ThreeReadsPerMinuteFactory : JubileeApiFactory
{
    protected override void ConfigureSettings(IWebHostBuilder builder) =>
        builder.UseSetting("RateLimits:DirectoryReadsPerMinute", "3");
}

public class RateLimitTests(ThreeReadsPerMinuteFactory factory) : IClassFixture<ThreeReadsPerMinuteFactory>
{
    // L2-137 AC1 (spirit): the public directory reads share one budget per client address.
    [Fact]
    public async Task L2_137_AC1_directory_reads_beyond_the_limit_answer_429_with_retry_after()
    {
        var client = factory.CreateClient();
        string[] reads =
        [
            "/api/directory/welcome",
            "/api/directory/home",
            "/api/categories/media/listings",
        ];
        foreach (var url in reads)
        {
            Assert.Equal(HttpStatusCode.OK, (await client.GetAsync(url)).StatusCode);
        }

        var refused = await client.GetAsync("/api/categories/media/listings/count");

        Assert.Equal(HttpStatusCode.TooManyRequests, refused.StatusCode);
        var retryAfter = refused.Headers.RetryAfter?.Delta;
        Assert.NotNull(retryAfter);
        Assert.InRange(retryAfter.Value.TotalSeconds, 1, 60);
        Assert.Equal("application/problem+json", refused.Content.Headers.ContentType?.MediaType);
        var json = JsonDocument.Parse(await refused.Content.ReadAsStringAsync()).RootElement;
        Assert.Equal(429, json.GetProperty("status").GetInt32());
        Assert.Equal("rate_limited", json.GetProperty("code").GetString());
        Assert.False(string.IsNullOrEmpty(json.GetProperty("correlationId").GetString()));

        // The listing and product pages share the same budget.
        Assert.Equal(HttpStatusCode.TooManyRequests, (await client.GetAsync("/api/listings/luzandre")).StatusCode);

        // The limit covers the directory reads only.
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/session")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/health")).StatusCode);
    }
}
