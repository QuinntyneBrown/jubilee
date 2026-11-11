using System.Security.Cryptography;
using System.Text;

namespace Jubilee.Api.Errors;

/// <summary>Builds the references a user quotes to support (L2-115, L2-118).</summary>
public static class ErrorReferences
{
    private const string Alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    /// <summary>
    /// <c>JB-500-{code}</c> for an unhandled failure: four characters from a hash of the correlation ID, so the same
    /// request always quotes the same code and support finds its log entries by the reference and the time.
    /// </summary>
    public static string ForUnhandled(string correlationId)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(correlationId));
        var code = new char[4];
        for (var i = 0; i < code.Length; i++)
        {
            code[i] = Alphabet[hash[i] % Alphabet.Length];
        }

        return $"JB-500-{new string(code)}";
    }
}
