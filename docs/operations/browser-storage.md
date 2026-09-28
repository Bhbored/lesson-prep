# Browser storage and preparation snapshots

LessonPrep does not use a database. The API is stateless between requests. It processes uploads in memory, returns bounded extracted text and validated lesson alternatives over SSE, and does not retain preparations on the server.

## What is stored

| Location | Data | Lifetime |
| --- | --- | --- |
| Code (`StandardLessonFlow.cs`) | Exact Standard 45-Minute Lesson preset | Until the app code changes |
| Browser local storage | Custom lesson flow presets | Until the browser profile clears site data |
| Browser local storage | Credential tokens and selected provider/model | Until removed or site data is cleared |
| Browser local storage | Latest preparation: class, duration, source language, ordered phase snapshot, bounded normalized source, optional prepared summary, and latest validated variants | Until replaced by a new preparation or site data is cleared |

The original PDF/TXT/CSV files are not saved by ASP.NET. After extraction, the `preparation` SSE event includes the normalized source and the exact phases used; React saves them as its local snapshot. The snapshot stays independent of later edits to a custom preset. For long source material, `source_prepared` supplies a bounded summary so regeneration can reuse it.

## Regeneration

React posts the saved source and phase snapshot to `POST /lessonprep/v1.0/LessonPreparations/regenerate` along with the current credential token, selected model, count, and next round number. ASP.NET validates the snapshot bounds and flow, decrypts the token in memory, generates new alternatives, and streams them back. React keeps only the latest round of alternatives in local storage to limit space use.

This design supports reloads in the same browser. It does not synchronize between browsers or devices and does not recover data after browser storage is cleared. Local storage has browser-dependent capacity; very large or numerous preparations would require a different storage strategy. The current UI keeps one bounded preparation.

## API consequence

There is no preparation read endpoint. A preparation ID is only a local identifier for the user's current browser snapshot and SSE round. There are no EF Core migrations, database connection strings, or PostgreSQL runtime requirements.
