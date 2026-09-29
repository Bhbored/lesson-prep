import { z } from "zod";
import { apiClient } from "@/app/shared/api/clients";
import { credentialSchema, modelSchema } from "@/app/shared/schemas/domain";
import type { ProviderId } from "@/app/shared/schemas/domain";

export async function issueCredential(
  provider: ProviderId,
  apiKey: string,
  signal?: AbortSignal,
) {
  const response = await apiClient.requestJson(
    "Ai/credentials",
    z.object({ token: credentialSchema }),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, apiKey }),
      signal,
    },
  );
  return response.token;
}
export function getModels(
  provider: ProviderId,
  token: string,
  signal?: AbortSignal,
) {
  return apiClient.requestJson(
    `Ai/providers/${provider}/models`,
    z.array(modelSchema),
    {
      method: "POST",
      headers: { "X-Provider-Token": token },
      signal,
    },
  );
}
