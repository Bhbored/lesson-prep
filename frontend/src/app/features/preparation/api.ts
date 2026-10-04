import { apiClient, sseClient } from "@/app/shared/api/clients";
import {
  generationEventSchema,
  snapshotSchema,
} from "@/app/shared/schemas/domain";
import type { GenerationEvent, Preparation } from "@/app/shared/schemas/domain";
import type { GenerateRequest, RegenerateRequest } from "./schema";

export function preparationSnapshot(preparation: Preparation) {
  return snapshotSchema.parse(preparation);
}
export async function generateLessons(
  request: GenerateRequest,
  onEvent: (event: GenerationEvent) => void,
  signal: AbortSignal,
) {
  const form = new FormData();
  request.files.forEach((file) => form.append("files", file));
  for (const field of [
    "className",
    "totalDurationMinutes",
    "sourceLanguage",
    "variantCount",
    "sessionCount",
    "materialNote",
    "provider",
    "model",
    "credentialToken",
  ] as const)
    form.append(field, String(request[field]));
  if (request.preset.isDefault)
    form.append("lessonFlowPresetId", request.preset.id);
  else form.append("customPhases", JSON.stringify(request.preset.phases));
  await sseClient.consume(
    await apiClient.requestStream("LessonPreparations/generate", {
      method: "POST",
      body: form,
      signal,
    }),
    generationEventSchema,
    onEvent,
    signal,
  );
}
export async function regenerateLessons(
  request: RegenerateRequest,
  onEvent: (event: GenerationEvent) => void,
  signal: AbortSignal,
) {
  await sseClient.consume(
    await apiClient.requestStream("LessonPreparations/regenerate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal,
    }),
    generationEventSchema,
    onEvent,
    signal,
  );
}
