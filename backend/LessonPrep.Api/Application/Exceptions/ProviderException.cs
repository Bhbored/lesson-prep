namespace LessonPrep.Api.Application.Exceptions;

public sealed class ProviderException(string message, int? status = null, string? detail = null,
    Exception? innerException = null) : Exception(message, innerException)
{
    public int? Status { get; } = status;
    public string? InternalDetail { get; } = detail;
}
