using Jubilee.Api.Errors;
using Jubilee.Api.Middleware;
using Jubilee.Api.RateLimiting;
using Jubilee.Application;
using Jubilee.Infrastructure;
using Jubilee.Api.Sessions;
using Microsoft.AspNetCore.Authentication.Cookies;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddControllers();
builder.Services.AddJubileeRateLimiting(builder.Configuration);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Sessions live in the database (ADR 0013): the cookie holds an opaque key. A caller whose session
// has ended is told so (401 SESSION_EXPIRED) and the cookie is removed; a caller who never had one is
// told to sign in. Either way the answer is a status code, never a redirect.
builder.Services.AddSingleton<DatabaseTicketStore>();
builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "jubilee.session";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.ExpireTimeSpan = Jubilee.Domain.SessionPolicy.AbsoluteLifetime;
        options.SlidingExpiration = false;
        options.Events.OnRedirectToLogin = async context =>
        {
            var ended = context.Request.Cookies.ContainsKey(options.Cookie.Name!);
            if (ended)
            {
                context.Response.Cookies.Delete(options.Cookie.Name!);
            }

            await ProblemWriter.WriteAsync(
                context.HttpContext, StatusCodes.Status401Unauthorized, "Sign in to continue.",
                code: ended ? "SESSION_EXPIRED" : "sign_in_required");
        };
        options.Events.OnRedirectToAccessDenied = context => ProblemWriter.WriteAsync(
            context.HttpContext, StatusCodes.Status403Forbidden, "You can't do that.", code: "forbidden");
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
        .Build());

var app = builder.Build();

app.UseMiddleware<CorrelationIdMiddleware>();
app.UseMiddleware<RequestLoggingMiddleware>();
app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseMiddleware<SecurityHeadersMiddleware>();

// Swagger stays above UseAuthentication so the fallback policy never hides the API description.
if (!app.Environment.IsProduction())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseRouting();
app.UseAuthentication();
app.UseRateLimiter();
app.UseMiddleware<CsrfMiddleware>();
app.UseAuthorization();
app.UseMiddleware<AgreementRequiredMiddleware>();
app.MapControllers();

await app.Services.InitialiseDatabaseAsync(app.Configuration);

app.Run();

public partial class Program;
