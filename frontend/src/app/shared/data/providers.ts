import type { ProviderId } from "@/app/shared/schemas/domain";

export const providerIds: ProviderId[] = [
  "openAi",
  "gemini",
  "anthropic",
  "deepSeek",
];
export const providerNames: Record<ProviderId, string> = {
  openAi: "OpenAI",
  gemini: "Gemini",
  anthropic: "Anthropic",
  deepSeek: "DeepSeek",
};
