import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { useState } from "react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { AlertsProvider } from "./AlertsProvider";
import { SettingsProvider } from "./SettingsProvider";
import { PresetsProvider } from "./PresetsProvider";
import { PreparationProvider } from "./PreparationProvider";
import { usePreparation } from "./preparation";
import { usePresets } from "./presets";
import { useSettings } from "./settings";
import { useAlerts } from "./alerts";
import { useSettingsPage } from "@/app/features/settings/hooks/useSettingsPage";
import SettingsPage from "@/app/features/settings/pages/SettingsPage";
import userEvent from "@testing-library/user-event";
import PreparePage from "@/app/features/preparation/pages/PreparePage";
import {
  generateLessons,
  regenerateLessons,
} from "@/app/features/preparation/api";
import { getPresets } from "@/app/features/presets/api";
import { getModels, issueCredential } from "@/app/features/settings/api";
import {
  defaultSettings,
  loadSettings,
  storageKeys,
} from "@/app/shared/storage/storage";
import { deferred, preset, snapshot, token, variant } from "@/test/fixtures";
import type { GenerationEvent } from "@/app/shared/schemas/domain";

vi.mock("@/app/features/presets/api", () => ({ getPresets: vi.fn() }));
vi.mock("@/app/features/settings/api", () => ({
  getModels: vi.fn(),
  issueCredential: vi.fn(),
}));
vi.mock("@/app/features/preparation/api", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  generateLessons: vi.fn(),
  regenerateLessons: vi.fn(),
}));

function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return (
    <MemoryRouter initialEntries={["/prepare"]}>
      <QueryClientProvider client={client}>
        <AlertsProvider>
          <SettingsProvider>
            <PresetsProvider>
              <PreparationProvider>{children}</PreparationProvider>
            </PresetsProvider>
          </SettingsProvider>
        </AlertsProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}
beforeEach(() => {
  vi.mocked(getPresets).mockResolvedValue([preset]);
  vi.mocked(getModels).mockResolvedValue([{ id: "model", name: "Model" }]);
  localStorage.setItem(
    storageKeys.settings,
    JSON.stringify({
      ...defaultSettings,
      keys: { deepSeek: token },
      models: { deepSeek: "model" },
    }),
  );
});
afterEach(() => vi.resetAllMocks());

