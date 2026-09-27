using System.Security.Cryptography;

namespace LessonPrep.Api.Infrastructure.Security;

public sealed record EncryptedCredential(string KeyId, string WrappedKey, string Nonce, string Ciphertext);
public sealed record PublicKeyDto(string KeyId, string Spki);

public sealed class CredentialCipher : IDisposable
{
    private readonly RSA _rsa = RSA.Create();
    public PublicKeyDto PublicKey { get; }

    public CredentialCipher(IConfiguration configuration, IHostEnvironment environment)
    {
        var path = configuration["Crypto:PrivateKeyPath"];
        if (string.IsNullOrWhiteSpace(path))
            throw new InvalidOperationException("Set Crypto:PrivateKeyPath to a persistent RSA private key PEM file.");
        var resolvedPath = Path.IsPathRooted(path) ? path : Path.GetFullPath(Path.Combine(environment.ContentRootPath, path));
        if (!File.Exists(resolvedPath))
            throw new InvalidOperationException("Set Crypto:PrivateKeyPath to a persistent RSA private key PEM file.");
        _rsa.ImportFromPem(File.ReadAllText(resolvedPath));
        var spki = _rsa.ExportSubjectPublicKeyInfo();
        PublicKey = new PublicKeyDto(Convert.ToHexString(SHA256.HashData(spki))[..16].ToLowerInvariant(), Convert.ToBase64String(spki));
    }

    public string Decrypt(EncryptedCredential envelope)
    {
        if (envelope.KeyId != PublicKey.KeyId) throw new CredentialException("The encryption key changed. Enter your API key again.");
        byte[]? aesKey = null;
        byte[]? plain = null;
        try
        {
            aesKey = _rsa.Decrypt(Convert.FromBase64String(envelope.WrappedKey), RSAEncryptionPadding.OaepSHA256);
            var nonce = Convert.FromBase64String(envelope.Nonce);
            var combined = Convert.FromBase64String(envelope.Ciphertext);
            if (aesKey.Length != 32 || nonce.Length != 12 || combined.Length < 17) throw new CryptographicException();
            plain = new byte[combined.Length - 16];
            using var aes = new AesGcm(aesKey, 16);
            aes.Decrypt(nonce, combined.AsSpan(0, plain.Length), combined.AsSpan(plain.Length, 16), plain);
            var result = System.Text.Encoding.UTF8.GetString(plain);
            if (string.IsNullOrWhiteSpace(result) || result.Length > 4096) throw new CryptographicException();
            return result;
        }
        catch (Exception exception) when (exception is FormatException or CryptographicException)
        {
            throw new CredentialException("Unable to decrypt the API key. Enter it again.");
        }
        finally
        {
            if (aesKey is not null) CryptographicOperations.ZeroMemory(aesKey);
            if (plain is not null) CryptographicOperations.ZeroMemory(plain);
        }
    }

    public void Dispose() => _rsa.Dispose();
}

public sealed class CredentialException(string message) : Exception(message);
