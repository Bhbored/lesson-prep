using System.Text;
using System.Text.RegularExpressions;
using CsvHelper;
using LessonPrep.Api.Application.Contracts.Documents;
using LessonPrep.Api.Application.Dtos;
using LessonPrep.Api.Application.Exceptions;

namespace LessonPrep.Api.Helpers.Documents;

public sealed class DocumentProcessor(IOcrService ocr, ILogger<DocumentProcessor> logger)
{
    public const int MaxFiles = 5;
    public const int MaxFileBytes = 20 * 1024 * 1024;
    public const int MaxTotalPages = 60;
    public const int MaxSourceChars = 200_000;

    public async Task<ExtractedMaterial> ExtractAsync(IReadOnlyList<IFormFile> files, string language,
        CancellationToken ct)
    {
        if (files.Count is < 1 or > MaxFiles) throw new DocumentException("Upload between one and five files.");
        if (language is not ("en" or "ar" or "fr"))
            throw new DocumentException("Select English, Arabic, or French as the source language.");
        var text = new StringBuilder();
        var totalPages = 0;
        var ocrPages = 0;
        foreach (var file in files)
        {
            ct.ThrowIfCancellationRequested();
            if (file.Length is <= 0 or > MaxFileBytes)
                throw new DocumentException("Each file must be nonempty and at most 20 MB.");
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (extension is not (".pdf" or ".txt" or ".csv"))
                throw new DocumentException("Only PDF, TXT, and CSV files are supported.");
            await using var input = file.OpenReadStream();
            using var memory = new MemoryStream();
            await input.CopyToAsync(memory, ct);
            var bytes = memory.ToArray();
            string extracted;
            var filePages = 0;
            var fileOcr = 0;
            try
            {
                if (extension == ".txt") extracted = new UTF8Encoding(false, true).GetString(bytes);
                else if (extension == ".csv") extracted = CsvToText.Convert(new UTF8Encoding(false, true).GetString(bytes));
                else
                {
                    if (bytes.Length < 5 || Encoding.ASCII.GetString(bytes, 0, 5) != "%PDF-")
                        throw new DocumentException("The PDF is invalid.");
                    (extracted, filePages, fileOcr) = await PdfToText.ConvertAsync(ocr, bytes, language, ct);
                }
            }
            catch (DecoderFallbackException)
            {
                throw new DocumentException("TXT and CSV files must use UTF-8 encoding.");
            }
            catch (CsvHelperException)
            {
                throw new DocumentException("The CSV file is malformed.");
            }
            catch (Exception exception) when (extension == ".pdf" &&
                                              exception is not DocumentException and not OperationCanceledException)
            {
                throw new DocumentException("The PDF could not be read.");
            }

            totalPages += filePages;
            ocrPages += fileOcr;
            if (totalPages > MaxTotalPages)
                throw new DocumentException("PDF files may contain at most 60 pages in total.");
            extracted = Normalize(extracted);
            if (extracted.Length < 30)
                throw new DocumentException($"No readable material was found in {file.FileName}.");
            text.AppendLine($"DOCUMENT: {Path.GetFileName(file.FileName)}").AppendLine(extracted).AppendLine();
            if (text.Length > MaxSourceChars)
                throw new DocumentException("Extracted source is too large; use a shorter selection of material.");
            logger.LogInformation(
                "Processed file extension {Extension}, bytes {Bytes}, pages {Pages}, OCR pages {OcrPages}", extension,
                bytes.Length, filePages, fileOcr);
        }

        return new ExtractedMaterial(text.ToString(), totalPages, ocrPages);
    }

    private static string Normalize(string input)
    {
        var lines = input.Replace("\r\n", "\n").Replace('\r', '\n').Split('\n');
        var output = new StringBuilder();
        var blank = false;
        foreach (var line in lines)
        {
            var clean = Regex.Replace(new string(line.Where(c => c == '\t' || !char.IsControl(c)).ToArray()), @"[\t ]+",
                " ").Trim();
            if (clean.Length == 0)
            {
                if (!blank && output.Length > 0) output.AppendLine();
                blank = true;
            }
            else
            {
                output.AppendLine(clean);
                blank = false;
            }
        }

        return output.ToString().Trim();
    }
}
