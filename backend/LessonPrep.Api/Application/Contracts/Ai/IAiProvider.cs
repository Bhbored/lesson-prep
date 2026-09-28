using System.Text.Json;
using LessonPrep.Api.Application.Dtos;

namespace LessonPrep.Api.Application.Contracts.Ai;

public interface IAiProvider
{
    string Id { get; }
    Task<IReadOnlyList<AiModel>> ListModelsAsync(string apiKey, CancellationToken cancellationToken);
    IAsyncEnumerable<string> StreamLessonJsonAsync(string apiKey, string model, LessonAiRequest request, CancellationToken cancellationToken);
    Task<string> SummarizeChunkAsync(string apiKey, string model, string chunk, CancellationToken cancellationToken);
    JsonElement TranslateTools(IReadOnlyList<AiToolDefinition> tools);
    IReadOnlyList<AiToolCall> ParseToolCalls(JsonElement response);
}
