# Local development

The root [README](../../README.md) has the shortest setup sequence. This guide explains the processes and configuration.

## Prerequisites

- .NET 10 SDK for ASP.NET Core.
- Node.js and npm for React/Vite.
- Python 3.12 for `ocr-service/`; its PaddlePaddle/PaddleOCR versions are pinned in `requirements.txt`.
- A provider API key to generate real lessons. The API smoke script can check upload and SSE without a paid AI request.

No PostgreSQL installation, schema, migration, or connection string is needed.

## Start order

Start these processes in separate terminals:

1. OCR service from `ocr-service/`, listening on `127.0.0.1:8001`.
2. ASP.NET API from `backend/LessonPrep.Api/`, listening on `localhost:5132` under the HTTP launch profile. Development loads `Crypto:TokenSecret` from the gitignored local file `appsettings.Development.json` (create it if missing).
3. React from `frontend/`, using Vite on `localhost:5173`.

The Vite development proxy forwards `/lessonprep` to ASP.NET. Production hosting needs its own reverse proxy or same-origin routing.

## Optional local overrides

Override configuration in a shell if needed:

```powershell
$env:Crypto__TokenSecret='<base64-32-byte-secret>'
$env:OcrService__BaseUrl='http://localhost:8001'
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
npm run build --prefix frontend
node scripts/api-smoke.mjs
```

The API smoke test requires only a running API. Set `$env:CHECK_PDF='1'` and start OCR to include a mixed digital/scanned PDF. `ocr-service/smoke_test.py` calls both language engines against the running OCR service.

## Browser state while developing

Custom presets, credential tokens, and the latest source/lesson snapshot live in browser local storage. Clearing site data resets them. Editing a custom preset after a preparation does not change the preparation's saved phase snapshot. The API restarts without losing the browser's preparation, because regeneration sends that snapshot back in the request. Rotating `Crypto:TokenSecret` invalidates stored tokens until keys are entered again.
