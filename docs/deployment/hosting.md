# Hosting and deployment

## Services to host

Deploy two runtime pieces:

1. **React frontend:** build `frontend/dist/` with `npm ci` and `npm run build`, then serve it as static files.
2. **ASP.NET Core API:** deploy `backend/LessonPrep.Api/` on a .NET 10 compatible host.

There is **no PostgreSQL service or database migration**. The standard preset is code-defined and each browser holds its own custom presets and latest preparation. The `PaddleOCR/` checkout is reference material; OCR models and native libraries are supplied by NuGet.

## Network layout

```text
Browser --HTTPS--> React static site / reverse proxy --/lessonprep--> ASP.NET API
                                                       `--> AI provider APIs (outbound HTTPS)
```

Expose the frontend and ASP.NET API through HTTPS. The frontend uses relative `/lessonprep/v1.0/...` URLs. A simple deployment serves `frontend/dist/` and reverse-proxies `/lessonprep/*` to ASP.NET under one HTTPS hostname. If using separate hostnames, route browser `/lessonprep` traffic to the API and configure allowed frontend origins.

Configure SPA fallback routing: `/prepare`, `/presets`, `/settings`, `/results`, and unknown client paths must serve `index.html` when no static file exists. For nginx, use `try_files $uri $uri/ /index.html;` in the frontend location and a separate `/lessonprep/` proxy location. Never rewrite API requests to the SPA. An optional build-time `VITE_API_URL` overrides the default `/lessonprep/v1.0` API base URL.

The app streams SSE through a POST `fetch` request. Configure your proxy/load balancer to allow long-lived incremental HTTP responses and disable buffering for the streaming routes. ASP.NET sets `X-Accel-Buffering: no`, but the proxy must honor its own settings. The AI HTTP client timeout is five minutes.

## ASP.NET settings

| Setting | Value |
| --- | --- |
| `Crypto__TokenSecret` | Base64-encoded 32-byte secret for issuing/opening credential tokens |
| `Ocr__WorkerCount` | Positive native worker count per language; default `1` |
| `Frontend__Origins__0` | Browser frontend origin, for example `https://lessons.example.com`; use `__1`, `__2` for more |
| `ASPNETCORE_URLS` | Bind address/port required by the host, often `http://0.0.0.0:8080` behind TLS termination |
| `ASPNETCORE_ENVIRONMENT` | `Production` for production hosting |

Mount a stable production token secret via environment variable or secret manager. Never commit production secrets. Rotating `Crypto__TokenSecret` makes existing browser-stored credential tokens unusable until each teacher enters a key again.

Optional rate-limit overrides: `RateLimits__Reads__PermitLimit`, `RateLimits__Models__PermitLimit`, `RateLimits__Generation__PermitLimit` (and matching `WindowSeconds`). Defaults are 120/30/10 requests per minute per IP.

## Native OCR deployment

OCR runs in the API process with embedded English, Arabic, and Latin PP-OCRv5 models. Engines initialize on first use; runtime network access and a model cache are unnecessary. Provision CPU and memory for all three languages; additional workers duplicate model instances.

Publish for the actual x64 host, for example:

```sh
dotnet publish backend/LessonPrep.Api -c Release -r linux-x64 --self-contained false
```

Use a glibc-based Debian/Ubuntu .NET 10 image, rather than Alpine. OpenCvSharp requires GTK3, GLib, FreeType, HarfBuzz, and their dependencies even for headless OCR. Install matching distribution packages (for example `libgtk-3-0` and `libharfbuzz0b` on Debian 12). Run `ldd libOpenCvSharpExtern.so` and `ldd libpaddle_inference_c.so` in the publish directory and resolve any missing libraries. Verify scanned-page recognition on the actual image. The verified Linux publish is about 850 MiB with the pinned models and native libraries. Measure the final artifact when sizing deployments.

The repository has no Dockerfiles or production manifests. Build the image/service definitions for your chosen host. Vite's development server is not a production web server.

## Release sequence

1. Create and securely store a long-lived `Crypto__TokenSecret` (base64 32 bytes). Provide it via secret manager or environment variable.
2. Deploy ASP.NET with the token secret, allowed frontend origins, worker count, and bind URL.
3. Build and publish `frontend/dist/`; route `/lessonprep` to ASP.NET with streaming preserved.
4. Verify API `/health`, `GET /lessonprep/v1.0/LessonFlowPresets`, a provider model lookup with a real test key, and a scanned PDF through the full proxy path.

## Browser data and public access

The latest normalized source text and completed lessons are kept in that browser's local storage. Clearing the browser profile loses them; there is no server backup or cross-device sync. Users on a shared computer should use separate browser profiles.

This is an account-free MVP. The API has no user authentication. Fixed-window IP rate limits exist for reads, model listing, and generation, but they are not a substitute for auth or per-user quotas. Add those controls before exposing generation to the public internet.
