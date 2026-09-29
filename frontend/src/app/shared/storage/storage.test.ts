import { describe, expect, it, vi } from "vitest";
import {
  defaultSettings,
  loadPreparation,
  loadPresets,
  loadSettings,
  saveStored,
  storageKeys,
} from "./storage";
import { preset, snapshot, token, variant } from "@/test/fixtures";

describe("browser storage", () => {
  it("migrates provider aliases while keeping only credential tokens and recognized providers", () => {
    localStorage.setItem(
      storageKeys.settings,
      JSON.stringify({
        provider: "deepseek",
        keys: { deepseek: token, openai: "plain.api.key", unknown: token },
        models: { deepseek: "model", unknown: "wrong" },
      }),
    );
    expect(loadSettings().value).toEqual({
      displayLanguage: "en",
      provider: "deepSeek",
      keys: { deepSeek: token },
      models: { deepSeek: "model" },
    });
  });
  it("preserves French as the saved display language", () => {
    localStorage.setItem(
      storageKeys.settings,
      JSON.stringify({ ...defaultSettings, displayLanguage: "fr" }),
    );
    expect(loadSettings().value.displayLanguage).toBe("fr");
  });
  it("restores current preparation snapshots and custom presets", () => {
    localStorage.setItem(
      storageKeys.preparation,
      JSON.stringify({ ...snapshot, variants: [variant] }),
    );
    localStorage.setItem(
      storageKeys.presets,
      JSON.stringify([{ ...preset, isDefault: false }]),
    );
    expect(loadPreparation().value?.variants).toEqual([variant]);
    expect(loadPresets().value).toHaveLength(1);
  });
  it("reports malformed data without replacing it, then backs it up before an intentional save", () => {
    localStorage.setItem(storageKeys.preparation, "broken-original");
    expect(loadPreparation()).toMatchObject({
      value: null,
      warning: expect.stringContaining("retained"),
    });
    expect(localStorage.getItem(storageKeys.preparation)).toBe(
      "broken-original",
    );
    expect(
      saveStored(storageKeys.preparation, { ...snapshot, variants: [] }),
    ).toBe("");
    const backup = Object.keys(localStorage).find((key) =>
      key.startsWith(`${storageKeys.preparation}.recovery.`),
    )!;
    expect(localStorage.getItem(backup)).toBe("broken-original");
  });
  it("reports quota failures instead of throwing", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    expect(saveStored(storageKeys.presets, [])).toContain(
      "storage is unavailable or full",
    );
  });
});
