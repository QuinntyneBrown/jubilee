using System.Security.Cryptography;
using System.Text;
using Jubilee.Application.Messaging;

namespace Jubilee.Api.Controllers;

/// <summary>
/// HMAC-signed links that expire after five minutes (L2-060 AC4). Anyone holding a fresh link
/// can fetch the photo; the link is only handed to participants of the conversation.
/// </summary>
public sealed class AttachmentLinks(IConfiguration configuration, TimeProvider clock) : IAttachmentLinks
{
    public static readonly TimeSpan Lifetime = TimeSpan.FromMinutes(5);

    private readonly byte[] _key = Encoding.UTF8.GetBytes(configuration["Attachments:SigningKey"] ?? "development-attachment-signing-key-change-me");

    public string Create(Guid attachmentId)
    {
        var expires = clock.GetUtcNow().Add(Lifetime).ToUnixTimeSeconds();
        return $"/api/attachments/{attachmentId}?expires={expires}&sig={Sign(attachmentId, expires)}";
    }

    public bool IsValid(Guid attachmentId, long expires, string signature)
    {
        if (expires < clock.GetUtcNow().ToUnixTimeSeconds())
        {
            return false;
        }

        return CryptographicOperations.FixedTimeEquals(
            Encoding.ASCII.GetBytes(Sign(attachmentId, expires)), Encoding.ASCII.GetBytes(signature ?? string.Empty));
    }

    private string Sign(Guid attachmentId, long expires) =>
        Convert.ToHexString(HMACSHA256.HashData(_key, Encoding.ASCII.GetBytes($"{attachmentId:N}.{expires}"))).ToLowerInvariant();
}
