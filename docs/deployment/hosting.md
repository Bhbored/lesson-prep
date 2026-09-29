# Hosting and deployment

## Services to host

Deploy two runtime pieces:

1. **React frontend:** build `frontend/dist/` with `npm ci` and `npm run build`, then serve it as static files.
2. **ASP.NET Core API:** deploy `backend/LessonPrep.Api/` on a .NET 10 compatible host.

There is **no PostgreSQL service or database migration**. The standard preset is code-defined and each browser holds its own custom presets and latest preparation. OCR models and native libraries are supplied by NuGet; no Python service or source checkout is deployed.

## Railway API + Cloudflare frontend

This is the simplest supported split: Railway runs the Linux x64 API container, and Cloudflare Pages serves the Vite build. Browser requests go directly to the Railway HTTPS API, so no extra frontend proxy or Worker code is required. Railway's [ASP.NET guide](https://docs.railway.com/guides/aspnet-core) requires a Dockerfile; one is included at `backend/LessonPrep.Api/Dockerfile` with the native OCR libraries and a non-root runtime user.

### Railway

1. Create a service from this repository and set its root directory to `/backend/LessonPrep.Api`. The Dockerfile builds from this directory, not the repository root.
2. Select `/backend/LessonPrep.Api/railway.json` as the config file if Railway does not discover it automatically. It configures Docker builds, `/health/live` health checks, and bounded restart attempts. Keep the start command empty to use the Dockerfile entrypoint.
3. Set these service variables:

   | Variable | Value |
   | --- | --- |
   | `Crypto__TokenSecret` | A stable, generated base64 32-byte secret |
   | `Frontend__Origins__0` | Your exact Cloudflare frontend HTTPS origin, without a trailing slash |
   | `ReverseProxy__TrustAll` | `true`, for Railway-managed HTTP ingress only |
   | `ReverseProxy__ClientIpHeader` | `X-Real-IP` |
   | `Ocr__WorkerCount` | `1` initially |

4. Generate a Railway public domain. The container listens on `0.0.0.0:$PORT` (8080 outside Railway); Railway supplies the port and handles public TLS. No Kestrel certificate or `ASPNETCORE_URLS` override is needed for this container. Production mode is set in the image.
5. Use the domain's HTTPS URL for every API request. Check `/health/live`, the preset endpoint, and scanned-PDF extraction after deployment. OCR is lazy, so a healthy process alone does not verify native inference or memory capacity.

