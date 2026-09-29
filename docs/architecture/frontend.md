# Frontend architecture

LessonPrep uses React, TypeScript, Vite, React Router, TanStack Query, Zod, and Tailwind CSS v4 through the first-party Vite plugin. TypeScript strict checking is enabled; `@/` resolves to `frontend/src/` in TypeScript, Vite, and Vitest.

## Structure and routes

| Location under `frontend/src/` | Responsibility |
| --- | --- |
| `app/App.tsx` | Composes the router, root providers, and routes |
| `app/features/preparation/` | Upload form, request schemas/adapters, generation reducer |
| `app/features/presets/` | Lesson-flow list and phase editor |
| `app/features/settings/` | Display language, credentials, provider/model selection |
| `app/features/results/` | Alternative selection, lesson display, PDF downloads |
| `app/providers/` | Query client, shared alerts, settings, translations, presets, preparation state |
| `app/routes/AppRoutes.tsx` | Lazy page imports, loading fallback, redirects |
| `app/shell/` | Sidebar navigation, topbar, shared alerts, page outlet |
| `app/shared/` | Transport utilities, storage, schemas/types, translations, static data |
| `styles/` | Tailwind theme tokens, global focus and reduced-motion rules, and print/PDF CSS |
| `test/` | Vitest setup and shared fixtures |

The four routes are `/prepare`, `/presets`, `/settings`, and `/results`. `/` and unknown paths redirect to `/prepare` with history replacement. Desktop navigation uses the sidebar; below 768px, the same four destinations appear as a fixed bottom tab bar. Page padding reserves room for the bar and device safe area, and the mobile tabs follow page content in keyboard order. Production servers must provide an [SPA fallback](../deployment/hosting.md#network-layout) for direct navigation and reloads.

Root providers stay mounted across route changes. Preparation form values, uploaded files, preset-editor drafts, and key-input drafts therefore survive page navigation. Only saved settings, saved custom presets, and the latest preparation are persisted across reloads; see [Browser storage](../operations/browser-storage.md).

## Server state and credentials

The presets query uses `['presets']` and infinite freshness while the root preset provider is mounted. Model queries use `['models', provider, revision]` with five-minute freshness. The revision is an opaque in-memory counter: query keys contain neither plaintext keys nor credential tokens. Credential changes cancel and remove that provider's model queries, then change its revision. Credential issuance captures its target provider and revision so late responses cannot overwrite a newer credential change. Selected models are cleared when unavailable in a returned list.

Read queries forward TanStack Query's cancellation signal to fetch and retry a transient failure once. Validation/schema failures, credential errors, HTTP 4xx failures (including rate limits), and cancellations receive no retry. Credential issuance mutations and generation requests have no automatic retry. Window-focus refetch is disabled; inactive query data is retained for 30 minutes by default. The backend's corrective retry for invalid generated JSON is a separate behavior.

## Generation lifecycle

`app/providers/preparation.ts` owns the form and a single active `AbortController`; `features/preparation/state/generation.ts` owns reducer transitions. Starting generation navigates to Results. Additional starts are rejected while a request is active. Navigation continues the request; explicit cancellation and root-provider teardown abort it. Events from obsolete or aborted requests are ignored.

During regeneration, the previous round stays visible until the first validated `variant_ready` arrives. That event replaces the previous alternatives with the new round, and subsequent alternatives join it. Failure or cancellation preserves validated partial results. A new upload creates a new preparation rather than another round of the old one. Provisional text is cleared on variant/retry status changes, selection changes, failure, cancellation, and completion, and is never stored.

## Shared utilities and validation

- [`ApiClient.ts`](../../frontend/src/app/shared/api/ApiClient.ts) accepts an injectable fetch implementation and API base URL (default `/lessonprep/v1.0`). It forwards request options/signals, checks HTTP responses, validates JSON against a supplied Zod schema, and supports streaming requests. Errors carry `status`, `code`, and `fieldErrors`; JSON error bodies and ProblemDetails are supported. Feature `api.ts` adapters construct endpoint-specific multipart or JSON payloads.
- [`SseClient.ts`](../../frontend/src/app/shared/api/SseClient.ts) reads streaming responses, handles UTF-8/chunk boundaries, LF/CRLF and multiline data, validates known events, rejects backend errors and incomplete streams, ignores unknown event names, and cancels/releases readers during cleanup.
- [`storage.ts`](../../frontend/src/app/shared/storage/storage.ts) handles storage keys, validated reads, provider/token migrations, writes, recovery backups, and storage warnings. It exports functions rather than a class.
- [`domain.ts`](../../frontend/src/app/shared/schemas/domain.ts) defines shared Zod schemas and inferred types. Preparation request schemas live in the preparation feature. Inputs, saved data, backend responses, and known SSE payloads are validated at their boundaries.

The two transport classes perform no requests or assertions during module import and do not store credentials. Credential encryption happens exclusively in the backend; the settings adapter requests an encrypted token over HTTPS. See [Security](../operations/security.md).

## Languages, accessibility, and printing

Display language is English or Arabic; Arabic sets the document language and RTL direction. Source/output language is independently English, Arabic, or French. Tailwind utilities style the screens, including responsive and RTL layout. CSS remains for theme tokens, global focus and reduced-motion behavior, and print/PDF output; semantic class names on result elements provide print/PDF targets. The palette uses sage surfaces and a deep green action color; provider logos keep their own brand colors. The paper illustration and numbered lesson phases tie the visual style to classroom planning. Controls have labels, inline form errors, visible keyboard focus, a skip link, and reduced-motion styles.

Results displays the selected validated lesson. Export PDF downloads an A4 PDF directly using the lazily loaded `html2pdf.js` library, with the filename `result_<variantNumber>_<UTC timestamp>.pdf`. `useDownloadLesson` prevents concurrent exports and reports failures; `downloadLessonPdf` snapshots only the selected lesson and uses scoped PDF styles and page-break rules. Browser-rendered text preserves Arabic shaping and layout; the PDF contains rendered images rather than searchable text. Browser download preferences determine the destination and may still prompt for a location. Native browser printing remains supported by the print stylesheet.

## Checks

Use `npm test --prefix frontend`, `npm run typecheck --prefix frontend`, `npm run lint --prefix frontend`, and `npm run build --prefix frontend`. Tests cover transport encoding/errors, multilingual streams, cleanup/cancellation, storage migration/recovery, credential and model races, navigation persistence, generation partial results, and regeneration transitions. Live API checks require `API_TEST_URL`; external provider decryption additionally requires `CHECK_KEY_DECRYPT=1`. See [Local development](../development/local-setup.md) for setup.
