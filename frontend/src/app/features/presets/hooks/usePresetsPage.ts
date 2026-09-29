import { usePresets } from "@/app/providers/presets";
import { useAlerts } from "@/app/providers/alerts";
import { useI18n } from "@/app/providers/i18n";
import { useSettings } from "@/app/providers/settings";

export function usePresetsPage() {
  return { ...usePresets(), ...useAlerts(), t: useI18n(), displayLanguage: useSettings().settings.displayLanguage };
}
