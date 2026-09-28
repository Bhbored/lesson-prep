# Configuration and limits

ASP.NET Core reads standard JSON configuration and environment variables. Environment variables use `__` to represent a nested `:` section.

| Environment variable | Purpose | Local default |
| --- | --- | --- |
| `Crypto__TokenSecret` | Base64-encoded 32-byte secret for JWE credential tokens | Dev value in `appsettings.Development.json`; empty in base `appsettings.json` |
| `OcrService__BaseUrl` | FastAPI base address | `http://localhost:8001` |
| `Frontend__Origins__0` | First allowed browser origin (use `__1`, `__2`, etc. for more) | `http://localhost:5173` |
| `ASPNETCORE_ENVIRONMENT` | ASP.NET environment | `Development` from local launch profile |
| `ASPNETCORE_URLS` | Kestrel bind URL(s) when set by the host | launch profile uses `http://localhost:5132` |

For production, set `Frontend__Origins__0=https://lessons.example.com`. For multiple origins, add `Frontend__Origins__1`, `Frontend__Origins__2`, and so on. The array comes from `Frontend:Origins` in configuration.

## Current processing limits

- 1–5 files per preparation; PDF, TXT, and CSV only.
- 20 MiB maximum per uploaded file.
- 60 PDF pages total per preparation.
- 200,000 characters maximum normalized source text.
- Sources over 80,000 characters are summarized in chunks before lesson generation; the prepared source is kept for regeneration.
- OCR input is capped at 15 MiB and 30 million pixels per page.
- At most 3 alternatives, with a bounded AI response and one retry for invalid output.
- ASP.NET request body size is set to 110 MiB to accommodate multipart overhead and multiple allowed files.
- AI HTTP timeout is five minutes; OCR HTTP timeout is two minutes.

These are application-level defaults in code. If you change them, adjust request-body, proxy, provider timeout, memory, and abuse controls together. For public use, consider lower per-user quotas after adding authentication.
