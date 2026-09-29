# Documents and OCR

The document pipeline lives under `backend/LessonPrep.Api/Helpers/documents/`:

- `DocumentProcessor.cs` — upload validation, orchestration, and text normalization.
- `CsvToText.cs` — CSV parsing into labeled text.
- `PdfToText.cs` — PdfPig native text and PDFtoImage rendering for weak pages.

OCR runs inside `backend/LessonPrep.Api/Infrastructure/OCR/PaddleOcrEngine.cs`, a singleton implementing the unchanged `IOcrService` contract. ASP.NET owns validation, parsing, rendering, recognition, and normalization.

## File flow

- **TXT:** Read as strict UTF-8, then normalize whitespace and control characters while retaining paragraph breaks.
- **CSV:** Parse with CsvHelper so quoted commas and multiline cells are handled. Convert each row into labeled text fields.
- **PDF:** Verify the PDF signature and extract each page's native text with PdfPig. A page is considered usable when it has at least 40 letters/digits and few replacement characters.
- **Weak-text PDF page:** Render that page to a 220 DPI PNG using PDFtoImage, then decode the image with OpenCvSharp and queue native PaddleOCR inference.

The engine lazily creates a `QueuedPaddleOcrAll` per language. English uses `LocalFullModels.EnglishV5`, Arabic uses `ArabicV5`, and French uses `LatinV5`, with the PP-OCRv5 detector. Models are embedded and work offline. Each queue has `Ocr:WorkerCount` workers (environment variable `Ocr__WorkerCount`, default 1); increasing it creates additional model instances and consumes more memory. Rotation detection is enabled, 180-degree classification is disabled, and the MKL-DNN shape cache capacity is 1 to limit memory for varying page sizes.

The API preserves page order and combines native and OCR text. Uploads are not persisted. Request cancellation stops queued work; a native run already in progress finishes before its image is disposed. Created queues and models are disposed at API shutdown.

## Language and limits

The UI's source language selection (`en`, `ar`, or `fr`) determines which OCR engine is used and tells the lesson generator which language to use. The Arabic and Latin recognition models also support English text in mixed material. OCR requests are limited to 15 MiB and 30 million image pixels. The API limits one preparation to five files, 20 MiB each, 60 PDF pages, and 200,000 normalized source characters.

Scanned-document quality depends on scan resolution, page rotation, contrast, handwriting, and layout. OCR output is not a verified transcription; teachers should review the generated lesson against their original material.

## Native deployment

Sdcb.PaddleOCR and Models.Local are pinned to 3.3.1; Paddle Inference runtimes to 3.3.1.70. LocalV5 is explicitly pinned to 3.3.1 because the Local package otherwise resolves the incomplete 3.0.0 model bundle. OpenCvSharp managed and native versions match at 4.11.0.20250507. OpenCV 4.13 changes rotated rectangle conventions and is incompatible with PaddleOCR 3.3.1 rotation handling. Windows x64 and Linux x64 runtimes are selected by publish RID, or by build host when no RID is set. The `PaddleOCR/` checkout is reference material and is not needed on the server.

Publish Linux with `dotnet publish backend/LessonPrep.Api -c Release -r linux-x64 --self-contained false`. Use a glibc-based Debian/Ubuntu host rather than Alpine. OpenCvSharp requires GTK3, GLib, FreeType, HarfBuzz, and their dependencies even for headless OCR. Install the matching distribution packages (for example `libgtk-3-0` and `libharfbuzz0b` on Debian 12), then check native shared-library dependencies on the deployment image and run a scanned-PDF smoke test there.
