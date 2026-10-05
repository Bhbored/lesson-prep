import { apiClient } from "@/app/shared/api/clients";
import {
  exerciseSetSchema,
  gameSchema,
  snapshotSchema,
  type ExerciseSet,
  type Game,
  type Lesson,
  type PreparationSnapshot,
  type ProviderId,
  type SessionTool,
} from "@/app/shared/schemas/domain";

export async function generateSessionTool(
  tool: SessionTool,
  session: Lesson,
  snapshot: PreparationSnapshot,
  provider: ProviderId,
  model: string,
  credentialToken: string,
  signal?: AbortSignal,
): Promise<ExerciseSet | Game> {
  const options: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      snapshot: snapshotSchema.parse(snapshot),
      session,
      tool,
      provider,
      model,
      credentialToken,
    }),
    signal,
  };
  return tool === "game"
    ? apiClient.requestJson("LessonPreparations/sessionTool", gameSchema, options)
    : apiClient.requestJson("LessonPreparations/sessionTool", exerciseSetSchema, options);
}
