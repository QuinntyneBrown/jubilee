using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Jubilee.Api.Tests;

// Notification settings: L2-016 and the e-mail consent of L2-149.
public sealed partial class AccountSettingsTests
{
    private const string Preferences = "/api/account/notification-preferences";

    private async Task<JsonElement> ReadPreferences(HttpClient client)
    {
        var response = await client.GetAsync(Preferences);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await Json(response);
    }

    private static Task<HttpResponseMessage> Switch(HttpClient client, string setting, bool enabled) =>
        client.PatchAsJsonAsync(Preferences, new { setting, enabled });

    private static Task<HttpResponseMessage> Frequency(HttpClient client, string frequency) =>
        client.PatchAsJsonAsync(Preferences, new { setting = "frequency", frequency });

    // L2-016 AC5
    [Fact]
    public async Task L2_016_AC5_a_new_account_has_messages_requests_and_reminders_on_and_the_rest_off()
    {
        var client = await Join();

        var preferences = await ReadPreferences(client);

        Assert.True(preferences.GetProperty("messages").GetBoolean());
        Assert.True(preferences.GetProperty("requests").GetBoolean());
        Assert.True(preferences.GetProperty("reminders").GetBoolean());
        Assert.False(preferences.GetProperty("newBusinesses").GetBoolean());
        Assert.False(preferences.GetProperty("tips").GetBoolean());
        Assert.Equal("as-it-happens", preferences.GetProperty("frequency").GetString());
    }

    // L2-016 AC2, AC3
    [Fact]
    public async Task L2_016_AC2_each_switch_saves_on_its_own_and_leaves_the_others_as_they_were()
    {
        var client = await Join();

        Assert.Equal(HttpStatusCode.OK, (await Switch(client, "tips", true)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Switch(client, "messages", false)).StatusCode);

        var preferences = await ReadPreferences(client);
        Assert.True(preferences.GetProperty("tips").GetBoolean());
        Assert.False(preferences.GetProperty("messages").GetBoolean());
        Assert.True(preferences.GetProperty("requests").GetBoolean());
        Assert.True(preferences.GetProperty("reminders").GetBoolean());
        Assert.False(preferences.GetProperty("newBusinesses").GetBoolean());
        Assert.True(await Read(db => Task.FromResult(!db.Members.Single().WantsEmail(EmailCategories.Messages))));
    }

    // L2-016 AC1
    [Fact]
    public async Task L2_016_AC1_how_often_saves_as_one_daily_summary_or_as_it_happens()
    {
        var client = await Join();

        Assert.Equal(HttpStatusCode.OK, (await Frequency(client, "daily-summary")).StatusCode);
        Assert.Equal("daily-summary", (await ReadPreferences(client)).GetProperty("frequency").GetString());

        Assert.Equal(HttpStatusCode.OK, (await Frequency(client, "as-it-happens")).StatusCode);
        Assert.Equal("as-it-happens", (await ReadPreferences(client)).GetProperty("frequency").GetString());
    }

    [Theory]
    [InlineData("security", true)]
    [InlineData("sign-in", false)]
    [InlineData("", true)]
    public async Task L2_016_AC4_security_e_mail_has_no_switch_and_an_unknown_setting_is_refused(string setting, bool enabled)
    {
        var client = await Join();

        var response = await Switch(client, setting, enabled);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("SETTING_UNKNOWN", (await Json(response)).GetProperty("errors").GetProperty("setting").GetString());
    }

    [Fact]
    public async Task L2_016_a_frequency_that_is_not_offered_is_refused()
    {
        var client = await Join();

        var response = await Frequency(client, "hourly");

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("FREQUENCY_UNKNOWN", (await Json(response)).GetProperty("errors").GetProperty("frequency").GetString());
    }

    // L2-016 AC8 (L2-118): a failed load names its reference.
    [Fact]
    public async Task L2_016_a_failed_load_or_save_names_JB_PREF_503()
    {
        var client = await Join();
        _factory.Database.Unavailable = true;
        try
        {
            var load = await client.GetAsync(Preferences);
            var save = await Switch(client, "tips", true);

            Assert.Equal(HttpStatusCode.ServiceUnavailable, load.StatusCode);
            Assert.Equal("JB-PREF-503", (await Json(load)).GetProperty("reference").GetString());
            Assert.Equal(HttpStatusCode.ServiceUnavailable, save.StatusCode);
            Assert.Equal("JB-PREF-503", (await Json(save)).GetProperty("reference").GetString());
        }
        finally
        {
            _factory.Database.Unavailable = false;
        }
    }

    // L2-133
    [Fact]
    public async Task L2_133_the_settings_need_a_session_and_belong_to_the_signed_in_member()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await _factory.CreateClient().GetAsync(Preferences)).StatusCode);
        var joanna = await Join();
        var david = await Join("david.chen@example.com", "David", "Chen");

        await Switch(joanna, "tips", true);

        Assert.False((await ReadPreferences(david)).GetProperty("tips").GetBoolean());
    }

    // L2-149 AC3: the time and method of each consent given or withdrawn are recorded.
    [Fact]
    public async Task L2_149_AC3_turning_a_promotional_switch_on_and_off_records_the_time_and_method()
    {
        var client = await Join();
        await Switch(client, "new-businesses", true);
        _factory.Clock.Advance(TimeSpan.FromHours(2));
        await Switch(client, "new-businesses", false);

        var records = await Read(db => db.ConsentRecords.OrderBy(r => r.OccurredAt).ToListAsync());

        Assert.Equal(2, records.Count);
        Assert.All(records, r => Assert.Equal(EmailCategories.NewBusinesses, r.Category));
        Assert.All(records, r => Assert.Equal(ConsentMethod.SettingsSwitch, r.Method));
        Assert.True(records[0].Given);
        Assert.False(records[1].Given);
        Assert.Equal(TimeSpan.FromHours(2), records[1].OccurredAt - records[0].OccurredAt);
    }

    [Fact]
    public async Task L2_149_a_change_that_changes_nothing_and_a_transactional_switch_leave_no_record()
    {
        var client = await Join();

        await Switch(client, "tips", false);
        await Switch(client, "messages", false);
        await Switch(client, "tips", true);
        await Switch(client, "tips", true);

        var records = await Read(db => db.ConsentRecords.ToListAsync());
        var only = Assert.Single(records);
        Assert.Equal(EmailCategories.Tips, only.Category);
        Assert.True(only.Given);
    }

    // L2-149 AC2, L2-068 AC3: withdrawing from the link in an e-mail is recorded too.
    [Fact]
    public async Task L2_149_AC2_an_unsubscribe_from_an_e_mail_records_the_withdrawal_with_its_method()
    {
        var client = await Join();
        await Switch(client, "tips", true);
        var memberId = await Read(db => Task.FromResult(db.Members.Single().Id));
        var token = _factory.Services.GetRequiredService<Application.Notifications.IUnsubscribeLinks>().For(memberId, EmailCategories.Tips);

        var response = await _factory.CreateClient().PostAsync(
            $"/api/email/unsubscribe/{token}", new FormUrlEncodedContent([new("List-Unsubscribe", "One-Click")]));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False((await ReadPreferences(client)).GetProperty("tips").GetBoolean());
        var withdrawal = await Read(db => db.ConsentRecords.SingleAsync(r => !r.Given));
        Assert.Equal(ConsentMethod.OneClickUnsubscribe, withdrawal.Method);
    }
}
