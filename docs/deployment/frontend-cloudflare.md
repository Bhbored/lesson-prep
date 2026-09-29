# Hosting the frontend on Cloudflare Pages

The React app is a static Vite build. Deploy it with **Wrangler** to Cloudflare Pages and point it at the Render API using **`VITE_API_URL`**.

## Before you deploy

1. Backend is live on Render (see [Hosting the API on Render](hosting.md)).
2. You know the API base URL, for example `https://lessonprep-api.onrender.com/lessonprep/v1.0` (no trailing slash).
3. On Render, set **`Frontend__Origins__0`** to your Cloudflare Pages origin — the exact HTTPS URL with no path, for example `https://lessonprep-web.pages.dev` or your custom domain. Redeploy the API after changing CORS.

## One-time setup

```powershell
cd frontend
npm install
npx wrangler login
```

## Configure `VITE_API_URL`

`VITE_*` variables are **build-time only**. They are compiled into the JavaScript bundle; changing them later requires a new build.

```powershell
copy .env.example .env.production
```

Edit `.env.production`:

```env
VITE_API_URL=https://<your-render-service>.onrender.com/lessonprep/v1.0
```

Do not commit `.env.production`. Never put secrets in `VITE_*` variables.

## Build and deploy

```powershell
cd frontend
npm run build
npm run pages:deploy
```

First deploy creates the Cloudflare Pages project **`lessonprep-web`** (see `frontend/wrangler.toml`). Later deploys update the same project.

Preview locally against the built files:

```powershell
npm run pages:preview
```

## SPA routing

`frontend/public/_redirects` sends all paths to `index.html` so React Router routes (`/prepare`, `/guide`, `/settings`, etc.) work on refresh and direct links.

## Verify after deployment

1. Open the Pages URL; the app loads without console CORS errors.
2. **Settings** → paste a provider key → **Encrypt & save key** succeeds.
3. **Prepare lesson** → upload a small TXT file → generation streams.
4. If requests fail with CORS, double-check `Frontend__Origins__0` on Render matches the Pages origin exactly (scheme + host, no trailing slash).

## Optional: Git-connected Pages

Instead of `wrangler pages deploy`, you can connect the GitHub repo in the Cloudflare dashboard:

| Field | Value |
| --- | --- |
| Root directory | `frontend` |
| Build command | `npm run build` |
| Build output | `dist` |
| Environment variable | `VITE_API_URL` = your Render API URL |

Cloudflare runs the build on each push; set `VITE_API_URL` in the Pages **Settings → Environment variables** for Production (and Preview if needed).
