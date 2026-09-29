# Local development

The root [README](../../README.md) has the shortest setup sequence. This guide explains the processes and configuration.

## Prerequisites

- .NET 10 SDK for ASP.NET Core.
- Node.js and npm for React/Vite.
- Windows x64 or Linux x64 for the embedded PaddleOCR native runtime. NuGet restore downloads models and native libraries.
- A provider API key to generate real lessons. Opt-in frontend live tests check upload and SSE without a paid AI request.

No PostgreSQL installation, schema, migration, or connection string is needed.

## Start order

Start these processes in separate terminals:

1. ASP.NET API from `backend/LessonPrep.Api/`, listening on `localhost:5132` under the HTTP launch profile. Development loads `Crypto:TokenSecret` from the gitignored local file `appsettings.Development.json` (create it if missing).
2. React from `frontend/`, using Vite on `localhost:5173`.

The Vite development proxy forwards `/lessonprep` to ASP.NET. Production hosting needs its own reverse proxy or same-origin routing.

## Optional local overrides

Override configuration in a shell if needed:

```powershell
$env:Crypto__TokenSecret='<base64-32-byte-secret>'
$env:Ocr__WorkerCount='1'
$env:Frontend__Origins__0='http://localhost:5173'
dotnet run
```

Generate a secret with `openssl rand -base64 32` or PowerShell:

```powershell
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$bytes = New-Object byte[] 32
$rng.GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

Do not put a production token secret in checked-in JSON. `appsettings.Development.json` is gitignored for that reason. Prefer `dotnet user-secrets` or environment variables for shared machines.

## Useful commands

```powershell
dotnet test backend/LessonPrep.slnx
npm test --prefix frontend
npm run typecheck --prefix frontend
npm run lint --prefix frontend
npm run build --prefix frontend
```

Set `$env:RUN_OCR_TESTS='1'` before `dotnet test` to enable the native English OCR integration test. Models initialize on the first scanned page for each language and require no network access at runtime.

The unit/component tests run with `npm test --prefix frontend`; use `npm run test:watch --prefix frontend` while editing. To also exercise the actual API (including real scanned-PDF OCR), set `$env:API_TEST_URL='http://127.0.0.1:5199'` to a running API and run the same command. Use an API started with `ASPNETCORE_ENVIRONMENT=Production` and a valid local token secret to verify the JSON/SSE error contract. The integration check deliberately uses invalid credential tokens after extraction, so it makes no paid AI requests. The external DeepSeek provider-decryption check requires a separate `$env:CHECK_KEY_DECRYPT='1'` opt-in. Clear both variables afterward to return to unit/component tests.

Product code lives under `frontend/src/app/`: four routed features own pages, components, hooks, schemas, and API adapters; root providers own persistent session state; shell components own navigation and shared alerts. `@/` resolves to `src/` in TypeScript, Vite, and Vitest. TanStack Query caches presets for the session and model lists for five minutes using provider and opaque credential revision keys. Zod validates storage, inputs, responses, and known SSE events. Uploaded files and unsaved drafts remain in memory; generation continues across navigation until cancellation or app teardown. Invalid stored data is preserved for recovery and reported in the UI.

## Browser state while developing

Custom presets, credential tokens, and the latest source/lesson snapshot live in browser local storage. Clearing site data resets them. Editing a custom preset after a preparation does not change the preparation's saved phase snapshot. The API restarts without losing the browser's preparation, because regeneration sends that snapshot back in the request. Rotating `Crypto:TokenSecret` invalidates stored tokens until keys are entered again.
