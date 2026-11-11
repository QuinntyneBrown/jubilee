using Jubilee.Api.Errors;
using Jubilee.Api.Middleware;
using Jubilee.Api.RateLimiting;
using Jubilee.Application;
using Jubilee.Infrastructure;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddControllers();
builder.Services.AddSingleton<Jubilee.Application.Messaging.IAttachmentLinks, Jubilee.Api.Controllers.AttachmentLinks>();
builder.Services.AddJubileeRateLimiting(builder.Configuration);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Sign-in arrives in a later journey. The cookie scheme is in place so that an API caller is
// answered with a status code, never a redirect to a sign-in page.
builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "jubilee.session";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.Events.OnValidatePrincipal = async context =>
        {
            // A session that began before the password last changed has ended (L2-134 AC3).
            var principal = context.Principal;
            if (principal?.FindFirst(Jubilee.Api.Controllers.SessionClaims.IssuedAt) is { } issued
                && long.TryParse(issued.Value, out var ticks)
                && Guid.TryParse(principal.FindFirst("sub")?.Value, out var memberId))
            {
                var db = context.HttpContext.RequestServices.GetRequiredService<Jubilee.Application.Abstractions.IAppDbContext>();
                var changedAt = await db.Members.Where(m => m.Id == memberId).Select(m => m.PasswordChangedAt)
                    .SingleOrDefaultAsync(context.HttpContext.RequestAborted);
                if (changedAt is { } changed && ticks < changed.UtcTicks)
                {
                    context.RejectPrincipal();
                    await context.HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
                }
            }
        };
        options.Events.OnRedirectToLogin = context => ProblemWriter.WriteAsync(
            context.HttpContext, StatusCodes.Status401Unauthorized, "Sign in to continue.", code: "sign_in_required");
        options.Events.OnRedirectToAccessDenied = context => ProblemWriter.WriteAsync(
            context.HttpContext, StatusCodes.Status403Forbidden, "You can't do that.", code: "forbidden");
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
app.UseMiddleware<MaintenanceMiddleware>();
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
