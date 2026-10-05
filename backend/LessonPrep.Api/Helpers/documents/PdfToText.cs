using System.Runtime.Versioning;
using System.Text;
using LessonPrep.Api.Application.Contracts.Documents;
using LessonPrep.Api.Application.Exceptions;
using PDFtoImage;
using UglyToad.PdfPig;

namespace LessonPrep.Api.Helpers.Documents;

public static class PdfToText
{
    public static async Task<(string Text, int Pages, int OcrPages)> ConvertAsync(
        IOcrService ocr, byte[] bytes, string language, CancellationToken ct)
    {
        using var pdf = PdfDocument.Open(bytes);
        if (pdf.NumberOfPages > DocumentProcessor.MaxTotalPages)
            throw new DocumentException("PDF files may contain at most 60 pages.");
        var output = new StringBuilder();
        var ocrCount = 0;
        for (var index = 0; index < pdf.NumberOfPages; index++)
        {
            ct.ThrowIfCancellationRequested();
            var native = pdf.GetPage(index + 1).Text;
            var usable = native.Count(char.IsLetterOrDigit) >= 40 &&
                         native.Count(c => c == '\ufffd') < native.Length / 20;
            string pageText;
            if (usable) pageText = native;
            else if (OperatingSystem.IsWindows() || OperatingSystem.IsLinux() || OperatingSystem.IsMacOS())
            {
                pageText = await ocr.ReadImageAsync(RenderPagePng(bytes, index), language, ct);
                ocrCount++;
            }
            else
            {
                throw new DocumentException("PDF rendering is unavailable on this operating system.");
            }

            output.AppendLine($"[Page {index + 1}]").AppendLine(pageText).AppendLine();
        }

        return (output.ToString(), pdf.NumberOfPages, ocrCount);
    }

    [SupportedOSPlatform("windows")]
    [SupportedOSPlatform("linux")]
    [SupportedOSPlatform("macos")]
    private static byte[] RenderPagePng(byte[] bytes, int pageIndex)
    {
        using var image = new MemoryStream();
        Conversion.SavePng(image, bytes, pageIndex, options: new RenderOptions(Dpi: 220));
        return image.ToArray();
    }
}
