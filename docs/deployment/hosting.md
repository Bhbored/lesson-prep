# Hosting and deployment

## Services to host

Deploy three runtime pieces:

1. **React frontend:** build `frontend/dist/` with `npm ci` and `npm run build`, then serve it as static files.
2. **ASP.NET Core API:** deploy `backend/LessonPrep.Api/` on a .NET 10 compatible host.
3. **Python OCR service:** deploy `ocr-service/` on Python 3.12 with its pinned dependencies and enough memory/CPU for two PaddleOCR engines.

There is **no PostgreSQL service or database migration**. The standard preset is code-defined and each browser holds its own custom presets and latest preparation. The `PaddleOCR/paddleocr/` checkout is not a fourth service; OCR installs the published package from `ocr-service/requirements.txt`.

## Network layout

```text
Browser --HTTPS--> React static site / reverse proxy --/lessonprep--> ASP.NET API
                                                       |--> FastAPI OCR (private)
                                                       `--> AI provider APIs (outbound HTTPS)
```

Expose the frontend and ASP.NET API through HTTPS. Keep OCR private and reachable only from ASP.NET. The frontend uses relative `/lessonprep/v1.0/...` URLs. A simple deployment serves `frontend/dist/` and reverse-proxies `/lessonprep/*` to ASP.NET under one HTTPS hostname. If using separate hostnames, route browser `/lessonprep` traffic to the API and configure allowed frontend origins.

The app streams SSE through a POST `fetch` request. Configure your proxy/load balancer to allow long-lived incremental HTTP responses and disable buffering for the streaming routes. ASP.NET sets `X-Accel-Buffering: no`, but the proxy must honor its own settings. The AI HTTP client timeout is five minutes.

## ASP.NET settings

| Setting | Value |
| --- | --- |
| `Crypto__TokenSecret` | Base64-encoded 32-byte secret for issuing/opening credential tokens |
| `OcrService__BaseUrl` | Internal URL of FastAPI, for example `http://ocr-service:8001` |
| `Frontend__Origins__0` | Browser frontend origin, for example `https://lessons.example.com`; use `__1`, `__2` for more |
| `ASPNETCORE_URLS` | Bind address/port required by the host, often `http://0.0.0.0:8080` behind TLS termination |
| `ASPNETCORE_ENVIRONMENT` | `Production` for production hosting |

Mount a stable production token secret via environment variable or secret manager. Never commit production secrets. Rotating `Crypto__TokenSecret` makes existing browser-stored credential tokens unusable until each teacher enters a key again.

Optional rate-limit overrides: `RateLimits__Reads__PermitLimit`, `RateLimits__Models__PermitLimit`, `RateLimits__Generation__PermitLimit` (and matching `WindowSeconds`). Defaults are 120/30/10 requests per minute per IP.

## OCR service

From `ocr-service/` on its Python host:

```sh
python -m pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

Set `OcrService__BaseUrl` on ASP.NET to the OCR service's private address. `/health` returns `{"ready":true}` once the English, Arabic, and French engines have loaded. First startup may download model files, so allow that access or supply a suitable model cache. Do not publish OCR port 8001 to the internet.

The repository has no Dockerfiles or production manifests. Build the image/service definitions for your chosen host. Vite's development server is not a production web server.

## Release sequence

1. Create and securely store a long-lived `Crypto__TokenSecret` (base64 32 bytes). Provide it via secret manager or environment variable.
2. Deploy OCR privately and wait for `/health` to report readiness.
3. Deploy ASP.NET with the token secret, OCR URL, allowed frontend origins, and bind URL.
4. Build and publish `frontend/dist/`; route `/lessonprep` to ASP.NET with streaming preserved.
5. Verify API `/health`, `GET /lessonprep/v1.0/LessonFlowPresets`, a provider model lookup with a real test key, and a scanned PDF through the full proxy path.

## Browser data and public access

The latest normalized source text and completed lessons are kept in that browser's local storage. Clearing the browser profile loses them; there is no server backup or cross-device sync. Users on a shared computer should use separate browser profiles.

This is an account-free MVP. The API has no user authentication. Fixed-window IP rate limits exist for reads, model listing, and generation, but they are not a substitute for auth or per-user quotas. Add those controls before exposing generation to the public internet. OCR should remain private after hardening.
