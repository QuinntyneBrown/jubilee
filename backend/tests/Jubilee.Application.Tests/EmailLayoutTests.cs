using Jubilee.Application.Emails;

namespace Jubilee.Application.Tests;

/// <summary>The HTML part every e-mail gets from its text (L2-179 AC5 and AC6, ADR 0038).</summary>
public class EmailLayoutTests
{
    private const string Signature = "Jubilee · Toronto's Christian marketplace\n";

    private static string Html(string text, string? unsubscribe = null) =>
        EmailLayout.Render("joanna.adeyemi@example.com", "Subject", text, unsubscribe).HtmlBody;

    [Fact]
    public void L2_179_AC6_a_link_named_by_its_sentence_becomes_a_button_with_that_name()
    {
        var html = Html(
            "Hi Daniel,\n\nJoanna Adeyemi would like to meet.\n\nRetirement review\nThu 12 Nov, 2:00 PM\nConfirm or decline it: https://jubilee.test/my-business/requests\n\n"
            + Signature);

        Assert.Contains("href=\"https://jubilee.test/my-business/requests\"", html);
        Assert.Contains(">Confirm or decline it</a>", html);
        Assert.Contains("Retirement review<br>Thu 12 Nov, 2:00 PM</p>", html);   // the lines above it stay a paragraph
        Assert.DoesNotContain("Confirm or decline it:", html);                    // the sentence is the button, not repeated
    }

    [Fact]
    public void L2_179_AC6_a_link_inside_a_sentence_stays_in_the_sentence_as_a_link()
    {
        var html = Html("Hi Joanna,\n\nIf that was you, sign in at https://jubilee.test/sign-in.\n\n" + Signature);

        Assert.Contains("sign in at <a class=\"jb-mail__link\" href=\"https://jubilee.test/sign-in\"", html);
        Assert.Contains(">https://jubilee.test/sign-in</a>.</p>", html);          // the full stop is not part of the link
    }

    [Fact]
    public void L2_179_AC5_the_signature_of_the_text_is_not_repeated_above_the_footer()
    {
        var html = Html("Hi Ruth,\n\nWe will delete the draft in 14 days.\n\nNothing was ever public. " + Signature);

        Assert.Contains("Nothing was ever public.</p>", html);
        Assert.Single(System.Text.RegularExpressions.Regex.Matches(html, "Christian marketplace"));
    }

    [Fact]
    public void L2_179_AC5_the_preheader_is_the_first_thing_said_after_the_greeting()
    {
        var html = Html("Hello,\n\nRuth Okafor is listing Okafor Bakery on Jubilee and named you as her church reference.\n\nAnswer here: https://jubilee.test/reference/abc\n\n" + Signature);

        Assert.Contains("opacity:0;color:transparent;\">Ruth Okafor is listing Okafor Bakery on Jubilee and named you as her church reference.</div>", html);
        Assert.Contains(">Answer here</a>", html);
    }

    [Fact]
    public void L2_068_AC3_a_notification_e_mail_ends_with_its_unsubscribe_link()
    {
        var html = Html("Hi Joanna,\n\nLegacy Financial sent you a message on Jubilee.\n\n" + Signature, "https://jubilee.test/api/email/unsubscribe/abc");

        Assert.Contains("href=\"https://jubilee.test/api/email/unsubscribe/abc\"", html);
        Assert.Contains("Unsubscribe from e-mails like this", html);
        Assert.DoesNotContain("Unsubscribe", Html("Hi Joanna,\n\nYour password was changed.\n\n" + Signature));
    }

    [Fact]
    public void L2_179_AC6_what_a_person_wrote_cannot_add_markup()
    {
        var html = Html("Hi Joanna,\n\nEsther asked for changes:\n\n<a href=\"https://evil.example\">Click</a> & <img src=x onerror=alert(1)>\n\n" + Signature);

        Assert.Contains("&lt;a href=&quot;", html);
        Assert.DoesNotContain("<img", html);
        Assert.DoesNotContain("href=\"https://evil.example\"", html);
    }
}
