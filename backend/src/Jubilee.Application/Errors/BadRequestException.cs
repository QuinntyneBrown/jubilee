namespace Jubilee.Application.Errors;

/// <summary>A request that lacks what it needs, such as the reason to export private data. The API answers 400.</summary>
public sealed class BadRequestException(string code, string message) : Exception(message)
{
    public string Code { get; } = code;
}
