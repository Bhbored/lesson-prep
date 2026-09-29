import { useNavigate } from "react-router-dom";
import { usePreparation } from "@/app/providers/preparation";
import { usePresets } from "@/app/providers/presets";
import { useSettings } from "@/app/providers/settings";
import { useAlerts } from "@/app/providers/alerts";
import { useI18n } from "@/app/providers/i18n";
import { classChoices } from "@/app/shared/data/workspace";
import { providerNames } from "@/app/shared/data/providers";

export function usePreparePage() {
  const navigate = useNavigate();
  return {
    ...usePreparation(),
    ...usePresets(),
    ...useSettings(),
    ...useAlerts(),
    t: useI18n(),
    classChoices,
    providerNames,
    setTab: (tab: string) => navigate(`/${tab}`),
  };
}
