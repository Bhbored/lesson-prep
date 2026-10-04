import type {
  PreparationSnapshot,
  Preset,
  Variant,
} from "@/app/shared/schemas/domain";

export const preset: Preset = {
  id: "d0d63333-caa4-48f1-91f4-3a76e08c1940",
  name: "Standard 45-Minute Lesson",
  description: "",
  isDefault: true,
  phases: ["Warm-up", "Instruction", "Practice", "Assessment", "Closure"].map(
    (name, i) => ({
      name,
      durationMinutes: [5, 15, 15, 7, 3][i],
      order: i + 1,
    }),
  ),
};
export const snapshot: PreparationSnapshot = {
  preparationId: preset.id,
  className: "Grade 7",
  totalDurationMinutes: 45,
  sourceLanguage: "en",
  phases: preset.phases,
  sourceText:
    "Photosynthesis uses sunlight and water to help plants grow in the classroom.",
  preparedSourceText: "",
  sessionCount: 1,
};
export const token = "header..iv.cipher.tag";
export const lesson = {
  title: "Plants",
  topic: "Photosynthesis",
  className: "Grade 7",
  totalDurationMinutes: 45,
  learningObjectives: ["Explain photosynthesis"],
  requiredMaterials: ["Board"],
  phases: preset.phases.map((phase) => ({
    name: phase.name,
    durationMinutes: phase.durationMinutes,
    objective: "Learn",
    teacherActions: ["Explain"],
    studentActions: ["Practice"],
    questions: [],
    notes: "",
  })),
  assessmentSummary: "Exit ticket",
  expectedOutcomes: ["Explain"],
  teacherNotes: "",
};
export const variant: Variant = {
  id: "first",
  variantNumber: 1,
  generationRound: 1,
  provider: "DeepSeek",
  model: "model",
  sessions: [lesson],
};
export const sessionReady = {
  variantId: variant.id,
  variantNumber: variant.variantNumber,
  generationRound: variant.generationRound,
  sessionNumber: 1,
  sessionCount: 1,
  provider: variant.provider,
  model: variant.model,
  lesson,
};
export function sse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
export const completed = sse("complete", {
  preparationId: snapshot.preparationId,
  round: 1,
});
export function streamResponse(text: string, size = 7) {
  const bytes = new TextEncoder().encode(text);
  return new Response(
    new ReadableStream({
      start(controller) {
        for (let i = 0; i < bytes.length; i += size)
          controller.enqueue(bytes.slice(i, i + size));
        controller.close();
      },
    }),
    { headers: { "Content-Type": "text/event-stream" } },
  );
}
export function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
