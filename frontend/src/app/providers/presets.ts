import { createContext, useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPresets } from "@/app/features/presets/api";
import {
  loadPresets,
  saveStored,
  storageKeys,
} from "@/app/shared/storage/storage";
import { blankPreset } from "@/app/shared/data/workspace";
import { presetSchema } from "@/app/shared/schemas/domain";
import type { Phase, Preset } from "@/app/shared/schemas/domain";
import { displayedPresetName, starterPhases } from "@/app/features/presets/standardFlow";
import { useSettings } from "./settings";
import { useAlerts } from "./alerts";
import { useI18n } from "./i18n";

export function usePresetsState() {
  const [{ value, warning }] = useState(loadPresets);
  const [localPresets, setLocalPresets] = useState(value);
  const [selection, setSelection] = useState("");
  const [draftPreset, setDraftPreset] = useState<Preset | null>(null);
  const query = useQuery({
    queryKey: ["presets"],
    queryFn: ({ signal }) => getPresets(signal),
    staleTime: Infinity,
  });
  const { setError, setNotice } = useAlerts();
  const { settings } = useSettings();
  const t = useI18n();
  useEffect(() => {
    if (warning) setNotice(warning);
  }, [warning, setNotice]);
  useEffect(() => {
    if (query.error) setError(query.error.message);
  }, [query.error, setError]);
  const serverPresets = query.data ?? [];
  const defaultPreset = serverPresets.find((preset) => preset.isDefault);
  const allPresets = [...serverPresets, ...localPresets];
  const selectedPresetId = allPresets.some((p) => p.id === selection)
    ? selection
    : (allPresets[0]?.id ?? "");
  const selectedPreset = allPresets.find((p) => p.id === selectedPresetId);
  const phaseTotal =
    selectedPreset?.phases.reduce(
      (total, phase) => total + phase.durationMinutes,
      0,
    ) ?? 0;
  function updateLocalPresets(next: Preset[]) {
    setLocalPresets(next);
    const issue = saveStored(storageKeys.presets, next);
    if (issue) setNotice(issue);
  }
  function createPreset() {
    if (!defaultPreset) return;
    setDraftPreset(blankPreset(starterPhases(defaultPreset, settings.displayLanguage)));
    setError("");
  }
  function duplicate(preset: Preset) {
    const copy = {
      ...preset,
      id: crypto.randomUUID(),
      isDefault: false,
      name: `${displayedPresetName(preset, settings.displayLanguage)} ${t.copySuffix}`,
      phases: starterPhases(preset, settings.displayLanguage),
    };
    updateLocalPresets([...localPresets, copy]);
    setDraftPreset(copy);
    setSelection(copy.id);
  }
  function savePreset() {
    if (!draftPreset) return;
    const result = presetSchema.safeParse({
      ...draftPreset,
      isDefault: false,
      phases: draftPreset.phases.map((p, i) => ({ ...p, order: i + 1 })),
    });
    if (!result.success) {
      setError(t.invalidFlow);
      return;
    }
    const saved = result.data;
    setNotice(t.created);
    updateLocalPresets(
      localPresets.some((p) => p.id === saved.id)
        ? localPresets.map((p) => (p.id === saved.id ? saved : p))
        : [...localPresets, saved],
    );
    setSelection(saved.id);
    setDraftPreset(null);
    setError("");
  }
  function editPhase(index: number, update: Partial<Phase>) {
    setDraftPreset((previous) =>
      previous
        ? {
            ...previous,
            phases: previous.phases.map((p, i) =>
              i === index ? { ...p, ...update } : p,
            ),
          }
        : null,
    );
  }
  function movePhase(index: number, direction: -1 | 1) {
    setDraftPreset((previous) => {
      if (!previous) return null;
      const phases = [...previous.phases],
        destination = index + direction;
      if (destination < 0 || destination >= phases.length) return previous;
      [phases[index], phases[destination]] = [
        phases[destination],
        phases[index],
      ];
      return {
        ...previous,
        phases: phases.map((p, i) => ({ ...p, order: i + 1 })),
      };
    });
  }
  return {
    serverPresets,
    localPresets,
    allPresets,
    selectedPresetId,
    selectedPreset,
    phaseTotal,
    draftPreset,
    setSelectedPresetId: setSelection,
    setDraftPreset,
    updateLocalPresets,
    duplicate,
    savePreset,
    editPhase,
    movePhase,
    createPreset,
    canCreatePreset: Boolean(defaultPreset),
    presetLoading: query.isPending,
    retryPresets: query.refetch,
  };
}
export const PresetsContext = createContext<ReturnType<
  typeof usePresetsState
> | null>(null);
export function usePresets() {
  const value = useContext(PresetsContext);
  if (!value) throw new Error("PresetsProvider is required.");
  return value;
}
