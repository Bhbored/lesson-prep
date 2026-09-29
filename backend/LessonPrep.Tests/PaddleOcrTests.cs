using LessonPrep.Api.Application.Exceptions;
using LessonPrep.Api.Helpers.Documents;
using LessonPrep.Api.Infrastructure.Ocr;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Logging;

namespace LessonPrep.Tests;

public sealed class PaddleOcrTests
{
    private static PaddleOcrEngine CreateEngine() => new(new ConfigurationBuilder().Build(),
        NullLogger<PaddleOcrEngine>.Instance);

    [Fact]
    public async Task UnsupportedLanguageIsRejectedWithoutLoadingModels()
    {
        using var engine = CreateEngine();
        await Assert.ThrowsAsync<DocumentException>(() => engine.ReadImageAsync([1], "de", CancellationToken.None));
    }

    [Fact]
    public async Task CancelledRequestStopsBeforeLoadingModels()
    {
        using var engine = CreateEngine();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => engine.ReadImageAsync([1], "en", new CancellationToken(true)));
    }

    [RealOcrFact]
    public async Task MixedPdfRecognizesScannedPageWithEmbeddedEnglishModel()
    {
        using var logging = LoggerFactory.Create(builder => builder.AddConsole());
        using var engine = new PaddleOcrEngine(new ConfigurationBuilder().Build(), logging.CreateLogger<PaddleOcrEngine>());
        var bytes = await File.ReadAllBytesAsync(Path.Combine(AppContext.BaseDirectory, "Fixtures", "mixed.pdf"));
        var result = await PdfToText.ConvertAsync(engine, bytes, "en", CancellationToken.None);
        Assert.Equal(2, result.Pages);
        Assert.Equal(1, result.OcrPages);
        Assert.Contains("Scanned lesson page about water", result.Text, StringComparison.OrdinalIgnoreCase);
        Assert.True(result.Text.IndexOf("Plants need sunlight", StringComparison.Ordinal) <
                    result.Text.IndexOf("Scanned lesson", StringComparison.OrdinalIgnoreCase));
    }
}

public sealed class RealOcrFactAttribute : FactAttribute
{
    public RealOcrFactAttribute()
    {
        if (Environment.GetEnvironmentVariable("RUN_OCR_TESTS") != "1")
            Skip = "Set RUN_OCR_TESTS=1 to run native PaddleOCR integration tests.";
    }
}
