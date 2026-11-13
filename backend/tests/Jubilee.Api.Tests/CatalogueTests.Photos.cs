using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Application.Abstractions;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using SkiaSharp;

namespace Jubilee.Api.Tests;

// Product photos: L2-091 AC9 and AC10, L2-138 AC1, AC3 and AC6 (ADR 0063).
public sealed partial class CatalogueTests
{
    private static byte[] Jpeg(int width = 800, int height = 600)
    {
        using var bitmap = new SKBitmap(width, height);
        bitmap.Erase(new SKColor(200, 160, 40));
        using var image = SKImage.FromBitmap(bitmap);
        using var encoded = image.Encode(SKEncodedImageFormat.Jpeg, 90);
        return encoded.ToArray();
    }

    private static Task<HttpResponseMessage> UploadPhoto(HttpClient client, byte[] bytes, string name = "bench.jpg")
    {
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        return client.PostAsync("/api/my-business/products/photos", new MultipartFormDataContent { { file, "file", name } });
    }

    private async Task<(Guid Id, string Key)> Uploaded(HttpClient client)
    {
        var response = await UploadPhoto(client, Jpeg());
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var json = await Json(response);
        return (json.GetProperty("id").GetGuid(), json.GetProperty("key").GetString()!);
    }

    private static object WithPhoto(Guid? photoId, string name = "Walnut prayer bench") =>
        new { name, price = "185.00", stock = (int?)3, description = "Solid walnut kneeling bench.", photoId };

    [Fact]
    public async Task L2_091_AC9_a_product_photo_is_checked_scanned_stored_and_shown_with_the_product()
    {
        var naomi = Naomi();

        var upload = await UploadPhoto(naomi, Jpeg(1600, 1200), "IMG_2041.jpg");

        Assert.Equal(HttpStatusCode.Created, upload.StatusCode);
        var photo = await Json(upload);
        var key = photo.GetProperty("key").GetString()!;
        Assert.Equal(32, key.Length);
        Assert.DoesNotContain("IMG", key, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(1600, photo.GetProperty("width").GetInt32());
        Assert.Equal(1200, photo.GetProperty("height").GetInt32());
        Assert.Single(_factory.Scanner.Scanned);
        var media = await _factory.CreateClient().GetAsync($"/media/{key}/640.jpg");
        Assert.Equal(HttpStatusCode.OK, media.StatusCode);
        Assert.Equal("nosniff", media.Headers.GetValues("X-Content-Type-Options").Single());

        var saved = await Json(await naomi.PostAsJsonAsync("/api/my-business/products", WithPhoto(photo.GetProperty("id").GetGuid())));

        Assert.Equal(key, saved.GetProperty("photo").GetProperty("key").GetString());
        var row = (await Json(await naomi.GetAsync("/api/my-business/products"))).GetProperty("rows")[0];
        Assert.Equal(key, row.GetProperty("photo").GetProperty("key").GetString());
        var page = await _factory.GetJson("/api/listings/luzandre-com/products/walnut-prayer-bench");
        Assert.Equal(key, page.GetProperty("photo").GetProperty("key").GetString());
        Assert.Equal("Walnut prayer bench", page.GetProperty("photo").GetProperty("alt").GetString());
        Assert.Equal(1600, page.GetProperty("photo").GetProperty("width").GetInt32());
    }

    [Fact]
    public async Task L2_091_AC10_a_product_without_a_photo_says_so()
    {
        var saved = await Json(await Naomi().PostAsJsonAsync("/api/my-business/products", Product_()));

        Assert.Equal(JsonValueKind.Null, saved.GetProperty("photo").ValueKind);
        var page = await _factory.GetJson("/api/listings/luzandre-com/products/walnut-prayer-bench");
        Assert.Equal(JsonValueKind.Null, page.GetProperty("photo").ValueKind);
    }

    [Fact]
    public async Task L2_091_AC9_a_changed_or_removed_photo_is_deleted_from_the_media_store()
    {
        var naomi = Naomi();
        var first = await Uploaded(naomi);
        var second = await Uploaded(naomi);
        var created = await Json(await naomi.PostAsJsonAsync("/api/my-business/products", WithPhoto(first.Id)));
        var id = created.GetProperty("id").GetGuid();

        var changed = await Json(await naomi.PutAsJsonAsync($"/api/my-business/products/{id}", WithPhoto(second.Id)));

        Assert.Equal(second.Key, changed.GetProperty("photo").GetProperty("key").GetString());
        Assert.DoesNotContain(first.Key, _factory.Media.Keys);
        Assert.Contains(second.Key, _factory.Media.Keys);

        var removed = await Json(await naomi.PutAsJsonAsync($"/api/my-business/products/{id}", WithPhoto(null)));

        Assert.Equal(JsonValueKind.Null, removed.GetProperty("photo").ValueKind);
        Assert.DoesNotContain(second.Key, _factory.Media.Keys);
        Assert.Equal(HttpStatusCode.NotFound, (await _factory.CreateClient().GetAsync($"/media/{second.Key}/640.jpg")).StatusCode);
    }

    [Fact]
    public async Task L2_091_AC9_saving_with_the_same_photo_keeps_it()
    {
        var naomi = Naomi();
        var photo = await Uploaded(naomi);
        var id = (await Json(await naomi.PostAsJsonAsync("/api/my-business/products", WithPhoto(photo.Id)))).GetProperty("id").GetGuid();

        var again = await Json(await naomi.PutAsJsonAsync($"/api/my-business/products/{id}", WithPhoto(photo.Id, "Walnut bench")));

        Assert.Equal(photo.Key, again.GetProperty("photo").GetProperty("key").GetString());
        Assert.Contains(photo.Key, _factory.Media.Keys);
    }

    [Fact]
    public async Task L2_138_AC6_an_infected_product_photo_is_refused_and_nothing_is_stored()
    {
        _factory.Scanner.Verdict = ScanVerdict.Infected;

        var response = await UploadPhoto(Naomi(), Jpeg());

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("FAILED_SCAN", (await Json(response)).GetProperty("code").GetString());
        Assert.Empty(_factory.Media.Keys);
    }

    [Fact]
    public async Task L2_138_AC6_a_product_photo_that_cannot_be_scanned_is_refused_and_nothing_is_stored()
    {
        _factory.Scanner.Verdict = ScanVerdict.Unavailable;

        var response = await UploadPhoto(Naomi(), Jpeg());

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("SCAN_UNAVAILABLE", (await Json(response)).GetProperty("code").GetString());
        Assert.Empty(_factory.Media.Keys);
    }

    [Fact]
    public async Task L2_138_AC1_a_file_that_is_not_an_image_or_is_too_large_is_refused_unscanned()
    {
        var naomi = Naomi();

        var script = await UploadPhoto(naomi, "<script>alert(1)</script>"u8.ToArray());
        var large = await UploadPhoto(naomi, [.. Jpeg(), .. new byte[5 * 1024 * 1024]]);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, script.StatusCode);
        Assert.Equal("NOT_AN_IMAGE", (await Json(script)).GetProperty("code").GetString());
        Assert.Equal(HttpStatusCode.UnprocessableEntity, large.StatusCode);
        Assert.Equal("TOO_LARGE", (await Json(large)).GetProperty("code").GetString());
        Assert.Empty(_factory.Scanner.Scanned);
        Assert.Empty(_factory.Media.Keys);
    }

