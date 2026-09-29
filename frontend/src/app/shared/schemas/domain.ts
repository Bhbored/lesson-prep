import { z } from "zod";

export const providerSchema = z.enum([
  "openAi",
  "gemini",
  "anthropic",
  "deepSeek",
]);
export const languageSchema = z.enum(["en", "ar", "fr"]);
export const phaseSchema = z.object({
  name: z.string().trim().min(1).max(80),
  durationMinutes: z.number().int().min(1).max(240),
  order: z.number().int().min(1).max(12),
});
export const flowSchema = z
  .array(phaseSchema)
  .min(1)
  .max(12)
  .refine(
    (phases) =>
      phases
        .map((p) => p.order)
        .sort((a, b) => a - b)
        .every((order, i) => order === i + 1),
    "Check phase order.",
  );
export const presetSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  description: z.string(),
  isDefault: z.boolean(),
  phases: flowSchema,
});
export const modelSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
});
export const lessonPhaseSchema = z.object({
  name: z.string().min(1),
  durationMinutes: z.number().int().positive(),
  objective: z.string().min(1),
  teacherActions: z.array(z.string()).min(1),
  studentActions: z.array(z.string()).min(1),
  questions: z
    .array(z.string())
    .nullable()
    .transform((value) => value ?? []),
  notes: z
    .string()
    .nullable()
    .transform((value) => value ?? ""),
});
export const lessonSchema = z.object({
  title: z.string().min(1),
  topic: z.string().min(1),
  className: z.string().min(1),
  totalDurationMinutes: z.number().int(),
  learningObjectives: z.array(z.string()).min(1),
  requiredMaterials: z.array(z.string()),
  phases: z.array(lessonPhaseSchema).min(1),
  assessmentSummary: z.string().min(1),
  expectedOutcomes: z.array(z.string()).min(1),
  teacherNotes: z
    .string()
    .nullable()
    .transform((value) => value ?? ""),
});
// JsonStringEnumConverter emits PascalCase providers in backend responses.
export const variantSchema = z.object({
  id: z.string().min(1),
  variantNumber: z.number().int().min(1).max(3),
  generationRound: z.number().int().positive(),
  provider: z.enum([
    "OpenAi",
    "Gemini",
    "Anthropic",
    "DeepSeek",
    ...providerSchema.options,
  ]),
  model: z.string(),
  lesson: lessonSchema,
});
export const snapshotSchema = z
  .object({
    preparationId: z.string().uuid(),
    className: z.string().trim().min(1).max(100),
    totalDurationMinutes: z.number().int().min(10).max(240),
    sourceLanguage: languageSchema,
    phases: flowSchema,
    sourceText: z.string().min(30).max(200_000),
    preparedSourceText: z.string().max(60_000),
  })
  .refine(
    (value) =>
      value.phases.reduce((sum, p) => sum + p.durationMinutes, 0) ===
      value.totalDurationMinutes,
    "Phase time must match lesson duration.",
  );
export const preparationSchema = z
  .object({ ...snapshotSchema.shape, variants: z.array(variantSchema) })
  .refine(
    (value) =>
      value.phases.reduce((sum, p) => sum + p.durationMinutes, 0) ===
      value.totalDurationMinutes,
    "Phase time must match lesson duration.",
  );
export const credentialSchema = z
  .string()
  .regex(/^[\w-]+\.\.[\w-]+\.[\w-]+\.[\w-]+$/);
export const settingsSchema = z.object({
  displayLanguage: languageSchema,
  provider: providerSchema,
  keys: z.partialRecord(providerSchema, credentialSchema),
  models: z.partialRecord(providerSchema, z.string()),
});
export const statusSchema = z.object({
  stage: z.enum([
    "extracting",
    "preparing_source",
    "generating",
    "variant",
    "retry",
  ]),
  round: z.number().int().optional(),
  number: z.number().int().optional(),
  count: z.number().int().optional(),
});
export const generationEventSchema = z.discriminatedUnion("event", [
  z.object({ event: z.literal("status"), data: statusSchema }),
  z.object({ event: z.literal("preparation"), data: snapshotSchema }),
  z.object({
    event: z.literal("source_prepared"),
    data: z.object({ preparedSourceText: z.string().min(1).max(60_000) }),
  }),
  z.object({
    event: z.literal("text_delta"),
    data: z.object({ number: z.number().int(), text: z.string() }),
  }),
  z.object({ event: z.literal("variant_ready"), data: variantSchema }),
  z.object({
    event: z.literal("complete"),
    data: z.object({
      preparationId: z.string().uuid(),
      round: z.number().int().positive(),
    }),
  }),
]);
export type ProviderId = z.infer<typeof providerSchema>;
export type Language = z.infer<typeof languageSchema>;
export type Phase = z.infer<typeof phaseSchema>;
export type Preset = z.infer<typeof presetSchema>;
export type AiModel = z.infer<typeof modelSchema>;
export type Variant = z.infer<typeof variantSchema>;
export type PreparationSnapshot = z.infer<typeof snapshotSchema>;
export type Preparation = z.infer<typeof preparationSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type GenerationEvent = z.infer<typeof generationEventSchema>;
