# LessonPrep

LessonPrep turns uploaded teaching material into 1–3 structured classroom lesson alternatives. It has two runtime components: a React frontend and an ASP.NET Core API with in-process PaddleOCR. **No database is required.** The standard lesson flow is defined in code; browser local storage holds custom presets, server-issued credential tokens, and the latest preparation/source snapshot for regeneration.

See the [documentation index](docs/README.md) for architecture, OCR, provider, hosting, and storage details.

## Requirements

- .NET 10 SDK
- Node.js 20.19+ or 22.12+ and npm
- Windows x64 or Linux x64 for native PaddleOCR (models are embedded and work offline)
- A personal API key for at least one of OpenAI, Gemini, Anthropic, or DeepSeek to generate lessons

## Start locally

1. Start the API in another shell:

   ```powershell
   cd backend/LessonPrep.Api
   dotnet run --launch-profile https
   ```

   The HTTPS development profile listens on `https://localhost:7132` and `http://localhost:5132`; HTTP requests redirect to HTTPS. `appsettings.Development.json` supplies a local `Crypto:TokenSecret` for credential tokens. Run `dotnet dev-certs https --trust` if the development certificate is not trusted.

2. Start React in another shell:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

   Open `http://localhost:5173`. Vite forwards `/lessonprep` requests to ASP.NET. In **Settings**, enter a provider key and choose a live model before generating.

## Workflow and storage

- `Standard 45-Minute Lesson` is returned from `StandardLessonFlow.cs`, with Warm-up 5, Instruction 15, Practice 15, Assessment 7, and Closure 3 minutes. It is read-only in React. Custom flows are editable in that browser's local storage.
- TXT and CSV are parsed directly. Each PDF page uses native text when adequate; scanned/weak-text pages are rendered and recognized inside the API. Uploads are not saved as files.
- Class selection is a required dropdown covering Kindergarten 1–3 and Grades 1–12. Source/output language can be English, Arabic, or French; French OCR uses the PaddleOCR Latin recognition model.
- The API returns the bounded normalized source and phase snapshot in the `preparation` SSE event. React saves the latest snapshot and validated alternatives in that browser's local storage. Regeneration posts the saved snapshot back to the stateless API with the provider/model currently selected in Settings.
- Provider keys are sent once over HTTPS to `POST /lessonprep/v1.0/Ai/credentials`. The API returns a JWE credential token (`dir` + `A256GCM`) that the browser stores and reuses. The API decrypts tokens only in memory for provider requests and does not save credentials. Rotating `Crypto:TokenSecret` requires users to enter keys again.
- The API validates class, duration, phase names/order/durations, and required lesson fields before a `variant_ready` event. Provisional text deltas are discarded if a stream fails or is cancelled.
- In Results, select an alternative and choose **Export PDF** to print that lesson alone to a paginated A4 PDF. Use the browser's **Save as PDF** destination; the filename starts from the lesson title.

## API

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | API health |
| `POST /lessonprep/v1.0/Ai/credentials` | Issue a credential token from a provider API key |
| `POST /lessonprep/v1.0/Ai/providers/{provider}/models` | Live compatible models using `X-Provider-Token` |
| `GET /lessonprep/v1.0/LessonFlowPresets` | Code-defined standard preset |
| `POST /lessonprep/v1.0/LessonPreparations/generate` | Multipart upload and SSE generation stream |
| `POST /lessonprep/v1.0/LessonPreparations/regenerate` | New alternatives from a browser-supplied preparation snapshot via SSE |

The SSE stream emits `status`, `preparation`, `source_prepared` for long material, `text_delta`, `variant_ready`, `complete`, and `error`. The `preparation` event includes source text and phases because the browser stores the state needed for regeneration.

## Limits

A preparation accepts 1–5 files, at most 20 MiB each and 60 PDF pages total. Normalized source text is capped at 200,000 characters. Sources over 80,000 characters are summarized in bounded chunks and the prepared representation is returned to the browser for reuse. This account-free MVP keeps only the latest preparation in browser storage; clearing that storage removes its regeneration source, custom presets, and credential tokens. There is no cross-device sync.

## Checks

```powershell
dotnet test backend/LessonPrep.slnx
npm test --prefix frontend
npm run typecheck --prefix frontend
npm run lint --prefix frontend
npm run build --prefix frontend
```

Frontend tests use Vitest, React Testing Library, and jsdom. Set `$env:API_TEST_URL='http://127.0.0.1:5199'` to a running production-mode API and run `npm test --prefix frontend` to include credential issuance, TXT/scanned-PDF extraction, and empty prepared-source regeneration. These checks use invalid tokens after extraction and make no paid generation requests. Separately opt into the external DeepSeek credential-decryption check with `$env:CHECK_KEY_DECRYPT='1'`. Clear both variables afterward. Set `RUN_OCR_TESTS=1` before `dotnet test` to run the native English OCR integration test. Models initialize lazily on the first scanned page for each language.

The frontend follows `src/app/{features,providers,routes,shell,shared}` with global, responsive, and print styles in `src/styles`. Root providers retain preparation forms, preset drafts, and active generation across `/prepare`, `/presets`, `/settings`, and `/results`. `ApiClient` and `SseClient` in `src/app/shared/api` provide reusable validated transport; endpoint payloads belong to feature adapters. Production hosts must provide the [SPA fallback](docs/deployment/hosting.md#network-layout) for deep links.
