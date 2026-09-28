using System.ComponentModel.DataAnnotations;

namespace LessonPrep.Api.Application.Dtos;

public sealed record EncryptedCredential(
    [Required, StringLength(16, MinimumLength = 16)] string KeyId,
    [Required, MinLength(1)] string WrappedKey,
    [Required, MinLength(1)] string Nonce,
    [Required, MinLength(1)] string Ciphertext);

public sealed record PublicKeyDto(string KeyId, string Spki);
