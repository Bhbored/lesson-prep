# API contract

Product endpoints use `/lessonprep/v1.0`, defined by `Controllers/BaseController.cs`. Property names use camelCase. Backend enum responses use `OpenAi`, `Gemini`, `Anthropic`, and `DeepSeek`; the frontend sends the corresponding lower-camel names and accepts the backend response spelling. Source languages are `en`, `ar`, and `fr`.

## Endpoints

| Method and path | Request | Response |
| --- | --- | --- |
| `GET /health` or `/health/live` | None | `{ "status": "ok" }`; liveness only |
| `GET /lessonprep/v1.0/LessonFlowPresets` | None | Array of code-defined presets |
| `POST /lessonprep/v1.0/Ai/credentials` | JSON `{ provider, apiKey }` | `{ token }`, a provider-bound encrypted JWE |
| `POST /lessonprep/v1.0/Ai/providers/{provider}/models` | `X-Provider-Token` header; no JSON body required | Array of `{ id, name }` models |
| `POST /lessonprep/v1.0/LessonPreparations/generate` | Multipart fields and files listed below | POST response streamed as SSE |
| `POST /lessonprep/v1.0/LessonPreparations/regenerate` | JSON snapshot and generation settings listed below | POST response streamed as SSE |
| `POST /lessonprep/v1.0/LessonPreparations/sessionTool` | JSON snapshot, session, tool, and credentials listed below | Exercise-set or game JSON (not SSE) |

Credential issuance encrypts a nonempty key up to 4,096 characters. It does not contact the provider or establish that the key works. Discovery, generation, and session tools decrypt the token and call the selected provider. Server presets contain `id`, `name`, `description`, `isDefault`, and ordered `phases`. Each phase contains `name`, `durationMinutes`, and `order`. Custom presets are browser-only and have no backend CRUD endpoints.

## Initial generation

The multipart request includes repeated `files` parts and these fields:

| Field | Meaning |
| --- | --- |
| `className` | Required class name, up to 100 characters |
| `totalDurationMinutes` | Integer, 10-240; must equal phase duration sum |
| `sourceLanguage` | `en`, `ar`, or `fr` |
| `variantCount` | Integer, 1-3 |
| `sessionCount` | Integer, 1-6 (defaults to 1 when omitted) |
| `materialNote` | Optional teacher notes, up to 2,000 characters |
| `provider` | Provider enum name |
| `model` | Selected model ID, up to 150 characters |
| `credentialToken` | Issued credential token |
| `lessonFlowPresetId` | Standard preset ID; use this or `customPhases` |
| `customPhases` | JSON array of phase objects; use this or `lessonFlowPresetId` |

Exactly one flow selection is required. There must be 1-12 phases with names up to 80 characters, positive durations, and orders covering 1 through the phase count exactly once. Accept 1-5 nonempty PDF/TXT/CSV files, up to 20 MiB each, with a combined maximum of 60 PDF pages. Extraction rejects unreadable/too-short material and normalized source over 200,000 characters. See [Documents and OCR](documents-and-ocr.md).

Initial generation emits extraction status and a snapshot before checking the provider credential. Invalid tokens can therefore exercise extraction without invoking paid provider generation, as the opt-in live tests do.

## Regeneration

The JSON body contains `snapshot`, `variantCount`, `generationRound`, `provider`, `model`, and `credentialToken`. The round is an integer from 1 to 10,000. `snapshot` contains:

```json
{
  "preparationId": "<nonempty UUID>",
  "className": "Grade 7",
  "totalDurationMinutes": 45,
  "sourceLanguage": "en",
  "phases": [{ "name": "Instruction", "durationMinutes": 45, "order": 1 }],
  "sourceText": "<normalized source, 30-200000 characters>",
  "preparedSourceText": "",
  "sessionCount": 1,
  "materialNote": ""
}
```

