using Jubilee.Api.Errors;
using Jubilee.Api.Middleware;
using Jubilee.Api.RateLimiting;
using Jubilee.Application;
using Jubilee.Infrastructure;
using Jubilee.Api.Sessions;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// The development staff identity signs anyone in with a second factor; it never runs outside Development (ADR 0040).
if (string.Equals(builder.Configuration["StaffSignIn:Provider"], "Development", StringComparison.OrdinalIgnoreCase)
    && !builder.Environment.IsDevelopment())
{
    throw new InvalidOperationException(
        $"StaffSignIn:Provider=Development is only allowed in the Development environment, not {builder.Environment.EnvironmentName}.");
}

// On a developer's machine, and in the e2e API, no malware scanner runs: say so rather than refuse
// every photo. Everywhere else a missing scanner means no photo is accepted (L2-138 AC4, ADR 0051).
if (builder.Environment.IsDevelopment() && string.IsNullOrWhiteSpace(builder.Configuration["Malware:Scanner"]))
{
    builder.Configuration["Malware:Scanner"] = "none";
}

builder.Services.AddApplication();
// The caller's address (ADR 0040): X-Forwarded-For is believed only from server.js on loopback, and
// only its last entry, the one App Service's front end appended. ASPNETCORE_FORWARDEDHEADERS_ENABLED is
// not used, because it trusts every proxy.
builder.Services.Configure<Microsoft.AspNetCore.Builder.ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor
        | Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = 1;
    options.KnownProxies.Clear();
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Add(System.Net.IPAddress.Loopback);
    options.KnownProxies.Add(System.Net.IPAddress.IPv6Loopback);
});
builder.Services.AddSingleton(StaffNetworks.From(builder.Configuration));
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddControllers();
builder.Services.AddSingleton<Jubilee.Application.Messaging.IAttachmentLinks, Jubilee.Api.Controllers.AttachmentLinks>();
builder.Services.AddJubileeRateLimiting(builder.Configuration);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Sessions live in the database (ADR 0013): the cookie holds an opaque key. A caller whose session
// has ended is told so (401 SESSION_EXPIRED) and the cookie is removed; a caller who never had one is
// told to sign in. Either way the answer is a status code, never a redirect.
builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton<DatabaseTicketStore>();
// The cookie is __Host-jubilee.session everywhere but on a developer's machine (L2-135 AC1, ADR 0046).
var sessionCookie = new MemberSessionCookie(builder.Configuration, builder.Environment);
builder.Services.AddSingleton(sessionCookie);
builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = sessionCookie.Name;
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.Cookie.SecurePolicy = sessionCookie.SecurePolicy;
        options.Cookie.Path = "/";
        options.ExpireTimeSpan = Jubilee.Domain.SessionPolicy.AbsoluteLifetime;
        options.SlidingExpiration = false;
        options.Events.OnRedirectToLogin = async context =>
        {
            var ended = context.Request.Cookies.ContainsKey(options.Cookie.Name!);
            if (ended)
            {
                // Removed with the attributes it was set with: a browser drops a __Host- cookie only then.
                options.CookieManager.DeleteCookie(context.HttpContext, options.Cookie.Name!, options.Cookie.Build(context.HttpContext));
            }

            await ProblemWriter.WriteAsync(
                context.HttpContext, StatusCodes.Status401Unauthorized, "Sign in to continue.",
                code: ended ? "SESSION_EXPIRED" : "sign_in_required");
        };
        options.Events.OnRedirectToAccessDenied = context => ProblemWriter.WriteAsync(
            context.HttpContext, StatusCodes.Status403Forbidden, "You can't do that.", code: "forbidden");
    });
// The staff session of the admin application (ADR 0040): its own cookie, store and lifetime.
builder.Services.AddSingleton<StaffTicketStore>();
builder.Services.AddAuthentication().AddCookie(StaffSession.Scheme, StaffSession.Configure);
builder.Services.AddOptions<CookieAuthenticationOptions>(StaffSession.Scheme)
    .Configure<StaffTicketStore, TimeProvider>((options, store, time) =>
    {
        options.SessionStore = store;
        options.TimeProvider = time;
    });
builder.Services.AddOptions<CookieAuthenticationOptions>(CookieAuthenticationDefaults.AuthenticationScheme)
    .Configure<DatabaseTicketStore, TimeProvider>((options, store, time) =>
    {
        options.SessionStore = store;
        options.TimeProvider = time;
    });

// Every endpoint requires a signed-in caller unless it opts out with [AllowAnonymous].
builder.Services.AddAuthorizationBuilder()
    .SetFallbackPolicy(new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build())
    .AddStaffPolicies();

var app = builder.Build();

if (app.Services.GetRequiredService<Jubilee.Application.Abstractions.IMalwareScanner>() is Jubilee.Infrastructure.Media.NoMalwareScanner)
{
    app.Logger.LogWarning("Malware:Scanner is none: message photos are stored without a malware scan. This is for development only.");
}

app.UseForwardedHeaders();
app.UseMiddleware<StaffProxyMiddleware>();
app.UseMiddleware<CorrelationIdMiddleware>();
app.UseMiddleware<RequestLoggingMiddleware>();
app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseMiddleware<MaintenanceMiddleware>();
app.UseMiddleware<SecurityHeadersMiddleware>();

// Swagger stays above UseAuthentication so the fallback policy never hides the API description.
if (!app.Environment.IsProduction())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseRouting();
// Staff endpoints answer only an allowed network, before any session is read (L2-192).
app.UseMiddleware<StaffNetworkMiddleware>();
app.UseAuthentication();
app.UseRateLimiter();
app.UseMiddleware<CsrfMiddleware>();
app.UseAuthorization();
app.UseMiddleware<AgreementRequiredMiddleware>();
app.MapControllers();

await app.Services.InitialiseDatabaseAsync(app.Configuration);

app.Run();

public partial class Program;
