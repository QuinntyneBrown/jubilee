namespace Jubilee.Application.Errors;

/// <summary>A link that was used, replaced or has expired. The API answers 410.</summary>
public sealed class GoneException(string code, string message) : Exception(message)
{
    public string Code { get; } = code;
}
