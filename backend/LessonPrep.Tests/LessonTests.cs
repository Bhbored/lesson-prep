using System.Security.Cryptography;
using System.Net;
using System.Text;
using System.Text.Json;
using LessonPrep.Api.Application.Contracts.Ai;
using LessonPrep.Api.Application.Contracts.Documents;
using LessonPrep.Api.Application.Contracts.Lessons;
using LessonPrep.Api.Application.Dtos;
using LessonPrep.Api.Application.Enums;
using LessonPrep.Api.Application.Exceptions;
using LessonPrep.Api.Application.Services.Lessons;
using LessonPrep.Api.Application.Validators;
using LessonPrep.Api.Helpers.Documents;
using LessonPrep.Api.Infrastructure.Ai;
using LessonPrep.Api.Infrastructure.Security;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace LessonPrep.Tests;

public sealed class LessonTests
{
    private static PhaseSpec[] Flow => [new("Warm-up", 5, 1), new("Instruction", 15, 2), new("Practice", 15, 3), new("Assessment", 7, 4), new("Closure", 3, 5)];

    [Fact]
    public void StandardPresetIsCodeDefinedAndHasTheExactFlow()
    {
        var preset = StandardLessonFlow.Create();
        Assert.Equal("Standard 45-Minute Lesson", preset.Name);
        Assert.True(preset.IsDefault);
        Assert.Equal(Flow, preset.Phases);
        Assert.Equal(45, preset.Phases.Sum(x => x.DurationMinutes));
        Assert.Equal(Flow, GenerationService.ResolvePhases(preset.Id.ToString(), null));
        Assert.Throws<LessonValidationException>(() => GenerationService.ResolvePhases(Guid.NewGuid().ToString(), null));
    }

    [Fact]
    public void RegenerationSnapshotRequiresBoundedSourceAndExactPhases()
    {
        var snapshot = new PreparationSnapshot(Guid.NewGuid(), "Grade 7", 45, "en", Flow.ToList(),
            "Photosynthesis uses sunlight and water to make food.", "");
        GenerationService.ValidateSnapshot(snapshot, 3, 2);
        Assert.Throws<LessonValidationException>(() => GenerationService.ValidateSnapshot(snapshot with { SourceText = "short" }, 3, 2));
        Assert.Throws<LessonValidationException>(() => GenerationService.ValidateSnapshot(snapshot with { Phases = [Flow[0]] }, 3, 2));
    }

    [Fact]
    public void FlowRejectsMismatchedTotalAndOrder()
    {
        LessonValidator.ValidateFlow("Grade 7", 45, Flow, 3);
        Assert.Throws<LessonValidationException>(() => LessonValidator.ValidateFlow("Grade 7", 40, Flow, 3));
        Assert.Throws<LessonValidationException>(() => LessonValidator.ValidateFlow("Grade 7", 45, [Flow[0], Flow[1] with { Order = 1 }, .. Flow[2..]], 3));
    }

