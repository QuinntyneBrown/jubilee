using System.Net;
using System.Text;
using System.Text.RegularExpressions;

namespace Jubilee.Application.Emails;

/// <summary>One e-mail as the provider sends it: a plain-text part and an HTML part that say the same (L2-179 AC5).</summary>
/// <param name="UnsubscribeUrl">Set for notification e-mails: sent as <c>List-Unsubscribe</c> with one-click POST (RFC 8058).</param>
public sealed record EmailMessage(string To, string Subject, string TextBody, string HtmlBody, string? UnsubscribeUrl = null);

/// <summary>
/// Renders the HTML part of an e-mail from the text a handler wrote (ADR 0038). Each paragraph of the
/// text becomes a paragraph; a link on a line of its own becomes a button with the link repeated as
/// text; everything is HTML-encoded. The layout adds the header with the wordmark, the preheader and
/// the footer. It holds no image, so there is nothing to track with (L2-179 AC4).
/// </summary>
public static partial class EmailLayout
{
    private const string Signature = "Jubilee ·";

    private const string ParagraphStyle = "margin:0 0 16px;font-size:16px;line-height:24px;color:#0b0e14;";

    private static readonly Lazy<string> Layout = new(() =>
    {
        using var stream = typeof(EmailLayout).Assembly.GetManifestResourceStream("Jubilee.Application.Emails.EmailLayout.html")
            ?? throw new InvalidOperationException("The e-mail layout is missing from the assembly.");
        using var reader = new StreamReader(stream, Encoding.UTF8);
        return reader.ReadToEnd().ReplaceLineEndings("\n");
    });

    /// <summary>What the button of a link says, by the first segment of the link's path.</summary>
    private static readonly (string Path, string Label)[] Labels =
    [
        ("/verify-email/", "Confirm your e-mail"),
        ("/confirm-email-change/", "Confirm your new e-mail"),
        ("/reset-password/", "Choose a new password"),
        ("/forgot-password", "Reset your password"),
        ("/reference/", "Answer the request"),
        ("/account/data/", "Download your data"),
        ("/sign-in", "Sign in to Jubilee"),
        ("/messages", "Open the conversation"),
        ("/my-business/requests", "Open your requests"),
        ("/my-business", "Open your business"),
        ("/requests/", "Open your request"),
        ("/list", "Open your listing"),
        ("/b/", "Open the business page"),
    ];

    public static EmailMessage Render(string to, string subject, string textBody, string? unsubscribeUrl = null)
    {
        var paragraphs = textBody.ReplaceLineEndings("\n").Split("\n\n", StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(p => !p.StartsWith(Signature, StringComparison.Ordinal))
            .ToList();
        var content = new StringBuilder();
        foreach (var paragraph in paragraphs)
        {
            content.Append(IsLink(paragraph) ? Button(paragraph) : Paragraph(paragraph));
        }

        var preheader = paragraphs.FirstOrDefault(p => !IsLink(p) && !p.StartsWith("Hi ", StringComparison.Ordinal)) ?? subject;
        var footer = unsubscribeUrl is null
            ? string.Empty
            : $"            <p class=\"jb-mail__muted\" style=\"margin:8px 0 0;font-size:13px;line-height:20px;color:#4a505c;\">You get this e-mail because of your notification settings. <a class=\"jb-mail__link\" href=\"{Encode(unsubscribeUrl)}\" style=\"color:#006644;\">Unsubscribe from e-mails like this</a>.</p>\n";
        var html = Layout.Value
            .Replace("{{subject}}", Encode(subject), StringComparison.Ordinal)
            .Replace("{{preheader}}", Encode(preheader.ReplaceLineEndings(" ")), StringComparison.Ordinal)
            .Replace("{{content}}\n", content.ToString(), StringComparison.Ordinal)
            .Replace("{{footer}}\n", footer, StringComparison.Ordinal);
        return new EmailMessage(to, subject, textBody, html, unsubscribeUrl);
    }

    private static bool IsLink(string paragraph) =>
        !paragraph.Contains(' ') && !paragraph.Contains('\n')
        && Uri.TryCreate(paragraph, UriKind.Absolute, out var uri) && (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp);

    /// <summary>A paragraph of text. A link inside a sentence stays where it is and becomes a link.</summary>
    private static string Paragraph(string text)
    {
        var html = LinkInText().Replace(Encode(text), match =>
        {
            var link = match.Value.TrimEnd('.', ',', ';', ':', ')');
            return $"<a class=\"jb-mail__link\" href=\"{link}\" style=\"color:#006644;\">{link}</a>{match.Value[link.Length..]}";
        });
        return $"            <p class=\"jb-mail__text\" style=\"{ParagraphStyle}\">{html.Replace("\n", "<br>", StringComparison.Ordinal)}</p>\n";
    }

    [GeneratedRegex(@"https?://[^\s<]+")]
    private static partial Regex LinkInText();

    private static string Button(string link)
    {
        var path = new Uri(link).AbsolutePath;
        var label = Labels.FirstOrDefault(l => path.StartsWith(l.Path, StringComparison.Ordinal)).Label ?? "Open Jubilee";
        var href = Encode(link);
        return
            "            <table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"margin:8px 0 16px;\"><tr><td style=\"border-radius:8px;background-color:#ffb81c;\">"
            + $"<a class=\"jb-mail__button\" href=\"{href}\" style=\"display:inline-block;padding:12px 24px;border:1px solid #b87f00;border-radius:8px;font-size:16px;line-height:24px;font-weight:600;color:#0b0e14;text-decoration:none;text-align:center;\">{Encode(label)}</a>"
            + "</td></tr></table>\n"
            + $"            <p class=\"jb-mail__muted\" style=\"margin:0 0 16px;font-size:13px;line-height:20px;color:#4a505c;word-break:break-all;\">If the button doesn’t work, paste this link into your browser:<br><a class=\"jb-mail__link\" href=\"{href}\" style=\"color:#006644;\">{href}</a></p>\n";
    }

    private static string Encode(string text) => WebUtility.HtmlEncode(text);
}
