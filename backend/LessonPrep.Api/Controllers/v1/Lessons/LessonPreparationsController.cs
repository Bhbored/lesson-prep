using System.Text.Json;
using LessonPrep.Api.Application.Dtos;
using LessonPrep.Api.Application.Exceptions;
using LessonPrep.Api.Application.Services.Lessons;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace LessonPrep.Api.Controllers.v1.Lessons;

public sealed class LessonPreparationsController(GenerationService service) : LessonPrepControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    [HttpPost("generate")]
    [EnableRateLimiting("generation")]
    public async Task Generate(CancellationToken cancellationToken)
    {
        if (!Request.HasFormContentType) throw new LessonValidationException("Upload files with multipart form data.");
        var form = await Request.ReadFormAsync(cancellationToken);
        string Required(string name) => form[name].ToString() is { Length: > 0 } value
            ? value
            : throw new LessonValidationException($"Missing {name}.");
        var className = Required("className");
        if (!int.TryParse(Required("totalDurationMinutes"), out var duration)
            || !int.TryParse(Required("variantCount"), out var count))
            throw new LessonValidationException("Duration and variant count must be numbers.");
        var phases = GenerationService.ResolvePhases(form["lessonFlowPresetId"], form["customPhases"]);
        LessonValidator.ValidateFlow(className, duration, phases, count);
        var credential = JsonSerializer.Deserialize<EncryptedCredential>(Required("encryptedCredential"), JsonOptions)
            ?? throw new CredentialException("Enter an API key in Settings.");
        await Sse.WriteAsync(Response, "status", new { stage = "extracting" }, cancellationToken);
        var preparation = await service.CreateAsync(
            form.Files.ToList(), className, duration, Required("sourceLanguage"), phases, count, cancellationToken);
        await Sse.WriteAsync(Response, "preparation", preparation, cancellationToken);
        await service.GenerateAsync(
            preparation, count, 1, Required("provider"), Required("model"), credential, Response, cancellationToken);
    }

    [HttpPost("regenerate")]
    [EnableRateLimiting("generation")]
    public async Task Regenerate([FromBody] RegenerateRequest request, CancellationToken cancellationToken)
    {
        await service.GenerateAsync(
            request.Snapshot,
            request.VariantCount,
            request.GenerationRound,
            request.Provider,
            request.Model,
            request.EncryptedCredential,
            Response,
            cancellationToken);
    }
}