Railway documents [`X-Real-IP` and `X-Forwarded-Proto`](https://docs.railway.com/networking/public-networking/specs-and-limits) at its edge. Only use `TrustAll=true` where the managed ingress overwrites these headers and the application port has no direct public route. Do not expose a separate TCP proxy to Kestrel. Leave `ASPNETCORE_FORWARDEDHEADERS_ENABLED` unset: the application configures its middleware explicitly.

### Cloudflare Pages

1. Connect the repository, set root directory `frontend`, build command `npm ci && npm run build`, and output directory `dist`. Use a Node version supported by the frontend (22.12+ or a compatible newer version).
2. Set the build variable `VITE_API_URL=https://<your-api-domain>/lessonprep/v1.0` and deploy. This is a public URL, not a secret. Rebuild when it changes; Vite's local development proxy is not deployed.
3. Add the resulting Pages/custom-domain origin to Railway's `Frontend__Origins__0`. Add other intentional origins with `__1`, `__2`, etc. Production and preview origins differ; allow specific previews only when needed.
4. Test reloading `/prepare`, `/presets`, `/settings`, and `/results`. Pages supplies [SPA fallback](https://developers.cloudflare.com/pages/configuration/serving-pages/) when the output contains no top-level `404.html`; this project does not add one.

Cloudflare Workers Static Assets can also host the frontend with [single-page-application routing](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/). Ordinary Pages Functions/Workers do not run this ASP.NET process and its native OCR libraries. Cloudflare [Containers](https://developers.cloudflare.com/containers/) are a possible API alternative, but require an additional Worker/container setup and verification of OCR resources. Railway remains the simpler API target for this repository.

Initially use the Railway HTTPS API domain directly, without putting Cloudflare's proxy in front of the API. This keeps one trusted ingress hop and avoids an additional set of upload/streaming constraints. Cloudflare still hosts the frontend. If adding another proxy later, verify its client-IP handling and streaming/upload limits before changing the one-hop trust policy.

## Network layout

```text
Browser --HTTPS--> React static site / reverse proxy --/lessonprep--> ASP.NET API
                                                       `--> AI provider APIs (outbound HTTPS)
```

Expose the frontend and ASP.NET API through HTTPS. The default frontend API base is relative `/lessonprep/v1.0`. For the Railway/Cloudflare split, set the absolute `VITE_API_URL` above and configure CORS. Alternatively, serve `frontend/dist/` and reverse-proxy `/lessonprep/*` to ASP.NET under one HTTPS hostname.

Configure SPA fallback routing: `/prepare`, `/presets`, `/settings`, `/results`, and unknown client paths must serve `index.html` when no static file exists. For nginx, use `try_files $uri $uri/ /index.html;` in the frontend location and a separate `/lessonprep/` proxy location. Never rewrite API requests to the SPA. An optional build-time `VITE_API_URL` overrides the default `/lessonprep/v1.0` API base URL.

The app streams SSE through a POST `fetch` request. Configure your proxy/load balancer to allow long-lived incremental HTTP responses and disable buffering for the streaming routes. ASP.NET sets `X-Accel-Buffering: no`, but the proxy must honor its own settings. The AI HTTP client timeout is five minutes.

Forwarded-header middleware runs first, before logging, HSTS, HTTPS redirection, and rate limiting. It consumes one hop of `X-Forwarded-Proto` and the configured client-IP header; it does not accept forwarded host headers. By default only framework loopback proxies are trusted. For a proxy with stable addresses, set `ReverseProxy__KnownProxies__0` to its IP, or `ReverseProxy__KnownNetworks__0` to its CIDR range, keeping `TrustAll=false`. Unknown proxies cannot supply the scheme or client IP. For managed Railway ingress with changing addresses, explicitly opt into `TrustAll=true` as above.

HTTPS redirection remains enabled for product routes (port 443 in Production), and HSTS remains enabled outside Development. `/health` and `/health/live` accept internal HTTP so platform probes do not redirect. Local HTTPS launch profiles and Vite behavior are unchanged.

## ASP.NET settings

| Setting | Value |
| --- | --- |
| `Crypto__TokenSecret` | Base64-encoded 32-byte secret for issuing/opening credential tokens |
| `Ocr__WorkerCount` | Positive native worker count per language; default `1` |
| `Frontend__Origins__0` | Browser frontend origin, for example `https://lessons.example.com`; use `__1`, `__2` for more |
| `ASPNETCORE_URLS` | Bind address/port for non-container hosting. The Docker entrypoint binds HTTP using `PORT`; configure proxy trust for TLS termination. |
| `ASPNETCORE_ENVIRONMENT` | `Production` for production hosting |
| `ReverseProxy__TrustAll` | Default `false`; Railway managed ingress opts into `true` |
| `ReverseProxy__ClientIpHeader` | Default `X-Forwarded-For`; Railway uses `X-Real-IP` |
| `ReverseProxy__KnownProxies__0` / `KnownNetworks__0` | Additional trusted proxy IPs/CIDRs when not trusting managed ingress universally |

Mount a stable production token secret via environment variable or secret manager. Never commit production secrets. Rotating `Crypto__TokenSecret` makes existing browser-stored credential tokens unusable until each teacher enters a key again.

Optional rate-limit overrides: `RateLimits__Reads__PermitLimit`, `RateLimits__Models__PermitLimit`, `RateLimits__Generation__PermitLimit` (and matching `WindowSeconds`). Defaults are 120/30/10 requests per minute per IP.

## Native OCR deployment

OCR runs in the API process with embedded English, Arabic, and Latin PP-OCRv5 models. Engines initialize on first use; runtime network access and a model cache are unnecessary. Provision CPU and memory for all three languages; additional workers duplicate model instances.

Publish for the actual x64 host, for example:

```sh
dotnet publish backend/LessonPrep.Api -c Release -r linux-x64 --self-contained false
```

Use a glibc-based Debian/Ubuntu .NET 10 image, rather than Alpine. Linux uses an OpenCV 4.11 headless mini runtime, avoiding GTK/FFmpeg/Tesseract dependencies; Paddle needs `libgomp1`. Run `ldd libOpenCvSharpExtern.so` and `ldd libpaddle_inference_c.so` in the publish directory and resolve any missing libraries. Verify scanned-page recognition on the actual image and measure the published artifact when sizing deployments; native libraries and embedded models make it large.

The included Dockerfile uses .NET 10 on Ubuntu Noble with OpenMP (`libgomp1`). Its `.dockerignore` excludes development secrets, environment files, certificates, and build outputs; the project also excludes `appsettings.Development.json` from all publish output. Build locally with `docker build --platform linux/amd64 -t lessonprep-api backend/LessonPrep.Api`. Supply the token secret at runtime, never as a build argument. Vite's development server is not a production web server.

## Release sequence

1. Create and securely store a long-lived `Crypto__TokenSecret` (base64 32 bytes). Provide it via secret manager or environment variable.
2. Deploy ASP.NET with the token secret, allowed frontend origins, worker count, and bind URL.
3. Build and publish `frontend/dist/`; route `/lessonprep` to ASP.NET with streaming preserved.
4. Verify API `/health`, `GET /lessonprep/v1.0/LessonFlowPresets`, a provider model lookup with a real test key, and a scanned PDF through the full proxy path.

`/health/live` is also available. Both health routes report liveness only. Swagger is currently available in Production as well as Development; decide its exposure at the deployment boundary. Seq logging is configured in the base app settings but is not a required third application runtime.

## Browser data and public access

The latest normalized source text and completed lessons are kept in that browser's local storage. Clearing the browser profile loses them; there is no server backup or cross-device sync. Users on a shared computer should use separate browser profiles.

This is an account-free MVP. The API has no user authentication. Fixed-window IP rate limits exist for reads, model listing, and generation, but they are not a substitute for auth or per-user quotas. Add those controls before exposing generation to the public internet.
