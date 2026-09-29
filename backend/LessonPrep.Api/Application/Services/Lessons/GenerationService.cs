using System.Text;
using System.Text.Json;
using LessonPrep.Api.Application.Contracts.Ai;
using LessonPrep.Api.Application.Contracts.Lessons;
using LessonPrep.Api.Application.Dtos;
using LessonPrep.Api.Application.Enums;
using LessonPrep.Api.Application.Exceptions;
using LessonPrep.Api.Application.Validators;
using LessonPrep.Api.Helpers;
using LessonPrep.Api.Helpers.Documents;
using LessonPrep.Api.Infrastructure.Security;

namespace LessonPrep.Api.Application.Services.Lessons;

public sealed class GenerationService(
    DocumentProcessor documents,
    CredentialTokenService tokens,
    IEnumerable<IAiProvider> providers,
    ILogger<GenerationService> logger)
{
    private readonly IReadOnlyDictionary<AiProvider, IAiProvider> _providers = providers.ToDictionary(x => x.Provider);

    public static IReadOnlyList<PhaseSpec> ResolvePhases(string? presetId, string? customPhases,
        string language = "en")
    {
        if (!string.IsNullOrWhiteSpace(presetId) == !string.IsNullOrWhiteSpace(customPhases))
            throw new LessonValidationException("Select the standard preset or provide custom phases.");
        if (!string.IsNullOrWhiteSpace(presetId))
        {
            if (!Guid.TryParse(presetId, out var id) || id != StandardLessonFlow.Id)
                throw new LessonValidationException("Lesson flow preset was not found.");
            return StandardLessonFlow.Create(language).Phases;
        }

        try
        {
            return JsonSerializer.Deserialize<List<PhaseSpec>>(customPhases!, JsonDefaults.Web) ?? [];
        }
        catch (JsonException)
        {
            throw new LessonValidationException("Custom lesson phases are invalid.");
        }
    }

    public async Task GenerateFromFormAsync(HttpRequest request, HttpResponse response, CancellationToken ct)
    {
        var form = await ParseGenerateFormAsync(request, ct);
        await Sse.WriteAsync(response, "status", new { stage = "extracting" }, ct);
        var preparation = await CreateAsync(
            form.Files, form.ClassName, form.DurationMinutes, form.SourceLanguage, form.Phases, form.VariantCount, ct);
        await Sse.WriteAsync(response, "preparation", preparation, ct);
        await GenerateAsync(
            preparation, form.VariantCount, 1, form.Provider, form.Model, form.CredentialToken, response, ct);
    }

    private static async Task<GenerateRequest> ParseGenerateFormAsync(HttpRequest request, CancellationToken ct)
    {
        if (!request.HasFormContentType)
            throw new LessonValidationException("Upload files with multipart form data.");
        var form = await request.ReadFormAsync(ct);

        string Required(string name) => form[name].ToString() is { Length: > 0 } value
            ? value
            : throw new LessonValidationException($"Missing {name}.");

        var className = Required("className");
        if (!int.TryParse(Required("totalDurationMinutes"), out var duration)
            || !int.TryParse(Required("variantCount"), out var count))
            throw new LessonValidationException("Duration and variant count must be numbers.");
        var language = Required("sourceLanguage");
        var phases = ResolvePhases(form["lessonFlowPresetId"], form["customPhases"], language);
        LessonValidator.ValidateFlow(className, duration, phases, count);
        var credentialToken = Required("credentialToken");
        if (!Enum.TryParse<AiProvider>(Required("provider"), true, out var provider) || !Enum.IsDefined(provider))
            throw new LessonValidationException("Unknown AI provider.");

        return new GenerateRequest(
            className, duration, count, language, phases, provider, Required("model"),
            credentialToken, [.. form.Files]);
    }

    public async Task<PreparationSnapshot> CreateAsync(IReadOnlyList<IFormFile> files, string className, int duration,
        string language, IReadOnlyList<PhaseSpec> phases, int count, CancellationToken ct)
    {
        LessonValidator.ValidateFlow(className, duration, phases, count);
        var extracted = await documents.ExtractAsync(files, language, ct);
        logger.LogInformation("Extracted material: pages {Pages}, OCR pages {OcrPages}, characters {Characters}",
            extracted.PageCount, extracted.OcrPages, extracted.Text.Length);
        return new PreparationSnapshot(Guid.NewGuid(), className.Trim(), duration, language,
            phases.OrderBy(x => x.Order).ToList(), extracted.Text, "");
    }

    public static void ValidateSnapshot(PreparationSnapshot snapshot, int count, int round)
    {
        if (snapshot is null || snapshot.PreparationId == Guid.Empty || snapshot.Phases is null ||
            snapshot.Phases.Any(x => x is null))
            throw new LessonValidationException("The saved preparation is invalid.");
        if (snapshot.SourceLanguage is not ("en" or "ar" or "fr"))
            throw new LessonValidationException("The saved source language is invalid.");
        if (string.IsNullOrWhiteSpace(snapshot.SourceText) ||
            snapshot.SourceText.Length is < 30 or > DocumentProcessor.MaxSourceChars)
            throw new LessonValidationException("The saved source material is invalid.");
        if (snapshot.PreparedSourceText is null || snapshot.PreparedSourceText.Length > 60_000
                                                || snapshot.PreparedSourceText.Length > 0 &&
                                                string.IsNullOrWhiteSpace(snapshot.PreparedSourceText))
            throw new LessonValidationException("The prepared source material is invalid.");
        if (round is < 1 or > 10_000) throw new LessonValidationException("The generation round is invalid.");
        LessonValidator.ValidateFlow(snapshot.ClassName, snapshot.TotalDurationMinutes, snapshot.Phases, count);
    }

    public async Task GenerateAsync(PreparationSnapshot snapshot, int count, int round, AiProvider providerId, string model,
        string credentialToken, HttpResponse response, CancellationToken ct)
    {
        ValidateSnapshot(snapshot, count, round);
        if (!_providers.TryGetValue(providerId, out var provider))
            throw new LessonValidationException("Unknown AI provider.");
        if (string.IsNullOrWhiteSpace(model) || model.Length > 150)
            throw new LessonValidationException("Choose an AI model.");
        var apiKey = tokens.Open(credentialToken, providerId);
        var models = await provider.ListModelsAsync(apiKey, ct);
        if (!models.Any(x => x.Id == model))
            throw new LessonValidationException("The selected model is no longer available. Refresh your model list.");
        var preparedSource = snapshot.PreparedSourceText;
        if (snapshot.SourceText.Length > 80_000 && string.IsNullOrEmpty(preparedSource))
        {
            await Sse.WriteAsync(response, "status", new { stage = "preparing_source" }, ct);
            var summaries = new List<string>();
            foreach (var chunk in SourceChunks(snapshot.SourceText, 20_000))
            {
                var summary = await provider.SummarizeChunkAsync(apiKey, model, chunk, ct);
                if (string.IsNullOrWhiteSpace(summary) || summary.Length > 6_000)
                    throw new ProviderException("The AI could not prepare the long source material.");
                summaries.Add(summary.Trim());
            }

            preparedSource = string.Join("\n\n", summaries);
            if (preparedSource.Length > 60_000)
                throw new ProviderException("The prepared source material is too large.");
            await Sse.WriteAsync(response, "source_prepared", new { preparedSourceText = preparedSource }, ct);
        }

        var approaches = new List<string>();
        await Sse.WriteAsync(response, "status", new { stage = "generating", round }, ct);
        for (var number = 1; number <= count; number++)
        {
            ct.ThrowIfCancellationRequested();
            await Sse.WriteAsync(response, "status", new { stage = "variant", number, count }, ct);
            GeneratedLesson? lesson = null;
            var validationFeedback = "";
            for (var attempt = 0; attempt < 2 && lesson is null; attempt++)
            {
                var aiRequest = new LessonAiRequest(snapshot.ClassName, snapshot.TotalDurationMinutes,
                    snapshot.SourceLanguage,
                    snapshot.Phases, string.IsNullOrEmpty(preparedSource) ? snapshot.SourceText : preparedSource,
                    string.Join("; ", approaches), validationFeedback);
                var raw = new StringBuilder();
                var previewExtractor = new ProvisionalTextExtractor();
                await foreach (var chunk in provider.StreamLessonJsonAsync(apiKey, model, aiRequest, ct))
                {
                    raw.Append(chunk);
                    if (raw.Length > 100_000) throw new ProviderException("AI response exceeded the allowed size.");
                    var preview = previewExtractor.Push(chunk);
                    if (preview.Length > 0)
                        await Sse.WriteAsync(response, "text_delta", new { number, text = preview }, ct);
                }

                try
                {
                    lesson = LessonValidator.ParseAndValidate(raw.ToString(), snapshot.ClassName,
                        snapshot.TotalDurationMinutes, snapshot.Phases);
                }
                catch (LessonValidationException exception)
                {
                    if (attempt == 1) throw;
                    validationFeedback = exception.Message;
                    logger.LogWarning("Invalid AI output for provider {Provider}, model {Model}; retrying once",
                        providerId, model);
                    await Sse.WriteAsync(response, "status", new { stage = "retry", number }, ct);
                }
            }

            if (lesson is null) throw new LessonValidationException("AI returned no lesson.");
            approaches.Add($"{lesson.Title}: {lesson.Phases.FirstOrDefault()?.Objective}");
            var variant = new VariantDto(Guid.NewGuid(), number, round, providerId, model, lesson);
            await Sse.WriteAsync(response, "variant_ready", variant, ct);
        }

        await Sse.WriteAsync(response, "complete", new { preparationId = snapshot.PreparationId, round }, ct);
        logger.LogInformation("Generated {Count} variants for preparation {PreparationId} with {Provider}/{Model}",
            count, snapshot.PreparationId, providerId, model);
    }

    public static IEnumerable<string> SourceChunks(string source, int maximumLength)
    {
        var chunk = new StringBuilder();
        foreach (var line in source.Split('\n'))
        {
            if (chunk.Length + line.Length + 1 > maximumLength && chunk.Length > 0)
            {
                yield return chunk.ToString();
                chunk.Clear();
            }

            if (line.Length > maximumLength)
            {
                for (var start = 0; start < line.Length; start += maximumLength)
                    yield return line.Substring(start, Math.Min(maximumLength, line.Length - start));
            }
            else chunk.AppendLine(line);
        }

        if (chunk.Length > 0) yield return chunk.ToString();
    }
}
