using System.Runtime.CompilerServices;
using System.Text.Json;
using LessonPrep.Api.Application.Contracts.Ai;
using LessonPrep.Api.Application.Dtos;
using LessonPrep.Api.Application.Enums;
using LessonPrep.Api.Application.Exceptions;
using LessonPrep.Api.Helpers.Prompts;
using LessonPrep.Api.Helpers.Schemas;

namespace LessonPrep.Api.Infrastructure.Ai;

public sealed class GeminiProvider(IHttpClientFactory factory) : AiProviderBase(factory)
{
    public override AiProvider Provider => AiProvider.Gemini;

    public override async Task<IReadOnlyList<AiModel>> ListModelsAsync(string apiKey, CancellationToken ct)
    {
        var results = new List<AiModel>();
        string? page = null;
        do
        {
            var url = "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000" +
                      (page is null ? "" : "&pageToken=" + Uri.EscapeDataString(page));
            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.TryAddWithoutValidation("x-goog-api-key", apiKey);
            using var response = await Client.SendAsync(request, ct);
            await EnsureSuccessAsync(response, ct);
            using var doc = JsonDocument.Parse(await response.Content.ReadAsStreamAsync(ct));
            results.AddRange(doc.RootElement.GetProperty("models").EnumerateArray()
                .Where(x => x.TryGetProperty("supportedGenerationMethods", out var methods) &&
                            methods.EnumerateArray().Any(y => y.GetString() == "generateContent"))
                .Select(x => new AiModel(x.GetProperty("name").GetString()!.Replace("models/", ""),
                    x.TryGetProperty("displayName", out var name)
                        ? name.GetString()!
                        : x.GetProperty("name").GetString()!))
                .Where(x => !new[] { "embedding", "imagen", "veo", "tts", "audio", "live" }.Any(k =>
                    x.Id.Contains(k, StringComparison.OrdinalIgnoreCase))));
            page = doc.RootElement.TryGetProperty("nextPageToken", out var next) ? next.GetString() : null;
        } while (!string.IsNullOrEmpty(page) && results.Count < 1000);

        return results;
    }

    public override async IAsyncEnumerable<string> StreamLessonJsonAsync(string apiKey, string model,
        LessonAiRequest input,
        [EnumeratorCancellation] CancellationToken ct)
    {
        using var request = JsonPost(
            $"https://generativelanguage.googleapis.com/v1beta/models/{Uri.EscapeDataString(model)}:streamGenerateContent?alt=sse",
            new
            {
                systemInstruction = new { parts = new[] { new { text = LessonPrompt.System } } },
                contents = new[] { new { role = "user", parts = new[] { new { text = LessonPrompt.User(input) } } } },
                generationConfig = new
                    { responseMimeType = "application/json", responseJsonSchema = LessonSchema.Element }
            }, apiKey, "x-goog-api-key");
        using var response = await Client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
        await EnsureSuccessAsync(response, ct);
        await foreach (var (_, data) in ReadSseAsync(response, ct))
        {
            using var doc = JsonDocument.Parse(data);
            if (!doc.RootElement.TryGetProperty("candidates", out var candidates) ||
                candidates.GetArrayLength() == 0) continue;
            var candidate = candidates[0];
            if (candidate.TryGetProperty("finishReason", out var reason) &&
                reason.GetString() is "SAFETY" or "RECITATION")
                throw new ProviderException("Gemini could not complete the response.");
            if (candidate.TryGetProperty("content", out var content) && content.TryGetProperty("parts", out var parts))
                foreach (var part in parts.EnumerateArray())
                    if (part.TryGetProperty("text", out var text))
                        yield return text.GetString() ?? "";
        }
    }

    public override JsonElement TranslateTools(IReadOnlyList<AiToolDefinition> tools) =>
        JsonSerializer.SerializeToElement(new[]
        {
            new
            {
                functionDeclarations = tools.Select(x => new
                    { name = x.Name, description = x.Description, parametersJsonSchema = ToolSchema(x) }).ToArray()
            }
        });

    public override IReadOnlyList<AiToolCall> ParseToolCalls(JsonElement response) =>
        response.GetProperty("candidates")[0].GetProperty("content").GetProperty("parts").EnumerateArray()
            .Where(item => item.TryGetProperty("functionCall", out _))
            .Select(item => item.GetProperty("functionCall"))
            .Select(item => new AiToolCall(item.TryGetProperty("id", out var id) ? id.GetString() ?? "" : "",
                item.GetProperty("name").GetString() ?? "", item.GetProperty("args").GetRawText()))
            .ToArray();

    public override async Task<string> SummarizeChunkAsync(string apiKey, string model, string chunk,
        CancellationToken ct)
    {
        using var request = JsonPost(
            $"https://generativelanguage.googleapis.com/v1beta/models/{Uri.EscapeDataString(model)}:generateContent",
            new
            {
                systemInstruction = new { parts = new[] { new { text = SummaryInstruction } } },
                contents = new[] { new { role = "user", parts = new[] { new { text = chunk } } } },
                generationConfig = new { maxOutputTokens = 1200 }
            }, apiKey, "x-goog-api-key");
        using var response = await Client.SendAsync(request, ct);
        await EnsureSuccessAsync(response, ct);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStreamAsync(ct));
        return string.Join("\n", doc.RootElement.GetProperty("candidates")[0].GetProperty("content")
            .GetProperty("parts").EnumerateArray()
            .Where(item => item.TryGetProperty("text", out _)).Select(item => item.GetProperty("text").GetString()));
    }
}