    [Fact]
    public async Task L2_138_AC6_a_product_takes_only_a_photo_its_own_owner_uploaded()
    {
        var other = ListingMother.Public("laurent-studio", "media", "Laurent Studio");
        other.AssignOwner("member|joanna");
        await _factory.Arrange(other);
        var joannas = await Uploaded(Joanna());

        var response = await Naomi().PostAsJsonAsync("/api/my-business/products", WithPhoto(joannas.Id));
        var unknown = await Naomi().PostAsJsonAsync("/api/my-business/products", WithPhoto(Guid.NewGuid()));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("INVALID", (await Json(response)).GetProperty("errors").GetProperty("photo").GetString());
        Assert.Equal(HttpStatusCode.UnprocessableEntity, unknown.StatusCode);
        Assert.Equal(0, (await Json(await Naomi().GetAsync("/api/my-business/products"))).GetProperty("total").GetInt32());
    }

    [Fact]
    public async Task L2_133_a_member_who_owns_nothing_cannot_upload_a_product_photo()
    {
        var response = await UploadPhoto(_factory.CreateMemberClient("Ruth Mensah", "member|ruth"), Jpeg());

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Empty(_factory.Scanner.Scanned);
        Assert.Equal(HttpStatusCode.Unauthorized, (await UploadPhoto(_factory.CreateClient(), Jpeg())).StatusCode);
    }

    [Fact]
    public async Task L2_138_AC6_an_owner_uploads_at_most_30_product_photos_an_hour()
    {
        var naomi = Naomi();
        var small = Jpeg(40, 30);
        for (var i = 0; i < 30; i++)
        {
            Assert.Equal(HttpStatusCode.Created, (await UploadPhoto(naomi, small)).StatusCode);
        }

        var response = await UploadPhoto(naomi, small);

        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
        Assert.Equal("rate_limited", (await Json(response)).GetProperty("code").GetString());
        Assert.Equal(30, _factory.Media.Keys.Count());
    }
}
