# LessonPrep documentation

Start here if you are new to the repository. The root [README](../README.md) is the short local setup guide; these pages explain how the pieces fit together and what to host.

## Guides

- [Architecture and request flow](architecture/overview.md) — components, responsibilities, and how a lesson request travels through the system.
- [Frontend architecture](architecture/frontend.md) — routes, providers, query caches, reusable utilities, validation, and printing.
- [API contract](architecture/api-contract.md) — endpoint payloads, JSON serialization, error responses, and streaming events.
- [Document extraction and OCR](architecture/documents-and-ocr.md) — PDF/TXT/CSV handling and where PaddleOCR runs.
- [AI providers and streaming](architecture/providers-and-streaming.md) — model discovery, shared schema, validation, and SSE.
- [Local development](development/local-setup.md) — tools, commands, configuration, and useful checks.
- [Hosting and deployment](deployment/hosting.md) — Render API container from GitHub, HTTPS/proxy trust, and deployment checks.
- [Frontend on Cloudflare Pages](deployment/frontend-cloudflare.md) — Wrangler deploy, `VITE_API_URL`, and CORS with Render.
- [Configuration reference](operations/configuration.md) — environment variables and application limits.
- [Browser storage and snapshots](operations/browser-storage.md) — what remains in the browser and how regeneration works.
- [Provider keys and application security](operations/security.md) — JWE credential tokens, secret rotation, and current MVP exposure.

## Which backend do I host?

Host the ASP.NET Core API, which reads scanned PDF pages with in-process PaddleOCR. Build and host the React frontend as static files, preferably behind the same HTTPS origin as the API. No database is used or hosted.

OCR models and native libraries come from NuGet. No Python service or PaddleOCR source checkout is required.

See [Hosting and deployment](deployment/hosting.md) before exposing this MVP to the internet. The current app has no user authentication or authorization.
