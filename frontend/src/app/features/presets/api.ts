import { z } from "zod";
import { apiClient } from "@/app/shared/api/clients";
import { presetSchema } from "@/app/shared/schemas/domain";

export function getPresets(signal?: AbortSignal) {
  return apiClient.requestJson("LessonFlowPresets", z.array(presetSchema), {
    signal,
  });
}
