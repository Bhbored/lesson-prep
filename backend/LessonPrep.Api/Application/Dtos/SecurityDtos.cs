namespace LessonPrep.Api.Application.Dtos;

public sealed record EncryptedCredential(string KeyId, string WrappedKey, string Nonce, string Ciphertext);
public sealed record PublicKeyDto(string KeyId, string Spki);
