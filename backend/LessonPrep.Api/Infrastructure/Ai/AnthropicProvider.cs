using System.Runtime.CompilerServices;
using System.Text.Json;
using LessonPrep.Api.Application.Contracts.Ai;
using LessonPrep.Api.Application.Dtos;
using LessonPrep.Api.Application.Enums;
using LessonPrep.Api.Application.Exceptions;
using LessonPrep.Api.Helpers.Prompts;
using LessonPrep.Api.Helpers.Schemas;

namespace LessonPrep.Api.Infrastructure.Ai;

public sealed class AnthropicProvider(IHttpClientFactory factory) : AiProviderBase(factory)
{
    public override AiProvider Provider => AiProvider.Anthropic;
    public override async Task<IReadOnlyList<AiModel>> ListModelsAsync(string apiKey, CancellationToken ct)
    {
        var results = new List<AiModel>();
        string? after = null;
        do
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, "https://api.anthropic.com/v1/models?limit=100" + (after is null ? "" : "&after_id=" + Uri.EscapeDataString(after)));
            request.Headers.TryAddWithoutValidation("x-api-key", apiKey);
            request.Headers.TryAddWithoutValidation("anthropic-version", "2023-06-01");
            using var response = await Client.SendAsync(request, ct);
            await EnsureSuccessAsync(response, ct);
            using var doc = JsonDocument.Parse(await response.Content.ReadAsStreamAsync(ct));
            results.AddRange(doc.RootElement.GetProperty("data").EnumerateArray().Where(x => x.GetProperty("id").GetString()?.StartsWith("claude-") == true)
                .Select(x => new AiModel(x.GetProperty("id").GetString()!, x.GetProperty("display_name").GetString()!)));
            after = doc.RootElement.GetProperty("has_more").GetBoolean() ? doc.RootElement.GetProperty("last_id").GetString() : null;
        } while (after is not null && results.Count < 500);
        return results;
    }
    public override async IAsyncEnumerable<string> StreamLessonJsonAsync(string apiKey, string model, LessonAiRequest input,
        [EnumeratorCancellation] CancellationToken ct)
    {
        using var request = JsonPost("https://api.anthropic.com/v1/messages", new
        {
            model, max_tokens = 8192, system = LessonPrompt.System,
            messages = new[] { new { role = "user", content = LessonPrompt.User(input) } },
            output_config = new { format = new { type = "json_schema", schema = LessonSchema.Element } }, stream = true
        }, apiKey, "x-api-key");
        request.Headers.TryAddWithoutValidation("anthropic-version", "2023-06-01");
        using var response = await Client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
        await EnsureSuccessAsync(response, ct);
        await foreach (var (eventName, data) in ReadSseAsync(response, ct))
        {
            if (eventName == "error") throw new ProviderException("Anthropic did not complete the response.");
            if (eventName != "content_block_delta") continue;
            using var doc = JsonDocument.Parse(data);
            var delta = doc.RootElement.GetProperty("delta");
            if (delta.TryGetProperty("text", out var text)) yield return text.GetString() ?? "";
        }
    }
    public override JsonElement TranslateTools(IReadOnlyList<AiToolDefinition> tools) =>
        JsonSerializer.SerializeToElement(tools.Select(x => new { name = x.Name, description = x.Description, input_schema = ToolSchema(x) }).ToArray());
    public override IReadOnlyList<AiToolCall> ParseToolCalls(JsonElement response) => response.GetProperty("content").EnumerateArray()
        .Where(item => item.TryGetProperty("type", out var type) && type.GetString() == "tool_use")
        .Select(item => new AiToolCall(item.GetProperty("id").GetString() ?? "", item.GetProperty("name").GetString() ?? "", item.GetProperty("input").GetRawText()))
        .ToArray();
    public override async Task<string> SummarizeChunkAsync(string apiKey, string model, string chunk, CancellationToken ct)
    {
        using var request = JsonPost("https://api.anthropic.com/v1/messages", new
        { model, max_tokens = 1200, system = SummaryInstruction, messages = new[] { new { role = "user", content = chunk } } }, apiKey, "x-api-key");
        request.Headers.TryAddWithoutValidation("anthropic-version", "2023-06-01");
        using var response = await Client.SendAsync(request, ct);
        await EnsureSuccessAsync(response, ct);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStreamAsync(ct));
        return string.Join("\n", doc.RootElement.GetProperty("content").EnumerateArray()
            .Where(item => item.GetProperty("type").GetString() == "text")
            .Select(item => item.GetProperty("text").GetString()));
    }
}
