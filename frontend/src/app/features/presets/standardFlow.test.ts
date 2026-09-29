import { expect, it } from "vitest";
import { preset } from "@/test/fixtures";
import { displayedPhaseName, displayedPresetName, starterPhases } from "./standardFlow";

it("localizes the standard flow preview and starter without changing the server preset", () => {
  expect(preset.phases.map((phase) => displayedPhaseName(preset, phase, "ar")))
    .toEqual(["تمهيد", "شرح الدرس", "تطبيق", "تقييم", "خاتمة"]);
  expect(preset.phases.map((phase) => displayedPhaseName(preset, phase, "fr")))
    .toEqual(["Mise en route", "Enseignement", "Mise en pratique", "Évaluation", "Conclusion"]);
  expect(displayedPresetName(preset, "fr")).toBe("Cours standard de 45 minutes");

  const starter = starterPhases(preset, "ar");
  starter[0].name = "Edited introduction";
  expect(preset.phases[0].name).toBe("Warm-up");
  expect(starter.map((phase) => phase.durationMinutes)).toEqual([5, 15, 15, 7, 3]);

  const custom = { ...preset, isDefault: false };
  expect(starterPhases(custom, "ar").map((phase) => phase.name))
    .toEqual(preset.phases.map((phase) => phase.name));
});
