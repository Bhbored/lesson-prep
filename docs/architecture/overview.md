# Architecture and request flow

LessonPrep is an account-free web application with two runtime components. It has no database.

| Component | Responsibility | Reachability |
| --- | --- | --- |
| React frontend (`frontend/`) | Settings, uploads, browser-local presets/preparations, and streaming display | Public HTTPS site |
| ASP.NET Core API (`backend/LessonPrep.Api/`) | Validates requests, extracts files, runs native OCR, calls AI providers, and streams results | Public HTTPS API |

ASP.NET handles lessons, provider calls, PDF page rendering, and in-process PaddleOCR. The standard lesson preset is defined by `StandardLessonFlow.cs`; custom presets and the latest preparation live in browser local storage.

API routes are versioned under `lessonprep/v1.0/...` (see `Controllers/BaseController.cs`).

## Generation request

1. The browser posts the provider API key once to `POST /lessonprep/v1.0/Ai/credentials` over HTTPS. The API returns a JWE credential token that is stored locally.
2. The teacher uploads PDF/TXT/CSV material to `POST /lessonprep/v1.0/LessonPreparations/generate` with class, duration, phase selection, provider, model, and credential token.
3. ASP.NET parses TXT/CSV directly. For each PDF page, it reads embedded text or renders and recognizes weak-text pages in process.
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
- `backend/LessonPrep.Api/Infrastructure/OCR/PaddleOcrEngine.cs` ? singleton with lazy queues for English, Arabic, and French OCR.
- `backend/LessonPrep.Api/Infrastructure/Ai/` — four provider adapters behind `IAiProvider`.
- `backend/LessonPrep.Api/Helpers/prompts/LessonPrompt.cs` and `Helpers/schemas/LessonSchema.cs` — shared lesson prompt and JSON schema.
- `backend/LessonPrep.Api/Application/Services/Lessons/GenerationService.cs` — snapshots, generation, validation, and SSE orchestration.
- `backend/LessonPrep.Api/Infrastructure/Security/CredentialTokenService.cs` — JWE credential token issue/open.
- `frontend/src/app/App.tsx` — provider and route composition.
- `frontend/src/app/features/` — preparation, lesson flows, settings, and results pages, components, hooks, and API adapters.
- `frontend/src/app/providers/` — settings, preset drafts, preparation state, generation lifecycle, and query caching.
- `frontend/src/app/shared/api/` — schema-validated `ApiClient` and streaming `SseClient`.
- `frontend/src/styles/` — preserved global, responsive, RTL, and selected-lesson print styles.

## PaddleOCR source checkout

The app uses Sdcb.PaddleOCR and embedded PP-OCRv5 models from NuGet. The `PaddleOCR/` checkout remains reference material and is not deployed.
