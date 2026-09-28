using System.Net.Http.Headers;
using System.Runtime.CompilerServices;
using System.Text.Json;
using LessonPrep.Api.Application.Dtos;
using LessonPrep.Api.Application.Exceptions;
using LessonPrep.Api.Application.Services.Lessons;

namespace LessonPrep.Api.Infrastructure.Ai;

public sealed class OpenAiProvider(IHttpClientFactory factory) : AiProviderBase(factory)
{
    public override string Id => "openai";
    public override async Task<IReadOnlyList<AiModel>> ListModelsAsync(string apiKey, CancellationToken ct)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "https://api.openai.com/v1/models");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        using var response = await Client.SendAsync(request, ct);
        await EnsureSuccessAsync(response, ct);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStreamAsync(ct));
        return doc.RootElement.GetProperty("data").EnumerateArray().Select(x => x.GetProperty("id").GetString()!)
            .Where(ModelEligible).Order(StringComparer.Ordinal).Select(x => new AiModel(x, x)).ToArray();
    }
    private static bool ModelEligible(string id) =>
        (id.StartsWith("gpt-", StringComparison.OrdinalIgnoreCase) || System.Text.RegularExpressions.Regex.IsMatch(id, "^o[1-9](-|$)"))
        && !new[] { "audio", "realtime", "transcribe", "tts", "image", "search", "embedding", "moderation" }.Any(id.Contains);

    public override async IAsyncEnumerable<string> StreamLessonJsonAsync(string apiKey, string model, LessonAiRequest input,
        [EnumeratorCancellation] CancellationToken ct)
    {
        using var request = JsonPost("https://api.openai.com/v1/responses", new
        {
            model, instructions = LessonPrompt.System, input = LessonPrompt.User(input), stream = true,
            text = new { format = new { type = "json_schema", name = "lesson_preparation", schema = LessonSchema.Element, strict = true } }
        }, apiKey);
        using var response = await Client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
        await EnsureSuccessAsync(response, ct);
        await foreach (var (eventName, data) in ReadSseAsync(response, ct))
        {
            if (eventName is "response.failed" or "response.incomplete") throw new ProviderException("OpenAI did not complete the response.");
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
        using var request = JsonPost("https://api.openai.com/v1/responses", new { model, instructions = SummaryInstruction, input = chunk, max_output_tokens = 1200 }, apiKey);
        using var response = await Client.SendAsync(request, ct);
        await EnsureSuccessAsync(response, ct);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStreamAsync(ct));
        return OpenAiResponseText(doc.RootElement);
    }
}
