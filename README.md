# LessonPrep

LessonPrep turns uploaded teaching material into 1–3 structured classroom lesson alternatives. It has three runtime components: a React frontend, an ASP.NET Core API, and a small Python PaddleOCR service. **No database is required.** The standard lesson flow is defined in code; browser local storage holds custom presets, encrypted provider credentials, and the latest preparation/source snapshot for regeneration.

See the [documentation index](docs/README.md) for architecture, OCR, provider, hosting, and storage details.

## Requirements

- .NET 10 SDK
- Node.js 20.19+ or 22.12+ and npm
- Python 3.12 for the OCR service; its dependencies are pinned in `ocr-service/requirements.txt`
- OpenSSL for the development RSA key script (Git for Windows includes it)
- A personal API key for at least one of OpenAI, Gemini, Anthropic, or DeepSeek to generate lessons

## Start locally

1. Create the API's persistent development RSA key in ignored `.local-secrets/`:

   ```powershell
   ./scripts/create-dev-key.ps1
   ```

2. Start OCR in its own Python environment:

   ```powershell
   py -3.12 -m venv ocr-service/.venv
   ocr-service/.venv/Scripts/python.exe -m pip install -r ocr-service/requirements.txt
   cd ocr-service
   .venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001
   ```

   The first start loads/downloads the English, Arabic, and French PP-OCRv5 mobile recognition models.

3. Start the API in another shell:

   ```powershell
   cd backend/LessonPrep.Api
   dotnet run
   ```

   The development profile listens on `http://localhost:5132`. The default private key path in `appsettings.json` points to the development key made in step 1.

4. Start React in another shell:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

   Open `http://localhost:5173`. Vite forwards `/api` requests to ASP.NET. In **Settings**, enter a provider key and choose a live model before generating.

## Workflow and storage

- `Standard 45-Minute Lesson` is returned from `StandardLessonFlow.cs`, with Warm-up 5, Instruction 15, Practice 15, Assessment 7, and Closure 3 minutes. It is read-only in React. Custom flows are editable in that browser's local storage.
- TXT and CSV are parsed directly. Each PDF page uses native text when adequate; scanned/weak-text pages are rendered and sent to the private OCR service. Uploads are not saved as files.
- Class selection is a required dropdown covering Kindergarten 1–3 and Grades 1–12. Source/output language can be English, Arabic, or French; French OCR uses the PaddleOCR Latin recognition model.
- The API returns the bounded normalized source and phase snapshot in the `preparation` SSE event. React saves the latest snapshot and validated alternatives in that browser's local storage. Regeneration posts the saved snapshot back to the stateless API with the provider/model currently selected in Settings.
- Provider keys are encrypted in the browser with AES-GCM and an RSA-OAEP wrapped data key. The API decrypts them only in memory for provider requests; it does not save credentials. Rotating the server private key requires users to enter keys again.
- The API validates class, duration, phase names/order/durations, and required lesson fields before a `variant_ready` event. Provisional text deltas are discarded if a stream fails or is cancelled.
- In Results, select an alternative and choose **Export PDF** to print that lesson alone to a paginated A4 PDF. Use the browser's **Save as PDF** destination; the filename starts from the lesson title.

## API

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | API health |
| `GET /api/ai/public-key` | Public key and key ID for browser encryption |
| `POST /api/ai/providers/{provider}/models` | Live compatible models using an encrypted credential |
| `GET /api/lesson-flow-presets` | Code-defined standard preset |
| `POST /api/lesson-preparations/generate` | Multipart upload and SSE generation stream |
| `POST /api/lesson-preparations/regenerate` | New alternatives from a browser-supplied preparation snapshot via SSE |

The SSE stream emits `status`, `preparation`, `source_prepared` for long material, `text_delta`, `variant_ready`, `complete`, and `error`. The `preparation` event includes source text and phases because the browser stores the state needed for regeneration.

## Limits

A preparation accepts 1–5 files, at most 20 MiB each and 60 PDF pages total. Normalized source text is capped at 200,000 characters. Sources over 80,000 characters are summarized in bounded chunks and the prepared representation is returned to the browser for reuse. This account-free MVP keeps only the latest preparation in browser storage; clearing that storage removes its regeneration source, custom presets, and encrypted keys. There is no cross-device sync.

## Checks

```powershell
dotnet test backend/LessonPrep.slnx
npm run build --prefix frontend
```

With the API running, `node scripts/api-smoke.mjs` checks the static preset, upload, SSE snapshot, and stateless regeneration request without a paid AI call. Set `CHECK_PDF=1` to exercise scanned-page OCR through the running OCR service, or `CHECK_KEY_DECRYPT=1` to send an intentionally invalid decrypted test key to DeepSeek's model list endpoint. `ocr-service/smoke_test.py` checks English and Arabic OCR against the running service. Real lesson generation needs the teacher's provider key.
