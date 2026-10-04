import { z } from "zod";
import {
  flowSchema,
  languageSchema,
  presetSchema,
  providerSchema,
  snapshotSchema,
} from "@/app/shared/schemas/domain";

export const generateSchema = z
  .object({
    files: z
      .array(
        z
          .instanceof(File)
          .refine(
            (file) =>
              file.size > 0 &&
              file.size <= 20 * 1024 * 1024 &&
              /\.(pdf|txt|csv)$/i.test(file.name),
            "Upload nonempty PDF, TXT, or CSV files, at most 20 MiB each.",
          ),
      )
      .min(1)
      .max(5),
    className: z.string().trim().min(1).max(100),
    totalDurationMinutes: z.number().int().min(10).max(240),
    sourceLanguage: languageSchema,
    variantCount: z.number().int().min(1).max(3),
    sessionCount: z.number().int().min(1).max(6),
    provider: providerSchema,
    model: z.string().min(1).max(150),
    credentialToken: z.string().min(1),
    preset: presetSchema,
  })
  .refine(
    (value) =>
      value.preset.phases.reduce((sum, p) => sum + p.durationMinutes, 0) ===
      value.totalDurationMinutes,
    {
      message: "Phase time must match lesson duration.",
      path: ["totalDurationMinutes"],
    },
  );
export const regenerateSchema = z.object({
  snapshot: snapshotSchema,
  variantCount: z.number().int().min(1).max(3),
  generationRound: z.number().int().min(1).max(10_000),
  provider: providerSchema,
  model: z.string().min(1).max(150),
  credentialToken: z.string().min(1),
});
export const presetFormSchema = z.object({
  name: z.string().trim().min(1),
  phases: flowSchema,
});
export type GenerateRequest = z.infer<typeof generateSchema>;
export type RegenerateRequest = z.infer<typeof regenerateSchema>;
