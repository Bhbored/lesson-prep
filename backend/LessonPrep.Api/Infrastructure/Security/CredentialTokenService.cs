using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using LessonPrep.Api.Application.Enums;
using LessonPrep.Api.Application.Exceptions;
using LessonPrep.Api.Helpers;

namespace LessonPrep.Api.Infrastructure.Security;

public sealed class CredentialTokenService
{
    private readonly byte[] _secret;
    private readonly string _kid;
    private readonly string _protectedHeader;

    public CredentialTokenService(IConfiguration configuration)
    {
        var encoded = configuration["Crypto:TokenSecret"];
        if (string.IsNullOrWhiteSpace(encoded))
            throw new InvalidOperationException("Set Crypto:TokenSecret to a base64-encoded 32-byte secret.");
        try { _secret = Convert.FromBase64String(encoded); }
        catch (FormatException)
        {
            throw new InvalidOperationException("Set Crypto:TokenSecret to a base64-encoded 32-byte secret.");
        }
        if (_secret.Length != 32)
            throw new InvalidOperationException("Set Crypto:TokenSecret to a base64-encoded 32-byte secret.");
        _kid = Convert.ToHexString(SHA256.HashData(_secret))[..16].ToLowerInvariant();
        _protectedHeader = Base64UrlEncode(
            Encoding.UTF8.GetBytes($$"""{"alg":"dir","enc":"A256GCM","kid":"{{_kid}}"}"""));
    }

    public string Issue(AiProvider provider, string apiKey)
    {
        if (string.IsNullOrWhiteSpace(apiKey) || apiKey.Length > 4096)
            throw new CredentialException("Enter a valid API key.");
        var payload = JsonSerializer.SerializeToUtf8Bytes(new TokenPayload(provider, apiKey.Trim(),
            DateTimeOffset.UtcNow.ToUnixTimeSeconds()), JsonDefaults.Web);
        var iv = RandomNumberGenerator.GetBytes(12);
        var ciphertext = new byte[payload.Length];
        var tag = new byte[16];
        try
        {
            using var aes = new AesGcm(_secret, 16);
            aes.Encrypt(iv, payload, ciphertext, tag, Encoding.ASCII.GetBytes(_protectedHeader));
            return string.Join('.',
                _protectedHeader,
                "",
                Base64UrlEncode(iv),
                Base64UrlEncode(ciphertext),
                Base64UrlEncode(tag));
        }
        finally
        {
            CryptographicOperations.ZeroMemory(payload);
            CryptographicOperations.ZeroMemory(ciphertext);
        }
    }

    public string Open(string token, AiProvider expected)
    {
        if (string.IsNullOrWhiteSpace(token))
            throw new CredentialException("Enter your API key again.");
        byte[]? plain = null;
        try
        {
            var parts = token.Split('.');
            if (parts.Length != 5) throw new CryptographicException();
            var headerJson = Encoding.UTF8.GetString(Base64UrlDecode(parts[0]));
            using var header = JsonDocument.Parse(headerJson);
            if (header.RootElement.GetProperty("alg").GetString() != "dir"
                || header.RootElement.GetProperty("enc").GetString() != "A256GCM"
                || header.RootElement.GetProperty("kid").GetString() != _kid
                || parts[1].Length != 0)
                throw new CryptographicException();
            var iv = Base64UrlDecode(parts[2]);
            var ciphertext = Base64UrlDecode(parts[3]);
            var tag = Base64UrlDecode(parts[4]);
            if (iv.Length != 12 || tag.Length != 16 || ciphertext.Length == 0) throw new CryptographicException();
            plain = new byte[ciphertext.Length];
            using var aes = new AesGcm(_secret, 16);
            aes.Decrypt(iv, ciphertext, tag, plain, Encoding.ASCII.GetBytes(parts[0]));
            var payload = JsonSerializer.Deserialize<TokenPayload>(plain, JsonDefaults.Web)
                          ?? throw new CryptographicException();
            if (payload.Provider != expected || string.IsNullOrWhiteSpace(payload.Key) || payload.Key.Length > 4096)
                throw new CryptographicException();
            return payload.Key;
        }
        catch (Exception exception) when (exception is FormatException or CryptographicException or JsonException
                                              or KeyNotFoundException or InvalidOperationException)
        {
            throw new CredentialException("Unable to decrypt the API key. Enter it again.");
        }
        finally
        {
            if (plain is not null) CryptographicOperations.ZeroMemory(plain);
        }
    }

    private static string Base64UrlEncode(ReadOnlySpan<byte> data) =>
        Convert.ToBase64String(data).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] Base64UrlDecode(string value)
    {
        var padded = value.Replace('-', '+').Replace('_', '/');
        padded += (padded.Length % 4) switch { 2 => "==", 3 => "=", _ => "" };
        return Convert.FromBase64String(padded);
    }

    private sealed record TokenPayload(
        [property: JsonPropertyName("provider")] AiProvider Provider,
        [property: JsonPropertyName("key")] string Key,
        [property: JsonPropertyName("iat")] long Iat);
}
