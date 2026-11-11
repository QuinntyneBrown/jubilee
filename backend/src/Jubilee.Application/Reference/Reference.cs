using System.Security.Cryptography;
using System.Text;
using Jubilee.Application.Abstractions;
using Jubilee.Application.Accounts;
using Jubilee.Application.Errors;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Reference;

/// <summary>A closed or unknown link: "This request is closed." (L2-082). The API answers 410, or 404 for an unknown token.</summary>
public sealed class GoneException(string code, string message) : Exception(message)
{
    public string Code { get; } = code;
}

/// <summary>The tokens of reference links: 256 random bits, kept only as a SHA-256 hash (L2-080 AC2, L2-140).</summary>
public static class ReferenceTokens
{
    public const string ClosedCode = "REFERENCE_LINK_CLOSED";

    public static string New() => Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();

    public static string Hash(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token))).ToLowerInvariant();
}

/// <summary>
/// Words about the owner for the reference form, the reference e-mail and the verification team
/// screens (L2-081 AC6): the owner's chosen pronouns, or the first name when none is chosen. Pronouns
/// are chosen in the profile (a later journey), so for now every owner is named.
/// </summary>
public sealed record OwnerWording(string First)
{
    public string KnowAndVouch => $"I know {First} and can vouch for {First}";

    public string KnowButCannotVouch => $"I know {First}, but I can’t vouch for {First}’s business";

    public string DoNotKnow => "I don’t know this person";

    public string Closed =>
        $"Reference links work once, for 14 days. If {First} still needs a reference, {First} can send you a new request from the listing.";
}

public sealed record AnswerOption(string Value, string Label, string Hint);

/// <summary>What the reference form shows. It carries only what the form needs (L2-081 AC1).</summary>
public sealed record ReferenceRequestView(
    string OwnerName,
    string OwnerFirstName,
    string Business,
    string Church,
    string Intro,
    string Question,
    IReadOnlyList<AnswerOption> Answers);

internal static class ReferenceRequests
{
    /// <summary>
    /// Issues a fresh link for a listing's reference, closing the one that was open, and queues the
    /// request to the reference. Only the business name goes out: never the tagline, products or
    /// the owner's other details (L2-074 AC1).
    /// </summary>
    public static void Issue(
        IAppDbContext db,
        AccountSettings settings,
        Listing listing,
        string ownerName,
        string ownerFirstName,
        ListingSubmission submission,
        ReferenceLinkKind kind,
        IEnumerable<ReferenceLink> open,
        DateTimeOffset now)
    {
        foreach (var link in open)
        {
            link.Close(ReferenceLinkEnd.Replaced, now);
        }

        var token = ReferenceTokens.New();
        db.ReferenceLinks.Add(ReferenceLink.Issue(
            listing.Id, ReferenceTokens.Hash(token), submission.PastorEmail, submission.Church, kind, now));
        var reminder = kind == ReferenceLinkKind.Reminder;
        var subject = reminder
            ? $"Reminder: can you confirm {listing.Name}?"
            : $"Can you confirm {listing.Name}? A reference request from Jubilee";
        var lead = reminder
            ? $"A reminder: {ownerName} named you at {submission.Church} as {ownerFirstName}’s church reference for {listing.Name}, a business {ownerFirstName} would like to list on Jubilee, Toronto's Christian marketplace."
            : $"{ownerName} has named you at {submission.Church} as {ownerFirstName}’s church reference for {listing.Name}, a business {ownerFirstName} would like to list on Jubilee, Toronto's Christian marketplace.";
        db.OutboxMessages.Add(OutboxMessage.Email(
            null,
            submission.PastorEmail,
            subject,
            $"Hello,\n\n{lead}\n\nWe only ask whether you know {ownerFirstName} and can confirm the commitments in our statement of faith. It takes a minute, we contact you privately and you do not need an account.\n\nAnswer here: {settings.PublicBaseUrl.TrimEnd('/')}/reference/{token}\n\nThe link works once, for 14 days. If you do not know {ownerFirstName}, you can ignore this e-mail.\n\nJubilee · Toronto's Christian marketplace\n",
            now));
    }

    /// <summary>The open link of a listing; there is at most one.</summary>
    public static Task<List<ReferenceLink>> OpenLinks(IAppDbContext db, Guid listingId, DateTimeOffset now, CancellationToken cancellationToken) =>
        db.ReferenceLinks.Where(l => l.ListingId == listingId && l.ClosedAt == null && l.ExpiresAt > now).ToListAsync(cancellationToken);

    public static async Task<(ReferenceLink Link, Listing Listing, string OwnerName, string OwnerFirstName)> Resolve(
        IAppDbContext db, string? token, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var generic = "Reference links work once, for 14 days. If the owner still needs a reference, they can send you a new request from their listing.";
        if (string.IsNullOrWhiteSpace(token) || token.Length > 200)
        {
            throw new NotFoundException(ReferenceTokens.ClosedCode, generic);
        }

        var hash = ReferenceTokens.Hash(token);
        var link = await db.ReferenceLinks.SingleOrDefaultAsync(l => l.TokenHash == hash, cancellationToken)
            ?? throw new NotFoundException(ReferenceTokens.ClosedCode, generic);
        var listing = await db.Listings.SingleOrDefaultAsync(l => l.Id == link.ListingId && l.DeletedAt == null, cancellationToken);
        if (listing is null)
        {
            throw new GoneException(ReferenceTokens.ClosedCode, generic);
        }

        var (name, first) = await OwnerNames(db, listing.OwnerId, cancellationToken);
        if (!link.IsOpen(now))
        {
            throw new GoneException(ReferenceTokens.ClosedCode, new OwnerWording(first).Closed);
        }

        return (link, listing, name, first);
    }

