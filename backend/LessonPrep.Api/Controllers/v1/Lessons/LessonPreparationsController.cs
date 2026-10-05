using LessonPrep.Api.Application.Dtos;
using LessonPrep.Api.Application.Services.Lessons;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace LessonPrep.Api.Controllers.v1.Lessons;

public sealed class LessonPreparationsController(GenerationService service, SessionToolService tools) : BaseController
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

    [HttpPost("sessionTool")]
    [EnableRateLimiting("generation")]
    public async Task<IActionResult> SessionTool([FromBody] SessionToolRequest request,
        CancellationToken cancellationToken) =>
        Ok(await tools.CreateAsync(request, cancellationToken));
}
