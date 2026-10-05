using System.Net;
using System.Text;
using System.Text.Json;
using LessonPrep.Api.Application.Contracts.Ai;
using LessonPrep.Api.Application.Dtos;
using LessonPrep.Api.Application.Enums;
using LessonPrep.Api.Application.Exceptions;
using LessonPrep.Api.Application.Services.Lessons;
using LessonPrep.Api.Application.Validators;
using LessonPrep.Api.Helpers;
using LessonPrep.Api.Helpers.Prompts;
using LessonPrep.Api.Helpers.Schemas;
using LessonPrep.Api.Infrastructure.Ai;
using LessonPrep.Api.Infrastructure.Security;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace LessonPrep.Tests;

public sealed class SessionToolTests
{
    private static PhaseSpec[] Flow =>
    [
        new("Warm-up", 5, 1), new("Instruction", 15, 2), new("Practice", 15, 3), new("Assessment", 7, 4),
        new("Closure", 3, 5)
    ];

    [Theory]
    [InlineData("openai", """{"output":[{"type":"message","content":[{"type":"output_text","text":"{\"title\":\"T\"}"}]}]}""")]
    [InlineData("deepseek", """{"output":[{"type":"message","content":[{"type":"output_text","text":"{\"title\":\"T\"}"}]}]}""")]
    [InlineData("gemini", """{"candidates":[{"content":{"parts":[{"text":"{\"title\":\"T\"}"}]}}]}""")]
    [InlineData("anthropic", """{"content":[{"type":"text","text":"{\"title\":\"T\"}"}]}""")]
    public async Task GenerateJsonAsyncReturnsProviderText(string providerId, string responseJson)
    {
        var handler = new CaptureHandler(responseJson);
        var provider = MakeProvider(providerId, handler);
        using var schema = JsonDocument.Parse("""{"type":"object"}""");
        var json = await provider.GenerateJsonAsync("key", "test-model", "sys", "user", schema.RootElement, 800,
            CancellationToken.None);
        Assert.Equal("""{"title":"T"}""", json);
        Assert.True(handler.Body.Contains("json_schema", StringComparison.OrdinalIgnoreCase)
                    || handler.Body.Contains("responseJsonSchema", StringComparison.OrdinalIgnoreCase));
        Assert.Contains("test-model", $"{handler.Uri} {handler.Body}");
    }

