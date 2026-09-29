# Hosting the API on Render

Render builds the ASP.NET Core API image from this GitHub repository. The service runs only the backend: PaddleOCR and its native libraries are included in the image, and no database or Python service is needed. Browser settings, custom lesson flows, and the latest results remain in each browser.

## Deploy from GitHub

In Render, create a **Web Service** from the connected GitHub repository and select the branch to deploy. Set **Language** to **Docker** and **Root Directory** to `backend/LessonPrep.Api`. Set **Dockerfile Path** to `./Dockerfile` and **Docker Build Context** to `.` if those fields appear. Leave **Docker Command** empty so the [Dockerfile](../../backend/LessonPrep.Api/Dockerfile) entrypoint runs. Render's [Docker guide](https://render.com/docs/docker) and [monorepo guide](https://render.com/docs/monorepo-support) describe these dashboard fields. With the root directory set, frontend changes do not trigger backend rebuilds.

Set **Health Check Path** to `/health/live` under the service's Health Checks settings. Add the environment variables below in Render's **Environment** page before deploying. Enter `Frontend__Origins__0` as the browser client's **exact HTTPS origin**, without a path or trailing slash (for example `https://lessons.example.com`). For another intentional origin, add `Frontend__Origins__1`. CORS is an access rule for browsers, not API authentication.

Choose a compute plan with enough memory for native OCR inference. Render's [compute plans](https://render.com/docs/compute-plans) currently list 512 MB for Free and 2 GB for `1c-2g`. The embedded OCR models make 512 MB a poor production assumption; start with at least 2 GB and measure memory and scanned-PDF extraction on the deployed instance. More OCR workers or simultaneous scanned documents increase memory use.

| Environment variable | Value |
| --- | --- |
| `Crypto__TokenSecret` | Base64-encoded 32-byte secret; you can paste the existing value from local `appsettings.Development.json` into Render's secret field |
| `Frontend__Origins__0` | Exact HTTPS origin of the browser client |
| `ReverseProxy__TrustAll` | `true` only behind Render's managed web-service ingress |
| `ReverseProxy__ClientIpHeader` | `CF-Connecting-IP` on Render's public web service |
| `Ocr__WorkerCount` | `1` initially |
| `PORT` | Render supplies `10000` by default; the image uses that as its local fallback |

Keep the token secret across deploys and instances. Rotating it invalidates browser-stored credential tokens, so users must enter their provider keys again. Do not commit production secrets or use a Docker build argument for them.

## Network and request handling

The container listens on `0.0.0.0:$PORT` over HTTP as a non-root user. Render terminates public HTTPS and forwards HTTP to the container. The app processes one trusted hop of `X-Forwarded-Proto` and the configured client-IP header before HTTPS redirection and IP rate limiting. Set `ReverseProxy__ClientIpHeader=CF-Connecting-IP`, which Render's [public-ingress guidance](https://render.com/articles/host-pocketbase-on-render) describes as set by its Cloudflare edge. Keep `ReverseProxy__TrustAll=true` only while Kestrel is reachable solely through Render's ingress. Leave `ASPNETCORE_FORWARDEDHEADERS_ENABLED` unset because the app configures forwarded headers itself.

Product routes redirect HTTP to HTTPS, while `/health` and `/health/live` accept internal HTTP probes. The health endpoints report process liveness, not OCR readiness. Render's [web-service docs](https://render.com/docs/web-services) describe the TLS termination and `PORT` contract; its [health-check docs](https://render.com/docs/health-checks) describe HTTP checks.

The browser client must call `https://<your-service>.onrender.com/lessonprep/v1.0` (or the corresponding custom domain). If it is hosted on another origin, configure that exact origin in `Frontend__Origins__0`. The API streams generation results with SSE over a POST response. Verify that any additional CDN or proxy preserves streaming and accepts the documented upload sizes. This backend deployment does not build or host the frontend.

## Verify after deployment

1. Open `https://<your-service>.onrender.com/health/live`; expect HTTP 200 and `{"status":"ok"}`.
2. Call `GET /lessonprep/v1.0/LessonFlowPresets` over HTTPS and confirm the standard flow appears.
3. From the intended browser origin, check a credential issuance request and model lookup to verify CORS, provider outbound HTTPS, and the stable token secret.
4. Extract a TXT file and a scanned PDF through the deployed API. OCR initializes lazily, so the health check cannot establish that native inference fits the chosen compute plan.
5. Confirm HTTPS API requests do not redirect repeatedly, generation streams incrementally, and a failed or cancelled stream is logged without exposing source material or provider keys.

Use `docker build --platform linux/amd64 -t lessonprep-api backend/LessonPrep.Api` for a local image build. A local run needs `Crypto__TokenSecret`; publish the chosen port, such as `-p 10000:10000`. The image uses a glibc-based .NET 10 Ubuntu Noble runtime plus `libgomp1` for Paddle. The `.dockerignore` excludes local secrets, certificates, and build outputs. Production logging goes to standard output, which Render captures.

The API currently has no user accounts or per-user quotas. Per-IP fixed-window rate limits are process-local, so multiple Render instances do not share counters. Review [security](../operations/security.md) before broad public use.
