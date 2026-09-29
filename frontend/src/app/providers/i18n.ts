import { useSettings } from "./settings";
import { translations } from "@/app/shared/i18n/messages";

export function useI18n() {
  return translations(useSettings().settings.displayLanguage);
}
