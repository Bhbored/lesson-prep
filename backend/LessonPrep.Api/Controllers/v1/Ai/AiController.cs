using LessonPrep.Api.Application.Contracts.Ai;
using LessonPrep.Api.Application.Dtos;
using LessonPrep.Api.Application.Enums;
using LessonPrep.Api.Application.Exceptions;
using LessonPrep.Api.Infrastructure.Security;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace LessonPrep.Api.Controllers.v1.Ai;

public sealed class AiController(CredentialTokenService tokens, IEnumerable<IAiProvider> adapters) : BaseController
{
    [HttpPost("credentials")]
    [EnableRateLimiting("models")]
    public ActionResult<CredentialTokenDto> IssueCredential([FromBody] IssueCredentialRequest request)
    {
        if (!Enum.IsDefined(request.Provider))
            throw new LessonValidationException("Unknown AI provider.");
        return Ok(new CredentialTokenDto(tokens.Issue(request.Provider, request.ApiKey)));
    }

    [HttpPost("providers/{provider}/models")]
    [EnableRateLimiting("models")]
    public async Task<ActionResult<IReadOnlyList<AiModel>>> ListModels(
        AiProvider provider, [FromHeader(Name = "X-Provider-Token")] string? providerToken,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(providerToken))
            throw new CredentialException("Enter an API key in Settings.");
        var adapter = adapters.FirstOrDefault(x => x.Provider == provider)
            ?? throw new LessonValidationException("Unknown AI provider.");
        return Ok(await adapter.ListModelsAsync(tokens.Open(providerToken, provider), cancellationToken));
    }
}
