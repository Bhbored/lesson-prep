import type { z } from "zod";
import { z as validation } from "zod";
import {
  preparationSchema,
  presetSchema,
  settingsSchema,
  credentialSchema,
} from "@/app/shared/schemas/domain";
import type { ProviderId, Settings } from "@/app/shared/schemas/domain";

const damaged = new Map<string, string>();
export const storageKeys = {
  settings: "lessonprep.settings",
  presets: "lessonprep.presets",
  preparation: "lessonprep.lastPreparation",
} as const;
export const defaultSettings: Settings = {
  displayLanguage: "en",
  provider: "deepSeek",
  keys: {},
  models: {},
};
const aliases: Record<string, ProviderId> = {
  openai: "openAi",
  openAi: "openAi",
  gemini: "gemini",
  anthropic: "anthropic",
  deepseek: "deepSeek",
  deepSeek: "deepSeek",
};
const rawSettingsSchema = validation.object({
  displayLanguage: validation.unknown().optional(),
  provider: validation.unknown().optional(),
  keys: validation.record(validation.string(), validation.unknown()).optional(),
  models: validation
    .record(validation.string(), validation.unknown())
    .optional(),
});
function migrateSettings(raw: unknown): Settings {
  const value = rawSettingsSchema.parse(raw);
  const keys: Settings["keys"] = {},
    models: Settings["models"] = {};
  for (const [name, token] of Object.entries(value.keys ?? {}))
    if (
      Object.hasOwn(aliases, name) &&
      credentialSchema.safeParse(token).success
    )
      keys[aliases[name]] = token as string;
  for (const [name, model] of Object.entries(value.models ?? {}))
    if (Object.hasOwn(aliases, name) && typeof model === "string")
      models[aliases[name]] = model;
  return settingsSchema.parse({
    displayLanguage: value.displayLanguage === "ar" ? "ar" : "en",
    provider:
      typeof value.provider === "string" &&
      Object.hasOwn(aliases, value.provider)
        ? aliases[value.provider]
        : "deepSeek",
    keys,
    models,
  });
}
export function loadStored<T>(
  key: string,
  schema: z.ZodType<T>,
  fallback: T,
  migrate?: (raw: unknown) => unknown,
): { value: T; warning: string } {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
    if (raw === null) return { value: fallback, warning: "" };
    const parsed: unknown = JSON.parse(raw);
    const result = schema.safeParse(migrate ? migrate(parsed) : parsed);
    if (!result.success) throw new Error("Invalid stored data");
    return { value: result.data, warning: "" };
  } catch {
    if (raw !== null) damaged.set(key, raw);
    return {
      value: fallback,
      warning:
        "Some saved browser data could not be read. The original data has been retained.",
    };
  }
}
export function saveStored(key: string, value: unknown): string {
  try {
    const recoverable = damaged.get(key);
    if (recoverable !== undefined) {
      localStorage.setItem(`${key}.recovery.${Date.now()}`, recoverable);
      damaged.delete(key);
    }
    localStorage.setItem(key, JSON.stringify(value));
    return "";
  } catch {
    return "Browser storage is unavailable or full. Your changes remain available until this page is closed.";
  }
}
export const loadSettings = () =>
  loadStored(
    storageKeys.settings,
    settingsSchema,
    defaultSettings,
    migrateSettings,
  );
export const loadPresets = () =>
  loadStored(
    storageKeys.presets,
    validation
      .array(presetSchema)
      .refine((items) => items.every((item) => !item.isDefault)),
    [],
  );
export const loadPreparation = () =>
  loadStored(storageKeys.preparation, preparationSchema.nullable(), null);