    public static async Task<(string Name, string First)> OwnerNames(IAppDbContext db, string? ownerSubject, CancellationToken cancellationToken)
    {
        if (Guid.TryParse(ownerSubject, out var id)
            && await db.Members.AsNoTracking().SingleOrDefaultAsync(m => m.Id == id, cancellationToken) is { } owner)
        {
            return (owner.DisplayName, owner.FirstName);
        }

        return ("the owner", "the owner");
    }
}

/// <summary>Opens a reference link: the form for a valid one, "closed" for the rest (L2-081, L2-082).</summary>
public sealed record OpenReferenceRequestQuery(string? Token) : IRequest<ReferenceRequestView>;

public sealed class OpenReferenceRequestQueryHandler(IAppDbContext db, TimeProvider clock)
    : IRequestHandler<OpenReferenceRequestQuery, ReferenceRequestView>
{
    public async Task<ReferenceRequestView> Handle(OpenReferenceRequestQuery request, CancellationToken cancellationToken)
    {
        var (link, listing, ownerName, first) = await ReferenceRequests.Resolve(db, request.Token, clock.GetUtcNow(), cancellationToken);
        var words = new OwnerWording(first);
        return new ReferenceRequestView(
            ownerName,
            first,
            listing.Name,
            link.Church,
            $"{first} is listing {listing.Name} on Jubilee, Toronto’s Christian marketplace, and named you at {link.Church} as {first}’s church reference. Your answer is private: {first} and the public never see it.",
            $"How well do you know {first}?",
            [
                new AnswerOption("vouches", words.KnowAndVouch, $"{first} is part of our church and I trust {first} to deal honestly"),
                new AnswerOption("cant-vouch", words.KnowButCannotVouch, "Tell us more below if you can"),
                new AnswerOption("doesnt-know", words.DoNotKnow, "We will not publish the listing on this reference"),
            ]);
    }
}

public sealed record SubmitReferenceAnswerCommand(string? Token, string? Answer, string? Name, string? Role, string? Note) : IRequest;

public sealed class SubmitReferenceAnswerCommandHandler(IAppDbContext db, TimeProvider clock)
    : IRequestHandler<SubmitReferenceAnswerCommand>
{
    public const int NoteLimit = 1000;

    public async Task Handle(SubmitReferenceAnswerCommand request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var (link, listing, _, _) = await ReferenceRequests.Resolve(db, request.Token, now, cancellationToken);

        var errors = new Dictionary<string, string>();
        var kind = request.Answer switch
        {
            "vouches" => ReferenceAnswerKind.Vouches,
            "cant-vouch" => ReferenceAnswerKind.CantVouch,
            "doesnt-know" => ReferenceAnswerKind.DoesntKnow,
            _ => (ReferenceAnswerKind?)null,
        };
        if (kind is null)
        {
            errors["answer"] = "ANSWER_REQUIRED";
        }

        var name = request.Name?.Trim() ?? string.Empty;
        if (name.Length == 0)
        {
            errors["name"] = "NAME_REQUIRED";
        }

        var role = request.Role?.Trim() ?? string.Empty;
        if (role.Length == 0)
        {
            errors["role"] = "ROLE_REQUIRED";
        }

        if (request.Note is { Length: > NoteLimit })
        {
            errors["note"] = "NOTE_TOO_LONG";
        }

        if (errors.Count > 0)
        {
            throw new ValidationFailedException(errors);
        }

        db.ReferenceAnswers.Add(ReferenceAnswer.Record(
            listing.Id, link.Id, kind!.Value, name[..Math.Min(name.Length, 200)], role[..Math.Min(role.Length, 200)], request.Note?.Trim(), now));
        link.Close(ReferenceLinkEnd.Answered, now);
        listing.MoveTo(kind == ReferenceAnswerKind.Vouches ? ListingStage.ReadyToReview : ListingStage.NeedsDecision);
        if (kind == ReferenceAnswerKind.Vouches)
        {
            (await db.ListingSubmissions.SingleAsync(s => s.ListingId == listing.Id, cancellationToken)).MarkReady(now);
        }

        Notifications.NotificationRules.Tell(
            db, listing.OwnerId, "listing", $"Your church reference answered for {listing.Name}",
            kind == ReferenceAnswerKind.Vouches ? "We will review your listing next." : "The verification team will decide next.", "/my-business", now);
        await db.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>"Not expecting this? ... tell us": closes the link and tells the verification team (L2-081 AC5).</summary>
public sealed record ReportUnexpectedRequestCommand(string? Token) : IRequest;

public sealed class ReportUnexpectedRequestCommandHandler(IAppDbContext db, TimeProvider clock)
    : IRequestHandler<ReportUnexpectedRequestCommand>
{
    public const string Flag = "REFERENCE_REPORTED";

    public async Task Handle(ReportUnexpectedRequestCommand request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var (link, listing, _, _) = await ReferenceRequests.Resolve(db, request.Token, now, cancellationToken);
        link.Close(ReferenceLinkEnd.Reported, now);
        listing.MoveTo(ListingStage.NeedsDecision);
        var submission = await db.ListingSubmissions.SingleAsync(s => s.ListingId == listing.Id, cancellationToken);
        submission.AddFlag(Flag);
        await db.SaveChangesAsync(cancellationToken);
    }
}
