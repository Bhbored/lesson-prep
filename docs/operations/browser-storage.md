# Browser storage and preparation snapshots

LessonPrep does not use a database. The API is stateless between requests. It processes uploads in memory, returns bounded extracted text and validated lesson alternatives over SSE, and does not retain preparations on the server.

## What is stored

| Location | Data | Lifetime |
| --- | --- | --- |
| Code (`Application/Contracts/Lessons/StandardLessonFlow.cs`) | Exact Standard 45-Minute Lesson preset | Until the app code changes |
| Browser local storage | Custom lesson flow presets | Until the browser profile clears site data |
| Browser local storage | Credential tokens and selected provider/model | Until removed or site data is cleared |
| Browser local storage | Latest preparation: class, duration, source language, session count, material notes, ordered phase snapshot, bounded normalized source, optional prepared summary, and latest validated variants (each with sessions) | Until replaced by a new preparation or site data is cleared |
| Browser memory | Uploaded files, preparation form values, unsaved preset drafts, plaintext key-input drafts, current alternative/session selection, provisional text, session-tool sheet state, query cache | Survives route changes; cleared on reload/application teardown |

The original PDF/TXT/CSV files are not saved by ASP.NET. After extraction, the `preparation` SSE event includes the normalized source, session count, material notes, and the exact phases used; React saves them as its local snapshot. The snapshot stays independent of later edits to a custom preset. For long source material, `source_prepared` supplies a bounded summary so regeneration can reuse it. Session-tool output (worksheet / quiz / game) stays in memory unless the teacher downloads HTML or PDF; it is not written to `lessonprep.lastPreparation`.

Starting a valid new lesson clears the previous preparation and results in memory and stores `null` under `lessonprep.lastPreparation`. Incoming snapshots and validated sessions then replace that value. A failed new request cannot restore the old lesson on reload. The Generate button is disabled only during an active request; missing or invalid form values are reported on click and do not clear saved results. The client finishes on the validated `complete` event without waiting for the network connection to close.

## Regeneration

React posts the saved source and phase snapshot to `POST /lessonprep/v1.0/LessonPreparations/regenerate` along with the current credential token, selected model, count, and next round number. ASP.NET validates the snapshot bounds and flow, decrypts the token in memory, generates new alternatives and sessions, and streams them back. `preparedSourceText: ""` is valid when no prepared summary exists. React keeps the previous round until the first validated `session_ready` in the new round arrives, then keeps only the new round in local storage. Errors or cancellation retain validated alternatives, including partial new rounds.

This design supports reloads in the same browser. It does not synchronize between browsers or devices and does not recover data after browser storage is cleared. Local storage has browser-dependent capacity; very large or numerous preparations would require a different storage strategy. The current UI keeps one bounded preparation.

## Storage keys, migration, and recovery

The utility is [`frontend/src/app/shared/storage/storage.ts`](../../frontend/src/app/shared/storage/storage.ts). It keeps the existing keys:

| Key | Value |
| --- | --- |
| `lessonprep.settings` | Display language, provider, and per-provider credential tokens/model IDs |
| `lessonprep.presets` | Saved custom presets; default presets are fetched from the API |
| `lessonprep.lastPreparation` | Latest snapshot (including `sessionCount` and `materialNote`) plus validated variants/sessions |

Zod validates loaded values. Settings migration maps legacy `openai`/`deepseek` aliases to `openAi`/`deepSeek`, ignores unknown providers, and keeps only strings matching the compact credential-token format. Old plaintext API keys are not reused and must be entered again. Token-format validation in the browser does not establish that a token decrypts or that the provider key works.

Unreadable JSON or schema-invalid saved preparations/presets fall back to usable defaults and show a warning without rewriting the original storage entry on load. Before a later intentional save replaces that damaged entry, the utility writes a copy under `<original-key>.recovery.<timestamp>`. If recovery or saving fails, a warning is shown and current edits remain in memory. Recovery copies have no automatic cleanup or restore UI; inspect/export them through browser developer tools if needed. They can contain source material or credential tokens, so treat them like the original saved data.

Settings and preset writes happen on explicit updates; preparation writes happen when a snapshot, summary, or validated session changes. Provisional text, uploaded files, and session-tool payloads are never written. A quota or storage-access failure does not crash the application and does not make in-memory changes survive a reload.

## API consequence

There is no preparation read endpoint. A preparation ID is only a local identifier for the user's current browser snapshot and SSE round. There are no EF Core migrations, database connection strings, or PostgreSQL runtime requirements.