describe("settings and model caches", () => {
  it("removes the selected provider credential and model from local storage when Remove key is clicked", async () => {
    const otherToken = "other..nonce.encrypted.signature";
    localStorage.setItem(
      storageKeys.settings,
      JSON.stringify({
        ...defaultSettings,
        keys: { deepSeek: token, gemini: otherToken },
        models: { deepSeek: "model", gemini: "gemini-model" },
      }),
    );
    const user = userEvent.setup();
    const view = render(<SettingsPage />, { wrapper: Wrapper });
    await user.click(screen.getByRole("button", { name: /Remove key/i }));
    const stored = JSON.parse(localStorage.getItem(storageKeys.settings)!);
    expect(stored.keys).not.toHaveProperty("deepSeek");
    expect(stored.models).not.toHaveProperty("deepSeek");
    expect(stored.keys.gemini).toBe(otherToken);
    expect(stored.models.gemini).toBe("gemini-model");
    expect(JSON.stringify(stored)).not.toContain(token);
    expect(
      screen.queryByRole("button", { name: /Remove key/i }),
    ).not.toBeInTheDocument();
    view.unmount();
    expect(loadSettings().value.keys).not.toHaveProperty("deepSeek");
    render(<SettingsPage />, { wrapper: Wrapper });
    expect(
      screen.queryByRole("button", { name: /Remove key/i }),
    ).not.toBeInTheDocument();
  });
  it("applies a delayed credential response to its original provider without changing the current selection", async () => {
    const pending = deferred<string>();
    vi.mocked(issueCredential).mockReturnValue(pending.promise);
    const { result } = renderHook(
      () => ({ page: useSettingsPage(), client: useQueryClient() }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.page.models).toHaveLength(1));
    act(() => result.current.page.setKeyInput("new-key"));
    let saving!: Promise<void>;
    act(() => {
      saving = result.current.page.saveKey();
    });
    act(() =>
      result.current.page.updateSettings((previous) => ({
        ...previous,
        provider: "gemini",
        models: { ...previous.models, gemini: "gemini-model" },
      })),
    );
    await act(async () => {
      pending.resolve("newheader..iv.cipher.tag");
      await saving;
    });
    expect(result.current.page.settings).toMatchObject({
      provider: "gemini",
      keys: { deepSeek: "newheader..iv.cipher.tag" },
      models: { gemini: "gemini-model", deepSeek: "" },
    });
    expect(
      JSON.stringify(
        result.current.client
          .getQueryCache()
          .getAll()
          .map((query) => query.queryKey),
      ),
    ).not.toContain(token);
  });
  it("invalidates provider model caches when credentials rotate or are removed", async () => {
    const { result } = renderHook(
      () => ({ settings: useSettings(), client: useQueryClient() }),
      { wrapper: Wrapper },
    );
    act(() =>
      result.current.client.setQueryData(
        ["models", "deepSeek", 0],
        [{ id: "old" }],
      ),
    );
    act(() =>
      result.current.settings.updateSettings((previous) => ({
        ...previous,
        keys: { deepSeek: "newheader..iv.cipher.tag" },
      })),
    );
    expect(
      result.current.client.getQueryData(["models", "deepSeek", 0]),
    ).toBeUndefined();
    expect(result.current.settings.revisions.deepSeek).toBe(1);
    act(() =>
      result.current.settings.updateSettings((previous) => ({
        ...previous,
        keys: {},
      })),
    );
    expect(result.current.settings.revisions.deepSeek).toBe(2);
  });
  it("does not restore a credential removed while issuance is still in flight", async () => {
    const pending = deferred<string>();
    vi.mocked(issueCredential).mockReturnValue(pending.promise);
    const { result } = renderHook(useSettingsPage, { wrapper: Wrapper });
    act(() => result.current.setKeyInput("new-key"));
    let saving!: Promise<void>;
    act(() => {
      saving = result.current.saveKey();
    });
    act(() => result.current.removeKey());
    await act(async () => {
      pending.resolve("newheader..iv.cipher.tag");
      await saving;
    });
    expect(result.current.settings.keys.deepSeek).toBeUndefined();
    expect(
      JSON.parse(localStorage.getItem(storageKeys.settings)!).keys,
    ).not.toHaveProperty("deepSeek");
  });
  it("does not let an obsolete provider model response replace the current provider list", async () => {
    const pending = deferred<{ id: string; name: string }[]>();
    vi.mocked(getModels).mockImplementation((provider) =>
      provider === "deepSeek"
        ? pending.promise
        : Promise.resolve([{ id: "gemini-model", name: "Gemini" }]),
    );
    const { result } = renderHook(useSettingsPage, { wrapper: Wrapper });
    act(() =>
      result.current.updateSettings((previous) => ({
        ...previous,
        provider: "gemini",
        keys: { ...previous.keys, gemini: token },
      })),
    );
    await waitFor(() =>
      expect(result.current.models[0]?.id).toBe("gemini-model"),
    );
    await act(async () => {
      pending.resolve([{ id: "old-deepseek", name: "Old" }]);
      await pending.promise;
    });
    expect(result.current.models[0]?.id).toBe("gemini-model");
  });
});

