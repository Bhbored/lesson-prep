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

1. ASP.NET API from `backend/LessonPrep.Api/`, using `dotnet run --launch-profile https`. It listens on `https://localhost:7132` and `http://localhost:5132`, with HTTP redirecting to HTTPS. Development loads `Crypto:TokenSecret` from the gitignored local file `appsettings.Development.json` (create it if missing). Run `dotnet dev-certs https --trust` if the development certificate is not trusted.
2. React from `frontend/`, using Vite on `localhost:5173`.

The Vite development proxy forwards `/lessonprep` to `https://localhost:7132` and accepts the local development certificate with `secure: false`. The frontend development URL remains `http://localhost:5173`. Production hosting needs its own reverse proxy or same-origin routing.

## Optional local overrides

Override configuration in a shell if needed:

```powershell
$env:Crypto__TokenSecret='<base64-32-byte-secret>'
$env:Ocr__WorkerCount='1'
$env:Frontend__Origins__0='http://localhost:5173'
dotnet run --launch-profile https
```

Generate a secret with `openssl rand -base64 32` or PowerShell:

```powershell
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$bytes = New-Object byte[] 32
$rng.GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

Do not put a production token secret in checked-in JSON. `appsettings.Development.json` is gitignored for that reason. Environment variables work directly. To use `dotnet user-secrets`, initialize the API project with `dotnet user-secrets init` first; the current project file has no `UserSecretsId`.

## Useful commands

```powershell
dotnet test backend/LessonPrep.slnx
npm test --prefix frontend
npm run typecheck --prefix frontend
npm run lint --prefix frontend
npm run build --prefix frontend
```

Set `$env:RUN_OCR_TESTS='1'` before `dotnet test` to enable the native English OCR integration test. Models initialize on the first scanned page for each language and require no network access at runtime.

The unit/component tests run with `npm test --prefix frontend`; use `npm run test:watch --prefix frontend` while editing. Live tests include credential issuance, TXT/scanned-PDF extraction, and regeneration with an empty prepared-source string. They deliberately use invalid credential tokens after extraction, so they make no paid generation requests. The external DeepSeek provider-decryption check requires a separate `CHECK_KEY_DECRYPT=1` opt-in and contacts the provider using an intentionally invalid test key.

For live tests, run the API in Production mode to check the JSON/SSE error contract. Development exception pages can produce HTML for failures. Production does not load `appsettings.Development.json`, so explicitly supply a valid test token secret. From `backend/LessonPrep.Api/`, in a separate terminal:

```powershell
$env:ASPNETCORE_ENVIRONMENT='Production'
$env:Crypto__TokenSecret='<base64-32-byte-test-secret>'
dotnet run --no-launch-profile --urls 'https://localhost:7132;http://localhost:5132'
```

Keep Vite running as usual. From the repository root, point tests through its HTTPS backend proxy; this lets Node use the HTTP Vite origin while Vite accepts the local ASP.NET certificate:

```powershell
$env:API_TEST_URL='http://localhost:5173'
npm test --prefix frontend
Remove-Item Env:API_TEST_URL
```

Alternatively, use a running API origin directly if Node trusts its HTTPS certificate. `API_TEST_URL` is an origin, without the `/lessonprep/v1.0` suffix. To include the external provider check, set `$env:CHECK_KEY_DECRYPT='1'` before running the tests and clear it afterward with `Remove-Item Env:CHECK_KEY_DECRYPT`. Stop the test API and restart with the HTTPS Development profile for normal development.

See [Frontend architecture](../architecture/frontend.md) for code organization, routes, state ownership, utilities, caching, validation, and printing.

## Browser state while developing

Custom presets, credential tokens, and the latest source/lesson snapshot live in browser local storage. Clearing site data resets them. Editing a custom preset after a preparation does not change the preparation's saved phase snapshot. The API restarts without losing the browser's preparation, because regeneration sends that snapshot back in the request. Rotating `Crypto:TokenSecret` invalidates stored tokens until keys are entered again.
