using System.Net.Http.Headers;
using LessonPrep.Api.Application.Contracts.Documents;
using LessonPrep.Api.Application.Dtos;
using LessonPrep.Api.Application.Exceptions;

namespace LessonPrep.Api.Infrastructure.Ocr;

public sealed class PaddleOcrClient(IHttpClientFactory factory, IConfiguration configuration) : IOcrService
{
    public async Task<string> ReadImageAsync(byte[] png, string language, CancellationToken cancellationToken)
    {
        var baseUrl = configuration["OcrService:BaseUrl"] ?? "http://localhost:8001";
        using var form = new MultipartFormDataContent();
        using var image = new ByteArrayContent(png);
        image.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        form.Add(image, "image", "page.png");
        form.Add(new StringContent(language), "language");
        try
        {
            using var response = await factory.CreateClient("ocr")
                .PostAsync(new Uri(new Uri(baseUrl.TrimEnd('/') + "/"), "api/ocr"), form, cancellationToken);
            if (!response.IsSuccessStatusCode) throw new DocumentException("OCR could not read a scanned page.");
            var result = await response.Content.ReadFromJsonAsync<OcrResponse>(cancellationToken);
            return result?.Text ?? "";
        }
        catch (HttpRequestException)
        {
            throw new DocumentException("OCR service is unavailable.");
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            throw new DocumentException("OCR service timed out.");
        }
    }
}
