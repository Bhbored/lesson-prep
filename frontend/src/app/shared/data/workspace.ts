import openaiLogo from "@lobehub/icons-static-svg/icons/openai.svg";
import geminiLogo from "@lobehub/icons-static-svg/icons/gemini-color.svg";
import anthropicLogo from "@lobehub/icons-static-svg/icons/anthropic.svg";
import deepseekLogo from "@lobehub/icons-static-svg/icons/deepseek-color.svg";
import type { ProviderId, Preset } from "@/app/shared/schemas/domain";
export const logos: Record<ProviderId, string> = {
  openAi: openaiLogo,
  gemini: geminiLogo,
  anthropic: anthropicLogo,
  deepSeek: deepseekLogo,
};
export const blankPreset = (): Preset => ({
  id: crypto.randomUUID(),
  name: "",
  description: "",
  isDefault: false,
  phases: [{ name: "", durationMinutes: 5, order: 1 }],
});
export const classChoices = [
  { value: "Kindergarten 1", en: "Kindergarten 1", ar: "الروضة الأولى" },
  { value: "Kindergarten 2", en: "Kindergarten 2", ar: "الروضة الثانية" },
  { value: "Kindergarten 3", en: "Kindergarten 3", ar: "الروضة الثالثة" },
  ...Array.from({ length: 12 }, (_, index) => ({
    value: `Grade ${index + 1}`,
    en: `Grade ${index + 1}`,
    ar: `الصف ${index + 1}`,
  })),
];
