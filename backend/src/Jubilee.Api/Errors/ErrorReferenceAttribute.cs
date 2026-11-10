namespace Jubilee.Api.Errors;

/// <summary>
/// Declares the reference a user quotes to support when the endpoint cannot be served (L2-118):
/// area code for the feature and <c>503</c> for "service unavailable", for example
/// <c>JB-DIR-503</c>. The exception middleware reads it from the endpoint metadata.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class ErrorReferenceAttribute(string reference) : Attribute
{
    public string Reference { get; } = reference;
}
