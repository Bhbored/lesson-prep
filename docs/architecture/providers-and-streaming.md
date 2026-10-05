# AI providers and streaming

Provider-specific HTTP details live behind `IAiProvider` (`Application/Contracts/Ai/IAiProvider.cs`) with one class per provider under `Infrastructure/Ai/` (`OpenAiProvider`, `GeminiProvider`, `AnthropicProvider`, `DeepSeekProvider`, plus shared `AiProviderBase`). The lesson prompt and JSON schema are provider-independent helpers in `Helpers/prompts/LessonPrompt.cs` and `Helpers/schemas/LessonSchema.cs`. Each adapter translates that contract to the provider's API. The frontend sends `openAi`, `gemini`, `anthropic`, or `deepSeek`; backend enum serialization emits `OpenAi`, `Gemini`, `Anthropic`, or `DeepSeek` in responses. Request enum parsing accepts these names case-insensitively.

## Current providers

| Provider | Model discovery | Lesson response |
| --- | --- | --- |
| OpenAI | `GET /v1/models`; currently filters for eligible GPT/o-series text models | Responses API with strict JSON Schema and text delta events |
| Gemini | Paged `GET /v1beta/models`; filters for generation-capable text models | `streamGenerateContent` with JSON response schema |
| Anthropic | Paged `GET /v1/models`; currently keeps Claude model IDs | Messages API with JSON schema output and content deltas |
| DeepSeek | `GET /models`; currently keeps `deepseek-` IDs | Responses API with JSON schema output and text delta events |

The settings page fetches models through `POST /lessonprep/v1.0/Ai/providers/{provider}/models` with `X-Provider-Token`. TanStack Query considers a list fresh for five minutes; explicit refresh fetches it again. Caches are scoped to provider and an opaque credential revision, and are cancelled/removed on credential changes. Generation independently checks the selected model against a fresh provider model list. If it has disappeared, generation fails and asks the teacher to choose a current model. Eligibility filtering is provider-specific because the provider model APIs expose different capability information. The table describes the checked-in adapters, not a guarantee that every upstream service supports every endpoint or model.

The standard lesson flow keeps one stable preset ID and the same five durations. The backend resolves its phase names in `sourceLanguage` (English, Arabic, or French) when generation starts, so the preparation snapshot and regeneration use the selected language. The frontend translates the standard flow preview and starters; it does not rewrite the cached backend preset. Custom flow names remain user-editable and are translated by the AI according to the generation-language instruction.

All adapters implement the same interface for model listing, streamed structured lesson JSON, long-source chunk summaries, schema-constrained `GenerateJsonAsync` (session tools), tool schema translation, and tool-call parsing. Function tools remain a shared future-facing contract; the current lesson workflow does not execute application tools. Session tools use `GenerateJsonAsync` only (no SSE).

## Validation and sessions

One shared prompt identifies uploaded text as source material and lesson settings as configuration. It asks the provider to stay grounded in the source and return the lesson schema. The server validates required text and arrays, requested class/duration, phase count, nonempty translated names, and exact durations at each phase position before saving or emitting a completed session (`Application/Validators/LessonValidator.cs`). Invalid structured output gets one corrective retry, then the request fails.

The API generates alternatives sequentially. Within each alternative it generates `sessionCount` sessions (1–6), giving later sessions prior-session context and later alternatives earlier approaches so outputs can differ. Each validated session is sent to React as `session_ready` with provider ID and model ID; React groups sessions under variants and saves the latest round in browser storage. Credentials are never part of a variant.

`SessionToolService` builds prompts from the session, source text, material notes, and language (`SessionToolPrompt`), applies a class-level game design preset when `tool` is `game`, calls `GenerateJsonAsync` with the matching schema, validates output (one corrective retry), and shuffles game choice order so the correct answer is not always first. Worksheet and quiz share the exercise-set schema with different prompts.

The prompt requires lesson titles, headings, and all phase names (including custom flow names) in the selected generation language: English, Arabic, or French. Saved flow names and regeneration snapshots stay unchanged; results display the translated names returned by the provider. Validation requires nonempty phase names rather than exact equality with the original flow names. Translation accuracy and preservation of each phase's meaning are enforced by the prompt, not a language detector.

OpenAI and DeepSeek streams stop at `response.completed`; Anthropic streams stop at `message_stop`. The adapters dispose the response immediately instead of waiting for the upstream connection to close. A transport failure while reading an unfinished stream becomes a safe `provider_error`; cancellation remains cancellation. Transport failures receive no automatic generation retry, and previously validated alternatives remain available in the frontend.

## SSE events

The frontend submits a streaming `fetch` POST because requests include multipart uploads or a JSON regeneration body with a credential token. The API emits:

- `status`: extraction, source preparation, generation, current variant/session, or retry.
- `preparation`: preparation ID, extracted source text, session count, material notes, and phase snapshot for browser storage.
- `source_prepared`: optional bounded summary of long material for browser storage and later regeneration.
- `text_delta`: provisional readable text extracted from the provider's structured JSON stream (`number`, optional `session`).
- `session_ready`: a complete validated session for one alternative, which React stores under that variant.
- `complete`: the generation round finished.
- `error`: safe user-facing error when generation fails after streaming begins.

Provisional deltas are not treated as a lesson result and are never persisted. React clears the draft on variant/session/retry status changes, selection changes, errors, cancellation, and completion; sessions already validated and saved remain accessible. A regeneration keeps the previous round visible until the first new validated session arrives, then retains only the new round. Route navigation does not cancel generation; explicit cancellation and application teardown do.

The frontend `SseClient` handles split UTF-8 characters, LF/CRLF boundaries, and multiline data, ignores unknown event names, and validates known events. Malformed known events and streams that end without `complete` fail. Reader cancellation and lock release run on success, failure, and cancellation. See [API contract](api-contract.md) for event payloads and error handling. Reverse proxies must preserve incremental responses for SSE to appear live.
