using System.Net.Http.Headers;
using System.Runtime.CompilerServices;
using System.Text.Json;
using LessonPrep.Api.Application.Contracts.Ai;
using LessonPrep.Api.Application.Dtos;
using LessonPrep.Api.Application.Enums;
using LessonPrep.Api.Application.Exceptions;
using LessonPrep.Api.Helpers.Prompts;
using LessonPrep.Api.Helpers.Schemas;

namespace LessonPrep.Api.Infrastructure.Ai;

public sealed class DeepSeekProvider(IHttpClientFactory factory) : AiProviderBase(factory)
{
    public override AiProvider Provider => AiProvider.DeepSeek;
    public override async Task<IReadOnlyList<AiModel>> ListModelsAsync(string apiKey, CancellationToken ct)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "https://api.deepseek.com/models");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        using var response = await Client.SendAsync(request, ct);
        await EnsureSuccessAsync(response, ct);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStreamAsync(ct));
        return doc.RootElement.GetProperty("data").EnumerateArray()
            .Where(x => x.GetProperty("id").GetString()?.StartsWith("deepseek-") == true)
            .Select(x => new AiModel(x.GetProperty("id").GetString()!, x.TryGetProperty("name", out var n) ? n.GetString() ?? x.GetProperty("id").GetString()! : x.GetProperty("id").GetString()!)).ToArray();
    }
    public override async IAsyncEnumerable<string> StreamLessonJsonAsync(string apiKey, string model, LessonAiRequest input,
        [EnumeratorCancellation] CancellationToken ct)
    {
        using var request = JsonPost("https://api.deepseek.com/responses", new
        {
            model, instructions = LessonPrompt.System, input = LessonPrompt.User(input), stream = true,
            text = new { format = new { type = "json_schema", name = "lesson_preparation", schema = LessonSchema.Element } }
        }, apiKey);
        using var response = await Client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
        await EnsureSuccessAsync(response, ct);
        await foreach (var (eventName, data) in ReadSseAsync(response, ct))
        {
            if (eventName is "response.failed" or "response.incomplete") throw new ProviderException("DeepSeek did not complete the response.");
            if (eventName != "response.output_text.delta") continue;
            using var doc = JsonDocument.Parse(data);
            if (doc.RootElement.TryGetProperty("delta", out var delta)) yield return delta.GetString() ?? "";
        }
    }
    public override JsonElement TranslateTools(IReadOnlyList<AiToolDefinition> tools) =>
        JsonSerializer.SerializeToElement(tools.Select(x => new { type = "function", name = x.Name, description = x.Description, parameters = ToolSchema(x) }).ToArray());
    public override IReadOnlyList<AiToolCall> ParseToolCalls(JsonElement response) => OpenAiToolCalls(response);
    public override async Task<string> SummarizeChunkAsync(string apiKey, string model, string chunk, CancellationToken ct)
    {
        using var request = JsonPost("https://api.deepseek.com/responses", new { model, instructions = SummaryInstruction, input = chunk, max_output_tokens = 1200 }, apiKey);
        using var response = await Client.SendAsync(request, ct);
        await EnsureSuccessAsync(response, ct);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStreamAsync(ct));
        return OpenAiResponseText(doc.RootElement);
    }
}
