import type { Language, Phase, Preset } from "@/app/shared/schemas/domain";

const names: Record<Language, readonly string[]> = {
  en: ["Warm-up", "Instruction", "Practice", "Assessment", "Closure"],
  ar: ["تمهيد", "شرح الدرس", "تطبيق", "تقييم", "خاتمة"],
  fr: ["Mise en route", "Enseignement", "Mise en pratique", "Évaluation", "Conclusion"],
};

export function displayedPhaseName(preset: Preset, phase: Phase, language: Language): string {
  return preset.isDefault ? names[language][phase.order - 1] ?? phase.name : phase.name;
}

export function starterPhases(preset: Preset, language: Language): Phase[] {
  return preset.phases.map((phase) => ({
    ...phase,
    name: displayedPhaseName(preset, phase, language),
  }));
}
