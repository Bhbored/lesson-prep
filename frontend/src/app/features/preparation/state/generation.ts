import type {
  GenerationEvent,
  Preparation,
  Variant,
} from "@/app/shared/schemas/domain";

export interface GenerationState {
  preparation: Preparation | null;
  busy: boolean;
  stage: string;
  liveDraft: string;
  activeVariantId: string;
  error: string;
}
export type GenerationAction =
  | { type: "start"; regenerate: boolean }
  | { type: "event"; value: GenerationEvent }
  | { type: "finish"; error?: string }
  | { type: "select"; id: string };

function applySessionReady(
  preparation: Preparation,
  data: Extract<GenerationEvent, { event: "session_ready" }>["data"],
): Variant[] {
  const existing = preparation.variants.find(
    (variant) =>
      variant.generationRound === data.generationRound &&
      variant.id === data.variantId,
  );
  const sessions = [...(existing?.sessions ?? [])];
  sessions[data.sessionNumber - 1] = data.lesson;
  const next: Variant = {
    id: data.variantId,
    variantNumber: data.variantNumber,
    generationRound: data.generationRound,
    provider: data.provider,
    model: data.model,
    sessions,
  };
  return [
    ...preparation.variants.filter(
      (variant) =>
        variant.generationRound === data.generationRound &&
        variant.id !== data.variantId,
    ),
    next,
  ];
}

export function generationReducer(
  state: GenerationState,
  action: GenerationAction,
): GenerationState {
  if (action.type === "start")
    return {
      ...state,
      preparation: action.regenerate ? state.preparation : null,
      activeVariantId: action.regenerate ? state.activeVariantId : "",
      busy: true,
      stage: action.regenerate ? "generating" : "extracting",
      liveDraft: "",
      error: "",
    };
  if (action.type === "finish")
    return {
      ...state,
      busy: false,
      liveDraft: "",
      error: action.error ?? state.error,
    };
  if (action.type === "select")
    return { ...state, activeVariantId: action.id, liveDraft: "" };
  const event = action.value;
  switch (event.event) {
    case "status":
      return {
        ...state,
        stage: event.data.stage,
        liveDraft: ["variant", "session", "retry"].includes(event.data.stage)
          ? ""
          : state.liveDraft,
      };
    case "preparation":
      return {
        ...state,
        preparation: { ...event.data, variants: [] },
        activeVariantId: "",
      };
    case "source_prepared":
      return {
        ...state,
        preparation: state.preparation
          ? {
              ...state.preparation,
              preparedSourceText: event.data.preparedSourceText,
            }
          : null,
      };
    case "text_delta":
      return {
        ...state,
        liveDraft: (state.liveDraft + event.data.text).slice(-12_000),
      };
    case "session_ready":
      return {
        ...state,
        liveDraft: "",
        activeVariantId: event.data.variantId,
        preparation: state.preparation
          ? {
              ...state.preparation,
              variants: applySessionReady(state.preparation, event.data),
            }
          : null,
      };
    case "complete":
      return { ...state, stage: "complete", liveDraft: "" };
  }
}