    [Fact]
    public void PromptAndSchemaFollowTheRequestedTool()
    {
        var user = SessionToolPrompt.User("worksheet", Session(), "Plants use sunlight.", "Skip the appendix.", "ar");
        Assert.Contains("practice worksheet", user, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Arabic", user);
        Assert.Contains("Skip the appendix.", user);
        Assert.Contains("Plants use sunlight.", user);
        Assert.Contains("items", SessionToolSchemas.ExerciseSet.GetRawText());
        Assert.Contains("kind", SessionToolSchemas.Game.GetRawText());
    }

    [Fact]
    public async Task ServiceValidatesOutputAndRetriesOnce()
    {
        var provider = new FakeToolProvider
        {
            Responses = ["{}", ValidWorksheet()]
        };
        var (service, token) = CreateService(provider);
        var result = await service.CreateAsync(Request("worksheet", token), CancellationToken.None);
        var set = Assert.IsType<ExerciseSetDto>(result);
        Assert.Equal("Leaf worksheet", set.Title);
        Assert.Equal(2, provider.Calls);
        Assert.Contains("CORRECTION REQUIRED", provider.LastUser);
        Assert.Contains("items", provider.LastSchema.GetRawText());
    }

    [Fact]
    public async Task ServiceSelectsGameSchema()
    {
        var provider = new FakeToolProvider { Responses = [ValidGame()] };
        var (service, token) = CreateService(provider);
        var result = await service.CreateAsync(Request("game", token), CancellationToken.None);
        var game = Assert.IsType<GameDto>(result);
        Assert.Equal("quiz", game.Kind);
        Assert.Contains("kind", provider.LastSchema.GetRawText());
    }

    [Fact]
    public async Task ServiceRejectsUnknownToolAndInvalidSnapshot()
    {
        var (service, token) = CreateService(new FakeToolProvider { Responses = [ValidWorksheet()] });
        await Assert.ThrowsAsync<LessonValidationException>(() =>
            service.CreateAsync(Request("slides", token), CancellationToken.None));
        await Assert.ThrowsAsync<LessonValidationException>(() =>
            service.CreateAsync(Request("worksheet", token) with
            {
                Snapshot = Snapshot() with { SourceText = "short" }
            }, CancellationToken.None));
        Assert.Equal(0, new FakeToolProvider().Calls);
    }

    [Fact]
    public async Task EndpointReturnsValidatedBodyAndRejectsBadInput()
    {
        var fake = new FakeToolProvider { Responses = [ValidWorksheet()] };
        await using var app = CreateApp(fake);
        var tokens = app.Services.GetRequiredService<CredentialTokenService>();
        var token = tokens.Issue(AiProvider.DeepSeek, "test-key");
        using var client = app.CreateClient();
        var ok = await client.PostAsync("/lessonprep/v1.0/LessonPreparations/sessionTool",
            JsonBody(Request("worksheet", token)));
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
        using var doc = JsonDocument.Parse(await ok.Content.ReadAsStringAsync());
        Assert.Equal("Leaf worksheet", doc.RootElement.GetProperty("title").GetString());

        var badTool = await client.PostAsync("/lessonprep/v1.0/LessonPreparations/sessionTool",
            JsonBody(Request("slides", token)));
        Assert.Equal(HttpStatusCode.BadRequest, badTool.StatusCode);

        var badSnapshot = await client.PostAsync("/lessonprep/v1.0/LessonPreparations/sessionTool",
            JsonBody(Request("worksheet", token) with
            {
                Snapshot = Snapshot() with { SourceText = "short" }
            }));
        Assert.Equal(HttpStatusCode.BadRequest, badSnapshot.StatusCode);
    }

    [Fact]
    public void ValidatorRequiresItemsAndGamePayload()
    {
        Assert.Throws<LessonValidationException>(() => SessionToolValidator.Parse("quiz", "{}"));
        Assert.Throws<LessonValidationException>(() =>
            SessionToolValidator.Parse("game", """{"title":"G","kind":"quiz","quiz":{"questions":[]},"matching":{"pairs":[]}}"""));
        var set = SessionToolValidator.ParseExerciseSet(ValidWorksheet());
        Assert.Equal(2, set.Items.Count);
    }

    private static (SessionToolService Service, string Token) CreateService(FakeToolProvider provider)
    {
        var tokens = new CredentialTokenService(new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Crypto:TokenSecret"] = Convert.ToBase64String(new byte[32])
            }).Build());
        return (new SessionToolService(tokens, [provider]), tokens.Issue(AiProvider.DeepSeek, "test-key"));
    }

    private static WebApplicationFactory<Program> CreateApp(FakeToolProvider provider) =>
        new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Development");
            builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<IAiProvider>();
                services.AddSingleton<IAiProvider>(provider);
            });
        });

    private static SessionToolRequest Request(string tool, string token = "unused") =>
        new(Snapshot(), Session(), tool, AiProvider.DeepSeek, "test-model", token);

    private static PreparationSnapshot Snapshot() =>
        new(Guid.NewGuid(), "Grade 7", 45, "en", Flow.ToList(),
            "Photosynthesis uses sunlight and water to make food for plants in class.",
            "", 1, "Skip the appendix.");

    private static GeneratedLesson Session() =>
        new("Plants", "Photosynthesis", "Grade 7", 45,
            ["Explain photosynthesis"],
            ["Board"],
            [new LessonPhaseResult("Warm-up", 5, "Recall", ["Ask"], ["Answer"], [], "")],
            "Exit ticket", ["Explain"], "");

    private static StringContent JsonBody(SessionToolRequest request) =>
        new(JsonSerializer.Serialize(request, JsonDefaults.Web), Encoding.UTF8, "application/json");

    private static string ValidWorksheet() =>
        """
        {
          "title": "Leaf worksheet",
          "instructions": "Answer each item.",
          "items": [
            { "prompt": "What do plants need?", "type": "short", "options": [], "answer": "Sunlight", "explanation": "" },
            { "prompt": "Plants make food.", "type": "true_false", "options": ["True", "False"], "answer": "True", "explanation": "" }
          ]
        }
        """;

    private static string ValidGame() =>
        """
        {
          "title": "Leaf quiz",
          "kind": "quiz",
          "quiz": {
            "questions": [
              { "prompt": "What do plants need?", "options": ["Rocks", "Sunlight"], "correctIndex": 1, "explanation": "" }
            ]
          },
          "matching": { "pairs": [] }
        }
        """;

    private static IAiProvider MakeProvider(string id, HttpMessageHandler handler)
    {
        var factory = new ClientFactory(handler);
        return id switch
        {
            "openai" => new OpenAiProvider(factory),
            "deepseek" => new DeepSeekProvider(factory),
            "anthropic" => new AnthropicProvider(factory),
            "gemini" => new GeminiProvider(factory),
            _ => throw new ArgumentOutOfRangeException(nameof(id))
        };
    }

    private sealed class FakeToolProvider : IAiProvider
    {
        public AiProvider Provider => AiProvider.DeepSeek;
        public List<string> Responses { get; init; } = [];
        public int Calls { get; private set; }
        public string LastUser { get; private set; } = "";
        public JsonElement LastSchema { get; private set; }

        public Task<IReadOnlyList<AiModel>> ListModelsAsync(string apiKey, CancellationToken cancellationToken) =>
            Task.FromResult<IReadOnlyList<AiModel>>([new("test-model", "Test")]);

        public IAsyncEnumerable<string> StreamLessonJsonAsync(string apiKey, string model, LessonAiRequest request,
            CancellationToken cancellationToken) =>
            throw new NotImplementedException();

        public Task<string> SummarizeChunkAsync(string apiKey, string model, string chunk,
            CancellationToken cancellationToken) =>
            throw new NotImplementedException();

        public Task<string> GenerateJsonAsync(string apiKey, string model, string system, string user,
            JsonElement schema, int maxTokens, CancellationToken cancellationToken)
        {
            LastUser = user;
            LastSchema = schema.Clone();
            var json = Responses.Count > Calls ? Responses[Calls] : "{}";
            Calls++;
            return Task.FromResult(json);
        }

        public JsonElement TranslateTools(IReadOnlyList<AiToolDefinition> tools) =>
            JsonSerializer.SerializeToElement(tools);

        public IReadOnlyList<AiToolCall> ParseToolCalls(JsonElement response) => [];
    }

    private sealed class ClientFactory(HttpMessageHandler handler) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new(handler, disposeHandler: false);
    }

    private sealed class CaptureHandler(string content) : HttpMessageHandler
    {
        public string Body { get; private set; } = "";
        public Uri? Uri { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            Uri = request.RequestUri;
            Body = request.Content is null ? "" : await request.Content.ReadAsStringAsync(cancellationToken);
            return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(content) };
        }
    }
}
