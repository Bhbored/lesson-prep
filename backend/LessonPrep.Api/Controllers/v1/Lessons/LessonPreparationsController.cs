using LessonPrep.Api.Application.Dtos;
using LessonPrep.Api.Application.Services.Lessons;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace LessonPrep.Api.Controllers.v1.Lessons;

public sealed class LessonPreparationsController(GenerationService service) : BaseController
{
    [HttpPost("generate")]
    [EnableRateLimiting("generation")]
    public Task Generate(CancellationToken cancellationToken) =>
        service.GenerateFromFormAsync(Request, Response, cancellationToken);

    [HttpPost("regenerate")]
    [EnableRateLimiting("generation")]
    public Task Regenerate([FromBody] RegenerateRequest request, CancellationToken cancellationToken) =>
        service.GenerateAsync(
            request.Snapshot,
            request.VariantCount,
            request.GenerationRound,
            request.Provider,
            request.Model,
            request.CredentialToken,
            Response,
            cancellationToken);
}
