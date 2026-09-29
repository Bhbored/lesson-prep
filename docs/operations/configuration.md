# Configuration and limits

ASP.NET Core reads standard JSON configuration and environment variables. Environment variables use `__` to represent a nested `:` section.

| Environment variable | Purpose | Local default |
| --- | --- | --- |
| `Crypto__TokenSecret` | Base64-encoded 32-byte secret for JWE credential tokens | Local-only `appsettings.Development.json` (gitignored); empty in base `appsettings.json` |
| `Ocr__WorkerCount` | Native OCR workers per language; positive integer | `1` |
| `Frontend__Origins__0` | First allowed browser origin (use `__1`, `__2`, etc. for more) | `http://localhost:5173` |
| `RateLimits__Reads__PermitLimit` / `WindowSeconds` | IP rate limit for general reads | `120` / `60` |
| `RateLimits__Models__PermitLimit` / `WindowSeconds` | IP rate limit for credentials + model listing | `30` / `60` |
| `RateLimits__Generation__PermitLimit` / `WindowSeconds` | IP rate limit for generate/regenerate | `10` / `60` |
| `ASPNETCORE_ENVIRONMENT` | ASP.NET environment | `Development` from local launch profile |
| `ASPNETCORE_URLS` | Kestrel bind URL(s) when set by the host | HTTPS launch profile uses `https://localhost:7132;http://localhost:5132` |
| `ReverseProxy__TrustAll` | Trust changing managed-ingress addresses; opt in only behind controlled ingress | `false` |
| `ReverseProxy__ClientIpHeader` | Client IP header consumed by forwarding middleware | `X-Forwarded-For`; Render Blueprint sets `CF-Connecting-IP` |
| `ReverseProxy__KnownProxies__0` | Additional trusted proxy IP (use `__1`, etc.) | None beyond framework loopback defaults |
| `ReverseProxy__KnownNetworks__0` | Additional trusted proxy CIDR (use `__1`, etc.) | None beyond framework defaults |
| `PORT` | Container HTTP port; Render supplies it | `10000` in the Docker entrypoint |

For production, set `Frontend__Origins__0=https://lessons.example.com`. For multiple origins, add `Frontend__Origins__1`, `Frontend__Origins__2`, and so on. The array comes from `Frontend:Origins` in configuration.

`appsettings.Development.json` is gitignored because it holds the local token secret. Create it locally (or use `dotnet user-secrets` / env vars). Do not commit production secrets.

The API resolves `CredentialTokenService` during startup and fails immediately if the secret is missing, invalid base64, or not exactly 32 bytes. Forwarded headers run before HTTPS redirection, HSTS, and rate limiting, consuming one trusted hop. Product requests redirect to HTTPS (port 443 in Production); `/health` and `/health/live` remain available for internal HTTP probes. HSTS runs outside Development. Launch profiles apply to local `dotnet run`, not a published service. See [Hosting](../deployment/hosting.md) for the Render setup. Leave `ASPNETCORE_FORWARDEDHEADERS_ENABLED` unset to avoid framework auto-configuration duplicating the explicit middleware.

## Frontend and test configuration

| Variable | Purpose | Default |
| --- | --- | --- |
| `VITE_API_URL` | Build-time API base URL, including the version prefix | `/lessonprep/v1.0` |
| `API_TEST_URL` | API origin, or Vite proxy origin, for opt-in live frontend tests | Unset; live tests skipped |
| `CHECK_KEY_DECRYPT` | Set to `1` with `API_TEST_URL` to contact DeepSeek using an intentionally invalid issued test key | Unset |
| `RUN_OCR_TESTS` | Set to `1` for the backend native OCR integration test | Unset |

`frontend/vite.config.ts` proxies `/lessonprep` to `https://localhost:7132`, accepting the ASP.NET development certificate with `secure: false`. This applies only to the local proxy; production TLS verification is controlled by the production proxy. The frontend dev server itself uses HTTP on port 5173. Never put secrets in `VITE_*` variables: their values are compiled into browser code.

Serilog writes to standard output, which Render captures. `/health` and `/health/live` return process liveness only, without initializing OCR or checking provider connectivity. Swagger is currently enabled in every environment at `/swagger`.

## Current processing limits

- 1–5 files per preparation; PDF, TXT, and CSV only.
- 20 MiB maximum per uploaded file.
- 60 PDF pages total per preparation.
- 200,000 characters maximum normalized source text.
- Lesson duration 10–240 minutes; 1–12 phases with contiguous orders, names up to 80 characters, positive durations, and a total matching the lesson duration.
- Class name up to 100 characters; model ID up to 150; generation round 1–10,000.
- Source and frontend display languages `en`, `ar`, and `fr`.
- Sources over 80,000 characters are summarized in chunks of at most 20,000 characters; each summary is at most 6,000 characters and the combined prepared source at most 60,000. An empty prepared-source string is valid and means the original source is used or summarized as needed.
- OCR input is capped at 15 MiB and 30 million pixels per page.
- At most 3 alternatives, with an AI JSON response capped at 100,000 characters and one corrective retry for invalid output. This backend retry is separate from frontend read retries; generation requests are never automatically retried by the frontend.
- AI HTTP timeout is five minutes. OCR observes request cancellation between native page runs; inference already in progress finishes before its image is released.

These are application-level defaults in code. If you change them, adjust proxy, provider timeout, memory, and abuse controls together. For public use, consider lower per-user quotas after adding authentication.