    [Fact]
    public void LessonRejectsAiPhaseTampering()
    {
        var valid = new GeneratedLesson("Plants", "Photosynthesis", "Grade 7", 45, ["Explain photosynthesis"], ["Board"],
            Flow.Select(x => new LessonPhaseResult(x.Name, x.DurationMinutes, "Learn", ["Explain"], ["Practice"], [], "")).ToList(),
            "Exit ticket", ["Students can explain"], "");
        var json = JsonSerializer.Serialize(valid, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        Assert.Equal(5, LessonValidator.ParseAndValidate(json, "Grade 7", 45, Flow).Phases.Count);
        var changed = valid with { Phases = valid.Phases.Select((x, i) => i == 1 ? x with { DurationMinutes = 14 } : x).ToList() };
        Assert.Throws<LessonValidationException>(() => LessonValidator.ParseAndValidate(JsonSerializer.Serialize(changed, new JsonSerializerOptions(JsonSerializerDefaults.Web)), "Grade 7", 45, Flow));
    }

    [Fact]
    public void CsvParserPreservesQuotedCommasAndNewlines()
    {
        var text = CsvToText.Convert("Topic,Example\nPlants,\"sunlight, water\n and air\"\n");
        Assert.Contains("Topic: Plants", text);
        Assert.Contains("Example: sunlight, water\n and air", text);
    }

    [Fact]
    public void SourceChunkingRetainsSourceOrder()
    {
        var source = string.Join('\n', Enumerable.Range(1, 50).Select(x => $"[Page {x}] A fact about page {x}."));
        var chunks = GenerationService.SourceChunks(source, 160).ToArray();
        Assert.True(chunks.Length > 1);
        Assert.Contains("[Page 1]", chunks[0]);
        Assert.Contains("[Page 50]", chunks[^1]);
    }

    [Fact]
    public void ProvisionalTextStreamShowsValuesWithoutJsonKeys()
    {
        var parser = new ProvisionalTextExtractor();
        var output = parser.Push("{\"title\":\"Photo") + parser.Push("synthesis\",\"learningObjectives\":[\"Explain ") + parser.Push("sunlight\"]}");
        Assert.Equal("Photosynthesis\nExplain sunlight\n", output);
    }

    [Fact]
    public async Task MixedPdfUsesNativeTextThenOcrForImagePage()
    {
        var bytes = await File.ReadAllBytesAsync(Path.Combine(AppContext.BaseDirectory, "Fixtures", "mixed.pdf"));
        using var stream = new MemoryStream(bytes);
        var upload = new FormFile(stream, 0, bytes.Length, "files", "mixed.pdf");
        var ocr = new FakeOcr();
        var processor = new DocumentProcessor(ocr, NullLogger<DocumentProcessor>.Instance);
        var result = await processor.ExtractAsync([upload], "en", CancellationToken.None);
        Assert.Equal(2, result.PageCount);
        Assert.Equal(1, result.OcrPages);
        Assert.Equal(1, ocr.CallCount);
        Assert.True(result.Text.IndexOf("Plants need sunlight", StringComparison.Ordinal) < result.Text.IndexOf("OCR scanned page", StringComparison.Ordinal));
    }

    [Fact]
    public async Task CancelledExtractionStopsBeforeReadingAnotherFile()
    {
        using var stream = new MemoryStream(Encoding.UTF8.GetBytes(new string('x', 40)));
        var upload = new FormFile(stream, 0, stream.Length, "files", "notes.txt");
        var ocr = new FakeOcr();
        var processor = new DocumentProcessor(ocr, NullLogger<DocumentProcessor>.Instance);
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => processor.ExtractAsync([upload], "en", cancellation.Token));
        Assert.Equal(0, ocr.CallCount);
    }

