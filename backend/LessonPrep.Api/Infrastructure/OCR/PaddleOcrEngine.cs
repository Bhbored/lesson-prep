using LessonPrep.Api.Application.Contracts.Documents;
using LessonPrep.Api.Application.Exceptions;
using OpenCvSharp;
using Sdcb.PaddleInference;
using Sdcb.PaddleOCR;
using Sdcb.PaddleOCR.Models;
using Sdcb.PaddleOCR.Models.Local;

namespace LessonPrep.Api.Infrastructure.Ocr;

public sealed class PaddleOcrEngine : IOcrService, IDisposable
{
    private readonly Dictionary<string, Lazy<QueuedPaddleOcrAll>> engines;
    private readonly ILogger<PaddleOcrEngine> logger;
    private readonly object lifecycle = new();
    private bool disposed;

    public PaddleOcrEngine(IConfiguration configuration, ILogger<PaddleOcrEngine> logger)
    {
        this.logger = logger;
        var workers = configuration.GetValue<int?>("Ocr:WorkerCount") ?? 1;
        if (workers < 1) throw new ArgumentOutOfRangeException(nameof(configuration), "Ocr:WorkerCount must be positive.");
        engines = new(StringComparer.Ordinal)
        {
            ["en"] = Create(() => LocalFullModels.EnglishV5),
            ["ar"] = Create(() => LocalFullModels.ArabicV5),
            ["fr"] = Create(() => LocalFullModels.LatinV5)
        };

        Lazy<QueuedPaddleOcrAll> Create(Func<FullOcrModel> model) => new(() =>
            new QueuedPaddleOcrAll(() => new PaddleOcrAll(model(), PaddleDevice.Mkldnn(cacheCapacity: 1))
            {
                Enable180Classification = false,
                AllowRotateDetection = true
            }, consumerCount: workers));
    }

    public async Task<string> ReadImageAsync(byte[] png, string language, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (!engines.TryGetValue(language, out var engine))
            throw new DocumentException("OCR supports English, Arabic, and French only.");
        if (png.Length == 0 || png.Length > 15 * 1024 * 1024)
            throw new DocumentException("OCR images must contain at most 15 MiB.");

        try
        {
            using var src = Cv2.ImDecode(png, ImreadModes.Color);
            if (src.Empty()) throw new DocumentException("OCR could not decode a scanned page.");
            if ((long)src.Width * src.Height > 30_000_000)
                throw new DocumentException("OCR images may contain at most 30 million pixels.");

            Task<PaddleOcrResult> run;
            lock (lifecycle)
            {
                ObjectDisposedException.ThrowIf(disposed, this);
                cancellationToken.ThrowIfCancellationRequested();
                run = engine.Value.Run(src, cancellationToken: cancellationToken);
            }
            // Native inference cannot be interrupted mid-page. Await it before releasing the Mat.
            // The upstream queue completes tasks inline on its worker. Move continuations
            // off that worker so a caller disposing this service cannot wait on itself.
            var result = await run.ContinueWith(task => task.GetAwaiter().GetResult(),
                CancellationToken.None, TaskContinuationOptions.RunContinuationsAsynchronously, TaskScheduler.Default);
            cancellationToken.ThrowIfCancellationRequested();
            return result.Text;
        }
        catch (OperationCanceledException) { throw; }
        catch (DocumentException) { throw; }
        catch (Exception exception)
        {
            logger.LogError(exception, "OCR failed for source language {Language}", language);
            throw new DocumentException("OCR could not read a scanned page.");
        }
    }

    public void Dispose()
    {
        lock (lifecycle)
        {
            if (disposed) return;
            disposed = true;
            foreach (var engine in engines.Values)
                if (engine.IsValueCreated) engine.Value.Dispose();
        }
    }
}