describe("persistent workspace state", () => {
  it("allows starting another lesson with saved results and an incomplete form", async () => {
    localStorage.setItem(
      storageKeys.preparation,
      JSON.stringify({
        ...snapshot,
        variants: [1, 2, 3].map((number) => ({
          ...variant,
          id: `old-${number}`,
          variantNumber: number,
        })),
      }),
    );
    render(<PreparePage />, { wrapper: Wrapper });
    await waitFor(() =>
      expect(
        screen.getByRole("option", { name: preset.name }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: /Generate lesson plans/ }),
    ).toBeEnabled();
  });

  it("clears old saved results for a new lesson, replaces them, and allows another start", async () => {
    const oldVariants = [1, 2, 3].map((number) => ({
      ...variant,
      id: `old-${number}`,
      variantNumber: number,
    }));
    localStorage.setItem(
      storageKeys.preparation,
      JSON.stringify({ ...snapshot, variants: oldVariants }),
    );
    const pending = deferred<void>();
    let deliver!: (event: GenerationEvent) => void;
    vi.mocked(generateLessons)
      .mockImplementationOnce(async (_request, callback) => {
        deliver = callback;
        await pending.promise;
      })
      .mockResolvedValueOnce(undefined);
    const { result } = renderHook(
      () => ({ state: usePreparation(), presets: usePresets() }),
      { wrapper: Wrapper },
    );
    await waitFor(() =>
      expect(result.current.presets.selectedPreset).toBeDefined(),
    );
    expect(result.current.state.currentVariants).toEqual(oldVariants);
    act(() => {
      result.current.state.setClassName("Grade 7");
      result.current.state.setFiles([
        new File([snapshot.sourceText], "new-lesson.txt"),
      ]);
    });
    let generation!: Promise<void>;
    act(() => {
      generation = result.current.state.generate();
    });
    expect(result.current.state.currentVariants).toEqual([]);
    expect(
      JSON.parse(localStorage.getItem(storageKeys.preparation)!),
    ).toBeNull();
    const newSnapshot = { ...snapshot, preparationId: crypto.randomUUID() };
    const newVariants = [1, 2, 3].map((number) => ({
      ...variant,
      id: `new-${number}`,
      variantNumber: number,
    }));
    await act(async () => {
      deliver({ event: "preparation", data: newSnapshot });
      for (const data of newVariants) deliver({ event: "variant_ready", data });
      deliver({
        event: "complete",
        data: { preparationId: newSnapshot.preparationId, round: 1 },
      });
      pending.resolve();
      await generation;
    });
    expect(result.current.state.busy).toBe(false);
    expect(result.current.state.currentVariants).toEqual(newVariants);
    expect(JSON.parse(localStorage.getItem(storageKeys.preparation)!)).toEqual({
      ...newSnapshot,
      variants: newVariants,
    });
    await act(async () => {
      await result.current.state.generate();
    });
    expect(vi.mocked(generateLessons)).toHaveBeenCalledTimes(2);
    expect(
      JSON.parse(localStorage.getItem(storageKeys.preparation)!),
    ).toBeNull();
  });

  it("does not restore old results if a new lesson fails before extraction", async () => {
    localStorage.setItem(
      storageKeys.preparation,
      JSON.stringify({ ...snapshot, variants: [variant] }),
    );
    vi.mocked(generateLessons).mockRejectedValueOnce(
      new Error("Extraction failed"),
    );
    const { result } = renderHook(
      () => ({ state: usePreparation(), presets: usePresets() }),
      { wrapper: Wrapper },
    );
    await waitFor(() =>
      expect(result.current.presets.selectedPreset).toBeDefined(),
    );
    act(() => {
      result.current.state.setClassName("Grade 7");
      result.current.state.setFiles([
        new File([snapshot.sourceText], "new-lesson.txt"),
      ]);
    });
    await act(async () => {
      await result.current.state.generate();
    });
    expect(result.current.state.busy).toBe(false);
    expect(result.current.state.currentVariants).toEqual([]);
    expect(
      JSON.parse(localStorage.getItem(storageKeys.preparation)!),
    ).toBeNull();
  });
  it("retains forms and preset drafts through navigation and keeps drafts out of storage", async () => {
    const { result } = renderHook(
      () => ({
        preparation: usePreparation(),
        presets: usePresets(),
        navigate: useNavigate(),
        location: useLocation(),
      }),
      { wrapper: Wrapper },
    );
    act(() => {
      result.current.preparation.setClassName("Grade 8");
      result.current.preparation.setFiles([new File(["notes"], "notes.txt")]);
      result.current.presets.setDraftPreset({
        ...preset,
        isDefault: false,
        name: "Unsaved",
      });
      result.current.navigate("/settings");
    });
    expect(result.current.location.pathname).toBe("/settings");
    act(() => result.current.navigate("/prepare"));
    expect(result.current.preparation.className).toBe("Grade 8");
    expect(result.current.preparation.files[0].name).toBe("notes.txt");
    expect(result.current.presets.draftPreset?.name).toBe("Unsaved");
    expect(localStorage.getItem(storageKeys.presets)).toBeNull();
  });
  it("continues generation across routes, prevents concurrent starts, and retains partial results on failure", async () => {
    const pending = deferred<void>();
    let deliver!: (event: GenerationEvent) => void;
    vi.mocked(generateLessons).mockImplementation(
      async (_request, callback) => {
        deliver = callback;
        await pending.promise;
        throw new Error("Provider failed");
      },
    );
    const { result } = renderHook(
      () => ({
        state: usePreparation(),
        presets: usePresets(),
        alerts: useAlerts(),
        navigate: useNavigate(),
        location: useLocation(),
      }),
      { wrapper: Wrapper },
    );
    await waitFor(() =>
      expect(result.current.presets.selectedPreset).toBeDefined(),
    );
    act(() => {
      result.current.state.setClassName("Grade 7");
      result.current.state.setFiles([
        new File([snapshot.sourceText], "plants.txt"),
      ]);
    });
    let generation!: Promise<void>;
    act(() => {
      generation = result.current.state.generate();
    });
    expect(result.current.state.busy).toBe(true);
    act(() => {
      void result.current.state.generate();
      result.current.navigate("/settings");
    });
    expect(vi.mocked(generateLessons)).toHaveBeenCalledTimes(1);
    act(() => {
      deliver({ event: "preparation", data: snapshot });
      deliver({ event: "variant_ready", data: variant });
      deliver({
        event: "text_delta",
        data: { number: 2, text: "unvalidated draft" },
      });
    });
    expect(result.current.location.pathname).toBe("/settings");
    await act(async () => {
      pending.resolve();
      await generation;
    });
    expect(result.current.state.busy).toBe(false);
    expect(result.current.state.liveDraft).toBe("");
    expect(result.current.state.currentVariants).toEqual([variant]);
    expect(result.current.alerts.error).toBe("Provider failed");
    expect(
      JSON.parse(localStorage.getItem(storageKeys.preparation)!),
    ).toMatchObject({ variants: [variant] });
  });
  it("ignores stale events after cancellation and starts regeneration with the next round", async () => {
    localStorage.setItem(
      storageKeys.preparation,
      JSON.stringify({ ...snapshot, variants: [variant] }),
    );
    const pending = deferred<void>();
    let deliver!: (event: GenerationEvent) => void;
    vi.mocked(regenerateLessons).mockImplementation(
      async (_request, callback, signal) => {
        deliver = callback;
        await Promise.race([
          pending.promise,
          new Promise<never>((_resolve, reject) =>
            signal.addEventListener("abort", () =>
              reject(new DOMException("cancelled", "AbortError")),
            ),
          ),
        ]);
      },
    );
    const { result } = renderHook(usePreparation, { wrapper: Wrapper });
    let generation!: Promise<void>;
    act(() => {
      generation = result.current.regenerate();
    });
    expect(vi.mocked(regenerateLessons).mock.calls[0][0]).toMatchObject({
      generationRound: 2,
      snapshot,
    });
    act(() => result.current.cancel());
    await act(async () => {
      await generation;
    });
    act(() =>
      deliver({
        event: "variant_ready",
        data: { ...variant, id: "obsolete", generationRound: 2 },
      }),
    );
    expect(result.current.currentVariants).toEqual([variant]);
    expect(result.current.busy).toBe(false);
  });
});
