import type { Language, Phase, Preset } from "@/app/shared/schemas/domain";
import { translations } from "@/app/shared/i18n/messages";

export function displayedPresetName(preset: Preset, language: Language): string {
  return preset.isDefault ? translations(language).standardPresetName : preset.name;
}

export function displayedPresetDescription(preset: Preset, language: Language): string {
  return preset.isDefault ? translations(language).standardPresetDescription : preset.description;
}

export function displayedPhaseName(preset: Preset, phase: Phase, language: Language): string {
  if (!preset.isDefault) return phase.name;
  const t = translations(language);
  const names = [t.standardPhase1, t.standardPhase2, t.standardPhase3, t.standardPhase4, t.standardPhase5];
  return names[phase.order - 1] ?? phase.name;
}

export function starterPhases(preset: Preset, language: Language): Phase[] {
  return preset.phases.map((phase) => ({
    ...phase,
    name: displayedPhaseName(preset, phase, language),
  }));
}
