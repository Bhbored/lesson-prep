import { usePresets } from "@/app/providers/presets";
import { useAlerts } from "@/app/providers/alerts";
import { useI18n } from "@/app/providers/i18n";

export function usePresetsPage() {
  return { ...usePresets(), ...useAlerts(), t: useI18n() };
}