`preparedSourceText` is required and may be the empty string. A nonempty prepared representation must not be whitespace-only and is limited to 60,000 characters. Empty means to use the original source, preparing a summary first if it exceeds 80,000 characters. `sessionCount` is 1-6; `materialNote` is at most 2,000 characters (empty string allowed). The frontend strips `variants` from its stored preparation before sending this snapshot. No original files, stored server preparation, or database lookup are required.

## Session tools

`POST /lessonprep/v1.0/LessonPreparations/sessionTool` returns ephemeral JSON for one validated session. Nothing is stored on the server.

```json
{
  "snapshot": { /* PreparationSnapshot as above */ },
  "session": { /* GeneratedLesson */ },
  "tool": "worksheet",
  "provider": "openAi",
  "model": "<model-id>",
  "credentialToken": "<token>"
}
```

`tool` is `worksheet`, `quiz`, or `game`. Worksheet and quiz return an exercise set: `title`, `instructions`, and `items[]` (`prompt`, `type` of `short` | `multiple_choice` | `true_false` | `fill_blank`, optional `options`, `answer`, optional `explanation`). Game returns `title`, `instructions`, `kind` of `adventure` | `matching` | `race`, and the matching branch payload. Class-level design presets shape game tone (`Helpers/GameDesignPresets.cs`). Choice answers are shuffled before the response is returned. Invalid structured output gets one corrective retry, same pattern as lesson generation. Rate-limited under the `generation` policy.

## Streaming payloads

The response content type is `text/event-stream`. Each event uses `event: <name>` and a JSON `data:` payload followed by a blank line. The server flushes after each event and sends `Cache-Control: no-cache` and `X-Accel-Buffering: no`.

| Event | Payload |
| --- | --- |
| `status` | `{ stage, round?, number?, session?, count? }`; stage is `extracting`, `preparing_source`, `generating`, `variant`, `session`, or `retry` |
| `preparation` | The snapshot above; emitted for initial generation |
| `source_prepared` | `{ preparedSourceText }`; optional long-source summary |
| `text_delta` | `{ number, session?, text }`; provisional preview for that alternative/session |
| `session_ready` | `{ variantId, variantNumber, generationRound, sessionNumber, sessionCount, provider, model, lesson }` |
| `complete` | `{ preparationId, round }` |
| `error` | `{ code, message }`; terminal failure after streaming starts |

For `sessionCount` > 1, each alternative emits one `session_ready` per session before the next alternative. The frontend groups sessions under each variant.

`lesson` includes `title`, `topic`, `className`, `totalDurationMinutes`, `learningObjectives`, `requiredMaterials`, `phases`, `assessmentSummary`, `expectedOutcomes`, and `teacherNotes`. Lesson phases include `name`, `durationMinutes`, `objective`, `teacherActions`, `studentActions`, `questions`, and `notes`. The server validates required fields and the exact requested class, phase count, nonempty translated names, durations at each phase position, and total duration before emitting a session. Invalid output gets one corrective provider retry. The stream must emit `complete` to count as success; a closed connection alone does not mean success.

## Errors and observability

Before streaming begins, custom failures use JSON `{ code, message }` with these status mappings:

| Status | Codes/conditions |
| --- | --- |
| `400` | `validation_error`, `document_error`, `credential_error`, `invalid_json` |
| `401` | `provider_error` when the upstream reports 401 or 403 |
| `502` | Other `provider_error` failures |
| `500` | `server_error` with a generic user-facing message |
| `429` | Rate-limit rejection; may have an empty body and `Retry-After` when available |

Controller model-binding/data-annotation failures can return validation ProblemDetails with an `errors` dictionary. After the response starts, the HTTP status cannot change: middleware emits an SSE `error` instead. Cancellation caused by the disconnected request is suppressed by middleware. `ApiClient` and `SseClient` turn these failures into frontend errors; blank 429 responses receive a useful fallback message.

Responses carry `X-Correlation-ID`. A supplied ID is accepted if it is 1-128 ASCII letters/digits or `-`, `_`, `.`; otherwise the middleware generates one and attaches it to the log context. HTTP logging includes request/response properties and headers without bodies; the provider-token header is excluded from explicit logging. Swagger is available at `/swagger` in all environments in the current code.
