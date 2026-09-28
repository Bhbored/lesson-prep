namespace LessonPrep.Api.Application.Contracts.Documents;

public interface IOcrService
{
    Task<string> ReadImageAsync(byte[] png, string language, CancellationToken cancellationToken);
}
