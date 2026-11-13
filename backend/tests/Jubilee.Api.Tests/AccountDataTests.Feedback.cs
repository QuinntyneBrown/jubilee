using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

// A member's feedback is theirs: it is in the download and goes with the account (L2-214 AC12).
public sealed partial class AccountDataTests
{
    private static async Task SendFeedback(HttpClient client)
    {
        var picture = new MultipartFormDataContent();
        var file = new ByteArrayContent([0xFF, 0xD8, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xD9]);
        file.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        picture.Add(file, "file", "screen.jpg");
        var upload = await client.PostAsync("/api/feedback/screenshots", picture);
        Assert.Equal(HttpStatusCode.Created, upload.StatusCode);
        var screenshot = JsonDocument.Parse(await upload.Content.ReadAsStringAsync()).RootElement.GetProperty("id").GetGuid();

        Assert.Equal(HttpStatusCode.Created, (await client.PostAsJsonAsync("/api/feedback/ratings", new { rating = 4, note = "Quick search." })).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await client.PostAsJsonAsync(
            "/api/feedback/bug-reports", new { happened = "The map pin was a block off.", screenshotIds = new[] { screenshot } })).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await client.PutAsJsonAsync(
            $"/api/feedback/check-ins/{Guid.NewGuid()}", new { moment = "request-sent", score = 2, note = "Too many steps." })).StatusCode);
    }

    [Fact]
    public async Task L2_214_AC12_The_archive_holds_the_member_s_feedback()
    {
        var (client, member) = await Joanna();
        await SendFeedback(client);
        await client.PostAsync("/api/account/data-exports", null);
        await BuildExports();

        var response = await client.GetAsync($"/api/account/data-exports/{await LinkTokenFor(member)}");

        var feedback = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.GetProperty("feedback");
        Assert.Equal(3, feedback.GetArrayLength());
        JsonElement Of(string kind) => feedback.EnumerateArray().Single(f => f.GetProperty("kind").GetString() == kind);
        Assert.Equal(4, Of("Rating").GetProperty("rating").GetInt32());
        Assert.Equal("Quick search.", Of("Rating").GetProperty("note").GetString());
        Assert.Equal("The map pin was a block off.", Of("BugReport").GetProperty("happened").GetString());
        Assert.StartsWith("FB-", Of("BugReport").GetProperty("reference").GetString());
        Assert.Equal(1, Of("BugReport").GetProperty("screenshots").GetInt32());
        Assert.Equal("Too many steps.", Of("CheckIn").GetProperty("note").GetString());
    }

    [Fact]
    public async Task L2_214_AC12_Deleting_the_account_deletes_the_member_s_feedback_and_screenshots_and_nobody_elses()
    {
        var (client, _) = await Joanna();
        var david = await Join("david@example.com", "David", "Chen");
        await SendFeedback(client);
        await SendFeedback(david);

        var response = await client.SendAsync(Delete("DELETE"));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(3, await Read(db => db.Feedback.CountAsync()));
        Assert.Equal(1, await Read(db => db.FeedbackScreenshots.CountAsync()));
        Assert.Equal(3, (await _factory.GetJson("/api/feedback", david)).GetArrayLength() + 1);
    }
}
