# AI providers and streaming

Provider-specific HTTP details live behind `IAiProvider` (`Application/Contracts/Ai/IAiProvider.cs`) with one class per provider under `Infrastructure/Ai/` (`OpenAiProvider`, `GeminiProvider`, `AnthropicProvider`, `DeepSeekProvider`, plus shared `AiProviderBase`). The lesson prompt and JSON schema are provider-independent helpers in `Helpers/prompts/LessonPrompt.cs` and `Helpers/schemas/LessonSchema.cs`. Each adapter translates that contract to the provider's API. Providers are identified by the `AiProvider` enum (`openAi`, `gemini`, `anthropic`, `deepSeek` in JSON).

## Current providers

| Provider | Model discovery | Lesson response |
| --- | --- | --- |
| OpenAI | `GET /v1/models`; currently filters for eligible GPT/o-series text models | Responses API with strict JSON Schema and text delta events |
| Gemini | Paged `GET /v1beta/models`; filters for generation-capable text models | `streamGenerateContent` with JSON response schema |
| Anthropic | Paged `GET /v1/models`; currently keeps Claude model IDs | Messages API with JSON schema output and content deltas |
| DeepSeek | `GET /models`; currently keeps `deepseek-` IDs | Responses API with JSON schema output and text delta events |

The model list is fetched live when the teacher loads or refreshes the model selection (`POST /lessonprep/v1.0/Ai/providers/{provider}/models` with `X-Provider-Token`). Generation checks the selected model against a fresh provider model list. If it has disappeared, generation fails and asks the teacher to choose a current model. Eligibility filtering is provider-specific because the provider model APIs expose different capability information.

All adapters implement the same interface for model listing, streamed structured lesson JSON, long-source chunk summaries, tool schema translation, and tool-call parsing. Function tools are a shared future-facing contract; the current lesson workflow does not execute application tools.

## Validation and variants

One shared prompt identifies uploaded text as source material and lesson settings as configuration. It asks the provider to stay grounded in the source and return the lesson schema. The server validates required text and arrays, requested class/duration, phase count/name/order, and exact per-phase durations before saving or emitting a completed variant (`Application/Validators/LessonValidator.cs`). Invalid structured output gets one corrective retry, then the request fails.

The API generates alternatives sequentially and gives later calls the earlier lesson approaches so the outputs can differ. Each validated variant is sent to React with provider ID and model ID; React saves the latest round in browser storage. Credentials are never part of a variant.

## SSE events

The frontend submits a streaming `fetch` POST because requests include multipart uploads or a JSON regeneration body with a credential token. The API emits:

- `status`: extraction, source preparation, generation, retry, or current variant.
- `preparation`: preparation ID, extracted source text, and phase snapshot for browser storage.
- `source_prepared`: optional bounded summary of long material for browser storage and later regeneration.
- `text_delta`: provisional readable text extracted from the provider's structured JSON stream.
- `variant_ready`: a complete validated lesson alternative, which React stores locally.
- `complete`: the generation round finished.
- `error`: safe user-facing error when generation fails after streaming begins.

Provisional deltas are not treated as a lesson result. React clears the draft on a failed or cancelled stream; alternatives already validated and saved remain accessible. Reverse proxies must preserve incremental responses for SSE to appear live.
