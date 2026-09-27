using LessonPrep.Api.Application.Services;
using LessonPrep.Api.Infrastructure.Ai;
using LessonPrep.Api.Infrastructure.Security;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace LessonPrep.Api.Controllers.v1;

public sealed class AiController(CredentialCipher cipher, IEnumerable<IAiProvider> adapters) : LessonPrepControllerBase
{
    [HttpGet("public-key")]
    public ActionResult<PublicKeyDto> GetPublicKey() => Ok(cipher.PublicKey);

    [HttpPost("providers/{provider}/models")]
    [EnableRateLimiting("models")]
    public async Task<ActionResult<IReadOnlyList<AiModel>>> ListModels(
        string provider, [FromBody] EncryptedCredential credential, CancellationToken cancellationToken)
    {
        var adapter = adapters.FirstOrDefault(x => x.Id == provider)
            ?? throw new LessonValidationException("Unknown AI provider.");
        return Ok(await adapter.ListModelsAsync(cipher.Decrypt(credential), cancellationToken));
    }
}
