using System.Security.Cryptography;
using System.Text;
using Jubilee.Api.Controllers;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Time.Testing;

namespace Jubilee.Api.Tests;

// The signed links of message photos (L2-060 AC4): the key that signs them is never a published one outside Development.
public sealed class AttachmentLinkTests
{
    private const string DevelopmentKey = "development-attachment-signing-key-change-me";

    private sealed class Environment(string name) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = name;

        public string ApplicationName { get; set; } = "Jubilee.Api";

        public string ContentRootPath { get; set; } = string.Empty;

        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    private static readonly FakeTimeProvider Clock = new(new DateTimeOffset(2026, 11, 10, 14, 0, 0, TimeSpan.Zero));

    private static AttachmentLinks Links(string environment, string? key = null) => new(
        new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["Attachments:SigningKey"] = key }).Build(),
        Clock,
        new Environment(environment));

    /// <summary>A link signed by someone who knows only the key in the source code.</summary>
    private static (long Expires, string Signature) ForgedWith(string key, Guid id)
    {
        var expires = Clock.GetUtcNow().AddMinutes(5).ToUnixTimeSeconds();
        var signature = Convert.ToHexString(
            HMACSHA256.HashData(Encoding.UTF8.GetBytes(key), Encoding.ASCII.GetBytes($"{id:N}.{expires}"))).ToLowerInvariant();
        return (expires, signature);
    }

    private static (long Expires, string Signature) Parts(string link)
    {
        var query = Microsoft.AspNetCore.WebUtilities.QueryHelpers.ParseQuery(link[(link.IndexOf('?') + 1)..]);
        return (long.Parse(query["expires"]!, System.Globalization.CultureInfo.InvariantCulture), query["sig"].ToString());
    }

    [Fact]
    public void L2_060_AC4_without_a_configured_key_production_does_not_sign_with_the_key_in_the_source_code()
    {
        var id = Guid.NewGuid();
        var links = Links("Production");
        var forged = ForgedWith(DevelopmentKey, id);

        Assert.False(links.IsValid(id, forged.Expires, forged.Signature));
        var own = Parts(links.Create(id));
        Assert.True(links.IsValid(id, own.Expires, own.Signature));
    }

    [Fact]
    public void L2_060_AC4_a_configured_key_signs_the_same_on_every_instance()
    {
        var id = Guid.NewGuid();
        var one = Links("Production", "a-key-the-owner-set-for-production");
        var other = Links("Production", "a-key-the-owner-set-for-production");

        var link = Parts(one.Create(id));

        Assert.True(other.IsValid(id, link.Expires, link.Signature));
        var forged = ForgedWith(DevelopmentKey, id);
        Assert.False(other.IsValid(id, forged.Expires, forged.Signature));
    }

    [Fact]
    public void L2_060_AC4_a_developers_machine_needs_no_key()
    {
        var id = Guid.NewGuid();
        var link = Parts(Links("Development").Create(id));

        Assert.True(Links("Development").IsValid(id, link.Expires, link.Signature));
    }
}
