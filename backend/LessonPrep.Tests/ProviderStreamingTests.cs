using System.Net;
using System.Text;
using LessonPrep.Api.Application.Dtos;
using LessonPrep.Api.Application.Exceptions;
using LessonPrep.Api.Infrastructure.Ai;

namespace LessonPrep.Tests;

public sealed class ProviderStreamingTests
{
    private static readonly LessonAiRequest Input = new("Grade 7", 45, "en",
        [new PhaseSpec("Instruction", 45, 1)], "Plants use sunlight and water to grow.", "");

    [Theory]
    [InlineData("deepseek")]
    [InlineData("openai")]
    [InlineData("anthropic")]
    public async Task CompletionStopsReadingBeforeRemoteResetAndNextGenerationWorks(string providerName)
    {
        var first = new ResetStream(CompletedEvents(providerName));
        var second = new ResetStream(CompletedEvents(providerName));
        using var handler = new StreamHandler(first, second);
        var provider = CreateProvider(providerName, handler);

        Assert.Equal("lesson", await ReadText(provider));
        Assert.Equal("lesson", await ReadText(provider));

        Assert.Equal(2, handler.RequestCount);
        Assert.Equal(0, first.ResetCount);
        Assert.Equal(0, second.ResetCount);
        Assert.True(first.WasDisposed);
        Assert.True(second.WasDisposed);
    }

    [Theory]
    [InlineData("deepseek")]
    [InlineData("openai")]
    [InlineData("anthropic")]
    public async Task InterruptedStreamReportsProviderFailureWithoutRetryAndCleansUp(string providerName)
    {
        var stream = new ResetStream(DeltaEvent(providerName));
        using var handler = new StreamHandler(stream);
        var provider = CreateProvider(providerName, handler);
        var received = new StringBuilder();

        var error = await Assert.ThrowsAsync<ProviderException>(async () =>
        {
            await foreach (var delta in provider.StreamLessonJsonAsync("test", "test-model", Input,
                               CancellationToken.None)) received.Append(delta);
        });

        Assert.Equal("lesson", received.ToString());
        Assert.IsType<IOException>(error.InnerException);
        Assert.Contains("connection was interrupted", error.Message);
        Assert.Equal(1, handler.RequestCount);
        Assert.True(stream.WasDisposed);
    }

    [Fact]
    public async Task ConnectionResetDuringCancellationRemainsCancellation()
    {
        using var cancellation = new CancellationTokenSource();
        var stream = new ResetStream(DeltaEvent("deepseek"), cancellation.Cancel);
        using var handler = new StreamHandler(stream);
        var provider = CreateProvider("deepseek", handler);

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => ReadText(provider, cancellation.Token));

        Assert.Equal(1, handler.RequestCount);
        Assert.True(stream.WasDisposed);
    }

    [Theory]
    [InlineData("response.failed")]
    [InlineData("response.incomplete")]
    public async Task UnsuccessfulTerminalEventDoesNotBecomeSuccess(string eventName)
    {
        var stream = new ResetStream(DeltaEvent("deepseek") + $"event: {eventName}\ndata: {{}}\n\n");
        using var handler = new StreamHandler(stream);
        var provider = CreateProvider("deepseek", handler);

        await Assert.ThrowsAsync<ProviderException>(() => ReadText(provider));

        Assert.Equal(0, stream.ResetCount);
        Assert.True(stream.WasDisposed);
    }

    private static string DeltaEvent(string provider) => provider == "anthropic"
        ? "event: content_block_delta\ndata: {\"delta\":{\"text\":\"lesson\"}}\n\n"
        : "event: response.output_text.delta\ndata: {\"delta\":\"lesson\"}\n\n";

    private static string CompletedEvents(string provider) => DeltaEvent(provider) +
        $"event: {(provider == "anthropic" ? "message_stop" : "response.completed")}\ndata: {{}}\n\n";

    private static AiProviderBase CreateProvider(string name, StreamHandler handler)
    {
        var factory = new ClientFactory(handler);
        return name switch
        {
            "deepseek" => new DeepSeekProvider(factory),
            "openai" => new OpenAiProvider(factory),
            "anthropic" => new AnthropicProvider(factory),
            _ => throw new ArgumentOutOfRangeException(nameof(name))
        };
    }

    private static async Task<string> ReadText(AiProviderBase provider, CancellationToken token = default)
    {
        var result = new StringBuilder();
        await foreach (var delta in provider.StreamLessonJsonAsync("test", "test-model", Input, token))
            result.Append(delta);
        return result.ToString();
    }

    private sealed class ClientFactory(HttpMessageHandler handler) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new(handler, disposeHandler: false);
    }

    private sealed class StreamHandler(params Stream[] streams) : HttpMessageHandler
    {
        public int RequestCount { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken token)
        {
            var stream = streams[RequestCount++];
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StreamContent(stream) });
        }
    }

    private sealed class ResetStream(string data, Action? onReset = null) : MemoryStream(Encoding.UTF8.GetBytes(data))
    {
        public bool WasDisposed { get; private set; }
        public int ResetCount { get; private set; }

        public override ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken token = default)
        {
            if (Position < Length) return base.ReadAsync(buffer, token);
            ResetCount++;
            onReset?.Invoke();
            return ValueTask.FromException<int>(new IOException("Connection forcibly closed by remote host."));
        }

        protected override void Dispose(bool disposing)
        {
            WasDisposed = true;
            base.Dispose(disposing);
        }
    }
}
