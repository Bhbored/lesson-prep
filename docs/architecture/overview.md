# Architecture and request flow

LessonPrep is an account-free web application with three runtime components. It has no database.

| Component | Responsibility | Reachability |
| --- | --- | --- |
| React frontend (`frontend/`) | Settings, uploads, browser-local presets/preparations, and streaming display | Public HTTPS site |
| ASP.NET Core API (`backend/LessonPrep.Api/`) | Validates requests, extracts files, calls OCR and AI providers, and streams results | Public HTTPS API |
| FastAPI/PaddleOCR (`ocr-service/`) | Converts rendered PDF page images to English, Arabic, or French text | Private API-to-OCR network |

The Python OCR service is a narrow image-to-text service. ASP.NET handles everything about lessons, provider calls, and PDF page rendering. The standard lesson preset is defined by `StandardLessonFlow.cs`; custom presets and the latest preparation live in browser local storage.

API routes are versioned under `lessonprep/v1.0/...` (see `Controllers/BaseController.cs`).

## Generation request

1. The browser posts the provider API key once to `POST /lessonprep/v1.0/Ai/credentials` over HTTPS. The API returns a JWE credential token that is stored locally.
2. The teacher uploads PDF/TXT/CSV material to `POST /lessonprep/v1.0/LessonPreparations/generate` with class, duration, phase selection, provider, model, and credential token.
3. ASP.NET parses TXT/CSV directly. For each PDF page, it reads embedded text or renders and sends weak-text pages to the private OCR service.
4. ASP.NET normalizes and bounds the source, validates the phase timings, and emits a `preparation` SSE event containing source text and an ordered phase snapshot. React stores this latest snapshot in browser local storage.
5. ASP.NET decrypts the credential token in memory and calls the chosen AI provider. Adapters translate one lesson prompt and schema into provider-specific requests and streaming responses.
6. The API emits status, provisional text deltas, validated alternatives, and completion events. React stores only completed alternatives and displays provisional text separately.
7. Regeneration sends the browser's saved source/phase snapshot back to ASP.NET with the provider/model currently selected in Settings. Nothing needs to be looked up on the server.

## Main code locations

- `backend/LessonPrep.Api/Program.cs` — middleware pipeline (Serilog, HSTS, HTTPS redirection, CORS, rate limiting, HTTP logging, Swagger).
- `backend/LessonPrep.Api/Helpers/DIContainer.cs` — DI, versioning, rate limits, JSON options, HTTP clients.
- `backend/LessonPrep.Api/Controllers/v1/` — versioned controllers (`Ai`, `Lessons`).
- `backend/LessonPrep.Api/Application/Contracts/Lessons/StandardLessonFlow.cs` — static default preset.
- `backend/LessonPrep.Api/Helpers/documents/` — upload validation, CSV/PDF extraction, OCR orchestration.
- `backend/LessonPrep.Api/Infrastructure/OCR/PaddleOcrClient.cs` — HTTP client for the OCR service.
- `backend/LessonPrep.Api/Infrastructure/Ai/` — four provider adapters behind `IAiProvider`.
- `backend/LessonPrep.Api/Helpers/prompts/LessonPrompt.cs` and `Helpers/schemas/LessonSchema.cs` — shared lesson prompt and JSON schema.
- `backend/LessonPrep.Api/Application/Services/Lessons/GenerationService.cs` — snapshots, generation, validation, and SSE orchestration.
- `backend/LessonPrep.Api/Infrastructure/Security/CredentialTokenService.cs` — JWE credential token issue/open.
- `ocr-service/app/main.py` — PaddleOCR image-to-text endpoint.
- `frontend/src/App.tsx` and `frontend/src/api.ts` — UI state, credential tokens, local storage, and SSE parsing.

## PaddleOCR source checkout

The app imports `PaddleOCR` from the installed Python package specified in `ocr-service/requirements.txt`. It does not import or deploy `PaddleOCR/paddleocr/` from the repository checkout. That checkout can remain for reference; it is not a runtime component.