    [Fact]
    public void CredentialTokenRoundTripsAndRejectsTamperingRotationAndProviderMismatch()
    {
        var secret = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
        var otherSecret = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
        var tokens = new CredentialTokenService(new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Crypto:TokenSecret"] = secret }).Build());
        var rotated = new CredentialTokenService(new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Crypto:TokenSecret"] = otherSecret }).Build());

        var token = tokens.Issue(AiProvider.DeepSeek, "test-api-key");
        Assert.Equal("test-api-key", tokens.Open(token, AiProvider.DeepSeek));
        Assert.Throws<CredentialException>(() => tokens.Open(token, AiProvider.OpenAi));
        Assert.Throws<CredentialException>(() => rotated.Open(token, AiProvider.DeepSeek));

        var parts = token.Split('.');
        var cipher = parts[3].ToCharArray();
        cipher[^1] = cipher[^1] == 'A' ? 'B' : 'A';
        parts[3] = new string(cipher);
        Assert.Throws<CredentialException>(() => tokens.Open(string.Join('.', parts), AiProvider.DeepSeek));
    }

    [Fact]
    public void ProviderAdaptersTranslateGenericToolContracts()
    {
        var tool = new AiToolDefinition("lookup", "Look up a term", new Dictionary<string, AiToolParameter>
        { ["term"] = new("string", "Term to find", true) });
        IAiProvider[] providers = [new OpenAiProvider(new FakeFactory()), new GeminiProvider(new FakeFactory()),
            new AnthropicProvider(new FakeFactory()), new DeepSeekProvider(new FakeFactory())];
        foreach (var provider in providers)
        {
            var json = provider.TranslateTools([tool]).GetRawText();
            Assert.Contains("lookup", json);
            Assert.Contains("term", json);
        }
        using var openAiResponse = JsonDocument.Parse("""{"output":[{"type":"function_call","call_id":"call_1","name":"lookup","arguments":"{\"term\":\"plant\"}"}]}""");
        Assert.Equal("lookup", providers[0].ParseToolCalls(openAiResponse.RootElement).Single().Name);
        using var claudeResponse = JsonDocument.Parse("""{"content":[{"type":"tool_use","id":"tool_1","name":"lookup","input":{"term":"plant"}}]}""");
        Assert.Equal("lookup", providers[2].ParseToolCalls(claudeResponse.RootElement).Single().Name);
    }

    [Theory]
    [InlineData("openai", """{"data":[{"id":"gpt-6"},{"id":"text-embedding-3-small"}]}""", "gpt-6")]
    [InlineData("deepseek", """{"data":[{"id":"deepseek-flash","name":"Flash"}]}""", "deepseek-flash")]
    [InlineData("anthropic", """{"data":[{"id":"claude-sonnet-5","display_name":"Sonnet 5"}],"has_more":false}""", "claude-sonnet-5")]
    [InlineData("gemini", """{"models":[{"name":"models/gemini-3-flash","displayName":"Gemini Flash","supportedGenerationMethods":["generateContent"]}]}""", "gemini-3-flash")]
    public async Task ProvidersReadLiveModelLists(string providerId, string responseJson, string expected)
    {
        var provider = MakeProvider(providerId, responseJson);
        Assert.Contains(await provider.ListModelsAsync("test", CancellationToken.None), model => model.Id == expected);
    }

    [Theory]
    [InlineData("openai", "event: response.output_text.delta\ndata: {\"delta\":\"{\\\"title\\\":\\\"Test\\\"}\"}\n\n")]
    [InlineData("deepseek", "event: response.output_text.delta\ndata: {\"delta\":\"{\\\"title\\\":\\\"Test\\\"}\"}\n\n")]
    [InlineData("anthropic", "event: content_block_delta\ndata: {\"delta\":{\"text\":\"{\\\"title\\\":\\\"Test\\\"}\"}}\n\n")]
    [InlineData("gemini", "data: {\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"{\\\"title\\\":\\\"Test\\\"}\"}]}}]}\n\n")]
    public async Task ProvidersStreamTextChunks(string providerId, string sse)
    {
        var provider = MakeProvider(providerId, sse);
        var request = new LessonAiRequest("Grade 7", 45, "en", Flow, "Source", "");
        var output = new StringBuilder();
        await foreach (var chunk in provider.StreamLessonJsonAsync("test", "test-model", request, CancellationToken.None)) output.Append(chunk);
        Assert.Equal("{\"title\":\"Test\"}", output.ToString());
    }

    private static IAiProvider MakeProvider(string id, string content)
    {
        var factory = new FakeFactory(new FakeHandler(content));
        return id switch
        {
            "openai" => new OpenAiProvider(factory),
            "deepseek" => new DeepSeekProvider(factory),
            "anthropic" => new AnthropicProvider(factory),
            "gemini" => new GeminiProvider(factory),
            _ => throw new ArgumentOutOfRangeException(nameof(id))
        };
    }

    private sealed class FakeFactory(HttpMessageHandler? handler = null) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => handler is null ? new() : new HttpClient(handler, disposeHandler: false);
    }

    private sealed class FakeHandler(string content) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(content) });
    }

    private sealed class FakeOcr : IOcrService
    {
        public int CallCount { get; private set; }
        public Task<string> ReadImageAsync(byte[] png, string language, CancellationToken cancellationToken)
        {
            CallCount++;
            Assert.True(png.Length > 100);
            Assert.Equal("en", language);
            return Task.FromResult("OCR scanned page about water");
        }
    }
}
