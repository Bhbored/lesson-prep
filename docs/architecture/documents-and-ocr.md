# Documents and OCR

The document pipeline is implemented in `backend/LessonPrep.Api/Documents/DocumentProcessor.cs`. ASP.NET owns file validation, PDF parsing, page rendering, and text normalization. Python only receives rendered images and returns OCR text.

## File flow

- **TXT:** Read as strict UTF-8, then normalize whitespace and control characters while retaining paragraph breaks.
- **CSV:** Parse with CsvHelper so quoted commas and multiline cells are handled. Convert each row into labeled text fields.
- **PDF:** Verify the PDF signature and extract each page's native text with PdfPig. A page is considered usable when it has at least 40 letters/digits and few replacement characters.
- **Weak-text PDF page:** Render that page to a 220 DPI PNG using PDFtoImage, then POST the image and language to FastAPI's `/api/ocr` endpoint.

The OCR service loads English, Arabic, and French PaddleOCR engines on startup. English uses `en_PP-OCRv5_mobile_rec`, Arabic uses `arabic_PP-OCRv5_mobile_rec`, and French uses `latin_PP-OCRv5_mobile_rec`. It validates the image and size, serializes calls per language engine, and returns recognized text. The API restores page order and combines OCR/native text before returning the normalized source to the browser. File uploads are not persisted as files.

## Service boundary

The API uses `OcrService:BaseUrl` (environment variable `OcrService__BaseUrl`) and appends `/api/ocr`. The service has `GET /health`, returning `{"ready":true}` after the English, Arabic, and French OCR engines are loaded. The OCR HTTP timeout is two minutes.

Keep the OCR endpoint on a private network and allow only the ASP.NET service to call it. It has no application authentication because the intended deployment boundary is the private service network. Do not expose it directly to the public internet.

## Language and limits

The UI's source language selection (`en`, `ar`, or `fr`) determines which OCR engine is used and tells the lesson generator which language to use. The Arabic and Latin recognition models also support English text in mixed material. OCR requests are limited to 15 MiB and 30 million image pixels. The API limits one preparation to five files, 20 MiB each, 60 PDF pages, and 200,000 normalized source characters.

Scanned-document quality depends on scan resolution, page rotation, contrast, handwriting, and layout. OCR output is not a verified transcription; teachers should review the generated lesson against their original material.

## PaddleOCR package versus source folder

`ocr-service/requirements.txt` pins `paddleocr==3.3.2` and `paddlepaddle==3.2.2`. `ocr-service/app/main.py` imports `PaddleOCR` from that installed package. The repository's `PaddleOCR/paddleocr/` checkout is not imported, copied into the service, or needed on the server. The OCR service also needs the runtime's PaddleOCR model files; first startup downloads them if no local model cache exists.
