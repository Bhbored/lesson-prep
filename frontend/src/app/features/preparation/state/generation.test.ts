import { describe, expect, it } from "vitest";
import { generationReducer } from "./generation";
import type { GenerationState } from "./generation";
import { snapshot, variant } from "@/test/fixtures";

const initial: GenerationState = {
  preparation: { ...snapshot, variants: [variant] },
  busy: false,
  stage: "",
  liveDraft: "",
  activeVariantId: variant.id,
  error: "",
};
describe("generation state", () => {
  it("retains the previous round until the first validated replacement arrives", () => {
    let state = generationReducer(initial, { type: "start", regenerate: true });
    expect(state.preparation?.variants).toEqual([variant]);
    state = generationReducer(state, {
      type: "event",
      value: { event: "text_delta", data: { number: 1, text: "provisional" } },
    });
    expect(state.preparation?.variants).toEqual([variant]);
    const next = { ...variant, id: "new", generationRound: 2 };
    state = generationReducer(state, {
      type: "event",
      value: { event: "variant_ready", data: next },
    });
    expect(state.preparation?.variants).toEqual([next]);
    expect(state.liveDraft).toBe("");
  });
  it("retains validated partial results after failure or cancellation and clears drafts on retry", () => {
    let state = generationReducer(initial, { type: "start", regenerate: true });
    state = generationReducer(state, {
      type: "event",
      value: { event: "text_delta", data: { number: 1, text: "draft" } },
    });
    state = generationReducer(state, {
      type: "event",
      value: { event: "status", data: { stage: "retry" } },
    });
    expect(state.liveDraft).toBe("");
    state = generationReducer(state, { type: "finish", error: "failed" });
    expect(state).toMatchObject({ busy: false, error: "failed" });
    expect(state.preparation?.variants).toEqual([variant]);
    expect(
      generationReducer(state, { type: "finish" }).preparation?.variants,
    ).toEqual([variant]);
  });
  it("resets new preparations and retains summarized sources for regeneration", () => {
    let state = generationReducer(initial, {
      type: "start",
      regenerate: false,
    });
    expect(state.preparation).toBeNull();
    state = generationReducer(state, {
      type: "event",
      value: { event: "preparation", data: snapshot },
    });
    state = generationReducer(state, {
      type: "event",
      value: {
        event: "source_prepared",
        data: { preparedSourceText: "summary" },
      },
    });
    expect(state.preparation).toMatchObject({
      variants: [],
      preparedSourceText: "summary",
    });
  });
});
