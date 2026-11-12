namespace Jubilee.Api.Sessions;

/// <summary>
/// The cookie of a member session (L2-135 AC1, ADR 0045). It is <c>__Host-jubilee.session</c>,
/// always <c>Secure</c>: the prefix makes the browser keep it only from HTTPS, for this host alone
/// and for the whole site. The Development environment runs on <c>http://localhost</c>, where a
/// browser refuses that prefix, so there the cookie is <c>jubilee.session</c> and <c>Secure</c>
/// follows the request. <c>Session:HostPrefix</c> overrides the default either way.
/// </summary>
public sealed class MemberSessionCookie
{
    public const string PrefixedName = "__Host-jubilee.session";
    public const string DevelopmentName = "jubilee.session";

    public MemberSessionCookie(IConfiguration configuration, IHostEnvironment environment)
    {
        HostPrefix = configuration.GetValue<bool?>("Session:HostPrefix") ?? !environment.IsDevelopment();
    }

    /// <summary>Whether the cookie carries the <c>__Host-</c> prefix.</summary>
    public bool HostPrefix { get; }

    public string Name => HostPrefix ? PrefixedName : DevelopmentName;

    public CookieSecurePolicy SecurePolicy => HostPrefix ? CookieSecurePolicy.Always : CookieSecurePolicy.SameAsRequest;
}
